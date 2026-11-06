'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, AlertCircle } from 'lucide-react';

interface WaveformPlayerProps {
  src?: string | null;
  waveform?: number[];
  durationSec?: number | null;
  guestName?: string;
  allowDownload?: boolean;
}

const STOP_EVENT = 'guestbook-stop-other-audios';

export function WaveformPlayer({
  src,
  waveform = [],
  durationSec = 0,
  guestName,
  allowDownload = true,
}: WaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerIdRef = useRef(Math.random().toString(36).slice(2));

  // Un chemin Storage (ex. "guestbooks/…/x.webm") n'est pas lisible tel quel : seul un vrai flux audio l'est
  const isPlayableSrc = !!src && /^(data:audio\/|https?:\/\/|blob:|\/)/.test(src);
  const unavailable = !isPlayableSrc || hasError;

  // Valeurs par défaut si waveform vide
  const bars =
    waveform && waveform.length > 0
      ? waveform
      : [0.3, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6, 0.9, 0.4, 0.2];

  // Durée réelle lue dans le fichier audio ; repli sur la durée enregistrée
  // (les fichiers webm du MediaRecorder renvoient parfois Infinity).
  const totalDuration = audioDuration > 0 ? audioDuration : durationSec || 0;

  // Une seule note vocale à la fois : lancer une note met les autres en pause (sans les remettre à zéro)
  useEffect(() => {
    const handleStopOther = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== playerIdRef.current && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener(STOP_EVENT, handleStopOther);
    return () => window.removeEventListener(STOP_EVENT, handleStopOther);
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    window.dispatchEvent(new CustomEvent(STOP_EVENT, { detail: { id: playerIdRef.current } }));
    // Reprend là où la lecture s'était arrêtée (pas de remise à zéro)
    audio.play().then(() => setIsPlaying(true)).catch((e) => {
      console.error('Erreur lecture audio:', e);
      setIsPlaying(false);
      setHasError(true);
    });
  };

  const syncDuration = () => {
    const d = audioRef.current?.duration;
    if (d && Number.isFinite(d) && d > 0) setAudioDuration(d);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      syncDuration();
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

  const progressPercent = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  if (unavailable) {
    return (
      <div className="bg-stone-50/90 border border-stone-200/70 rounded-xl p-3 flex items-center gap-2 text-xs text-charcoal-500">
        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
        <span>Audio indisponible : ce message vocal ne peut pas être lu.</span>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/90 border border-stone-200/70 rounded-xl p-3 flex items-center gap-3">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={syncDuration}
          onDurationChange={syncDuration}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onEnded={handleEnded}
          onError={() => { setIsPlaying(false); setHasError(true); }}
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

      {/* Barres de forme d'onde interactive (dimensions explicites pour rester toujours visibles) */}
      <div className="flex-1 min-w-0">
        <div
          className="cursor-pointer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}
          onClick={(e) => {
            if (!audioRef.current || !totalDuration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audioRef.current.currentTime = pct * totalDuration;
            setCurrentTime(audioRef.current.currentTime);
          }}
        >
          {bars.map((amplitude, i) => {
            const isPlayed = (i / bars.length) * 100 <= progressPercent;
            const heightPx = Math.max(5, Math.min(28, Math.round(amplitude * 28)));
            return (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: '3px',
                  minWidth: '3px',
                  height: `${heightPx}px`,
                  borderRadius: '9999px',
                  backgroundColor: isPlayed ? '#E11D48' : '#D6D3D1',
                }}
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
