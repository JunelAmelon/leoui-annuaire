'use client';

/**
 * Paramètres du livre d'or — modal plein écran sur mobile, deux colonnes sur desktop :
 *   haut / gauche = aperçu en direct (page invité ou carte de table)
 *   bas  / droite = formulaire par onglets (Page invité · Carte de table · Général)
 * Rendu dans un portail (document.body) : le fond sombre couvre toujours toute la fenêtre,
 * quel que soit le conteneur parent. Aucune persistance ici : `onSave` / `onUploadCover` viennent de l'appelant (DIP).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ImageIcon, Loader2, RotateCcw, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Guestbook } from '../domain/types';
import {
  CARD_INKS, CARD_PAPERS, GUESTBOOK_CARD_DEFAULTS,
  effectiveCardImage, effectiveCover, resolveCardDesign, resolvePageContent,
  type CardFallback, type CardInk, type CardPaper, type GuestbookCardDesign, type GuestbookPageContent,
} from '../domain/customization';
import { TableCardPreview } from './TableCardPreview';

export interface SettingsSaveInput {
  title: string;
  maxDuration: number;
  page: GuestbookPageContent;
  card: GuestbookCardDesign;
}

type Tab = 'general' | 'page' | 'card';
const TABS: { key: Tab; label: string }[] = [
  { key: 'page', label: 'Page invité' },
  { key: 'card', label: 'Carte de table' },
  { key: 'general', label: 'Général' },
];

const inputCls =
  'w-full px-3 py-2.5 sm:py-2 rounded-lg border border-stone-200 bg-white text-[15px] sm:text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-100 transition-colors';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-charcoal-500">{label}</span>
      {children}
      {hint && <span className="block text-[10.5px] text-charcoal-400">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-[10px] font-semibold tracking-[0.14em] uppercase text-rose-600">{title}</h4>
      {children}
    </section>
  );
}

/** Ligne « miniature + action » pour une image remplaçable. */
function ImageRow({ src, custom, label, onPick, onReset, busy }: {
  src: string; custom: boolean; label: string; onPick: () => void; onReset: () => void; busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/80">
      <img src={src} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-rose-500" /> {custom ? 'Votre image' : 'Image par défaut'}
        </p>
        <p className="text-[11px] text-charcoal-400 mt-0.5 leading-snug">{label}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
        <button type="button" onClick={onPick} disabled={busy}
          className="px-3 h-8 rounded-lg border border-stone-300 text-xs font-semibold text-charcoal-700 hover:border-rose-400 hover:text-rose-600 disabled:opacity-60">
          {busy ? '…' : 'Choisir'}
        </button>
        {custom && (
          <button type="button" onClick={onReset} className="px-2.5 h-8 rounded-lg text-xs font-medium text-charcoal-500 hover:bg-stone-200/60">
            Par défaut
          </button>
        )}
      </div>
    </div>
  );
}

export function GuestbookSettingsModal({
  guestbook, fallback, publicUrl, onClose, onSave, onUploadCover,
}: {
  guestbook: Guestbook;
  fallback: CardFallback;
  publicUrl: string;
  onClose: () => void;
  onSave: (input: SettingsSaveInput) => Promise<void>;
  onUploadCover: (file: File) => Promise<string>;
}) {
  const [tab, setTab] = useState<Tab>('page');
  const [title, setTitle] = useState(guestbook.title);
  const [maxDuration, setMaxDuration] = useState(guestbook.settings.max_duration_sec);
  const [page, setPage] = useState<GuestbookPageContent>(() => resolvePageContent(guestbook.page));
  // Brouillon « brut » : names / lieu / date vides = automatiques (résolus pour l'aperçu seulement)
  const [card, setCard] = useState<GuestbookCardDesign>(() => ({ ...GUESTBOOK_CARD_DEFAULTS, ...(guestbook.card || {}) }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<'page' | 'card'>('page');

  // Portail + blocage du défilement de la page derrière le modal
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const setP = <K extends keyof GuestbookPageContent>(k: K, v: GuestbookPageContent[K]) => setPage((p) => ({ ...p, [k]: v }));
  const setC = <K extends keyof GuestbookCardDesign>(k: K, v: GuestbookCardDesign[K]) => setCard((c) => ({ ...c, [k]: v }));
  const resolvedCard = resolveCardDesign(card, fallback);

  const pickImage = (target: 'page' | 'card') => { uploadTarget.current = target; fileRef.current?.click(); };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Choisissez une image (JPG, PNG…).');
    if (file.size > 10 * 1024 * 1024) return toast.error('Image trop lourde (10 Mo maximum).');
    setUploading(true);
    try {
      const url = await onUploadCover(file);
      if (uploadTarget.current === 'card') setC('image_url', url);
      else setP('cover_url', url);
      toast.success('Image importée — pensez à enregistrer.');
    } catch (e: any) {
      toast.error(e?.message || 'Import impossible.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ title, maxDuration, page, card });
    } finally {
      setSaving(false);
    }
  };

  const cover = effectiveCover(page);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center md:p-6 bg-charcoal-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Personnaliser le livre d’or">
      <div className="bg-white w-full md:max-w-5xl h-[100dvh] md:h-[86vh] md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* ───────── Aperçu en direct (bandeau sur mobile, colonne sur desktop) ───────── */}
        <div className="relative md:w-[42%] flex-shrink-0 h-[200px] md:h-auto bg-[#1C1417] overflow-hidden">
          {tab === 'card' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3 md:p-6 bg-gradient-to-br from-[#2A1A1E] to-[#1C1417]">
              <p className="hidden md:block text-[10px] font-semibold tracking-[0.16em] uppercase text-rose-200/80">Aperçu de la carte</p>
              <TableCardPreview design={resolvedCard} publicUrl={publicUrl} className="w-[230px] sm:w-[260px] md:w-full md:max-w-[420px]" />
              <p className="hidden md:block text-[11px] text-white/45 text-center max-w-[300px]">
                A4 paysage à plier en trois — chaque panneau devient une face de votre carte chevalet.
              </p>
            </div>
          ) : (
            <>
              <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1417] via-[#1C1417]/40 to-[#1C1417]/10" />
              <div className="absolute bottom-0 inset-x-0 p-4 md:p-8">
                <p className="text-[0.58rem] md:text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white/70 mb-1.5">{page.eyebrow}</p>
                <h3 className="font-serif text-white leading-tight text-xl md:text-3xl line-clamp-2" style={{ fontWeight: 400 }}>{title || 'Livre d’or'}</h3>
                <p className="hidden md:block text-sm text-white/75 mt-2.5 max-w-sm leading-relaxed font-light">{page.subtitle}</p>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <button type="button" onClick={() => pickImage('page')} disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/95 text-charcoal-800 text-xs font-semibold shadow hover:bg-white disabled:opacity-60">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploading ? 'Import…' : 'Changer l’image'}
                </button>
              </div>
            </>
          )}
          {/* Fermer — toujours accessible sur mobile (au-dessus de l'aperçu) */}
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleFile(f); }} />
        </div>

        {/* ───────── Formulaire ───────── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-4 sm:px-7 pt-4 md:pt-5 pb-0 border-b border-stone-200/80 flex-shrink-0">
            <div className="hidden md:flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-rose-600">Livre d’or</p>
                <h3 className="font-serif text-xl text-charcoal-900 leading-tight mt-0.5">Personnaliser</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:bg-stone-100 hover:text-charcoal-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="md:hidden font-serif text-lg text-charcoal-900 mb-2">Personnaliser</p>
            <div className="grid grid-cols-3 md:flex md:gap-1 -mb-px">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`px-1 md:px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key ? 'border-rose-600 text-rose-700' : 'border-transparent text-charcoal-400 hover:text-charcoal-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain subtle-scroll px-4 sm:px-7 py-5 space-y-7">
            {tab === 'page' && (
              <>
                <Section title="Image & en-tête">
                  <ImageRow src={cover} custom={!!page.cover_url} busy={uploading}
                    label="Affichée en grand sur le téléphone de vos invités."
                    onPick={() => pickImage('page')} onReset={() => setP('cover_url', null)} />
                  <Field label="Petit titre au-dessus"><input className={inputCls} value={page.eyebrow} maxLength={60} onChange={(e) => setP('eyebrow', e.target.value)} /></Field>
                  <Field label="Titre principal"><input className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
                  <Field label="Phrase d’accueil"><textarea rows={2} className={`${inputCls} resize-none`} value={page.subtitle} maxLength={220} onChange={(e) => setP('subtitle', e.target.value)} /></Field>
                </Section>

                <Section title="Formulaire">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Onglet « écrit »"><input className={inputCls} value={page.tab_text_label} maxLength={30} onChange={(e) => setP('tab_text_label', e.target.value)} /></Field>
                    <Field label="Onglet « vocal »"><input className={inputCls} value={page.tab_audio_label} maxLength={30} onChange={(e) => setP('tab_audio_label', e.target.value)} /></Field>
                  </div>
                  <Field label="Question du nom"><input className={inputCls} value={page.name_label} maxLength={60} onChange={(e) => setP('name_label', e.target.value)} /></Field>
                  <Field label="Exemple dans le champ du nom"><input className={inputCls} value={page.name_placeholder} maxLength={100} onChange={(e) => setP('name_placeholder', e.target.value)} /></Field>
                  <Field label="Titre du message écrit"><input className={inputCls} value={page.text_label} maxLength={60} onChange={(e) => setP('text_label', e.target.value)} /></Field>
                  <Field label="Texte d’aide du message"><textarea rows={2} className={`${inputCls} resize-none`} value={page.text_placeholder} maxLength={200} onChange={(e) => setP('text_placeholder', e.target.value)} /></Field>
                  <Field label="Bouton d’envoi"><input className={inputCls} value={page.submit_label} maxLength={40} onChange={(e) => setP('submit_label', e.target.value)} /></Field>
                </Section>

                <Section title="Après l’envoi">
                  <Field label="Titre de remerciement" hint="{nom} est remplacé par le prénom de l’invité."><input className={inputCls} value={page.thanks_title} maxLength={80} onChange={(e) => setP('thanks_title', e.target.value)} /></Field>
                  <Field label="Message de remerciement"><textarea rows={3} className={`${inputCls} resize-none`} value={page.thanks_text} maxLength={320} onChange={(e) => setP('thanks_text', e.target.value)} /></Field>
                  <Field label="Bouton « nouveau message »"><input className={inputCls} value={page.another_label} maxLength={50} onChange={(e) => setP('another_label', e.target.value)} /></Field>
                </Section>
              </>
            )}

            {tab === 'card' && (
              <>
                <Section title="Photo">
                  <ImageRow src={effectiveCardImage(card)} custom={!!card.image_url} busy={uploading}
                    label="Face gauche de la carte — portrait de préférence."
                    onPick={() => pickImage('card')} onReset={() => setC('image_url', null)} />
                  <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
                    <span className="text-sm text-charcoal-700">Photo en noir & blanc</span>
                    <input type="checkbox" checked={card.image_grayscale} onChange={(e) => setC('image_grayscale', e.target.checked)}
                      className="w-4 h-4 accent-rose-600" />
                  </label>
                  <Field label="Mot manuscrit sous la photo"><input className={inputCls} value={card.caption} maxLength={40} onChange={(e) => setC('caption', e.target.value)} /></Field>
                </Section>

                <Section title="Style">
                  <div>
                    <p className="text-[11px] font-medium text-charcoal-500 mb-2">Couleur d’encre</p>
                    <div className="flex gap-2.5 flex-wrap">
                      {(Object.keys(CARD_INKS) as CardInk[]).map((k) => (
                        <button key={k} type="button" onClick={() => setC('ink', k)} title={CARD_INKS[k].label} aria-pressed={card.ink === k}
                          className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full border-2 transition-transform flex items-center justify-center ${card.ink === k ? 'border-rose-500 scale-110' : 'border-stone-200'}`}
                          style={{ background: CARD_INKS[k].hex }}>
                          {card.ink === k && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-charcoal-500 mb-2">Papier</p>
                    <div className="flex gap-2">
                      {(Object.keys(CARD_PAPERS) as CardPaper[]).map((k) => (
                        <button key={k} type="button" onClick={() => setC('paper', k)} aria-pressed={card.paper === k}
                          className={`px-3.5 h-10 sm:h-9 rounded-lg border text-xs font-semibold ${card.paper === k ? 'border-rose-400 text-rose-700 bg-rose-50/40' : 'border-stone-200 text-charcoal-600'}`}>
                          <span className="inline-block w-3 h-3 rounded-full border border-stone-300 mr-2 align-[-1px]" style={{ background: CARD_PAPERS[k].hex }} />
                          {CARD_PAPERS[k].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Couple, lieu & date">
                  <Field label="Mot d’accueil"><input className={inputCls} value={card.welcome_label} maxLength={50} onChange={(e) => setC('welcome_label', e.target.value)} /></Field>
                  <Field label="Prénoms" hint="Laissez vide pour utiliser ceux de votre mariage."><input className={inputCls} value={card.names} placeholder={fallback.names} maxLength={60} onChange={(e) => setC('names', e.target.value)} /></Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Lieu"><input className={inputCls} value={card.place_line} placeholder={fallback.place} maxLength={70} onChange={(e) => setC('place_line', e.target.value)} /></Field>
                    <Field label="Date"><input className={inputCls} value={card.date_line} placeholder={fallback.date} maxLength={40} onChange={(e) => setC('date_line', e.target.value)} /></Field>
                  </div>
                </Section>

                <Section title="Face centrale">
                  <Field label="Titre manuscrit"><input className={inputCls} value={card.section_title} maxLength={40} onChange={(e) => setC('section_title', e.target.value)} /></Field>
                  {[0, 1, 2, 3].map((i) => (
                    <Field key={i} label={`Ligne ${i + 1}`}>
                      <input className={inputCls} value={card.section_lines[i] ?? ''} maxLength={140}
                        onChange={(e) => { const l = [...card.section_lines]; l[i] = e.target.value; while (l.length < 4) l.push(''); setC('section_lines', l); }} />
                    </Field>
                  ))}
                </Section>

                <Section title="QR code & fin">
                  <Field label="Titre au-dessus du texte"><input className={inputCls} value={card.cta_title} maxLength={40} onChange={(e) => setC('cta_title', e.target.value)} /></Field>
                  <Field label="Explication"><textarea rows={2} className={`${inputCls} resize-none`} value={card.cta_text} maxLength={200} onChange={(e) => setC('cta_text', e.target.value)} /></Field>
                  <Field label="Mot manuscrit de fin"><input className={inputCls} value={card.closing_word} maxLength={30} onChange={(e) => setC('closing_word', e.target.value)} /></Field>
                </Section>
              </>
            )}

            {tab === 'general' && (
              <Section title="Messages vocaux">
                <Field label="Durée maximale par message vocal">
                  <select value={maxDuration} onChange={(e) => setMaxDuration(Number(e.target.value))} className={inputCls}>
                    <option value={60}>1 minute (court & spontané)</option>
                    <option value={120}>2 minutes (recommandé)</option>
                    <option value={180}>3 minutes (messages longs)</option>
                  </select>
                </Field>
              </Section>
            )}
          </div>

          <div className="px-4 sm:px-7 py-3 sm:py-4 border-t border-stone-200/80 flex items-center justify-between gap-3 flex-shrink-0 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="hidden lg:block text-[11px] text-charcoal-400">Les modifications sont visibles tout de suite sur la page de vos invités.</p>
            <div className="flex items-center gap-2 w-full lg:w-auto lg:ml-auto">
              <button type="button" onClick={onClose} className="flex-1 lg:flex-none px-4 h-11 sm:h-9 rounded-lg text-xs font-semibold text-charcoal-600 border border-stone-200 lg:border-0 hover:bg-stone-100">Annuler</button>
              <button type="button" onClick={submit} disabled={saving || uploading}
                className="flex-1 lg:flex-none px-5 h-11 sm:h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
