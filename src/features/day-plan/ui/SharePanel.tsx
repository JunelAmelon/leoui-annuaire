'use client';

/** Partage du planning : lien général en lecture seule + un lien personnel par prestataire. */

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SplitModal, modalGhostBtn } from '@/components/ui/SplitModal';
import { toast } from 'sonner';
import type { DayPlan } from '../domain/types';

interface SharePanelProps {
  plan: DayPlan;
  busy: boolean;
  /** Nombre de moments attribués à chaque intervenant. */
  itemCounts: Record<string, number>;
  onEnableShare: () => void;
  onRevokeShare: () => void;
  onAddVendor: (label: string) => Promise<boolean>;
  onSetVendorAccess: (vendorId: string, active: boolean) => void;
  onClose: () => void;
}

export const shareUrl = (eventId: string, token: string): string =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/planning-jour-j/${eventId}/${token}`;

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copie impossible. Sélectionnez le lien à la main.');
    }
  };
  return (
    <div className="flex items-center gap-3 mt-2.5">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de partage"
        className="flex-1 min-w-0 bg-[#F7F3EE] border border-stone-200 px-3 h-10 text-[12.5px] text-charcoal-600 rounded-sm focus:outline-none focus:border-rose-500" />
      <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 h-10 px-4 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm flex-shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copié' : 'Copier'}
      </button>
    </div>
  );
}

export function SharePanel({ plan, busy, itemCounts, onEnableShare, onRevokeShare, onAddVendor, onSetVendorAccess, onClose }: SharePanelProps) {
  const [name, setName] = useState('');
  const generalActive = Boolean(plan.share.token) && !plan.share.token_revoked_at;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAddVendor(name)) setName('');
  };

  const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';

  return (
    <SplitModal image="/jour-j-cover.jpg" imageClass="object-[50%_60%]" kicker="Planning du jour J" title="Partager"
      caption="Chacun voit ce qui le concerne, vous gardez la main." widthClass="sm:max-w-4xl" onClose={onClose}
      footer={<button type="button" onClick={onClose} className={`${modalGhostBtn} ml-auto`}>Fermer</button>}>
          {/* Prestataires */}
          <section>
            <p className={`${kicker} text-charcoal-400`}>Vos prestataires</p>
            <p className="text-[14px] text-charcoal-600 mt-2 leading-relaxed">
              Chacun reçoit son lien. Il voit tout le déroulé, ses moments en avant, et peut vous proposer un autre horaire. Rien ne change sans votre accord.
            </p>

            <form onSubmit={add} className="flex items-end gap-3 mt-5">
              <label className="flex-1 min-w-0">
                <span className="sr-only">Nom du prestataire</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex : Traiteur Maison Dupont"
                  className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 rounded-none" />
              </label>
              <button type="submit" disabled={busy || !name.trim()} className="h-10 px-4 border border-charcoal-900 text-charcoal-900 text-[13px] font-medium hover:bg-charcoal-900 hover:text-white disabled:opacity-35 transition-colors rounded-sm">Ajouter</button>
            </form>

            <ul className="mt-6 divide-y divide-stone-200 border-t border-stone-200">
              {plan.share.vendor_links.map((link) => {
                const active = !link.token_revoked_at;
                const count = itemCounts[link.vendor_id] ?? 0;
                return (
                  <li key={link.vendor_id} className="py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`font-serif text-lg leading-tight ${active ? 'text-charcoal-900' : 'text-charcoal-400 line-through'}`}>{link.label}</p>
                      <button type="button" disabled={busy} onClick={() => onSetVendorAccess(link.vendor_id, !active)}
                        className="text-[12.5px] text-charcoal-500 hover:text-rose-600 disabled:opacity-40 flex-shrink-0">{active ? 'Couper l’accès' : 'Rétablir avec un nouveau lien'}</button>
                    </div>
                    <p className="text-[12px] text-charcoal-400 mt-0.5">
                      {count === 0 ? 'Aucun moment attribué : ouvrez un moment et cochez ce prestataire.' : `${count} moment${count > 1 ? 's' : ''} attribué${count > 1 ? 's' : ''}`}
                    </p>
                    {active && <CopyLink url={shareUrl(plan.event_id, link.token)} />}
                  </li>
                );
              })}
              {plan.share.vendor_links.length === 0 && <li className="py-6 font-serif italic text-charcoal-400 text-lg">Aucun prestataire pour l’instant.</li>}
            </ul>
          </section>

          {/* Lien général */}
          <section>
            <p className={`${kicker} text-charcoal-400`}>Témoins et famille</p>
            <p className="text-[14px] text-charcoal-600 mt-2 leading-relaxed">Un lien en lecture seule, sans vos notes. Pratique pour suivre le déroulé en direct le jour J.</p>
            {generalActive ? (
              <>
                <CopyLink url={shareUrl(plan.event_id, plan.share.token!)} />
                <div className="flex gap-x-6 mt-3 text-[12.5px]">
                  <button type="button" disabled={busy} onClick={onEnableShare} className="text-charcoal-500 hover:text-charcoal-900 disabled:opacity-40">Générer un nouveau lien</button>
                  <button type="button" disabled={busy} onClick={onRevokeShare} className="text-charcoal-500 hover:text-rose-600 disabled:opacity-40">Désactiver</button>
                </div>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={onEnableShare} className="mt-4 h-10 px-4 border border-charcoal-900 text-charcoal-900 text-[13px] font-medium hover:bg-charcoal-900 hover:text-white disabled:opacity-35 transition-colors rounded-sm">Créer le lien</button>
            )}
          </section>
    </SplitModal>
  );
}
