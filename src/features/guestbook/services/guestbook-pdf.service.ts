import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Guestbook, GuestbookEntry } from '../domain/types';

export class GuestbookPdfService {
  /**
   * Génère le Livre d’or souvenir complet au format PDF A4.
   * Contient les messages écrits et un mini QR Code pour réécouter chaque message vocal.
   */
  static async generatePrintableBook(
    guestbook: Guestbook,
    entries: GuestbookEntry[],
    coupleNames: string,
    eventDate?: string
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
    const visibleEntries = entries.filter((e) => !e.hidden);

    // ── PAGE DE COUVERTURE ÉLÉGANTE & SOBRE ──
    doc.setFillColor(250, 246, 248); // #FAF6F8 (teinte champagne/rosée LeOui)
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Cadre doré/charcoal fin
    doc.setDrawColor(220, 210, 215);
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - margin * 2 + 10);

    // Titres de couverture
    doc.setFont('times', 'normal');
    doc.setTextColor(180, 100, 120);
    doc.setFontSize(11);
    doc.text('LIVRE D’OR DES MARIÉS', pageWidth / 2, 70, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setTextColor(26, 26, 26); // charcoal-900
    doc.setFontSize(28);
    doc.text(coupleNames, pageWidth / 2, 90, { align: 'center' });

    // Filet décoratif
    doc.setDrawColor(225, 29, 72); // rose-600
    doc.setLineWidth(0.8);
    doc.line(pageWidth / 2 - 25, 100, pageWidth / 2 + 25, 100);

    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    if (eventDate) {
      const formattedDate = new Date(eventDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.text(formattedDate, pageWidth / 2, 115, { align: 'center' });
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${visibleEntries.length} témoignages et souvenirs partagés`,
      pageWidth / 2,
      130,
      { align: 'center' }
    );

    // Pied de page couverture
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text('Le Oui Parfait · Édition Souvenir', pageWidth / 2, pageHeight - 25, {
      align: 'center',
    });

    // ── PAGES INTÉRIEURES ──
    let currentY = margin;
    let pageNumber = 1;

    const addNewPage = () => {
      doc.addPage();
      pageNumber++;
      currentY = margin;

      // En-tête de page discrète
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Livre d’or · ${coupleNames}`, margin, 12);

      // Filet sous en-tête
      doc.setDrawColor(240, 235, 238);
      doc.setLineWidth(0.3);
      doc.line(margin, 15, pageWidth - margin, 15);

      // Numérotation
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, {
        align: 'right',
      });
    };

    addNewPage();

    for (let i = 0; i < visibleEntries.length; i++) {
      const entry = visibleEntries[i];
      const isAudio = entry.type === 'audio';

      // Estimation de la hauteur du bloc
      const estimatedHeight = isAudio ? 42 : 38;

      if (currentY + estimatedHeight > pageHeight - margin - 15) {
        addNewPage();
      }

      // Fond du bloc message
      doc.setFillColor(252, 250, 251);
      doc.setDrawColor(235, 230, 233);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, contentWidth, estimatedHeight - 5, 2, 2, 'FD');

      // Prénom et date
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.text(entry.guest_name, margin + 5, currentY + 7);

      const entryDate = new Date(entry.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(entryDate, pageWidth - margin - 5, currentY + 7, { align: 'right' });

      if (isAudio) {
        // ── CAS VOCAL : FORME D'ONDE & MINI QR CODE ──
        const durationText = entry.duration_sec
          ? `Message vocal (${Math.floor(entry.duration_sec / 60)}:${entry.duration_sec % 60 < 10 ? '0' : ''}${entry.duration_sec % 60})`
          : 'Message vocal';

        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(durationText, margin + 5, currentY + 14);

        // Dessiner une forme d'onde sobre
        const waveform = entry.waveform && entry.waveform.length > 0 ? entry.waveform.slice(0, 32) : [];
        const waveStartX = margin + 5;
        const waveY = currentY + 22;
        const barW = 1.8;
        const gap = 1.2;

        doc.setFillColor(200, 180, 190);
        for (let b = 0; b < 24; b++) {
          const val = waveform[b] || 0.3;
          const h = Math.max(2, Math.min(10, val * 10));
          doc.rect(waveStartX + b * (barW + gap), waveY - h / 2, barW, h, 'F');
        }

        // Générer le mini QR Code pour écoute directe
        const listenUrl = `${origin}/livre-or/${guestbook.public_token}?entry=${entry.id}`;
        try {
          const miniQrDataUrl = await QRCode.toDataURL(listenUrl, {
            width: 150,
            margin: 0,
            color: { dark: '#1a1a1a', light: '#fcfafb' },
          });

          // QR Code sur la droite
          const qrSize = 22;
          const qrX = pageWidth - margin - qrSize - 5;
          const qrY = currentY + 10;
          doc.addImage(miniQrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

          doc.setFont('times', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(130, 130, 130);
          doc.text('Scannez pour écouter', qrX + qrSize / 2, qrY + qrSize + 3, {
            align: 'center',
          });
        } catch (e) {
          console.warn('Erreur mini QR:', e);
        }
      } else {
        // ── CAS TEXTE : CITATION ÉLÉGANTE ──
        doc.setFont('times', 'italic');
        doc.setFontSize(10.5);
        doc.setTextColor(50, 50, 50);

        const bodyText = `« ${entry.body || ''} »`;
        const splitText = doc.splitTextToSize(bodyText, contentWidth - 10);
        doc.text(splitText.slice(0, 3), margin + 5, currentY + 15);
      }

      currentY += estimatedHeight;
    }

    // Téléchargement du PDF
    const filename = `Livre-d-Or-${coupleNames.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(filename);
  }

  /**
   * Génère le carton de table / flyer au format A6 chevalet à poser sur les tables.
   */
  static async generateTableFlyer(
    guestbook: Guestbook,
    coupleNames: string,
    eventDate?: string
  ): Promise<void> {
    // Format A6 (105 x 148 mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 148],
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
    const publicUrl = `${origin}/livre-or/${guestbook.public_token}`;

    // Fond blanc avec bordure douce
    doc.setFillColor(250, 246, 248);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Cadre intérieur
    doc.setDrawColor(225, 29, 72); // rose-600
    doc.setLineWidth(0.4);
    doc.rect(6, 6, pageWidth - 12, pageHeight - 12);

    // Titre
    doc.setFont('times', 'normal');
    doc.setTextColor(180, 100, 120);
    doc.setFontSize(9);
    doc.text('LIVRE D’OR & SOUVENIRS', pageWidth / 2, 18, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(16);
    doc.text(coupleNames, pageWidth / 2, 26, { align: 'center' });

    // Ligne
    doc.setDrawColor(220, 200, 210);
    doc.setLineWidth(0.4);
    doc.line(pageWidth / 2 - 15, 30, pageWidth / 2 + 15, 30);

    // Message d'accroche chaleureux
    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(60, 60, 60);
    const intro = 'Laissez-nous un mot doux\nou enregistrez votre message vocal !';
    doc.text(intro, pageWidth / 2, 38, { align: 'center' });

    // Grand QR Code central HD
    try {
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      });

      const qrSize = 50;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 48;

      // Cadre blanc autour du QR Code
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn('Erreur QR Flyer:', e);
    }

    // Mode d'emploi en 3 étapes simples
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text('1. Scannez avec l’appareil photo de votre téléphone', pageWidth / 2, 108, {
      align: 'center',
    });
    doc.text('2. Choisissez texte ou message vocal sans installer d’application', pageWidth / 2, 114, {
      align: 'center',
    });
    doc.text('3. Les mariés découvriront vos messages avec émotion !', pageWidth / 2, 120, {
      align: 'center',
    });

    // Date / Remerciement
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Merci d’être à nos côtés en ce jour si précieux', pageWidth / 2, 136, {
      align: 'center',
    });

    const filename = `Carton-Table-Livre-Or-${coupleNames.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(filename);
  }
}

