import React from 'react';
import { User } from 'lucide-react';

// ── Avatar : photo ronde, ou silhouette de profil neutre quand il n'y a pas de photo ──

export function Avatar({
  name,
  photoUrl,
  size = 40,
  className = '',
}: {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size } as const;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || ''}
        style={box}
        className={`object-cover flex-shrink-0 rounded-full border border-charcoal-200 ${className}`}
      />
    );
  }
  return (
    <span
      style={box}
      className={`flex-shrink-0 inline-flex items-center justify-center rounded-full bg-charcoal-100 text-charcoal-400 ${className}`}
      role="img"
      aria-label={name ? `Profil de ${name}` : 'Profil'}
    >
      <User style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.6} />
    </span>
  );
}

// ── Ligne de conduite pointillée (clin d'œil au menu de mariage) ────────────────

export function Leader({
  label,
  value,
  strong = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className={strong ? 'text-charcoal-900 font-medium' : 'text-charcoal-600'}>{label}</span>
      <span className="flex-1 border-b border-dotted border-charcoal-300 translate-y-[-3px]" aria-hidden />
      <span className={`tabular-nums ${strong ? 'font-serif text-lg text-charcoal-900' : 'font-medium text-charcoal-900'}`}>
        {value}
      </span>
    </div>
  );
}

// ── Statut : point coloré + petites capitales (aucune pastille pastel) ──────────

const TONES = {
  rose: 'bg-rose-600',
  amber: 'bg-amber-500',
  green: 'bg-green-600',
  red: 'bg-red-600',
  grey: 'bg-charcoal-400',
} as const;

export function StatusTag({ tone = 'grey', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 label-xs text-charcoal-700 whitespace-nowrap">
      <span className={`w-1.5 h-1.5 rounded-full ${TONES[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

// ── Titre de section éditorial : sur-titre en petites capitales + filet ─────────

export function SectionTitle({
  eyebrow,
  title,
  aside,
}: {
  eyebrow?: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pb-3 mb-5 border-b border-charcoal-900">
      <div>
        {eyebrow && <p className="label-xs text-rose-600 mb-1">{eyebrow}</p>}
        <h2 className="font-serif text-2xl text-charcoal-900 leading-none">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

// ── Champ de formulaire ─────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label-xs text-charcoal-600 mb-2 block">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-charcoal-400 mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputCls = 'input-field';
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-11 px-6 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-[0.08em] uppercase transition-colors';
export const ghostBtn =
  'inline-flex items-center justify-center gap-2 h-11 px-6 border border-charcoal-300 hover:border-charcoal-900 text-charcoal-800 text-xs font-semibold tracking-[0.08em] uppercase transition-colors';
