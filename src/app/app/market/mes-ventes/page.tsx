'use client';

/**
 * Page Mes Ventes — Tableau de bord vendeur LeOui Market.
 *
 * Pattern Suspense requis par Next.js App Router : useSearchParams()
 * doit être dans un composant enfant enveloppé par <Suspense>.
 * (cf. messages/page.tsx — même pattern)
 *
 * Stripe Connect : bannière onboarding affichée tant que le vendeur
 * n'a pas complété son KYC/RIB. Statut synchronisé depuis Stripe à
 * chaque chargement + après retour depuis le flow Stripe.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Truck, Wallet, Handshake, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';
import { StatusTag, Leader, Field, inputCls, primaryBtn, ghostBtn } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketOrder } from '@/lib/market/types';
import { sellerNetFromAmounts, MARKET_COMMISSION_RATE } from '@/lib/market/utils';

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function saleTag(o: MarketOrder): { tone: 'rose' | 'amber' | 'green' | 'red' | 'grey'; label: string } {
  switch (o.order_status) {
    case 'completed':
    case 'receipt_confirmed':
      return { tone: 'green', label: 'Paiement libéré' };
    case 'disputed':
      return { tone: 'red', label: 'Litige en cours' };
    case 'shipped':
      return { tone: 'amber', label: 'Expédié, en attente de réception' };
    case 'cancelled':
    case 'refunded':
      return { tone: 'grey', label: o.order_status === 'refunded' ? 'Remboursée' : 'Annulée' };
    default:
      return { tone: 'rose', label: o.delivery_mode === 'pickup' ? 'Remise à organiser' : 'À expédier' };
  }
}

// ── Composant interne — doit être dans Suspense car il utilise useSearchParams ─

function MesVentesInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Stripe Connect onboarding ──────────────────────────────────────────────
  const [connectStatus, setConnectStatus] = useState<{
    onboarded: boolean;
    account_id: string | null;
  } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchConnectStatus = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/connect/onboarding', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setConnectStatus({ onboarded: data.onboarded, account_id: data.account_id });
    } catch {}
  }, []);

  useEffect(() => {
    if (user) fetchConnectStatus();
  }, [user, fetchConnectStatus]);

  // Retour depuis Stripe → rafraîchit silencieusement le statut
  useEffect(() => {
    const reason = searchParams.get('connect');
    if (reason === 'done' || reason === 'resume') fetchConnectStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startOnboarding = async () => {
    setConnectLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/connect/onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Impossible de démarrer l'onboarding");
      setConnectLoading(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('Colissimo');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submittingShip, setSubmittingShip] = useState(false);

  const [pickupOrderId, setPickupOrderId] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState('');
  const [submittingPickup, setSubmittingPickup] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/orders?as=seller', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  const ship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrderId || !trackingNumber.trim()) return toast.error('Renseignez un numéro de suivi');
    setSubmittingShip(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/market/orders/${shippingOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'ship', carrier, tracking_number: trackingNumber.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erreur lors de l'expédition");
      toast.success('Expédition enregistrée.');
      setShippingOrderId(null);
      setTrackingNumber('');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Impossible d\'enregistrer le suivi');
    } finally {
      setSubmittingShip(false);
    }
  };

  const confirmPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupOrderId || !pickupCode.trim()) return toast.error('Saisissez le code de remise');
    setSubmittingPickup(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/market/orders/${pickupOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'confirm_pickup', pickup_code: pickupCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de la confirmation');
      toast.success('Remise confirmée. Paiement libéré.');
      setPickupOrderId(null);
      setPickupCode('');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Code incorrect');
    } finally {
      setSubmittingPickup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label-xs text-rose-600 mb-2">Vendre</p>
          <h1 className="font-serif text-4xl text-charcoal-900 leading-none">Mes ventes</h1>
        </div>
        <Link href="/market/deposer-une-annonce" className="label-xs text-charcoal-500 hover:text-rose-600 transition-colors">
          Déposer une annonce →
        </Link>
      </div>

      {/* ── Bannière Connect onboarding — visible uniquement si non onboardé ── */}
      {connectStatus !== null && !connectStatus.onboarded && (
        <article className="bg-white border border-charcoal-200">
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-charcoal-200 bg-ivory-50/60">
            <span className="label-xs text-charcoal-500">Paiements vendeur</span>
            <span className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Configuration requise
            </span>
          </header>
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            {/* Visuel — photo vendeuse */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-full overflow-hidden border border-charcoal-200 self-start sm:self-center">
              <img
                src="/connect-vendeuse.jpg"
                alt="Vendeuse LeOui Market"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl sm:text-2xl text-charcoal-900 leading-snug">
                Recevez vos paiements
              </h2>
              <p className="text-sm text-charcoal-500 mt-1 max-w-md">
                Connectez votre compte Stripe en 2 minutes — vos ventes vous seront versées automatiquement, de manière sécurisée.
              </p>
            </div>
            <button
              type="button"
              onClick={startOnboarding}
              disabled={connectLoading}
              className="self-start sm:self-center flex items-center gap-2 whitespace-nowrap px-5 py-2.5 bg-rose-600 text-white text-xs font-semibold tracking-wide uppercase hover:bg-rose-700 transition-colors disabled:opacity-60"
            >
              {connectLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Configurer mes virements
            </button>
          </div>
        </article>
      )}

      {orders.length === 0 ? (
        <div className="bg-white border border-charcoal-200 p-12 text-center">
          <Wallet className="w-8 h-8 text-charcoal-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">Aucune vente pour le moment</h2>
          <p className="text-sm text-charcoal-500 max-w-sm mx-auto">
            Vos ventes apparaîtront ici, avec ce qu&apos;il reste à faire pour être payé.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => {
            const tag = saleTag(o);
            const canShip = o.delivery_mode === 'shipping' && ['paid', 'preparing'].includes(o.order_status);
            const canPickup = o.delivery_mode === 'pickup' && ['paid', 'pickup_scheduled'].includes(o.order_status);
            const commission = Math.round(o.amounts.items * MARKET_COMMISSION_RATE * 100) / 100;
            return (
              <article key={o.id} className="bg-white border border-charcoal-200">
                <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-charcoal-200 bg-ivory-50/60">
                  <span className="label-xs text-charcoal-500">Vente n° {o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-xs text-charcoal-500">
                    {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </header>

                <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_16rem] gap-6">
                  <div className="flex gap-5 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-charcoal-100 overflow-hidden flex-shrink-0">
                      {o.listing_snapshot?.image && (
                        <img src={o.listing_snapshot.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-serif text-xl text-charcoal-900 leading-snug">{o.listing_snapshot?.title}</h2>
                      <p className="text-xs text-charcoal-500 mt-1">
                        {o.quantity} article{o.quantity > 1 ? 's' : ''} ·{' '}
                        {o.delivery_mode === 'shipping' ? 'Envoi par colis' : 'Remise en main propre'}
                      </p>
                      <div className="mt-3">
                        <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
                      </div>

                      {o.shipping_address && (
                        <address className="not-italic text-xs text-charcoal-600 mt-4 leading-relaxed">
                          <span className="label-xs text-charcoal-400 block mb-1">Livrer à</span>
                          {o.shipping_address.full_name}<br />
                          {o.shipping_address.street}<br />
                          {o.shipping_address.postal_code} {o.shipping_address.city}
                          {o.shipping_address.phone && <><br />Tél. {o.shipping_address.phone}</>}
                        </address>
                      )}
                      {o.tracking?.number && (
                        <p className="text-xs text-charcoal-600 mt-3">
                          Suivi {o.tracking.carrier} · <span className="font-medium tabular-nums">{o.tracking.number}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Décompte à pointillés */}
                  <div className="space-y-2 md:pl-6 md:border-l md:border-charcoal-200 self-start">
                    <Leader label="Article" value={`${eur(o.amounts.items)} €`} />
                    {o.amounts.shipping > 0 && <Leader label="Livraison" value={`${eur(o.amounts.shipping)} €`} />}
                    <Leader label={`Commission ${Math.round(MARKET_COMMISSION_RATE * 100)} %`} value={`− ${eur(commission)} €`} />
                    <div className="pt-2 mt-1 border-t border-charcoal-200">
                      <Leader label="Votre net" value={`${eur(sellerNetFromAmounts(o.amounts))} €`} strong />
                    </div>
                  </div>
                </div>

                {(canShip || canPickup || o.order_status === 'disputed') && (
                  <footer className="px-5 py-4 border-t border-charcoal-200 flex flex-wrap items-center justify-between gap-3">
                    {o.order_status === 'disputed' ? (
                      <>
                        <p className="text-xs text-charcoal-500">L&apos;acheteur a signalé un problème. Répondez-lui depuis les litiges.</p>
                        <Link href="/app/market/litiges" className={ghostBtn}>Voir le litige</Link>
                      </>
                    ) : canPickup ? (
                      <>
                        <p className="text-xs text-charcoal-500">À la remise, demandez le code affiché chez l&apos;acheteur.</p>
                        <button type="button" onClick={() => setPickupOrderId(o.id)} className={primaryBtn}>
                          <Handshake className="w-4 h-4" /> Confirmer la remise
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-charcoal-500">Le paiement est bloqué : vous serez payé à la confirmation de réception.</p>
                        <button type="button" onClick={() => setShippingOrderId(o.id)} className={primaryBtn}>
                          <Truck className="w-4 h-4" /> Renseigner le suivi
                        </button>
                      </>
                    )}
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ── Modale expédition ──────────────────────────────────────────── */}
      {shippingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-950/60">
          <form onSubmit={ship} className="bg-white w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl flex">
            {/* Visuel latéral — livraison */}
            <div className="relative w-36 sm:w-44 flex-shrink-0">
              <img src="/shipping-modal.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                <p className="label-xs text-white/90 leading-tight">Envoi suivi</p>
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0 p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-xs text-rose-600 mb-1">Expédition</p>
                  <h3 className="font-serif text-2xl text-charcoal-900 leading-tight">Numéro de suivi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShippingOrderId(null)}
                  className="p-1.5 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-charcoal-500 leading-relaxed mt-3">
                L&apos;acheteur pourra suivre son colis en temps réel.
              </p>

              <div className="mt-5 flex-1 flex flex-col justify-end space-y-5">
                <Field label="Transporteur">
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls}>
                    {['Colissimo', 'Mondial Relay', 'Chronopost', 'UPS', 'Autre'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Numéro de suivi" required>
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="6A12345678901"
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setShippingOrderId(null)} className={ghostBtn}>Annuler</button>
                  <button type="submit" disabled={submittingShip} className={primaryBtn}>
                    {submittingShip ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer l'envoi"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Modale remise en main propre ───────────────────────────────── */}
      {pickupOrderId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-950/60">
          <form onSubmit={confirmPickup} className="bg-white w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl flex">
            {/* Visuel latéral — remise en main propre */}
            <div className="relative w-36 sm:w-44 flex-shrink-0">
              <img src="/pickup-modal.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                <p className="label-xs text-white/90 leading-tight">Échange sécurisé</p>
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0 p-6 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-xs text-rose-600 mb-1">Remise en main propre</p>
                  <h3 className="font-serif text-2xl text-charcoal-900 leading-tight">Code de remise</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPickupOrderId(null)}
                  className="p-1.5 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-charcoal-500 leading-relaxed mt-3">
                L&apos;acheteur vous montre son code à 6 chiffres lors de l&apos;échange.
                Saisissez-le pour libérer le paiement.
              </p>

              <div className="mt-5 flex-1 flex flex-col justify-end space-y-5">
                <Field label="Code à 6 chiffres" required>
                  <input
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    className={`${inputCls} text-center font-display text-xl tracking-[0.3em]`}
                  />
                </Field>

                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setPickupOrderId(null)} className={ghostBtn}>Annuler</button>
                  <button type="submit" disabled={submittingPickup || pickupCode.length !== 6} className={primaryBtn}>
                    {submittingPickup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer la remise'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Export par défaut — Suspense requis par useSearchParams ──────────────────

export default function MesVentesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    }>
      <MesVentesInner />
    </Suspense>
  );
}
