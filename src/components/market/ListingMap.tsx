'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

// Carte de localisation type leboncoin : géocodage ville via Nominatim (OSM,
// sans clé API) puis iframe embed centrée avec marqueur. Masquée si introuvable.
export default function ListingMap({ city, postalCode }: { city: string; postalCode?: string }) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!city) return;
    const query = `${city} ${postalCode || ''}, France`.trim();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((res) => {
        const first = Array.isArray(res) && res[0];
        if (first) setCoords({ lat: parseFloat(first.lat), lon: parseFloat(first.lon) });
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [city, postalCode]);

  if (failed) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-charcoal-100 bg-charcoal-50 h-56 relative">
      {coords ? (
        <iframe
          title={`Carte de ${city}`}
          loading="lazy"
          className="w-full h-full border-0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.12}%2C${coords.lat - 0.08}%2C${coords.lon + 0.12}%2C${coords.lat + 0.08}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-charcoal-400 text-sm gap-2">
          <MapPin className="w-4 h-4 animate-pulse" /> Chargement de la carte…
        </div>
      )}
    </div>
  );
}
