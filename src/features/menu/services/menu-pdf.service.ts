import { jsPDF } from 'jspdf';
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

function formatFrenchDate(eventDate?: string): string | null {
  if (!eventDate) return null;
  const parsed = new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function drawEditorialFrame(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fond champagne/rosé LeOui (#FAF6F8)
  doc.setFillColor(250, 246, 248);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Cadre extérieur fin
  doc.setDrawColor(220, 210, 215);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Double filet intérieur discret
  doc.setDrawColor(235, 228, 232);
  doc.setLineWidth(0.25);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
}

export class MenuPdfService {
  /**
   * Génère la carte du menu imprimable (façon menu de restaurant gastronomique),
   * destinée aux tables des invités — sans aucune donnée de régimes ou d'allergies.
   */
  static generateMenuCard(options: MenuCardPdfOptions): void {
    const {
      menu,
      coupleNames,
      eventDate,
      includePending = false,
      includeDrafts = false,
    } = options;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 52;

    drawEditorialFrame(doc);

    let y = 32;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 28) {
        doc.addPage();
        drawEditorialFrame(doc);
        y = 30;
      }
    };

    // En-tête éditorial façon carte de restaurant
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 120);
    doc.text('MENU DE RÉCEPTION', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(26, 26, 26);
    doc.text(coupleNames, pageWidth / 2, y, { align: 'center' });
    y += 8;

    const formattedDate = formatFrenchDate(eventDate);
    if (formattedDate) {
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(115, 110, 112);
      doc.text(formattedDate, pageWidth / 2, y, { align: 'center' });
      y += 7;
    }

    // Filet décoratif rose-600
    doc.setDrawColor(225, 29, 72);
    doc.setLineWidth(0.7);
    doc.line(pageWidth / 2 - 22, y + 2, pageWidth / 2 + 22, y + 2);
    y += 16;

    for (const def of COURSE_DEFINITIONS) {
      const course = menu.courses.find((c) => c.key === def.key);
      const dishes = (course?.dishes ?? []).filter((d) => {
        if (includeDrafts) return true;
        if (includePending) return d.status === 'retenu' || d.status === 'a_valider';
        return d.status === 'retenu';
      });

      if (dishes.length === 0) continue;

      ensureSpace(24);
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(225, 29, 72);
      doc.text(def.label.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 7;

      for (const dish of dishes) {
        ensureSpace(16);
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(28, 25, 23);
        const wrappedTitle = doc.splitTextToSize(dish.name, contentWidth);
        doc.text(wrappedTitle, pageWidth / 2, y, { align: 'center' });
        y += wrappedTitle.length * 6;

        if (dish.note) {
          doc.setFont('times', 'italic');
          doc.setFontSize(10.5);
          doc.setTextColor(110, 105, 107);
          const wrappedNote = doc.splitTextToSize(dish.note, contentWidth - 12);
          doc.text(wrappedNote, pageWidth / 2, y, { align: 'center' });
          y += wrappedNote.length * 4.8;
        }
        y += 4;
      }

      // Petit séparateur discret entre services
      doc.setDrawColor(225, 215, 220);
      doc.setLineWidth(0.25);
      doc.line(pageWidth / 2 - 12, y + 1, pageWidth / 2 + 12, y + 1);
      y += 10;
    }

    // Pied de page discret
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 145, 147);
    doc.text('Le Oui Parfait', pageWidth / 2, pageHeight - 20, { align: 'center' });

    const safeSlug = coupleNames
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    doc.save(`menu-${safeSlug || 'mariage'}.pdf`);
  }

  /**
   * Génère la fiche technique pour le traiteur (menu + régimes alimentaires + allergies + consignes).
   */
  static generateCatererBrief(options: CatererPdfOptions): void {
    const {
      menu,
      dietary,
      coupleNames,
      eventDate,
      includePending = false,
      includeDrafts = false,
    } = options;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 22;
    const contentWidth = pageWidth - margin * 2;

    drawEditorialFrame(doc);
    let y = 30;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 24) {
        doc.addPage();
        drawEditorialFrame(doc);
        y = 28;
      }
    };

    // En-tête
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(180, 100, 120);
    doc.text('FICHE TECHNIQUE TRAITEUR', pageWidth / 2, y, { align: 'center' });
    y += 9;

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(26, 26, 26);
    doc.text(coupleNames, pageWidth / 2, y, { align: 'center' });
    y += 7;

    const formattedDate = formatFrenchDate(eventDate);
    if (formattedDate) {
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(115, 110, 112);
      doc.text(formattedDate, pageWidth / 2, y, { align: 'center' });
      y += 6;
    }

    doc.setDrawColor(225, 29, 72);
    doc.setLineWidth(0.7);
    doc.line(pageWidth / 2 - 20, y + 2, pageWidth / 2 + 20, y + 2);
    y += 14;

    // 1. Sélection des plats
    for (const def of COURSE_DEFINITIONS) {
      const course = menu.courses.find((c) => c.key === def.key);
      const dishes = (course?.dishes ?? []).filter((d) => {
        if (includeDrafts) return true;
        if (includePending) return d.status === 'retenu' || d.status === 'a_valider';
        return d.status === 'retenu';
      });
      if (dishes.length === 0) continue;

      ensureSpace(18);
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(225, 29, 72);
      doc.text(def.label.toUpperCase(), margin, y);
      y += 6;

      for (const dish of dishes) {
        ensureSpace(12);
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(28, 25, 23);
        const titleLine =
          includePending && dish.status !== 'retenu'
            ? `${dish.name} (${DISH_STATUS_META[dish.status].label})`
            : dish.name;
        doc.text(titleLine, margin + 3, y);
        y += 5;

        if (dish.note) {
          doc.setFont('times', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(100, 95, 97);
          const wrapped = doc.splitTextToSize(dish.note, contentWidth - 6);
          doc.text(wrapped, margin + 3, y);
          y += wrapped.length * 4.5;
        }
        y += 2;
      }
      y += 4;
    }

    // 2. Régimes alimentaires
    ensureSpace(45);
    doc.setDrawColor(220, 210, 215);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text(
      `Récapitulatif des régimes (${dietary.total_confirmed} confirmés)`,
      margin,
      y
    );
    y += 7;

    for (const cat of dietary.categories) {
      ensureSpace(7);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(235, 228, 232);
      doc.roundedRect(margin, y - 4, contentWidth, 6.5, 1.5, 1.5, 'FD');

      doc.setFont('times', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(41, 37, 36);
      doc.text(cat.category, margin + 4, y + 0.5);
      doc.text(
        `${cat.confirmed} confirmé(s)${cat.pending > 0 ? `  ·  ${cat.pending} en attente` : ''}`,
        pageWidth - margin - 4,
        y + 0.5,
        { align: 'right' }
      );
      y += 8;
    }

    if (dietary.special_requests.length > 0) {
      y += 4;
      ensureSpace(18);
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text('Précisions & allergies nominatives', margin, y);
      y += 7;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      for (const req of dietary.special_requests) {
        ensureSpace(7);
        const detail = req.menu_other ? `${req.menu} — ${req.menu_other}` : req.menu;
        const line = `${req.guest_name} (${req.rsvp === 'confirmed' ? 'Confirmé' : 'En attente'}) : ${detail}`;
        const wrapped = doc.splitTextToSize(line, contentWidth - 4);
        doc.setTextColor(68, 64, 60);
        doc.text(wrapped, margin + 2, y);
        y += wrapped.length * 4.5 + 1.5;
      }
    }

    if (menu.dietary_notes.trim()) {
      y += 5;
      ensureSpace(20);
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text('Consignes générales traiteur', margin, y);
      y += 6;

      doc.setFont('times', 'italic');
      doc.setFontSize(10.5);
      doc.setTextColor(68, 64, 60);
      const wrappedNotes = doc.splitTextToSize(menu.dietary_notes.trim(), contentWidth - 4);
      for (const line of wrappedNotes) {
        ensureSpace(6);
        doc.text(line, margin + 2, y);
        y += 4.8;
      }
    }

    const safeSlug = coupleNames
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    doc.save(`fiche-traiteur-${safeSlug || 'mariage'}.pdf`);
  }
}
