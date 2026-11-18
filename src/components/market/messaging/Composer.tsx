'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, Loader2, SendHorizonal, X } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from '@/lib/market/messaging-rules';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Zone de saisie : Entrée envoie, Maj+Entrée fait un saut de ligne, photos ≤ 5 Mo.
export default function Composer({
  value,
  onChange,
  files,
  onFilesChange,
  onSend,
  sending,
  disabled,
  disabledReason,
}: {
  value: string;
  onChange: (v: string) => void;
  files: File[];
  onFilesChange: (f: File[]) => void;
  onSend: () => void;
  sending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`${MAX_ATTACHMENTS} photos maximum par message.`);
        break;
      }
      if (!f.type.startsWith('image/')) {
        toast.error('Seules des photos peuvent être jointes.');
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`« ${f.name} » dépasse 5 Mo.`);
        continue;
      }
      next.push(f);
    }
    onFilesChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const canSend = !disabled && !sending && (value.trim().length > 0 || files.length > 0);

  return (
    <div className="border-t border-charcoal-200 bg-white">
      {disabled && disabledReason && (
        <p className="px-4 pt-3 text-xs text-charcoal-500">{disabledReason}</p>
      )}
      {files.length > 0 && (
        <div className="flex gap-2 px-4 pt-3">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-charcoal-200 bg-charcoal-100">
              <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                aria-label={`Retirer ${f.name}`}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-charcoal-900/80 text-white flex items-center justify-center hover:bg-charcoal-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Joindre une photo"
          className="p-2.5 rounded-full text-charcoal-500 hover:bg-ivory-50 hover:text-charcoal-900 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <textarea
            ref={areaRef}
            value={value}
            disabled={disabled || sending}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder={disabled ? 'Conversation bloquée' : 'Votre message…'}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={1}
            className="input-field resize-none pr-10 py-2.5 leading-relaxed max-h-[140px]"
          />
          {value.length > MESSAGE_MAX_LENGTH * 0.8 && (
            <span className="absolute right-3 bottom-3 text-[10px] text-charcoal-400 tabular-nums">
              {value.length}/{MESSAGE_MAX_LENGTH}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Envoyer le message"
          className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:hover:bg-rose-600 transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizonal className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
