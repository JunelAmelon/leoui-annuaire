'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mic,
  PenLine,
  Heart,
  Square,
  RotateCcw,
  Send,
  Sparkles,
  CheckCircle2,
  Volume2,
  AlertCircle,
  Clock,
  Radio,
} from 'lucide-react';
import { AudioRecorder, type RecordingResult } from '@/features/guestbook/utils/audio-recorder';
import { WaveformPlayer } from '@/features/guestbook/ui/WaveformPlayer';
import { toast } from 'sonner';

interface GuestbookInfo {
  title: string;
  isOpen: boolean;
  reasonClosed?: string;
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
              audio_base64: audioResult!.base64,
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
      <div className="min-h-screen bg-[#FAF6F8] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-serif text-charcoal-700 text-sm">Chargement du livre d’or…</p>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-[#FAF6F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-charcoal-900 text-xl font-normal">Lien introuvable</h1>
          <p className="text-sm text-charcoal-600 leading-relaxed">
            {error || 'Ce livre d’or n’existe pas ou a été désactivé par les mariés.'}
          </p>
        </div>
      </div>
    );
  }

  if (!info.isOpen) {
    return (
      <div className="min-h-screen bg-[#FAF6F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-charcoal-900 text-xl font-normal">{info.title}</h1>
          <p className="text-sm text-charcoal-600 leading-relaxed">
            {info.reasonClosed || 'Le dépôt de messages n’est pas disponible actuellement.'}
          </p>
        </div>
      </div>
    );
  }

  // Écran de remerciement après envoi réussi
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF6F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md w-full text-center space-y-5 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Heart className="w-7 h-7 fill-rose-600" />
          </div>
          <div>
            <h1 className="font-serif text-charcoal-900 text-2xl font-normal">Merci {guestName} !</h1>
            <p className="text-sm text-charcoal-600 mt-2 leading-relaxed">
              Votre message a été déposé avec soin dans le livre d’or des mariés. Ils auront un immense plaisir à le découvrir !
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setBody('');
              setAudioResult(null);
              setRecordedSeconds(0);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-stone-100 text-charcoal-700 hover:bg-stone-200 transition-colors"
          >
            <span>Laisser un autre mot doux</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F8] py-8 px-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg space-y-6">
        {/* En-tête romantique & sobre */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Livre d’or des mariés</span>
          </div>
          <h1
            className="font-serif text-charcoal-900 leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 400 }}
          >
            {info.title}
          </h1>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto leading-relaxed">
            Partagez vos vœux, un souvenir chaleureux ou un message vocal spontané avec les mariés.
          </p>
        </div>

        {/* ── Souvenir scanné depuis le livre imprimé (si paramètre ?entry=...) ── */}
        {info.entry && (
          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-600 text-xs font-medium">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Souvenir scanné depuis le Livre d’Or imprimé</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-serif text-charcoal-900 text-base font-medium">
                Message de {info.entry.guest_name}
              </p>
              <span className="text-[11px] text-charcoal-400">
                {new Date(info.entry.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {info.entry.type === 'audio' ? (
              <WaveformPlayer
                src={info.entry.audio_path}
                waveform={info.entry.waveform}
                durationSec={info.entry.duration_sec}
                guestName={info.entry.guest_name}
              />
            ) : (
              <p className="text-sm text-charcoal-700 italic font-serif bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                « {info.entry.body} »
              </p>
            )}
          </div>
        )}

        {/* Sélecteur de format : Texte vs Audio */}
        <div className="bg-stone-200/60 p-1 rounded-2xl flex gap-1">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              mode === 'text'
                ? 'bg-white text-charcoal-900 shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Message écrit</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('audio')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
              mode === 'audio'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Message vocal</span>
          </button>
        </div>

        {/* Formulaire principal */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-5"
        >
          {/* Identité de l'invité */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-charcoal-500 font-medium block">
              Votre prénom et nom <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Ex: Camille, Thomas & Léa, Tante Sophie…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>

          {/* Mode Texte */}
          {mode === 'text' && (
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-charcoal-500 font-medium block">
                Votre mot doux <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                placeholder="Écrivez quelques mots, une anecdote émouvante ou vos vœux les plus sincères…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors leading-relaxed resize-none"
              />
              <div className="text-right text-[11px] text-charcoal-400">
                {body.length} / 2000
              </div>
            </div>
          )}

          {/* Mode Audio */}
          {mode === 'audio' && (
            <div className="space-y-4 pt-1">
              <div className="rounded-2xl border border-stone-200/80 bg-[#FAF6F8]/60 p-6 text-center space-y-4">
                {/* Visualiseur de capture */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  {isRecording && (
                    <span
                      className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"
                      style={{ transform: `scale(${1 + instantLevel})` }}
                    />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white shadow-md'
                        : audioResult
                        ? 'bg-stone-100 text-charcoal-700'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    <Mic className="w-7 h-7" />
                  </div>
                </div>

                {/* Chronomètre & Statut */}
                <div>
                  <p className="font-mono text-charcoal-900 text-2xl font-semibold">
                    {formatSeconds(isRecording ? recordedSeconds : audioResult ? audioResult.durationSec : 0)}
                  </p>
                  <p className="text-xs text-charcoal-400 mt-0.5">
                    {isRecording
                      ? 'Enregistrement en cours… Parlez au micro'
                      : audioResult
                      ? 'Message vocal prêt ! Vous pouvez l’écouter ci-dessous'
                      : `Appuyez sur le micro pour enregistrer (max ${Math.round((info?.settings?.max_duration_sec || 120) / 60)} min)`}
                  </p>
                </div>

                {/* Boutons d'action enregistrement */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  {!isRecording && !audioResult && (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Commencer l’enregistrement</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-charcoal-900 text-white hover:bg-charcoal-800 transition-colors shadow-xs animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Terminer le message</span>
                    </button>
                  )}

                  {audioResult && !isRecording && (
                    <button
                      type="button"
                      onClick={handleResetAudio}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-200 text-charcoal-700 hover:bg-stone-50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ré-enregistrer</span>
                    </button>
                  )}
                </div>

                {/* Lecteur de réécoute avant envoi */}
                {audioResult && (
                  <div className="pt-3 border-t border-stone-200/60">
                    <audio
                      ref={audioPreviewRef}
                      src={audioResult.base64}
                      onEnded={() => setIsPlayingPreview(false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!audioPreviewRef.current) return;
                        if (isPlayingPreview) {
                          audioPreviewRef.current.pause();
                          setIsPlayingPreview(false);
                        } else {
                          audioPreviewRef.current.play();
                          setIsPlayingPreview(true);
                        }
                      }}
                      className="inline-flex items-center gap-2 text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isPlayingPreview ? 'Mettre en pause' : 'Réécouter votre vocal'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={submitting || isRecording || (mode === 'audio' && !audioResult)}
            className="w-full py-3 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span>Transmission en cours…</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer aux mariés</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

