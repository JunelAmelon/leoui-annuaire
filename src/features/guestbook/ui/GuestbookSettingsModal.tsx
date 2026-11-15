'use client';

/**
 * Paramètres du livre d'or — modal en deux colonnes :
 *   gauche  = aperçu en direct (page invité ou carte de table)
 *   droite  = formulaire par onglets (Général · Page invité · Carte de table)
 * Aucune persistance ici : l'appelant fournit `onSave` / `onUploadCover` (DIP).
 */

import { useRef, useState } from 'react';
import { Camera, ImageIcon, Loader2, RotateCcw, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Guestbook } from '../domain/types';
import {
  CARD_INKS, CARD_PAPERS, CARD_TABLE_COUNT_MAX, DEFAULT_GUESTBOOK_COVER, GUESTBOOK_CARD_DEFAULTS,
  effectiveCover, resolveCardDesign, resolvePageContent,
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
  'w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-100 transition-colors';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const setP = <K extends keyof GuestbookPageContent>(k: K, v: GuestbookPageContent[K]) => setPage((p) => ({ ...p, [k]: v }));
  const setC = <K extends keyof GuestbookCardDesign>(k: K, v: GuestbookCardDesign[K]) => setCard((c) => ({ ...c, [k]: v }));
  const resolvedCard = resolveCardDesign(card, fallback);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Choisissez une image (JPG, PNG…).');
    if (file.size > 10 * 1024 * 1024) return toast.error('Image trop lourde (10 Mo maximum).');
    setUploading(true);
    try {
      setP('cover_url', await onUploadCover(file));
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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-charcoal-950/55 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] md:h-[86vh] flex flex-col md:flex-row overflow-hidden">
        {/* ───────── Colonne gauche : aperçu en direct ───────── */}
        <div className="relative md:w-[42%] flex-shrink-0 h-[34vh] md:h-auto bg-[#1C1417] overflow-hidden">
          {tab === 'card' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 sm:p-6 bg-gradient-to-br from-[#2A1A1E] to-[#1C1417]">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-rose-200/80">Aperçu · carte n°1 sur {resolvedCard.table_count}</p>
              <TableCardPreview design={resolvedCard} tableNumber={1} publicUrl={publicUrl} className="w-full max-w-[420px]" />
              <p className="hidden md:block text-[11px] text-white/45 text-center max-w-[300px]">
                A4 paysage à plier en trois — chaque panneau devient une face de votre carte chevalet.
              </p>
            </div>
          ) : (
            <>
              <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1417] via-[#1C1417]/35 to-[#1C1417]/10" />
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-white/70 mb-2">{page.eyebrow}</p>
                <h3 className="font-serif text-white leading-tight text-2xl sm:text-3xl" style={{ fontWeight: 400 }}>{title || 'Livre d’or'}</h3>
                <p className="hidden sm:block text-sm text-white/75 mt-2.5 max-w-sm leading-relaxed font-light">{page.subtitle}</p>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/95 text-charcoal-800 text-xs font-semibold shadow hover:bg-white disabled:opacity-60">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  {uploading ? 'Import…' : 'Changer l’image'}
                </button>
                {page.cover_url && (
                  <button type="button" onClick={() => setP('cover_url', null)}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-black/45 text-white text-xs font-medium hover:bg-black/60 backdrop-blur-sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Image par défaut
                  </button>
                )}
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleFile(f); }} />
        </div>

        {/* ───────── Colonne droite : formulaire ───────── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="px-5 sm:px-7 pt-5 pb-0 border-b border-stone-200/80 flex-shrink-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-rose-600">Livre d’or</p>
                <h3 className="font-serif text-xl text-charcoal-900 leading-tight mt-0.5">Personnaliser</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:bg-stone-100 hover:text-charcoal-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 -mb-px">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t.key ? 'border-rose-600 text-rose-700' : 'border-transparent text-charcoal-400 hover:text-charcoal-700'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto subtle-scroll px-5 sm:px-7 py-5 space-y-7">
            {tab === 'page' && (
              <>
                <Section title="Image & en-tête">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                    <img src={cover} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-charcoal-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                        {page.cover_url ? 'Votre image' : 'Image par défaut'}
                      </p>
                      <p className="text-[11px] text-charcoal-400 mt-0.5">Affichée à gauche sur le téléphone de vos invités.</p>
                    </div>
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="px-3 h-8 rounded-lg border border-stone-300 text-xs font-semibold text-charcoal-700 hover:border-rose-400 hover:text-rose-600 disabled:opacity-60 flex-shrink-0">
                      {uploading ? '…' : 'Choisir'}
                    </button>
                  </div>
                  <Field label="Petit titre au-dessus"><input className={inputCls} value={page.eyebrow} maxLength={60} onChange={(e) => setP('eyebrow', e.target.value)} /></Field>
                  <Field label="Titre principal"><input className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></Field>
                  <Field label="Phrase d’accueil"><textarea rows={2} className={`${inputCls} resize-none`} value={page.subtitle} maxLength={220} onChange={(e) => setP('subtitle', e.target.value)} /></Field>
                </Section>

                <Section title="Formulaire">
                  <div className="grid grid-cols-2 gap-3">
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
                <Section title="Style">
                  <div>
                    <p className="text-[11px] font-medium text-charcoal-500 mb-2">Couleur d’encre</p>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(CARD_INKS) as CardInk[]).map((k) => (
                        <button key={k} type="button" onClick={() => setC('ink', k)} title={CARD_INKS[k].label} aria-pressed={card.ink === k}
                          className={`relative w-9 h-9 rounded-full border-2 transition-transform flex items-center justify-center ${card.ink === k ? 'border-rose-500 scale-110' : 'border-stone-200'}`}
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
                          className={`px-3.5 h-9 rounded-lg border text-xs font-semibold ${card.paper === k ? 'border-rose-400 text-rose-700 bg-rose-50/40' : 'border-stone-200 text-charcoal-600'}`}>
                          <span className="inline-block w-3 h-3 rounded-full border border-stone-300 mr-2 align-[-1px]" style={{ background: CARD_PAPERS[k].hex }} />
                          {CARD_PAPERS[k].label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Face « table »">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Mot manuscrit"><input className={inputCls} value={card.table_word} maxLength={24} onChange={(e) => setC('table_word', e.target.value)} /></Field>
                    <Field label="Nombre de cartes" hint={`Une page par table (1 à ${CARD_TABLE_COUNT_MAX}).`}>
                      <input type="number" min={1} max={CARD_TABLE_COUNT_MAX} className={inputCls} value={card.table_count}
                        onChange={(e) => setC('table_count', Math.min(CARD_TABLE_COUNT_MAX, Math.max(1, Number(e.target.value) || 1)))} />
                    </Field>
                  </div>
                </Section>

                <Section title="Couple, lieu & date">
                  <Field label="Mot d’accueil"><input className={inputCls} value={card.welcome_label} maxLength={50} onChange={(e) => setC('welcome_label', e.target.value)} /></Field>
                  <Field label="Prénoms" hint="Laissez vide pour utiliser ceux de votre mariage."><input className={inputCls} value={card.names} placeholder={fallback.names} maxLength={60} onChange={(e) => setC('names', e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
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

          <div className="px-5 sm:px-7 py-4 border-t border-stone-200/80 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
            <p className="hidden sm:block text-[11px] text-charcoal-400">Les modifications sont visibles tout de suite sur la page de vos invités.</p>
            <div className="flex items-center gap-2 ml-auto">
              <button type="button" onClick={onClose} className="px-4 h-9 rounded-lg text-xs font-semibold text-charcoal-600 hover:bg-stone-100">Annuler</button>
              <button type="button" onClick={submit} disabled={saving || uploading}
                className="px-5 h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 inline-flex items-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_GUESTBOOK_COVER };
