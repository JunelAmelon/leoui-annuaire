'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import {
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
  PenLine,
  User,
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

  const fmtDur = (s?: number) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '';

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-16">
      {/* ── En-tête — même DA que les autres pages ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="label-xs text-rose-600 mb-2 tracking-[0.1em]">Souvenirs</p>
          <h1
            className="font-serif text-charcoal-900"
            style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 400, letterSpacing: '-0.01em' }}
          >
            {guestbook?.title || 'Livre d’or'}
          </h1>
          <p className="text-sm text-charcoal-500 mt-2 max-w-xl leading-relaxed">
            Les mots doux et les voix de vos proches, recueillis le jour de votre mariage.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportBookPdf}
            disabled={exportingBookPdf || entries.filter((e) => !e.hidden).length === 0}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            {exportingBookPdf ? 'Génération…' : 'Exporter en PDF'}
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Paramètres
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

      {/* ── Bandeau stats sombre + écoute ── */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-charcoal-900 rounded-xl px-5 py-3.5 overflow-x-auto scrollbar-none">
        {[
          { n: entries.filter((e) => !e.hidden).length, l: 'reçus' },
          { n: totalAudio, l: 'vocaux', accent: true },
          { n: totalText, l: 'écrits' },
          { n: totalFavorites, l: 'favoris', accent: true },
        ].map((s, i) => (
          <span key={i} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`font-serif text-lg ${s.accent ? 'text-rose-300' : 'text-white'}`}>{s.n}</span>
            <span className="text-[11px] text-white/50">{s.l}</span>
            {i < 3 && <span className="text-white/15 ml-3">·</span>}
          </span>
        ))}

        {totalAudio > 0 && (
          <button
            type="button"
            onClick={() => (podcastIndex === null ? startPodcast(0) : setPodcastIndex(null))}
            className="ml-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white hover:bg-white/20 transition-colors flex-shrink-0"
          >
            <Radio className="w-3.5 h-3.5 text-rose-300" />
            {podcastIndex !== null ? 'Arrêter' : `Écouter tout (${totalAudio})`}
          </button>
        )}
      </div>

      {/* ── (Filtres supprimés) ── */}

      {/* ── Lecteur continu — barre fine ── */}
      {podcastIndex !== null && currentPodcastTrack && (
        <div className="flex items-center justify-between gap-4 py-3 px-4 bg-charcoal-900 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.15em] text-rose-300 font-semibold flex-shrink-0">
              {podcastIndex + 1}/{audioEntries.length}
            </span>
            <div className="min-w-0">
              <p className="font-serif text-white text-sm truncate">{currentPodcastTrack.guest_name}</p>
              {currentPodcastTrack.duration_sec && (
                <p className="text-[11px] text-white/40 tabular-nums">{fmtDur(currentPodcastTrack.duration_sec)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <audio
              ref={podcastAudioRef}
              src={currentPodcastTrack.audio_path || undefined}
              autoPlay
              onEnded={handlePodcastNext}
              className="hidden"
            />
            <button type="button" onClick={handlePodcastPrev} disabled={podcastIndex === 0}
              className="p-1.5 text-white/60 hover:text-white transition-colors disabled:opacity-30" title="Précédent">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!podcastAudioRef.current) return;
                if (isPodcastPlaying) { podcastAudioRef.current.pause(); setIsPodcastPlaying(false); }
                else { podcastAudioRef.current.play(); setIsPodcastPlaying(true); }
              }}
              className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 transition-colors"
              title={isPodcastPlaying ? 'Pause' : 'Lecture'}
            >
              {isPodcastPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button type="button" onClick={handlePodcastNext}
              className="p-1.5 text-white/60 hover:text-white transition-colors" title="Suivant">
              <SkipForward className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setPodcastIndex(null)}
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors" title="Fermer">
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
                className={`flex gap-3.5 pb-6 border-b border-charcoal-100 last:border-b-0 ${
                  entry.hidden ? 'opacity-50' : ''
                }`}
              >
                {/* Avatar neutre — icône profil */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0 flex items-center justify-center bg-stone-100 text-charcoal-500">
                  <User className="w-6 h-6" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  {/* Ligne haute : Nom, Date & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-serif text-charcoal-900 text-lg leading-snug truncate">
                          {entry.guest_name}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            entry.type === 'audio'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-champagne-50 text-charcoal-600 border-champagne-200'
                          }`}
                        >
                          {entry.type === 'audio' ? 'Vocal' : 'Écrit'}
                        </span>
                      </div>
                      <p className="text-[11px] text-charcoal-400 mt-1">{formattedDate}</p>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
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
                      <button
                        type="button"
                        onClick={() => handleToggleHidden(entry)}
                        className="p-2 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-stone-50 transition-colors"
                        title={entry.hidden ? 'Rendre visible' : 'Masquer du livre'}
                      >
                        {entry.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
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
                    <div className="mt-3 rounded-xl bg-[#FAF6F2] border border-stone-100 px-4 py-3">
                      <WaveformPlayer
                        src={entry.audio_path}
                        waveform={entry.waveform}
                        durationSec={entry.duration_sec}
                        guestName={entry.guest_name}
                      />
                    </div>
                  ) : (
                    <blockquote className="mt-3 rounded-lg bg-[#FAF6F2]/70 px-3.5 py-2.5">
                      <p className="text-[13px] text-charcoal-700 leading-relaxed font-serif italic">
                        « {entry.body} »
                      </p>
                    </blockquote>
                  )}
                </div>
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
