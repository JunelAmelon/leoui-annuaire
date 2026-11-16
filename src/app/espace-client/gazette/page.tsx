'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { ArrowRight, Download, RefreshCw, Settings } from 'lucide-react';
import { uploadFile } from '@/lib/storage';
import { FirestoreGazetteRepository } from '@/features/gazette/repositories/firestore-gazette.repository';
import { GazetteService } from '@/features/gazette/services/gazette.service';
import { GazettePdfService } from '@/features/gazette/services/gazette-pdf.service';
import { GAZETTE_THEMES } from '@/features/gazette/domain/types';
import type {
  Gazette,
  GazetteSection,
  GazetteSectionType,
  GazetteTheme,
  QuizSectionContent,
} from '@/features/gazette/domain/types';
import { GazettePreview } from '@/features/gazette/ui/GazettePreview';
import { GazetteSectionList } from '@/features/gazette/ui/GazetteSectionList';
import { GazetteSectionEditor } from '@/features/gazette/ui/GazetteSectionEditor';
import { GazetteMetadataModal } from '@/features/gazette/ui/GazetteMetadataModal';
import { toast } from 'sonner';

const repository = new FirestoreGazetteRepository();
const service = new GazetteService(repository);

export default function CoupleGazettePage() {
  const { user } = useAuth();
  const { event, client, loading: clientLoading } = useClientData();

  const [gazette, setGazette] = useState<Gazette | null>(null);
  const [loading, setLoading] = useState(true);
  // Onglet par défaut : Feuilletoir & Édition Canva pour un impact immédiat !
  const [activeTab, setActiveTab] = useState<'preview' | 'editor' | 'guide'>('preview');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modales
  const [editingSection, setEditingSection] = useState<GazetteSection | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  // Charger ou initialiser la gazette
  useEffect(() => {
    async function loadGazette() {
      if (clientLoading) return;

      const eventId = event?.id || client?.id || user?.uid || 'mariage_demo';
      const ownerId = user?.uid || (event as any)?.owner_id || client?.id || 'couple_owner';
      const coupleNames =
        event?.couple_names ||
        (client
          ? `La Gazette de ${client.name}${client.partner ? ` & ${client.partner}` : ''}`
          : 'La Gazette des Mariés');

      try {
        setLoading(true);
        const data = await service.getOrCreateGazette(eventId, ownerId, {
          title: coupleNames,
          weddingDate: event?.event_date || client?.event_date || '',
          locationName: event?.venue || event?.reception_venue || '',
        });
        setGazette(data);
      } catch (err: any) {
        console.error('Erreur chargement gazette:', err);
        toast.error('Impossible de charger la gazette du mariage.');
      } finally {
        setLoading(false);
      }
    }

    loadGazette();
  }, [user, event, client, clientLoading]);

  // Changer le thème en direct depuis le feuilletoir
  const handleThemeChange = async (newTheme: GazetteTheme) => {
    if (!gazette || gazette.layout.theme === newTheme) return;
    try {
      const updated = await service.updateMetadata(gazette.event_id, {
        layout: {
          theme: newTheme,
          accent_color: gazette.layout.accent_color,
        },
        expected_version: gazette.version,
      });
      setGazette(updated);
      toast.success(
        `Style « ${
          newTheme === 'chic_minimal'
            ? 'Vogue Éditorial'
            : newTheme === 'romantic_rose'
            ? 'Romance Florale'
            : 'Gazette Parisienne'
        } » activé.`
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  // Sauvegarder les métadonnées globales via modale
  const handleSaveMetadata = async (metadata: {
    title: string;
    subtitle: string;
    wedding_date: string;
    location_name: string;
    cover_path: string | null;
    cover_caption: string;
    editorial: string;
    weather_forecast: string;
    theme: GazetteTheme;
    price_tag?: string;
    edition_tag?: string;
    font_family?: 'bodoni' | 'playfair' | 'cinzel' | 'sans';
    accent_color?: string;
    qr_code_target?: 'guestbook' | 'photos' | 'honeymoon';
  }) => {
    if (!gazette) return;
    try {
      const updated = await service.updateMetadata(gazette.event_id, {
        title: metadata.title,
        subtitle: metadata.subtitle,
        wedding_date: metadata.wedding_date,
        location_name: metadata.location_name,
        cover_path: metadata.cover_path,
        cover_caption: metadata.cover_caption,
        editorial: metadata.editorial,
        weather_forecast: metadata.weather_forecast,
        price_tag: metadata.price_tag,
        edition_tag: metadata.edition_tag,
        qr_code_target: metadata.qr_code_target,
        layout: {
          theme: metadata.theme,
          accent_color: metadata.accent_color || gazette.layout.accent_color,
          font_family: metadata.font_family || gazette.layout.font_family,
        },
        expected_version: gazette.version,
      });
      setGazette(updated);
      setShowMetadataModal(false);
      toast.success('Paramètres éditoriaux enregistrés.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour des paramètres.');
    }
  };

  // Mise à jour inline directe d'un champ de métadonnées (Canva)
  const handleInlineMetadataUpdate = async (fields: Partial<Gazette>) => {
    if (!gazette) return;
    try {
      const updated = await service.updateMetadata(gazette.event_id, {
        ...fields,
        expected_version: gazette.version,
      });
      setGazette(updated);
    } catch (err: any) {
      console.error('Erreur auto-save:', err);
      toast.error('Erreur lors de l’enregistrement automatique.');
    }
  };

  // Mise à jour inline directe d'une rubrique (Canva)
  const handleInlineSectionUpdate = async (
    sectionId: string,
    updatedFields: { title?: string; content?: any }
  ) => {
    if (!gazette) return;
    try {
      const updated = await service.updateSection(
        gazette.event_id,
        sectionId,
        updatedFields,
        gazette.version
      );
      setGazette(updated);
    } catch (err: any) {
      console.error('Erreur mise à jour rubrique:', err);
      toast.error('Erreur lors de la mise à jour de la rubrique.');
    }
  };

  // Insertion rapide de blocs modulaires (sans emojis)
  const handleInlineAddQuickBlock = async (
    type:
      | 'trombinoscope'
      | 'crosswords'
      | 'truefalse'
      | 'dresscode'
      | 'interview'
      | 'horoscope'
      | 'annonces'
      | 'quiz'
  ) => {
    if (!gazette) return;

    if (type === 'trombinoscope') {
      await handleAddSection('anecdote', 'Trombinoscope des Témoins & Complices', {
        items: [
          {
            title: 'Camille — Témoin de la mariée',
            content: 'Amie d’enfance inséparable, experte officielle en retouches maquillage et discours émouvants.',
          },
          {
            title: 'Julien — Témoin du marié',
            content: 'Complice de toujours, responsable officiel de l’ambiance et gardien solennel des alliances.',
          },
        ],
      });
      toast.success('Rubrique Trombinoscope ajoutée en Page 3 !');
    } else if (type === 'crosswords') {
      await handleAddSection('custom', 'Mots Croisés des Mariés', {
        subtitle: '4 définitions pour percer les secrets du couple',
        body: '1. Horizontal : La ville de leur premier baiser (5 lettres : PARIS) • 2. Vertical : Le prénom du chat adopté ensemble (4 lettres : MILO) • 3. Horizontal : Le dessert préféré de Sophie (8 lettres : TIRAMISU) • 4. Vertical : La chanson de l’ouverture de bal (7 lettres : PERFECT)',
        signature: 'Grille certifiée par les témoins',
      });
      toast.success('Mots Croisés ajoutés en Page 4 !');
    } else if (type === 'truefalse') {
      await handleAddSection('anecdote', 'Vrai ou Faux : Spécial Mariés', {
        items: [
          {
            title: '1. Ils se sont rencontrés sous une pluie battante ?',
            content: 'VRAI — Un parapluie partagé à la sortie du métro a scellé leur histoire.',
          },
          {
            title: '2. Thomas a fait sa demande au sommet de la tour Eiffel ?',
            content: 'FAUX — C’était sur une plage déserte en Bretagne au coucher du soleil.',
          },
          {
            title: '3. Sophie sait déjà où aura lieu leur voyage de noces ?',
            content: 'VRAI — Cap sur le Japon au printemps des cerisiers en fleurs !',
          },
        ],
      });
      toast.success('Vrai ou Faux ajouté en Page 4 !');
    } else if (type === 'dresscode') {
      await handleAddSection('custom', 'Dress Code & Hashtag Officiel', {
        subtitle: 'Élégance champêtre & touches pastel',
        body: 'Palette conseillée : Rose poudré, Terracotta doux, Vert sauge et Beige naturel. Partagez vos plus beaux clichés du jour J sur Instagram avec le hashtag officiel : #SophieEtThomas2026',
        signature: 'Le protocole des mariés',
      });
      toast.success('Guide Dress Code ajouté en Page 2 !');
    } else if (type === 'interview') {
      await handleAddSection('custom', 'Interview Croisée : Elle & Lui', {
        subtitle: 'Les confidences vérité sans filtre',
        body: 'Elle : « Sa plus grande qualité ? Sa tendresse au quotidien et ses petits plats réconfortants ! » — Lui : « Ce qui m’a fait craquer le premier jour ? Son rire lumineux et sa joie communicative. »',
        signature: 'Interview réalisée en secret par les témoins',
      });
      toast.success('Interview Croisée ajoutée en Page 2 !');
    } else if (type === 'horoscope') {
      await handleAddSection('anecdote', 'Horoscope Décalé des Invités', {
        items: [
          {
            title: 'Signes de Feu (Bélier, Lion, Sagittaire)',
            content: 'Sortez les mouchoirs pendant les vœux et préparez-vous à être les premiers sur la piste de danse !',
          },
          {
            title: 'Signes de Terre (Taureau, Vierge, Capricorne)',
            content: 'Rendez-vous au buffet des desserts dès l’ouverture pour ne pas manquer la pièce montée !',
          },
        ],
      });
      toast.success('Horoscope ajouté en Page 2 !');
    } else if (type === 'annonces') {
      await handleAddSection('anecdote', 'Petites Annonces Humoristiques', {
        items: [
          {
            title: 'RECHERCHE DE TOUTE URGENCE',
            content: 'Partenaire motivé(e) pour enflammer le dancefloor jusqu’à 4h du matin. Débutant(e) accepté(e).',
          },
          {
            title: 'À VENDRE / À TRANSMETTRE',
            content: 'Bouquet de la mariée légèrement décoiffé mais plein de promesses d’amour pour l’année prochaine !',
          },
        ],
      });
      toast.success('Petites annonces ajoutées en Page 2 !');
    } else if (type === 'quiz') {
      const quiz = gazette.sections.find((s) => s.type === 'quiz');
      if (quiz) {
        const currentContent = quiz.content as QuizSectionContent;
        const newQuestions = [
          ...(currentContent.questions || []),
          {
            question: 'Quel est leur petit rituel incontournable du dimanche matin ?',
            options: ['Café au lit & musique douce', 'Brunch fait maison', 'Course à pied sous la pluie', 'Grasse matinée jusqu’à 13h'],
            answer_index: 0,
          },
        ];
        await handleInlineSectionUpdate(quiz.id, {
          content: { questions: newQuestions },
        });
        toast.success('Nouvelle question ajoutée au Quiz en Page 4 !');
      } else {
        await handleAddSection('quiz');
      }
    }
  };

  // Upload photo multi-emplacements (Une, Page 2 récit, Page 3 témoins)
  const handleUploadPhoto = async (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path',
    file: File
  ) => {
    if (!gazette) return;
    const fieldNames = {
      cover_path: 'Photo de Une',
      story_photo_path: 'Photo de votre histoire',
      witnesses_photo_path: 'Photo des témoins',
    };
    try {
      const url = await uploadFile(file, 'gazettes');
      await handleInlineMetadataUpdate({ [field]: url });
      toast.success(`${fieldNames[field]} mise à jour.`);
    } catch {
      toast.error('Import de la photo impossible.');
    }
  };

  // Suppression directe d'une photo
  const handleDeletePhoto = async (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path'
  ) => {
    if (!gazette) return;
    try {
      const updated = await service.updateMetadata(gazette.event_id, {
        [field]: null,
        expected_version: gazette.version,
      });
      setGazette(updated);
      toast.success('Photo supprimée avec succès.');
    } catch (err: any) {
      console.error('Erreur suppression photo:', err);
      toast.error('Erreur lors de la suppression de la photo.');
    }
  };

  // Rétrocompatibilité pour la couverture
  const handleUploadCover = (file: File) => handleUploadPhoto('cover_path', file);
  const handleDeleteCover = () => handleDeletePhoto('cover_path');

  // Sauvegarder une section via modale
  const handleSaveSection = async (updatedSection: GazetteSection) => {
    if (!gazette) return;
    try {
      const updated = await service.updateSection(
        gazette.event_id,
        updatedSection.id,
        {
          title: updatedSection.title,
          content: updatedSection.content,
        },
        gazette.version
      );
      setGazette(updated);
      setEditingSection(null);
      toast.success('Rubrique mise à jour.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour de la rubrique.');
    }
  };

  // Supprimer une section
  const handleDeleteSection = async (sectionId: string) => {
    if (!gazette) return;
    if (gazette.sections.length <= 1) {
      toast.error('La gazette doit comporter au moins une rubrique.');
      return;
    }
    try {
      const updated = await service.removeSection(
        gazette.event_id,
        sectionId,
        gazette.version
      );
      setGazette(updated);
      toast.success('Rubrique supprimée.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.');
    }
  };

  // Monter / Descendre une section
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (!gazette) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gazette.sections.length) return;

    const newSections = [...gazette.sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    const orderedIds = newSections.map((s) => s.id);
    try {
      const updated = await service.reorderSections(
        gazette.event_id,
        orderedIds,
        gazette.version
      );
      setGazette(updated);
    } catch (err: any) {
      toast.error(err.message || 'Erreur réordonnancement.');
    }
  };

  // Ajouter une nouvelle section
  const handleAddSection = async (
    type: GazetteSectionType,
    customTitle?: string,
    customContent?: any
  ) => {
    if (!gazette) return;

    let defaultContent: any = customContent || {};
    let defaultTitle = customTitle || 'Nouvelle Rubrique';

    if (!customContent) {
      if (type === 'story') {
        defaultTitle = 'Un Nouveau Chapitre';
        defaultContent = {
          narrative: 'Racontez un souvenir mémorable de votre aventure...',
          timeline: [],
        };
      } else if (type === 'anecdote') {
        defaultTitle = 'Petites Confidences & Chiffres Clés';
        defaultContent = {
          items: [
            {
              title: 'Le saviez-vous ?',
              content: 'Une anecdote inédite et croustillante sur les mariés...',
            },
          ],
        };
      } else if (type === 'quiz') {
        defaultTitle = 'Le Grand Quiz des Invités';
        defaultContent = {
          questions: [
            {
              question: 'Question surprise sur notre couple ?',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              answer_index: 0,
            },
          ],
        };
      } else if (type === 'program') {
        defaultTitle = 'L’Ordre du Jour & Les Festivités';
        defaultContent = {
          items: [
            {
              time: '17:00',
              title: 'Animation surprise & Cocktail',
              description: 'Sous les marronniers des jardins',
              location: 'Terrasse Ouest',
            },
          ],
        };
      } else {
        defaultTitle = 'La Tribune des Proches';
        defaultContent = {
          subtitle: 'Par les témoins & complices',
          body: 'Un mot chaleureux rédigé avec tendresse...',
          signature: 'Vos amis pour toujours',
        };
      }
    }

    try {
      const updated = await service.addSection(
        gazette.event_id,
        {
          type,
          title: defaultTitle,
          content: defaultContent,
        },
        gazette.version
      );
      setGazette(updated);
      toast.success(`« ${defaultTitle} » ajoutée au journal.`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l’ajout.');
    }
  };

  // Synchronisation avec le planning du mariage
  const handleSyncPlanning = async () => {
    if (!gazette) return;

    const defaultMoments = [
      {
        time: '14:30',
        title: 'Cérémonie Civile & Échange des Vœux',
        description: 'Mairie & Salle des Célébrations',
        location: event?.venue || 'Mairie',
      },
      {
        time: '16:30',
        title: 'Cocktail & Vin d’Honneur en Musique',
        description: 'Bulles, délices salés et photos souvenirs',
        location: 'Les Grands Jardins',
      },
      {
        time: '19:30',
        title: 'Le Grand Dîner de Fête & Surprises',
        description: 'Voyage gastronomique et discours émouvants',
        location: 'Grande Salle des Lustres',
      },
      {
        time: '23:00',
        title: 'Ouverture du Bal & Soirée Dansante',
        description: 'Que la fête commence jusqu’au bout de la nuit !',
        location: 'Piste Principale',
      },
    ];

    try {
      const updated = await service.syncProgramFromDayPlan(
        gazette.event_id,
        defaultMoments,
        gazette.version
      );
      setGazette(updated);
      toast.success('Programme officiel synchronisé avec le planning !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la synchronisation.');
    }
  };

  // Téléchargement PDF Imprimable
  const handleExportPdf = async () => {
    if (!gazette) return;
    try {
      setIsExportingPdf(true);
      toast.info('Génération de l’épreuve d’imprimerie A4 (BAT)...');
      await GazettePdfService.generatePrintableGazette(gazette);
      toast.success('Votre gazette imprimable a été téléchargée avec succès !');
    } catch (err: any) {
      console.error('Erreur export PDF:', err);
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full animate-pulse space-y-6">
        <div className="h-44 bg-white border border-stone-200" />
        <div className="h-[60vh] bg-stone-200/60" />
      </div>
    );
  }

  if (!gazette) return null;

  const themeLabel = GAZETTE_THEMES[gazette.layout.theme]?.label ?? 'Éditorial';
  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'preview', label: 'Le journal' },
    { id: 'editor', label: 'Rubriques' },
    { id: 'guide', label: 'Impression' },
  ];
  const printSteps = [
    { title: 'Le papier', text: 'Un papier mat, vergé ou recyclé, entre 90 et 120 g. Le brillant écrase les noirs et fait « flyer » : évitez-le.' },
    { title: 'Le pliage', text: 'Imprimez en A3 recto verso (pages 4 et 1 d’un côté, 2 et 3 de l’autre), puis pliez en deux. En A4, agrafez simplement les deux feuilles.' },
    { title: 'Le jour J', text: 'Un exemplaire par assiette ou une pile au vin d’honneur. Prévoyez 10 % de plus : les invités en emportent toujours.' },
  ];

  return (
    <div className="w-full pb-10">
      {/* ── En-tête ── */}
      <header className="relative bg-white border border-stone-200 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_22rem]">
          <div className="px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-7">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Papeterie · Le jour J</p>
            <h1 className="font-serif text-charcoal-900 mt-3 leading-none" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>La Gazette</h1>
            <p className="text-[15px] text-charcoal-500 mt-3 max-w-xl leading-relaxed">
              Le petit journal de votre mariage : votre histoire, le programme, un quiz. Quatre pages à glisser sur chaque table.
            </p>

            <dl className="flex flex-wrap gap-x-10 gap-y-3 mt-7 text-[13px]">
              {[
                ['Format', '4 pages A4'],
                ['Rubriques', String(gazette.sections.length)],
                ['Style', themeLabel],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">{k}</dt>
                  <dd className="font-serif text-charcoal-900 text-lg mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3 mt-8">
              <button type="button" onClick={handleExportPdf} disabled={isExportingPdf}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors rounded-sm">
                {isExportingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Télécharger le PDF
              </button>
              <button type="button" onClick={() => setShowMetadataModal(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-stone-300 text-charcoal-800 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm">
                <Settings className="w-4 h-4" /> Réglages
              </button>
            </div>
          </div>

          {/* Visuel : la Une posée sur une photo */}
          <div className="relative hidden lg:block min-h-[19rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gazette.cover_path || '/mariage (4).jpg'} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent" />
            <div className="absolute right-8 bottom-0 w-44 bg-white px-4 pt-4 pb-6 shadow-2xl translate-y-3 rotate-[-3deg]">
              <p className="text-[6px] tracking-[0.25em] uppercase text-charcoal-400 border-b border-charcoal-900 pb-1" style={{ fontFamily: "'Jost', sans-serif" }}>{gazette.edition_tag || 'Édition n° 1'}</p>
              <p className="text-center text-[17px] leading-[1.05] py-2.5 text-charcoal-900 break-words" style={{ fontFamily: "'Bodoni Moda', serif" }}>{gazette.title}</p>
              <p className="text-center italic font-serif text-[9px] text-rose-700 border-y border-charcoal-900 py-1">{gazette.subtitle || 'Ils se sont dit oui !'}</p>
              <div className="mt-2 space-y-1">
                {[100, 92, 96, 70].map((w, i) => <div key={i} className="h-[3px] bg-stone-200" style={{ width: `${w}%` }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <nav className="flex items-center justify-between gap-4 px-5 sm:px-9 lg:px-12 border-t border-stone-200" aria-label="Sections de la gazette">
          <div className="flex gap-x-7 overflow-x-auto subtle-scroll">
            {tabs.map((tb) => (
              <button key={tb.id} type="button" onClick={() => setActiveTab(tb.id)}
                className={`py-4 -mb-px text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tb.id ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'
                }`}>
                {tb.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={handleSyncPlanning}
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-charcoal-600 hover:text-rose-600 transition-colors whitespace-nowrap">
            <RefreshCw className="w-3.5 h-3.5" /> Reprendre le programme du planning
          </button>
        </nav>
      </header>

      {/* ── Le journal ── */}
      {activeTab === 'preview' && (
        <div className="mt-5">
          <GazettePreview
            gazette={gazette}
            onEditSection={(section) => setEditingSection(section)}
            onEditMetadata={() => setShowMetadataModal(true)}
            onThemeChange={handleThemeChange}
            onUpdateMetadataField={handleInlineMetadataUpdate}
            onUpdateSectionContent={handleInlineSectionUpdate}
            onAddQuickBlock={handleInlineAddQuickBlock}
            onUploadCoverImage={handleUploadCover}
            onDeleteCoverImage={handleDeleteCover}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        </div>
      )}

      {/* ── Rubriques ── */}
      {activeTab === 'editor' && (
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5 items-start">
          <div className="bg-white border border-stone-200 p-5 sm:p-8">
            <GazetteSectionList
              sections={gazette.sections}
              onEditSection={(section) => setEditingSection(section)}
              onDeleteSection={handleDeleteSection}
              onMoveUp={(idx) => handleMoveSection(idx, 'up')}
              onMoveDown={(idx) => handleMoveSection(idx, 'down')}
              onAddSection={(type) => handleAddSection(type)}
            />
          </div>

          <aside className="bg-white border border-stone-200 p-6 sm:p-7">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-rose-600">Conseils de rédaction</p>
            <ol className="mt-4 space-y-5">
              {[
                ['Votre histoire', 'Trois dates suffisent. Les invités lisent debout, un verre à la main.'],
                ['Le quiz', 'Quatre questions, dont une que seule la famille connaît.'],
                ['Le programme', 'Reprenez-le du planning : les horaires resteront justes.'],
              ].map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-x-2">
                  <span className="font-serif text-2xl leading-none text-charcoal-300">{i + 1}</span>
                  <div>
                    <p className="font-serif text-charcoal-900 text-lg leading-tight">{title}</p>
                    <p className="text-[13px] text-charcoal-500 mt-1 leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" onClick={handleSyncPlanning}
              className="sm:hidden mt-6 w-full inline-flex items-center justify-center gap-2 h-11 border border-stone-300 text-[13px] text-charcoal-800 rounded-sm">
              <RefreshCw className="w-3.5 h-3.5" /> Reprendre le programme du planning
            </button>
            <button type="button" onClick={() => setActiveTab('preview')}
              className="mt-6 inline-flex items-center gap-2 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600 transition-colors">
              Voir le journal <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </aside>
        </div>
      )}

      {/* ── Impression ── */}
      {activeTab === 'guide' && (
        <div className="mt-5 bg-white border border-stone-200 px-5 sm:px-9 lg:px-12 py-9 sm:py-12">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Avant d’imprimer</p>
          <h2 className="font-serif text-charcoal-900 mt-3 leading-tight" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 400 }}>Trois choses qui changent tout</h2>
          <ol className="grid md:grid-cols-3 gap-x-10 gap-y-8 mt-9">
            {printSteps.map((step, i) => (
              <li key={step.title} className="border-t border-charcoal-900 pt-5">
                <span className="font-serif text-5xl leading-none text-charcoal-200" style={{ fontWeight: 300 }}>{i + 1}</span>
                <p className="font-serif text-charcoal-900 text-xl mt-3">{step.title}</p>
                <p className="text-sm text-charcoal-500 mt-2 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={handleExportPdf} disabled={isExportingPdf}
            className="mt-10 inline-flex items-center justify-center gap-2 h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors rounded-sm">
            {isExportingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Télécharger le PDF
          </button>
        </div>
      )}

      {editingSection && (
        <GazetteSectionEditor
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}

      {showMetadataModal && (
        <GazetteMetadataModal
          gazette={gazette}
          onSave={handleSaveMetadata}
          onClose={() => setShowMetadataModal(false)}
        />
      )}
    </div>
  );
}
