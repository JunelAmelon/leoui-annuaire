import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type {
  Gazette,
  StorySectionContent,
  AnecdoteSectionContent,
  QuizSectionContent,
  ProgramSectionContent,
  CustomSectionContent,
} from '../domain/types';

/**
 * Helper sécurisé pour convertir une image (URL ou DataURL) en Base64 pour jsPDF.
 */
async function resolveImageBase64(urlOrData: string): Promise<string | null> {
  if (!urlOrData) return null;
  if (urlOrData.startsWith('data:image/')) return urlOrData;
  try {
    const res = await fetch(urlOrData);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Impossible de charger l’image pour le PDF:', err);
    return null;
  }
}

/**
 * Convertit un code couleur hexadécimal (#rrggbb ou #rgb) en triplet RGB.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#be123c').replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16) || 190,
    parseInt(clean.substring(2, 4), 16) || 18,
    parseInt(clean.substring(4, 6), 16) || 60,
  ];
}

export class GazettePdfService {
  /**
   * Génère la Gazette des Mariés complète au format PDF A4 bifold haute couture (4 pages denses, calibrées et personnalisées).
   */
  static async generatePrintableGazette(gazette: Gazette): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const margin = 15;
    const contentWidth = pageWidth - margin * 2; // 180 mm

    const isVogue = gazette.layout.theme === 'chic_minimal';
    const isRomantic = gazette.layout.theme === 'romantic_rose';

    // Couleur d'accentuation dynamique du mariage
    const accentRgb = hexToRgb(
      gazette.layout?.accent_color || (isVogue ? '#18181b' : '#be123c')
    );

    // Helper pour dessiner le style de fond et filets authentiques
    const applyPageBackground = () => {
      if (isVogue) {
        doc.setFillColor(255, 255, 255); // Blanc pur magazine
      } else if (isRomantic) {
        doc.setFillColor(255, 250, 248); // Teinte poudrée délicate
      } else {
        doc.setFillColor(252, 249, 242); // Ivoire journal authentique
      }
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Filets d'encadrement haut et bas selon le thème
      if (isVogue) {
        doc.setDrawColor(20, 20, 20);
        doc.setLineWidth(0.8);
        doc.line(margin, margin - 4, margin + contentWidth, margin - 4);
        doc.line(margin, pageHeight - margin + 4, margin + contentWidth, pageHeight - margin + 4);
      } else if (isRomantic) {
        doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
        doc.setLineWidth(0.4);
        doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - margin * 2 + 8);
      } else {
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.5);
        doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - margin * 2 + 8);
        doc.setLineWidth(0.15);
        doc.rect(margin - 2.5, margin - 2.5, contentWidth + 5, pageHeight - margin * 2 + 5);
      }
    };

    // Helper pour pied de page journal soigné et épuré
    const drawFooter = (pageNum: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(
        `${gazette.title || 'La Gazette des Mariés'} — Page ${pageNum} sur 4`,
        pageWidth / 2,
        pageHeight - 7.5,
        { align: 'center' }
      );
      doc.text(
        gazette.location_name || 'Édition Souvenir Officielle',
        margin + contentWidth,
        pageHeight - 7.5,
        { align: 'right' }
      );
    };

    // Formatage de la date en français
    const formattedDate = gazette.wedding_date
      ? new Date(gazette.wedding_date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Jour de célébration';

    // Micro-détails de presse
    const editionTag = gazette.edition_tag || (isVogue ? 'ISSUE NO. 01' : 'VOL. I — N° 001');
    const priceTag = gazette.price_tag || 'PRIX : TOUT VOTRE AMOUR';

    // ==========================================
    // ── PAGE 1 : LA UNE HAUTE COUTURE ──
    // ==========================================
    applyPageBackground();

    // 1. Bandeau supérieur (Header presse avec micro-caps)
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(70, 70, 70);
    const topBar = isVogue
      ? `${editionTag} • THE WEDDING JOURNAL • SPECIAL EDITION`
      : `${editionTag} • ÉDITION SPÉCIALE • JOURNAL OFFICIEL DE LA CÉLÉBRATION`;
    doc.text(topBar, pageWidth / 2, margin + 2, { align: 'center' });

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(isVogue ? 0.8 : 0.6);
    doc.line(margin, margin + 4, margin + contentWidth, margin + 4);

    // Titre principal (Masthead)
    doc.setFont('times', 'bold');
    doc.setFontSize(isVogue ? 30 : 26);
    doc.setTextColor(15, 15, 15);
    const mastheadTitle = (gazette.title || 'LA GAZETTE DES MARIÉS').toUpperCase();
    doc.text(mastheadTitle, pageWidth / 2, margin + 14, { align: 'center' });

    // 2. Date & Lieu & Mention de prix
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 18, margin + contentWidth, margin + 18);

    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text(
      `${formattedDate} • ${gazette.location_name || 'Édition Officielle'} • ${priceTag}`,
      pageWidth / 2,
      margin + 22,
      { align: 'center' }
    );

    doc.setLineWidth(isVogue ? 0.8 : 0.6);
    doc.line(margin, margin + 24, margin + contentWidth, margin + 24);

    // 3. Gros titre (Headline avec couleur d'accent)
    doc.setFont('times', 'bold');
    doc.setFontSize(isVogue ? 20 : 18);
    doc.setTextColor(isVogue ? 10 : accentRgb[0], isVogue ? 10 : accentRgb[1], isVogue ? 10 : accentRgb[2]);
    const headline = (gazette.subtitle || 'ILS SE SONT DIT OUI !').toUpperCase();
    doc.text(headline, pageWidth / 2, margin + 33, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      '— La grande aventure commence aujourd’hui sous vos applaudissements —',
      pageWidth / 2,
      margin + 38,
      { align: 'center' }
    );

    // 4. Cadre Photo de Une : Grand format généreux (115 mm de haut)
    const photoBoxY = margin + 42;
    const photoBoxHeight = 115;
    let hasImage = false;

    if (gazette.cover_path) {
      const imgBase64 = await resolveImageBase64(gazette.cover_path);
      if (imgBase64) {
        try {
          const format = imgBase64.includes('png') || imgBase64.includes('PNG') ? 'PNG' : 'JPEG';
          doc.addImage(imgBase64, format, margin, photoBoxY, contentWidth, photoBoxHeight, undefined, 'FAST');
          hasImage = true;
        } catch (err) {
          console.warn('Erreur addImage PDF:', err);
        }
      }
    }

    doc.setDrawColor(isVogue ? 30 : accentRgb[0], isVogue ? 30 : accentRgb[1], isVogue ? 30 : accentRgb[2]);
    doc.setLineWidth(0.4);
    doc.rect(margin, photoBoxY, contentWidth, photoBoxHeight);

    if (hasImage) {
      // Bandeau légende blanc épuré sous l'image
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, photoBoxY + photoBoxHeight - 8.5, contentWidth, 8.5, 'F');
      doc.setLineWidth(0.15);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, photoBoxY + photoBoxHeight - 8.5, margin + contentWidth, photoBoxY + photoBoxHeight - 8.5);

      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        gazette.cover_caption || '« Le commencement d’une vie à deux pleine de promesses et d’élégance »',
        pageWidth / 2,
        photoBoxY + photoBoxHeight - 3,
        { align: 'center', maxWidth: contentWidth - 10 }
      );
    } else {
      // Cadre médaillon noble travaillé
      doc.setFillColor(isVogue ? 250 : 255, isVogue ? 250 : 246, isVogue ? 250 : 244);
      doc.rect(margin, photoBoxY, contentWidth, photoBoxHeight, 'F');
      doc.setDrawColor(210, 205, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin + 5, photoBoxY + 5, contentWidth - 10, photoBoxHeight - 10);
      doc.rect(margin + 6.5, photoBoxY + 6.5, contentWidth - 13, photoBoxHeight - 13);

      doc.setDrawColor(180, 175, 170);
      doc.line(margin + 40, photoBoxY + photoBoxHeight / 2 - 12, margin + contentWidth - 40, photoBoxY + photoBoxHeight / 2 - 12);
      doc.line(margin + 40, photoBoxY + photoBoxHeight / 2 + 16, margin + contentWidth - 40, photoBoxY + photoBoxHeight / 2 + 16);

      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(isVogue ? 30 : accentRgb[0], isVogue ? 30 : accentRgb[1], isVogue ? 30 : accentRgb[2]);
      doc.text('NOTRE HISTOIRE EN IMAGES', pageWidth / 2, photoBoxY + photoBoxHeight / 2 - 3, { align: 'center' });

      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(
        gazette.cover_caption || '« Le grand OUI sous le ciel d’amour »',
        pageWidth / 2,
        photoBoxY + photoBoxHeight / 2 + 8,
        { align: 'center', maxWidth: contentWidth - 20 }
      );
    }

    // 5. Bas de Page 1 : 2 colonnes parfaitement calibrées (hauteur 100 mm)
    const colY = photoBoxY + photoBoxHeight + 7;
    const colWidth = (contentWidth - 8) / 2;
    const bottomColHeight = 100;

    // Colonne 1 : Éditorial des mariés
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text('ÉDITORIAL : LE MOT DES MARIÉS', margin, colY + 5);
    doc.setLineWidth(0.25);
    doc.setDrawColor(30, 30, 30);
    doc.line(margin, colY + 7.5, margin + colWidth, colY + 7.5);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(45, 45, 45);
    const editorial =
      gazette.editorial ||
      'Chers invités, soyez les bienvenus dans notre gazette exclusive ! Nous avons préparé ces quelques pages pour partager nos souvenirs, vous guider au fil de cette journée magique et tester vos connaissances. Prenez place, savourez chaque instant et célébrons ensemble jusqu’au bout de la nuit !';
    const editLines = doc.splitTextToSize(editorial, colWidth - 2);
    doc.text(editLines, margin, colY + 13.5);

    // Signature des mariés au bas de l'édito
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(isVogue ? 20 : accentRgb[0], isVogue ? 20 : accentRgb[1], isVogue ? 20 : accentRgb[2]);
    doc.text('— Avec tout notre amour, les mariés.', margin + colWidth - 2, colY + 13.5 + editLines.length * 4.6 + 6, {
      align: 'right',
    });

    // Séparateur vertical entre colonnes
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.25);
    doc.line(margin + colWidth + 4, colY + 2, margin + colWidth + 4, colY + bottomColHeight - 8);

    // Colonne 2 : Météo du cœur & Temps forts
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text('MÉTÉO DU CŒUR & EN BREF', margin + colWidth + 8, colY + 5);
    doc.setLineWidth(0.25);
    doc.setDrawColor(30, 30, 30);
    doc.line(margin + colWidth + 8, colY + 7.5, margin + contentWidth, colY + 7.5);

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const weather =
      gazette.weather_forecast ||
      '32°C de bonheur absolu, 100% d’amour et de fortes averses de confettis prévues.';
    const weatherLines = doc.splitTextToSize(weather, colWidth - 2);
    doc.text(weatherLines, margin + colWidth + 8, colY + 13.5);

    // Temps forts réels en français
    let highlightY = colY + 13.5 + weatherLines.length * 4.6 + 6;
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('LES TEMPS FORTS DE LA JOURNÉE :', margin + colWidth + 8, highlightY);
    highlightY += 5.5;

    const progSection = gazette.sections.find((s) => s.type === 'program');
    const progItems = (progSection?.content as ProgramSectionContent)?.items?.slice(0, 4);
    if (progItems && progItems.length > 0) {
      progItems.forEach((it) => {
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.text(`• ${it.time} —`, margin + colWidth + 8, highlightY);
        doc.setFont('times', 'normal');
        doc.text(it.title, margin + colWidth + 24, highlightY, { maxWidth: colWidth - 26 });
        highlightY += 5;
      });
    } else {
      const defaultHighlights = [
        { time: '14:30', title: 'Cérémonie Civile & Échange des Vœux' },
        { time: '16:30', title: 'Cocktail & Vin d’Honneur' },
        { time: '19:30', title: 'Le Dîner & Surprises des Témoins' },
        { time: '23:00', title: 'Ouverture du Bal & Soirée Dansante' },
      ];
      defaultHighlights.forEach((it) => {
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.text(`• ${it.time} —`, margin + colWidth + 8, highlightY);
        doc.setFont('times', 'normal');
        doc.text(it.title, margin + colWidth + 24, highlightY, { maxWidth: colWidth - 26 });
        highlightY += 5;
      });
    }

    drawFooter(1);

    // ==========================================
    // ── PAGE 2 : NOTRE HISTOIRE & MULTI-PHOTOS ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 2 — LES COULISSES DE NOTRE HISTOIRE', pageWidth / 2, margin + 4, {
      align: 'center',
    });
    doc.setLineWidth(0.4);
    doc.setDrawColor(30, 30, 30);
    doc.line(margin, margin + 7, margin + contentWidth, margin + 7);

    const storySection = gazette.sections.find((s) => s.type === 'story');
    const anecdoteSection = gazette.sections.find((s) => s.type === 'anecdote');

    let currentY = margin + 15;

    // Rendu photo de notre histoire (Page 2) si présente
    if (gazette.story_photo_path) {
      const storyImgBase64 = await resolveImageBase64(gazette.story_photo_path);
      if (storyImgBase64) {
        try {
          const imgH = 42;
          const format = storyImgBase64.includes('png') || storyImgBase64.includes('PNG') ? 'PNG' : 'JPEG';
          doc.addImage(storyImgBase64, format, margin, currentY, contentWidth, imgH, undefined, 'FAST');
          doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
          doc.setLineWidth(0.3);
          doc.rect(margin, currentY, contentWidth, imgH);

          // Légende délicate
          doc.setFillColor(255, 255, 255);
          doc.rect(margin, currentY + imgH - 6.5, contentWidth, 6.5, 'F');
          doc.setFont('times', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text('Le souvenir de notre première rencontre', pageWidth / 2, currentY + imgH - 2, { align: 'center' });

          currentY += imgH + 6;
        } catch (err) {
          console.warn('Erreur affichage story photo:', err);
        }
      }
    }

    if (storySection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
      doc.text(storySection.title.toUpperCase(), margin, currentY);
      currentY += 6;

      const storyContent = storySection.content as StorySectionContent;
      if (storyContent?.narrative) {
        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        const narrativeLines = doc.splitTextToSize(storyContent.narrative, contentWidth);
        doc.text(narrativeLines, margin, currentY);
        currentY += narrativeLines.length * 4.8 + 6;
      }

      if (storyContent?.timeline && storyContent.timeline.length > 0) {
        storyContent.timeline.forEach((item) => {
          doc.setFillColor(246, 243, 238);
          doc.rect(margin, currentY, contentWidth, 18, 'F');
          doc.setDrawColor(210, 205, 195);
          doc.setLineWidth(0.3);
          doc.rect(margin, currentY, contentWidth, 18);

          doc.setFont('times', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
          doc.text(`[${item.year_or_date}] ${item.title}`, margin + 4, currentY + 5.5);

          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const lines = doc.splitTextToSize(item.text, contentWidth - 8);
          doc.text(lines, margin + 4, currentY + 11.5);

          currentY += 22;
        });
      }
    }

    currentY += 4;
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 8;

    if (anecdoteSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
      doc.text(anecdoteSection.title.toUpperCase(), margin, currentY);
      currentY += 7;

      const anecdoteContent = anecdoteSection.content as AnecdoteSectionContent;
      if (anecdoteContent?.items) {
        anecdoteContent.items.forEach((item) => {
          doc.setFillColor(250, 248, 244);
          doc.setDrawColor(220, 215, 205);
          doc.setLineWidth(0.2);

          const lines = doc.splitTextToSize(`« ${item.content} »`, contentWidth - 12);
          const boxHeight = 12 + lines.length * 4.5;

          doc.rect(margin, currentY, contentWidth, boxHeight, 'F');
          doc.rect(margin, currentY, contentWidth, boxHeight);

          // Petite bande colorée sur la gauche avec la couleur d'accent du mariage
          doc.setFillColor(isVogue ? 20 : accentRgb[0], isVogue ? 20 : accentRgb[1], isVogue ? 20 : accentRgb[2]);
          doc.rect(margin, currentY, 2.5, boxHeight, 'F');

          doc.setFont('times', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 30, 30);
          doc.text(item.title, margin + 6, currentY + 5.5);

          doc.setFont('times', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(70, 70, 70);
          doc.text(lines, margin + 6, currentY + 11);

          currentY += boxHeight + 5;
        });
      }
    }

    drawFooter(2);

    // ==========================================
    // ── PAGE 3 : LE PROGRAMME & LES TÉMOINS ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 3 — LE DÉROULÉ OFFICIEL DU JOUR J', pageWidth / 2, margin + 4, {
      align: 'center',
    });
    doc.setLineWidth(0.4);
    doc.setDrawColor(30, 30, 30);
    doc.line(margin, margin + 7, margin + contentWidth, margin + 7);

    const programSection = gazette.sections.find((s) => s.type === 'program');
    const customSections = gazette.sections.filter((s) => s.type === 'custom');

    currentY = margin + 15;

    // Rendu photo des témoins (Page 3) si présente
    if (gazette.witnesses_photo_path) {
      const witImgBase64 = await resolveImageBase64(gazette.witnesses_photo_path);
      if (witImgBase64) {
        try {
          const imgH = 40;
          const format = witImgBase64.includes('png') || witImgBase64.includes('PNG') ? 'PNG' : 'JPEG';
          doc.addImage(witImgBase64, format, margin, currentY, contentWidth, imgH, undefined, 'FAST');
          doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
          doc.setLineWidth(0.3);
          doc.rect(margin, currentY, contentWidth, imgH);

          doc.setFillColor(255, 255, 255);
          doc.rect(margin, currentY + imgH - 6.5, contentWidth, 6.5, 'F');
          doc.setFont('times', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text('Nos précieux témoins & complices du grand jour', pageWidth / 2, currentY + imgH - 2, { align: 'center' });

          currentY += imgH + 6;
        } catch (err) {
          console.warn('Erreur affichage witnesses photo:', err);
        }
      }
    }

    if (programSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
      doc.text(programSection.title.toUpperCase(), margin, currentY);
      currentY += 8;

      const progContent = programSection.content as ProgramSectionContent;
      if (progContent?.items) {
        progContent.items.forEach((item) => {
          // Badge horaire stylé et aéré avec couleur d'accent
          doc.setFillColor(isVogue ? 20 : accentRgb[0], isVogue ? 20 : accentRgb[1], isVogue ? 20 : accentRgb[2]);
          doc.roundedRect(margin, currentY - 4, 18, 7.5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(item.time, margin + 9, currentY + 1, { align: 'center' });

          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(20, 20, 20);
          doc.text(item.title, margin + 23, currentY);
          currentY += 5;

          if (item.description || item.location) {
            doc.setFont('times', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const sub = [item.location ? `Lieu : ${item.location}` : '', item.description]
              .filter(Boolean)
              .join(' — ');
            const subLines = doc.splitTextToSize(sub, contentWidth - 23);
            doc.text(subLines, margin + 23, currentY);
            currentY += subLines.length * 4.3;
          }

          // Ligne séparatrice subtile
          doc.setDrawColor(230, 225, 220);
          doc.setLineWidth(0.2);
          doc.line(margin + 23, currentY + 3, margin + contentWidth, currentY + 3);

          currentY += 8.5;
        });
      }
    }

    currentY += 4;
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 8;

    if (customSections.length > 0) {
      const firstCustom = customSections[0];
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
      doc.text(firstCustom.title.toUpperCase(), margin, currentY);
      currentY += 6;

      const customContent = firstCustom.content as CustomSectionContent;

      doc.setFillColor(250, 248, 244);
      doc.rect(margin, currentY, contentWidth, 48, 'F');
      doc.setDrawColor(215, 210, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY, contentWidth, 48);

      if (customContent?.subtitle) {
        doc.setFont('times', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(isVogue ? 20 : accentRgb[0], isVogue ? 20 : accentRgb[1], isVogue ? 20 : accentRgb[2]);
        doc.text(customContent.subtitle, margin + 5, currentY + 7);
      }

      if (customContent?.body) {
        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(customContent.body, contentWidth - 10);
        doc.text(lines, margin + 5, currentY + 15);
      }

      if (customContent?.signature) {
        doc.setFont('times', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);
        doc.text(`— ${customContent.signature}`, margin + contentWidth - 5, currentY + 42, { align: 'right' });
      }
    }

    drawFooter(3);

    // ==========================================
    // ── PAGE 4 : LE GRAND QUIZ & JEUX ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 4 — LE GRAND JEU-CONCOURS & REMERCIEMENTS', pageWidth / 2, margin + 4, {
      align: 'center',
    });
    doc.setLineWidth(0.4);
    doc.setDrawColor(30, 30, 30);
    doc.line(margin, margin + 7, margin + contentWidth, margin + 7);

    const quizSection = gazette.sections.find((s) => s.type === 'quiz');
    currentY = margin + 15;

    if (quizSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
      doc.text(quizSection.title.toUpperCase(), margin, currentY);
      currentY += 8;

      const quizContent = quizSection.content as QuizSectionContent;
      if (quizContent?.questions) {
        quizContent.questions.slice(0, 4).forEach((q, qIndex) => {
          doc.setFont('times', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(20, 20, 20);
          doc.text(`${qIndex + 1}. ${q.question}`, margin, currentY);
          currentY += 5.5;

          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          q.options.forEach((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex);
            doc.text(`   [  ] ${letter}. ${opt}`, margin + 4, currentY);
            currentY += 4.8;
          });
          currentY += 4;
        });
      }
    }

    // Remerciements & QR Code : Grand cadre bien proportionné
    currentY += 4;
    const thanksBoxHeight = 44;
    doc.setFillColor(246, 243, 238);
    doc.rect(margin, currentY, contentWidth, thanksBoxHeight, 'F');
    doc.setDrawColor(210, 205, 195);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY, contentWidth, thanksBoxHeight);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isVogue ? 15 : accentRgb[0], isVogue ? 15 : accentRgb[1], isVogue ? 15 : accentRgb[2]);
    doc.text('UN IMMENSE MERCI', margin + 6, currentY + 8);

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const thanksText =
      'Votre présence à nos côtés fait de cette journée un rêve éveillé. Merci pour vos sourires, votre énergie et votre bienveillance.\n\n— Avec tout notre amour, les mariés.';
    doc.text(doc.splitTextToSize(thanksText, contentWidth - 48), margin + 6, currentY + 16);

    // QR Code dynamique avec destination choisie
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
      const targetUrl =
        gazette.qr_code_target === 'photos'
          ? `${origin}/espace-client/photos`
          : gazette.qr_code_target === 'honeymoon'
          ? `${origin}/espace-client/cagnotte`
          : `${origin}/espace-client/livre-d-or`;

      const targetLabel =
        gazette.qr_code_target === 'photos'
          ? 'Photos des invités'
          : gazette.qr_code_target === 'honeymoon'
          ? 'Voyage de Noces'
          : 'Livre d’or & Vœux';

      const qrDataUrl = await QRCode.toDataURL(targetUrl);
      doc.addImage(qrDataUrl, 'PNG', margin + contentWidth - 36, currentY + 4, 30, 30);
      doc.setFont('times', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      doc.text(targetLabel, margin + contentWidth - 21, currentY + 38, { align: 'center' });
    } catch {
      // Ignorer si QR code non disponible
    }

    // Solutions renversées
    const solutionsY = currentY + thanksBoxHeight + 8;
    const solutionsHeight = 15;
    doc.setFillColor(240, 237, 232);
    doc.rect(margin, solutionsY, contentWidth, solutionsHeight, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(margin, solutionsY, contentWidth, solutionsHeight);

    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text('SOLUTIONS DU QUIZ (À NE LIRE QU’À LA FIN DU REPAS !) :', margin + 4, solutionsY + 5);

    if (quizSection) {
      const quizContent = quizSection.content as QuizSectionContent;
      const solutionsText = (quizContent?.questions || [])
        .slice(0, 4)
        .map((q, idx) => `Q${idx + 1}: ${String.fromCharCode(65 + q.answer_index)} (${q.options[q.answer_index]})`)
        .join('  •  ');

      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text(solutionsText, margin + 4, solutionsY + 10.5, { maxWidth: contentWidth - 8 });
    }

    drawFooter(4);

    // Sauvegarde automatique du PDF avec nom propre
    const cleanTitle = (gazette.title || 'Gazette_des_maries').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${cleanTitle}_A4_Printable.pdf`);
  }
}
