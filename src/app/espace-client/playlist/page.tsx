'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Disc3,
  Share2,
  FileDown,
  Flame,
  Ban,
  Clock,
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* ── En-tête de page éditorial ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase">
              LE OUI PARFAIT • DIRECTION ARTISTIQUE
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-normal text-stone-900 tracking-tight"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            PLAYLIST & BRIEFING DJ
          </h1>
          <p
            className="text-rose-600 text-lg sm:text-xl mt-1"
            style={{ fontFamily: "'Mrs Saint Delafield', cursive" }}
          >
            {coupleNames}
          </p>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleDirectDownloadPdf}
            disabled={downloadingPdf || busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold tracking-wider uppercase bg-white text-stone-800 border border-stone-300 hover:border-stone-500 hover:text-stone-950 transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-600" />
            <span>{downloadingPdf ? 'Export PDF…' : 'Briefing PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wider uppercase bg-stone-900 text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-rose-300" />
            <span>Partager au DJ</span>
          </button>
        </div>
      </div>

      {/* ── Bandeau métriques & synthèse ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFEFC] border border-stone-200/80 p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 block">
            TOTAL TITRES
          </span>
          <p
            className="text-2xl sm:text-3xl font-normal text-stone-900 mt-1"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            {stats.total}
          </p>
        </div>

        <div className="bg-[#FFFEFC] border border-stone-200/80 p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-rose-700 block flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-600" />
            MUST-PLAY
          </span>
          <p
            className="text-2xl sm:text-3xl font-normal text-rose-700 mt-1"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            {stats.must_play}
          </p>
        </div>

        <div className="bg-[#FFFEFC] border border-stone-200/80 p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-red-700 block flex items-center gap-1">
            <Ban className="w-3 h-3 text-red-600" />
            BLACKLIST
          </span>
          <p
            className="text-2xl sm:text-3xl font-normal text-stone-900 mt-1"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            {stats.banned}
          </p>
        </div>

        <div className="bg-[#FFFEFC] border border-stone-200/80 p-3 sm:p-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 block flex items-center gap-1">
            <Clock className="w-3 h-3 text-stone-400" />
            MOMENTS
          </span>
          <p
            className="text-2xl sm:text-3xl font-normal text-stone-900 mt-1"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            {playlist?.sections.length ?? 0}
          </p>
        </div>
      </div>

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
