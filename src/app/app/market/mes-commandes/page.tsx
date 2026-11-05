'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { StatusTag, Field, inputCls, primaryBtn, ghostBtn } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketOrder, DisputeReason } from '@/lib/market/types';
import { DISPUTE_REASON_LABELS, canOpenDispute } from '@/lib/market/dispute-service';

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function orderTag(o: MarketOrder): { tone: 'rose' | 'amber' | 'green' | 'red' | 'grey'; label: string } {
  switch (o.order_status) {
    case 'completed':
    case 'receipt_confirmed':
      return { tone: 'green', label: 'Terminée' };
    case 'disputed':
      return { tone: 'red', label: 'Litige en cours' };
    case 'shipped':
      return { tone: 'amber', label: 'En cours de livraison' };
    case 'cancelled':
    case 'refunded':
      return { tone: 'grey', label: o.order_status === 'refunded' ? 'Remboursée' : 'Annulée' };
    default:
      return { tone: 'rose', label: o.delivery_mode === 'pickup' ? 'Remise à organiser' : 'En attente d’expédition' };
  }
}

export default function MesCommandesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [disputeOrder, setDisputeOrder] = useState<MarketOrder | null>(null);
  const [reason, setReason] = useState<DisputeReason>('not_as_described');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/orders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  const confirmReceipt = async (orderId: string) => {
    if (!confirm('Avez-vous bien reçu et vérifié votre article ? Cette action libère le paiement au vendeur.')) return;
    setConfirmingId(orderId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/market/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'confirm_receipt' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de la confirmation');
      toast.success('Réception confirmée. Le paiement est libéré au vendeur.');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de confirmer la réception');
    } finally {
      setConfirmingId(null);
    }
  };

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeOrder) return;
    if (description.trim().length < 20) return toast.error('Décrivez le problème en 20 caractères minimum');
    setSending(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: disputeOrder.id, reason, description }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      toast.success('Litige ouvert. Le paiement reste bloqué.');
      setDisputeOrder(null);
      setDescription('');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’ouvrir le litige');
    } finally {
      setSending(false);
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
          <p className="label-xs text-rose-600 mb-2">Acheter</p>
          <h1 className="font-serif text-4xl text-charcoal-900 leading-none">Mes achats</h1>
        </div>
        <Link href="/market/annonces" className="label-xs text-charcoal-500 hover:text-rose-600 transition-colors">
          Continuer mes achats →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-charcoal-200 p-12 text-center">
          <Package className="w-8 h-8 text-charcoal-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">Aucun achat pour le moment</h2>
          <p className="text-sm text-charcoal-500 mb-6">Décoration, tenues, accessoires : trouvez votre bonheur.</p>
          <Link href="/market/annonces" className={primaryBtn}>
            Parcourir les annonces
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => {
            const tag = orderTag(o);
            const done = o.order_status === 'completed' || o.order_status === 'receipt_confirmed';
            const disputed = o.order_status === 'disputed';
            const closed = ['cancelled', 'refunded'].includes(o.order_status);
            return (
              <article key={o.id} className="bg-white border border-charcoal-200">
                <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-charcoal-200 bg-ivory-50/60">
                  <span className="label-xs text-charcoal-500">Commande n° {o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-xs text-charcoal-500">
                    {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </header>

                <div className="p-5 grid grid-cols-[80px_1fr] sm:grid-cols-[96px_1fr_auto] gap-x-5 gap-y-3">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-charcoal-100 overflow-hidden">
                    {o.listing_snapshot?.image && <img src={o.listing_snapshot.image} alt="" className="w-full h-full object-cover" />}
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-serif text-xl text-charcoal-900 leading-snug">{o.listing_snapshot?.title}</h2>
                    <p className="text-xs text-charcoal-500 mt-1">
                      {o.quantity} article{o.quantity > 1 ? 's' : ''} ·{' '}
                      {o.delivery_mode === 'shipping' ? 'Envoi par colis' : 'Remise en main propre'}
                    </p>
                    {o.tracking?.number && (
                      <p className="text-xs text-charcoal-600 mt-2">
                        Suivi {o.tracking.carrier} · <span className="font-medium tabular-nums">{o.tracking.number}</span>
                      </p>
                    )}
                    <div className="mt-3">
                      <StatusTag tone={tag.tone}>{tag.label}</StatusTag>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 sm:text-right">
                    <p className="font-serif text-2xl text-charcoal-900 tabular-nums">{eur(o.amounts.total)} €</p>
                    <p className="text-[11px] text-charcoal-400">dont protection acheteur</p>
                  </div>
                </div>

                {/* Ticket de remise : code à communiquer au vendeur */}
                {o.pickup_code && !done && !closed && (
                  <div className="mx-5 mb-5 flex items-center justify-between gap-4 border border-dashed border-charcoal-400 px-5 py-3">
                    <div>
                      <p className="label-xs text-charcoal-500">Code de remise</p>
                      <p className="text-xs text-charcoal-500 mt-0.5">À donner au vendeur au moment de l’échange.</p>
                    </div>
                    <p className="font-serif text-3xl tracking-[0.3em] text-charcoal-900 tabular-nums">{o.pickup_code}</p>
                  </div>
                )}

                {(!done && !closed) && (
                  <footer className="px-5 py-4 border-t border-charcoal-200 flex flex-wrap items-center justify-between gap-3">
                    {disputed ? (
                      <>
                        <p className="text-xs text-charcoal-500">Le paiement reste bloqué tant que le litige est ouvert.</p>
                        <Link href="/app/market/litiges" className={ghostBtn}>
                          Voir le litige
                        </Link>
                      </>
                    ) : (
                      <>
                        {canOpenDispute(o) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeOrder(o);
                              setReason('not_as_described');
                            }}
                            className="text-xs font-semibold text-charcoal-500 hover:text-rose-600 underline underline-offset-4 transition-colors"
                          >
                            Signaler un problème
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => confirmReceipt(o.id)}
                          disabled={confirmingId === o.id}
                          className={primaryBtn}
                        >
                          {confirmingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'J’ai bien reçu ma commande'}
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

      {/* Ouverture d'un litige */}
      {disputeOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-950/60">
          <form onSubmit={submitDispute} className="bg-white border border-charcoal-200 w-full max-w-lg p-6 sm:p-8 space-y-5">
            <div>
              <p className="label-xs text-rose-600 mb-2">Signaler un problème</p>
              <h3 className="font-serif text-2xl text-charcoal-900 leading-snug">{disputeOrder.listing_snapshot?.title}</h3>
              <p className="text-xs text-charcoal-500 mt-2">
                Le paiement restera bloqué et le vendeur sera invité à répondre.
              </p>
            </div>

            <Field label="Motif" required>
              <select value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)} className={inputCls}>
                {(Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[]).map((r) => (
                  <option key={r} value={r}>{DISPUTE_REASON_LABELS[r]}</option>
                ))}
              </select>
            </Field>

            <Field label="Description" required hint={`${description.trim().length} / 20 caractères minimum`}>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez précisément ce qui ne va pas…"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDisputeOrder(null)} className={ghostBtn}>
                Annuler
              </button>
              <button type="submit" disabled={sending} className={primaryBtn}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ouvrir le litige'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
