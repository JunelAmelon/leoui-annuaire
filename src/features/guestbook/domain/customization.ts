/**
 * Personnalisation du livre d'or par le couple — domaine pur (aucun import Firebase / React).
 *  - `page`  : image + tous les textes de la page publique ouverte par les invités via le QR code.
 *  - `card`  : carte de table imprimable (tri-fold paysage) avec QR code.
 * Les champs sont stockés partiellement dans `guestbooks/{event_id}` ; les valeurs absentes
 * retombent sur les défauts ci-dessous (résolution à la lecture, jamais copiée en base).
 */

/** Image de fond par défaut de la page invité — remplacée seulement si le couple en choisit une. */
export const DEFAULT_GUESTBOOK_COVER = '/mariage%20(2).jpg';

export interface GuestbookPageContent {
  /** URL https (Cloudinary) ou chemin local ; null = image par défaut. */
  cover_url: string | null;
  eyebrow: string;
  subtitle: string;
  tab_text_label: string;
  tab_audio_label: string;
  name_label: string;
  name_placeholder: string;
  text_label: string;
  text_placeholder: string;
  submit_label: string;
  /** Peut contenir {nom} : remplacé par le prénom saisi par l'invité. */
  thanks_title: string;
  thanks_text: string;
  another_label: string;
}

export const GUESTBOOK_PAGE_DEFAULTS: GuestbookPageContent = {
  cover_url: null,
  eyebrow: 'Livre d’or des mariés',
  subtitle: 'Partagez vos vœux, un souvenir chaleureux ou un message vocal spontané.',
  tab_text_label: 'Message écrit',
  tab_audio_label: 'Message vocal',
  name_label: 'Votre prénom et nom',
  name_placeholder: 'Ex : Camille, Thomas & Léa, Tante Sophie…',
  text_label: 'Votre mot doux',
  text_placeholder: 'Écrivez quelques mots, une anecdote émouvante ou vos vœux les plus sincères…',
  submit_label: 'Envoyer aux mariés',
  thanks_title: 'Merci {nom} !',
  thanks_text: 'Votre message a été déposé avec soin dans le livre d’or des mariés. Ils auront un immense plaisir à le découvrir !',
  another_label: 'Laisser un autre mot doux',
};

export type CardInk = 'noir' | 'anthracite' | 'bordeaux' | 'sauge' | 'nuit';
export type CardPaper = 'blanc' | 'ivoire';

export const CARD_INKS: Record<CardInk, { label: string; hex: string }> = {
  noir:       { label: 'Noir',       hex: '#161314' },
  anthracite: { label: 'Anthracite', hex: '#3A3638' },
  bordeaux:   { label: 'Bordeaux',   hex: '#5E1F2E' },
  sauge:      { label: 'Vert sauge', hex: '#43533F' },
  nuit:       { label: 'Bleu nuit',  hex: '#232C45' },
};

export const CARD_PAPERS: Record<CardPaper, { label: string; hex: string }> = {
  blanc:  { label: 'Blanc',  hex: '#FFFFFF' },
  ivoire: { label: 'Ivoire', hex: '#FBF7F0' },
};

export interface GuestbookCardDesign {
  /** Mot manuscrit du panneau gauche, au-dessus du numéro. */
  table_word: string;
  /** Nombre de cartes à imprimer : une page par numéro de 1 à N. */
  table_count: number;
  welcome_label: string;
  names: string;
  place_line: string;
  date_line: string;
  section_title: string;
  section_lines: string[];
  cta_title: string;
  cta_text: string;
  closing_word: string;
  ink: CardInk;
  paper: CardPaper;
}

export const GUESTBOOK_CARD_DEFAULTS: GuestbookCardDesign = {
  table_word: 'table',
  table_count: 1,
  welcome_label: 'Bienvenue au mariage de',
  names: '',
  place_line: '',
  date_line: '',
  section_title: 'livre d’or',
  section_lines: [
    'Un mot doux, un souvenir, une anecdote ?',
    'Laissez-nous un message écrit ou enregistrez votre voix.',
    'Nous le découvrirons avec émotion.',
  ],
  cta_title: 'Scannez & partagez',
  cta_text: 'Pointez l’appareil photo de votre téléphone sur le code : aucune application à installer.',
  closing_word: 'avec amour',
  ink: 'noir',
  paper: 'blanc',
};

/** Texte par défaut dérivé du mariage (noms, lieu, date) — appliqué seulement si le champ est vide. */
export interface CardFallback { names: string; place: string; date: string }

export function resolveCardDesign(stored: Partial<GuestbookCardDesign> | undefined, fb: CardFallback): GuestbookCardDesign {
  const merged = { ...GUESTBOOK_CARD_DEFAULTS, ...(stored || {}) };
  return {
    ...merged,
    names: merged.names?.trim() || fb.names,
    place_line: merged.place_line?.trim() ? merged.place_line : fb.place,
    date_line: merged.date_line?.trim() ? merged.date_line : fb.date,
    section_lines: (merged.section_lines || []).filter((l) => l.trim().length > 0),
  };
}

export function resolvePageContent(stored: Partial<GuestbookPageContent> | undefined): GuestbookPageContent {
  return { ...GUESTBOOK_PAGE_DEFAULTS, ...(stored || {}) };
}

export const effectiveCover = (page: GuestbookPageContent): string => page.cover_url || DEFAULT_GUESTBOOK_COVER;

/* ───────────── Validation / nettoyage (appliqués côté service, avant écriture) ───────────── */

const LIMITS: Record<string, number> = {
  eyebrow: 60, subtitle: 220, tab_text_label: 30, tab_audio_label: 30, name_label: 60, name_placeholder: 100,
  text_label: 60, text_placeholder: 200, submit_label: 40, thanks_title: 80, thanks_text: 320, another_label: 50,
  table_word: 24, welcome_label: 50, names: 60, place_line: 70, date_line: 40, section_title: 40,
  cta_title: 40, cta_text: 200, closing_word: 30,
};
const SECTION_LINES_MAX = 4;
const SECTION_LINE_CHARS = 140;
export const CARD_TABLE_COUNT_MAX = 60;

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Seuls https:// et les chemins locaux sont acceptés pour l'image (pas de data:, ni javascript:). */
export function sanitizeCoverUrl(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();
  if (/^https:\/\//i.test(s) && s.length <= 600) return s;
  if (s.startsWith('/') && !s.startsWith('//') && s.length <= 200) return s;
  throw new Error('Image invalide : utilisez une photo importée depuis votre appareil.');
}

export function sanitizePagePatch(patch: Partial<GuestbookPageContent>): Partial<GuestbookPageContent> {
  const out: Partial<GuestbookPageContent> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'cover_url') { out.cover_url = sanitizeCoverUrl(v); continue; }
    if (!(k in GUESTBOOK_PAGE_DEFAULTS)) continue;
    const text = clean(v, LIMITS[k] ?? 200);
    // Un champ vidé revient au texte par défaut (on stocke la chaîne par défaut, pas du vide)
    (out as Record<string, unknown>)[k] = text || (GUESTBOOK_PAGE_DEFAULTS as unknown as Record<string, string>)[k];
  }
  return out;
}

export function sanitizeCardPatch(patch: Partial<GuestbookCardDesign>): Partial<GuestbookCardDesign> {
  const out: Partial<GuestbookCardDesign> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'ink') { if (typeof v === 'string' && v in CARD_INKS) out.ink = v as CardInk; continue; }
    if (k === 'paper') { if (typeof v === 'string' && v in CARD_PAPERS) out.paper = v as CardPaper; continue; }
    if (k === 'table_count') {
      const n = Math.round(Number(v));
      out.table_count = Number.isFinite(n) ? Math.min(CARD_TABLE_COUNT_MAX, Math.max(1, n)) : 1;
      continue;
    }
    if (k === 'section_lines') {
      out.section_lines = (Array.isArray(v) ? v : []).slice(0, SECTION_LINES_MAX).map((l) => clean(l, SECTION_LINE_CHARS));
      continue;
    }
    if (!(k in GUESTBOOK_CARD_DEFAULTS)) continue;
    // names / place_line / date_line vides = « automatique » (dérivés du mariage) → chaîne vide autorisée
    (out as Record<string, unknown>)[k] = clean(v, LIMITS[k] ?? 100);
  }
  return out;
}
