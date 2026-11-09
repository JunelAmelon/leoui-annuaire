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
} from 'lucide-react';
import { FirestoreGazetteRepository } from '@/features/gazette/repositories/firestore-gazette.repository';
import { GazetteService } from '@/features/gazette/services/gazette.service';
import { GazettePdfService } from '@/features/gazette/services/gazette-pdf.service';
import type {
  Gazette,
  GazetteSection,
  GazetteSectionType,
  GazetteTheme,
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
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
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

  // Sauvegarder les métadonnées globales
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
        layout: {
          theme: metadata.theme,
          accent_color: gazette.layout.accent_color,
        },
        expected_version: gazette.version,
      });
      setGazette(updated);
      setShowMetadataModal(false);
      toast.success('Paramètres de la gazette mis à jour avec succès.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour des paramètres.');
    }
  };

  // Sauvegarder une section
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
  const handleAddSection = async (type: GazetteSectionType) => {
    if (!gazette) return;

    let defaultContent: any = {};
    let defaultTitle = 'Nouvelle Rubrique';

    if (type === 'story') {
      defaultTitle = 'Un Nouveau Chapitre';
      defaultContent = {
        narrative: 'Racontez un souvenir mémorable...',
        timeline: [],
      };
    } else if (type === 'anecdote') {
      defaultTitle = 'Petites Confidences';
      defaultContent = {
        items: [
          {
            title: 'Le saviez-vous ?',
            content: 'Une anecdote inédite sur les mariés...',
          },
        ],
      };
    } else if (type === 'quiz') {
      defaultTitle = 'Quiz Spécial';
      defaultContent = {
        questions: [
          {
            question: 'Question surprise ?',
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            answer_index: 0,
          },
        ],
      };
    } else if (type === 'program') {
      defaultTitle = 'Moments Clés';
      defaultContent = {
        items: [
          {
            time: '17:00',
            title: 'Animation surprise',
            description: '',
            location: '',
          },
        ],
      };
    } else {
      defaultTitle = 'Témoignage & Remerciements';
      defaultContent = {
        subtitle: 'Par les proches',
        body: 'Un texte touchant rédigé avec amour...',
        signature: 'Vos amis pour toujours',
      };
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
      toast.success('Nouvelle rubrique ajoutée.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l’ajout.');
    }
  };

  // Synchronisation avec le planning du mariage
  const handleSyncPlanning = async () => {
    if (!gazette) return;

    // Moments par défaut du jour J pour enrichir la synchronisation
    const defaultMoments = [
      {
        time: '14:30',
        title: 'Cérémonie Civile & Échange des Vœux',
        description: 'Mairie & Salle des mariages',
        location: event?.venue || 'Mairie',
      },
      {
        time: '16:30',
        title: 'Cocktail & Vin d’Honneur',
        description: 'Musique live & rafraîchissements',
        location: 'Les Jardins',
      },
      {
        time: '19:30',
        title: 'Grand Dîner de Fête',
        description: 'Menu gastronomique & surprises',
        location: 'Salle de Réception',
      },
      {
        time: '23:00',
        title: 'Ouverture du Bal & Soirée Dansante',
        description: 'Danse jusqu’au bout de la nuit',
        location: 'Piste principale',
      },
    ];

    try {
      const updated = await service.syncProgramFromDayPlan(
        gazette.event_id,
        defaultMoments,
        gazette.version
      );
      setGazette(updated);
      toast.success('Programme du jour J synchronisé avec le planning !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la synchronisation.');
    }
  };

  // Téléchargement PDF Imprimable
  const handleExportPdf = async () => {
    if (!gazette) return;
    try {
      setIsExportingPdf(true);
      toast.info('Génération de la gazette A4 imprimable en cours...');
      await GazettePdfService.generatePrintableGazette(gazette);
      toast.success('Votre gazette de mariage A4 a été téléchargée !');
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
        <p className="text-sm font-medium text-stone-600">
          Chargement de votre Gazette de Mariage...
        </p>
      </div>
    );
  }

  if (!gazette) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Newspaper className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              Journal des Mariés
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
            {gazette.title || 'La Gazette des Mariés'}
          </h1>
          <p className="text-xs text-stone-500">
            {gazette.subtitle || 'Édition Spéciale — Tirage Unique pour vos Invités'} • Version {gazette.version}
          </p>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Bascule Mode Édition / Mode Aperçu */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'editor'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Éditeur
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                viewMode === 'preview'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Aperçu Journal
            </button>
          </div>

          {/* Paramètres de la gazette */}
          <button
            type="button"
            onClick={() => setShowMetadataModal(true)}
            className="p-2.5 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition"
            title="Paramètres de la gazette"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Télécharger PDF A4 */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-2xl shadow-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            {isExportingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>Télécharger le PDF Imprimable</span>
          </button>
        </div>
      </div>

      {/* BANNIÈRE DE SYNCHRONISATION DU PLANNING */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-stone-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Programme du Jour J & Planning
            </h4>
            <p className="text-xs text-stone-600">
              {gazette.program_source === 'plan'
                ? gazette.program_synced_at
                  ? `Synchronisé le ${new Date(gazette.program_synced_at).toLocaleDateString('fr-FR')} à ${new Date(gazette.program_synced_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Synchronisé avec le planning officiel'
                : 'Programme actuellement en mode personnalisé (manuel)'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncPlanning}
          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Synchroniser avec le planning</span>
        </button>
      </div>

      {/* CONTENU PRINCIPAL SELON LE MODE */}
      {viewMode === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : Liste des rubriques */}
          <div className="lg:col-span-2 space-y-6">
            <GazetteSectionList
              sections={gazette.sections}
              onEditSection={(section) => setEditingSection(section)}
              onDeleteSection={handleDeleteSection}
              onMoveUp={(idx) => handleMoveSection(idx, 'up')}
              onMoveDown={(idx) => handleMoveSection(idx, 'down')}
              onAddSection={handleAddSection}
            />
          </div>

          {/* Colonne droite : Synthèse & Conseils d'impression */}
          <div className="space-y-6">
            {/* Carte Récapitulative du Thème */}
            <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Style Sélectionné
                </span>
                <button
                  type="button"
                  onClick={() => setShowMetadataModal(true)}
                  className="text-xs text-rose-600 font-semibold hover:underline"
                >
                  Changer
                </button>
              </div>

              <div>
                <span className="font-bold text-sm text-stone-900 block">
                  {gazette.layout.theme === 'vintage_gazette'
                    ? 'Gazette Vintage 1920'
                    : gazette.layout.theme === 'romantic_rose'
                    ? 'Romance Florale'
                    : 'Chic Minimaliste'}
                </span>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Mise en page 4 pages format A4 bifold prête à être pliée en journal de mariage.
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Photo de Une :</span>
                  <span className="font-medium">
                    {gazette.cover_path ? 'Définie' : 'Aucune (cadre souvenir)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Date imprimée :</span>
                  <span className="font-medium">
                    {gazette.wedding_date || 'Non renseignée'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lieu :</span>
                  <span className="font-medium">
                    {gazette.location_name || 'Non renseigné'}
                  </span>
                </div>
              </div>
            </div>

            {/* Conseils d'impression du journal */}
            <div className="bg-amber-50/40 border border-amber-200/60 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Conseils pour l'Impression
                </h4>
              </div>
              <ul className="text-xs text-stone-600 space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span>•</span>
                  <span>
                    <strong>Format recommandé :</strong> Imprimez en recto-verso sur du papier kraft ou papier vergé 90-120g pour un rendu authentique.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span>•</span>
                  <span>
                    <strong>Pliage :</strong> Pliez les feuilles en deux (format livret) pour obtenir un vrai journal de 4 pages à poser sur les tables.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span>•</span>
                  <span>
                    <strong>Animation :</strong> Distribuez la gazette dès le vin d’honneur pour occuper agréablement vos invités avec le quiz !
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Mode Aperçu Journal */
        <GazettePreview
          gazette={gazette}
          onEditSection={(section) => setEditingSection(section)}
          onEditMetadata={() => setShowMetadataModal(true)}
        />
      )}

      {/* MODALE D'ÉDITION DE SECTION */}
      {editingSection && (
        <GazetteSectionEditor
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setEditingSection(null)}
        />
      )}

      {/* MODALE DE PARAMÈTRES / MÉTADONNÉES */}
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
