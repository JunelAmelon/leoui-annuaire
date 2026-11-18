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
import { COURSE_DEFINITIONS, DISH_STATUS_META } from '../domain/menu-rules';
import type { DietarySummary, WeddingMenu } from '../domain/types';

export interface MenuCardPdfOptions {
  menu: WeddingMenu;
  coupleNames: string;
  eventDate?: string;
  includePending?: boolean;
  includeDrafts?: boolean;
}

export interface CatererPdfOptions extends MenuCardPdfOptions {
  dietary: DietarySummary;
}

/* ── Palette LeOui ── */
const INK = '#1C1814';
const BODY = '#403830';
const MUTED = '#7D6E60';
const FAINT = '#BDAD9E';
const ROSE = '#E11D48';
const HAIRLINE = '#EBE1D5';
const PAPER = '#FCFBFA';
const WHITE = '#FFFFFF';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BANNER_H = 72;
const COVER_SRC = '/menu-cover.jpg';

function formatFrenchDate(eventDate?: string): string | null {
  if (!eventDate) return null;
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Fond ivoire + filet extérieur fin (pages suivantes uniquement). */
function drawPage(doc: jsPDF): void {
  setFill(doc, PAPER);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20);
}

/** Filet centré avec un losange au milieu (ornement de section). */
function drawRule(doc: jsPDF, y: number, halfWidth = 34, color = HAIRLINE): void {
  setDraw(doc, color);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - halfWidth, y, PAGE_W / 2 - 3, y);
  doc.line(PAGE_W / 2 + 3, y, PAGE_W / 2 + halfWidth, y);
  setFill(doc, color);
  const d = 1.4;
  const path: [number, number][] = [[0, -d], [d, 0], [0, d], [-d, 0]];
  doc.lines(path, PAGE_W / 2, y, [1, 1], 'F');
}

/** En-tête de section : titre Bodoni espacé entre deux filets + sous-titre italique. */
function sectionTitle(doc: jsPDF, y: number, title: string, subtitle?: string): number {
  doc.setFont('Numeral', 'normal');
  doc.setFontSize(15);
  setText(doc, INK);
  const tw = doc.getTextWidth(pdfSafe(title.toUpperCase())) + (title.length * 0.9);
  const ruleW = Math.max(8, (CONTENT_W - tw - 18) / 2);
  setDraw(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 1.4, MARGIN + ruleW, y - 1.4);
  doc.line(PAGE_W - MARGIN - ruleW, y - 1.4, PAGE_W - MARGIN, y - 1.4);
  drawSpaced(doc, pdfSafe(title.toUpperCase()), PAGE_W / 2, y, { spacing: 0.9, align: 'center' });
  y += 5.5;
  if (subtitle) {
    doc.setFont('Serif', 'italic');
    doc.setFontSize(10);
    setText(doc, FAINT);
    doc.text(pdfSafe(subtitle), PAGE_W / 2, y, { align: 'center' });
    y += 5;
  }
  return y + 3;
}

/** Item numéroté : grand chiffre Bodoni clair en marge + nom serif + note italique + filet. */
function dishLine(
  doc: jsPDF,
  y: number,
  num: number,
  name: string,
  note: string,
  x: number,
  w: number,
  suffix?: string
): number {
  const nameX = x + 14;

  // Grand ordinal Bodoni, rose très clair — signature visuelle de la carte
  doc.setFont('Numeral', 'normal');
  doc.setFontSize(16);
  setText(doc, '#E9B9C8');
  doc.text(String(num).padStart(2, '0'), x, y + 1);

  doc.setFont('Serif', 'bold');
  doc.setFontSize(13);
  setText(doc, INK);
  const maxNameW = w - 14 - (suffix ? 22 : 0);
  const nameLines = doc.splitTextToSize(pdfSafe(name), maxNameW);
  doc.text(nameLines[0], nameX, y);
  if (nameLines.length > 1) {
    y += 5;
    doc.text(nameLines.slice(1), nameX, y);
  }

  if (suffix) {
    doc.setFont('Sans', 'normal');
    doc.setFontSize(7.5);
    setText(doc, MUTED);
    drawSpaced(doc, pdfSafe(suffix.toUpperCase()), x + w, y, { spacing: 0.4, align: 'right' });
  }

  if (note.trim()) {
    doc.setFont('Serif', 'italic');
    doc.setFontSize(10.5);
    setText(doc, MUTED);
    const wrapped = doc.splitTextToSize(pdfSafe(note), w - 14);
    y += 5;
    doc.text(wrapped, nameX, y);
    y += (wrapped.length - 1) * 4.4;
  }

  // Filet très léger entre les plats
  y += 4.5;
  setDraw(doc, '#F0E9E0');
  doc.setLineWidth(0.15);
  doc.line(nameX, y, x + w, y);
  return y + 5;
}

/** Bandeau photo + titre superposé façon couverture de magazine. */
async function drawCover(
  doc: jsPDF,
  kicker: string,
  names: string,
  dateLine: string | null
): Promise<number> {
  setFill(doc, PAPER);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  const img = await loadCoverJpeg(COVER_SRC, PAGE_W / BANNER_H, 1800);
  if (img) {
    doc.addImage(img, 'JPEG', 10, 10, PAGE_W - 20, BANNER_H, undefined, 'FAST');
    // Dégradé sombre en bas de photo
    const adv = doc as unknown as {
      saveGraphicsState(): void; restoreGraphicsState(): void;
      GState: new (o: { opacity: number }) => object; setGState(g: object): void;
    };
    adv.saveGraphicsState();
    adv.setGState(new adv.GState({ opacity: 0.45 }));
    setFill(doc, '#1A1013');
    doc.rect(10, BANNER_H * 0.45 + 10, PAGE_W - 20, BANNER_H * 0.55, 'F');
    adv.restoreGraphicsState();

    // Titre sur la photo
    doc.setFont('Sans', 'normal');
    doc.setFontSize(8);
    setText(doc, '#F6D2DC');
    drawSpaced(doc, pdfSafe(kicker.toUpperCase()), PAGE_W / 2, BANNER_H * 0.62 + 10, { spacing: 1.1, align: 'center' });

    doc.setFont('Numeral', 'normal');
    doc.setFontSize(26);
    setText(doc, WHITE);
    doc.text(pdfSafe(names), PAGE_W / 2, BANNER_H * 0.82 + 10, { align: 'center' });
  } else {
    // Sans photo : bandeau champagne + titre encre
    setFill(doc, '#F3ECE4');
    doc.rect(10, 10, PAGE_W - 20, BANNER_H, 'F');
    doc.setFont('Sans', 'normal');
    doc.setFontSize(8);
    setText(doc, ROSE);
    drawSpaced(doc, pdfSafe(kicker.toUpperCase()), PAGE_W / 2, BANNER_H * 0.55 + 10, { spacing: 1.1, align: 'center' });
    doc.setFont('Numeral', 'normal');
    doc.setFontSize(26);
    setText(doc, INK);
    doc.text(pdfSafe(names), PAGE_W / 2, BANNER_H * 0.78 + 10, { align: 'center' });
  }

  let y = BANNER_H + 10 + 12;
  if (dateLine) {
    doc.setFont('Serif', 'italic');
    doc.setFontSize(11.5);
    setText(doc, MUTED);
    doc.text(pdfSafe(dateLine), PAGE_W / 2, y, { align: 'center' });
    y += 8;
  }
  drawRule(doc, y);
  return y + 12;
}

export class MenuPdfService {
  /**
   * Carte du menu imprimable, façon menu gastronomique de magazine —
   * destinée aux tables, sans données de régimes ou d'allergies.
   */
  static async generateMenuCard(options: MenuCardPdfOptions): Promise<void> {
    const { menu, coupleNames, eventDate, includePending = false, includeDrafts = false } = options;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await registerPdfFonts(doc);

    let y = await drawCover(doc, 'Menu de réception', coupleNames, formatFrenchDate(eventDate));

    const ensureSpace = (needed: number) => {
      if (y + needed > PAGE_H - 22) {
        doc.addPage();
        drawPage(doc);
        y = 24;
      }
    };

    let dishNum = 0;
    for (const def of COURSE_DEFINITIONS) {
      const course = menu.courses.find((c) => c.key === def.key);
      const dishes = (course?.dishes ?? []).filter((d) => {
        if (includeDrafts) return true;
        if (includePending) return d.status === 'retenu' || d.status === 'a_valider';
        return d.status === 'retenu';
      });
      if (dishes.length === 0) continue;

      ensureSpace(20);
      y = sectionTitle(doc, y, def.label, def.subtitle) + 2;

      for (const dish of dishes) {
        dishNum++;
        ensureSpace(14);
        y = dishLine(doc, y, dishNum, dish.name, dish.note, MARGIN + 10, CONTENT_W - 20);
      }
      y += 5;
    }

    // Pied de page
    ensureSpace(14);
    doc.setFont('Sans', 'normal');
    doc.setFontSize(7.5);
    setText(doc, FAINT);
    drawSpaced(doc, 'LEOUI.NET', PAGE_W / 2, PAGE_H - 16, { spacing: 0.8, align: 'center' });

    const safeSlug = coupleNames.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    doc.save(`menu-${safeSlug || 'mariage'}.pdf`);
  }

  /**
   * Fiche technique pour le traiteur : menu numéroté + statuts + régimes + allergies + consignes.
   */
  static async generateCatererBrief(options: CatererPdfOptions): Promise<void> {
    const { menu, dietary, coupleNames, eventDate, includePending = false, includeDrafts = false } = options;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await registerPdfFonts(doc);

    let y = await drawCover(doc, 'Fiche technique traiteur', coupleNames, formatFrenchDate(eventDate));

    const ensureSpace = (needed: number) => {
      if (y + needed > PAGE_H - 22) {
        doc.addPage();
        drawPage(doc);
        y = 24;
      }
    };

    // 1. Sélection des plats
    let dishNum = 0;
    for (const def of COURSE_DEFINITIONS) {
      const course = menu.courses.find((c) => c.key === def.key);
      const dishes = (course?.dishes ?? []).filter((d) => {
        if (includeDrafts) return true;
        if (includePending) return d.status === 'retenu' || d.status === 'a_valider';
        return d.status === 'retenu';
      });
      if (dishes.length === 0) continue;

      ensureSpace(20);
      y = sectionTitle(doc, y, def.label, def.subtitle) + 2;

      for (const dish of dishes) {
        dishNum++;
        ensureSpace(14);
        const suffix =
          includePending && dish.status !== 'retenu'
            ? DISH_STATUS_META[dish.status].label
            : undefined;
        y = dishLine(doc, y, dishNum, dish.name, dish.note, MARGIN + 4, CONTENT_W - 8, suffix);
      }
      y += 5;
    }

    // 2. Régimes alimentaires
    ensureSpace(36);
    y = sectionTitle(doc, y, 'Régimes alimentaires') + 4;

    doc.setFont('Serif', 'italic');
    doc.setFontSize(10.5);
    setText(doc, MUTED);
    doc.text(
      `${dietary.total_confirmed} invité${dietary.total_confirmed > 1 ? 's' : ''} confirmé${dietary.total_confirmed > 1 ? 's' : ''}${dietary.total_pending > 0 ? `, ${dietary.total_pending} en attente` : ''}`,
      PAGE_W / 2,
      y,
      { align: 'center' }
    );
    y += 7;

    for (const cat of dietary.categories) {
      ensureSpace(8);
      doc.setFont('Sans', 'bold');
      doc.setFontSize(10);
      setText(doc, INK);
      doc.text(pdfSafe(cat.category).toUpperCase(), MARGIN + 4, y);
      doc.setFont('Serif', 'normal');
      doc.setFontSize(11);
      setText(doc, BODY);
      doc.text(
        `${cat.confirmed}${cat.pending > 0 ? `  +${cat.pending}` : ''}`,
        PAGE_W - MARGIN - 4,
        y,
        { align: 'right' }
      );
      y += 3.4;
      setDraw(doc, HAIRLINE);
      doc.setLineWidth(0.2);
      doc.line(MARGIN + 4, y, PAGE_W - MARGIN - 4, y);
      y += 4;
    }

    // 3. Précisions nominatives
    if (dietary.special_requests.length > 0) {
      y += 6;
      ensureSpace(20);
      y = sectionTitle(doc, y, 'Allergies & précisions') + 5;
      dietary.special_requests.forEach((req, i) => {
        ensureSpace(10);
        const detail = req.menu_other ? `${req.menu} — ${req.menu_other}` : req.menu;
        y = dishLine(
          doc,
          y,
          i + 1,
          req.guest_name,
          `${detail} · ${req.rsvp === 'confirmed' ? 'confirmé' : 'en attente'}`,
          MARGIN + 4,
          CONTENT_W - 8
        ) - 1;
      });
    }

    // 4. Consignes générales
    if (menu.dietary_notes.trim()) {
      y += 6;
      ensureSpace(24);
      y = sectionTitle(doc, y, 'Consignes traiteur') + 5;
      doc.setFont('Serif', 'italic');
      doc.setFontSize(11);
      setText(doc, BODY);
      const wrapped = doc.splitTextToSize(pdfSafe(menu.dietary_notes.trim()), CONTENT_W - 16);
      for (const line of wrapped) {
        ensureSpace(6);
        doc.text(line, PAGE_W / 2, y, { align: 'center' });
        y += 4.8;
      }
    }

    // Pied de page
    ensureSpace(14);
    doc.setFont('Sans', 'normal');
    doc.setFontSize(7.5);
    setText(doc, FAINT);
    drawSpaced(doc, 'LEOUI.NET', PAGE_W / 2, PAGE_H - 16, { spacing: 0.8, align: 'center' });

    const safeSlug = coupleNames.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    doc.save(`fiche-traiteur-${safeSlug || 'mariage'}.pdf`);
  }
}
