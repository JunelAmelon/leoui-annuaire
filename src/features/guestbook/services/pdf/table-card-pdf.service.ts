/**
 * Carte de table « livre d'or » — PDF A4 paysage tri-fold (une page par numéro de table).
 * Ne contient aucune mise en page : il exécute les opérations de `buildCardLayout`
 * (identiques à l'aperçu à l'écran) avec les polices embarquées.
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { GuestbookCardDesign } from '../../domain/customization';
import { buildCardLayout, cardPalette, CARD_H, CARD_W, type CardFont, type CardOp } from '../../domain/card-layout';
import { drawSpaced, pdfSafe, registerPdfFonts, setDraw, setFill, setText, type PdfFamily } from './pdf-helpers';

const FONT_MAP: Record<CardFont, { family: PdfFamily; style: 'normal' | 'bold' | 'italic' }> = {
  script: { family: 'Script', style: 'normal' },
  serif: { family: 'Serif', style: 'normal' },
  serifItalic: { family: 'Serif', style: 'italic' },
  sans: { family: 'Sans', style: 'normal' },
  sansMedium: { family: 'Sans', style: 'bold' },
  numeral: { family: 'Numeral', style: 'normal' },
};

export async function generateTableCardsPdf(design: GuestbookCardDesign, publicUrl: string, fileSuffix: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W, CARD_H] });
  await registerPdfFonts(doc);
  const pal = cardPalette(design);
  const color = { ink: pal.ink, muted: pal.muted, hair: pal.hair };

  const qr = await QRCode.toDataURL(publicUrl, {
    width: 900, margin: 0, errorCorrectionLevel: 'M',
    color: { dark: pal.ink, light: pal.paper },
  });

  const count = Math.max(1, design.table_count);
  for (let n = 1; n <= count; n++) {
    if (n > 1) doc.addPage([CARD_W, CARD_H], 'landscape');
    setFill(doc, pal.paper);
    doc.rect(0, 0, CARD_W, CARD_H, 'F');
    for (const op of buildCardLayout(design, n)) drawOp(doc, op, color, qr);
  }

  doc.save(`Carte-table-livre-or-${fileSuffix}.pdf`);
}

/** `setLineDashPattern` existe dans jsPDF mais n'est pas déclaré dans ses types. */
const setDash = (doc: jsPDF, pattern: number[]) =>
  (doc as unknown as { setLineDashPattern: (p: number[], phase: number) => void }).setLineDashPattern(pattern, 0);

function drawOp(doc: jsPDF, op: CardOp, color: Record<'ink' | 'muted' | 'hair', string>, qr: string) {
  switch (op.t) {
    case 'line':
      setDraw(doc, color[op.color]);
      doc.setLineWidth(op.w);
      setDash(doc, op.dash ? [1.6, 1.6] : []);
      doc.line(op.x1, op.y1, op.x2, op.y2);
      setDash(doc, []);
      return;
    case 'tick':
      setDraw(doc, color.muted);
      doc.setLineWidth(0.2);
      doc.line(op.x, 0, op.x, 4);
      doc.line(op.x, CARD_H - 4, op.x, CARD_H);
      return;
    case 'curve': {
      const [p0, p1, p2, p3] = op.p;
      setDraw(doc, color[op.color]);
      doc.setLineWidth(op.w);
      doc.lines([[p1[0] - p0[0], p1[1] - p0[1], p2[0] - p0[0], p2[1] - p0[1], p3[0] - p0[0], p3[1] - p0[1]]], p0[0], p0[1], [1, 1], 'S', false);
      return;
    }
    case 'qr':
      doc.addImage(qr, 'PNG', op.x, op.y, op.size, op.size);
      return;
    case 'text': {
      const f = FONT_MAP[op.font];
      doc.setFont(f.family, f.style);
      doc.setFontSize(op.size);
      setText(doc, color[op.color]);
      const text = pdfSafe(op.text);
      if (!text) return;
      if (op.maxWidth) {
        const lines: string[] = doc.splitTextToSize(text, op.maxWidth);
        lines.forEach((ln, i) => drawLine(doc, ln, op.x, op.y + i * (op.lineHeight ?? op.size * 0.45), op));
      } else {
        drawLine(doc, text, op.x, op.y, op);
      }
      return;
    }
  }
}

function drawLine(doc: jsPDF, text: string, x: number, y: number, op: Extract<CardOp, { t: 'text' }>) {
  if (op.spacing) drawSpaced(doc, text, x, y, { spacing: op.spacing, align: op.align });
  else doc.text(text, x, y, { align: op.align ?? 'left' });
}
