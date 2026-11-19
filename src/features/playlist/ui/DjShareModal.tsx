'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  RefreshCw,
  FileDown,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DayPlanMomentRef, PlaylistSection, PlaylistTrack, WeddingPlaylist } from '../domain/types';
import { generateDjBriefingPdf } from '../services/playlist-pdf.service';

interface DjShareModalProps {
  isOpen: boolean;
  playlist: WeddingPlaylist | null;
  tracks: PlaylistTrack[];
  moments: DayPlanMomentRef[];
  coupleNames: string;
  eventDate?: string;
  venueName?: string;
  busy?: boolean;
  onClose: () => void;
  onGenerateToken: () => Promise<string | null>;
  onRevokeToken: () => Promise<boolean>;
}

export function DjShareModal({
  isOpen,
  playlist,
  tracks,
  moments,
  coupleNames,
  eventDate,
  venueName,
  busy,
  onClose,
  onGenerateToken,
  onRevokeToken,
}: DjShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen || !playlist) return null;

  const token = playlist.dj_share_token;
  const isRevoked = Boolean(playlist.dj_token_revoked_at);
  const publicUrl =
    typeof window !== 'undefined' && token && !isRevoked
      ? `${window.location.origin}/playlist/${token}`
      : '';

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await generateDjBriefingPdf({
        playlist,
        tracks,
        coupleNames,
        eventDate,
        venueName,
        moments,
      });
      toast.success('Briefing DJ téléchargé en PDF.');
    } catch (err) {
      console.error('Erreur PDF:', err);
      toast.error('Erreur lors de la génération du PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFEFC] border border-stone-300 shadow-xl w-full max-w-lg p-6 sm:p-7 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-rose-700">
              ACCÈS PRESTATAIRE
            </span>
            <h3
              className="text-stone-900 text-lg font-normal"
              style={{ fontFamily: "'Bodoni Moda', serif" }}
            >
              BRIEFING & FICHE DJ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1 : Lien public sécurisé pour le DJ */}
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold tracking-wider uppercase text-stone-700">
            1. Lien en direct pour le DJ (sans connexion requise)
          </label>
          <p className="text-xs text-stone-500 leading-relaxed">
            Transmettez ce lien à votre DJ ou animateur sonore. Il aura accès en direct à vos morceaux classés par moment, aux repères temporels (cue seconds), vos notes confidentielles et la blacklist.
          </p>

          {publicUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 bg-stone-50 border border-stone-300 px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-900 text-white hover:bg-rose-700 transition-colors uppercase shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 uppercase"
                >
                  <ExternalLink className="w-3 h-3" />
                  Prévisualiser l'écran DJ
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Voulez-vous révoquer l’accès actuel et générer un nouveau lien ?')) {
                      await onGenerateToken();
                    }
                  }}
                  disabled={busy}
                  className="text-[11px] text-stone-400 hover:text-stone-700 uppercase"
                >
                  Régénérer le lien
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-stone-50 border border-stone-200 text-center space-y-3">
              <p className="text-xs text-stone-500 italic">
                Aucun lien de partage actif pour le moment.
              </p>
              <button
                type="button"
                onClick={onGenerateToken}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wider bg-stone-900 text-white hover:bg-rose-700 uppercase transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Générer le lien d'accès DJ
              </button>
            </div>
          )}
        </div>

        {/* Section 2 : Export PDF Fiche DJ */}
        <div className="space-y-3 border-t border-stone-200 pt-5">
          <label className="block text-[11px] font-semibold tracking-wider uppercase text-stone-700">
            2. Fiche papier & Briefing PDF complet
          </label>
          <p className="text-xs text-stone-500 leading-relaxed">
            Téléchargez le document d'instructions officiel au format A4 à imprimer ou envoyer par email à votre prestataire musical.
          </p>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <FileDown className="w-4 h-4 text-rose-600" />
            <span>
              {downloadingPdf ? 'Génération du PDF…' : 'Télécharger le Briefing DJ (PDF)'}
            </span>
          </button>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-stone-600 hover:text-stone-900 uppercase font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
