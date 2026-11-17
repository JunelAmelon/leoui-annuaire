'use client';

/**
 * Section « Accès invité » — papier ivoire éditorial : explications + actions à gauche,
 * la vraie carte de table (miniature, mise à jour en direct) posée à droite.
 * Pas de pastille d'icône ni de bouton arrondi décoratif : un bouton principal, des liens soulignés.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import type { GuestbookCardDesign } from '../domain/customization';
import { TableCardPreview } from './TableCardPreview';

interface QRCodeCardProps {
  publicToken: string;
  weddingTitle: string;
  cardDesign: GuestbookCardDesign;
  onDownloadFlyer?: () => void;
  onCustomize?: () => void;
}

const linkCls =
  'text-[13px] text-charcoal-700 underline decoration-charcoal-300 underline-offset-[5px] hover:decoration-rose-500 hover:text-rose-700 transition-colors';

export function QRCodeCard({ publicToken, weddingTitle, cardDesign, onDownloadFlyer, onCustomize }: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/livre-or/${publicToken}` : `/livre-or/${publicToken}`;

  useEffect(() => {
    if (!publicToken) return;
    QRCode.toDataURL(publicUrl, { width: 900, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' }, errorCorrectionLevel: 'H' })
      .then(setQrDataUrl)
      .catch((err) => console.error('Erreur génération QR code:', err));
  }, [publicToken, publicUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Lien copié.');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-livre-or-${weddingTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section className="rounded-2xl bg-[#FBF8F4] border border-stone-200/80 overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_minmax(0,430px)]">
        {/* ── Texte & actions ── */}
        <div className="p-6 sm:p-9 lg:p-11 flex flex-col">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-rose-600">Accès invité · sans compte</p>
          <h3 className="font-serif text-charcoal-900 mt-3 leading-[1.15]" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', fontWeight: 400 }}>
            Un petit carton sur chaque table,<br className="hidden sm:block" /> et leurs mots vous reviennent.
          </h3>
          <p className="text-sm text-charcoal-500 leading-relaxed mt-4 max-w-md">
            Vos invités scannent le code avec l’appareil photo de leur téléphone — aucune application, aucun compte —
            et vous laissent un mot doux ou un message vocal.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {onDownloadFlyer && (
              <button type="button" onClick={onDownloadFlyer}
                className="inline-flex items-center gap-2 px-5 h-11 bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm">
                <Printer className="w-4 h-4" /> Télécharger la carte (PDF)
              </button>
            )}
            {onCustomize && (
              <button type="button" onClick={onCustomize} className={linkCls}>Personnaliser la carte</button>
            )}
          </div>

          <div className="mt-auto pt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-stone-200/80 mt-8">
            <button type="button" onClick={handleDownloadQR} className={linkCls}>QR code en PNG</button>
            <button type="button" onClick={handleCopyLink} className={linkCls}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>Voir côté invité</a>
          </div>
        </div>

        {/* ── La carte, posée sur un fond de papier ── */}
        <div className="relative bg-[#EFE8DF] flex items-center justify-center p-6 sm:p-10 lg:p-8 min-h-[220px]">
          <div className="w-full max-w-[400px] -rotate-[1.2deg] drop-shadow-[0_18px_30px_rgba(60,40,30,0.22)] transition-transform duration-300 hover:rotate-0">
            <TableCardPreview design={cardDesign} publicUrl={publicUrl} className="!rounded-sm !border-0 !shadow-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
