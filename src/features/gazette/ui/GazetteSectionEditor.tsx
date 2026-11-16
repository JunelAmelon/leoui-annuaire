'use client';

import { useState } from 'react';
import {
  GazetteSection,
  GazetteSectionType,
  StorySectionContent,
  AnecdoteSectionContent,
  QuizSectionContent,
  ProgramSectionContent,
  CustomSectionContent,
  SectionContent,
} from '../domain/types';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { SplitModal, modalField, modalGhostBtn, modalLabel, modalPrimaryBtn } from '@/components/ui/SplitModal';

const SECTION_KICKERS: Record<string, string> = { story: 'Histoire', anecdote: 'Confidences', quiz: 'Quiz', program: 'Programme', custom: 'Tribune' };
const SECTION_IMAGES: Record<string, string> = { story: '/mariage (2).jpg', anecdote: '/mariage (3).jpg', quiz: '/mariage (1).jpg', program: '/jour-j-cover.jpg', custom: '/mariage (5).jpg' };

interface GazetteSectionEditorProps {
  section: GazetteSection;
  onSave: (updatedSection: GazetteSection) => void;
  onClose: () => void;
}

export function GazetteSectionEditor({
  section,
  onSave,
  onClose,
}: GazetteSectionEditorProps) {
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState<SectionContent>(
    JSON.parse(JSON.stringify(section.content || {}))
  );

  const handleSave = () => {
    onSave({
      ...section,
      title: title.trim() || 'Rubrique sans titre',
      content,
    });
  };

  return (
    <SplitModal image={SECTION_IMAGES[section.type] ?? '/mariage (4).jpg'} kicker={SECTION_KICKERS[section.type] ?? 'Rubrique'} title="Modifier la rubrique"
      caption={title} widthClass="sm:max-w-4xl" onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${modalGhostBtn} ml-auto`}>Annuler</button>
          <button type="button" onClick={handleSave} className={modalPrimaryBtn}>Enregistrer</button>
        </>
      }>
        <div className="space-y-6">
          {/* Titre de la rubrique */}
          <div>
            <label className={modalLabel}>
              Titre de la rubrique
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={modalField}
              placeholder="Ex : Notre Histoire d’Amour"
            />
          </div>

          {/* ==================================================== */}
          {/* ÉDITEUR SPÉCIFIQUE : STORY (RÉCIT & FRISE) */}
          {/* ==================================================== */}
          {section.type === 'story' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Récit narratif
                </label>
                <textarea
                  rows={4}
                  value={(content as StorySectionContent).narrative || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      narrative: e.target.value,
                    } as StorySectionContent)
                  }
                  className={modalField}
                  placeholder="Racontez comment tout a commencé..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700">
                    Étapes clés & Chronologie
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = (content as StorySectionContent).timeline || [];
                      setContent({
                        ...content,
                        timeline: [
                          ...cur,
                          {
                            year_or_date: `Étape ${cur.length + 1}`,
                            title: 'Nouveau moment',
                            text: 'Description du souvenir...',
                          },
                        ],
                      } as StorySectionContent);
                    }}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une étape
                  </button>
                </div>

                <div className="space-y-3">
                  {(content as StorySectionContent).timeline?.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const cur = (content as StorySectionContent).timeline || [];
                          setContent({
                            ...content,
                            timeline: cur.filter((_, i) => i !== idx),
                          } as StorySectionContent);
                        }}
                        className="absolute right-3 top-3 text-stone-400 hover:text-rose-600"
                        title="Supprimer cette étape"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-3 gap-2 pr-6">
                        <input
                          type="text"
                          value={step.year_or_date}
                          onChange={(e) => {
                            const cur = [...((content as StorySectionContent).timeline || [])];
                            cur[idx].year_or_date = e.target.value;
                            setContent({ ...content, timeline: cur } as StorySectionContent);
                          }}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                          placeholder="Date / Chapitre"
                        />
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const cur = [...((content as StorySectionContent).timeline || [])];
                            cur[idx].title = e.target.value;
                            setContent({ ...content, timeline: cur } as StorySectionContent);
                          }}
                          className="col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                          placeholder="Titre de l'étape"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={step.text}
                        onChange={(e) => {
                          const cur = [...((content as StorySectionContent).timeline || [])];
                          cur[idx].text = e.target.value;
                          setContent({ ...content, timeline: cur } as StorySectionContent);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                        placeholder="Détails du souvenir..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉDITEUR SPÉCIFIQUE : ANECDOTE */}
          {/* ==================================================== */}
          {section.type === 'anecdote' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700">
                  Liste des anecdotes ou chiffres clés
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const items = (content as AnecdoteSectionContent).items || [];
                    setContent({
                      ...content,
                      items: [
                        ...items,
                        {
                          title: 'Petite confidence',
                          content: 'Anecdote amusante à partager...',
                        },
                      ],
                    } as AnecdoteSectionContent);
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une anecdote
                </button>
              </div>

              <div className="space-y-3">
                {(content as AnecdoteSectionContent).items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (content as AnecdoteSectionContent).items || [];
                        setContent({
                          ...content,
                          items: cur.filter((_, i) => i !== idx),
                        } as AnecdoteSectionContent);
                      }}
                      className="absolute right-3 top-3 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const cur = [...((content as AnecdoteSectionContent).items || [])];
                        cur[idx].title = e.target.value;
                        setContent({ ...content, items: cur } as AnecdoteSectionContent);
                      }}
                      className="w-full pr-8 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300"
                      placeholder="Titre ou Chiffre clé (ex : 1 825 jours)"
                    />
                    <textarea
                      rows={2}
                      value={item.content}
                      onChange={(e) => {
                        const cur = [...((content as AnecdoteSectionContent).items || [])];
                        cur[idx].content = e.target.value;
                        setContent({ ...content, items: cur } as AnecdoteSectionContent);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                      placeholder="Texte de l'anecdote..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉDITEUR SPÉCIFIQUE : QUIZ (QCM) */}
          {/* ==================================================== */}
          {section.type === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700">
                  Questions du Grand Quiz des mariés
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const questions = (content as QuizSectionContent).questions || [];
                    setContent({
                      ...content,
                      questions: [
                        ...questions,
                        {
                          question: 'Nouvelle question sur le couple ?',
                          options: ['Choix A', 'Choix B', 'Choix C', 'Choix D'],
                          answer_index: 0,
                        },
                      ],
                    } as QuizSectionContent);
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une question
                </button>
              </div>

              <div className="space-y-4">
                {(content as QuizSectionContent).questions?.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3 relative"
                  >
                    <div className="flex items-center justify-between pr-8">
                      <span className="text-xs font-bold text-stone-700">
                        Question {qIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = (content as QuizSectionContent).questions || [];
                          setContent({
                            ...content,
                            questions: cur.filter((_, i) => i !== qIdx),
                          } as QuizSectionContent);
                        }}
                        className="text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const cur = [...((content as QuizSectionContent).questions || [])];
                        cur[qIdx].question = e.target.value;
                        setContent({ ...content, questions: cur } as QuizSectionContent);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300"
                      placeholder="Intitulé de la question..."
                    />

                    {/* Choix & Bonne réponse */}
                    <div className="space-y-2">
                      <span className="text-[11px] text-stone-500 font-medium block">
                        Cochez le cercle pour désigner la bonne réponse :
                      </span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_q_${qIdx}`}
                            checked={q.answer_index === optIdx}
                            onChange={() => {
                              const cur = [...((content as QuizSectionContent).questions || [])];
                              cur[qIdx].answer_index = optIdx;
                              setContent({ ...content, questions: cur } as QuizSectionContent);
                            }}
                            className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs font-bold text-stone-500 min-w-[20px]">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const cur = [...((content as QuizSectionContent).questions || [])];
                              cur[qIdx].options[optIdx] = e.target.value;
                              setContent({ ...content, questions: cur } as QuizSectionContent);
                            }}
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-stone-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉDITEUR SPÉCIFIQUE : PROGRAM (DÉROULÉ JOUR J) */}
          {/* ==================================================== */}
          {section.type === 'program' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700">
                  Horaires et étapes du mariage
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const items = (content as ProgramSectionContent).items || [];
                    setContent({
                      ...content,
                      items: [
                        ...items,
                        {
                          time: '18:00',
                          title: 'Nouveau moment',
                          description: '',
                          location: '',
                        },
                      ],
                    } as ProgramSectionContent);
                  }}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un moment
                </button>
              </div>

              <div className="space-y-3">
                {(content as ProgramSectionContent).items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const cur = (content as ProgramSectionContent).items || [];
                        setContent({
                          ...content,
                          items: cur.filter((_, i) => i !== idx),
                        } as ProgramSectionContent);
                      }}
                      className="absolute right-3 top-3 text-stone-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-4 gap-2 pr-6">
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => {
                          const cur = [...((content as ProgramSectionContent).items || [])];
                          cur[idx].time = e.target.value;
                          setContent({ ...content, items: cur } as ProgramSectionContent);
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-stone-300"
                        placeholder="14:30"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const cur = [...((content as ProgramSectionContent).items || [])];
                          cur[idx].title = e.target.value;
                          setContent({ ...content, items: cur } as ProgramSectionContent);
                        }}
                        className="col-span-3 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-300"
                        placeholder="Intitulé (ex: Cérémonie Laïque)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.location || ''}
                        onChange={(e) => {
                          const cur = [...((content as ProgramSectionContent).items || [])];
                          cur[idx].location = e.target.value;
                          setContent({ ...content, items: cur } as ProgramSectionContent);
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                        placeholder="Lieu (ex: Jardin sud)"
                      />
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => {
                          const cur = [...((content as ProgramSectionContent).items || [])];
                          cur[idx].description = e.target.value;
                          setContent({ ...content, items: cur } as ProgramSectionContent);
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300"
                        placeholder="Note ou précision..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ÉDITEUR SPÉCIFIQUE : CUSTOM (ARTICLE LIBRE / REMERCIEMENTS) */}
          {/* ==================================================== */}
          {section.type === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Sous-titre ou chapô
                </label>
                <input
                  type="text"
                  value={(content as CustomSectionContent).subtitle || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      subtitle: e.target.value,
                    } as CustomSectionContent)
                  }
                  className={modalField}
                  placeholder="Ex : Par les témoins de la mariée"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Texte de l'article
                </label>
                <textarea
                  rows={6}
                  value={(content as CustomSectionContent).body || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      body: e.target.value,
                    } as CustomSectionContent)
                  }
                  className={modalField}
                  placeholder="Écrivez votre message..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Signature
                </label>
                <input
                  type="text"
                  value={(content as CustomSectionContent).signature || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      signature: e.target.value,
                    } as CustomSectionContent)
                  }
                  className={modalField}
                  placeholder="Ex : Avec toute notre affection, Sophie & Thomas"
                />
              </div>
            </div>
          )}
        </div>

    </SplitModal>
  );
}
