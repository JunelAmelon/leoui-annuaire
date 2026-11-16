'use client';

/**
 * Aperçu éditable de la Gazette (4 pages A4).
 * Une seule mise en page de journal, déclinée par des jetons de thème (papier, encre, filets, titraille) :
 * les trois styles partagent la même structure, donc aucune duplication de markup.
 * Le composant ne persiste rien : il remonte chaque modification via les callbacks (DIP).
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Camera, Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  GAZETTE_THEMES,
  WEDDING_COLOR_PALETTES,
  type AnecdoteSectionContent,
  type CustomSectionContent,
  type Gazette,
  type GazetteSection,
  type GazetteTheme,
  type ProgramSectionContent,
  type QuizSectionContent,
  type StorySectionContent,
} from '../domain/types';

type PhotoField = 'cover_path' | 'story_photo_path' | 'witnesses_photo_path';
type QuickBlock = 'trombinoscope' | 'crosswords' | 'truefalse' | 'dresscode' | 'interview' | 'horoscope' | 'annonces' | 'quiz';
type FontId = NonNullable<Gazette['layout']['font_family']>;
type PageNum = 1 | 2 | 3 | 4;

interface GazettePreviewProps {
  gazette: Gazette;
  onEditSection?: (section: GazetteSection) => void;
  onEditMetadata?: () => void;
  onThemeChange?: (theme: GazetteTheme) => void;
  onUpdateMetadataField?: (field: Partial<Gazette>) => Promise<void>;
  onUpdateSectionContent?: (sectionId: string, updatedFields: { title?: string; content?: any }) => Promise<void>;
  onAddQuickBlock?: (type: QuickBlock) => Promise<void>;
  onUploadCoverImage?: (file: File) => Promise<void>;
  onDeleteCoverImage?: () => Promise<void>;
  onUploadPhoto?: (field: PhotoField, file: File) => Promise<void>;
  onDeletePhoto?: (field: PhotoField) => Promise<void>;
}

/** Jetons visuels par thème : seul endroit à toucher pour ajouter un style (OCP). */
const THEME_TOKENS: Record<GazetteTheme, { paper: string; ink: string; muted: string; hairline: string; accent: string; grayscale: boolean; mastheadItalic: boolean; doubleRule: boolean }> = {
  chic_minimal: { paper: '#FFFFFF', ink: '#141414', muted: '#6F6F6F', hairline: '#DAD7D2', accent: '#18181b', grayscale: true, mastheadItalic: false, doubleRule: false },
  romantic_rose: { paper: '#FBF5F0', ink: '#2A2023', muted: '#7C6C6C', hairline: '#E6D8D0', accent: '#be123c', grayscale: false, mastheadItalic: true, doubleRule: false },
  vintage_gazette: { paper: '#F5EFE1', ink: '#1E1A15', muted: '#6B6153', hairline: '#CFC5AF', accent: '#881337', grayscale: true, mastheadItalic: false, doubleRule: true },
};

const FONTS: { id: FontId; label: string; family: string; upper: boolean }[] = [
  { id: 'bodoni', label: 'Bodoni', family: "'Bodoni Moda', 'Didot', serif", upper: false },
  { id: 'playfair', label: 'Cormorant', family: "var(--font-serif), Georgia, serif", upper: false },
  { id: 'cinzel', label: 'Capitales', family: "'Bodoni Moda', 'Didot', serif", upper: true },
  { id: 'sans', label: 'Jost', family: "'Jost', var(--font-sans), sans-serif", upper: false },
];

const QUICK_BLOCKS: { id: QuickBlock; label: string }[] = [
  { id: 'interview', label: 'Interview croisée' },
  { id: 'trombinoscope', label: 'Trombinoscope des témoins' },
  { id: 'dresscode', label: 'Dress code & hashtag' },
  { id: 'truefalse', label: 'Vrai ou faux' },
  { id: 'crosswords', label: 'Mots croisés' },
  { id: 'horoscope', label: 'Horoscope des invités' },
  { id: 'annonces', label: 'Petites annonces' },
  { id: 'quiz', label: 'Question de quiz' },
];

const KICKERS: Record<GazetteSection['type'], string> = {
  story: 'Récit', anecdote: 'Confidences', program: 'Programme', quiz: 'Jeu', custom: 'Tribune',
};

const SANS = "'Jost', var(--font-sans), sans-serif";
const BODY = 'var(--font-serif), Georgia, serif';
const SCRIPT = "'Mrs Saint Delafield', cursive";

/** Texte modifiable au clic ; ne remonte la valeur que si elle a réellement changé. */
function Editable({ value, placeholder, editable, onSave, className = '', style, as = 'span' }: {
  value?: string; placeholder: string; editable: boolean; onSave: (text: string) => void;
  className?: string; style?: CSSProperties; as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
}) {
  const Tag = as;
  const shown = value || placeholder;
  return (
    <Tag
      key={shown}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const text = e.currentTarget.innerText.replace(/\s+\n/g, '\n').trim();
        if (text && text !== shown) onSave(text);
        else if (!text) e.currentTarget.innerText = shown;
      }}
      className={`${className} ${editable ? 'gz-editable' : ''}`}
      style={style}
    >
      {shown}
    </Tag>
  );
}

export function GazettePreview({
  gazette, onEditSection, onThemeChange, onUpdateMetadataField, onUpdateSectionContent, onAddQuickBlock,
  onUploadCoverImage, onDeleteCoverImage, onUploadPhoto, onDeletePhoto,
}: GazettePreviewProps) {
  const [page, setPage] = useState<PageNum>(1);
  const [spread, setSpread] = useState(false);
  const [editable, setEditable] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showSolutions, setShowSolutions] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [qr, setQr] = useState('');
  const [localTheme, setLocalTheme] = useState<GazetteTheme | null>(null);
  const uploadField = useRef<PhotoField>('cover_path');
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setLocalTheme(gazette.layout?.theme ?? null); }, [gazette.layout?.theme]);

  const theme: GazetteTheme = localTheme || gazette.layout?.theme || 'chic_minimal';
  const t = THEME_TOKENS[theme];
  const accent = gazette.layout?.accent_color || t.accent;
  const font = FONTS.find((f) => f.id === (gazette.layout?.font_family || 'bodoni')) ?? FONTS[0];
  const headline: CSSProperties = { fontFamily: font.family, ...(font.upper ? { textTransform: 'uppercase', letterSpacing: '0.08em' } : {}) };
  const qrTarget = gazette.qr_code_target || 'guestbook';

  useEffect(() => {
    const path = qrTarget === 'photos' ? '/espace-client/photos' : qrTarget === 'honeymoon' ? '/espace-client/cagnotte' : '/espace-client/livre-d-or';
    QRCode.toDataURL(`${window.location.origin}${path}`, { margin: 0, width: 240, color: { dark: t.ink, light: '#0000' } })
      .then(setQr).catch(() => setQr(''));
  }, [qrTarget, t.ink]);

  /** Enveloppe toute sauvegarde pour piloter l'indicateur « Enregistré ». */
  const track = async (action: () => Promise<void> | undefined) => {
    try {
      setSaveStatus('saving');
      await action();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2200);
    } catch {
      setSaveStatus('idle');
      toast.error('Enregistrement impossible. Réessayez.');
    }
  };

  const saveMeta = (fields: Partial<Gazette>) => track(() => onUpdateMetadataField?.(fields));
  const saveSection = (id: string, fields: { title?: string; content?: unknown }) => track(() => onUpdateSectionContent?.(id, fields));
  const saveLayout = (layout: Partial<Gazette['layout']>) => saveMeta({ layout: { ...gazette.layout, theme, ...layout } });

  const selectTheme = (next: GazetteTheme) => {
    if (next === theme) return;
    setLocalTheme(next);
    // La couleur d'accent suit le thème tant que le couple n'a pas choisi la sienne.
    const keepAccent = gazette.layout?.accent_color && gazette.layout.accent_color.toLowerCase() !== t.accent.toLowerCase();
    if (onUpdateMetadataField) saveMeta({ layout: { ...gazette.layout, theme: next, accent_color: keepAccent ? gazette.layout.accent_color : THEME_TOKENS[next].accent } });
    else onThemeChange?.(next);
  };

  const pickPhoto = (field: PhotoField) => { uploadField.current = field; fileInput.current?.click(); };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (onUploadPhoto) void onUploadPhoto(uploadField.current, file);
    else if (uploadField.current === 'cover_path') void onUploadCoverImage?.(file);
  };
  const removePhoto = (field: PhotoField) => track(async () => {
    if (onDeletePhoto) await onDeletePhoto(field);
    else if (field === 'cover_path' && onDeleteCoverImage) await onDeleteCoverImage();
    else await onUpdateMetadataField?.({ [field]: null });
  });

  const first = (type: GazetteSection['type']) => gazette.sections.find((s) => s.type === type);
  const story = first('story');
  const anecdote = first('anecdote');
  const program = first('program');
  const quiz = first('quiz');
  const tribune = first('custom');
  const placed = new Set([story, anecdote, program, quiz, tribune].filter(Boolean).map((s) => s!.id));
  const extras = gazette.sections.filter((s) => !placed.has(s.id));
  const programItems = (program?.content as ProgramSectionContent | undefined)?.items ?? [];

  const dateLabel = gazette.wedding_date && !isNaN(new Date(gazette.wedding_date).getTime())
    ? new Date(gazette.wedding_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date du mariage';

  const label = (extra = ''): string => `text-[8.5px] sm:text-[9.5px] uppercase tracking-[0.22em] ${extra}`;
  const rule = <div style={{ borderTop: `1px solid ${t.ink}` }} />;

  // ── Blocs réutilisables ────────────────────────────────────────────────────

  const photo = ({ field, ratio, hint }: { field: PhotoField; ratio: string; hint: string }) => {
    const src = gazette[field];
    return (
      <div className="relative group/photo overflow-hidden" style={{ aspectRatio: ratio, backgroundColor: `${t.ink}0D` }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className={`w-full h-full object-cover ${t.grayscale ? 'grayscale contrast-[1.05]' : ''}`} />
        ) : (
          <button type="button" onClick={() => pickPhoto(field)} className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center" style={{ color: t.muted }}>
            <Camera className="w-5 h-5" strokeWidth={1.4} />
            <span className="italic text-[13px]" style={{ fontFamily: BODY }}>{hint}</span>
            <span className={label()} style={{ fontFamily: SANS }}>Ajouter une photo</span>
          </button>
        )}
        {src && editable && (
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover/photo:opacity-100 transition-opacity">
            <button type="button" onClick={() => pickPhoto(field)} className="h-8 px-3 bg-white text-[11px] font-medium text-stone-900 hover:bg-stone-100" style={{ fontFamily: SANS }}>Changer</button>
            <button type="button" onClick={() => removePhoto(field)} aria-label="Retirer la photo" className="h-8 w-8 flex items-center justify-center bg-white text-stone-900 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    );
  };

  const sectionHead = ({ section, size = 'text-[1.35rem] sm:text-[1.7rem]' }: { section: GazetteSection; size?: string }) => (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={label('font-medium')} style={{ fontFamily: SANS, color: accent }}>{KICKERS[section.type]}</span>
        {editable && onEditSection && (
          <button type="button" onClick={() => onEditSection(section)} className={`${label()} inline-flex items-center gap-1 hover:underline`} style={{ fontFamily: SANS, color: t.muted }}>
            <Pencil className="w-2.5 h-2.5" /> Modifier
          </button>
        )}
      </div>
      <Editable as="h3" value={section.title} placeholder="Titre de la rubrique" editable={editable}
        onSave={(title) => saveSection(section.id, { title })}
        className={`block mt-1.5 leading-[1.08] ${size}`} style={headline} />
    </div>
  );

  const storyBlock = ({ section }: { section: GazetteSection }) => {
    const c = section.content as StorySectionContent;
    return (
      <div className="space-y-4">
        {sectionHead({ section: section })}
        <Editable as="p" value={c.narrative} placeholder="Racontez votre histoire…" editable={editable}
          onSave={(narrative) => saveSection(section.id, { content: { ...c, narrative } })}
          className="gz-dropcap block text-[13.5px] sm:text-[14.5px] leading-[1.55] text-justify sm:columns-2 sm:gap-6" style={{ fontFamily: BODY }} />
        {(c.timeline?.length ?? 0) > 0 && (
          <ol className="grid sm:grid-cols-3 gap-x-5 gap-y-4 pt-4" style={{ borderTop: `1px solid ${t.hairline}` }}>
            {c.timeline!.map((item, i) => (
              <li key={i}>
                <span className={label()} style={{ fontFamily: SANS, color: accent }}>{item.year_or_date}</span>
                <p className="text-[15px] leading-tight mt-1" style={headline}>{item.title}</p>
                <p className="text-[12.5px] leading-snug mt-1" style={{ fontFamily: BODY, color: t.muted }}>{item.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  };

  const anecdoteBlock = ({ section, cols = 'sm:grid-cols-3' }: { section: GazetteSection; cols?: string }) => {
    const c = section.content as AnecdoteSectionContent;
    const setItem = (i: number, patch: Partial<AnecdoteSectionContent['items'][number]>) =>
      saveSection(section.id, { content: { ...c, items: c.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } });
    return (
      <div className="space-y-4">
        {sectionHead({ section: section, size: 'text-[1.15rem] sm:text-[1.35rem]' })}
        <div className={`grid ${cols} gap-x-5 gap-y-4`}>
          {(c.items ?? []).map((item, i) => (
            <div key={i} className="pt-3" style={{ borderTop: `1px solid ${t.ink}` }}>
              <Editable as="p" value={item.title} placeholder="Titre" editable={editable} onSave={(title) => setItem(i, { title })}
                className="block text-[15px] leading-tight" style={headline} />
              <Editable as="p" value={item.content} placeholder="Texte" editable={editable} onSave={(content) => setItem(i, { content })}
                className="block text-[12.5px] leading-snug mt-1.5" style={{ fontFamily: BODY, color: t.muted }} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const programBlock = ({ section }: { section: GazetteSection }) => {
    const items = (section.content as ProgramSectionContent).items ?? [];
    return (
      <div className="space-y-4">
        {sectionHead({ section: section })}
        <ol>
          {items.map((item, i) => (
            <li key={i} className="grid grid-cols-[3.6rem_1fr] sm:grid-cols-[4.6rem_1fr] gap-x-4 py-3" style={{ borderTop: `1px solid ${i === 0 ? t.ink : t.hairline}` }}>
              <span className="text-[1.35rem] sm:text-[1.6rem] leading-none tabular-nums" style={{ fontFamily: FONTS[0].family, color: accent }}>{item.time}</span>
              <div className="min-w-0">
                <p className="text-[15px] sm:text-[16px] leading-tight" style={headline}>{item.title}</p>
                {item.description && <p className="text-[12.5px] leading-snug mt-1 italic" style={{ fontFamily: BODY, color: t.muted }}>{item.description}</p>}
                {item.location && <p className={`${label()} mt-1.5`} style={{ fontFamily: SANS, color: t.muted }}>{item.location}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const tribuneBlock = ({ section }: { section: GazetteSection }) => {
    const c = section.content as CustomSectionContent;
    const set = (patch: Partial<CustomSectionContent>) => saveSection(section.id, { content: { ...c, ...patch } });
    return (
      <div className="space-y-3">
        {sectionHead({ section: section, size: 'text-[1.15rem] sm:text-[1.35rem]' })}
        {(c.subtitle || editable) && (
          <Editable as="p" value={c.subtitle} placeholder="Chapô" editable={editable} onSave={(subtitle) => set({ subtitle })}
            className="block italic text-[14px] leading-snug" style={{ fontFamily: BODY, color: accent }} />
        )}
        <Editable as="p" value={c.body} placeholder="Votre texte…" editable={editable} onSave={(body) => set({ body })}
          className="block text-[13.5px] leading-[1.55] text-justify" style={{ fontFamily: BODY }} />
        {(c.signature || editable) && (
          <Editable as="p" value={c.signature} placeholder="Signature" editable={editable} onSave={(signature) => set({ signature })}
            className={`${label()} block text-right`} style={{ fontFamily: SANS, color: t.muted }} />
        )}
      </div>
    );
  };

  const quizBlock = ({ section }: { section: GazetteSection }) => {
    const questions = (section.content as QuizSectionContent).questions ?? [];
    return (
      <div className="space-y-4">
        {sectionHead({ section: section })}
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
          {questions.map((q, qi) => (
            <li key={qi}>
              <p className="text-[14px] leading-snug" style={{ fontFamily: BODY }}>
                <span className="mr-1.5" style={{ fontFamily: FONTS[0].family, color: accent }}>{qi + 1}.</span>{q.question}
              </p>
              <div className="mt-2 space-y-1">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const right = showSolutions && oi === q.answer_index;
                  return (
                    <button key={oi} type="button" onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className="w-full flex items-center gap-2 text-left text-[12.5px] leading-snug py-0.5" style={{ fontFamily: BODY, color: right ? accent : t.ink, fontWeight: right ? 600 : 400 }}>
                      <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center" style={{ border: `1px solid ${right || chosen ? accent : t.muted}`, backgroundColor: chosen ? accent : 'transparent' }}>
                        {chosen && <Check className="w-2.5 h-2.5" style={{ color: t.paper }} />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
        {questions.length > 0 && (
          <button type="button" onClick={() => setShowSolutions((v) => !v)} className={`${label('font-medium')} underline underline-offset-4`} style={{ fontFamily: SANS, color: t.ink }}>
            {showSolutions ? 'Masquer les réponses' : 'Voir les réponses'}
          </button>
        )}
      </div>
    );
  };

  const renderSection = (section: GazetteSection): ReactNode => {
    switch (section.type) {
      case 'story': return storyBlock({ section: section });
      case 'anecdote': return anecdoteBlock({ section: section, cols: 'sm:grid-cols-2' });
      case 'program': return programBlock({ section: section });
      case 'quiz': return quizBlock({ section: section });
      default: return tribuneBlock({ section: section });
    }
  };

  const runningHead = ({ n }: { n: PageNum }) => (
    <div className={`${label()} flex items-center justify-between pb-2 mb-6`} style={{ fontFamily: SANS, color: t.muted, borderBottom: `1px solid ${t.ink}` }}>
      <span className="truncate max-w-[55%]">{gazette.title || 'La Gazette des Mariés'}</span>
      <span>{dateLabel}</span>
      <span className="tabular-nums">{n} / 4</span>
    </div>
  );

  // ── Pages ──────────────────────────────────────────────────────────────────

  const pageOne = (
    <>
      <div className={`${label()} flex items-center justify-between gap-3 pb-2`} style={{ fontFamily: SANS, color: t.muted }}>
        <Editable value={gazette.edition_tag} placeholder="Édition n° 1" editable={editable} onSave={(edition_tag) => saveMeta({ edition_tag })} />
        <span className="hidden sm:inline">{dateLabel}</span>
        <Editable value={gazette.price_tag} placeholder="Prix : tout votre amour" editable={editable} onSave={(price_tag) => saveMeta({ price_tag })} className="text-right" />
      </div>
      {rule}
      {t.doubleRule && <div className="mt-[3px]" style={{ borderTop: `3px solid ${t.ink}` }} />}

      <div className="text-center py-5 sm:py-7">
        {t.mastheadItalic && <p className="text-[2.6rem] sm:text-[3.4rem] leading-[0.6] -mb-1" style={{ fontFamily: SCRIPT, color: accent }}>la gazette</p>}
        <Editable as="h1" value={gazette.title} placeholder="La Gazette des Mariés" editable={editable} onSave={(title) => saveMeta({ title })}
          className="block leading-[0.98] text-[2.1rem] sm:text-[3.35rem] break-words"
          style={{ ...headline, ...(t.mastheadItalic ? { fontFamily: BODY, fontStyle: 'italic', textTransform: 'none', letterSpacing: '-0.01em' } : { letterSpacing: font.upper ? '0.1em' : '-0.015em' }) }} />
        <p className={`${label()} mt-3`} style={{ fontFamily: SANS, color: t.muted }}>
          <Editable value={gazette.location_name} placeholder="Lieu de la réception" editable={editable} onSave={(location_name) => saveMeta({ location_name })} />
          <span className="sm:hidden"> · {dateLabel}</span>
        </p>
      </div>

      {t.doubleRule && <div className="mb-[3px]" style={{ borderTop: `3px solid ${t.ink}` }} />}
      {rule}
      <Editable as="h2" value={gazette.subtitle} placeholder="Ils se sont dit oui !" editable={editable} onSave={(subtitle) => saveMeta({ subtitle })}
        className="block text-center italic text-[1.25rem] sm:text-[1.7rem] leading-tight py-3" style={{ fontFamily: BODY, color: accent }} />
      {rule}

      <figure className="mt-5">
        {photo({ field: 'cover_path', ratio: '16 / 10', hint: 'La photo de Une' })}
        <figcaption className="flex items-baseline justify-between gap-4 pt-2">
          <Editable value={gazette.cover_caption} placeholder="Légende de la photo" editable={editable} onSave={(cover_caption) => saveMeta({ cover_caption })}
            className="italic text-[12.5px] leading-snug" style={{ fontFamily: BODY, color: t.muted }} />
        </figcaption>
      </figure>

      <div className="grid sm:grid-cols-[1.7fr_1fr] gap-x-7 gap-y-6 mt-6 pt-5" style={{ borderTop: `1px solid ${t.ink}` }}>
        <div>
          <span className={label('font-medium')} style={{ fontFamily: SANS, color: accent }}>Le mot des mariés</span>
          <Editable as="p" value={gazette.editorial} editable={editable} onSave={(editorial) => saveMeta({ editorial })}
            placeholder="Chers invités, soyez les bienvenus dans notre édition spéciale. Nous avons imaginé ces quelques pages pour garder une trace de cette journée et vous guider jusqu’au bout de la nuit."
            className="gz-dropcap block text-[13.5px] sm:text-[14.5px] leading-[1.55] text-justify mt-2" style={{ fontFamily: BODY }} />
        </div>
        <div className="sm:pl-6">
          <span className={label('font-medium')} style={{ fontFamily: SANS, color: accent }}>Météo du cœur</span>
          <Editable as="p" value={gazette.weather_forecast} editable={editable} onSave={(weather_forecast) => saveMeta({ weather_forecast })}
            placeholder="Grand soleil, averses de rires en soirée."
            className="block italic text-[13px] leading-snug mt-2" style={{ fontFamily: BODY }} />
          {programItems.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.hairline}` }}>
              <span className={label('font-medium')} style={{ fontFamily: SANS, color: accent }}>À ne pas manquer</span>
              <ul className="mt-2 space-y-1.5">
                {programItems.slice(0, 4).map((it, i) => (
                  <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug" style={{ fontFamily: BODY }}>
                    <span className="tabular-nums flex-shrink-0" style={{ fontFamily: FONTS[0].family, color: accent }}>{it.time}</span>
                    <span>{it.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const pageTwo = (
    <>
      {runningHead({ n: 2 })}
      <div className="space-y-7">
        {story && storyBlock({ section: story })}
        {photo({ field: 'story_photo_path', ratio: '16 / 8', hint: 'Un souvenir à deux' })}
        {anecdote && anecdoteBlock({ section: anecdote })}
      </div>
    </>
  );

  const pageThree = (
    <>
      {runningHead({ n: 3 })}
      <div className="space-y-7">
        {program && programBlock({ section: program })}
        <div className="grid sm:grid-cols-2 gap-6 items-start">
          {photo({ field: 'witnesses_photo_path', ratio: '4 / 3', hint: 'Les témoins' })}
          {tribune ? tribuneBlock({ section: tribune }) : <span />}
        </div>
      </div>
    </>
  );

  const pageFour = (
    <>
      {runningHead({ n: 4 })}
      <div className="space-y-7">
        {quiz && quizBlock({ section: quiz })}
        {extras.map((s) => (
          <div key={s.id} className="pt-6" style={{ borderTop: `1px solid ${t.hairline}` }}>{renderSection(s)}</div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-5 items-end mt-8 pt-5" style={{ borderTop: `1px solid ${t.ink}` }}>
        <div>
          <p className="text-[2.6rem] sm:text-[3.2rem] leading-[0.7]" style={{ fontFamily: SCRIPT, color: accent }}>merci</p>
          <p className="italic text-[13px] leading-snug mt-3 max-w-[24rem]" style={{ fontFamily: BODY, color: t.muted }}>
            d’être là, de près ou de loin. Scannez le code pour {qrTarget === 'photos' ? 'partager vos photos' : qrTarget === 'honeymoon' ? 'participer à notre voyage de noces' : 'nous laisser un mot dans le livre d’or'}.
          </p>
          {editable && (
            <div className={`${label()} flex flex-wrap gap-x-4 gap-y-1 mt-3`} style={{ fontFamily: SANS }}>
              {([['guestbook', 'Livre d’or'], ['photos', 'Photos'], ['honeymoon', 'Cagnotte']] as const).map(([id, text]) => (
                <button key={id} type="button" onClick={() => saveMeta({ qr_code_target: id })}
                  className="pb-0.5" style={{ color: qrTarget === id ? t.ink : t.muted, borderBottom: `1px solid ${qrTarget === id ? accent : 'transparent'}` }}>{text}</button>
              ))}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="QR code" className="w-20 h-20 sm:w-24 sm:h-24" />}
      </div>
    </>
  );

  const pages: Record<PageNum, ReactNode> = { 1: pageOne, 2: pageTwo, 3: pageThree, 4: pageFour };

  const renderPage = (n: PageNum) => (
    <article key={n} className="gz-paper relative w-full max-w-[640px] flex-shrink-0 px-5 py-6 sm:px-10 sm:py-10 shadow-[0_1px_2px_rgba(40,30,20,0.08),0_18px_50px_-18px_rgba(40,30,20,0.35)]"
      style={{ backgroundColor: t.paper, color: t.ink, aspectRatio: '210 / 297' }}>
      {pages[n]}
    </article>
  );

  // ── Barre d'outils ─────────────────────────────────────────────────────────

  const tab = (active: boolean) => `pb-1 border-b-2 text-[13px] transition-colors ${active ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'}`;
  const toolLabel = 'text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400';

  return (
    <div className="w-full">
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} className="hidden" />

      <div className="bg-white border border-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 sm:px-6 py-3.5 border-b border-stone-200">
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => setEditable(true)} className={tab(editable)}>Écrire</button>
            <button type="button" onClick={() => setEditable(false)} className={tab(!editable)}>Lire</button>
            <span className="text-[12px] text-charcoal-400 min-w-[6.5rem] inline-flex items-center gap-1.5">
              {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> Enregistrement</>}
              {saveStatus === 'saved' && <><Check className="w-3 h-3 text-emerald-600" /> Enregistré</>}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSpread((v) => !v)} className={`hidden lg:inline ${tab(spread)}`}>Double page</button>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Page précédente" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1) as PageNum)} className="p-1.5 text-charcoal-500 disabled:opacity-25 hover:text-rose-600"><ChevronLeft className="w-4 h-4" /></button>
              {([1, 2, 3, 4] as const).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)}
                  className={`w-8 h-8 text-[13px] tabular-nums transition-colors ${page === n ? 'bg-charcoal-900 text-white' : 'text-charcoal-500 hover:text-charcoal-900'}`}>{n}</button>
              ))}
              <button type="button" aria-label="Page suivante" disabled={page === 4} onClick={() => setPage((p) => Math.min(4, p + 1) as PageNum)} className="p-1.5 text-charcoal-500 disabled:opacity-25 hover:text-rose-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-4 px-4 sm:px-6 py-4 md:grid-cols-[auto_auto_1fr] md:items-center">
          <div className="flex items-center gap-4 flex-wrap">
            <span className={toolLabel}>Style</span>
            {(Object.keys(GAZETTE_THEMES) as GazetteTheme[]).map((key) => (
              <button key={key} type="button" title={GAZETTE_THEMES[key].description} onClick={() => selectTheme(key)} className={`inline-flex items-center gap-2 ${tab(theme === key)}`}>
                <span className="w-3 h-4 border border-stone-300" style={{ backgroundColor: THEME_TOKENS[key].paper, borderTop: `3px solid ${THEME_TOKENS[key].accent}` }} />
                {GAZETTE_THEMES[key].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={toolLabel}>Titres</span>
            {FONTS.map((f) => (
              <button key={f.id} type="button" onClick={() => saveLayout({ font_family: f.id })} className={tab(font.id === f.id)}
                style={{ fontFamily: f.family, ...(f.upper ? { textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 } : { fontSize: 15 }) }}>{f.label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap md:justify-end">
            <span className={`${toolLabel} mr-1`}>Couleur</span>
            {WEDDING_COLOR_PALETTES.map((pal) => {
              const active = accent.toLowerCase() === pal.hex.toLowerCase();
              return (
                <button key={pal.id} type="button" title={pal.label} aria-label={pal.label} onClick={() => saveLayout({ accent_color: pal.hex })}
                  className={`w-6 h-6 rounded-full transition-shadow ${active ? 'ring-1 ring-offset-2 ring-charcoal-900' : 'hover:ring-1 hover:ring-offset-2 hover:ring-stone-300'}`} style={{ backgroundColor: pal.hex }} />
              );
            })}
            <label className="relative w-6 h-6 rounded-full border border-dashed border-stone-400 flex items-center justify-center cursor-pointer text-charcoal-500 hover:text-rose-600" title="Couleur personnalisée">
              <Plus className="w-3 h-3" />
              <input type="color" value={accent} onChange={(e) => saveLayout({ accent_color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
        </div>
      </div>

      {/* Table de travail : le journal posé sur un fond chaud */}
      <div className="gz-desk relative border border-t-0 border-stone-200 px-3 py-6 sm:px-8 sm:py-10">
        {onAddQuickBlock && editable && (
          <div className="relative flex justify-center mb-6">
            <button type="button" onClick={() => setBlocksOpen((v) => !v)}
              className="inline-flex items-center gap-2 h-10 px-5 bg-white border border-stone-300 text-[13px] text-charcoal-800 hover:border-charcoal-900 transition-colors rounded-sm">
              <Plus className="w-3.5 h-3.5" /> Ajouter une rubrique
            </button>
            {blocksOpen && (
              <>
                <button type="button" aria-label="Fermer" className="fixed inset-0 z-10 cursor-default" onClick={() => setBlocksOpen(false)} />
                <ul className="absolute top-full mt-2 z-20 w-64 bg-white border border-stone-200 shadow-xl py-1.5">
                  {QUICK_BLOCKS.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => { setBlocksOpen(false); void onAddQuickBlock(b.id); }}
                        className="w-full text-left px-4 py-2 font-serif text-[15px] text-charcoal-800 hover:bg-[#FBF8F4] hover:text-rose-700">{b.label}</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {spread ? (
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-0">
            {renderPage(2)}
            {renderPage(3)}
          </div>
        ) : (
          <div className="flex justify-center">{renderPage(page)}</div>
        )}

        {editable && <p className="text-center text-[12px] text-charcoal-500 mt-6">Touchez un texte du journal pour le réécrire. Tout s’enregistre seul.</p>}
      </div>
    </div>
  );
}
