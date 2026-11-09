import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type {
  Gazette,
  GazetteSection,
  StorySectionContent,
  AnecdoteSectionContent,
  QuizSectionContent,
  ProgramSectionContent,
  CustomSectionContent,
} from '../domain/types';

export class GazettePdfService {
  /**
   * Génère la Gazette des Mariés complète au format PDF A4 (4 pages imprimables style journal).
   */
  static async generatePrintableGazette(gazette: Gazette): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const margin = 16;
    const contentWidth = pageWidth - margin * 2; // 178 mm

    // Helper pour dessiner le style de fond selon le thème
    const applyPageBackground = () => {
      if (gazette.layout.theme === 'vintage_gazette') {
        doc.setFillColor(252, 249, 242); // Teinte papier journal sépia très doux
      } else if (gazette.layout.theme === 'romantic_rose') {
        doc.setFillColor(255, 248, 249); // Teinte poudrée
      } else {
        doc.setFillColor(255, 255, 255); // Chic blanc pur
      }
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Double cadre presse sur le pourtour
      doc.setDrawColor(40, 40, 40);
      doc.setLineWidth(0.6);
      doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - margin * 2 + 8);
      doc.setLineWidth(0.2);
      doc.rect(margin - 2.5, margin - 2.5, contentWidth + 5, pageHeight - margin * 2 + 5);
    };

    // Helper pour pied de page journal
    const drawFooter = (pageNum: number) => {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `${gazette.title || 'La Gazette des Mariés'} — Page ${pageNum} sur 4`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.text('Le Oui Parfait', margin + contentWidth, pageHeight - 8, { align: 'right' });
    };

    // ==========================================
    // ── PAGE 1 : LA UNE DU JOURNAL ──
    // ==========================================
    applyPageBackground();

    // 1. Bandeau supérieur (Header presse)
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const topBar = 'ÉDITION SPÉCIALE • TIRAGE UNIQUE POUR LES INVITÉS • PRIX : GRATUIT • HORS SÉRIE DU MARIAGE';
    doc.text(topBar, pageWidth / 2, margin + 2, { align: 'center' });

    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.line(margin, margin + 4, margin + contentWidth, margin + 4);

    // 2. Titre principal (Masthead)
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(20, 20, 20);
    const mastheadTitle = (gazette.title || 'LA GAZETTE DES MARIÉS').toUpperCase();
    doc.text(mastheadTitle, pageWidth / 2, margin + 16, { align: 'center' });

    // 3. Sous-titre et date
    doc.setLineWidth(0.4);
    doc.line(margin, margin + 20, margin + contentWidth, margin + 20);

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const formattedDate = gazette.wedding_date
      ? new Date(gazette.wedding_date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Jour de célébration';
    const locText = gazette.location_name ? ` • ${gazette.location_name}` : '';
    doc.text(`${formattedDate}${locText} • N° 1 DE L’AMOUR`, pageWidth / 2, margin + 24, {
      align: 'center',
    });

    doc.setLineWidth(0.8);
    doc.line(margin, margin + 26, margin + contentWidth, margin + 26);

    // 4. Gros titre (Headline)
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(190, 18, 60); // Accent rose/bordeaux journal
    const headline = gazette.subtitle || 'ILS SE SONT DIT OUI !';
    doc.text(headline, pageWidth / 2, margin + 35, { align: 'center' });

    // 5. Cadre photo ou illustration centrale
    const photoBoxY = margin + 40;
    const photoBoxHeight = 85;
    doc.setFillColor(245, 240, 235);
    doc.rect(margin, photoBoxY, contentWidth, photoBoxHeight, 'F');
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.rect(margin, photoBoxY, contentWidth, photoBoxHeight);

    // Texte indicatif au centre de la photo
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(110, 110, 110);
    doc.text(
      gazette.cover_caption || '« Le commencement d’une vie à deux pleine de promesses et d’aventures »',
      pageWidth / 2,
      photoBoxY + photoBoxHeight / 2,
      { align: 'center', maxWidth: contentWidth - 20 }
    );

    // 6. Bas de Page 1 : 2 colonnes (Météo & Édito des mariés)
    const colY = photoBoxY + photoBoxHeight + 8;
    const colWidth = (contentWidth - 8) / 2;

    // Colonne Gauche : Météo du Bonheur
    doc.setFillColor(248, 244, 238);
    doc.rect(margin, colY, colWidth, 75, 'F');
    doc.setDrawColor(180, 170, 160);
    doc.rect(margin, colY, colWidth, 75);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('☀ LA MÉTÉO DE L’AMOUR', margin + 6, colY + 8);
    doc.setLineWidth(0.3);
    doc.line(margin + 6, colY + 11, margin + colWidth - 6, colY + 11);

    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const weather =
      gazette.weather_forecast ||
      'Température : 32°C de bonheur absolu.\nIndice UV : Rayonnement intense des sourires.\nPrécipitations : Fortes averses de confettis et larmes de joie à prévoir pendant les vœux.';
    doc.text(doc.splitTextToSize(weather, colWidth - 12), margin + 6, colY + 18);

    // Colonne Droite : Édito / Mot des mariés
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('ÉDITORIAL : LE MOT DES MARIÉS', margin + colWidth + 8, colY + 8);
    doc.setLineWidth(0.3);
    doc.line(margin + colWidth + 8, colY + 11, margin + contentWidth, colY + 11);

    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const editorial =
      gazette.editorial ||
      'Chers invités, soyez les bienvenus dans notre gazette exclusive ! Nous avons concocté ces pages pour vous accompagner tout au long de cette journée magique. Riez, découvrez nos anecdotes et surtout célébrez avec nous !';
    doc.text(doc.splitTextToSize(editorial, colWidth - 4), margin + colWidth + 8, colY + 18);

    drawFooter(1);

    // ==========================================
    // ── PAGE 2 : NOTRE HISTOIRE & ANECDOTES ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    // En-tête Page 2
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 2 — LES COULISSES DE NOTRE HISTOIRE', pageWidth / 2, margin + 5, {
      align: 'center',
    });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 8, margin + contentWidth, margin + 8);

    // Trouver la section story et anecdote
    const storySection = gazette.sections.find((s) => s.type === 'story');
    const anecdoteSection = gazette.sections.find((s) => s.type === 'anecdote');

    let currentY = margin + 16;

    if (storySection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60);
      doc.text(storySection.title.toUpperCase(), margin, currentY);
      currentY += 6;

      const storyContent = storySection.content as StorySectionContent;
      if (storyContent?.narrative) {
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const narrativeLines = doc.splitTextToSize(storyContent.narrative, contentWidth);
        doc.text(narrativeLines, margin, currentY);
        currentY += narrativeLines.length * 4.8 + 6;
      }

      if (storyContent?.timeline && storyContent.timeline.length > 0) {
        storyContent.timeline.forEach((item) => {
          doc.setFillColor(242, 238, 230);
          doc.rect(margin, currentY, contentWidth, 14, 'F');
          doc.setDrawColor(200, 190, 180);
          doc.rect(margin, currentY, contentWidth, 14);

          doc.setFont('times', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(190, 18, 60);
          doc.text(`[${item.year_or_date}] ${item.title}`, margin + 4, currentY + 5);

          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(item.text, margin + 4, currentY + 10, { maxWidth: contentWidth - 8 });

          currentY += 17;
        });
      }
    }

    currentY += 4;
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 8;

    if (anecdoteSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60);
      doc.text(anecdoteSection.title.toUpperCase(), margin, currentY);
      currentY += 6;

      const anecdoteContent = anecdoteSection.content as AnecdoteSectionContent;
      if (anecdoteContent?.items) {
        anecdoteContent.items.forEach((item) => {
          doc.setFont('times', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          doc.text(`• ${item.title}`, margin + 2, currentY);
          currentY += 5;

          doc.setFont('times', 'italic');
          doc.setFontSize(9.5);
          doc.setTextColor(70, 70, 70);
          const lines = doc.splitTextToSize(item.content, contentWidth - 8);
          doc.text(lines, margin + 6, currentY);
          currentY += lines.length * 4.5 + 4;
        });
      }
    }

    drawFooter(2);

    // ==========================================
    // ── PAGE 3 : LE PROGRAMME OFFICIEL & INVITES ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 3 — LE DÉROULÉ OFFICIEL & INFOS DU JOUR J', pageWidth / 2, margin + 5, {
      align: 'center',
    });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 8, margin + contentWidth, margin + 8);

    const programSection = gazette.sections.find((s) => s.type === 'program');
    const customSections = gazette.sections.filter((s) => s.type === 'custom');

    currentY = margin + 16;

    if (programSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60);
      doc.text(programSection.title.toUpperCase(), margin, currentY);
      currentY += 8;

      const progContent = programSection.content as ProgramSectionContent;
      if (progContent?.items) {
        progContent.items.forEach((item) => {
          // Badge horaire
          doc.setFillColor(190, 18, 60);
          doc.roundedRect(margin, currentY - 4, 18, 7, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(item.time, margin + 9, currentY + 0.5, { align: 'center' });

          // Titre du moment
          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(20, 20, 20);
          doc.text(item.title, margin + 22, currentY);

          currentY += 5;

          // Détail & Lieu
          if (item.description || item.location) {
            doc.setFont('times', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            const sub = [item.location ? `Lieu : ${item.location}` : '', item.description]
              .filter(Boolean)
              .join(' — ');
            const subLines = doc.splitTextToSize(sub, contentWidth - 22);
            doc.text(subLines, margin + 22, currentY);
            currentY += subLines.length * 4.2;
          }

          currentY += 4;
        });
      }
    }

    currentY += 4;
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 8;

    // Sections complémentaires (mots des témoins, logistique)
    if (customSections.length > 0) {
      const firstCustom = customSections[0];
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60);
      doc.text(firstCustom.title.toUpperCase(), margin, currentY);
      currentY += 6;

      const customContent = firstCustom.content as CustomSectionContent;
      if (customContent?.subtitle) {
        doc.setFont('times', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(90, 90, 90);
        doc.text(customContent.subtitle, margin, currentY);
        currentY += 5;
      }

      if (customContent?.body) {
        doc.setFont('times', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(customContent.body, contentWidth);
        doc.text(lines, margin, currentY);
        currentY += lines.length * 4.5 + 4;
      }
    }

    drawFooter(3);

    // ==========================================
    // ── PAGE 4 : LE GRAND QUIZ & REMERCIEMENTS ──
    // ==========================================
    doc.addPage();
    applyPageBackground();

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('PAGE 4 — LE GRAND JEU-CONCOURS & REMERCIEMENTS', pageWidth / 2, margin + 5, {
      align: 'center',
    });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 8, margin + contentWidth, margin + 8);

    const quizSection = gazette.sections.find((s) => s.type === 'quiz');
    currentY = margin + 16;

    if (quizSection) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(190, 18, 60);
      doc.text(quizSection.title.toUpperCase(), margin, currentY);
      currentY += 7;

      const quizContent = quizSection.content as QuizSectionContent;
      if (quizContent?.questions) {
        quizContent.questions.slice(0, 4).forEach((q, qIndex) => {
          doc.setFont('times', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(20, 20, 20);
          doc.text(`${qIndex + 1}. ${q.question}`, margin, currentY);
          currentY += 5;

          doc.setFont('times', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          q.options.forEach((opt, optIndex) => {
            const letter = String.fromCharCode(65 + optIndex);
            doc.text(`   [  ] ${letter}. ${opt}`, margin + 4, currentY);
            currentY += 4.5;
          });
          currentY += 2;
        });
      }
    }

    // Remerciements & QR Code
    currentY += 4;
    doc.setFillColor(245, 240, 235);
    doc.rect(margin, currentY, contentWidth, 42, 'F');
    doc.setDrawColor(200, 190, 180);
    doc.rect(margin, currentY, contentWidth, 42);

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(190, 18, 60);
    doc.text('UN IMMENSE MERCI', margin + 6, currentY + 8);

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const thanksText =
      'Votre présence à nos côtés fait de cette journée un rêve éveillé. Merci pour vos sourires, votre énergie et votre bienveillance.\n\n— Avec tout notre amour, les mariés.';
    doc.text(doc.splitTextToSize(thanksText, contentWidth - 45), margin + 6, currentY + 15);

    // Générer un mini QR Code vers le site du mariage ou livre d'or
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leoui.net';
      const qrDataUrl = await QRCode.toDataURL(`${origin}/mariage`);
      doc.addImage(qrDataUrl, 'PNG', margin + contentWidth - 34, currentY + 5, 30, 30);
      doc.setFont('times', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Scannez-moi !', margin + contentWidth - 19, currentY + 38, { align: 'center' });
    } catch {
      // Ignorer si QR code non généré
    }

    // Encadré des solutions du Quiz imprimées en bas (comme dans les vrais journaux)
    const solutionsY = currentY + 48;
    doc.setFillColor(238, 235, 230);
    doc.rect(margin, solutionsY, contentWidth, 14, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, solutionsY, contentWidth, 14);

    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('SOLUTIONS DU QUIZ (À NE LIRE QU’À LA FIN DU REPAS !) :', margin + 4, solutionsY + 4.5);

    if (quizSection) {
      const quizContent = quizSection.content as QuizSectionContent;
      const solutionsText = (quizContent?.questions || [])
        .slice(0, 4)
        .map((q, idx) => `Q${idx + 1}: ${String.fromCharCode(65 + q.answer_index)} (${q.options[q.answer_index]})`)
        .join('  •  ');

      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(solutionsText, margin + 4, solutionsY + 9.5, { maxWidth: contentWidth - 8 });
    }

    drawFooter(4);

    // Téléchargement du fichier
    const cleanTitle = (gazette.title || 'Gazette_des_maries').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${cleanTitle}_A4_Printable.pdf`);
  }
}
