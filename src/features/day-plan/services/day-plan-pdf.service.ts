/**
 * Export PDF du Planning du jour J (A4 portrait) : déroulé complet, ou feuille de route d'un prestataire.
 * Responsabilité unique : la mise en page. Les données arrivent déjà triées du domaine.
 */

import { jsPDF } from 'jspdf';
import { drawSpaced, loadCoverJpeg, pdfSafe, registerPdfFonts, setDraw, setFill, setText } from '@/features/guestbook/services/pdf/pdf-helpers';
import { CATEGORIES, DAY_KEYS, DAY_LABELS, type DayBlock, type DayKey } from '../domain/types';
import { directionsUrl, endOf, formatDuration, formatLongDate, isAfterMidnight, sortItems, timeOf } from '../domain/timeline';

const INK = '#1C1614';
const MUTED = '#7A706A';
const HAIRLINE = '#D9D2CA';
const ROSE = '#BE123C';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const TIME_COL = 24;
const RAIL_X = MARGIN + TIME_COL + 5;
const TEXT_X = RAIL_X + 7;
const TEXT_W = PAGE_W - MARGIN - TEXT_X;
const BOTTOM = PAGE_H - 20;
const BANNER_H = 64;
const COVER_SRC = '/jour-j-cover.jpg';

export interface DayPlanPdfOptions {
  /** Noms du couple, en titre. */
  title: string;
  /** Feuille de route : ne garde que les moments de cet intervenant. */
  vendor?: { vendor_id: string; label: string };
}

export async function generateDayPlanPdf(days: Record<DayKey, DayBlock>, options: DayPlanPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registerPdfFonts(doc);

  let y = MARGIN;
  let pages = 1;
  const caps = (text: string, x: number, at: number, size = 7, color = MUTED, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFont('Sans', 'bold');
    doc.setFontSize(size);
    setText(doc, color);
    drawSpaced(doc, pdfSafe(text).toUpperCase(), x, at, { spacing: 0.55, align });
  };
  const ensure = (height: number) => {
    if (y + height <= BOTTOM) return;
    doc.addPage();
    pages++;
    y = MARGIN + 4;
  };

  // ── Bandeau photo + titre ──
  const cover = await loadCoverJpeg(COVER_SRC, PAGE_W / BANNER_H, 1800);
  if (cover) {
    doc.addImage(cover, 'JPEG', 0, 0, PAGE_W, BANNER_H, undefined, 'FAST');
    const adv = doc as unknown as { saveGraphicsState(): void; restoreGraphicsState(): void; GState: new (o: { opacity: number }) => object; setGState(g: object): void };
    adv.saveGraphicsState();
    adv.setGState(new adv.GState({ opacity: 0.5 }));
    setFill(doc, '#1A1013');
    doc.rect(0, BANNER_H * 0.35, PAGE_W, BANNER_H * 0.65, 'F');
    adv.restoreGraphicsState();
  } else {
    setFill(doc, '#F3ECE4');
    doc.rect(0, 0, PAGE_W, BANNER_H, 'F');
  }
  const onPhoto = cover ? '#FFFFFF' : INK;
  y = BANNER_H - 26;
  caps(options.vendor ? 'Feuille de route' : 'Planning du jour J', MARGIN, y, 7.5, cover ? '#FDA4AF' : ROSE);
  y += 12;
  doc.setFont('Serif', 'normal');
  doc.setFontSize(30);
  setText(doc, onPhoto);
  doc.text(pdfSafe(options.title) || 'Notre mariage', MARGIN, y);
  y += 7.5;
  doc.setFont('Serif', 'italic');
  doc.setFontSize(13);
  setText(doc, cover ? '#F3E9E4' : MUTED);
  const dayDateLabel = days.day.date ? formatLongDate(days.day.date) : '';
  doc.text(pdfSafe(options.vendor ? `${options.vendor.label} · ${dayDateLabel}` : dayDateLabel), MARGIN, y);
  y = BANNER_H + 13;

  let printed = 0;
  for (const key of DAY_KEYS) {
    const block = days[key];
    const items = sortItems(block.items).filter((i) => !options.vendor || i.vendor_ids.includes(options.vendor.vendor_id));
    if (!items.length) continue;
    printed += items.length;

    // Titre de journée
    ensure(34);
    doc.setFont('Serif', 'bold');
    doc.setFontSize(17);
    setText(doc, INK);
    doc.text(DAY_LABELS[key], MARGIN, y);
    if (block.date) caps(formatLongDate(block.date), PAGE_W - MARGIN, y - 0.5, 7, MUTED, 'right');
    y += 3.5;
    setDraw(doc, HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 9;

    items.forEach((item, index) => {
      const cat = CATEGORIES[item.category] ?? CATEGORIES.other;
      doc.setFont('Serif', 'bold');
      doc.setFontSize(12.5);
      const titleLines: string[] = doc.splitTextToSize(pdfSafe(item.title), TEXT_W);
      const meta = [
        item.duration_min > 0 ? formatDuration(item.duration_min) : '',
        item.location.name,
        item.location.travel_min > 0 ? `${item.location.travel_min} min de trajet` : '',
        item.people.join(', '),
      ].filter(Boolean).join('  ·  ');
      doc.setFont('Sans', 'normal');
      doc.setFontSize(8.5);
      const metaLines: string[] = meta ? doc.splitTextToSize(pdfSafe(meta), TEXT_W) : [];
      const mapUrl = directionsUrl(item.location);
      const addressLine = item.location.address ? pdfSafe(item.location.address) : '';
      doc.setFont('Serif', 'italic');
      doc.setFontSize(10.5);
      const noteLines: string[] = item.notes ? doc.splitTextToSize(pdfSafe(item.notes.replace(/\n+/g, ' ')), TEXT_W) : [];
      const height = 4 + titleLines.length * 5.4 + metaLines.length * 4 + (mapUrl ? 5 : 0) + noteLines.length * 4.6 + 6;
      ensure(height);
      const top = y;

      // Heure
      doc.setFont('Numeral', 'normal');
      doc.setFontSize(15);
      setText(doc, INK);
      doc.text(timeOf(item.start_at), MARGIN + TIME_COL, top + 4.2, { align: 'right' });
      if (item.duration_min > 0) {
        doc.setFont('Sans', 'normal');
        doc.setFontSize(7.5);
        setText(doc, MUTED);
        doc.text(timeOf(endOf(item)), MARGIN + TIME_COL, top + 8.4, { align: 'right' });
      }
      if (isAfterMidnight(item, block.date)) caps('après minuit', MARGIN + TIME_COL, top + 12, 5.5, ROSE, 'right');

      // Rail
      if (index < items.length - 1) {
        setDraw(doc, HAIRLINE);
        doc.setLineWidth(0.2);
        doc.line(RAIL_X, top + 3, RAIL_X, top + height + 3);
      }
      setFill(doc, cat.color);
      doc.circle(RAIL_X, top + 2.6, 1.3, 'F');

      // Contenu
      let ty = top;
      caps(cat.label, TEXT_X, ty, 6.2, cat.color);
      ty += 5;
      doc.setFont('Serif', 'bold');
      doc.setFontSize(12.5);
      setText(doc, INK);
      doc.text(titleLines, TEXT_X, ty, { lineHeightFactor: 1.2 });
      ty += titleLines.length * 5.4 - 1;
      if (metaLines.length) {
        doc.setFont('Sans', 'normal');
        doc.setFontSize(8.5);
        setText(doc, MUTED);
        doc.text(metaLines, TEXT_X, ty);
        ty += metaLines.length * 4;
      }
      if (mapUrl) {
        // Lien cliquable : ouvre l'itinéraire dans Maps (appli sur mobile)
        const label = addressLine ? `${addressLine}  ·  Itinéraire` : 'Itinéraire dans Maps';
        doc.setFont('Sans', 'bold');
        doc.setFontSize(8);
        setText(doc, ROSE);
        const labelW = doc.getTextWidth(label);
        doc.textWithLink(label, TEXT_X, ty + 1, { url: mapUrl });
        setDraw(doc, ROSE);
        doc.setLineWidth(0.15);
        doc.line(TEXT_X, ty + 1.8, TEXT_X + Math.min(labelW, TEXT_W), ty + 1.8);
        ty += 5;
      }
      if (noteLines.length) {
        doc.setFont('Serif', 'italic');
        doc.setFontSize(10.5);
        setText(doc, '#4A423D');
        doc.text(noteLines, TEXT_X, ty + 0.6);
      }
      y = top + height;
    });
    y += 8;
  }

  if (!printed) {
    doc.setFont('Serif', 'italic');
    doc.setFontSize(13);
    setText(doc, MUTED);
    doc.text('Aucun moment à afficher pour l’instant.', MARGIN, y);
  }

  // ── Pieds de page ──
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setDraw(doc, HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);
    caps('LeOui.net', MARGIN, PAGE_H - 8.5, 6);
    caps(`${p} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 8.5, 6, MUTED, 'right');
  }

  const slug = (options.vendor?.label || options.title || 'mariage').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`planning-jour-j-${slug || 'mariage'}.pdf`);
}
