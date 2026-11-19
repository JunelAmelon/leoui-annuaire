'use client';

import React from 'react';
import { Ban, Trash2 } from 'lucide-react';
import type { PlaylistTrack } from '../domain/types';

interface BlacklistSummaryCardProps {
  tracks: PlaylistTrack[];
  onRemoveTrack: (trackId: string) => Promise<void>;
  onUnbanTrack: (trackId: string) => Promise<void>;
}

export function BlacklistSummaryCard({
  tracks,
  onRemoveTrack,
  onUnbanTrack,
}: BlacklistSummaryCardProps) {
  const bannedTracks = tracks.filter((t) => t.flag === 'banned');

  if (bannedTracks.length === 0) return null;

  return (
    <div className="bg-[#FFF8F8] border border-red-200 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-red-100 text-red-700">
          <Ban className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold tracking-wider text-red-900 uppercase">
            BLACKLIST — TITRES FORMELLEMENT INTERDITS ({bannedTracks.length})
          </h4>
          <p className="text-[11px] text-red-700">
            Ces titres ne doivent en aucun cas être diffusés ou acceptés sur demande d'invité.
          </p>
        </div>
      </div>

      <div className="divide-y divide-red-100 bg-white border border-red-100">
        {bannedTracks.map((bt) => (
          <div
            key={bt.id}
            className="p-2.5 sm:px-3 sm:py-2 flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0">
              <span className="font-semibold text-stone-900">
                {bt.title}
              </span>
              <span className="text-stone-500 italic ml-2">
                — {bt.artist}
              </span>
              {bt.notes && (
                <span className="text-red-700 block sm:inline sm:ml-2 text-[11px]">
                  (Raison : {bt.notes})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onUnbanTrack(bt.id)}
                className="text-[10px] uppercase font-semibold text-stone-500 hover:text-stone-900 px-2 py-0.5 border border-stone-200"
                title="Retirer de la blacklist (repasser en normal)"
              >
                Réautoriser
              </button>
              <button
                type="button"
                onClick={() => onRemoveTrack(bt.id)}
                className="p-1 text-stone-400 hover:text-red-600"
                title="Supprimer totalement"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
