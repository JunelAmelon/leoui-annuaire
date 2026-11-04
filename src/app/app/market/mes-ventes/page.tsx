'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Truck, Wallet } from 'lucide-react';
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

export default function MesVentesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('Colissimo');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submittingShip, setSubmittingShip] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/orders?as=seller', { headers: { Authorization: `Bearer ${token}` } });
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
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de l’expédition');
      toast.success('Expédition enregistrée.');
      setShippingOrderId(null);
      setTrackingNumber('');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’enregistrer le suivi');
    } finally {
      setSubmittingShip(false);
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

      {orders.length === 0 ? (
        <div className="bg-white border border-charcoal-200 p-12 text-center">
          <Wallet className="w-8 h-8 text-charcoal-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">Aucune vente pour le moment</h2>
          <p className="text-sm text-charcoal-500 max-w-sm mx-auto">
            Vos ventes apparaîtront ici, avec ce qu’il reste à faire pour être payé.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => {
            const tag = saleTag(o);
            const canShip = o.delivery_mode === 'shipping' && ['paid', 'preparing'].includes(o.order_status);
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
                      {o.listing_snapshot?.image && <img src={o.listing_snapshot.image} alt="" className="w-full h-full object-cover" />}
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
                          {o.shipping_address.full_name}
                          <br />
                          {o.shipping_address.street}
                          <br />
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

                {(canShip || o.order_status === 'disputed') && (
                  <footer className="px-5 py-4 border-t border-charcoal-200 flex flex-wrap items-center justify-between gap-3">
                    {o.order_status === 'disputed' ? (
                      <>
                        <p className="text-xs text-charcoal-500">L’acheteur a signalé un problème. Répondez-lui depuis les litiges.</p>
                        <Link href="/app/market/litiges" className={ghostBtn}>
                          Voir le litige
                        </Link>
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

      {shippingOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-950/60">
          <form onSubmit={ship} className="bg-white border border-charcoal-200 w-full max-w-md p-6 sm:p-8 space-y-5">
            <div>
              <p className="label-xs text-rose-600 mb-2">Expédition</p>
              <h3 className="font-serif text-2xl text-charcoal-900">Numéro de suivi</h3>
              <p className="text-xs text-charcoal-500 mt-2">L’acheteur pourra suivre son colis.</p>
            </div>

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

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShippingOrderId(null)} className={ghostBtn}>
                Annuler
              </button>
              <button type="submit" disabled={submittingShip} className={primaryBtn}>
                {submittingShip ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer l’envoi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
