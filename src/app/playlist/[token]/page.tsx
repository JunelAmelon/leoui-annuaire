'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Disc3,
  Flame,
  Ban,
  Clock,
  FileDown,
  Play,
  AlertTriangle,
} from 'lucide-react';
import type {
  PlaylistTrack,
  PlaylistStats,
  WeddingPlaylist,
} from '@/features/playlist/domain/types';
import { generateDjBriefingPdf } from '@/features/playlist/services/playlist-pdf.service';
import { VinylPlayerCard } from '@/features/playlist/ui/VinylPlayerCard';

interface EventInfo {
  couple_names: string;
  wedding_date?: string;
  venue_name?: string;
}

export default function DjPublicBriefingPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<WeddingPlaylist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [stats, setStats] = useState<PlaylistStats | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [activeTrack, setActiveTrack] = useState<PlaylistTrack | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const fetchBriefing = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/playlist/${token}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || 'Briefing DJ introuvable ou lien expiré.');
        }

        const data = await res.json();
        if (!active) return;

        setPlaylist(data.playlist);
        setTracks(data.tracks || []);
        setStats(data.stats);
        setEventInfo(data.event || { couple_names: '' });

        if (data.playlist?.sections?.length > 0) {
          setActiveSectionId(data.playlist.sections[0].id);
        }
        if (data.tracks?.length > 0) {
          setActiveTrack(data.tracks[0]);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Erreur lors du chargement du briefing.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBriefing();
    return () => {
      active = false;
    };
  }, [token]);

  const activeSection = useMemo(() => {
    return playlist?.sections.find((s) => s.id === activeSectionId) || playlist?.sections[0];
  }, [playlist?.sections, activeSectionId]);

  const activeSectionTracks = useMemo(() => {
    if (!activeSection) return [];
    return tracks.filter((t) => t.section_id === activeSection.id);
  }, [tracks, activeSection]);

  const bannedTracks = useMemo(() => {
    return tracks.filter((t) => t.flag === 'banned');
  }, [tracks]);

  const handleDownloadPdf = async () => {
    if (!playlist) return;
    try {
      setDownloadingPdf(true);
      await generateDjBriefingPdf({
        playlist,
        tracks,
        coupleNames: eventInfo?.couple_names || 'Mariage',
        eventDate: eventInfo?.wedding_date,
        venueName: eventInfo?.venue_name,
      });
    } catch (err) {
      console.error('Erreur PDF DJ:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141211] text-stone-200 flex flex-col items-center justify-center p-4">
        <Disc3 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
        <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
          Chargement du briefing musical…
        </p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-[#141211] text-stone-200 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h1
          className="text-2xl font-serif text-white mb-2"
          style={{ fontFamily: "'Bodoni Moda', serif" }}
        >
          Accès DJ non disponible
        </h1>
        <p className="text-sm text-stone-400 max-w-md">
          {error || 'Ce lien de briefing musical a été révoqué ou a expiré. Veuillez contacter les mariés pour obtenir un nouveau lien valide.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141211] text-stone-100 selection:bg-rose-900 selection:text-white">
      {/* ── Top Bar DJ Booth ── */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Disc3 className="w-6 h-6 text-rose-500 animate-spin-slow" />
            <div>
              <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-rose-400 block">
                LE OUI PARFAIT • CONSOLE DJ OFFICIELLE
              </span>
              <h2
                className="text-base sm:text-lg font-medium text-white truncate"
                style={{ fontFamily: "'Bodoni Moda', serif" }}
              >
                {eventInfo?.couple_names || 'Briefing Mariage'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors shrink-0"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">
              {downloadingPdf ? 'Export…' : 'Briefing PDF'}
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Alerte Blacklist Formelle ── */}
        {bannedTracks.length > 0 && (
          <div className="bg-red-950/70 border border-red-700/80 p-4 sm:p-5 rounded-sm">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-bold tracking-widest uppercase text-red-300">
                ATTENTION DJ — TITRES FORMELLEMENT INTERDITS (BLACKLIST)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              {bannedTracks.map((bt) => (
                <div
                  key={bt.id}
                  className="bg-black/40 border border-red-900/60 p-2.5 text-xs"
                >
                  <p className="font-semibold text-red-200 truncate">
                    ✕ {bt.title}
                  </p>
                  <p className="text-[11px] text-stone-400 italic truncate">
                    {bt.artist}
                  </p>
                  {bt.notes && (
                    <p className="text-[10px] text-red-400 mt-1">
                      Raison : {bt.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lecteur Studio pour le DJ ── */}
        <div className="border border-stone-800 bg-stone-900/90 shadow-xl">
          <VinylPlayerCard
            track={activeTrack}
            sectionLabel={activeSection?.label}
          />
        </div>

        {/* ── Déroulé par Moments & Morceaux ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6 items-start">
          {/* Sommaire des moments */}
          <div className="bg-stone-900/70 border border-stone-800 p-3 space-y-1.5">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400 block px-2 py-1">
              MOMENTS DU MARIAGE
            </span>
            {playlist.sections.map((section, idx) => {
              const isActive = section.id === activeSectionId;
              const count = tracks.filter((t) => t.section_id === section.id).length;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    const first = tracks.find((t) => t.section_id === section.id);
                    if (first) setActiveTrack(first);
                  }}
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 text-xs transition-colors ${
                    isActive
                      ? 'bg-rose-900/40 text-white border-l-2 border-rose-500 font-semibold'
                      : 'text-stone-300 hover:bg-stone-800/60'
                  }`}
                >
                  <span className="truncate">
                    0{idx + 1}. {section.label}
                  </span>
                  <span className="font-mono text-[11px] text-stone-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Liste des titres de la section */}
          <div className="bg-stone-900/70 border border-stone-800 divide-y divide-stone-800">
            <div className="p-4 flex items-center justify-between bg-stone-950/40">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-rose-400 block">
                  PROGRAMMATION DJ
                </span>
                <h3
                  className="text-lg font-serif text-white uppercase"
                  style={{ fontFamily: "'Bodoni Moda', serif" }}
                >
                  {activeSection?.label}
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {activeSectionTracks.length} titre(s)
              </span>
            </div>

            {activeSectionTracks.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs italic">
                Carte blanche pour ce moment ou aucun titre sélectionné.
              </div>
            ) : (
              activeSectionTracks.map((track) => {
                const isPlaying = activeTrack?.id === track.id;

                return (
                  <div
                    key={track.id}
                    className={`p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 transition-colors ${
                      isPlaying ? 'bg-rose-950/30' : 'hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveTrack(track)}
                        className={`w-8 h-8 flex items-center justify-center shrink-0 border transition-colors ${
                          isPlaying
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                        }`}
                        title="Sélectionner dans le lecteur"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-medium text-white truncate">
                            {track.title}
                          </span>
                          {track.flag === 'must_play' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-rose-950 text-rose-300 border border-rose-700">
                              <Flame className="w-2.5 h-2.5 text-rose-400" />
                              MUST-PLAY
                            </span>
                          )}
                          {track.flag === 'banned' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-red-950 text-red-300 border border-red-700">
                              <Ban className="w-2.5 h-2.5 text-red-400" />
                              INTERDIT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 italic truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {track.cue_time && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 border border-rose-900/60">
                          <Clock className="w-3 h-3" />
                          Lancer à {track.cue_time}
                        </div>
                      )}
                      {track.notes && (
                        <p className="text-[10px] text-stone-300 italic mt-0.5 max-w-xs truncate">
                          « {track.notes} »
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
