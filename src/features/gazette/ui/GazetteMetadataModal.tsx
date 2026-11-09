'use client';

import { useState } from 'react';
import { Gazette, GazetteTheme, GAZETTE_THEMES } from '../domain/types';
import { X, Palette, Image as ImageIcon, Calendar, MapPin, Type, Sparkles } from 'lucide-react';

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
                Personnalisez le titre, le thème visuel et la une
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
          {/* Choix du Thème */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
              Style & Thème du journal
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
                        ? 'border-rose-600 bg-rose-50/20 shadow-xs'
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
                          ? 'bg-rose-600 text-white'
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
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Date du mariage
              </label>
              <input
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Lieu de réception
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              URL de la photo de couverture
            </label>
            <input
              type="url"
              value={coverPath}
              onChange={(e) => setCoverPath(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              placeholder="https://... (Lien de la photo des mariés)"
            />
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
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Enregistrer les paramètres
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

