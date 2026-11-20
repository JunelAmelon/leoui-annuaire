'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  Play,
  Pause,
  Music,
} from 'lucide-react';
import type { PlaylistTrack, TrackFlag } from '../domain/types';

interface AddTrackModalProps {
  isOpen: boolean;
  sectionLabel: string;
  busy?: boolean;
  onClose: () => void;
  onAddTrack: (track: Omit<PlaylistTrack, 'id' | 'created_at' | 'order' | 'section_id'>) => Promise<boolean>;
}

interface SpotifyResult {
  title: string;
  artist: string;
  spotify_id?: string | null;
  preview_url?: string | null;
  cover_url?: string | null;
  duration_ms?: number;
}

export function AddTrackModal({
  isOpen,
  sectionLabel,
  busy,
  onClose,
  onAddTrack,
}: AddTrackModalProps) {
  const [tab, setTab] = useState<'spotify' | 'manual'>('spotify');

  // Spotify search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotifyResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SpotifyResult | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('');
  const [cueTime, setCueTime] = useState('');
  const [notes, setNotes] = useState('');
  const [flag, setFlag] = useState<TrackFlag>('normal');

  // Audio preview tester
  const [testingPreview, setTestingPreview] = useState<string | null>(null);
  const audioTestRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setSelectedResult(null);
      setTitle('');
      setArtist('');
      setPreviewUrl('');
      setCoverUrl('');
      setCanvasUrl('');
      setCueTime('');
      setNotes('');
      setFlag('normal');
      if (audioTestRef.current) {
        audioTestRef.current.pause();
      }
      setTestingPreview(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'spotify' || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/playlist/spotify?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.tracks || []);
        }
      } catch (err) {
        console.warn('Erreur recherche Spotify:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, tab]);

  const toggleTestPlay = (url?: string | null) => {
    if (!url || !audioTestRef.current) return;

    if (testingPreview === url) {
      audioTestRef.current.pause();
      setTestingPreview(null);
    } else {
      audioTestRef.current.src = url;
      audioTestRef.current.play().then(() => setTestingPreview(url)).catch(() => setTestingPreview(null));
    }
  };

  const handleSelectSpotify = (item: SpotifyResult) => {
    setSelectedResult(item);
    setTitle(item.title);
    setArtist(item.artist);
    setPreviewUrl(item.preview_url || '');
    setCoverUrl(item.cover_url || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    const ok = await onAddTrack({
      title: title.trim(),
      artist: artist.trim(),
      spotify_id: selectedResult?.spotify_id || null,
      preview_url: previewUrl.trim() || null,
      cover_url: coverUrl.trim() || null,
      canvas_url: canvasUrl.trim() || null,
      cue_time: cueTime.trim() || null,
      notes: notes.trim() || null,
      flag,
    });

    if (ok) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <audio
        ref={audioTestRef}
        onEnded={() => setTestingPreview(null)}
      />

      <div className="bg-[#FFFEFC] border border-stone-300 shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden">
        {/* ── Visuel (bandeau mobile / colonne desktop) ── */}
        <div className="relative md:w-[38%] flex-shrink-0 h-36 sm:h-44 md:h-auto bg-[#141211] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/playlist-cover.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141211] via-[#141211]/40 to-[#141211]/10" />
          <div className="absolute bottom-0 inset-x-0 p-5 md:p-7">
            <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-rose-300/90">
              Ajouter un titre
            </p>
            <h3
              className="text-white text-xl md:text-2xl font-normal mt-1 leading-tight"
              style={{ fontFamily: "'Bodoni Moda', serif" }}
            >
              {sectionLabel}
            </h3>
            <p
              className="hidden md:block text-[13px] italic text-white/70 mt-3 max-w-[15rem] leading-snug"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              « Chaque moment mérite sa bande-son. »
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="md:hidden absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Formulaire ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="hidden md:flex items-center justify-between px-6 pt-4">
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-stone-400">
              Recherche catalogue ou saisie manuelle
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:bg-stone-100 hover:text-charcoal-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        {/* Onglets Spotify / Manuel */}
        <div className="flex border-b border-stone-200 bg-stone-50/50">
          <button
            type="button"
            onClick={() => setTab('spotify')}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              tab === 'spotify'
                ? 'border-rose-600 text-stone-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Recherche Catalogue & Spotify
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors ${
              tab === 'manual'
                ? 'border-rose-600 text-stone-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Saisie Manuelle
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {tab === 'spotify' && (
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher par titre, artiste (ex : At Last, Ed Sheeran...)"
                  className="w-full pl-9 pr-4 py-2 border border-stone-300 bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-600"
                />
              </div>

              {searching && (
                <p className="text-xs text-stone-400 text-center py-2 italic">
                  Recherche dans le catalogue musical…
                </p>
              )}

              {/* Résultats */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-stone-200 divide-y divide-stone-100 bg-white">
                  {searchResults.map((item, idx) => {
                    const isPicked = selectedResult?.title === item.title && selectedResult?.artist === item.artist;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 flex items-center justify-between gap-3 transition-colors ${
                          isPicked ? 'bg-rose-50' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.cover_url}
                              alt={item.title}
                              className="w-8 h-8 object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-stone-100 flex items-center justify-center shrink-0">
                              <Music className="w-4 h-4 text-stone-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-stone-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-stone-500 italic truncate">
                              {item.artist}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.preview_url && (
                            <button
                              type="button"
                              onClick={() => toggleTestPlay(item.preview_url)}
                              className="p-1.5 text-stone-500 hover:text-stone-900 border border-stone-200"
                              title="Tester l'extrait"
                            >
                              {testingPreview === item.preview_url ? (
                                <Pause className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3 h-3 fill-current" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectSpotify(item)}
                            className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                              isPicked
                                ? 'bg-rose-700 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isPicked ? 'Sélectionné' : 'Choisir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Formulaire commun de validation / finalisation */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                  Titre du morceau *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : At Last"
                  className="w-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                  Artiste ou groupe *
                </label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex : Etta James"
                  className="w-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                  Statut pour le DJ
                </label>
                <select
                  value={flag}
                  onChange={(e) => setFlag(e.target.value as TrackFlag)}
                  className="w-full border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600 uppercase"
                >
                  <option value="normal">Standard (recommandé)</option>
                  <option value="must_play">Incontournable (Must-Play)</option>
                  <option value="banned">Interdit (Blacklist formelle)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                  Repère temporel (départ)
                </label>
                <input
                  type="text"
                  value={cueTime}
                  onChange={(e) => setCueTime(e.target.value)}
                  placeholder="Ex : 0:45 ou début du refrain"
                  className="w-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                Consigne ou note pour le DJ (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex : Attendre que les témoins soient au centre pour monter le volume…"
                maxLength={250}
                className="w-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600 italic"
              />
            </div>

            {/* URL Canvas visuel personnalisé (optionnel) */}
            <div>
              <label className="block text-[10px] font-semibold tracking-wider uppercase text-stone-500 mb-1">
                Lien Canvas ou visuel vertical (optionnel)
              </label>
              <input
                type="url"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="https://... (visuel 9:16 pour le studio Canvas)"
                className="w-full border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
              />
            </div>

            {/* Pied de modale */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-500 hover:text-stone-800 uppercase"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !artist.trim() || busy}
                className="px-6 py-2 text-xs font-semibold tracking-wider bg-rose-600 text-white hover:bg-rose-700 transition-colors uppercase disabled:opacity-50"
              >
                Ajouter à la playlist
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
