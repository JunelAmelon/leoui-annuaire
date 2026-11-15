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
    <div className="flex items-center gap-3.5">
      {src && (
        <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} preload="metadata" />
      )}

      <button
        type="button"
        onClick={togglePlay}
        disabled={!src}
        className="w-10 h-10 rounded-full bg-charcoal-900 hover:bg-rose-600 text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
        title={isPlaying ? 'Mettre en pause' : 'Écouter le message'}
        aria-label={isPlaying ? 'Mettre en pause' : 'Écouter le message'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-[3px] h-9 cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current || !totalDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audioRef.current.currentTime = pct * totalDuration;
            setCurrentTime(audioRef.current.currentTime);
          }}
        >
          {bars.map((amplitude, i) => {
            const played = (i / bars.length) * 100 <= progressPercent;
            const h = Math.max(14, Math.min(100, Math.round(amplitude * 100)));
            return (
              <span key={i} className={`flex-1 max-w-[3px] min-w-[2px] rounded-full transition-colors ${played ? 'bg-charcoal-900' : 'bg-charcoal-200'}`} style={{ height: `${h}%` }} />
            );
          })}
        </div>
      </div>

      <span className="text-[11px] text-charcoal-400 tabular-nums flex-shrink-0 w-[4.5rem] text-right">
        {formatTime(currentTime)} <span className="text-charcoal-300">/ {formatTime(totalDuration)}</span>
      </span>

      {allowDownload && src && (
        <button type="button" onClick={handleDownload}
          className="p-1.5 rounded-md text-charcoal-300 hover:text-charcoal-700 transition-colors flex-shrink-0" title="Télécharger ce message vocal" aria-label="Télécharger">
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
