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
    <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center gap-6">
      {/* Aperçu du QR Code */}
      <div className="w-36 h-36 rounded-xl bg-white border border-stone-200 p-2 shadow-xs flex items-center justify-center flex-shrink-0">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code Livre d'Or"
            className="w-full h-full object-contain rounded-lg"
          />
        ) : (
          <QrCode className="w-12 h-12 text-charcoal-300 animate-pulse" />
        )}
      </div>

      {/* Informations & Actions */}
      <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
        <div>
          <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
            Accès Invité Sans Compte
          </span>
          <h3 className="font-serif text-charcoal-900 text-lg font-normal mt-1.5">
            QR Code & Cartons à poser sur les tables
          </h3>
          <p className="text-xs text-charcoal-500 leading-relaxed max-w-lg mt-1">
            Vos invités scannent ce code avec leur téléphone (sans application ni création de compte) pour vous laisser un mot doux ou un message vocal.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-100 text-charcoal-800 hover:bg-stone-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Image QR Code PNG</span>
          </button>

          {/* Copier le lien direct */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-stone-200 text-charcoal-700 hover:border-charcoal-400 hover:text-charcoal-900 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-rose-600" />
                <span>Lien copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-charcoal-400" />
                <span>Copier le lien</span>
              </>
            )}
          </button>

          {/* Tester la vue invité */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-charcoal-500 hover:text-charcoal-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Vue invité</span>
          </a>
        </div>
      </div>
    </div>
  );
}
