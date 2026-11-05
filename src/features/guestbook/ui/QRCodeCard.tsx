'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Copy, Check, ExternalLink, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeCardProps {
  publicToken: string;
  weddingTitle: string;
  onDownloadFlyer?: () => void;
}

export function QRCodeCard({
  publicToken,
  weddingTitle,
  onDownloadFlyer,
}: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/livre-or/${publicToken}`
      : `/livre-or/${publicToken}`;

  useEffect(() => {
    if (!publicToken) return;

    QRCode.toDataURL(publicUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#1a1a1a', // Charcoal 900
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Erreur génération QR code:', err));
  }, [publicToken, publicUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Lien du livre d’or copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-Code-Livre-Or-${weddingTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code haute résolution téléchargé.');
  };

  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm">
      {/* Image de fond — table de mariage */}
      <img
        src="/mariage%20(1).jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-[#1D0D12]/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1D0D12]/80 via-[#2A141A]/55 to-[#2A141A]/35" />

      {/* Informations & Actions — texte sur l'image */}
      <div className="relative flex-1 min-w-0 p-5 sm:p-8 space-y-4">
        <div>
          <p className="label-xs text-rose-200 mb-1.5">Accès invité sans compte</p>
          <h3 className="font-serif text-white text-2xl leading-snug">
            QR Code & cartons de table
          </h3>
          <p className="text-sm text-white/75 leading-relaxed max-w-lg mt-2 font-light">
            Vos invités scannent ce code avec leur téléphone — sans application ni création de compte — pour vous laisser un mot doux ou un message vocal.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Télécharger le carton de table PDF prêt à poser */}
          {onDownloadFlyer && (
            <button
              type="button"
              onClick={onDownloadFlyer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer les cartons de table (PDF)</span>
            </button>
          )}

          {/* Télécharger l'image PNG brute du QR */}
          <button
            type="button"
            onClick={handleDownloadQR}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Image QR Code PNG</span>
          </button>

          {/* Copier le lien direct */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-rose-300" />
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/60" />
                <span>Copier le lien</span>
              </>
            )}
          </button>

          {/* Tester la vue invité */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Vue invité</span>
          </a>
        </div>
      </div>

      {/* QR Code — droite desktop / centré mobile */}
      <div className="relative flex w-full md:w-44 flex-shrink-0 items-center justify-center p-5 pt-0 md:pt-5">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code Livre d'Or"
            className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-4 border-white shadow-lg"
          />
        ) : (
          <QrCode className="w-10 h-10 text-white/40 animate-pulse" />
        )}
      </div>
    </div>
  );
}
