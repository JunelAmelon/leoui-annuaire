'use client';

import React, { useState } from 'react';
import {
  Play,
  Flame,
  Ban,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Disc3,
  Plus,
} from 'lucide-react';
import type { PlaylistTrack, TrackFlag } from '../domain/types';

interface TrackListTableProps {
  tracks: PlaylistTrack[];
  activeTrackId?: string;
  busy?: boolean;
  onPlayTrack: (track: PlaylistTrack) => void;
  onUpdateTrack: (
    trackId: string,
    patch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>>
  ) => Promise<boolean>;
  onRemoveTrack: (trackId: string) => Promise<void>;
  onReorder: (updates: Array<{ id: string; order: number }>) => Promise<void>;
  onOpenAddModal: () => void;
}

export function TrackListTable({
  tracks,
  activeTrackId,
  busy,
  onPlayTrack,
  onUpdateTrack,
  onRemoveTrack,
  onReorder,
  onOpenAddModal,
}: TrackListTableProps) {
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editCue, setEditCue] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');
  const [editFlag, setEditFlag] = useState<TrackFlag>('normal');

  const handleStartEdit = (t: PlaylistTrack) => {
    setEditingTrackId(t.id);
    setEditTitle(t.title);
    setEditArtist(t.artist);
    setEditCue(t.cue_time || '');
    setEditNotes(t.notes || '');
    setEditFlag(t.flag);
  };

  const handleSaveEdit = async (trackId: string) => {
    if (!editTitle.trim() || !editArtist.trim()) return;

    const ok = await onUpdateTrack(trackId, {
      title: editTitle.trim(),
      artist: editArtist.trim(),
      cue_time: editCue.trim() || null,
      notes: editNotes.trim() || null,
      flag: editFlag,
    });

    if (ok) setEditingTrackId(null);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    const newTracks = [...tracks];
    const [moved] = newTracks.splice(index, 1);
    newTracks.splice(targetIndex, 0, moved);

    const updates = newTracks.map((t, idx) => ({
      id: t.id,
      order: idx + 1,
    }));

    await onReorder(updates);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-stone-500">
            PROGRAMMATION DE CE MOMENT
          </span>
          <span className="text-xs font-mono text-stone-400">
            ({tracks.length} titre{tracks.length > 1 ? 's' : ''})
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-soft"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>AJOUTER UN MORCEAU</span>
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="p-8 text-center bg-white border border-stone-200/70">
          <Disc3 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p
            className="text-stone-600 text-base"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
          >
            Aucun morceau renseigné pour ce moment.
          </p>
          <p className="text-stone-400 text-xs mt-1">
            Laissez carte blanche à votre DJ ou ajoutez vos morceaux favoris via Spotify ou manuellement.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un morceau
          </button>
        </div>
      ) : (
        <div className="bg-[#FFFEFC] border border-stone-200/80 divide-y divide-stone-200/60">
          {tracks.map((track, idx) => {
            const isEditing = editingTrackId === track.id;
            const isCurrentPlaying = activeTrackId === track.id;

            if (isEditing) {
              return (
                <div key={track.id} className="p-4 bg-stone-50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titre du morceau"
                      className="w-full bg-white border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                    />
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Artiste ou groupe"
                      className="w-full bg-white border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={editFlag}
                      onChange={(e) => setEditFlag(e.target.value as TrackFlag)}
                      className="w-full bg-white border border-stone-300 px-2 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600 uppercase"
                    >
                      <option value="normal">Standard</option>
                      <option value="must_play">Incontournable (Must-Play)</option>
                      <option value="banned">Interdit (Blacklist)</option>
                    </select>

                    <input
                      type="text"
                      value={editCue}
                      onChange={(e) => setEditCue(e.target.value)}
                      placeholder="Repère départ (ex: 0:45 ou 45s)"
                      className="w-full bg-white border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                    />

                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Note pour le DJ…"
                      className="w-full bg-white border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTrackId(null)}
                      className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 uppercase"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(track.id)}
                      className="px-4 py-1 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 uppercase"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={track.id}
                className={`p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isCurrentPlaying ? 'bg-rose-50/40' : 'hover:bg-stone-50/60'
                }`}
              >
                {/* Gauche : ordre, play, titre, artiste, cue */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Réordonnancement */}
                  <div className="flex flex-col gap-0.5 text-stone-300 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0 || busy}
                      onClick={() => handleMove(idx, 'up')}
                      className="hover:text-stone-700 disabled:opacity-20"
                      title="Monter"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tracks.length - 1 || busy}
                      onClick={() => handleMove(idx, 'down')}
                      className="hover:text-stone-700 disabled:opacity-20"
                      title="Descendre"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Ordinal Bodoni (signature éditoriale) */}
                  <span
                    className={`hidden sm:block text-xl leading-none tabular-nums select-none w-8 text-right shrink-0 ${
                      isCurrentPlaying ? 'text-rose-500' : 'text-[#E9B9C8]'
                    }`}
                    style={{ fontFamily: "'Bodoni Moda', 'Didot', serif" }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Numéro & Play trigger */}
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track)}
                    className={`w-9 h-9 flex items-center justify-center shrink-0 border transition-all ${
                      isCurrentPlaying
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400 hover:text-stone-900'
                    }`}
                    title="Écouter ou sélectionner dans le lecteur studio"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>

                  {/* Pochette miniature si présente */}
                  {track.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-9 h-9 object-cover border border-stone-200 shrink-0 hidden sm:block"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-stone-100 border border-stone-200 hidden sm:flex items-center justify-center shrink-0">
                      <Disc3 className="w-4 h-4 text-stone-400" />
                    </div>
                  )}

                  {/* Titre & Artiste */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-serif text-[15px] sm:text-base font-semibold text-charcoal-900 truncate leading-snug"
                      >
                        {track.title}
                      </span>

                      {/* Tag flag */}
                      {track.flag === 'must_play' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          <Flame className="w-2.5 h-2.5 text-rose-600" />
                          MUST-PLAY
                        </span>
                      )}
                      {track.flag === 'banned' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                          <Ban className="w-2.5 h-2.5 text-red-600" />
                          INTERDIT
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] sm:text-xs text-stone-500 italic truncate mt-0.5">
                      {track.artist}
                    </p>

                    {/* Note DJ & Cue */}
                    {(track.notes || track.cue_time) && (
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-600">
                        {track.cue_time && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            Départ : {track.cue_time}
                          </span>
                        )}
                        {track.notes && (
                          <span className="truncate italic">
                            « {track.notes} »
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Droite : Actions */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 pl-12 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(track)}
                    disabled={busy}
                    className="p-1.5 text-stone-400 hover:text-stone-800 transition-colors"
                    title="Modifier ce titre"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Supprimer « ${track.title} » de cette liste ?`)) {
                        onRemoveTrack(track.id);
                      }
                    }}
                    disabled={busy}
                    className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                    title="Supprimer ce titre"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
