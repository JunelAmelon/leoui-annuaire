/**
 * Utilitaires PDF communs : chargement des polices embarquées (Unicode, accents français),
 * nettoyage des caractères non imprimables (emojis), texte à espacement de lettres, images.
 * Les polices vivent dans /public/fonts/pdf (sous-ensemble latin, ~260 Ko au total).
 */

import type jsPDF from 'jspdf';

export type PdfFamily = 'Script' | 'Serif' | 'Sans' | 'Numeral';

const FONT_FILES: { file: string; family: PdfFamily; style: 'normal' | 'bold' | 'italic' }[] = [
  { file: 'MrsSaintDelafield-Regular.ttf', family: 'Script', style: 'normal' },
  { file: 'CormorantGaramond-Regular.ttf', family: 'Serif', style: 'normal' },
  { file: 'CormorantGaramond-SemiBold.ttf', family: 'Serif', style: 'bold' },
  { file: 'CormorantGaramond-Italic.ttf', family: 'Serif', style: 'italic' },
  { file: 'Jost-Regular.ttf', family: 'Sans', style: 'normal' },
  { file: 'Jost-Medium.ttf', family: 'Sans', style: 'bold' },
  { file: 'BodoniModa-Regular.ttf', family: 'Numeral', style: 'normal' },
];

const fontCache = new Map<string, string>();

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export async function registerPdfFonts(doc: jsPDF): Promise<void> {
  await Promise.all(
    FONT_FILES.map(async ({ file }) => {
      if (fontCache.has(file)) return;
      const res = await fetch(`/fonts/pdf/${file}`);
      if (!res.ok) throw new Error(`Police PDF introuvable : ${file}`);
      fontCache.set(file, toBase64(await res.arrayBuffer()));
    })
  );
  for (const { file, family, style } of FONT_FILES) {
    doc.addFileToVFS(file, fontCache.get(file)!);
    doc.addFont(file, family, style);
  }
}

/**
 * Retire tout ce que les polices embarquées ne savent pas dessiner (emojis, pictogrammes, scripts exotiques).
 * Évite les caractères « Ø<ß » et l'écartement anormal des lettres dans le PDF.
 */
export function pdfSafe(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(/[^\u0020-\u007E\u00A0-\u00FF\u0152\u0153\u2013\u2014\u2018-\u201E\u2022\u2026\u20AC\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const setFill = (doc: jsPDF, hex: string) => doc.setFillColor(...hexToRgb(hex));
export const setDraw = (doc: jsPDF, hex: string) => doc.setDrawColor(...hexToRgb(hex));
export const setText = (doc: jsPDF, hex: string) => doc.setTextColor(...hexToRgb(hex));

/**
 * Texte avec espacement de lettres (capitales aérées). Dessiné lettre à lettre : résultat identique
 * quel que soit le moteur, et alignement droit/centré exact.
 */
export function drawSpaced(
  doc: jsPDF, text: string, x: number, y: number,
  opts: { spacing: number; align?: 'left' | 'center' | 'right' }
) {
  const chars = [...text];
  const widths = chars.map((c) => doc.getTextWidth(c));
  const total = widths.reduce((s, w) => s + w, 0) + opts.spacing * Math.max(0, chars.length - 1);
  let cx = opts.align === 'right' ? x - total : opts.align === 'center' ? x - total / 2 : x;
  chars.forEach((c, i) => {
    doc.text(c, cx, y);
    cx += widths[i] + opts.spacing;
  });
}

/** Charge une image (https ou chemin local) et la recadre en « cover » vers un JPEG data URL. */
export async function loadCoverJpeg(src: string, targetRatio: number, maxPx = 1600): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const srcRatio = bmp.width / bmp.height;
    let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0;
    if (srcRatio > targetRatio) { sw = bmp.height * targetRatio; sx = (bmp.width - sw) / 2; }
    else { sh = bmp.width / targetRatio; sy = (bmp.height - sh) / 2; }
    const w = Math.min(maxPx, Math.round(sw));
    const h = Math.round(w / targetRatio);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    return cv.toDataURL('image/jpeg', 0.88);
  } catch {
    return null;
  }
}
