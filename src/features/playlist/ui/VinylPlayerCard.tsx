'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Flame,
  Ban,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import type { PlaylistTrack } from '../domain/types';

interface VinylPlayerCardProps {
  track: PlaylistTrack | null;
  sectionLabel?: string;
  momentTiming?: string | null;
  onNext?: () => void;
  onPrev?: () => void;
}

function parseCueToSeconds(cue?: string | null): number {
  if (!cue) return 0;
  const parts = cue.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  const parsed = parseInt(cue, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function VinylPlayerCard({
  track,
  sectionLabel,
  momentTiming,
}: VinylPlayerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(null);
  const [resolvingPreview, setResolvingPreview] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTriedRef = useRef(false);

  const effectivePreviewUrl = resolvedPreviewUrl || track?.preview_url || null;

  const fetchFallbackPreview = async (title: string, artist: string) => {
    try {
      setResolvingPreview(true);
      const res = await fetch(
        `/api/playlist/preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.preview_url ? String(data.preview_url) : null;
    } catch {
      return null;
    } finally {
      setResolvingPreview(false);
    }
  };

  // Synchronise audio track change & résout un extrait si absent
  useEffect(() => {
    let active = true;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setResolvedPreviewUrl(null);
    fallbackTriedRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      if (track?.preview_url) {
        audioRef.current.src = track.preview_url;
        audioRef.current.load();
      } else {
        audioRef.current.removeAttribute('src');
      }
    }

    if (track && !track.preview_url) {
      fallbackTriedRef.current = true;
      fetchFallbackPreview(track.title, track.artist).then((url) => {
        if (!active || !url) return;
        setResolvedPreviewUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.load();
        }
      });
    }

    return () => {
      active = false;
    };
  }, [track?.id, track?.preview_url, track?.title, track?.artist]);

  const handleAudioError = async () => {
    if (track && !fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      const freshUrl = await fetchFallbackPreview(track.title, track.artist);
      if (freshUrl && audioRef.current) {
        setAudioError(false);
        setResolvedPreviewUrl(freshUrl);
        audioRef.current.src = freshUrl;
        audioRef.current.load();
        return;
      }
    }
    setAudioError(true);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!effectivePreviewUrl || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const cueSec = parseCueToSeconds(track?.cue_time);
      if (currentTime === 0 && cueSec > 0) {
        audioRef.current.currentTime = cueSec;
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked or failed:', err);
          handleAudioError();
        });
    }
  };

  const jumpToCue = () => {
    const cueSec = parseCueToSeconds(track?.cue_time);
    if (!cueSec || !audioRef.current) return;
    audioRef.current.currentTime = cueSec;
    setCurrentTime(cueSec);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !Number.isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatSec = (sec: number) => {
    if (Number.isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const coverUrl =
    track?.cover_url ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="bg-[#FFFEFC] border border-stone-200/90 shadow-sm p-5 sm:p-7 relative overflow-hidden transition-all">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={handleAudioError}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-stone-200/70 pb-4 mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-rose-700">
            STUDIO D'ÉCOUTE & BRIEFING DJ
          </span>
          <h3
            className="text-stone-900 text-lg sm:text-xl font-normal mt-0.5"
            style={{ fontFamily: "'Bodoni Moda', serif" }}
          >
            {sectionLabel ? sectionLabel.toUpperCase() : 'PROGRAMMATION SONORE'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {momentTiming && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              <Clock className="w-3 h-3 text-rose-600" />
              {momentTiming}
            </span>
          )}

          {/* Toggle Canvas / Pochette */}
          <button
            type="button"
            onClick={() => setIsCanvasMode(!isCanvasMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase border transition-colors ${
              isCanvasMode
                ? 'bg-stone-900 text-stone-100 border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            }`}
            title="Basculer entre la pochette vinyle et le mode Canvas vertical"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">CANVAS</span>
            {isCanvasMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {!track ? (
        <div className="py-12 text-center">
          <Disc3 className="w-12 h-12 text-stone-300 mx-auto animate-spin opacity-60 mb-3" style={{ animationDuration: '6s' }} />
          <p
            className="text-stone-500 italic text-sm"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem' }}
          >
            Sélectionnez un morceau dans la liste ci-dessous pour lancer l'écoute studio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
          {/* Mode 1: Vinyle 3D avec pochette carrée */}
          {!isCanvasMode ? (
            <div className="relative mx-auto flex items-center justify-start w-60 h-48 sm:w-72 sm:h-52 group">
              {/* Wrapper de translation (sortie du disque) */}
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-44 h-44 sm:w-52 sm:h-52 transition-transform duration-700 ease-out ${
                  isPlaying ? 'translate-x-16 sm:translate-x-20' : 'translate-x-4 sm:translate-x-5'
                }`}
                style={{ zIndex: 1 }}
              >
                {/* Disque vinyle rotatif (rotation continue fluide) */}
                <div
                  className="w-full h-full rounded-full bg-stone-950 shadow-2xl border-2 border-stone-800 flex items-center justify-center relative overflow-hidden animate-spin"
                  style={{
                    animationDuration: '3.5s',
                    animationPlayState: isPlaying ? 'running' : 'paused',
                  }}
                >
                  {/* Reflet brillant conique pour rendre la rotation bien visible */}
                  <div
                    className="absolute inset-0 rounded-full opacity-35 pointer-events-none"
                    style={{
                      background:
                        'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.45) 35deg, transparent 80deg, transparent 180deg, rgba(255,255,255,0.35) 215deg, transparent 260deg)',
                    }}
                  />
                  {/* Sillons vinyle */}
                  <div className="w-[84%] h-[84%] rounded-full border border-stone-700/60 flex items-center justify-center">
                    <div className="w-[78%] h-[78%] rounded-full border border-stone-800/90 flex items-center justify-center">
                      <div className="w-[72%] h-[72%] rounded-full border border-stone-700/50 flex items-center justify-center">
                        {/* Macaron central avec miniature de la pochette qui tourne avec le disque */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-700 flex items-center justify-center border-2 border-stone-900 shadow-inner relative overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-85"
                          />
                          <div className="absolute w-3.5 h-3.5 rounded-full bg-stone-100 border-2 border-stone-900 shadow" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pochette carton */}
              <div
                className="relative w-44 h-44 sm:w-52 sm:h-52 bg-stone-900 shadow-lg border border-stone-200 overflow-hidden shrink-0"
                style={{ zIndex: 2 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

                {/* Badge flag sur la pochette */}
                {track.flag === 'must_play' && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-rose-600 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 shadow">
                    <Flame className="w-2.5 h-2.5" />
                    MUST PLAY
                  </span>
                )}
                {track.flag === 'banned' && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-red-700 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 shadow">
                    <Ban className="w-2.5 h-2.5" />
                    BLACKLIST
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Mode 2: Motion Canvas 9:16 cinématique automatique */
            <div className="relative mx-auto w-52 sm:w-56 h-80 sm:h-[22rem] bg-stone-950 rounded-sm shadow-2xl border border-stone-800/90 overflow-hidden flex flex-col justify-between p-4 select-none">
              <style>{`
                @keyframes motionCanvasPan {
                  0% { transform: scale(1.2) translate(0%, 0%); }
                  50% { transform: scale(1.34) translate(-3%, -2%); }
                  100% { transform: scale(1.2) translate(0%, 0%); }
                }
                @keyframes motionCanvasFloat {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-4px); }
                }
                @keyframes motionCanvasEq {
                  0%, 100% { transform: scaleY(0.28); opacity: 0.65; }
                  50% { transform: scaleY(1); opacity: 1; }
                }
              `}</style>

              {/* Arrière-plan vidéo si canvas_url vidéo, sinon Motion Canvas flouté animé */}
              {track.canvas_url && /\.(mp4|webm|mov)(\?|$)/i.test(track.canvas_url) ? (
                <video
                  src={track.canvas_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  {/* Fond immersif flouté avec mouvement Ken Burns */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={track.canvas_url || coverUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-xl brightness-50 saturate-150"
                    style={{
                      animation: 'motionCanvasPan 14s ease-in-out infinite',
                      animationPlayState: isPlaying ? 'running' : 'paused',
                    }}
                  />
                  {/* Halo chaud rosé ambiant */}
                  <div
                    className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
                      isPlaying ? 'opacity-60' : 'opacity-20'
                    }`}
                    style={{
                      background:
                        'radial-gradient(circle at 50% 42%, rgba(225,29,72,0.38), transparent 65%)',
                    }}
                  />
                </>
              )}

              {/* Vignette éditoriale */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/60 pointer-events-none" />

              {/* En-tête : badge moment */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="text-[8.5px] font-semibold tracking-[0.22em] text-rose-300 uppercase truncate">
                  {sectionLabel || 'MOTION CANVAS'}
                </span>
                {track.flag === 'must_play' && (
                  <span className="inline-flex items-center gap-0.5 bg-rose-600/90 text-white text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5">
                    <Flame className="w-2 h-2" />
                    MUST
                  </span>
                )}
              </div>

              {/* Pochette centrale flottante (quand pas de vidéo dédiée) */}
              {!(track.canvas_url && /\.(mp4|webm|mov)(\?|$)/i.test(track.canvas_url)) && (
                <div
                  className="relative z-10 mx-auto w-32 h-32 sm:w-36 sm:h-36 shadow-2xl border border-white/20 overflow-hidden my-auto"
                  style={{
                    animation: 'motionCanvasFloat 5s ease-in-out infinite',
                    animationPlayState: isPlaying ? 'running' : 'paused',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Pied : spectre audio animé + typographie éditoriale */}
              <div className="relative z-10 space-y-2.5 text-center">
                <div className="flex items-end justify-center gap-1 h-7">
                  {[0.55, 0.9, 0.7, 1, 0.65, 0.95, 0.6, 0.85, 0.5, 0.8, 0.65].map((scale, i) => (
                    <span
                      key={i}
                      className="w-1 h-full bg-rose-400/90 rounded-full origin-bottom"
                      style={{
                        transform: isPlaying ? undefined : `scaleY(${scale * 0.35})`,
                        opacity: isPlaying ? 1 : 0.45,
                        animation: isPlaying
                          ? `motionCanvasEq ${0.55 + (i % 4) * 0.14}s ease-in-out infinite`
                          : 'none',
                        animationDelay: `${i * 75}ms`,
                      }}
                    />
                  ))}
                </div>

                <div>
                  <p
                    className="text-white text-sm font-normal truncate leading-tight"
                    style={{ fontFamily: "'Bodoni Moda', serif" }}
                  >
                    {track.title}
                  </p>
                  <p
                    className="text-rose-200/90 text-xs italic truncate mt-0.5"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {track.artist}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contrôles & Métadonnées */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-stone-500">
                  TITRE EN COURS
                </span>
                {track.flag === 'must_play' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                    <Flame className="w-3 h-3 text-rose-600" />
                    Incontournable
                  </span>
                )}
                {track.flag === 'banned' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-700 border border-red-200">
                    <Ban className="w-3 h-3 text-red-600" />
                    Interdit
                  </span>
                )}
              </div>

              <h4
                className="text-stone-900 text-xl sm:text-2xl font-serif mt-1"
                style={{ fontFamily: "'Bodoni Moda', serif" }}
              >
                {track.title}
              </h4>
              <p
                className="text-rose-600 text-base italic"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {track.artist}
              </p>
            </div>

            {/* Repère Cue Time */}
            {track.cue_time && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF6F8] border border-stone-200 text-stone-700 text-xs">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  Moment clé à lancer à{' '}
                  <strong className="text-stone-900 font-semibold">
                    {track.cue_time}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={jumpToCue}
                  className="ml-2 text-[10px] uppercase font-bold tracking-wider text-rose-700 underline hover:text-rose-900"
                >
                  Aller au repère
                </button>
              </div>
            )}

            {/* Note DJ */}
            {track.notes && (
              <p className="text-xs text-stone-600 italic bg-stone-50 border-l-2 border-stone-300 pl-3 py-1">
                Note DJ : « {track.notes} »
              </p>
            )}

            {/* Erreur audio ou absence de preview */}
            {resolvingPreview ? (
              <div className="text-xs text-stone-500 italic bg-stone-50 p-2.5 border border-stone-200">
                Recherche de l’extrait audio 30s…
              </div>
            ) : audioError || !effectivePreviewUrl ? (
              <div className="text-xs text-stone-500 italic bg-stone-50 p-2.5 border border-stone-200 flex items-center justify-between gap-2 flex-wrap">
                <span>Extrait 30s non disponible directement pour ce titre.</span>
                {track.spotify_id && (
                  <a
                    href={`https://open.spotify.com/track/${track.spotify_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 not-italic text-[11px] font-semibold uppercase tracking-wider text-rose-700 hover:text-rose-900"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ouvrir sur Spotify
                  </a>
                )}
              </div>
            ) : (
              /* Barre de scrub audio */
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-stone-500 w-8 text-right">
                    {formatSec(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 30}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <span className="text-[11px] font-mono text-stone-500 w-8">
                    {formatSec(duration || 30)}
                  </span>
                </div>
              </div>
            )}

            {/* Boutons de lecture */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!effectivePreviewUrl || resolvingPreview}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
                  effectivePreviewUrl && !resolvingPreview
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {resolvingPreview ? 'CHARGEMENT…' : "ÉCOUTER L'EXTRAIT"}
                  </>
                )}
              </button>

              {effectivePreviewUrl && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2.5 text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-400 transition-colors"
                  title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
