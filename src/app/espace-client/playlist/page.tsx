'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Disc3,
  Share2,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { FirestorePlaylistRepository } from '@/features/playlist/repositories/firestore-playlist.repository';
import { PlaylistService } from '@/features/playlist/services/playlist.service';
import { generateDjBriefingPdf } from '@/features/playlist/services/playlist-pdf.service';
import type {
  DayPlanMomentRef,
  PlaylistTrack,
  WeddingPlaylist,
} from '@/features/playlist/domain/types';
import { computePlaylistStats, formatMomentTime } from '@/features/playlist/domain/playlist-rules';
import { formatLongDate } from '@/features/day-plan/domain/timeline';
import { VinylPlayerCard } from '@/features/playlist/ui/VinylPlayerCard';
import { SectionSelector } from '@/features/playlist/ui/SectionSelector';
import { TrackListTable } from '@/features/playlist/ui/TrackListTable';
import { AddTrackModal } from '@/features/playlist/ui/AddTrackModal';
import { DjShareModal } from '@/features/playlist/ui/DjShareModal';
import { BlacklistSummaryCard } from '@/features/playlist/ui/BlacklistSummaryCard';

const repository = new FirestorePlaylistRepository();
const playlistService = new PlaylistService({
  reader: repository,
  writer: repository,
  tracks: repository,
  moments: repository,
});

export default function CouplePlaylistPage() {
  const { user } = useAuth();
  const { event, client, loading: clientLoading } = useClientData();

  const [playlist, setPlaylist] = useState<WeddingPlaylist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [moments, setMoments] = useState<DayPlanMomentRef[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [activeTrack, setActiveTrack] = useState<PlaylistTrack | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const eventId = event?.id || client?.id;
  const ownerId = user?.uid || (event as any)?.owner_id || client?.id || '';
  const eventDate = event?.event_date || client?.event_date;
  const venueName = event?.venue || (client as any)?.venue || (client as any)?.reception_venue;

  const coupleNames =
    event?.couple_names ||
    (client ? `${client.name}${client.partner ? ` & ${client.partner}` : ''}` : 'Notre Mariage');

  // Chargement des données
  useEffect(() => {
    if (clientLoading) return;
    if (!eventId || !ownerId) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        const [loadedPlaylist, loadedTracks, loadedMoments] = await Promise.all([
          playlistService.getOrInitPlaylist(eventId, ownerId),
          playlistService.listTracks(eventId),
          playlistService.listMusicalMoments(eventId),
        ]);

        if (!active) return;
        setPlaylist(loadedPlaylist);
        setTracks(loadedTracks);
        setMoments(loadedMoments);

        // Définir la section active par défaut
        if (loadedPlaylist.sections.length > 0) {
          setActiveSectionId((prev) =>
            prev && loadedPlaylist.sections.some((s) => s.id === prev)
              ? prev
              : loadedPlaylist.sections[0].id
          );
        }

        // Définir le premier morceau actif par défaut si disponible
        if (loadedTracks.length > 0) {
          setActiveTrack((prev) => prev ?? loadedTracks[0]);
        }
      } catch (err) {
        console.error('Erreur chargement playlist:', err);
        if (active) toast.error('Impossible de charger la playlist du mariage.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [clientLoading, eventId, ownerId]);

  // Section courante & pistes
  const activeSection = useMemo(() => {
    return playlist?.sections.find((s) => s.id === activeSectionId) || playlist?.sections[0];
  }, [playlist?.sections, activeSectionId]);

  const activeSectionTracks = useMemo(() => {
    if (!activeSection) return [];
    return tracks.filter((t) => t.section_id === activeSection.id);
  }, [tracks, activeSection]);

  const stats = useMemo(() => {
    return computePlaylistStats(tracks);
  }, [tracks]);

  const momentsMap = useMemo(() => {
    return new Map(moments.map((m) => [m.id, m]));
  }, [moments]);

  const activeMomentTiming = useMemo(() => {
    if (!activeSection?.linked_moment_id) return null;
    const m = momentsMap.get(activeSection.linked_moment_id);
    return m ? formatMomentTime(m.start_at) : null;
  }, [activeSection, momentsMap]);

  // Gestion des actions
  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const firstSectionTrack = tracks.find((t) => t.section_id === sectionId);
    if (firstSectionTrack) {
      setActiveTrack(firstSectionTrack);
    }
  };

  const handleAddSection = async (
    label: string,
    linkedMomentId?: string | null
  ): Promise<boolean> => {
    if (!eventId || !playlist) return false;
    try {
      setBusy(true);
      const newSection = await playlistService.addSection(eventId, label, linkedMomentId);
      setPlaylist((prev) => (prev ? { ...prev, sections: [...prev.sections, newSection] } : prev));
      setActiveSectionId(newSection.id);
      toast.success(`Moment « ${label} » ajouté.`);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout du moment.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSection = async (sectionId: string): Promise<boolean> => {
    if (!eventId || !playlist) return false;
    try {
      setBusy(true);
      const nextSections = await playlistService.removeSection(eventId, sectionId);
      setPlaylist((prev) => (prev ? { ...prev, sections: nextSections } : prev));
      // Recharger les pistes car celles de la section supprimée ont été effacées
      const reloadedTracks = await playlistService.listTracks(eventId);
      setTracks(reloadedTracks);
      if (nextSections.length > 0) {
        setActiveSectionId(nextSections[0].id);
      }
      toast.success('Moment retiré.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleLinkMoment = async (
    sectionId: string,
    momentId: string | null
  ): Promise<boolean> => {
    if (!eventId || !playlist) return false;
    try {
      setBusy(true);
      const nextSections = await playlistService.updateSection(eventId, sectionId, {
        linked_moment_id: momentId,
      });
      setPlaylist((prev) => (prev ? { ...prev, sections: nextSections } : prev));
      toast.success('Liaison avec le planning mise à jour.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur de liaison.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddTrack = async (
    input: Omit<PlaylistTrack, 'id' | 'created_at' | 'order' | 'section_id'>
  ): Promise<boolean> => {
    if (!eventId || !activeSection) return false;
    try {
      setBusy(true);
      const newTrack = await playlistService.addTrack(eventId, {
        ...input,
        section_id: activeSection.id,
      });
      setTracks((prev) => [...prev, newTrack]);
      setActiveTrack(newTrack);
      toast.success(`« ${newTrack.title} » ajouté à la playlist.`);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout du morceau.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTrack = async (
    trackId: string,
    patch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    if (!eventId) return false;
    try {
      setBusy(true);
      await playlistService.updateTrack(eventId, trackId, patch);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t))
      );
      if (activeTrack?.id === trackId) {
        setActiveTrack((prev) => (prev ? { ...prev, ...patch } : prev));
      }
      toast.success('Morceau mis à jour.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la mise à jour.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!eventId) return;
    try {
      setBusy(true);
      await playlistService.removeTrack(eventId, trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (activeTrack?.id === trackId) {
        setActiveTrack(null);
      }
      toast.success('Morceau retiré.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  const handleReorderTracks = async (
    updates: Array<{ id: string; order: number }>
  ) => {
    if (!eventId || !activeSection) return;
    try {
      const orderMap = new Map(updates.map((u) => [u.id, u.order]));
      setTracks((prev) =>
        prev.map((t) =>
          orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t
        )
      );
      await playlistService.reorderTracks(
        eventId,
        activeSection.id,
        updates.map((u) => u.id)
      );
    } catch (err: any) {
      toast.error(err?.message || 'Erreur de réorganisation.');
    }
  };

  const handleUnbanTrack = async (trackId: string) => {
    await handleUpdateTrack(trackId, { flag: 'normal' });
  };

  const handleGenerateDjToken = async (): Promise<string | null> => {
    if (!eventId) return null;
    try {
      setBusy(true);
      const token = await playlistService.generateDjShareToken(eventId);
      setPlaylist((prev) =>
        prev ? { ...prev, dj_share_token: token, dj_token_revoked_at: null } : prev
      );
      toast.success('Nouveau lien DJ généré.');
      return token;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur de génération du lien.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeDjToken = async (): Promise<boolean> => {
    if (!eventId) return false;
    try {
      setBusy(true);
      await playlistService.revokeDjShareToken(eventId);
      setPlaylist((prev) =>
        prev ? { ...prev, dj_token_revoked_at: new Date().toISOString() } : prev
      );
      toast.success('Accès DJ révoqué.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la révocation.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDirectDownloadPdf = async () => {
    if (!playlist) return;
    try {
      setDownloadingPdf(true);
      await generateDjBriefingPdf({
        playlist,
        tracks,
        coupleNames,
        eventDate,
        venueName,
        moments,
      });
      toast.success('Briefing DJ téléchargé en PDF.');
    } catch (err) {
      console.error('Erreur PDF:', err);
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Disc3 className="w-8 h-8 text-rose-600 animate-spin" />
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-500">
          Chargement de votre programmation musicale…
        </p>
      </div>
    );
  }

  const heroStats: Array<{ label: string; value: number; tone?: 'rose' | 'red' }> = [
    { label: 'Titres', value: stats.total },
    { label: 'Must-play', value: stats.must_play, tone: 'rose' },
    { label: 'Blacklist', value: stats.banned, tone: 'red' },
    { label: 'Moments', value: playlist?.sections.length ?? 0 },
  ];

  const outline = 'inline-flex items-center justify-center gap-2 h-11 px-5 border border-stone-300 text-charcoal-800 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm';

  return (
    <div className="space-y-6 pb-20">
      {/* ── En-tête hero (pattern Jour J / Menu) ── */}
      <header className="relative bg-white border border-stone-200 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_24rem]">
          <div className="px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-7">
            <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-rose-600">
              La playlist
            </p>
            <h1
              className="font-serif text-charcoal-900 mt-3 leading-none"
              style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}
            >
              Playlist &amp; briefing DJ
            </h1>
            <p
              className="text-rose-600 mt-2 leading-tight"
              style={{ fontFamily: "'Mrs Saint Delafield', cursive", fontSize: '1.45rem' }}
            >
              {coupleNames}
            </p>
            {eventDate && (
              <p className="text-[15px] text-charcoal-500 mt-1 first-letter:uppercase">
                {formatLongDate(eventDate)}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700 transition-colors rounded-sm"
              >
                <Share2 className="w-4 h-4" /> Partager au DJ
              </button>
              <button
                type="button"
                onClick={handleDirectDownloadPdf}
                disabled={downloadingPdf || busy}
                className={`${outline} disabled:opacity-40`}
              >
                <FileDown className="w-4 h-4" />
                {downloadingPdf ? 'Export…' : 'Briefing PDF'}
              </button>
            </div>
          </div>

          <div className="relative order-first lg:order-none h-44 sm:h-56 lg:h-auto lg:min-h-[17rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/playlist-cover.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-[50%_40%]"
            />
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent hidden lg:block" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1A1013]/85 to-transparent" />
            <p
              className="absolute bottom-4 sm:bottom-5 right-5 sm:right-6 left-5 lg:left-10 text-right font-serif italic text-white text-base sm:text-lg leading-snug"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
            >
              « La musique est la mémoire la plus fidèle d’une soirée. »
            </p>
          </div>
        </div>

        {/* Synthèse en onglets (pattern Jour J) */}
        <nav
          className="flex gap-x-8 px-5 sm:px-9 lg:px-12 border-t border-stone-200 overflow-x-auto subtle-scroll"
          aria-label="Synthèse de la playlist"
        >
          {heroStats.map((s) => (
            <div key={s.label} className="py-4 whitespace-nowrap">
              <span className="flex items-baseline gap-2 text-[14px]">
                <span className="text-charcoal-500">{s.label}</span>
                <span
                  className={`tabular-nums font-medium ${
                    s.tone === 'rose' ? 'text-rose-600' : s.tone === 'red' ? 'text-red-700' : 'text-charcoal-900'
                  }`}
                >
                  {s.value}
                </span>
              </span>
            </div>
          ))}
        </nav>
      </header>

      <div className="space-y-6 px-4 sm:px-6 max-w-7xl mx-auto w-full">

      {/* ── Studio d'écoute vinyle & Canvas ── */}
      <VinylPlayerCard
        track={activeTrack}
        sectionLabel={activeSection?.label}
        momentTiming={activeMomentTiming}
      />

      {/* ── Grille principale : Sommaire moments (gauche) & Liste des titres (droite) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 lg:gap-8 items-start">
        {/* Colonne gauche : navigation des moments du mariage */}
        <aside className="bg-[#FFFEFC] border border-stone-200/80 p-4">
          <SectionSelector
            sections={playlist?.sections ?? []}
            activeSectionId={activeSectionId}
            tracks={tracks}
            moments={moments}
            busy={busy}
            onSelectSection={handleSelectSection}
            onAddSection={handleAddSection}
            onRemoveSection={handleRemoveSection}
            onLinkMoment={handleLinkMoment}
          />
        </aside>

        {/* Colonne droite : Titres du moment + Blacklist */}
        <div className="space-y-6">
          <TrackListTable
            tracks={activeSectionTracks}
            activeTrackId={activeTrack?.id}
            busy={busy}
            onPlayTrack={(t) => setActiveTrack(t)}
            onUpdateTrack={handleUpdateTrack}
            onRemoveTrack={handleRemoveTrack}
            onReorder={handleReorderTracks}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

          {/* Section d'alerte Blacklist globale si présente */}
          <BlacklistSummaryCard
            tracks={tracks}
            onRemoveTrack={handleRemoveTrack}
            onUnbanTrack={handleUnbanTrack}
          />
        </div>
      </div>
      </div>

      {/* ── Modales ── */}
      <AddTrackModal
        isOpen={isAddModalOpen}
        sectionLabel={activeSection?.label ?? 'Moment'}
        busy={busy}
        onClose={() => setIsAddModalOpen(false)}
        onAddTrack={handleAddTrack}
      />

      <DjShareModal
        isOpen={isShareModalOpen}
        playlist={playlist}
        tracks={tracks}
        moments={moments}
        coupleNames={coupleNames}
        eventDate={eventDate}
        venueName={venueName}
        busy={busy}
        onClose={() => setIsShareModalOpen(false)}
        onGenerateToken={handleGenerateDjToken}
        onRevokeToken={handleRevokeDjToken}
      />
    </div>
  );
}
