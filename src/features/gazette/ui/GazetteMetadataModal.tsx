'use client';

/**
 * Réglages de la Gazette : photo de Une à gauche (aperçu direct), formulaire à droite en trois onglets
 * (Journal, Style, Détails). Ne persiste rien : remonte le résultat via `onSave`.
 */

import { useRef, useState } from 'react';
import { Check, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';
import { SplitModal, modalField, modalGhostBtn, modalLabel, modalPrimaryBtn } from '@/components/ui/SplitModal';
import { GAZETTE_THEMES, WEDDING_COLOR_PALETTES, type Gazette, type GazetteTheme } from '../domain/types';
import { GazetteModelThumb } from './GazettePreview';

type FontId = 'bodoni' | 'playfair' | 'cinzel' | 'sans';
type QrTarget = 'guestbook' | 'photos' | 'honeymoon';
type Tab = 'journal' | 'style' | 'details';

interface GazetteMetadataModalProps {
  gazette: Gazette;
  onSave: (metadata: {
    title: string;
    subtitle: string;
    wedding_date: string;
    location_name: string;
    cover_path: string | null;
    cover_caption: string;
    editorial: string;
    weather_forecast: string;
    theme: GazetteTheme;
    price_tag?: string;
    edition_tag?: string;
    font_family?: FontId;
    accent_color?: string;
    qr_code_target?: QrTarget;
  }) => void;
  onClose: () => void;
}

const DEFAULT_COVER = '/mariage (4).jpg';

const FONTS: { id: FontId; label: string; sample: string; style: React.CSSProperties }[] = [
  { id: 'bodoni', label: 'Bodoni', sample: 'Sophie & Thomas', style: { fontFamily: "'Bodoni Moda', serif" } },
  { id: 'playfair', label: 'Cormorant', sample: 'Sophie & Thomas', style: { fontFamily: 'var(--font-serif), serif' } },
  { id: 'cinzel', label: 'Capitales', sample: 'Sophie & Thomas', style: { fontFamily: "'Bodoni Moda', serif", textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 15 } },
  { id: 'sans', label: 'Jost', sample: 'Sophie & Thomas', style: { fontFamily: "'Jost', sans-serif" } },
];

const QR_TARGETS: { id: QrTarget; label: string }[] = [
  { id: 'guestbook', label: 'Livre d’or' },
  { id: 'photos', label: 'Photos des invités' },
  { id: 'honeymoon', label: 'Cagnotte voyage de noces' },
];

const TABS: { id: Tab; label: string }[] = [
  { id: 'journal', label: 'Le journal' },
  { id: 'style', label: 'Style' },
  { id: 'details', label: 'Détails' },
];

export function GazetteMetadataModal({ gazette, onSave, onClose }: GazetteMetadataModalProps) {
  const [tab, setTab] = useState<Tab>('journal');
  const [title, setTitle] = useState(gazette.title || '');
  const [subtitle, setSubtitle] = useState(gazette.subtitle || '');
  const [weddingDate, setWeddingDate] = useState(gazette.wedding_date || '');
  const [locationName, setLocationName] = useState(gazette.location_name || '');
  const [coverPath, setCoverPath] = useState(gazette.cover_path || '');
  const [coverCaption, setCoverCaption] = useState(gazette.cover_caption || '');
  const [editorial, setEditorial] = useState(gazette.editorial || '');
  const [weather, setWeather] = useState(gazette.weather_forecast || '');
  const [theme, setTheme] = useState<GazetteTheme>(gazette.layout?.theme || 'vintage_gazette');
  const [priceTag, setPriceTag] = useState(gazette.price_tag || '');
  const [editionTag, setEditionTag] = useState(gazette.edition_tag || '');
  const [accent, setAccent] = useState(gazette.layout?.accent_color || '#be123c');
  const [font, setFont] = useState<FontId>(gazette.layout?.font_family || 'bodoni');
  const [qr, setQr] = useState<QrTarget>(gazette.qr_code_target || 'guestbook');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickCover = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image.'); return; }
    setUploading(true);
    try {
      setCoverPath(await uploadFile(file, 'gazettes'));
    } catch {
      toast.error('Import de la photo impossible.');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'La Gazette des Mariés',
      subtitle: subtitle.trim(),
      wedding_date: weddingDate,
      location_name: locationName.trim(),
      cover_path: coverPath.trim() || null,
      cover_caption: coverCaption.trim(),
      editorial: editorial.trim(),
      weather_forecast: weather.trim(),
      theme,
      price_tag: priceTag.trim(),
      edition_tag: editionTag.trim(),
      accent_color: accent,
      font_family: font,
      qr_code_target: qr,
    });
  };

  const choice = (active: boolean) =>
    `border text-left transition-colors rounded-sm ${active ? 'border-charcoal-900 bg-[#FBF8F4]' : 'border-stone-200 hover:border-stone-400'}`;

  return (
    <SplitModal
      image={coverPath || DEFAULT_COVER}
      kicker="La Gazette"
      title="Réglages"
      caption={title || 'La Gazette des Mariés'}
      widthClass="sm:max-w-5xl"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${modalGhostBtn} ml-auto`}>Annuler</button>
          <button type="submit" disabled={uploading} className={modalPrimaryBtn}>Enregistrer</button>
        </>
      }
    >
      <nav className="flex gap-x-7 border-b border-stone-200 -mt-1" aria-label="Rubriques des réglages">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`pb-3 -mb-px text-[13.5px] border-b-2 transition-colors ${tab === t.id ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'}`}>{t.label}</button>
        ))}
      </nav>

      {tab === 'journal' && (
        <>
          <label className="block">
            <span className={modalLabel}>Titre du journal</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="La Gazette de Sophie & Thomas" className={`${modalField} font-serif text-xl`} />
          </label>
          <label className="block">
            <span className={modalLabel}>Gros titre de la Une</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ils se sont dit oui !" className={modalField} />
          </label>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-7">
            <label className="block">
              <span className={modalLabel}>Date du mariage</span>
              <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className={modalField} />
            </label>
            <label className="block">
              <span className={modalLabel}>Lieu de réception</span>
              <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Château de la Mariée" className={modalField} />
            </label>
          </div>

          <div>
            <span className={modalLabel}>Photo de Une</span>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-2 h-10 px-4 border border-stone-300 text-[13px] text-charcoal-800 hover:border-charcoal-900 disabled:opacity-50 transition-colors rounded-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {coverPath ? 'Changer la photo' : 'Importer une photo'}
              </button>
              {coverPath && (
                <button type="button" onClick={() => setCoverPath('')} className="inline-flex items-center gap-1.5 text-[13px] text-charcoal-500 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" /> Retirer
                </button>
              )}
            </div>
            <p className="text-[12px] text-charcoal-400 mt-2">L’aperçu à gauche se met à jour tout de suite.</p>
          </div>

          <label className="block">
            <span className={modalLabel}>Légende de la photo</span>
            <input value={coverCaption} onChange={(e) => setCoverCaption(e.target.value)} placeholder="Le commencement d’une vie à deux" className={`${modalField} font-serif italic text-[16px]`} />
          </label>
        </>
      )}

      {tab === 'style' && (
        <>
          <div>
            <span className={modalLabel}>Style du journal</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {(Object.keys(GAZETTE_THEMES) as GazetteTheme[]).map((key) => (
                <button key={key} type="button" onClick={() => setTheme(key)} className={`${choice(theme === key)} p-3.5`}>
                  <span className="flex items-start justify-between gap-2">
                    <GazetteModelThumb theme={key} />
                    {theme === key && <Check className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                  </span>
                  <span className="block font-serif text-[1.05rem] text-charcoal-900 leading-tight mt-2.5">{GAZETTE_THEMES[key].label}</span>
                  <span className="block text-[12px] text-charcoal-500 mt-1 leading-snug">{GAZETTE_THEMES[key].tag}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={modalLabel}>Police des titres</span>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {FONTS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFont(f.id)} className={`${choice(font === f.id)} px-3.5 py-3`}>
                  <span className="block text-[1.2rem] leading-tight text-charcoal-900 truncate" style={f.style}>{f.sample}</span>
                  <span className="block text-[11px] text-charcoal-400 mt-1">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={modalLabel}>Couleur d’accent</span>
            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              {WEDDING_COLOR_PALETTES.map((pal) => (
                <button key={pal.id} type="button" title={pal.label} aria-label={pal.label} onClick={() => setAccent(pal.hex)}
                  className={`w-8 h-8 rounded-full transition-shadow ${accent.toLowerCase() === pal.hex.toLowerCase() ? 'ring-1 ring-offset-2 ring-charcoal-900' : 'hover:ring-1 hover:ring-offset-2 hover:ring-stone-300'}`} style={{ backgroundColor: pal.hex }} />
              ))}
              <label className="relative w-8 h-8 rounded-full border border-dashed border-stone-400 flex items-center justify-center cursor-pointer text-[11px] text-charcoal-500" title="Couleur personnalisée">
                +<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
              <span className="text-[12px] tabular-nums text-charcoal-400 uppercase ml-1">{accent}</span>
            </div>
          </div>
        </>
      )}

      {tab === 'details' && (
        <>
          <label className="block">
            <span className={modalLabel}>Le mot des mariés</span>
            <textarea rows={4} value={editorial} onChange={(e) => setEditorial(e.target.value)} placeholder="Chers invités, soyez les bienvenus…" className={`${modalField} resize-none font-serif text-[16px] leading-relaxed`} />
          </label>
          <label className="block">
            <span className={modalLabel}>Météo du cœur</span>
            <textarea rows={2} value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="Grand soleil, averses de rires en soirée." className={`${modalField} resize-none font-serif italic text-[16px]`} />
          </label>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-7">
            <label className="block">
              <span className={modalLabel}>Numéro d’édition</span>
              <input value={editionTag} onChange={(e) => setEditionTag(e.target.value)} placeholder="Édition n° 1" className={modalField} />
            </label>
            <label className="block">
              <span className={modalLabel}>Mention de prix</span>
              <input value={priceTag} onChange={(e) => setPriceTag(e.target.value)} placeholder="Prix : tout votre amour" className={modalField} />
            </label>
          </div>
          <div>
            <span className={modalLabel}>Le QR code de la dernière page mène à</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {QR_TARGETS.map((t) => (
                <button key={t.id} type="button" onClick={() => setQr(t.id)} className={`${choice(qr === t.id)} h-10 px-4 text-[13px] text-charcoal-800`}>{t.label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </SplitModal>
  );
}
