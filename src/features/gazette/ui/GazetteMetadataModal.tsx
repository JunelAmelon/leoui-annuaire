'use client';

import { useState } from 'react';
import { Gazette, GazetteTheme, GAZETTE_THEMES, WEDDING_COLOR_PALETTES } from '../domain/types';
import {
  X,
  Palette,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Type,
  Sparkles,
  Trash2,
  Tag,
  BookOpen,
  QrCode,
} from 'lucide-react';

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
    font_family?: 'bodoni' | 'playfair' | 'cinzel' | 'sans';
    accent_color?: string;
    qr_code_target?: 'guestbook' | 'photos' | 'honeymoon';
  }) => void;
  onClose: () => void;
}

export function GazetteMetadataModal({
  gazette,
  onSave,
  onClose,
}: GazetteMetadataModalProps) {
  const [title, setTitle] = useState(gazette.title || '');
  const [subtitle, setSubtitle] = useState(gazette.subtitle || '');
  const [weddingDate, setWeddingDate] = useState(gazette.wedding_date || '');
  const [locationName, setLocationName] = useState(gazette.location_name || '');
  const [coverPath, setCoverPath] = useState(gazette.cover_path || '');
  const [coverCaption, setCoverCaption] = useState(gazette.cover_caption || '');
  const [editorial, setEditorial] = useState(gazette.editorial || '');
  const [weatherForecast, setWeatherForecast] = useState(gazette.weather_forecast || '');
  const [theme, setTheme] = useState<GazetteTheme>(gazette.layout?.theme || 'vintage_gazette');
  const [priceTag, setPriceTag] = useState(gazette.price_tag || 'PRIX : TOUT VOTRE AMOUR');
  const [editionTag, setEditionTag] = useState(gazette.edition_tag || 'VOL. I — N° 001');
  const [accentColor, setAccentColor] = useState(gazette.layout?.accent_color || '#be123c');
  const [fontFamily, setFontFamily] = useState<'bodoni' | 'playfair' | 'cinzel' | 'sans'>(
    gazette.layout?.font_family || 'bodoni'
  );
  const [qrCodeTarget, setQrCodeTarget] = useState<'guestbook' | 'photos' | 'honeymoon'>(
    gazette.qr_code_target || 'guestbook'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || 'La Gazette des Mariés',
      subtitle: subtitle.trim(),
      wedding_date: weddingDate,
      location_name: locationName.trim(),
      cover_path: coverPath.trim() || null,
      cover_caption: coverCaption.trim(),
      editorial: editorial.trim(),
      weather_forecast: weatherForecast.trim(),
      theme,
      price_tag: priceTag.trim(),
      edition_tag: editionTag.trim(),
      accent_color: accentColor,
      font_family: fontFamily,
      qr_code_target: qrCodeTarget,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-stone-900 text-lg">
                Paramètres de la Gazette
              </h3>
              <p className="text-xs text-stone-500">
                Personnalisez les couleurs, la typographie, la Une et les micro-détails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Charte Graphique & Couleurs du Mariage */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-stone-600" />
                Couleur d'accentuation du mariage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white"
                  title="Couleur personnalisée"
                />
                <span className="font-mono text-xs text-stone-600 uppercase">{accentColor}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {WEDDING_COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setAccentColor(pal.hex)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                    accentColor.toLowerCase() === pal.hex.toLowerCase()
                      ? 'border-stone-900 bg-white shadow-xs font-bold'
                      : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: pal.hex }}
                  />
                  <span>{pal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Typographie & Thème du journal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-stone-500" /> Police des Grands Titres
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
              >
                <option value="bodoni">Bodoni Didot (Haute Couture, Vogue)</option>
                <option value="playfair">Playfair Display (Classique & Poétique)</option>
                <option value="cinzel">Cinzel Antique (Noble & Romain)</option>
                <option value="sans">Sans Épuré (Moderne & Contemporain)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-stone-500" /> Cible du QR Code (Page 4)
              </label>
              <select
                value={qrCodeTarget}
                onChange={(e) => setQrCodeTarget(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
              >
                <option value="guestbook">Livre d'or interactif</option>
                <option value="photos">Galerie photos des invités</option>
                <option value="honeymoon">Cagnotte Voyage de Noces</option>
              </select>
            </div>
          </div>

          {/* Choix du Thème */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-stone-500" /> Style de Presse
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(GAZETTE_THEMES) as GazetteTheme[]).map((tKey) => {
                const item = GAZETTE_THEMES[tKey];
                const isSelected = theme === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTheme(tKey)}
                    className={`p-3 text-left rounded-xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-stone-900 bg-stone-50 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-stone-900 block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                        {item.description}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] mt-2 font-medium px-2 py-0.5 rounded-full inline-block w-fit ${
                        isSelected
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {isSelected ? 'Sélectionné' : 'Choisir'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Micro-détails de presse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-stone-500" /> Numéro d'Édition
              </label>
              <input
                type="text"
                value={editionTag}
                onChange={(e) => setEditionTag(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: VOL. I — N° 001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-stone-500" /> Mention de Prix
              </label>
              <input
                type="text"
                value={priceTag}
                onChange={(e) => setPriceTag(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: PRIX : TOUT VOTRE AMOUR"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Titre du Journal (Manchette)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: La Gazette des Mariés"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Gros Titre / Sensation (Headline)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: ILS SE SONT DIT OUI !"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" /> Date du mariage
              </label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" /> Lieu de réception
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="Ex: Château de Champlâtreux"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-stone-500" /> Photo de couverture (Une du journal)
              </label>
              {coverPath && (
                <button
                  type="button"
                  onClick={() => setCoverPath('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer la photo</span>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={coverPath}
                onChange={(e) => setCoverPath(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="https://... (Lien de la photo des mariés)"
              />
              {coverPath && (
                <button
                  type="button"
                  onClick={() => setCoverPath('')}
                  className="px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  title="Supprimer la photo"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
            {coverPath && (
              <div className="mt-2 relative w-24 h-16 rounded-lg overflow-hidden border border-stone-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPath} alt="Aperçu couverture" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverPath('')}
                  className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Légende de la photo de une
            </label>
            <input
              type="text"
              value={coverCaption}
              onChange={(e) => setCoverCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              placeholder="Ex: « Le commencement d'une vie à deux... »"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Éditorial des mariés (Mot de bienvenue)
            </label>
            <textarea
              rows={3}
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              placeholder="Bienvenue dans notre gazette exclusive..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Météo de l'amour humoristique
            </label>
            <textarea
              rows={2}
              value={weatherForecast}
              onChange={(e) => setWeatherForecast(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              placeholder="Température : 32°C de bonheur absolu, averses de confettis..."
            />
          </div>

          <div className="px-2 pt-2 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition cursor-pointer"
            >
              Enregistrer les paramètres
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
