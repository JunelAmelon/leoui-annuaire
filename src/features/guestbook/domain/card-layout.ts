/**
 * Mise en page de la carte de table — A4 paysage, tri-fold (3 panneaux de 99 mm).
 * Module pur : produit une liste d'opérations de dessin en millimètres, consommée à la fois
 * par le moteur PDF (jsPDF) et par l'aperçu à l'écran → les deux sont identiques.
 *
 *  Panneau 1 : photo encadrée de blanc + mot manuscrit + noms, lieu et date
 *  Panneau 2 : titre manuscrit + textes libres du couple
 *  Panneau 3 : « Bienvenue au mariage de » + noms + lieu/date + QR code + appel à scanner + mot de fin
 */

import { CARD_INKS, CARD_PAPERS, type GuestbookCardDesign } from './customization';

export const CARD_W = 297;
export const CARD_H = 210;
export const PANEL_W = 99;

export type CardFont = 'script' | 'serif' | 'serifItalic' | 'sans' | 'sansMedium' | 'numeral';
export type CardColor = 'ink' | 'muted' | 'hair';

export type CardOp =
  | { t: 'text'; font: CardFont; size: number; x: number; y: number; text: string; align?: 'left' | 'center' | 'right';
      spacing?: number; color: CardColor; maxWidth?: number; lineHeight?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; color: CardColor; dash?: boolean }
  | { t: 'curve'; p: [number, number][]; w: number; color: CardColor }
  | { t: 'qr'; x: number; y: number; size: number }
  | { t: 'image'; x: number; y: number; w: number; h: number }
  | { t: 'tick'; x: number };

export interface CardPalette { ink: string; paper: string; muted: string; hair: string }

const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

export function cardPalette(d: Pick<GuestbookCardDesign, 'ink' | 'paper'>): CardPalette {
  const ink = CARD_INKS[d.ink]?.hex ?? CARD_INKS.noir.hex;
  const paper = CARD_PAPERS[d.paper]?.hex ?? CARD_PAPERS.blanc.hex;
  return { ink, paper, muted: mix(ink, paper, 0.42), hair: mix(ink, paper, 0.82) };
}

/** « Sophie + Thomas », « Sophie & Thomas » ou « Sophie et Thomas » → deux prénoms ; sinon un seul bloc. */
export function splitNames(names: string): string[] {
  const parts = names.split(/\s*(?:\+|&|\s+et\s+)\s*/i).map((s) => s.trim()).filter(Boolean);
  return parts.length === 2 ? parts : [names.trim()];
}

/** Estimation du nombre de lignes d'un paragraphe (même valeur pour PDF et aperçu → rythme vertical identique). */
const estimateLines = (text: string, maxWidth: number, sizePt: number, factor = 0.41) =>
  Math.max(1, Math.ceil((text.length * sizePt * 0.3528 * factor) / maxWidth));

/** Cadre de la photo (mm) — partagé avec le moteur PDF pour recadrer l'image au bon ratio. */
export const CARD_PHOTO = { x: 12, y: 14, w: 75, h: 108 } as const;

export function buildCardLayout(d: GuestbookCardDesign): CardOp[] {
  const ops: CardOp[] = [];
  const P2 = PANEL_W;       // début panneau 2
  const P3 = PANEL_W * 2;   // début panneau 3

  // Repères de pli (traits discrets + repères de coupe haut/bas)
  ops.push({ t: 'line', x1: P2, y1: 0, x2: P2, y2: CARD_H, w: 0.12, color: 'hair', dash: true });
  ops.push({ t: 'line', x1: P3, y1: 0, x2: P3, y2: CARD_H, w: 0.12, color: 'hair', dash: true });
  ops.push({ t: 'tick', x: P2 }, { t: 'tick', x: P3 });

  /* ── Panneau 1 : photo + mot manuscrit ── */
  const cx1 = PANEL_W / 2;
  ops.push({ t: 'image', ...CARD_PHOTO });
  ops.push({ t: 'text', font: 'script', size: 34, x: cx1, y: 143, text: d.caption, color: 'ink', align: 'center', maxWidth: 84, lineHeight: 12 });
  ops.push({ t: 'text', font: 'sansMedium', size: 6.6, x: cx1, y: 168, text: d.names.toUpperCase().replace(/\s*[+&]\s*/g, ' + '), color: 'ink', spacing: 0.6, align: 'center' });
  if (d.place_line) ops.push({ t: 'text', font: 'sans', size: 6.8, x: cx1, y: 176, text: d.place_line, color: 'muted', spacing: 0.35, align: 'center' });
  if (d.date_line) ops.push({ t: 'text', font: 'sans', size: 6.8, x: cx1, y: 181.5, text: d.date_line, color: 'muted', spacing: 0.35, align: 'center' });

  /* ── Panneau 2 : textes libres ── */
  const x2 = P2 + 11;
  ops.push({ t: 'text', font: 'script', size: 56, x: x2, y: 56, text: d.section_title, color: 'ink' });
  ops.push({ t: 'curve', p: [[P2 + 6, 63], [P2 + 34, 58], [P2 + 62, 69], [P2 + 93, 61]], w: 0.28, color: 'ink' });
  let y = 88;
  for (const line of d.section_lines) {
    ops.push({ t: 'text', font: 'serifItalic', size: 12.5, x: x2, y, text: line, color: 'ink', maxWidth: 76, lineHeight: 5.6 });
    y += estimateLines(line, 76, 12.5) * 5.6 + 5.5;
  }

  /* ── Panneau 3 : invitation + QR ── */
  const x3 = P3 + 9;
  const right3 = CARD_W - 9;
  ops.push({ t: 'text', font: 'sans', size: 7, x: x3, y: 29, text: d.welcome_label, color: 'muted', spacing: 0.3, maxWidth: 38, lineHeight: 3.8 });

  const parts = splitNames(d.names);
  if (parts.length === 2) {
    ops.push({ t: 'text', font: 'script', size: 56, x: x3, y: 60, text: parts[0], color: 'ink' });
    ops.push({ t: 'text', font: 'script', size: 30, x: x3 + 12, y: 74, text: '+', color: 'ink' });
    ops.push({ t: 'text', font: 'script', size: 56, x: x3 + 13, y: 90, text: parts[1], color: 'ink' });
  } else {
    ops.push({ t: 'text', font: 'script', size: 50, x: x3, y: 66, text: parts[0], color: 'ink', maxWidth: 80, lineHeight: 17 });
  }
  if (d.place_line) ops.push({ t: 'text', font: 'sans', size: 7.4, x: right3, y: 103, text: d.place_line, color: 'muted', spacing: 0.35, align: 'right' });
  if (d.date_line) ops.push({ t: 'text', font: 'sans', size: 7.4, x: right3, y: 108.5, text: d.date_line, color: 'muted', spacing: 0.35, align: 'right' });

  ops.push({ t: 'line', x1: x3, y1: 115, x2: right3, y2: 115, w: 0.22, color: 'ink' });
  ops.push({ t: 'qr', x: x3, y: 122, size: 33 });
  ops.push({ t: 'text', font: 'sansMedium', size: 6.8, x: x3, y: 163, text: d.cta_title.toUpperCase(), color: 'ink', spacing: 0.55 });
  ops.push({ t: 'text', font: 'sans', size: 6.6, x: x3, y: 168, text: d.cta_text, color: 'muted', maxWidth: 76, lineHeight: 3.5 });
  ops.push({ t: 'text', font: 'script', size: 30, x: x3, y: 193, text: d.closing_word, color: 'ink' });
  ops.push({ t: 'text', font: 'sans', size: 6.2, x: x3, y: 199, text: d.names.toUpperCase().replace(/\s*[+&]\s*/g, ' + '), color: 'muted', spacing: 0.5 });

  return ops;
}
