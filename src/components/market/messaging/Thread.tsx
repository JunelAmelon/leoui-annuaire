'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, Ban, ChevronUp, Flag, Loader2, MoreVertical, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '../ui';
import MessageBubble, { PendingState } from './MessageBubble';
import Composer from './Composer';
import { MarketConversation, ConversationReportReason } from '@/lib/market/messaging-types';
import { canModifyMessage, isSeenBy } from '@/lib/market/messaging-rules';
import { useMessages, usePresenceOf } from '@/lib/market/client/realtime';
import { marketApi, newClientId } from '@/lib/market/client/api';
import { uploadFile } from '@/lib/storage';
import { dayLabel, relativeSince } from './format';

const PAGE_SIZE = 50;
const REPORT_REASONS: { value: ConversationReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'arnaque', label: 'Tentative d’arnaque' },
  { value: 'harcelement', label: 'Harcèlement' },
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié' },
  { value: 'autre', label: 'Autre' },
];

interface PendingMsg {
  client_id: string;
  body: string;
  files: File[];
  /** Aperçus locaux figés à la création (révoqués au retrait). */
  previews: string[];
  status: PendingState;
  created_at: string;
}

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Thread({
  conversation,
  uid,
  onBack,
}: {
  conversation: MarketConversation;
  uid: string;
  onBack?: () => void;
}) {
  const otherId = conversation.participant_ids.find((id) => id !== uid) as string;
  const other = conversation.participants[otherId];
  const isSeller = otherId === conversation.seller_id;

  const [limit, setLimit] = useState(PAGE_SIZE);
  const { messages, ready, hasMore } = useMessages(conversation.id, limit);
  const { online, lastSeen, now } = usePresenceOf(otherId);

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingMsg[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ConversationReportReason>('spam');
  const [reportComment, setReportComment] = useState('');
  const [reporting, setReporting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [safetyDismissed, setSafetyDismissed] = useState(() => {
    try {
      return !!localStorage.getItem('market_msg_safety_dismissed');
    } catch {
      return false;
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastMarked = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingMsg[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => pendingRef.current.forEach((p) => p.previews.forEach(URL.revokeObjectURL)),
    []
  );

  // Accusé de lecture : on marque lu une fois par dernier message reçu.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!ready || !last || last.sender_id === uid || last.id === lastMarked.current) return;
    if (document.visibilityState !== 'visible') return;
    lastMarked.current = last.id;
    marketApi(`/api/market/conversations/${conversation.id}/read`, { method: 'POST' }).catch(() => {
      lastMarked.current = null;
    });
  }, [messages, ready, conversation.id, uid]);

  // Défilement : on reste en bas si l'utilisateur y était déjà.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = useCallback(async () => {
    const body = text.trim();
    const attachments = files;
    if (!body && attachments.length === 0) return;
    const p: PendingMsg = {
      client_id: newClientId(),
      body,
      files: attachments,
      previews: attachments.map((f) => URL.createObjectURL(f)),
      status: 'sending',
      created_at: new Date().toISOString(),
    };
    setPending((prev) => [...prev, p]);
    setText('');
    setFiles([]);
    setSending(true);
    try {
      const uploaded = await Promise.all(attachments.map((f) => uploadFile(f, `market/messages/${conversation.id}`)));
      await marketApi(`/api/market/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, attachments: uploaded.map((url) => ({ url })), client_id: p.client_id }),
      });
      setPending((prev) => prev.filter((m) => m.client_id !== p.client_id));
      p.previews.forEach(URL.revokeObjectURL);
      nearBottom.current = true;
    } catch (e: any) {
      setPending((prev) => prev.map((m) => (m.client_id === p.client_id ? { ...m, status: 'failed' } : m)));
      toast.error(e?.message || 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }, [text, files, conversation.id]);

  const retry = async (p: PendingMsg) => {
    setPending((prev) => prev.map((m) => (m.client_id === p.client_id ? { ...m, status: 'sending' } : m)));
    try {
      const uploaded = await Promise.all(p.files.map((f) => uploadFile(f, `market/messages/${conversation.id}`)));
      await marketApi(`/api/market/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: p.body, attachments: uploaded.map((url) => ({ url })), client_id: p.client_id }),
      });
      setPending((prev) => prev.filter((m) => m.client_id !== p.client_id));
      p.previews.forEach(URL.revokeObjectURL);
    } catch (e: any) {
      setPending((prev) => prev.map((m) => (m.client_id === p.client_id ? { ...m, status: 'failed' } : m)));
      toast.error(e?.message || 'Envoi impossible.');
    }
  };

  const recover = (p: PendingMsg) => {
    setText((t) => (t ? `${t}\n${p.body}` : p.body));
    setFiles((f) => [...f, ...p.files].slice(0, 3));
    setPending((prev) => prev.filter((m) => m.client_id !== p.client_id));
    p.previews.forEach(URL.revokeObjectURL);
  };

  const saveEdit = async (messageId: string, body: string) => {
    try {
      await marketApi(`/api/market/conversations/${conversation.id}/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      });
      setEditingId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Modification impossible.');
    }
  };

  const removeMessage = async (messageId: string) => {
    if (!window.confirm('Supprimer ce message ? Le contenu sera effacé pour les deux participants.')) return;
    try {
      await marketApi(`/api/market/conversations/${conversation.id}/messages/${messageId}`, { method: 'DELETE' });
    } catch (e: any) {
      toast.error(e?.message || 'Suppression impossible.');
    }
  };

  const setBlock = async (blocked: boolean) => {
    try {
      await marketApi('/api/market/blocks', {
        method: 'POST',
        body: JSON.stringify({ user_id: otherId, blocked }),
      });
      toast.success(blocked ? `${other?.display_name} est bloqué.` : 'Blocage retiré.');
      setMenuOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Action impossible.');
    }
  };

  const report = async () => {
    setReporting(true);
    try {
      await marketApi(`/api/market/conversations/${conversation.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: reportReason, comment: reportComment || undefined }),
      });
      toast.success('Signalement envoyé. Notre équipe l’examinera.');
      setReportOpen(false);
      setReportComment('');
    } catch (e: any) {
      toast.error(e?.message || 'Signalement impossible.');
    } finally {
      setReporting(false);
    }
  };

  const blockedByMe = conversation.blocked_by === uid;
  const blockedMe = !!conversation.blocked_by && conversation.blocked_by !== uid;

  const rows = useMemo(() => {
    const out: ({ type: 'day'; label: string } | { type: 'msg'; message: (typeof messages)[number] } | { type: 'pending'; p: PendingMsg })[] = [];
    let lastDay = '';
    for (const m of messages) {
      const label = dayLabel(m.created_at, now);
      if (label !== lastDay) {
        out.push({ type: 'day', label });
        lastDay = label;
      }
      out.push({ type: 'msg', message: m });
    }
    for (const p of pending) out.push({ type: 'pending', p });
    return out;
  }, [messages, pending, now]);

  const otherReadAt = conversation.last_read_at?.[otherId] ?? null;

  return (
    <div className="flex flex-col min-h-0 h-full bg-white">
      {/* En-tête */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-charcoal-200 flex-shrink-0">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Retour aux conversations" className="lg:hidden p-1.5 -ml-1.5 text-charcoal-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Avatar name={other?.display_name} photoUrl={other?.photo_url} size={40} />
        <div className="min-w-0 flex-1">
          {isSeller ? (
            <Link href={`/market/vendeur/${otherId}`} className="text-sm font-semibold text-charcoal-900 hover:text-rose-600 truncate block">
              {other?.display_name ?? 'Utilisateur'}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-charcoal-900 truncate">{other?.display_name ?? 'Utilisateur'}</p>
          )}
          <p className={`flex items-center gap-1.5 text-xs ${online ? 'text-green-600' : 'text-charcoal-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-charcoal-300'}`} aria-hidden />
            {online ? 'En ligne' : lastSeen ? `Vu ${relativeSince(lastSeen, now)}` : 'Hors ligne'}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Options de la conversation"
            aria-expanded={menuOpen}
            className="p-2 text-charcoal-500 hover:text-charcoal-900 hover:bg-ivory-50 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 w-56 bg-white border border-charcoal-200 shadow-soft-xl rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-charcoal-700 hover:bg-ivory-50"
              >
                <Flag className="w-4 h-4" /> Signaler la conversation
              </button>
              <button
                type="button"
                onClick={() => setBlock(!blockedByMe)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
              >
                <Ban className="w-4 h-4" /> {blockedByMe ? `Débloquer ${other?.display_name}` : `Bloquer ${other?.display_name}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Annonce concernée */}
      {conversation.listing_snapshot && (
        <Link
          href={`/market/produit/${conversation.listing_snapshot.slug}`}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-charcoal-100 bg-ivory-50/60 hover:bg-ivory-50 transition-colors flex-shrink-0"
        >
          <div className="w-10 h-10 bg-charcoal-100 overflow-hidden flex-shrink-0 rounded">
            {conversation.listing_snapshot.image && (
              <img src={conversation.listing_snapshot.image} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-charcoal-900 truncate">{conversation.listing_snapshot.title}</p>
            <p className="text-[11px] text-charcoal-500">{eur(conversation.listing_snapshot.price)} €</p>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 flex-shrink-0">Voir l’annonce</span>
        </Link>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-ivory-50/40">
        {safetyDismissed === false && (
          <div className="flex items-start gap-2.5 p-3 mb-2 bg-amber-50 border border-amber-100 text-xs text-amber-900 leading-relaxed rounded-xl">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">
              Pour votre sécurité, ne payez jamais en dehors de LeOui Market et privilégiez la commande via l’annonce.
            </span>
            <button
              type="button"
              aria-label="Fermer l’avertissement"
              onClick={() => {
                setSafetyDismissed(true);
                try {
                  localStorage.setItem('market_msg_safety_dismissed', '1');
                } catch {}
              }}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="mx-auto flex items-center gap-1.5 text-xs font-medium text-charcoal-500 hover:text-rose-600 py-1"
          >
            <ChevronUp className="w-3.5 h-3.5" /> Charger les messages précédents
          </button>
        )}
        {!ready && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
          </div>
        )}
        {ready && rows.length === 0 && (
          <p className="text-center text-sm text-charcoal-400 py-10">Aucun message. Écrivez le premier&nbsp;!</p>
        )}
        {rows.map((r, i) =>
          r.type === 'day' ? (
            <div key={`day-${i}`} className="flex justify-center py-1">
              <span className="text-[11px] font-medium text-charcoal-400 bg-white border border-charcoal-100 rounded-full px-3 py-1 capitalize">
                {r.label}
              </span>
            </div>
          ) : r.type === 'pending' ? (
            <MessageBubble
              key={r.p.client_id}
              message={{
                id: r.p.client_id,
                conversation_id: conversation.id,
                sender_id: uid,
                body: r.p.body,
                attachments: r.p.previews.map((url) => ({ url })),
                created_at: r.p.created_at,
                edited_at: null,
                deleted_at: null,
              }}
              mine
              seen={false}
              canModify={false}
              editing={false}
              onEdit={() => {}}
              onCancelEdit={() => {}}
              onSaveEdit={() => {}}
              onDelete={() => {}}
              pending={r.p.status}
              onRetry={r.p.status === 'failed' ? () => retry(r.p) : undefined}
              onRecover={r.p.status === 'failed' ? () => recover(r.p) : undefined}
              onImageClick={setLightbox}
              now={now}
            />
          ) : (
            <MessageBubble
              key={r.message.id}
              message={r.message}
              mine={r.message.sender_id === uid}
              seen={isSeenBy(r.message, otherReadAt)}
              canModify={canModifyMessage(r.message, uid, now) === 'ok'}
              editing={editingId === r.message.id}
              onEdit={() => setEditingId(r.message.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(body) => saveEdit(r.message.id, body)}
              onDelete={() => removeMessage(r.message.id)}
              onImageClick={setLightbox}
              now={now}
            />
          )
        )}
      </div>

      {/* Saisie */}
      {blockedMe ? (
        <p className="px-4 py-4 border-t border-charcoal-200 text-sm text-charcoal-500 text-center">
          Vous ne pouvez pas répondre à cette conversation.
        </p>
      ) : blockedByMe ? (
        <div className="px-4 py-4 border-t border-charcoal-200 flex items-center justify-between gap-3">
          <p className="text-sm text-charcoal-500">Vous avez bloqué {other?.display_name}.</p>
          <button type="button" onClick={() => setBlock(false)} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
            Débloquer
          </button>
        </div>
      ) : (
        <Composer
          value={text}
          onChange={setText}
          files={files}
          onFilesChange={setFiles}
          onSend={send}
          sending={sending}
        />
      )}

      {/* Visionneuse */}
      {lightbox &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-charcoal-950/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Photo agrandie"
          >
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
            <button
              type="button"
              aria-label="Fermer"
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-charcoal-900/60 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>,
          document.body
        )}

      {/* Signalement */}
      {reportOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-950/40 backdrop-blur-sm"
            onClick={() => setReportOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Signaler la conversation"
          >
          <div className="bg-white w-full max-w-md sm:rounded-3xl rounded-t-3xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="font-serif text-xl text-charcoal-900">Signaler la conversation</h2>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Fermer" className="p-1 text-charcoal-400 hover:text-charcoal-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-3 p-3 border border-charcoal-200 rounded-xl cursor-pointer hover:border-rose-300 has-[:checked]:border-rose-600 has-[:checked]:bg-rose-50/40">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reportReason === r.value}
                    onChange={() => setReportReason(r.value)}
                    className="accent-rose-600"
                  />
                  <span className="text-sm text-charcoal-800">{r.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Précisez si besoin (facultatif)"
              className="input-field resize-none"
            />
            <p className="text-[11px] text-charcoal-400">
              Une copie des derniers messages sera transmise à notre équipe, même s’ils sont supprimés ensuite.
            </p>
            <button
              type="button"
              onClick={report}
              disabled={reporting}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold"
            >
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le signalement'}
            </button>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
