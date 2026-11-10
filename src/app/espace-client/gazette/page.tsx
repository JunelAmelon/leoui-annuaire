'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import {
  Newspaper,
  BookOpen,
  Sparkles,
  Download,
  Settings,
  RefreshCw,
  Eye,
  Edit3,
  Calendar,
  MapPin,
  Plus,
  Heart,
  HelpCircle,
  Clock,
  Printer,
  Columns,
  Layers,
  ChevronRight,
  CheckCircle2,
  Info,
  Wand2,
  ArrowRight,
} from 'lucide-react';
import { FirestoreGazetteRepository } from '@/features/gazette/repositories/firestore-gazette.repository';
import { GazetteService } from '@/features/gazette/services/gazette.service';
import { GazettePdfService } from '@/features/gazette/services/gazette-pdf.service';
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
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await handleInlineMetadataUpdate({ [field]: dataUrl });
      const fieldNames = {
        cover_path: 'Photo de couverture (Une)',
        story_photo_path: 'Photo de l’histoire (Page 2)',
        witnesses_photo_path: 'Photo des témoins (Page 3)',
      };
      toast.success(`${fieldNames[field]} mise à jour !`);
    };
    reader.readAsDataURL(file);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-sans">
          Ouverture de l'Atelier de Presse...
        </p>
      </div>
    );
  }

  if (!gazette) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* ── BREADCRUMB & TITRE HAUT DE GAMME ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <span>Espace Mariage</span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span>Papeterie & Souvenirs</span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-stone-900 font-semibold">Atelier de Presse Gazette</span>
        </div>

        {/* HERO BANNER ÉDITORIAL LUXE (Design conservé & enrichi) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Newspaper className="w-48 h-48 -rotate-12" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-300">
                Journal Officiel des Mariés • Format Bifold 4 Pages A4
              </p>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-white">
                {gazette.title || 'La Gazette des Mariés'}
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 font-serif italic leading-relaxed">
                Cliquez directement sur n’importe quel texte ou titre du journal pour le personnaliser en direct, comme sur Canva.
              </p>
            </div>

            {/* Actions principales */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMetadataModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-xs flex items-center gap-2 transition"
              >
                <Settings className="w-4 h-4" />
                <span>Paramètres & Style</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span>Télécharger le Bon à Tirer (PDF A4)</span>
              </button>
            </div>
          </div>

          {/* KPI Mini-barre */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase tracking-wider">Format d'impression</span>
              <strong className="text-white text-sm font-serif">4 Pages A4 Pliées</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase tracking-wider">Rubriques actives</span>
              <strong className="text-white text-sm font-serif">{gazette.sections.length} sur 30</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase tracking-wider">Style graphique</span>
              <strong className="text-white text-sm font-serif capitalize">
                {gazette.layout.theme === 'vintage_gazette' ? 'Gazette 1920' : gazette.layout.theme === 'romantic_rose' ? 'Romance Florale' : 'Vogue Éditorial'}
              </strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase tracking-wider">Mode Édition</span>
              <strong className="text-emerald-400 text-sm font-serif flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Canva En Direct
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── ONGLETS DE TRAVAIL ÉPURÉS ── */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Feuilletoir & Éditeur Canva</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Gestionnaire d'Articles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Guide & Imprimerie</span>
          </button>
        </div>

        {activeTab === 'editor' && (
          <button
            type="button"
            onClick={handleSyncPlanning}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Resynchroniser le planning</span>
          </button>
        )}
      </div>

      {/* ── CONTENU DES ONGLETS ── */}
      {/* 1. ONGLET FEUILLETOIR & ÉDITEUR CANVA DIRECT */}
      {activeTab === 'preview' && (
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
      )}

      {/* 2. ONGLET GESTIONNAIRE D'ARTICLES */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : Gestionnaire des articles */}
          <div className="lg:col-span-2 space-y-6">
            <GazetteSectionList
              sections={gazette.sections}
              onEditSection={(section) => setEditingSection(section)}
              onDeleteSection={handleDeleteSection}
              onMoveUp={(idx) => handleMoveSection(idx, 'up')}
              onMoveDown={(idx) => handleMoveSection(idx, 'down')}
              onAddSection={(type) => handleAddSection(type)}
            />
          </div>

          {/* Colonne droite : Aperçu synthétique & actions */}
          <div className="space-y-6">
            {/* Carte d'accès rapide au Bon à Tirer */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Épreuve d'Impression
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Prêt pour tirage
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-serif font-bold text-base text-stone-900">
                  {gazette.title}
                </h4>
                <p className="text-xs text-stone-500 italic font-serif leading-relaxed">
                  « {gazette.subtitle || 'ILS SE SONT DIT OUI !'} »
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 text-xs text-stone-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" /> Date :
                  </span>
                  <span className="font-medium text-stone-900">
                    {gazette.wedding_date || 'À définir'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" /> Lieu :
                  </span>
                  <span className="font-medium text-stone-900 truncate max-w-[150px]">
                    {gazette.location_name || 'À définir'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Générer le PDF de contrôle</span>
              </button>
            </div>

            {/* Bannière de passage au mode visuel Canva */}
            <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200 rounded-3xl p-6 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                Édition Visuelle Directe
              </span>
              <p className="text-xs text-stone-700 leading-relaxed">
                Vous préférez modifier vos articles directement sur la mise en page finale du journal ?
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Ouvrir l'Atelier Visuel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bannière de conseils de rédaction */}
            <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-800 block">
                Astuces de Rédaction
              </span>
              <ul className="text-xs text-stone-600 space-y-2 leading-relaxed">
                <li>• <strong>L'Histoire :</strong> 3 dates fortes suffisent pour captiver les invités.</li>
                <li>• <strong>Le Quiz :</strong> Prévoyez 4 questions drôles et inattendues sur le couple.</li>
                <li>• <strong>Le Timing :</strong> Distribuez la gazette au vin d'honneur pour lancer les conversations !</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 3. ONGLET GUIDE & IMPRIMERIE */}
      {activeTab === 'guide' && (
        <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-xl font-serif font-bold text-stone-900">
              Guide d'Impression & Fabrication de Votre Gazette
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Tous nos secrets d'imprimeurs pour réussir un rendu professionnel digne d'un grand quotidien.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                1. Choix du Papier
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Optez pour un papier <strong>vergé ivoire ou papier kraft 90g à 120g</strong>. Évitez le papier glacé brillant pour préserver l'authenticité de la texture de presse.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                2. Pliage & Format
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Imprimez en <strong>recto-verso A4</strong> (Page 1 & 4 sur la première face, Page 2 & 3 sur la seconde). Un simple pli central transforme vos feuilles en un superbe journal.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900 block">
                3. Distribution Jour J
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Déposez un exemplaire par table ou distribuez-le dans des paniers en osier lors du cocktail. Succès garanti auprès de toutes les générations !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALES COMPLÉMENTAIRES (Pour réglages approfondis) ── */}
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
