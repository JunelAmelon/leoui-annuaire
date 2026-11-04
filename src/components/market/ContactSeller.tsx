'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from './ui';
import { marketApi, newClientId } from '@/lib/market/client/api';
import { MESSAGE_MAX_LENGTH } from '@/lib/market/messaging-rules';

interface Props {
  sellerId: string;
  sellerName: string;
  sellerPhoto?: string | null;
  listing?: { id: string; title: string; image?: string | null; price: number };
  variant?: 'primary' | 'outline';
  className?: string;
}

const QUICK = ['Cet article est-il toujours disponible ?', 'Quel est votre dernier prix ?', 'Une remise en main propre est-elle possible ?'];
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

interface Draft {
  text: string;
  clientId: string;
  at: number;
}

// Contact d'un vendeur depuis une annonce ou son profil.
// Visiteur : le texte est conservé, il se connecte, revient ici (?contact=1) et valide l'envoi d'un clic.
export default function ContactSeller({ sellerId, sellerName, sellerPhoto, listing, variant = 'outline', className = '' }: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const draftKey = `market_draft:${listing ? `l:${listing.id}` : `s:${sellerId}`}`;

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const clientId = useRef(newClientId());

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      if (Date.now() - d.at > DRAFT_TTL_MS) return localStorage.removeItem(draftKey);
      setText(d.text);
      clientId.current = d.clientId;
    } catch {
      /* stockage indisponible : on continue sans brouillon */
    }
  }, [draftKey]);

  const saveDraft = (value: string) => {
    try {
      if (value) localStorage.setItem(draftKey, JSON.stringify({ text: value, clientId: clientId.current, at: Date.now() } satisfies Draft));
      else localStorage.removeItem(draftKey);
    } catch {
      /* ignoré */
    }
  };

  // Retour de connexion : on rouvre la fenêtre avec le brouillon restauré.
  useEffect(() => {
    if (authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('contact') !== '1') return;
    params.delete('contact');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
    loadDraft();
    setOpen(true);
  }, [authLoading, loadDraft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openModal = () => {
    setError('');
    loadDraft();
    setOpen(true);
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return setError('Écrivez votre message.');

    if (!user) {
      saveDraft(text);
      const next = `${window.location.pathname}?contact=1`;
      router.push(`/market/connexion?next=${encodeURIComponent(next)}`);
      return;
    }

    setSending(true);
    setError('');
    try {
      const { conversation } = await marketApi<{ conversation: { id: string } }>('/api/market/conversations', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing?.id,
          seller_id: listing ? undefined : sellerId,
          body,
          client_id: clientId.current,
        }),
      });
      saveDraft('');
      router.push(`/app/market/messages?c=${encodeURIComponent(conversation.id)}`);
    } catch (e: any) {
      setError(e.message || 'Envoi impossible.');
      setSending(false);
    }
  };

  const btn =
    variant === 'primary'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : 'border border-charcoal-300 hover:border-charcoal-900 text-charcoal-900 bg-white';

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold transition-colors ${btn} ${className}`}
      >
        <Mail className="w-4 h-4" /> Contacter {variant === 'primary' ? sellerName : 'le vendeur'}
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Écrire à ${sellerName}`}
          >
            <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={sellerName} photoUrl={sellerPhoto} size={44} />
                  <div className="min-w-0">
                    <p className="label-xs text-rose-600">Message</p>
                    <h2 className="font-serif text-xl text-charcoal-900 leading-snug truncate">Écrire à {sellerName}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="p-1.5 text-charcoal-400 hover:text-charcoal-900 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {listing && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-charcoal-200 bg-ivory-50/60">
                  <div className="w-12 h-12 bg-charcoal-100 overflow-hidden flex-shrink-0 rounded-lg">
                    {listing.image && <img src={listing.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{listing.title}</p>
                    <p className="text-xs text-charcoal-500">{listing.price.toLocaleString('fr-FR')} €</p>
                  </div>
                </div>
              )}

            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      const next = text ? text : q;
                      setText(next);
                      saveDraft(next);
                    }}
                    className="px-3 py-1.5 rounded-full border border-charcoal-200 hover:border-rose-400 hover:text-rose-600 text-xs text-charcoal-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <textarea
                rows={5}
                value={text}
                maxLength={MESSAGE_MAX_LENGTH}
                onChange={(e) => {
                  setText(e.target.value);
                  saveDraft(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
                }}
                placeholder="Bonjour, …"
                className="input-field resize-none leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-charcoal-400 mt-1.5 text-right tabular-nums">
                {text.length} / {MESSAGE_MAX_LENGTH}
              </p>
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 text-xs text-amber-900 leading-relaxed">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Ne payez jamais en dehors de LeOui Market. Les liens externes sont refusés dans les messages.</span>
            </div>

            {!user && !authLoading && (
              <p className="text-xs text-charcoal-500">
                Un compte est nécessaire pour envoyer votre message — il sera conservé le temps de vous connecter ou de vous inscrire.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : user ? 'Envoyer le message' : 'Se connecter pour envoyer'}
            </button>
            {!user && !authLoading && (
              <button
                type="button"
                onClick={() => {
                  saveDraft(text);
                  const next = `${window.location.pathname}?contact=1`;
                  router.push(`/market/inscription?next=${encodeURIComponent(next)}`);
                }}
                className="w-full text-center text-sm font-semibold text-charcoal-600 hover:text-rose-600 transition-colors -mt-1"
              >
                Pas encore de compte ? <span className="underline underline-offset-4">S'inscrire gratuitement</span>
              </button>
            )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
