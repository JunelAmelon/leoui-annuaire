import { jsPDF } from 'jspdf';
import {
  drawSpaced,
  loadCoverJpeg,
  pdfSafe,
  registerPdfFonts,
  setDraw,
  setFill,
  setText,
} from '@/features/guestbook/services/pdf/pdf-helpers';
import type {
  DayPlanMomentRef,
  PlaylistTrack,
  WeddingPlaylist,
} from '../domain/types';
import { computePlaylistStats, formatMomentTime } from '../domain/playlist-rules';

export interface DjBriefingPdfOptions {
  playlist: WeddingPlaylist;
  tracks: PlaylistTrack[];
  coupleNames: string;
  eventDate?: string;
  venueName?: string;
  moments?: DayPlanMomentRef[];
}

const INK = '#1C1614';
const MUTED = '#7A706A';
const HAIRLINE = '#D9D2CA';
const ROSE = '#BE123C';
const BANNED_RED = '#991B1B';
const MUST_ROSE = '#9F1239';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 18;

function formatFrenchDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function generateDjBriefingPdf(options: DjBriefingPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  try {
    await registerPdfFonts(doc);
  } catch (err) {
    console.warn('Fallback to default PDF fonts:', err);
  }

  let y = MARGIN;
  let pages = 1;

  const caps = (
    text: string,
    x: number,
    at: number,
    size = 7,
    color = MUTED,
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    try {
      doc.setFont('Sans', 'bold');
    } catch {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(size);
    setText(doc, color);
    drawSpaced(doc, pdfSafe(text).toUpperCase(), x, at, { spacing: 0.5, align });
  };

  const ensure = (height: number) => {
    if (y + height <= BOTTOM) return;
    doc.addPage();
    pages++;
    y = MARGIN + 4;
  };

  // ── En-tête éditorial : bandeau photo façon « fiche de studio » ──
  const BANNER_H = 62;
  const img = await loadCoverJpeg('/playlist-cover.jpg', (PAGE_W - 20) / BANNER_H, 1800);
  if (img) {
    doc.addImage(img, 'JPEG', 10, 10, PAGE_W - 20, BANNER_H, undefined, 'FAST');
    const adv = doc as unknown as {
      saveGraphicsState(): void; restoreGraphicsState(): void;
      GState: new (o: { opacity: number }) => object; setGState(g: object): void;
    };
    adv.saveGraphicsState();
    adv.setGState(new adv.GState({ opacity: 0.5 }));
    setFill(doc, '#141211');
    doc.rect(10, BANNER_H * 0.42 + 10, PAGE_W - 20, BANNER_H * 0.58, 'F');
    adv.restoreGraphicsState();

    doc.setFont('Sans', 'normal');
    doc.setFontSize(8);
    setText(doc, '#F6D2DC');
    drawSpaced(doc, 'LE OUI PARFAIT — DIRECTION ARTISTIQUE & BRIEFING DJ', PAGE_W / 2, BANNER_H * 0.6 + 10, { spacing: 1.1, align: 'center' });

    doc.setFont('Numeral', 'normal');
    doc.setFontSize(24);
    setText(doc, '#FFFFFF');
    doc.text(pdfSafe(options.coupleNames || 'Mariage'), PAGE_W / 2, BANNER_H * 0.84 + 10, { align: 'center' });
  } else {
    setFill(doc, '#141211');
    doc.rect(10, 10, PAGE_W - 20, BANNER_H, 'F');
    doc.setFont('Sans', 'normal');
    doc.setFontSize(8);
    setText(doc, '#F6D2DC');
    drawSpaced(doc, 'LE OUI PARFAIT — DIRECTION ARTISTIQUE & BRIEFING DJ', PAGE_W / 2, BANNER_H * 0.52 + 10, { spacing: 1.1, align: 'center' });
    doc.setFont('Numeral', 'normal');
    doc.setFontSize(24);
    setText(doc, '#FFFFFF');
    doc.text(pdfSafe(options.coupleNames || 'Mariage'), PAGE_W / 2, BANNER_H * 0.8 + 10, { align: 'center' });
  }

  y = 10 + BANNER_H + 10;

  try {
    doc.setFont('Serif', 'italic');
  } catch {
    doc.setFont('times', 'italic');
  }
  doc.setFontSize(11);
  setText(doc, MUTED);

  const sublineParts: string[] = [];
  if (options.eventDate) sublineParts.push(formatFrenchDate(options.eventDate));
  if (options.venueName) sublineParts.push(options.venueName);
  const subline = sublineParts.join('  •  ');
  if (subline) {
    doc.text(pdfSafe(subline), PAGE_W / 2, y, { align: 'center' });
    y += 7;
  }

  // Filet de séparation
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── Résumé & Statistiques ──
  const stats = computePlaylistStats(options.tracks);
  const bannedTracks = options.tracks.filter((t) => t.flag === 'banned');

  const cardW = (CONTENT_W - 6) / 3;
  const metrics = [
    { label: 'MORCEAUX SÉLECTIONNÉS', val: `${stats.total}` },
    { label: 'INCONTOURNABLES (MUST-PLAY)', val: `${stats.must_play}` },
    { label: 'TITRES PROHIBÉS (BLACKLIST)', val: `${stats.banned}` },
  ];

  metrics.forEach((m, i) => {
    const cx = MARGIN + i * (cardW + 3);
    setFill(doc, '#FAF7F5');
    setDraw(doc, HAIRLINE);
    doc.rect(cx, y, cardW, 14, 'FD');
    caps(m.label, cx + 4, y + 4.5, 5.5, MUTED);
    try {
      doc.setFont('Sans', 'bold');
    } catch {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(11);
    setText(doc, i === 2 && stats.banned > 0 ? BANNED_RED : INK);
    doc.text(m.val, cx + 4, y + 11.5);
  });
  y += 19;

  // ── Box Blacklist / Interdictions ──
  if (bannedTracks.length > 0) {
    const bannedItems = bannedTracks.map((bt) => {
      try {
        doc.setFont('Sans', 'bold');
      } catch {
        doc.setFont('helvetica', 'bold');
      }
      doc.setFontSize(8.5);
      const mainText = `✕  ${pdfSafe(bt.title)} — ${pdfSafe(bt.artist)}`;
      const mainLines = doc.splitTextToSize(mainText, CONTENT_W - 10) as string[];

      let noteLines: string[] = [];
      if (bt.notes) {
        try {
          doc.setFont('Serif', 'italic');
        } catch {
          doc.setFont('times', 'italic');
        }
        doc.setFontSize(7.5);
        noteLines = doc.splitTextToSize(`Raison : ${pdfSafe(bt.notes)}`, CONTENT_W - 14) as string[];
      }
      return { mainLines, noteLines };
    });

    const totalBannedLinesHeight = bannedItems.reduce(
      (sum, item) => sum + item.mainLines.length * 4.2 + item.noteLines.length * 3.6 + 2,
      0
    );
    const boxH = 11 + totalBannedLinesHeight;

    ensure(boxH + 6);
    setFill(doc, '#FEF2F2');
    setDraw(doc, '#FCA5A5');
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, y, CONTENT_W, boxH, 'FD');

    caps('ATTENTION DJ — TITRES STRICTEMENT INTERDITS (NE PAS DIFFUSER)', MARGIN + 5, y + 5.5, 6.5, BANNED_RED);

    let by = y + 10.5;
    bannedItems.forEach((item) => {
      try {
        doc.setFont('Sans', 'bold');
      } catch {
        doc.setFont('helvetica', 'bold');
      }
      doc.setFontSize(8.5);
      setText(doc, BANNED_RED);
      item.mainLines.forEach((line) => {
        doc.text(line, MARGIN + 5, by);
        by += 4.2;
      });

      if (item.noteLines.length > 0) {
        try {
          doc.setFont('Serif', 'italic');
        } catch {
          doc.setFont('times', 'italic');
        }
        doc.setFontSize(7.5);
        setText(doc, MUTED);
        item.noteLines.forEach((line) => {
          doc.text(line, MARGIN + 9, by);
          by += 3.6;
        });
      }
      by += 2;
    });

    y += boxH + 6;
  }

  // ── Sections & Morceaux ──
  const momentsMap = new Map((options.moments ?? []).map((m) => [m.id, m]));
  const sortedSections = [...options.playlist.sections].sort((a, b) => a.order - b.order);

  sortedSections.forEach((section, sIndex) => {
    const sectionTracks = options.tracks
      .filter((t) => t.section_id === section.id && t.flag !== 'banned')
      .sort((a, b) => a.order - b.order);

    const linkedMoment = section.linked_moment_id ? momentsMap.get(section.linked_moment_id) : undefined;
    const momentTiming = linkedMoment ? formatMomentTime(linkedMoment.start_at) : null;

    ensure(18);

    // Titre de section
    setFill(doc, '#F5EFEB');
    setDraw(doc, HAIRLINE);
    doc.rect(MARGIN, y, CONTENT_W, 7.5, 'FD');

    caps(`${sIndex + 1}. ${section.label}`, MARGIN + 4, y + 5, 7.5, INK);
    if (momentTiming) {
      caps(`MOMENT J: ${momentTiming}`, PAGE_W - MARGIN - 4, y + 5, 6.5, ROSE, 'right');
    }
    y += 10;

    if (sectionTracks.length === 0) {
      try {
        doc.setFont('Serif', 'italic');
      } catch {
        doc.setFont('times', 'italic');
      }
      doc.setFontSize(8.5);
      setText(doc, MUTED);
      doc.text('Aucun morceau spécifique renseigné pour ce moment (carte blanche DJ).', MARGIN + 4, y);
      y += 6;
    } else {
      const LEFT_COL_W = 112;
      const FULL_TEXT_W = CONTENT_W - 10;

      sectionTracks.forEach((track, tIdx) => {
        const titleSafe = pdfSafe(track.title);
        const artistSafe = pdfSafe(`— ${track.artist}`);

        try {
          doc.setFont('Sans', track.flag === 'must_play' ? 'bold' : 'normal');
        } catch {
          doc.setFont('helvetica', track.flag === 'must_play' ? 'bold' : 'normal');
        }
        doc.setFontSize(8.5);
        const titleWidth = doc.getTextWidth(titleSafe);
        const titleLines = doc.splitTextToSize(titleSafe, LEFT_COL_W) as string[];

        try {
          doc.setFont('Serif', 'italic');
        } catch {
          doc.setFont('times', 'italic');
        }
        doc.setFontSize(8);
        const artistWidth = doc.getTextWidth(artistSafe);

        // Si titre + artiste tiennent confortablement sur une ligne dans la colonne gauche
        const fitsInline =
          titleLines.length === 1 && titleWidth + 4 + artistWidth <= LEFT_COL_W;

        const artistLines = fitsInline
          ? []
          : (doc.splitTextToSize(artistSafe, FULL_TEXT_W) as string[]);

        let noteLines: string[] = [];
        if (track.notes) {
          doc.setFontSize(7.5);
          noteLines = doc.splitTextToSize(`Note : ${pdfSafe(track.notes)}`, FULL_TEXT_W) as string[];
        }

        const rowHeight =
          titleLines.length * 4 +
          artistLines.length * 3.8 +
          noteLines.length * 3.6 +
          3.5;

        ensure(rowHeight + 2);

        const rowTop = y;

        // Numéro
        try {
          doc.setFont('Sans', 'normal');
        } catch {
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(8);
        setText(doc, MUTED);
        doc.text(`${tIdx + 1}.`, MARGIN + 2, rowTop + 1);

        // Badge Must Play & Cue time (à droite de la première ligne)
        if (track.flag === 'must_play') {
          setFill(doc, '#FFE4E6');
          setDraw(doc, '#FDA4AF');
          doc.roundedRect(MARGIN + 124, rowTop - 2.4, 22, 4.4, 1, 1, 'FD');
          caps('MUST PLAY', MARGIN + 135, rowTop + 0.8, 5.2, MUST_ROSE, 'center');
        }

        if (track.cue_time) {
          caps(`À ${track.cue_time}`, PAGE_W - MARGIN - 2, rowTop + 0.8, 6, INK, 'right');
        }

        // Titre
        try {
          doc.setFont('Sans', track.flag === 'must_play' ? 'bold' : 'normal');
        } catch {
          doc.setFont('helvetica', track.flag === 'must_play' ? 'bold' : 'normal');
        }
        doc.setFontSize(8.5);
        setText(doc, INK);

        let curY = rowTop + 1;
        titleLines.forEach((line) => {
          doc.text(line, MARGIN + 8, curY);
          curY += 4;
        });

        // Artiste (inline si court, sinon proprement en dessous)
        try {
          doc.setFont('Serif', 'italic');
        } catch {
          doc.setFont('times', 'italic');
        }
        doc.setFontSize(8);
        setText(doc, MUTED);

        if (fitsInline) {
          doc.text(artistSafe, MARGIN + 8 + titleWidth + 3.5, rowTop + 1);
        } else {
          artistLines.forEach((line) => {
            doc.text(line, MARGIN + 8, curY);
            curY += 3.8;
          });
        }

        // Note éventuelle
        if (noteLines.length > 0) {
          doc.setFontSize(7.5);
          setText(doc, '#475569');
          noteLines.forEach((line) => {
            doc.text(line, MARGIN + 8, curY);
            curY += 3.6;
          });
        }

        // Filet fin entre pistes
        setDraw(doc, '#F1ECE8');
        doc.setLineWidth(0.15);
        doc.line(MARGIN + 2, curY - 1, PAGE_W - MARGIN - 2, curY - 1);

        y = curY + 2.5;
      });
    }

    y += 4;
  });

  // ── Pieds de page ──
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setDraw(doc, HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
    caps('Le Oui Parfait — Fiche DJ & Programmation Sonore', MARGIN, PAGE_H - 7.5, 6);
    caps(`${p} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 7.5, 6, MUTED, 'right');
  }

  const slug = (options.coupleNames || 'mariage')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  doc.save(`briefing-dj-${slug || 'mariage'}.pdf`);
}
