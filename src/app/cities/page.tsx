'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatAssistant from '@/components/ChatAssistant';
import { MapPin, ArrowRight, Search, X } from 'lucide-react';

export default function CitiesPage() {
  const [citySearch, setCitySearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('Toutes');
  const regionNames = ['Toutes', 'Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur', 'Nouvelle-Aquitaine', 'Occitanie', 'Bretagne'];
  const regions = [
    {
      name: 'Île-de-France',
      cities: [
        { name: 'Paris', count: 450, imageUrl: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Versailles', count: 87, imageUrl: 'https://images.pexels.com/photos/2664216/pexels-photo-2664216.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Fontainebleau', count: 54, imageUrl: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Auvergne-Rhône-Alpes',
      cities: [
        { name: 'Lyon', count: 287, imageUrl: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Annecy', count: 123, imageUrl: 'https://images.pexels.com/photos/3214994/pexels-photo-3214994.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Chamonix', count: 76, imageUrl: 'https://images.pexels.com/photos/2422264/pexels-photo-2422264.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Provence-Alpes-Côte d\'Azur',
      cities: [
        { name: 'Aix-en-Provence', count: 198, imageUrl: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Nice', count: 165, imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Marseille', count: 142, imageUrl: 'https://images.pexels.com/photos/2245436/pexels-photo-2245436.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Cannes', count: 134, imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Nouvelle-Aquitaine',
      cities: [
        { name: 'Bordeaux', count: 165, imageUrl: 'https://images.pexels.com/photos/1974594/pexels-photo-1974594.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Biarritz', count: 98, imageUrl: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'La Rochelle', count: 89, imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Occitanie',
      cities: [
        { name: 'Toulouse', count: 156, imageUrl: 'https://images.pexels.com/photos/1755683/pexels-photo-1755683.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Montpellier', count: 134, imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Carcassonne', count: 67, imageUrl: 'https://images.pexels.com/photos/2245436/pexels-photo-2245436.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
    {
      name: 'Bretagne',
      cities: [
        { name: 'Rennes', count: 112, imageUrl: 'https://images.pexels.com/photos/2422265/pexels-photo-2422265.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Saint-Malo', count: 87, imageUrl: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800' },
        { name: 'Vannes', count: 54, imageUrl: 'https://images.pexels.com/photos/2422264/pexels-photo-2422264.jpeg?auto=compress&cs=tinysrgb&w=800' },
      ],
    },
  ];

  const allCities = regions.flatMap(r => r.cities.map(c => ({ ...c, region: r.name })));
  const filteredRegions = regions
    .filter(r => activeRegion === 'Toutes' || r.name === activeRegion)
    .map(r => ({
      ...r,
      cities: r.cities.filter(c => !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase())),
    }))
    .filter(r => r.cities.length > 0);

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* HERO — cinematic full-bleed with diagonal overlay + search */}
      <section className="relative overflow-hidden" style={{ height: '88vh', minHeight: '560px' }}>
        {/* Background mosaic: multiple images */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-1">
          <div className="col-span-2 relative overflow-hidden">
            <img
              src="https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Paris"
              className="w-full h-full object-cover scale-105"
            />
          </div>
          <div className="grid grid-rows-2 overflow-hidden">
            <div className="overflow-hidden">
              <img src="https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Provence" className="w-full h-full object-cover scale-105" />
            </div>
            <div className="overflow-hidden">
              <img src="https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Lyon" className="w-full h-full object-cover scale-105" />
            </div>
          </div>
        </div>

        {/* Layered gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-900/60 to-charcoal-900/20" style={{ background: 'linear-gradient(to top, rgba(15,10,20,0.97) 0%, rgba(15,10,20,0.65) 35%, rgba(15,10,20,0.2) 70%, transparent 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(15,10,20,0.85) 0%, transparent 60%)' }} />

        {/* Floating stat badges */}
        <div className="absolute top-1/4 right-8 hidden xl:flex flex-col gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white text-center">
            <p className="font-display text-2xl font-bold">18</p>
            <p className="text-xs text-white/70">Régions</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white text-center">
            <p className="font-display text-2xl font-bold">85+</p>
            <p className="text-xs text-white/70">Villes</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white text-center">
            <p className="font-display text-2xl font-bold">3 500+</p>
            <p className="text-xs text-white/70">Prestataires</p>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-4 sm:px-8 max-w-5xl mx-auto">
          {/* Label */}
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-10 bg-rose-500" />
            <span className="text-rose-400 text-sm font-medium uppercase tracking-widest">France entière</span>
          </div>

          <h1 className="font-display text-white mb-4" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', lineHeight: '1.08' }}>
            Votre mariage,<br />
            <span className="italic text-champagne-300">où vous le rêvez</span>
          </h1>
          <p className="text-white/70 text-lg mb-8 max-w-xl">
            Des Alpes à la Côte d'Azur, de Paris à la Bretagne — trouvez les meilleurs prestataires de mariage dans toutes les régions de France.
          </p>

          {/* Search box */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="Rechercher une ville (Paris, Lyon, Bordeaux…)"
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl text-white placeholder-white/40 outline-none text-sm focus:bg-white/20 focus:border-white/30 transition-all"
              />
              {citySearch && (
                <button onClick={() => setCitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-white/50 hover:text-white" />
                </button>
              )}
            </div>
            <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-sm whitespace-nowrap">
              Trouver des prestataires
            </button>
          </div>

          {/* Quick city pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {['Paris', 'Lyon', 'Aix-en-Provence', 'Bordeaux', 'Toulouse', 'Nice'].map(city => (
              <button
                key={city}
                onClick={() => setCitySearch(city)}
                className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 hover:text-white hover:bg-white/20 rounded-full text-sm transition-all flex items-center gap-1.5"
              >
                <MapPin className="w-3 h-3" /> {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Region filter pills */}
      <div className="bg-white border-b border-charcoal-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto">
          {regionNames.map(r => (
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
                              {city.count} prestataires
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
      <ChatAssistant />
    </div>
  );
}
