import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import { MapPin, ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';

interface CityPageProps {
  params: { city: string };
}

const cityData: Record<string, { name: string; region: string; description: string; imageUrl: string; vendorCount: number }> = {
  paris: {
    name: 'Paris',
    region: 'Île-de-France',
    description: 'La ville lumière offre un cadre incomparable pour votre mariage. Châteaux, jardins haussmanniens, bords de Seine — chaque lieu raconte une histoire unique.',
    imageUrl: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1920',
    vendorCount: 450,
  },
  lyon: {
    name: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    description: 'Capitale gastronomique de la France, Lyon est idéale pour un mariage alliant élégance et art de vivre. Traboules, vignes et vieille ville classée UNESCO.',
    imageUrl: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=1920',
    vendorCount: 287,
  },
  provence: {
    name: 'Provence',
    region: 'Provence-Alpes-Côte d\'Azur',
    description: 'Lavande, oliviers et lumière dorée : la Provence est le décor de mariage par excellence. Châteaux et domaines viticoles vous attendent pour une célébration inoubliable.',
    imageUrl: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=1920',
    vendorCount: 198,
  },
  bordeaux: {
    name: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    description: 'Entre vignobles et architecture classique, Bordeaux offre un cadre romantique et raffiné pour votre mariage. Domaines viticoles et hôtels particuliers vous accueillent.',
    imageUrl: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=1920',
    vendorCount: 165,
  },
};

const defaultCity = {
  name: '',
  region: 'France',
  description: 'Découvrez les meilleurs prestataires de mariage dans cette ville.',
  imageUrl: 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1920',
  vendorCount: 80,
};

export default function CityPage({ params }: CityPageProps) {
  const slug = params.city.toLowerCase();
  const city = cityData[slug] ?? { ...defaultCity, name: params.city.charAt(0).toUpperCase() + params.city.slice(1) };

  const vendors = [
    {
      id: 'atelier-lumiere',
      name: 'Atelier Lumière',
      category: 'Photographie',
      location: city.name,
      rating: 4.9,
      reviewCount: 127,
      imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '2 500€',
      featured: true,
    },
    {
      id: 'maison-florale',
      name: 'Maison Florale',
      category: 'Fleuriste',
      location: city.name,
      rating: 4.8,
      reviewCount: 98,
      imageUrl: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '1 800€',
    },
    {
      id: 'saveurs-et-delices',
      name: 'Saveurs & Délices',
      category: 'Traiteur',
      location: city.name,
      rating: 5.0,
      reviewCount: 156,
      imageUrl: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '85€/pers',
    },
    {
      id: 'harmonie-musicale',
      name: 'Harmonie Musicale',
      category: 'DJ & Animation',
      location: city.name,
      rating: 4.9,
      reviewCount: 84,
      imageUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '1 200€',
    },
    {
      id: 'elegance-deco',
      name: 'Élégance Déco',
      category: 'Décoration',
      location: city.name,
      rating: 4.8,
      reviewCount: 91,
      imageUrl: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '3 500€',
    },
    {
      id: 'vision-cine',
      name: 'Vision Ciné',
      category: 'Vidéographie',
      location: city.name,
      rating: 4.9,
      reviewCount: 73,
      imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
      startingPrice: '3 200€',
    },
  ];

  const categories = ['Tous', 'Photographes', 'Traiteurs', 'Fleuristes', 'DJ & Musiciens', 'Décorateurs', 'Vidéastes'];

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={city.imageUrl}
            alt={city.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal-900/50 via-charcoal-900/30 to-charcoal-900/70" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Link
            href="/cities"
            className="inline-flex items-center space-x-2 text-white/80 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Toutes les villes</span>
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <MapPin className="w-6 h-6 text-rose-400" />
            <span className="text-body-md text-white/90">{city.region}</span>
          </div>
          <h1 className="font-display text-display-lg text-white mb-4">
            Mariage à {city.name}
          </h1>
          <p className="text-body-lg text-white/90 mb-8 max-w-2xl mx-auto">
            {city.description}
          </p>

          <div className="inline-flex items-center px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full text-white font-medium">
            <MapPin className="w-5 h-5 mr-2 text-rose-400" />
            {city.vendorCount} prestataires disponibles
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-charcoal-200 p-2 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
                  <input
                    type="text"
                    placeholder={`Rechercher un prestataire à ${city.name}...`}
                    className="w-full pl-12 pr-4 py-3 bg-charcoal-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all outline-none"
                  />
                </div>
                <button className="btn-primary px-6">
                  Rechercher
                </button>
              </div>
            </div>
            <button className="btn-secondary flex items-center justify-center space-x-2 md:w-auto">
              <SlidersHorizontal className="w-5 h-5" />
              <span>Filtres</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto pb-2 mb-8">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-5 py-2.5 rounded-full font-medium text-body-sm whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  i === 0
                    ? 'bg-rose-600 text-white shadow-soft'
                    : 'bg-white text-charcoal-700 hover:bg-charcoal-50 border border-charcoal-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6">
            <p className="text-body-md text-charcoal-600">
              <span className="font-semibold text-charcoal-900">{vendors.length}</span> prestataires à {city.name}
            </p>
            <select className="input-field w-auto py-2">
              <option>Trier par : Recommandés</option>
              <option>Note (décroissante)</option>
              <option>Prix (croissant)</option>
              <option>Prix (décroissant)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button className="px-4 py-2 border-2 border-charcoal-200 rounded-lg text-charcoal-600 hover:bg-charcoal-50 transition-colors">
                Précédent
              </button>
              <button className="px-4 py-2 bg-rose-600 text-white rounded-lg">1</button>
              <button className="px-4 py-2 border-2 border-charcoal-200 rounded-lg text-charcoal-700 hover:bg-charcoal-50 transition-colors">2</button>
              <button className="px-4 py-2 border-2 border-charcoal-200 rounded-lg text-charcoal-700 hover:bg-charcoal-50 transition-colors">3</button>
              <button className="px-4 py-2 border-2 border-charcoal-200 rounded-lg text-charcoal-600 hover:bg-charcoal-50 transition-colors">
                Suivant
              </button>
            </nav>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-display-md text-charcoal-900 mb-6">
            Organiser votre mariage à {city.name}
          </h2>
          <p className="text-body-lg text-charcoal-600 mb-8">
            Nos wedding planners locaux connaissent parfaitement {city.name} et ses environs.
            Laissez-les vous guider vers les meilleures adresses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/wedding-planner" className="btn-primary inline-flex items-center space-x-2">
              <span>Contacter un wedding planner</span>
            </Link>
            <Link href="/vendors" className="btn-secondary inline-flex items-center space-x-2">
              <span>Voir tous les prestataires</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
