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
import { GuestbookSettingsModal, type SettingsSaveInput } from '@/features/guestbook/ui/GuestbookSettingsModal';
import { resolveCardDesign, type CardFallback } from '@/features/guestbook/domain/customization';
import { uploadFile } from '@/lib/storage';
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

  /** Valeurs du mariage utilisées quand le couple laisse un champ « automatique » vide. */
  const cardFallback: CardFallback = {
    names: coupleNames.replace(/\s*&\s*/, ' + '),
    place: (event as any)?.venue || '',
    date: event?.event_date
      ? new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
  };

  const handleSaveSettings = async (input: SettingsSaveInput) => {
    if (!guestbook) return;
    try {
      await service.updateTitle(guestbook.event_id, input.title);
      await repository.updateSettings(guestbook.event_id, { max_duration_sec: Number(input.maxDuration) });
      await service.updatePageContent(guestbook.event_id, input.page);
      await service.updateCardDesign(guestbook.event_id, input.card);
      toast.success('Personnalisation enregistrée.');
      setShowSettingsModal(false);
      loadGuestbookData();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
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
        event?.event_date,
        cardFallback.place
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
      await GuestbookPdfService.generateTableCards(guestbook, resolveCardDesign(guestbook.card, cardFallback));
      toast.success('Cartes de table PDF prêtes à imprimer !');
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

  // Gestion du lecteur Podcast : une seule lecture à la fois
  useEffect(() => {
    const handleStopOther = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== 'podcast' && podcastAudioRef.current && !podcastAudioRef.current.paused) {
        podcastAudioRef.current.pause();
        setIsPodcastPlaying(false);
      }
    };
    window.addEventListener('guestbook-stop-other-audios', handleStopOther);
    return () => window.removeEventListener('guestbook-stop-other-audios', handleStopOther);
  }, []);
  const currentPodcastTrack = podcastIndex !== null ? audioEntries[podcastIndex] : null;

  const startPodcast = (index = 0) => {
    if (audioEntries.length === 0) {
      toast.info('Aucun message vocal disponible pour la lecture continue.');
      return;
    }
    window.dispatchEvent(new CustomEvent('guestbook-stop-other-audios', { detail: { id: 'podcast' } }));
    setPodcastIndex(index);
    setIsPodcastPlaying(true);
  };

  const stopPodcast = () => {
    if (podcastAudioRef.current) {
      podcastAudioRef.current.pause();
    }
    setPodcastIndex(null);
    setIsPodcastPlaying(false);
  };

  const handlePodcastNext = () => {
    if (podcastIndex !== null && podcastIndex + 1 < audioEntries.length) {
      setPodcastIndex(podcastIndex + 1);
      setIsPodcastPlaying(true);
    } else {
      stopPodcast();
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
          cardDesign={resolveCardDesign(guestbook.card, cardFallback)}
          onDownloadFlyer={handleDownloadFlyerPdf}
          onCustomize={() => setShowSettingsModal(true)}
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
            onClick={() => (podcastIndex === null ? startPodcast(0) : stopPodcast())}
            className="ml-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white hover:bg-white/20 transition-colors flex-shrink-0 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-rose-300" />
            {podcastIndex !== null ? 'Arrêter' : `Écouter tout (${totalAudio})`}
          </button>
        )}
      </div>

      {/* ── Filtres de la liste ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'all'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
          }`}
        >
          Tous ({entries.filter((e) => !e.hidden).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('audio')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'audio'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
          }`}
        >
          Vocaux ({totalAudio})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('text')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'text'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
          }`}
        >
          Écrits ({totalText})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'favorites'
              ? 'bg-rose-600 text-white'
              : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
          }`}
        >
          Favoris ({totalFavorites})
        </button>
        {totalHidden > 0 && (
          <button
            type="button"
            onClick={() => setFilterType('hidden')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              filterType === 'hidden'
                ? 'bg-stone-700 text-white'
                : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
            }`}
          >
            Masqués ({totalHidden})
          </button>
        )}
      </div>

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
              onError={() => {
                toast.error('Impossible de lire ce message vocal.');
                handlePodcastNext();
              }}
              className="hidden"
            />
            <button type="button" onClick={handlePodcastPrev} disabled={podcastIndex === 0}
              className="p-1.5 text-white/60 hover:text-white transition-colors disabled:opacity-30 cursor-pointer" title="Précédent">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!podcastAudioRef.current) return;
                if (isPodcastPlaying) { podcastAudioRef.current.pause(); setIsPodcastPlaying(false); }
                else { podcastAudioRef.current.play(); setIsPodcastPlaying(true); }
              }}
              className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-500 transition-colors cursor-pointer"
              title={isPodcastPlaying ? 'Pause' : 'Lecture'}
            >
              {isPodcastPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <button type="button" onClick={handlePodcastNext}
              className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer" title="Suivant">
              <SkipForward className="w-4 h-4" />
            </button>
            <button type="button" onClick={stopPodcast}
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors cursor-pointer" title="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des messages — journal éditorial : date à gauche, parole à droite ── */}
      {filteredEntries.length === 0 ? (
        <div className="border border-dashed border-stone-300 rounded-2xl py-14 px-6 text-center">
          <p className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>Aucun message pour l’instant</p>
          <p className="text-sm text-charcoal-500 max-w-sm mx-auto leading-relaxed mt-2">
            Posez les cartes sur les tables : les premiers mots de vos proches apparaîtront ici.
          </p>
        </div>
      ) : (
        <div>
          {filteredEntries.map((entry) => {
            const d = new Date(entry.created_at);
            const day = d.getDate();
            const month = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
            const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return (
              <article
                key={entry.id}
                className={`group grid grid-cols-[3.2rem_1fr] sm:grid-cols-[5rem_1fr] gap-x-4 sm:gap-x-7 py-7 border-t border-charcoal-100 first:border-t-0 first:pt-2 ${entry.hidden ? 'opacity-45' : ''}`}
              >
                <div className="pt-1 text-center sm:text-left">
                  <p className="font-serif text-charcoal-900 leading-none" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 400 }}>{day}</p>
                  <p className="text-[10px] tracking-[0.16em] uppercase text-charcoal-400 mt-1.5">{month}</p>
                  <p className="text-[10px] text-charcoal-300 mt-0.5 tabular-nums">{time}</p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-serif text-charcoal-900 text-xl leading-snug" style={{ fontWeight: 500 }}>{entry.guest_name}</h3>
                      <p className="text-[10px] font-semibold tracking-[0.16em] uppercase mt-1 text-rose-600">
                        {entry.type === 'audio' ? `Message vocal${entry.duration_sec ? ` · ${fmtDur(entry.duration_sec)}` : ''}` : 'Mot écrit'}
                        {entry.hidden && <span className="text-charcoal-400"> · masqué</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 -mr-2 sm:opacity-40 sm:group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => handleToggleFavorite(entry)}
                        className={`p-2 rounded-md transition-colors ${entry.favorite ? 'text-rose-600' : 'text-charcoal-400 hover:text-rose-600'}`}
                        title={entry.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-label="Favori">
                        <Heart className={`w-[18px] h-[18px] ${entry.favorite ? 'fill-rose-600' : ''}`} />
                      </button>
                      <button type="button" onClick={() => handleToggleHidden(entry)}
                        className="p-2 rounded-md text-charcoal-400 hover:text-charcoal-800 transition-colors"
                        title={entry.hidden ? 'Rendre visible' : 'Masquer du livre'} aria-label="Masquer">
                        {entry.hidden ? <Eye className="w-[18px] h-[18px]" /> : <EyeOff className="w-[18px] h-[18px]" />}
                      </button>
                      <button type="button" onClick={() => handleDeleteEntry(entry)}
                        className="p-2 rounded-md text-charcoal-300 hover:text-rose-600 transition-colors" title="Supprimer définitivement" aria-label="Supprimer">
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>

                  {entry.type === 'audio' ? (
                    <div className="mt-4 max-w-xl border-y border-charcoal-100 py-3">
                      <WaveformPlayer src={entry.audio_path} waveform={entry.waveform} durationSec={entry.duration_sec} guestName={entry.guest_name} />
                    </div>
                  ) : (
                    <p className="mt-3 font-serif italic text-charcoal-700 leading-[1.7] max-w-2xl" style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)' }}>
                      <span className="text-rose-500 mr-0.5">«</span>&nbsp;{entry.body}&nbsp;<span className="text-rose-500">»</span>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Modal Paramètres : aperçu à gauche, formulaire à droite ── */}
      {showSettingsModal && guestbook && (
        <GuestbookSettingsModal
          guestbook={guestbook}
          fallback={cardFallback}
          publicUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/livre-or/${guestbook.public_token}`}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
          onUploadCover={(file) => uploadFile(file, `guestbooks/${guestbook.event_id}`)}
        />
      )}
    </div>
  );
}
