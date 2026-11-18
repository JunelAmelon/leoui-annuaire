'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mic,
  Square,
  RotateCcw,
  Volume2,
  Clock,
} from 'lucide-react';
import { AudioRecorder, type RecordingResult } from '@/features/guestbook/utils/audio-recorder';
import { WaveformPlayer } from '@/features/guestbook/ui/WaveformPlayer';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import type { GuestbookPageContent } from '@/features/guestbook/domain/customization';

interface GuestbookInfo {
  title: string;
  isOpen: boolean;
  reasonClosed?: string;
  page: GuestbookPageContent;
  cover_url: string;
  settings: {
    max_duration_sec: number;
    max_audio_mb: number;
    window_open_at: string | null;
    window_close_at: string | null;
  };
  entry?: {
    id: string;
    guest_name: string;
    type: 'audio' | 'text';
    duration_sec?: number;
    audio_path?: string;
    waveform?: number[];
    body?: string;
    created_at: string;
  } | null;
}

export default function PublicGuestbookPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entry');

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<GuestbookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  const [guestName, setGuestName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [instantLevel, setInstantLevel] = useState(0.1);
  const [audioResult, setAudioResult] = useState<RecordingResult | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      try {
        const url = entryId
          ? `/api/guestbook/${token}?entry=${encodeURIComponent(entryId)}`
          : `/api/guestbook/${token}`;
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Livre d’or introuvable');
        }
        const data: GuestbookInfo = await res.json();
        setInfo(data);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger le livre d’or.');
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, [token, entryId]);

  // Démarrer l'enregistrement audio
  const handleStartRecording = async () => {
    if (!AudioRecorder.isSupported()) {
      toast.error('Votre navigateur ne supporte pas l’enregistrement audio.');
      return;
    }

    try {
      const maxSec = info?.settings?.max_duration_sec || 120;
      recorderRef.current = new AudioRecorder(maxSec);
      setAudioResult(null);
      setIsRecording(true);
      setRecordedSeconds(0);

      await recorderRef.current.start(
        (sec, level) => {
          setRecordedSeconds(sec);
          setInstantLevel(level);
        },
        () => {
          toast('Temps maximum atteint.', { icon: <Clock className="w-4 h-4 text-rose-500" /> });
        }
      );
    } catch (err: any) {
      setIsRecording(false);
      toast.error('Accès au micro refusé ou non disponible.');
    }
  };

  // Arrêter l'enregistrement
  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    try {
      const result = await recorderRef.current.stop();
      setAudioResult(result);
    } catch {
      toast.error('Erreur lors de l’enregistrement audio.');
    } finally {
      setIsRecording(false);
    }
  };

  // Recommencer l'enregistrement
  const handleResetAudio = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
    setIsPlayingPreview(false);
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    setAudioResult(null);
    setRecordedSeconds(0);
    setIsRecording(false);
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      toast.error('Veuillez indiquer votre prénom ou votre nom.');
      return;
    }

    if (mode === 'text') {
      if (!body.trim()) {
        toast.error('Veuillez écrire un mot doux avant d’envoyer.');
        return;
      }
    } else {
      if (!audioResult) {
        toast.error('Veuillez enregistrer un message vocal avant d’envoyer.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Vocal : envoi du fichier sur Cloudinary, seule l'URL sécurisée est transmise au serveur
      let audioUrl = '';
      if (mode === 'audio') {
        try {
          const ext = audioResult!.mimeType?.includes('mp4') ? 'm4a' : 'webm';
          const file = new File([audioResult!.blob], `vocal-${Date.now()}.${ext}`, {
            type: audioResult!.mimeType || 'audio/webm',
          });
          audioUrl = await uploadFile(file, 'guestbook-audios');
        } catch (uploadErr) {
          console.error('Téléversement audio impossible :', uploadErr);
          // Repli : uniquement si l'enregistrement est assez léger pour être stocké directement
          if (audioResult!.base64.length <= 750_000) {
            audioUrl = audioResult!.base64;
          } else {
            throw new Error('Impossible d’envoyer votre vocal pour le moment. Vérifiez votre connexion et réessayez.');
          }
        }
      }

      const payload =
        mode === 'text'
          ? {
              type: 'text',
              guest_name: guestName.trim(),
              body: body.trim(),
            }
          : {
              type: 'audio',
              guest_name: guestName.trim(),
              duration_sec: audioResult!.durationSec,
              waveform: audioResult!.waveform,
              audio_base64: audioUrl,
              mime_type: audioResult!.mimeType,
              size_bytes: audioResult!.sizeBytes,
            };

      const res = await fetch(`/api/guestbook/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l’envoi');
      }

      setSubmitted(true);
      toast.success('Votre message a été transmis avec succès aux mariés !');
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’envoyer votre message.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#FBF8F4] flex items-center justify-center p-4">
        <p className="font-serif italic text-charcoal-500">Un instant…</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-[100dvh] bg-[#FBF8F4] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Livre d’or</p>
          <h1 className="font-serif text-charcoal-900 text-3xl mt-3" style={{ fontWeight: 400 }}>Lien introuvable</h1>
          <p className="text-sm text-charcoal-500 mt-3 leading-relaxed">
            {error || 'Ce livre d’or n’existe pas ou a été désactivé par les mariés.'}
          </p>
        </div>
      </div>
    );
  }

  const P = info.page;

  /** Cadre commun (fonction de rendu, pas un composant : évite de remonter les champs à chaque frappe) : photo à gauche (fixe sur desktop), contenu sur papier ivoire à droite. */
  const renderShell = (children: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-[#FBF8F4] lg:flex">
      <aside className="relative h-[40vh] min-h-[280px] lg:h-[100dvh] lg:w-[46%] lg:sticky lg:top-0 flex-shrink-0 overflow-hidden bg-[#1C1417]">
        <img src={info.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1417]/85 via-[#1C1417]/25 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 lg:p-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75">{P.eyebrow}</p>
          <h1 className="font-serif text-white leading-[1.08] mt-3" style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {info.title}
          </h1>
          <p className="hidden sm:block text-[15px] text-white/80 mt-4 max-w-md leading-relaxed font-light">{P.subtitle}</p>
        </div>
      </aside>
      <main className="flex-1 px-6 sm:px-12 xl:px-20 py-10 lg:py-16 flex lg:items-center">
        <div className="w-full max-w-[34rem] mx-auto">{children}</div>
      </main>
    </div>
  );

  if (!info.isOpen) {
    return (
      renderShell(<>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Livre d’or</p>
        <h2 className="font-serif text-charcoal-900 text-3xl mt-3 leading-tight" style={{ fontWeight: 400 }}>Pas tout à fait encore…</h2>
        <p className="text-[15px] text-charcoal-500 mt-4 leading-relaxed">
          {info.reasonClosed || 'Le dépôt de messages n’est pas disponible actuellement.'}
        </p>
      </>)
    );
  }

  if (submitted) {
    return (
      renderShell(<>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Message envoyé</p>
        <h2 className="font-serif text-charcoal-900 mt-3 leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 400 }}>
          {P.thanks_title.replace('{nom}', guestName.trim())}
        </h2>
        <p className="text-[15px] text-charcoal-600 mt-5 leading-relaxed">{P.thanks_text}</p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setBody(""); setAudioResult(null); setRecordedSeconds(0); }}
          className="mt-8 text-[13px] text-charcoal-800 underline decoration-charcoal-300 underline-offset-[6px] hover:decoration-rose-500 hover:text-rose-700 transition-colors"
        >
          {P.another_label}
        </button>
      </>)
    );
  }

  const fieldLabel = 'text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400';
  const underline =
    'mt-2 w-full bg-transparent border-0 border-b border-charcoal-300 px-0 py-2.5 font-serif text-xl text-charcoal-900 placeholder:text-charcoal-300 placeholder:italic placeholder:text-lg focus:outline-none focus:ring-0 focus:border-rose-600 transition-colors rounded-none';

  // Barres d'onde animées pendant l'enregistrement (réagissent au niveau du micro)
  const liveBars = Array.from({ length: 34 }, (_, i) => {
    if (!isRecording) return audioResult ? 14 + ((i * 37) % 26) : 5;
    const wobble = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.65 + recordedSeconds * 2.4));
    return 6 + instantLevel * 52 * wobble;
  });

  const handleMainRecordButton = () => {
    if (isRecording) return void handleStopRecording();
    if (audioResult) {
      const el = audioPreviewRef.current;
      if (!el) return;
      if (isPlayingPreview) { el.pause(); setIsPlayingPreview(false); }
      else { el.play().then(() => setIsPlayingPreview(true)).catch(() => setIsPlayingPreview(false)); }
      return;
    }
    void handleStartRecording();
  };

  return (
    renderShell(<>
      {/* Souvenir scanné depuis le livre imprimé (?entry=…) */}
      {info.entry && (
        <div className="mb-10 pl-5 border-l-2 border-rose-300">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-rose-600">Souvenir du livre imprimé</p>
          <div className="flex items-baseline justify-between gap-3 mt-2">
            <p className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 500 }}>{info.entry.guest_name}</p>
            <span className="text-[11px] text-charcoal-400 flex-shrink-0">
              {new Date(info.entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="mt-3">
            {info.entry.type === 'audio' ? (
              <WaveformPlayer src={info.entry.audio_path} waveform={info.entry.waveform} durationSec={info.entry.duration_sec} guestName={info.entry.guest_name} />
            ) : (
              <p className="font-serif italic text-charcoal-700 text-lg leading-relaxed">« {info.entry.body} »</p>
            )}
          </div>
        </div>
      )}

      {/* Choix du format : deux mots, un trait sous l'actif */}
      <div className="flex gap-9 border-b border-stone-300/70 mb-9" role="tablist">
        {([['text', P.tab_text_label], ['audio', P.tab_audio_label]] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
            className={`pb-3 -mb-px text-[13px] tracking-wide border-b-2 transition-colors ${
              mode === key ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-9">
        <label className="block">
          <span className={fieldLabel}>{P.name_label}</span>
          <input type="text" required value={guestName} onChange={(e) => setGuestName(e.target.value)}
            placeholder={P.name_placeholder} autoComplete="name" className={underline} />
        </label>

        {mode === 'text' && (
          <label className="block">
            <span className={fieldLabel}>{P.text_label}</span>
            {/* Papier réglé : l'invité écrit comme dans un vrai livre d'or */}
            <textarea
              rows={6} required value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)}
              placeholder={P.text_placeholder}
              className="mt-2 w-full resize-none bg-transparent border-0 px-0 font-serif italic text-xl text-charcoal-900 placeholder:text-charcoal-300 placeholder:text-lg focus:outline-none focus:ring-0"
              style={{
                lineHeight: '2.25rem',
                backgroundImage: 'linear-gradient(transparent calc(2.25rem - 1px), #E3D9CF 1px)',
                backgroundSize: '100% 2.25rem',
                backgroundAttachment: 'local',
              }}
            />
            <span className="block text-right text-[11px] text-charcoal-300 tabular-nums">{body.length} / 2000</span>
          </label>
        )}

        {mode === 'audio' && (
          <div className="text-center py-9 border-y border-stone-300/70">
            {audioResult && (
              <audio ref={audioPreviewRef} src={audioResult.base64} onEnded={() => setIsPlayingPreview(false)} className="hidden" />
            )}

            {/* Onde sonore */}
            <div className="flex items-center justify-center gap-[3px] h-14 mb-7" aria-hidden>
              {liveBars.map((h, i) => (
                <span key={i} className={`w-[3px] rounded-full transition-[height] duration-100 ${
                  isRecording ? 'bg-rose-600' : audioResult ? 'bg-charcoal-800' : 'bg-charcoal-200'
                }`} style={{ height: `${h}px` }} />
              ))}
            </div>

            {/* Bouton principal : enregistrer, terminer, réécouter */}
            <div className="relative inline-flex">
              {isRecording && <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />}
              <button type="button" onClick={handleMainRecordButton}
                aria-label={isRecording ? 'Terminer l’enregistrement' : audioResult ? 'Réécouter' : 'Commencer l’enregistrement'}
                className={`relative w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-rose-600 text-white' : 'border-2 border-charcoal-900 text-charcoal-900 hover:border-rose-600 hover:text-rose-600'
                }`}>
                {isRecording ? <Square className="w-6 h-6 fill-white" /> : audioResult ? (isPlayingPreview ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-7 h-7" />) : <Mic className="w-7 h-7" />}
              </button>
            </div>

            <p className="font-serif text-charcoal-900 text-4xl mt-6 tabular-nums" style={{ fontWeight: 400 }}>
              {formatSeconds(isRecording ? recordedSeconds : audioResult ? audioResult.durationSec : 0)}
            </p>
            <p className="text-[13px] text-charcoal-500 mt-2">
              {isRecording
                ? 'Parlez tranquillement, touchez le carré pour terminer.'
                : audioResult
                ? isPlayingPreview ? 'Lecture en cours…' : 'Votre message est prêt. Touchez pour le réécouter.'
                : `Touchez le micro pour commencer — ${Math.round((info?.settings?.max_duration_sec || 120) / 60)} min maximum.`}
            </p>
            {audioResult && !isRecording && (
              <button type="button" onClick={handleResetAudio}
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-charcoal-700 underline decoration-charcoal-300 underline-offset-[5px] hover:decoration-rose-500 hover:text-rose-700">
                <RotateCcw className="w-3.5 h-3.5" /> Recommencer
              </button>
            )}
          </div>
        )}

        <div>
          <button type="submit" disabled={submitting || isRecording || (mode === 'audio' && !audioResult)}
            className="w-full h-[3.25rem] bg-rose-600 text-white text-[12px] font-medium tracking-[0.16em] uppercase hover:bg-rose-600 transition-colors disabled:opacity-35 disabled:hover:bg-rose-600 disabled:cursor-not-allowed">
            {submitting ? 'Envoi en cours…' : P.submit_label}
          </button>
          <p className="text-center font-serif italic text-charcoal-400 text-sm mt-5">
            Déposé directement dans le livre d’or des mariés.
          </p>
        </div>
      </form>
    </>)
  );
}
