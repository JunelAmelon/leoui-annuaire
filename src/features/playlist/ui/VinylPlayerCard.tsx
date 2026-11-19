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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronise audio track change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(false);

    if (audioRef.current) {
      audioRef.current.pause();
      if (track?.preview_url) {
        audioRef.current.src = track.preview_url;
        audioRef.current.load();
      } else {
        audioRef.current.removeAttribute('src');
      }
    }
  }, [track?.id, track?.preview_url]);

  const togglePlay = () => {
    if (!track?.preview_url || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const cueSec = parseCueToSeconds(track.cue_time);
      if (currentTime === 0 && cueSec > 0) {
        audioRef.current.currentTime = cueSec;
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback blocked or failed:', err);
          setAudioError(true);
          setIsPlaying(false);
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
        onError={() => setAudioError(true)}
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
          <Disc3 className="w-12 h-12 text-stone-300 mx-auto animate-spin-slow opacity-60 mb-3" />
          <p
            className="text-stone-500 italic text-sm"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem' }}
          >
            Sélectionnez un morceau dans la liste ci-dessous pour lancer l'écoute studio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 lg:gap-8 items-center">
          {/* Mode 1: Vinyle 3D avec pochette carrée */}
          {!isCanvasMode ? (
            <div className="relative mx-auto flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 group">
              {/* Disque vinyle sortant */}
              <div
                className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-tr from-stone-950 via-stone-900 to-stone-950 shadow-2xl border-4 border-stone-800 flex items-center justify-center transition-transform duration-700 ${
                  isPlaying ? 'translate-x-12 sm:translate-x-16 rotate-180 animate-spin-slow' : 'translate-x-2'
                }`}
                style={{ zIndex: 1 }}
              >
                {/* Sillons vinyle */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-stone-800/80 flex items-center justify-center">
                  <div className="w-28 h-28 sm:w-34 sm:h-34 rounded-full border border-stone-700/60 flex items-center justify-center">
                    {/* Macaron central */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-700 flex items-center justify-center border-2 border-stone-900 shadow-inner">
                      <div className="w-3 h-3 rounded-full bg-stone-100 border border-stone-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pochette carton */}
              <div
                className="relative w-44 h-44 sm:w-52 sm:h-52 bg-stone-900 shadow-lg border border-stone-200 overflow-hidden"
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
            /* Mode 2: Canvas vertical 9:16 stylisé */
            <div className="relative mx-auto w-48 sm:w-52 h-72 sm:h-80 bg-stone-950 rounded-sm shadow-xl border border-stone-800 overflow-hidden flex flex-col justify-end p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={track.canvas_url || coverUrl}
                alt={track.title}
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${
                  isPlaying ? 'scale-110' : 'scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />

              {/* Barres d'ondes audio animées en Canvas */}
              {isPlaying && (
                <div className="relative z-10 flex items-end justify-center gap-1 h-12 mb-3">
                  {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-rose-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 120}ms`,
                        animationDuration: '700ms',
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="relative z-10 text-center">
                <span className="text-[9px] font-semibold tracking-[0.2em] text-rose-300 uppercase">
                  CANVAS
                </span>
                <p className="text-white text-xs font-semibold truncate mt-0.5">
                  {track.title}
                </p>
                <p className="text-stone-300 text-[11px] truncate">
                  {track.artist}
                </p>
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
            {audioError || !track.preview_url ? (
              <div className="text-xs text-stone-500 italic bg-stone-50 p-2.5 border border-stone-200">
                Extrait 30s non disponible directement pour ce titre (consultable dans Spotify).
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
                disabled={!track.preview_url}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${
                  track.preview_url
                    ? 'bg-stone-900 text-white hover:bg-rose-700'
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
                    ÉCOUTER L'EXTRAIT
                  </>
                )}
              </button>

              {track.preview_url && (
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
