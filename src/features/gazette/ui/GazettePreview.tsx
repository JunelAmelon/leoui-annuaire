'use client';

import { useState } from 'react';
import {
  Gazette,
  GazetteSection,
  StorySectionContent,
  AnecdoteSectionContent,
  QuizSectionContent,
  ProgramSectionContent,
  CustomSectionContent,
} from '../domain/types';
import {
  Sparkles,
  Sun,
  Calendar,
  Clock,
  MapPin,
  HelpCircle,
  Heart,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Award,
  CheckCircle2,
} from 'lucide-react';

interface GazettePreviewProps {
  gazette: Gazette;
  onEditSection?: (section: GazetteSection) => void;
  onEditMetadata?: () => void;
}

export function GazettePreview({
  gazette,
  onEditSection,
  onEditMetadata,
}: GazettePreviewProps) {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, number>>({});
  const [showSolutions, setShowSolutions] = useState(false);

  // Thème styles
  const isVintage = gazette.layout.theme === 'vintage_gazette';
  const isRomantic = gazette.layout.theme === 'romantic_rose';

  const themeClasses = isVintage
    ? 'bg-[#faf7f0] text-[#1c1917] font-serif shadow-amber-900/10'
    : isRomantic
    ? 'bg-[#fffbfa] text-slate-800 font-serif shadow-rose-900/10'
    : 'bg-white text-slate-900 font-sans shadow-slate-900/10';

  const accentColor = gazette.layout.accent_color || '#be123c';

  const storySection = gazette.sections.find((s) => s.type === 'story');
  const anecdoteSection = gazette.sections.find((s) => s.type === 'anecdote');
  const programSection = gazette.sections.find((s) => s.type === 'program');
  const quizSection = gazette.sections.find((s) => s.type === 'quiz');
  const customSections = gazette.sections.filter((s) => s.type === 'custom');

  const formattedDate = gazette.wedding_date
    ? new Date(gazette.wedding_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Jour de Célébration';

  return (
    <div className="flex flex-col items-center">
      {/* Barre de navigation des pages du journal */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-4 bg-white/90 backdrop-blur-sm border border-stone-200/80 rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-stone-600" />
          <span className="text-sm font-medium text-stone-700">
            Aperçu Journal de Mariage (4 pages A4)
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          {([1, 2, 3, 4] as const).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => setCurrentPage(pageNum)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentPage === pageNum
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Page {pageNum} {pageNum === 1 ? '(Une)' : pageNum === 4 ? '(Quiz)' : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => (p > 1 ? ((p - 1) as any) : p))}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-stone-600 min-w-[50px] text-center">
            {currentPage} / 4
          </span>
          <button
            type="button"
            disabled={currentPage === 4}
            onClick={() => setCurrentPage((p) => (p < 4 ? ((p + 1) as any) : p))}
            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEUILLE JOURNAL A4 RÉALISTE */}
      <div
        className={`w-full max-w-4xl min-h-[1050px] p-8 md:p-12 border-2 border-stone-300 rounded-lg shadow-2xl relative transition-all ${themeClasses}`}
      >
        {/* Double cadre d'imprimerie presse */}
        <div className="border border-stone-800/40 p-1 h-full min-h-[980px]">
          <div className="border-2 border-stone-800/80 p-6 md:p-8 h-full flex flex-col justify-between">
            {/* ==================================================== */}
            {/* PAGE 1 : LA UNE DU JOURNAL */}
            {/* ==================================================== */}
            {currentPage === 1 && (
              <div className="space-y-6">
                {/* Header presse vintage */}
                <div className="border-b-2 border-stone-900 pb-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-stone-600 font-sans border-b border-stone-400 pb-1 mb-2">
                    <span>Édition Spéciale Amour</span>
                    <span className="font-bold">Tirage Unique & Gratuit</span>
                    <span>Hors-série N° 1</span>
                  </div>

                  <h1
                    className="text-4xl md:text-5xl font-black text-center tracking-tight uppercase my-3 cursor-pointer hover:opacity-85 transition"
                    onClick={onEditMetadata}
                    title="Cliquez pour modifier le titre"
                  >
                    {gazette.title || 'La Gazette des Mariés'}
                  </h1>

                  <div className="flex items-center justify-between text-xs text-stone-700 italic border-t border-stone-300 pt-1.5">
                    <span>{formattedDate}</span>
                    <span>
                      {gazette.location_name
                        ? `En direct de ${gazette.location_name}`
                        : 'Événement exceptionnel'}
                    </span>
                    <span className="font-semibold text-rose-700">Édition des Mariés</span>
                  </div>
                </div>

                {/* Gros titre à sensation */}
                <div
                  className="text-center py-2 cursor-pointer group"
                  onClick={onEditMetadata}
                >
                  <p
                    className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase"
                    style={{ color: accentColor }}
                  >
                    {gazette.subtitle || 'ILS SE SONT DIT OUI !'}
                  </p>
                  <p className="text-xs text-stone-500 italic mt-1 group-hover:text-stone-800">
                    (Cliquez sur la manchette pour modifier)
                  </p>
                </div>

                {/* Cadre photo de Une */}
                <div className="relative border-2 border-stone-800 p-2 bg-stone-100/50">
                  <div className="w-full h-64 md:h-72 bg-gradient-to-tr from-stone-200 to-stone-100 flex flex-col items-center justify-center text-center p-6 border border-stone-300">
                    {gazette.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={gazette.cover_path}
                        alt="Photo de couverture"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Heart className="w-12 h-12 text-rose-400 animate-pulse" />
                        <span className="font-serif italic text-lg text-stone-600">
                          Photo exclusive des mariés
                        </span>
                        <span className="text-xs text-stone-400 font-sans">
                          (Ajoutez votre photo dans les paramètres de la gazette)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-center text-xs italic text-stone-600 mt-2 font-serif">
                    {gazette.cover_caption ||
                      '« Le commencement d’une vie à deux pleine de promesses, de complicité et de bonheur »'}
                  </div>
                </div>

                {/* Bas de page : Météo du cœur & Édito à 2 colonnes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-300">
                  {/* Colonne gauche : Météo */}
                  <div className="border border-stone-300 bg-amber-50/40 p-4 rounded-sm">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-stone-300">
                      <Sun className="w-4 h-4 text-amber-600" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800">
                        La Météo de l’Amour
                      </h3>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed italic">
                      {gazette.weather_forecast ||
                        'Température : 32°C d’amour. Baromètre au beau fixe. Fortes averses de confettis et larmes d’émotion prévues pendant les vœux.'}
                    </p>
                  </div>

                  {/* Colonne droite : Éditorial des mariés */}
                  <div className="p-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800 mb-2 pb-1 border-b border-stone-300 flex items-center justify-between">
                      <span>Éditorial : Le mot des mariés</span>
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    </h3>
                    <p className="text-xs text-stone-700 leading-relaxed first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-rose-700">
                      {gazette.editorial ||
                        'Chers invités, bienvenue dans les coulisses de notre mariage ! Nous avons imaginé cette gazette pour partager nos anecdotes, tester vos connaissances et vous remercier du fond du cœur. Profitez de chaque seconde !'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* PAGE 2 : NOTRE HISTOIRE & ANECDOTES */}
            {/* ==================================================== */}
            {currentPage === 2 && (
              <div className="space-y-6">
                <div className="text-center border-b-2 border-stone-900 pb-2">
                  <span className="text-[10px] uppercase font-sans tracking-widest text-stone-500">
                    Page 2 — Rubrique Romance & Coulisses
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase mt-1">
                    Notre Histoire & Petits Secrets
                  </h2>
                </div>

                {storySection && (
                  <div
                    className="p-4 border border-stone-300/80 bg-stone-50/50 cursor-pointer hover:border-stone-400 transition"
                    onClick={() => onEditSection?.(storySection)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className="text-base font-bold uppercase tracking-tight"
                        style={{ color: accentColor }}
                      >
                        {storySection.title}
                      </h3>
                      <span className="text-[10px] text-stone-400 font-sans">
                        Cliquez pour modifier
                      </span>
                    </div>

                    {/* Récit narratif */}
                    <p className="text-xs text-stone-700 leading-relaxed mb-4 first-letter:text-2xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 first-letter:text-stone-900">
                      {(storySection.content as StorySectionContent)?.narrative}
                    </p>

                    {/* Frise chronologique */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-stone-200">
                      {(storySection.content as StorySectionContent)?.timeline?.map(
                        (step, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-stone-200 rounded-sm shadow-2xs"
                          >
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                              {step.year_or_date}
                            </span>
                            <h4 className="font-bold text-xs text-stone-800 mt-1.5">
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                              {step.text}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Anecdotes croustillantes */}
                {anecdoteSection && (
                  <div
                    className="p-4 border border-stone-300/80 bg-white cursor-pointer hover:border-stone-400 transition"
                    onClick={() => onEditSection?.(anecdoteSection)}
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-1.5">
                      <h3
                        className="text-base font-bold uppercase tracking-tight"
                        style={{ color: accentColor }}
                      >
                        {anecdoteSection.title}
                      </h3>
                      <span className="text-[10px] text-stone-400 font-sans">
                        Cliquez pour modifier
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(anecdoteSection.content as AnecdoteSectionContent)?.items?.map(
                        (item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-amber-50/30 border border-amber-200/60 rounded-sm"
                          >
                            <span className="text-xs font-bold text-stone-900 block mb-1">
                              • {item.title}
                            </span>
                            <p className="text-xs text-stone-600 italic leading-relaxed">
                              « {item.content} »
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* PAGE 3 : LE PROGRAMME OFFICIEL & INVITES */}
            {/* ==================================================== */}
            {currentPage === 3 && (
              <div className="space-y-6">
                <div className="text-center border-b-2 border-stone-900 pb-2">
                  <span className="text-[10px] uppercase font-sans tracking-widest text-stone-500">
                    Page 3 — Organisation & festivités
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase mt-1">
                    Le Déroulé Officiel du Jour J
                  </h2>
                </div>

                {programSection && (
                  <div
                    className="p-4 border border-stone-300/80 bg-white cursor-pointer hover:border-stone-400 transition"
                    onClick={() => onEditSection?.(programSection)}
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-stone-200 pb-2">
                      <div>
                        <h3
                          className="text-base font-bold uppercase tracking-tight"
                          style={{ color: accentColor }}
                        >
                          {programSection.title}
                        </h3>
                        <span className="text-[11px] text-stone-500 italic">
                          {gazette.program_source === 'plan'
                            ? 'Synchronisé depuis le planning du mariage'
                            : 'Programme personnalisé'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-sans">
                        Cliquez pour modifier
                      </span>
                    </div>

                    {/* Timeline des événements */}
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-stone-200">
                      {(programSection.content as ProgramSectionContent)?.items?.map(
                        (item, idx) => (
                          <div key={idx} className="relative flex items-start gap-4 pl-8">
                            <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-rose-600 shadow-sm" />
                            <div className="flex-1 bg-stone-50 border border-stone-200/80 p-3 rounded-sm">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {item.time}
                                </span>
                                <h4 className="font-bold text-xs text-stone-900 flex-1 ml-2">
                                  {item.title}
                                </h4>
                                {item.location && (
                                  <span className="text-[11px] text-stone-500 flex items-center gap-1 font-sans">
                                    <MapPin className="w-3 h-3 text-stone-400" />
                                    {item.location}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-stone-600 mt-1 italic pl-1 border-l border-stone-300">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Section sur mesure / Mots des témoins */}
                {customSections.length > 0 && (
                  <div
                    className="p-4 border border-stone-300/80 bg-stone-50/40 cursor-pointer hover:border-stone-400 transition"
                    onClick={() => onEditSection?.(customSections[0])}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className="text-base font-bold uppercase tracking-tight"
                        style={{ color: accentColor }}
                      >
                        {customSections[0].title}
                      </h3>
                      <span className="text-[10px] text-stone-400 font-sans">
                        Cliquez pour modifier
                      </span>
                    </div>

                    {customSections[0].content && (
                      <div>
                        {(customSections[0].content as CustomSectionContent)?.subtitle && (
                          <p className="text-xs italic text-stone-500 mb-2">
                            {(customSections[0].content as CustomSectionContent).subtitle}
                          </p>
                        )}
                        <p className="text-xs text-stone-700 leading-relaxed">
                          {(customSections[0].content as CustomSectionContent).body}
                        </p>
                        {(customSections[0].content as CustomSectionContent)?.signature && (
                          <p className="text-xs font-bold text-right text-stone-800 mt-2 italic">
                            — {(customSections[0].content as CustomSectionContent).signature}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* PAGE 4 : LE GRAND QUIZ & REMERCIEMENTS */}
            {/* ==================================================== */}
            {currentPage === 4 && (
              <div className="space-y-6">
                <div className="text-center border-b-2 border-stone-900 pb-2">
                  <span className="text-[10px] uppercase font-sans tracking-widest text-stone-500">
                    Page 4 — Détente, Jeux & Clôture
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase mt-1">
                    Le Grand Quiz des Invités
                  </h2>
                </div>

                {quizSection && (
                  <div className="p-4 border border-stone-300/80 bg-white">
                    <div className="flex items-center justify-between mb-3 border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                        <h3
                          className="text-base font-bold uppercase tracking-tight"
                          style={{ color: accentColor }}
                        >
                          {quizSection.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEditSection?.(quizSection)}
                        className="text-xs text-rose-600 hover:underline font-sans"
                      >
                        Modifier les questions
                      </button>
                    </div>

                    {/* Grille des questions interactives */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(quizSection.content as QuizSectionContent)?.questions?.map(
                        (q, qIdx) => {
                          const chosen = userQuizAnswers[qIdx];
                          const isCorrect = chosen === q.answer_index;
                          return (
                            <div
                              key={qIdx}
                              className="p-3 bg-stone-50 border border-stone-200 rounded-sm"
                            >
                              <span className="font-bold text-xs text-stone-900 block mb-2">
                                {qIdx + 1}. {q.question}
                              </span>

                              <div className="space-y-1.5">
                                {q.options.map((opt, optIdx) => {
                                  const isSelected = chosen === optIdx;
                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() =>
                                        setUserQuizAnswers((prev) => ({
                                          ...prev,
                                          [qIdx]: optIdx,
                                        }))
                                      }
                                      className={`w-full text-left text-xs px-2.5 py-1.5 rounded transition flex items-center justify-between border ${
                                        isSelected
                                          ? showSolutions
                                            ? isCorrect
                                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold'
                                              : 'bg-rose-50 border-rose-400 text-rose-900'
                                            : 'bg-stone-200 border-stone-400 font-semibold'
                                          : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                                      }`}
                                    >
                                      <span>
                                        <strong className="mr-1.5">
                                          {String.fromCharCode(65 + optIdx)}.
                                        </strong>
                                        {opt}
                                      </span>
                                      {showSolutions && optIdx === q.answer_index && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Bouton révéler les solutions */}
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={() => setShowSolutions(!showSolutions)}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
                      >
                        {showSolutions
                          ? 'Masquer le corrigé'
                          : 'Vérifier mes réponses'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remerciements finaux des mariés */}
                <div className="p-4 border-2 border-stone-800 bg-amber-50/30 text-center space-y-2">
                  <Heart className="w-5 h-5 text-rose-600 mx-auto" />
                  <h4 className="font-bold text-sm uppercase tracking-wide">
                    Un Immense Merci de Sophie & Thomas
                  </h4>
                  <p className="text-xs text-stone-700 max-w-xl mx-auto italic leading-relaxed">
                    « Merci d’avoir partagé avec nous ce chapitre inestimable de notre vie. Vos sourires, votre amour et votre présence resteront à jamais notre plus beau souvenir. »
                  </p>
                </div>

                {/* Solutions inversées imprimées style journal */}
                <div className="border border-stone-300 p-2 bg-stone-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-500 block">
                    Corrigé officiel de la rédaction :
                  </span>
                  <div className="text-[10px] text-stone-600 italic">
                    {(quizSection?.content as QuizSectionContent)?.questions
                      ?.map(
                        (q, idx) =>
                          `Q${idx + 1} : ${String.fromCharCode(65 + q.answer_index)}`
                      )
                      .join('  •  ')}
                  </div>
                </div>
              </div>
            )}

            {/* Pied de page du journal */}
            <div className="border-t border-stone-300 pt-3 mt-8 flex items-center justify-between text-[11px] text-stone-500 font-sans">
              <span>{gazette.title || 'La Gazette des Mariés'}</span>
              <span className="font-bold">Page {currentPage} sur 4</span>
              <span>Le Oui Parfait · Tous droits réservés</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

