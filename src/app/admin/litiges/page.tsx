'use client';

/**
 * Page d'arbitrage des litiges LeOui Market — /admin/litiges
 *
 * Architecture (SOLID / DIP) :
 *  - Cette page est uniquement un composant de présentation (SRP).
 *    Elle ne contient aucune logique métier — tout est délégué aux API routes.
 *  - Les données viennent de /api/admin/market/disputes (GET) et
 *    /api/admin/market/disputes/[id] (PATCH resolve).
 *  - L'API route vérifie le claim Firebase `role === 'admin'` via requireAuth().
 *  - Le layout parent (/admin/layout.tsx) garantit que seuls les admins
 *    arrivent ici ; mais la page relit le token pour chaque appel réseau
 *    (défense en profondeur, le token peut expirer entre deux navigations).
 *
 * Flux de données :
 *  1. fetchDisputes() → GET /api/admin/market/disputes
 *     → Liste les litiges (tous, ou filtré par statut)
 *  2. resolve(decision) → PATCH /api/admin/market/disputes/[id]
 *     { action: 'resolve', decision: 'buyer'|'seller', note: string }
 *     → Écrit la décision dans Firestore via transaction (dispute-service)
 *     → Met à jour order, payment, payout de façon atomique
 *
 * Pas d'accès direct Firestore depuis le client pour les collections market_*
 * (interdit par les règles Firestore — tout passe par Admin SDK côté serveur).
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Scale, X, AlertTriangle, MessageSquare, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import type { MarketDispute, DisputeMessage } from '@/lib/market/types';
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from '@/lib/market/dispute-service';
import { StatusTag, inputCls } from '@/components/market/ui';

// ── Mapping couleur statut → ton du StatusTag ────────────────────────────────
// Chaque statut de litige est associé à une couleur sémantique.
const STATUS_TONES: Record<string, 'rose' | 'amber' | 'green' | 'red' | 'grey'> = {
  open: 'amber',          // litige ouvert par l'acheteur
  awaiting_seller: 'amber', // en attente de la réponse du vendeur
  under_review: 'rose',   // examen en cours par l'équipe LeOui
  resolved_buyer: 'green', // tranché en faveur de l'acheteur
  resolved_seller: 'green', // tranché en faveur du vendeur
  closed: 'grey',          // clôturé (retiré par l'acheteur)
};

// Statuts considérés comme "actifs" — litige pas encore tranché.
const ACTIVE_STATUSES = ['open', 'awaiting_seller', 'under_review'] as const;

// ── Composant auxiliaire : rendu d'un message dans le fil ─────────────────────
/**
 * Affiche un message de litige avec la couleur et le rôle correspondants.
 * - admin  → bordure rose (décision / message de l'équipe)
 * - seller → bordure grise claire (réponse vendeur)
 * - buyer  → bordure grise (description initiale)
 */
function DisputeMessageBubble({ message }: { message: DisputeMessage }) {
  // Libellé du rôle en français pour l'affichage
  const roleLabel =
    message.role === 'admin'  ? 'Équipe LeOui' :
    message.role === 'seller' ? 'Vendeur'       :
    'Acheteur';

  // Couleur de la bordure gauche selon le rôle
  const borderClass =
    message.role === 'admin'  ? 'border-rose-600 bg-rose-50/50' :
    message.role === 'seller' ? 'border-charcoal-300 bg-ivory-50' :
    'border-charcoal-200 bg-white';

  return (
    <div className={`p-3 text-sm border-l-2 ${borderClass}`}>
      {/* En-tête : rôle + horodatage */}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 mb-1">
        {roleLabel} · {new Date(message.at).toLocaleString('fr-FR', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </p>
      {/* Corps du message (préserve les retours à la ligne) */}
      <p className="text-charcoal-700 whitespace-pre-line leading-relaxed">{message.body}</p>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 5;

export default function AdminLitigesPage() {
  // Liste des litiges chargés depuis l'API
  const [disputes, setDisputes]   = useState<MarketDispute[]>([]);
  // État de chargement de la liste
  const [loading, setLoading]     = useState(true);
  // Filtre de statut actif (client-side après fetch de tous les litiges)
  const [filter, setFilter]       = useState<string>('active');
  // Litige sélectionné pour afficher le modal de détail + arbitrage
  const [selected, setSelected]   = useState<MarketDispute | null>(null);
  // Note de résolution obligatoire (min. 10 caractères)
  const [note, setNote]           = useState('');
  // Indicateur d'envoi de la décision
  const [resolving, setResolving] = useState(false);
  // Message d'erreur de chargement
  const [error, setError]         = useState<string | null>(null);
  // Pagination — 5 litiges par page
  const [page, setPage]           = useState(1);

  // ── Chargement des litiges ──────────────────────────────────────────────────
  /**
   * Récupère tous les litiges depuis l'API admin et filtre côté client.
   * On charge tout d'un coup (pas de pagination côté API) pour permettre
   * le filtrage instantané sans aller-retour réseau supplémentaire.
   *
   * Le token Firebase est relu à chaque appel (le jeton peut expirer
   * entre deux navigations → forceRefresh implicite si > 1h).
   */
  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Récupération du token Firebase ID — nécessaire pour l'API admin.
      // Si null : layout aurait dû redirecter, mais on gère le cas défensif.
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch('/api/admin/market/disputes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json() as { ok: boolean; disputes?: unknown[]; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }

      // Cast sécurisé : l'API retourne des objets conformes à MarketDispute
      let list = (data.disputes ?? []) as MarketDispute[];

      // Filtrage côté client selon le filtre sélectionné
      if (filter === 'active') {
        // "Actifs" = tous les litiges non encore tranchés
        list = list.filter((d) => (ACTIVE_STATUSES as ReadonlyArray<string>).includes(d.status));
      } else if (filter !== 'all') {
        // Filtre sur un statut précis
        list = list.filter((d) => d.status === filter);
      }

      setDisputes(list);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Recharge la liste à chaque changement de filtre + reset pagination
  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);
  useEffect(() => { setPage(1); }, [filter]);

  // ── Soumettre une décision d'arbitrage ──────────────────────────────────────
  /**
   * Envoie la décision admin (buyer ou seller) au service via l'API.
   *
   * Contraintes :
   *  - Note de résolution obligatoire (≥ 10 caractères).
   *  - Idempotence assurée côté service : un litige déjà tranché lève
   *    ConflictError (code 409) — on affiche l'erreur à l'admin.
   *  - Après résolution : ferme le modal, vide la note, recharge la liste.
   *
   * @param decision 'buyer' → remboursement acheteur | 'seller' → libération vendeur
   */
  const resolve = async (decision: 'buyer' | 'seller') => {
    if (!selected) return;

    // Validation locale avant appel réseau
    if (note.trim().length < 10) {
      toast.error('Note de résolution requise (10 caractères minimum).');
      return;
    }

    setResolving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch(`/api/admin/market/disputes/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'resolve',
          decision,
          note: note.trim(),
        }),
      });

      const data = await res.json() as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }

      // Succès — message adapté à la décision
      const successMsg =
        decision === 'buyer'
          ? 'Décision actée — remboursement de l\'acheteur initié.'
          : 'Décision actée — fonds libérés au vendeur.';
      toast.success(successMsg);

      // Réinitialiser l'état et recharger la liste
      setSelected(null);
      setNote('');
      fetchDisputes();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      toast.error(message);
    } finally {
      setResolving(false);
    }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── En-tête ── */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-rose-600 uppercase tracking-wider font-medium mb-1.5">
            LeOui Market
          </p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400 }}>
            Arbitrage des litiges
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {loading ? '…' : `${disputes.length} litige${disputes.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Sélecteur de filtre de statut */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 border border-charcoal-200 bg-white text-sm rounded-xl focus:outline-none focus:border-rose-400 transition-colors"
          aria-label="Filtrer les litiges par statut"
        >
          <option value="active">Actifs (non tranchés)</option>
          <option value="open">Ouverts</option>
          <option value="awaiting_seller">En attente vendeur</option>
          <option value="under_review">En examen</option>
          <option value="resolved_buyer">Résolus acheteur</option>
          <option value="resolved_seller">Résolus vendeur</option>
          <option value="closed">Clôturés</option>
          <option value="all">Tous</option>
        </select>
      </div>

      {/* ── États de la liste ── */}
      {loading ? (
        // Chargement
        <div className="flex justify-center items-center py-24 gap-3 text-charcoal-400">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
          <span className="text-sm">Chargement des litiges…</span>
        </div>
      ) : error ? (
        // Erreur de chargement
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Impossible de charger les litiges</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
            <button
              onClick={fetchDisputes}
              className="mt-2 text-xs text-red-700 underline hover:no-underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      ) : disputes.length === 0 ? (
        // Liste vide
        <div className="bg-white border border-charcoal-100 rounded-2xl p-16 text-center shadow-soft">
          <Scale className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
          <p className="text-sm text-charcoal-500 font-light">Aucun litige dans cette catégorie.</p>
          <p className="text-xs text-charcoal-400 mt-1">
            {filter === 'active' ? 'Tous les litiges actifs sont tranchés.' : 'Essayez le filtre "Tous".'}
          </p>
        </div>
      ) : (
        // Liste des litiges — 5 par page
        <div className="space-y-2">
          {disputes.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((d) => (
            <button
              key={d.id}
              onClick={() => { setSelected(d); setNote(''); }}
              className="w-full bg-white border border-charcoal-100 hover:border-rose-300 hover:shadow-sm rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
            >
              {/* Miniature de l'annonce */}
              <div className="w-14 h-14 rounded-xl bg-charcoal-100 flex-shrink-0 overflow-hidden">
                {d.listing_image ? (
                  <img src={d.listing_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-charcoal-300 m-auto mt-4" />
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-charcoal-900 truncate text-sm">
                  {d.listing_title || 'Annonce supprimée'}
                </p>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  {/* Motif du litige */}
                  {DISPUTE_REASON_LABELS[d.reason as keyof typeof DISPUTE_REASON_LABELS] ?? d.reason}
                  {' · '}
                  {/* Date d'ouverture */}
                  {new Date(d.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  {/* Nombre de messages échangés */}
                  <MessageSquare className="w-3 h-3 inline mr-0.5" />
                  {d.messages.length} message{d.messages.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Badge statut */}
              <StatusTag tone={STATUS_TONES[d.status] ?? 'grey'}>
                {DISPUTE_STATUS_LABELS[d.status as keyof typeof DISPUTE_STATUS_LABELS] ?? d.status}
              </StatusTag>
            </button>
          ))}
        </div>
      )}

      {/* ── Pagination — 5 litiges par page ── */}
      {disputes.length > ITEMS_PER_PAGE && (() => {
        const totalPages = Math.ceil(disputes.length / ITEMS_PER_PAGE);
        return (
          <div className="flex items-center justify-between">
            <p className="text-xs text-charcoal-400">
              {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, disputes.length)} sur {disputes.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 border border-charcoal-200 rounded-xl disabled:opacity-40 hover:bg-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-charcoal-600 font-medium px-1">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 border border-charcoal-200 rounded-xl disabled:opacity-40 hover:bg-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Modal détail + arbitrage ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-950/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Détail du litige ${selected.id.slice(0, 8).toUpperCase()}`}
        >
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-charcoal-200 shadow-2xl">

            {/* ── En-tête du modal ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <p className="text-xs text-rose-600 uppercase tracking-wider font-semibold mb-0.5">
                  Litige #{selected.id.slice(0, 8).toUpperCase()}
                </p>
                <h2 className="font-serif text-xl text-charcoal-900 leading-none">
                  {selected.listing_title || 'Annonce supprimée'}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-lg hover:bg-charcoal-50 transition-colors"
                aria-label="Fermer le détail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Motif + description ── */}
              <div>
                <p className="text-xs text-charcoal-500 uppercase tracking-wider font-semibold mb-1.5">
                  Motif
                </p>
                <p className="text-sm font-medium text-charcoal-800 mb-1.5">
                  {DISPUTE_REASON_LABELS[selected.reason as keyof typeof DISPUTE_REASON_LABELS] ?? selected.reason}
                </p>
                <p className="text-sm text-charcoal-700 leading-relaxed bg-ivory-50 p-3 rounded-xl">
                  {selected.description}
                </p>
              </div>

              {/* ── Identifiants ── */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-charcoal-50 rounded-xl p-3">
                  <p className="text-charcoal-400 mb-0.5">Commande</p>
                  <p className="font-mono text-charcoal-800">{selected.order_id.slice(0, 12)}…</p>
                </div>
                <div className="bg-charcoal-50 rounded-xl p-3">
                  <p className="text-charcoal-400 mb-0.5">Statut actuel</p>
                  <StatusTag tone={STATUS_TONES[selected.status] ?? 'grey'}>
                    {DISPUTE_STATUS_LABELS[selected.status as keyof typeof DISPUTE_STATUS_LABELS] ?? selected.status}
                  </StatusTag>
                </div>
              </div>

              {/* ── Fil de messages ── */}
              <div>
                <p className="text-xs text-charcoal-500 uppercase tracking-wider font-semibold mb-2">
                  Échanges ({selected.messages.length} message{selected.messages.length !== 1 ? 's' : ''})
                </p>
                {selected.messages.length === 0 ? (
                  <p className="text-xs text-charcoal-400 italic">Aucun échange.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selected.messages.map((m: DisputeMessage, i: number) => (
                      // Chaque message est un composant isolé pour la lisibilité
                      <DisputeMessageBubble key={i} message={m} />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Zone d'arbitrage OU résumé décision ── */}
              {(ACTIVE_STATUSES as ReadonlyArray<string>).includes(selected.status) ? (
                // Litige encore actif → formulaire d'arbitrage
                <div className="space-y-4 pt-4 border-t border-charcoal-100">
                  <div>
                    <p className="text-xs text-charcoal-500 uppercase tracking-wider font-semibold mb-1">
                      Décision d'arbitrage
                    </p>
                    <p className="text-xs text-charcoal-400">
                      La décision est irréversible et sera enregistrée avec votre identifiant admin.
                    </p>
                  </div>

                  {/* Note obligatoire */}
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1.5 font-medium">
                      Note de résolution <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Justifiez la décision de manière factuelle (min. 10 caractères)…"
                      rows={3}
                      className={`${inputCls} w-full resize-none`}
                      aria-describedby="note-count"
                    />
                    {/* Compteur de caractères */}
                    <p
                      id="note-count"
                      className={`text-xs mt-1 text-right ${note.trim().length < 10 ? 'text-charcoal-300' : 'text-green-600'}`}
                    >
                      {note.trim().length} / 10 caractères min.
                    </p>
                  </div>

                  {/* Boutons de décision */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* En faveur de l'acheteur : remboursement */}
                    <button
                      onClick={() => resolve('buyer')}
                      disabled={resolving || note.trim().length < 10}
                      className="h-11 border border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resolving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Rembourser l\'acheteur'}
                    </button>

                    {/* En faveur du vendeur : libérer les fonds */}
                    <button
                      onClick={() => resolve('seller')}
                      disabled={resolving || note.trim().length < 10}
                      className="h-11 bg-charcoal-900 hover:bg-charcoal-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resolving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Libérer les fonds vendeur'}
                    </button>
                  </div>
                </div>
              ) : (
                // Litige déjà tranché → affichage de la décision
                <div className="pt-4 border-t border-charcoal-100 bg-charcoal-50 rounded-xl p-4">
                  <p className="text-xs text-charcoal-500 uppercase tracking-wider font-semibold mb-2">
                    Décision rendue
                  </p>
                  <p className="text-sm text-charcoal-700 leading-relaxed">
                    {selected.resolution_note || 'Aucune note de résolution.'}
                  </p>
                  {selected.decided_at && (
                    <p className="text-xs text-charcoal-400 mt-2">
                      Le {new Date(selected.decided_at).toLocaleString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
