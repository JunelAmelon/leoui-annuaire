'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';

interface WaveformPlayerProps {
  src?: string | null;
  waveform?: number[];
  durationSec?: number | null;
  guestName?: string;
  allowDownload?: boolean;
}

export function WaveformPlayer({
  src,
  waveform = [],
  durationSec = 0,
  guestName,
  allowDownload = true,
}: WaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Valeurs par défaut si waveform vide
  const bars =
    waveform && waveform.length > 0
      ? waveform
      : [0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.9, 0.4, 0.2];

  const totalDuration = durationSec || (audioRef.current?.duration ? Math.round(audioRef.current.duration) : 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.error('Erreur lecture audio:', e);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `Vocal-${(guestName || 'invite').replace(/\s+/g, '-').toLowerCase()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="bg-stone-50/90 border border-stone-200/70 rounded-xl p-3 flex items-center gap-3">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Bouton lecture/pause */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!src}
        className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-xs disabled:opacity-50"
        title={isPlaying ? 'Mettre en pause' : 'Écouter le message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white ml-0.5" />
        )}
      </button>

      {/* Barres de forme d'onde interactive */}
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-[3px] h-8 relative cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !totalDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = pct * totalDuration;
            setCurrentTime(audioRef.current.currentTime);
          }}
        >
          {bars.map((amplitude, i) => {
            const barPct = (i / bars.length) * 100;
            const isPlayed = barPct <= progressPercent;
            const barHeight = Math.max(15, Math.min(100, Math.round(amplitude * 100)));

            return (
              <span
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  isPlayed ? 'bg-rose-600' : 'bg-stone-300'
                }`}
                style={{ height: `${barHeight}%` }}
              />
            );
          })}
        </div>

        {/* Temps écoulé / total */}
        <div className="flex items-center justify-between text-[11px] text-charcoal-400 mt-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Téléchargement individuel de l'audio */}
      {allowDownload && src && (
        <button
          type="button"
          onClick={handleDownload}
          className="p-2 rounded-lg text-charcoal-400 hover:text-charcoal-700 hover:bg-stone-200/60 transition-colors flex-shrink-0"
          title="Télécharger ce message vocal"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
