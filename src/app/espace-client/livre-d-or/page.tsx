'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import {
  Mic,
  MessageSquare,
  Heart,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Settings,
  Filter,
  Check,
  Clock,
  Volume2,
  FileDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Radio,
  Printer,
  X,
} from 'lucide-react';
import { FirestoreGuestbookRepository } from '@/features/guestbook/repositories/firestore-guestbook.repository';
import { GuestbookService } from '@/features/guestbook/services/guestbook.service';
import { GuestbookPdfService } from '@/features/guestbook/services/guestbook-pdf.service';
import type { Guestbook, GuestbookEntry } from '@/features/guestbook/domain/types';
import { QRCodeCard } from '@/features/guestbook/ui/QRCodeCard';
import { WaveformPlayer } from '@/features/guestbook/ui/WaveformPlayer';
import { toast } from 'sonner';

const repository = new FirestoreGuestbookRepository();
const service = new GuestbookService(repository);

export default function CoupleGuestbookPage() {
  const { user } = useAuth();
  const { event, client, loading: clientLoading } = useClientData();

  const [guestbook, setGuestbook] = useState<Guestbook | null>(null);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'text' | 'favorites' | 'hidden'>('all');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsMaxDuration, setSettingsMaxDuration] = useState(120);

  // Exports PDF
  const [exportingBookPdf, setExportingBookPdf] = useState(false);
  const [exportingFlyerPdf, setExportingFlyerPdf] = useState(false);

  // Mode Podcast / Écoute continue
  const [podcastIndex, setPodcastIndex] = useState<number | null>(null);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const podcastAudioRef = useRef<HTMLAudioElement | null>(null);

  const eventId = event?.id || client?.id;
  const ownerId = user?.uid || (event as any)?.owner_id || client?.id || 'owner';

  const coupleNames =
    event?.couple_names ||
    (client ? `${client.name}${client.partner ? ` & ${client.partner}` : ''}` : 'Notre Mariage');

  // Initialisation ou récupération du livre d'or
  const loadGuestbookData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);

      const gb = await service.getOrCreateGuestbook(
        eventId,
        ownerId,
        `Le Livre d’Or de ${coupleNames}`
      );
      setGuestbook(gb);
      setSettingsTitle(gb.title);
      setSettingsMaxDuration(gb.settings.max_duration_sec);

      // Charger les entrées (inclus les masqués pour le couple propriétaire)
      const list = await repository.listByGuestbookId(eventId, {
        limitCount: 150,
        includeHidden: true,
      });
      setEntries(list);
    } catch (err: any) {
      console.error('Erreur chargement livre d’or:', err);
      toast.error('Impossible de charger votre livre d’or.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientLoading && eventId) {
      loadGuestbookData();
    }
  }, [eventId, clientLoading]);

  // Actions de modération
  const handleToggleFavorite = async (entry: GuestbookEntry) => {
    try {
      const next = !entry.favorite;
      await repository.toggleFavorite(entry.id, next);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, favorite: next } : e))
      );
      toast.success(next ? 'Message ajouté aux favoris ❤️' : 'Retiré des favoris');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleHidden = async (entry: GuestbookEntry) => {
    try {
      const next = !entry.hidden;
      await repository.toggleHidden(entry.id, next);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, hidden: next } : e))
      );
      toast.success(next ? 'Message masqué' : 'Message rendu visible');
    } catch {
      toast.error('Erreur lors de la modération');
    }
  };

  const handleDeleteEntry = async (entry: GuestbookEntry) => {
    if (!confirm(`Supprimer définitivement le message de ${entry.guest_name} ?`)) {
      return;
    }
    try {
      await repository.deleteEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success('Message supprimé.');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSaveSettings = async () => {
    if (!guestbook) return;
    try {
      await repository.updateSettings(guestbook.event_id, {
        max_duration_sec: Number(settingsMaxDuration),
      });
      if (settingsTitle !== guestbook.title) {
        await repository.save({
          ...guestbook,
          title: settingsTitle.trim(),
          updated_at: new Date().toISOString(),
        });
      }
      toast.success('Paramètres enregistrés avec succès.');
      setShowSettingsModal(false);
      loadGuestbookData();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Export PDF du Livre d'or complet
  const handleExportBookPdf = async () => {
    if (!guestbook) return;
    try {
      setExportingBookPdf(true);
      await GuestbookPdfService.generatePrintableBook(
        guestbook,
        entries,
        coupleNames,
        event?.event_date
      );
      toast.success('Livre d’or PDF imprimable généré avec succès !');
    } catch (err: any) {
      console.error('Erreur génération PDF livre:', err);
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setExportingBookPdf(false);
    }
  };

  // Export PDF du Flyer de table
  const handleDownloadFlyerPdf = async () => {
    if (!guestbook) return;
    try {
      setExportingFlyerPdf(true);
      await GuestbookPdfService.generateTableFlyer(
        guestbook,
        coupleNames,
        event?.event_date
      );
      toast.success('Carton de table PDF prêt à imprimer !');
    } catch (err: any) {
      console.error('Erreur génération flyer:', err);
      toast.error('Erreur lors de la création du flyer.');
    } finally {
      setExportingFlyerPdf(false);
    }
  };

  // Filtrage des entrées
  const filteredEntries = entries.filter((entry) => {
    if (filterType === 'audio') return entry.type === 'audio' && !entry.hidden;
    if (filterType === 'text') return entry.type === 'text' && !entry.hidden;
    if (filterType === 'favorites') return entry.favorite && !entry.hidden;
    if (filterType === 'hidden') return entry.hidden;
    return !entry.hidden;
  });

  const audioEntries = entries.filter((e) => e.type === 'audio' && !e.hidden && e.audio_path);
  const totalAudio = entries.filter((e) => e.type === 'audio' && !e.hidden).length;
  const totalText = entries.filter((e) => e.type === 'text' && !e.hidden).length;
  const totalFavorites = entries.filter((e) => e.favorite && !e.hidden).length;
  const totalHidden = entries.filter((e) => e.hidden).length;

  // Gestion du lecteur Podcast
  const currentPodcastTrack = podcastIndex !== null ? audioEntries[podcastIndex] : null;

  const startPodcast = (index = 0) => {
    if (audioEntries.length === 0) {
      toast.info('Aucun message vocal disponible pour la lecture continue.');
      return;
    }
    setPodcastIndex(index);
    setIsPodcastPlaying(true);
  };

  const handlePodcastNext = () => {
    if (podcastIndex !== null && podcastIndex + 1 < audioEntries.length) {
      setPodcastIndex(podcastIndex + 1);
      setIsPodcastPlaying(true);
    } else {
      setPodcastIndex(null);
      setIsPodcastPlaying(false);
      toast.success('Tous les messages vocaux ont été écoutés ! 🥂');
    }
  };

  const handlePodcastPrev = () => {
    if (podcastIndex !== null && podcastIndex > 0) {
      setPodcastIndex(podcastIndex - 1);
      setIsPodcastPlaying(true);
    }
  };

  if (loading || clientLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-stone-200 rounded-xl" />
        <div className="h-32 bg-white rounded-2xl border border-stone-200" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-stone-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* ── En-tête de page ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <p className="text-xs uppercase tracking-widest text-charcoal-400 font-medium">
              Espace Mariés · Souvenirs
            </p>
          </div>
          <h1
            className="font-serif text-charcoal-900 leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 400 }}
          >
            {guestbook?.title || 'Livre d’or audio & écrit'}
          </h1>
          <p className="text-sm text-charcoal-600 mt-1.5 leading-relaxed">
            Consultez les mots doux et réécoutez les voix de vos proches enregistrées lors de votre mariage.
          </p>
        </div>

        {/* Boutons d'action hauts */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Bouton Export PDF du Livre */}
          <button
            type="button"
            onClick={handleExportBookPdf}
            disabled={exportingBookPdf || entries.filter((e) => !e.hidden).length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exportingBookPdf ? 'Génération…' : 'Exporter le Livre d’Or (PDF)'}</span>
          </button>

          {/* Bouton Paramètres */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-stone-200 text-charcoal-700 hover:border-charcoal-400 hover:text-charcoal-900 transition-colors shadow-xs"
          >
            <Settings className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Paramètres</span>
          </button>
        </div>
      </div>

      {/* ── Carte QR Code Invité ── */}
      {guestbook && (
        <QRCodeCard
          publicToken={guestbook.public_token}
          weddingTitle={guestbook.title}
          onDownloadFlyer={handleDownloadFlyerPdf}
        />
      )}

      {/* ── Chiffres clés ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400 font-medium">Total reçus</p>
          <p className="font-serif text-charcoal-900 text-2xl font-normal mt-1">
            {entries.filter((e) => !e.hidden).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400 font-medium">Messages vocaux</p>
          <p className="font-serif text-rose-600 text-2xl font-normal mt-1">{totalAudio}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400 font-medium">Mots écrits</p>
          <p className="font-serif text-charcoal-900 text-2xl font-normal mt-1">{totalText}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wider text-charcoal-400 font-medium">Favoris</p>
          <p className="font-serif text-rose-600 text-2xl font-normal mt-1">{totalFavorites}</p>
        </div>
      </div>

      {/* ── Barre de filtres & Mode Podcast ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterType === 'all'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Tous ({entries.filter((e) => !e.hidden).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('audio')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterType === 'audio'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Vocaux ({totalAudio})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('text')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterType === 'text'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Écrits ({totalText})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('favorites')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterType === 'favorites'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Favoris ({totalFavorites})
          </button>
          {totalHidden > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('hidden')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === 'hidden'
                  ? 'bg-charcoal-800 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-charcoal-400 hover:text-charcoal-700'
              }`}
            >
              Masqués ({totalHidden})
            </button>
          )}
        </div>

        {/* Bouton Mode Podcast (lecture continue) */}
        {totalAudio > 0 && (
          <button
            type="button"
            onClick={() => (podcastIndex === null ? startPodcast(0) : setPodcastIndex(null))}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              podcastIndex !== null
                ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-xs'
                : 'bg-white border border-stone-200 text-charcoal-700 hover:border-charcoal-400'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-600" />
            <span>
              {podcastIndex !== null
                ? 'Quitter l’écoute continue'
                : `Tout écouter en continu (${totalAudio} vocaux)`}
            </span>
          </button>
        )}
      </div>

      {/* ── Lecteur Continu (Podcast des mariés) ── */}
      {podcastIndex !== null && currentPodcastTrack && (
        <div className="bg-charcoal-900 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-rose-300">
                  Vocal {podcastIndex + 1} / {audioEntries.length}
                </span>
                <span className="text-xs text-white/50">
                  {currentPodcastTrack.duration_sec
                    ? `${Math.floor(currentPodcastTrack.duration_sec / 60)}:${currentPodcastTrack.duration_sec % 60 < 10 ? '0' : ''}${currentPodcastTrack.duration_sec % 60}`
                    : ''}
                </span>
              </div>
              <p className="font-serif text-white text-base font-normal truncate mt-0.5">
                {currentPodcastTrack.guest_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <audio
              ref={podcastAudioRef}
              src={currentPodcastTrack.audio_path || undefined}
              autoPlay
              onEnded={handlePodcastNext}
              className="hidden"
            />

            <button
              type="button"
              onClick={handlePodcastPrev}
              disabled={podcastIndex === 0}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              title="Précédent"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!podcastAudioRef.current) return;
                if (isPodcastPlaying) {
                  podcastAudioRef.current.pause();
                  setIsPodcastPlaying(false);
                } else {
                  podcastAudioRef.current.play();
                  setIsPodcastPlaying(true);
                }
              }}
              className="w-10 h-10 rounded-full bg-white text-charcoal-900 flex items-center justify-center hover:bg-rose-50 transition-colors shadow-xs"
              title={isPodcastPlaying ? 'Pause' : 'Lecture'}
            >
              {isPodcastPlaying ? (
                <Pause className="w-4 h-4 fill-charcoal-900" />
              ) : (
                <Play className="w-4 h-4 fill-charcoal-900 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePodcastNext}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Suivant"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setPodcastIndex(null)}
              className="p-2 rounded-xl text-white/40 hover:text-white/80 transition-colors ml-2"
              title="Fermer le lecteur"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des messages ── */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-charcoal-900 text-lg font-normal">
            Aucun message dans cette section
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto leading-relaxed">
            Partagez le QR Code avec vos invités pour commencer à recueillir leurs précieux témoignages.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const formattedDate = new Date(entry.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
                  entry.hidden ? 'border-stone-200 bg-stone-50/60 opacity-75' : 'border-stone-200/80'
                }`}
              >
                {/* Ligne haute : Nom, Date & Actions */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-xs font-semibold">
                      {entry.guest_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-serif text-charcoal-900 text-base font-medium leading-snug">
                        {entry.guest_name}
                      </p>
                      <p className="text-[11px] text-charcoal-400">{formattedDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Bouton Favori */}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(entry)}
                      className={`p-2 rounded-lg transition-colors ${
                        entry.favorite
                          ? 'text-rose-600 bg-rose-50'
                          : 'text-charcoal-400 hover:text-rose-600 hover:bg-stone-50'
                      }`}
                      title={entry.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <Heart className={`w-4 h-4 ${entry.favorite ? 'fill-rose-600' : ''}`} />
                    </button>

                    {/* Bouton Masquer / Rendre visible */}
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(entry)}
                      className="p-2 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-stone-50 transition-colors"
                      title={entry.hidden ? 'Rendre visible' : 'Masquer du livre'}
                    >
                      {entry.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Bouton Supprimer */}
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      className="p-2 rounded-lg text-charcoal-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contenu : Vocal ou Texte */}
                {entry.type === 'audio' ? (
                  <div className="mt-2">
                    <WaveformPlayer
                      src={entry.audio_path}
                      waveform={entry.waveform}
                      durationSec={entry.duration_sec}
                      guestName={entry.guest_name}
                    />
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl bg-[#FAF6F8]/60 border border-stone-200/50 p-4">
                    <p className="text-sm text-charcoal-800 leading-relaxed font-serif italic">
                      « {entry.body} »
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Paramètres ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div>
              <h3 className="font-serif text-charcoal-900 text-xl font-normal">
                Paramètres du Livre d’Or
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Ajustez le titre ou la durée maximale des enregistrements vocaux.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-charcoal-500 font-medium block">
                  Titre du livre d’or
                </label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-charcoal-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-charcoal-500 font-medium block">
                  Durée maximale par message vocal
                </label>
                <select
                  value={settingsMaxDuration}
                  onChange={(e) => setSettingsMaxDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-charcoal-900 focus:outline-none focus:border-rose-500 bg-white"
                >
                  <option value={60}>1 minute (court & spontané)</option>
                  <option value={120}>2 minutes (recommandé)</option>
                  <option value={180}>3 minutes (messages longs)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-charcoal-600 hover:bg-stone-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
