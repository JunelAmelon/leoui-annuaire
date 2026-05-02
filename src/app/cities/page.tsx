'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MapPin, ArrowRight, Search, X } from 'lucide-react';
import { getDocuments } from '@/lib/db';

const REGION_NAMES = ['Toutes', 'Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur', 'Nouvelle-Aquitaine', 'Occitanie', 'Bretagne'];
const REGIONS = [
    {
      name: 'Île-de-France',
      cities: [
        { name: 'Paris', imageUrl: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Versailles', imageUrl: 'https://images.pexels.com/photos/2664216/pexels-photo-2664216.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Fontainebleau', imageUrl: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Auvergne-Rhône-Alpes',
      cities: [
        { name: 'Lyon', imageUrl: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Annecy', imageUrl: 'https://images.pexels.com/photos/3214994/pexels-photo-3214994.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Chamonix', imageUrl: 'https://images.pexels.com/photos/2422264/pexels-photo-2422264.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Provence-Alpes-Côte d\'Azur',
      cities: [
        { name: 'Aix-en-Provence', imageUrl: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Nice', imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Marseille', imageUrl: 'https://images.pexels.com/photos/1642125/pexels-photo-1642125.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Cannes', imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Nouvelle-Aquitaine',
      cities: [
        { name: 'Bordeaux', imageUrl: 'https://images.pexels.com/photos/1974594/pexels-photo-1974594.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Biarritz', imageUrl: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'La Rochelle', imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Occitanie',
      cities: [
        { name: 'Toulouse', imageUrl: 'https://images.pexels.com/photos/1755683/pexels-photo-1755683.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Montpellier', imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Carcassonne', imageUrl: 'https://images.pexels.com/photos/2362009/pexels-photo-2362009.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Bretagne',
      cities: [
        { name: 'Rennes', imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Saint-Malo', imageUrl: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Vannes', imageUrl: 'https://images.pexels.com/photos/2422264/pexels-photo-2422264.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
];

export default function CitiesPage() {
  const [citySearch, setCitySearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('Toutes');
  const [vendorCounts, setVendorCounts] = useState<Record<string, number>>({});

  const cityTotal = REGIONS.reduce((s, r) => s + r.cities.length, 0);

  useEffect(() => {
    getDocuments('vendors', []).then(docs => {
      const counts: Record<string, number> = {};
      (docs as any[]).forEach(d => {
        const loc = (d.location || '').toLowerCase();
        REGIONS.forEach(r => r.cities.forEach(c => {
          if (loc.includes(c.name.toLowerCase())) {
            counts[c.name] = (counts[c.name] || 0) + 1;
          }
        }));
      });
      setVendorCounts(counts);
    }).catch(() => {});
  }, []);

  const allCities = REGIONS.flatMap(r => r.cities.map(c => ({ ...c, region: r.name })));
  const filteredRegions = REGIONS
    .filter(r => activeRegion === 'Toutes' || r.name === activeRegion)
    .map(r => ({
      ...r,
      cities: r.cities.filter(c => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase())),
    }))
    .filter(r => r.cities.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO — same style as vendors page */}
      <section className="relative overflow-hidden bg-white" style={{ minHeight: '420px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt="Régions mariage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">Régions</span>
            </div>
            <h1 className="font-display text-display-md text-white mb-3">
              Votre mariage,<br />
              <span className="italic text-champagne-300">où vous le rêvez</span>
            </h1>
            <p className="text-body-md text-white/80 mb-7 max-w-lg">
              Des Alpes à la Côte d'Azur, de Paris à la Bretagne, trouvez les meilleurs prestataires dans toutes les régions.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 bg-black/20 rounded-2xl p-2 max-w-lg border border-white/15">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  placeholder="Rechercher une ville (Paris, Lyon, Bordeaux...)"
                  className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none text-sm focus:bg-white/20 transition-all"
                />
                {citySearch && (
                  <button onClick={() => setCitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>
                )}
              </div>
              <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap">
                Trouver des prestataires
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Region filter pills */}
      <div className="bg-white border-b border-charcoal-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto">
          {REGION_NAMES.map(r => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeRegion === r
                  ? 'bg-charcoal-900 text-white'
                  : 'bg-charcoal-50 text-charcoal-700 hover:bg-charcoal-100 border border-charcoal-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Results summary if searching */}
      {citySearch && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <p className="text-sm text-charcoal-600">
            {allCities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).length} ville(s) trouvée(s) pour «&nbsp;<strong>{citySearch}</strong>&nbsp;»
          </p>
        </div>
      )}

      {/* City grid by regions */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-14">
          {filteredRegions.map((region, regionIndex) => (
            <div key={regionIndex}>
              <div className="mb-7 flex items-end gap-4">
                <h2 className="font-display text-display-sm text-charcoal-900">{region.name}</h2>
                <div className="flex-1 h-px bg-charcoal-200 mb-1.5" />
                <span className="text-sm text-charcoal-500 mb-1">{region.cities.length} villes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {region.cities.map((city, cityIndex) => (
                  <Link
                    key={cityIndex}
                    href={`/cities/${city.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="group block"
                  >
                    <article className="relative h-72 rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-xl transition-all duration-400">
                      <img
                        src={city.imageUrl}
                        alt={city.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      {/* City info */}
                      <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        <div className="transform group-hover:-translate-y-1 transition-transform duration-300">
                          <p className="text-white/60 text-xs uppercase tracking-wider mb-1">{region.name}</p>
                          <h3 className="font-display text-[1.4rem] text-white mb-2 group-hover:text-champagne-300 transition-colors">
                            {city.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="text-white/80 text-sm flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-rose-400" />
                              {vendorCounts[city.name] ?? 0} prestataires
                            </p>
                            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-rose-600 transition-colors">
                              <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {filteredRegions.length === 0 && (
            <div className="text-center py-20">
              <MapPin className="w-12 h-12 text-charcoal-300 mx-auto mb-4" />
              <h3 className="font-serif text-heading-lg text-charcoal-700 mb-2">Aucune ville trouvée</h3>
              <p className="text-charcoal-500 mb-6">Essayez un autre nom de ville ou région</p>
              <button onClick={() => setCitySearch('')} className="btn-primary">
                Effacer la recherche
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-charcoal-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920" className="w-full h-full object-cover" alt="" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-display text-display-md text-white mb-4">
            Votre ville n'est pas listée ?
          </h2>
          <p className="text-body-lg text-white/70 mb-8">
            Nous couvrons toute la France. Utilisez notre moteur de recherche pour trouver des prestataires près de chez vous, où que vous soyez.
          </p>
          <Link href="/vendors" className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors">
            Rechercher des prestataires
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
