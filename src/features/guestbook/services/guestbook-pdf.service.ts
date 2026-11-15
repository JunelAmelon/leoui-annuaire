/**
 * Exports PDF du livre d'or.
 *  - generatePrintableBook : livre souvenir A4 (couverture photo, messages complets, QR d'écoute des vocaux)
 *  - generateTableCards    : cartes de table tri-fold paysage (voir pdf/table-card-pdf.service.ts)
 * Toutes les polices sont embarquées (accents français parfaits) et chaque texte passe par `pdfSafe`
 * pour retirer les emojis que le PDF ne sait pas dessiner.
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Guestbook, GuestbookEntry } from '../domain/types';
import type { GuestbookCardDesign } from '../domain/customization';
import { effectiveCover, resolvePageContent } from '../domain/customization';
import { drawSpaced, loadCoverJpeg, pdfSafe, registerPdfFonts, setDraw, setFill, setText } from './pdf/pdf-helpers';
import { generateTableCardsPdf } from './pdf/table-card-pdf.service';

const C = { paper: '#FBF8F4', ink: '#1E1A1C', muted: '#8A8085', hair: '#E4DCD6', accent: '#B84A63', soft: '#EFE6DE' };
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 24;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 24;

const fmtDuration = (s?: number | null) =>
  s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '';

export class GuestbookPdfService {
  static async generatePrintableBook(
    guestbook: Guestbook,
    entries: GuestbookEntry[],
    coupleNames: string,
    eventDate?: string,
    venue?: string
  ): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await registerPdfFonts(doc);

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
    const visible = entries
      .filter((e) => !e.hidden)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const audioCount = visible.filter((e) => e.type === 'audio').length;
    const names = pdfSafe(coupleNames);
    const dateLabel = eventDate
      ? new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    /* ───────── Couverture ───────── */
    setFill(doc, C.paper);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    const photoH = 172;
    const cover = await loadCoverJpeg(effectiveCover(resolvePageContent(guestbook.page)), PAGE_W / photoH);
    if (cover) doc.addImage(cover, 'JPEG', 0, 0, PAGE_W, photoH);
    else { setFill(doc, C.soft); doc.rect(0, 0, PAGE_W, photoH, 'F'); }

    doc.setFont('Sans', 'bold'); doc.setFontSize(8); setText(doc, C.accent);
    drawSpaced(doc, 'LIVRE D’OR', PAGE_W / 2, 197, { spacing: 1.6, align: 'center' });

    doc.setFont('Script', 'normal');
    let size = 58;
    doc.setFontSize(size);
    const w = doc.getTextWidth(names);
    if (w > 176) { size = (58 * 176) / w; doc.setFontSize(size); }
    setText(doc, C.ink);
    doc.text(names, PAGE_W / 2, 226, { align: 'center' });

    setDraw(doc, C.ink); doc.setLineWidth(0.25);
    doc.line(PAGE_W / 2 - 14, 238, PAGE_W / 2 + 14, 238);

    doc.setFont('Sans', 'normal'); doc.setFontSize(8.2); setText(doc, C.muted);
    const sub = [dateLabel, pdfSafe(venue)].filter(Boolean).join('   ·   ').toUpperCase();
    if (sub) drawSpaced(doc, sub, PAGE_W / 2, 248, { spacing: 0.7, align: 'center' });

    doc.setFont('Serif', 'italic'); doc.setFontSize(11.5); setText(doc, C.muted);
    doc.text(
      `${visible.length} message${visible.length > 1 ? 's' : ''}${audioCount ? ` dont ${audioCount} vocal${audioCount > 1 ? 'ux' : ''}` : ''}`,
      PAGE_W / 2, 270, { align: 'center' }
    );

    /* ───────── Pages intérieures ───────── */
    let page = 1;
    let y = 0;
    const newPage = () => {
      doc.addPage();
      page++;
      setFill(doc, C.paper);
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      doc.setFont('Sans', 'normal'); doc.setFontSize(6.8); setText(doc, C.muted);
      drawSpaced(doc, `LIVRE D’OR  ·  ${names.toUpperCase()}`, MARGIN, 15, { spacing: 0.6 });
      setDraw(doc, C.hair); doc.setLineWidth(0.2);
      doc.line(MARGIN, 19, PAGE_W - MARGIN, 19);
      doc.setFont('Serif', 'italic'); doc.setFontSize(9.5); setText(doc, C.muted);
      doc.text(String(page), PAGE_W / 2, PAGE_H - 12, { align: 'center' });
      y = 36;
    };
    newPage();

    if (visible.length === 0) {
      doc.setFont('Serif', 'italic'); doc.setFontSize(13); setText(doc, C.muted);
      doc.text('Les premiers messages de vos invités apparaîtront ici.', PAGE_W / 2, 120, { align: 'center' });
    }

    for (let i = 0; i < visible.length; i++) {
      const e = visible[i];
      const isAudio = e.type === 'audio';
      if (y + (isAudio ? 44 : 34) > BOTTOM) newPage();

      // En-tête : nom + date
      doc.setFont('Serif', 'bold'); doc.setFontSize(14); setText(doc, C.ink);
      doc.text(pdfSafe(e.guest_name) || 'Invité', MARGIN, y);
      doc.setFont('Sans', 'normal'); doc.setFontSize(7.4); setText(doc, C.muted);
      drawSpaced(
        doc,
        new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
        PAGE_W - MARGIN, y, { spacing: 0.4, align: 'right' }
      );
      y += 5.4;

      if (isAudio) {
        doc.setFont('Sans', 'bold'); doc.setFontSize(6.6); setText(doc, C.accent);
        drawSpaced(doc, `MESSAGE VOCAL${e.duration_sec ? '  ·  ' + fmtDuration(e.duration_sec) : ''}`, MARGIN, y, { spacing: 0.7 });
        y += 7;

        // Forme d'onde — barres fines
        const wave = e.waveform?.length ? e.waveform : [];
        const bars = 38;
        setFill(doc, C.accent);
        for (let b = 0; b < bars; b++) {
          const v = wave.length ? wave[Math.floor((b / bars) * wave.length)] : 0.35 + 0.3 * Math.abs(Math.sin(b * 0.7));
          const h = Math.max(1.4, Math.min(11, (v || 0.2) * 11));
          doc.roundedRect(MARGIN + b * 2.4, y + 6 - h / 2, 1.2, h, 0.5, 0.5, 'F');
        }

        // QR d'écoute
        try {
          const qr = await QRCode.toDataURL(`${origin}/livre-or/${guestbook.public_token}?entry=${e.id}`, {
            width: 240, margin: 0, color: { dark: C.ink, light: C.paper },
          });
          doc.addImage(qr, 'PNG', PAGE_W - MARGIN - 19, y - 8, 19, 19);
          doc.setFont('Sans', 'normal'); doc.setFontSize(5.8); setText(doc, C.muted);
          doc.text('Scannez pour écouter', PAGE_W - MARGIN - 9.5, y + 14.5, { align: 'center' });
        } catch { /* QR facultatif */ }
        y += 22;
      } else {
        y += 2.5;
        doc.setFont('Serif', 'italic'); doc.setFontSize(12.5); setText(doc, C.ink);
        const lines: string[] = doc.splitTextToSize(`« ${pdfSafe(e.body)} »`, CONTENT_W - 6);
        for (const ln of lines) {
          if (y > BOTTOM) newPage(), doc.setFont('Serif', 'italic'), doc.setFontSize(12.5), setText(doc, C.ink);
          doc.text(ln, MARGIN + 3, y);
          y += 5.7;
        }
        y += 3;
      }

      // Séparateur discret
      if (i < visible.length - 1) {
        if (y + 14 > BOTTOM) newPage();
        else {
          setDraw(doc, C.hair); doc.setLineWidth(0.2);
          doc.line(PAGE_W / 2 - 10, y, PAGE_W / 2 + 10, y);
          y += 11;
        }
      }
    }

    /* ───────── Page de clôture ───────── */
    doc.addPage();
    setFill(doc, C.paper);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    doc.setFont('Script', 'normal'); doc.setFontSize(70); setText(doc, C.ink);
    doc.text('merci', PAGE_W / 2, 130, { align: 'center' });
    doc.setFont('Serif', 'italic'); doc.setFontSize(13); setText(doc, C.muted);
    doc.text('À tous ceux qui ont rendu ce jour inoubliable.', PAGE_W / 2, 150, { align: 'center' });
    setDraw(doc, C.ink); doc.setLineWidth(0.25);
    doc.line(PAGE_W / 2 - 14, 160, PAGE_W / 2 + 14, 160);
    doc.setFont('Sans', 'normal'); doc.setFontSize(7.6); setText(doc, C.muted);
    drawSpaced(doc, names.toUpperCase(), PAGE_W / 2, 170, { spacing: 1, align: 'center' });

    doc.save(`Livre-d-or-${names.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`);
  }

  /** Cartes de table (tri-fold A4 paysage) — une page par numéro de 1 à `design.table_count`. */
  static async generateTableCards(guestbook: Guestbook, design: GuestbookCardDesign): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
    const suffix = (pdfSafe(design.names) || 'mariage').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    await generateTableCardsPdf(design, `${origin}/livre-or/${guestbook.public_token}`, suffix);
  }
}
