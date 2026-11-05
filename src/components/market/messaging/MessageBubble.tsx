'use client';

import { useEffect, useState } from 'react';
import { Ban, Check, CheckCheck, Clock, Pencil, Trash2, X } from 'lucide-react';
import { MarketMessage } from '@/lib/market/messaging-types';
import { EDIT_WINDOW_MS, MESSAGE_MAX_LENGTH } from '@/lib/market/messaging-rules';
import { timeOf } from './format';

export type PendingState = 'sending' | 'failed';

export default function MessageBubble({
  message,
  mine,
  seen,
  canModify,
  editing,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  pending,
  onRetry,
  onRecover,
  onImageClick,
  now,
}: {
  message: MarketMessage;
  mine: boolean;
  seen: boolean;
  canModify: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (body: string) => void;
  onDelete: () => void;
  pending?: PendingState;
  onRetry?: () => void;
  onRecover?: () => void;
  onImageClick?: (url: string) => void;
  now: number;
}) {
  const [draft, setDraft] = useState(message.body);
  useEffect(() => {
    if (editing) setDraft(message.body);
  }, [editing, message.body]);

  const deleted = !!message.deleted_at;
  const remainingMs = EDIT_WINDOW_MS - (now - Date.parse(message.created_at));

  return (
    <div className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {deleted ? (
          <p className="flex items-center gap-1.5 text-xs italic text-charcoal-400 px-3 py-2 border border-charcoal-200 rounded-2xl">
            <Ban className="w-3.5 h-3.5" /> Message supprimé
          </p>
        ) : editing ? (
          <div className="w-[min(24rem,80vw)] bg-charcoal-900 text-white rounded-2xl rounded-br-sm p-3 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={Math.min(8, Math.max(2, draft.split('\n').length + 1))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) onSaveEdit(draft);
                }
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed whitespace-pre-wrap break-words"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3 text-[11px]">
              <button type="button" onClick={onCancelEdit} className="text-white/60 hover:text-white">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => draft.trim() && onSaveEdit(draft)}
                disabled={!draft.trim()}
                className="inline-flex items-center gap-1 font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
              mine
                ? 'bg-charcoal-900 text-white rounded-br-sm'
                : 'bg-white border border-charcoal-200 text-charcoal-900 rounded-bl-sm'
            }`}
          >
            {message.attachments.length > 0 && (
              <div className={`grid gap-1.5 mb-2 ${message.attachments.length > 1 ? 'grid-cols-2' : ''}`}>
                {message.attachments.map((a) => (
                  <button
                    key={a.url}
                    type="button"
                    onClick={() => onImageClick?.(a.url)}
                    className="block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <img src={a.url} alt="Pièce jointe" className="w-full max-h-56 object-cover hover:opacity-90 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
            {message.body}
          </div>
        )}

        {/* Actions auteur : visibles au survol / focus, dans la fenêtre de 10 min */}
        {!deleted && !editing && mine && canModify && !pending && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Modifier le message"
              className="p-1 text-charcoal-400 hover:text-charcoal-900"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer le message"
              className="p-1 text-charcoal-400 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-charcoal-300 tabular-nums">
              {Math.max(1, Math.ceil(remainingMs / 60_000))} min
            </span>
          </div>
        )}

        <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${pending === 'failed' ? 'text-red-600' : 'text-charcoal-400'}`}>
          {pending === 'sending' && (
            <>
              <Clock className="w-3 h-3" /> Envoi…
            </>
          )}
          {pending === 'failed' && (
            <>
              <X className="w-3 h-3" /> Non envoyé
              {onRetry && (
                <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2 hover:text-red-700">
                  Réessayer
                </button>
              )}
              {onRecover && (
                <button type="button" onClick={onRecover} className="underline underline-offset-2 hover:text-red-700">
                  Récupérer
                </button>
              )}
            </>
          )}
          {!pending && (
            <>
              <span className="tabular-nums">{timeOf(message.created_at)}</span>
              {message.edited_at && !deleted && <span>(modifié)</span>}
              {mine && !deleted &&
                (seen ? (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 font-medium">
                    <CheckCheck className="w-3.5 h-3.5" /> Vu
                  </span>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
