'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { StatusTag, primaryBtn, ghostBtn, inputCls } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketDispute, DisputeStatus } from '@/lib/market/types';
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS, isDisputeActive } from '@/lib/market/dispute-service';

const ROLE_LABEL = { buyer: 'Acheteur', seller: 'Vendeur', admin: 'LeOui' } as const;
const toneFor = (s: DisputeStatus) =>
  s === 'awaiting_seller' || s === 'open' ? 'amber' : s === 'under_review' ? 'rose' : s.startsWith('resolved') ? 'green' : 'grey';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function LitigesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<MarketDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (url: string, init?: RequestInit) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await call('/api/market/disputes');
      setDisputes(data.disputes ?? []);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const patch = async (id: string, body: object, okMsg: string) => {
    setBusy(true);
    try {
      await call(`/api/market/disputes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast.success(okMsg);
      setReply('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusy(false);
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
      <div>
        <p className="label-xs text-rose-600 mb-2">Médiation</p>
        <h1 className="font-serif text-4xl text-charcoal-900 leading-none">Litiges</h1>
        <p className="text-sm text-charcoal-500 mt-3 max-w-xl">
          Tant qu’un litige est ouvert, le paiement reste bloqué et la réception ne peut pas être confirmée.
        </p>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white border border-charcoal-200 p-12 text-center">
          <Scale className="w-8 h-8 text-charcoal-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">Aucun litige</h2>
          <p className="text-sm text-charcoal-500 max-w-sm mx-auto">
            Un souci avec un achat ? Vous pouvez le signaler depuis{' '}
            <Link href="/app/market/mes-commandes" className="text-rose-600 underline">
              Mes achats
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="bg-white border border-charcoal-200 divide-y divide-charcoal-200">
          {disputes.map((d) => {
            const isOpen = openId === d.id;
            const isBuyer = d.buyer_id === user?.uid;
            const active = isDisputeActive(d);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(isOpen ? null : d.id);
                    setReply('');
                  }}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-ivory-50/60 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="w-14 h-14 bg-charcoal-100 flex-shrink-0 overflow-hidden">
                    {d.listing_image && <img src={d.listing_image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg text-charcoal-900 truncate">{d.listing_title || 'Commande'}</p>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {DISPUTE_REASON_LABELS[d.reason]} · vous êtes {isBuyer ? 'acheteur' : 'vendeur'} · ouvert le{' '}
                      {new Date(d.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <StatusTag tone={toneFor(d.status)}>{DISPUTE_STATUS_LABELS[d.status]}</StatusTag>
                  <ChevronDown className={`w-4 h-4 text-charcoal-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 border-t border-charcoal-100 bg-ivory-50/40">
                    <ol className="divide-y divide-charcoal-100">
                      {d.messages.map((m, i) => (
                        <li key={i} className="py-4">
                          <p className="label-xs text-charcoal-500 mb-1.5">
                            <span className={m.by === user?.uid ? 'text-rose-600' : ''}>{ROLE_LABEL[m.role]}</span>
                            {m.by === user?.uid ? ' (vous)' : ''} · {fmt(m.at)}
                          </p>
                          <p className="text-sm text-charcoal-800 whitespace-pre-line leading-relaxed">{m.body}</p>
                        </li>
                      ))}
                    </ol>

                    {active ? (
                      <div className="pt-4 space-y-3">
                        <textarea
                          rows={3}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={isBuyer ? 'Ajouter un message…' : 'Répondre à l’acheteur…'}
                          className={`${inputCls} resize-none`}
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          {isBuyer ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                confirm('Retirer ce litige ? La commande reprendra son cours normal.') &&
                                patch(d.id, { action: 'withdraw' }, 'Litige retiré')
                              }
                              className={ghostBtn}
                            >
                              Retirer le litige
                            </button>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            disabled={busy || reply.trim().length < 2}
                            onClick={() => patch(d.id, { action: 'message', body: reply }, 'Message envoyé')}
                            className={primaryBtn}
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="pt-4 text-xs text-charcoal-500">Ce litige est clos.</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
