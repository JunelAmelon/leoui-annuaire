import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSearchBar from '@/components/HomeSearchBar';
import { ArrowRight, MapPin, Heart, Camera, Utensils, Flower2, Music, Star, TrendingUp, Users, Award, Check, Store } from 'lucide-react';

const MÉTIERS = [
  { n: '01', label: 'Photographie',   icon: Camera,   href: '/vendors?cat=Photographes', img: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { n: '02', label: 'Fleurs & Décor', icon: Flower2,   href: '/vendors?cat=Fleuristes',   img: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { n: '03', label: 'Gastronomie',    icon: Utensils,  href: '/vendors?cat=Traiteurs',    img: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { n: '04', label: 'Musique & Son',  icon: Music,     href: '/vendors?cat=DJ+%26+Musiciens', img: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

const VENDORS = [
  { id: 'atelier-lumiere',    name: 'Atelier Lumière',    cat: 'Photographie', city: 'Paris',    rating: 4.9, reviews: 127, price: 'À partir de 2 500 €', img: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=500' },
  { id: 'maison-florale',     name: 'Maison Florale',     cat: 'Fleuriste',    city: 'Lyon',     rating: 4.8, reviews: 98,  price: 'À partir de 1 800 €', img: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=500' },
  { id: 'saveurs-et-delices', name: 'Saveurs & Délices',  cat: 'Traiteur',     city: 'Provence', rating: 5.0, reviews: 156, price: 'À partir de 85 €/pers', img: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=500' },
  { id: 'harmonie-musicale',  name: 'Harmonie Musicale',  cat: 'DJ & Musique', city: 'Bordeaux', rating: 4.9, reviews: 84,  price: 'À partir de 1 200 €', img: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=500' },
];

const TESTIMONIALS = [
  { name: 'Sophie & Thomas',    city: 'Paris · juin 2025',      text: '« Une sélection irréprochable. Chaque prestataire trouvé sur LeOui a dépassé nos attentes. Notre jour J était exactement comme imaginé. »' },
  { name: 'Marie & Alexandre',  city: 'Lyon · septembre 2025',  text: '« Grâce à LeOui, nous avons constitué toute notre équipe en quelques jours. Un gain de temps précieux, une qualité incomparable. »' },
  { name: 'Camille & Julien',   city: 'Bordeaux · mai 2025',    text: "« L\u2019interface est élégante, les prestataires sont d\u2019une qualité rare. Notre photographe était absolument exceptionnel. »" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* ── HERO — editorial, left-aligned ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '100svh' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Mariage en France"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 overlay-full" />
        </div>

        {/* Content — left-aligned on a grid */}
        <div
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 flex flex-col justify-end pb-20 sm:pb-28"
          style={{ minHeight: '100svh' }}
        >
          {/* Label */}
          <p className="label-xs text-white/50 mb-6 tracking-[0.14em]">
            La maison du mariage en France
          </p>

          {/* Headline — Cormorant at weight 300 */}
          <h1
            className="font-serif text-white mb-7"
            style={{
              fontSize: 'clamp(3rem, 7vw, 6.5rem)',
              lineHeight: '0.97',
              fontWeight: 300,
              letterSpacing: '-0.025em',
              maxWidth: '14ch',
            }}
          >
            L'art de célébrer<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>votre amour</em>
          </h1>

          <p
            className="text-white/70 mb-10 font-sans font-light leading-relaxed"
            style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.0625rem)', maxWidth: '44ch' }}
          >
            Photographes, traiteurs, fleuristes, lieux de réception —<br className="hidden sm:block" />
            des professionnels d'exception, pour un mariage qui vous ressemble.
          </p>

          {/* Search bar */}
          <HomeSearchBar />

          {/* Secondary CTAs */}
          <div className="flex items-center gap-6 mt-5">
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 text-white/60 text-xs font-medium tracking-[0.07em] uppercase hover:text-white transition-colors duration-200"
            >
              Voir tous les prestataires <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-white/60 text-xs font-medium tracking-[0.07em] uppercase hover:text-white transition-colors duration-200"
            >
              <Heart className="w-3 h-3" /> Mon espace couple
            </Link>
          </div>

          {/* Minimal trust strip */}
          <div className="flex items-center gap-8 mt-14 border-t border-white/10 pt-6">
            {[
              ['1 500+', 'Prestataires'],
              ['12 000+', 'Mariages'],
              ['85+', 'Villes'],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="font-serif text-white text-xl font-light" style={{ letterSpacing: '-0.01em' }}>{n}</p>
                <p className="text-white/45 text-[0.65rem] font-medium tracking-[0.1em] uppercase mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOS MÉTIERS — numbered horizontal strip ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">

          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Nos métiers</p>
              <h2
                className="font-serif text-charcoal-900"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                Les artisans de<br />votre grand jour
              </h2>
            </div>
            <Link
              href="/vendors"
              className="hidden md:inline-flex items-center gap-2 text-[0.75rem] font-medium tracking-[0.08em] uppercase text-charcoal-500 hover:text-charcoal-900 transition-colors group"
            >
              Tout voir
              <span className="h-px w-6 bg-charcoal-400 group-hover:w-10 transition-all duration-300" />
            </Link>
          </div>

          {/* Horizontal portrait strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {MÉTIERS.map(({ n, label, href, img }) => (
              <Link key={n} href={href} className="group block relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <img
                  src={img}
                  alt={label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
                <div className="absolute inset-0 p-5 flex flex-col justify-between">
                  <span
                    className="font-serif text-white/30 text-4xl leading-none"
                    style={{ fontWeight: 300, fontStyle: 'italic' }}
                  >
                    {n}
                  </span>
                  <div>
                    <p className="text-white font-serif text-xl leading-tight" style={{ fontWeight: 400 }}>
                      {label}
                    </p>
                    <p className="text-white/40 text-[0.65rem] tracking-[0.1em] uppercase font-medium mt-1 group-hover:text-white/70 transition-colors duration-300">
                      Découvrir →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SÉLECTION — magazine list layout ── */}
      <section className="py-24 bg-ivory-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">

          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Sélection</p>
              <h2
                className="font-serif text-charcoal-900"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                Nos recommandations
              </h2>
            </div>
            <Link
              href="/vendors"
              className="hidden md:inline-flex items-center gap-2 text-[0.75rem] font-medium tracking-[0.08em] uppercase text-charcoal-500 hover:text-charcoal-900 transition-colors group"
            >
              Voir tout
              <span className="h-px w-6 bg-charcoal-400 group-hover:w-10 transition-all duration-300" />
            </Link>
          </div>

          {/* Magazine list */}
          <div className="space-y-0 divide-y divide-charcoal-100">
            {VENDORS.map((v, i) => (
              <Link key={v.id} href={`/vendors/${v.id}`} className="group flex items-center gap-6 lg:gap-10 py-7 hover:bg-white/60 transition-colors duration-200 px-2">
                {/* Index */}
                <span
                  className="hidden sm:block font-serif text-charcoal-200 text-3xl flex-shrink-0 w-8 text-right"
                  style={{ fontWeight: 300, fontStyle: 'italic', lineHeight: 1 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {/* Thumbnail */}
                <div className="w-20 h-20 lg:w-28 lg:h-20 flex-shrink-0 overflow-hidden">
                  <img
                    src={v.img}
                    alt={v.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="label-xs text-charcoal-400 mb-1">{v.cat}</p>
                  <h3
                    className="font-serif text-charcoal-900 group-hover:text-rose-700 transition-colors duration-200"
                    style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, letterSpacing: '-0.005em' }}
                  >
                    {v.name}
                  </h3>
                  <p className="text-charcoal-500 text-xs font-medium mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {v.city}
                  </p>
                </div>
                {/* Rating + price */}
                <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-champagne-500 fill-champagne-500" />
                    <span className="text-sm font-medium text-charcoal-900">{v.rating}</span>
                    <span className="text-xs text-charcoal-400">({v.reviews})</span>
                  </div>
                  <span className="text-xs text-charcoal-500 font-light">{v.price}</span>
                </div>
                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/vendors" className="btn-secondary">
              Voir tous les prestataires
            </Link>
          </div>
        </div>
      </section>

      {/* ── GALERIE — asymmetric editorial grid ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Inspiration</p>
            <h2
              className="font-serif text-charcoal-900"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: '18ch' }}
            >
              Des mariages qui nous inspirent
            </h2>
          </div>

          {/* Asymmetric: 1 tall left + 2 stacked right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4" style={{ height: 'auto' }}>
            <Link href="/inspiration" className="group lg:col-span-3 relative overflow-hidden block" style={{ height: '540px' }}>
              <img
                src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="Mariage Champêtre en Provence"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 overlay-warm" />
              <div className="absolute bottom-0 left-0 p-8">
                <p className="label-xs text-white/50 mb-2">Tendances</p>
                <h3 className="font-serif text-white text-2xl font-light" style={{ letterSpacing: '-0.01em' }}>
                  Mariage champêtre<br />en Provence
                </h3>
              </div>
            </Link>

            <div className="lg:col-span-2 flex flex-col gap-3 lg:gap-4">
              <Link href="/inspiration" className="group relative overflow-hidden block flex-1" style={{ height: '260px' }}>
                <img
                  src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="Élégance Parisienne"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 overlay-warm" />
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="label-xs text-white/50 mb-1.5">Real Weddings</p>
                  <h3 className="font-serif text-white text-lg font-light">Élégance au château</h3>
                </div>
              </Link>
              <Link href="/inspiration" className="group relative overflow-hidden block flex-1" style={{ height: '260px' }}>
                <img
                  src="https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="Romantisme bord de mer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 overlay-warm" />
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="label-xs text-white/50 mb-1.5">Inspiration</p>
                  <h3 className="font-serif text-white text-lg font-light">Romantisme au bord de mer</h3>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Link href="/inspiration" className="inline-flex items-center gap-2 text-[0.75rem] font-medium tracking-[0.08em] uppercase text-charcoal-500 hover:text-charcoal-900 transition-colors group">
              Explorer la galerie
              <span className="h-px w-6 bg-charcoal-400 group-hover:w-10 transition-all duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── REGIONS — dark section ── */}
      <section className="py-24 bg-charcoal-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="label-xs text-champagne-500 mb-3 tracking-[0.12em]">— Par région</p>
              <h2
                className="font-serif text-white"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                Trouvez vos<br />prestataires locaux
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Paris',     count: 450, img: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=500' },
              { name: 'Lyon',      count: 287, img: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=500' },
              { name: 'Provence',  count: 198, img: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=500' },
              { name: 'Bordeaux',  count: 165, img: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=500' },
            ].map((city) => (
              <Link key={city.name} href={`/cities/${city.name.toLowerCase()}`} className="group block relative overflow-hidden" style={{ height: '280px' }}>
                <img
                  src={city.img}
                  alt={city.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <h3 className="font-serif text-white text-xl font-light" style={{ letterSpacing: '-0.005em' }}>{city.name}</h3>
                  <p className="text-white/40 text-[0.65rem] tracking-[0.1em] uppercase font-medium mt-0.5">
                    {city.count} prestataires
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES — pull quotes ── */}
      <section className="py-28 bg-ivory-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <p className="label-xs text-champagne-600 mb-4 tracking-[0.12em]">— Témoignages</p>
            <h2
              className="font-serif text-charcoal-900"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.02em' }}
            >
              Ce qu'ils disent
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-champagne-500 fill-champagne-500" />
              ))}
              <span className="text-charcoal-500 text-xs ml-2 font-medium">4.9 / 5 — 12 000+ couples</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col">
                <p
                  className="font-serif text-charcoal-800 leading-relaxed flex-1 mb-6"
                  style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)', fontWeight: 300, fontStyle: 'italic' }}
                >
                  {t.text}
                </p>
                <div className="border-t border-charcoal-200 pt-5">
                  <p className="font-serif text-charcoal-900 text-sm font-medium">{t.name}</p>
                  <p className="text-charcoal-400 text-xs font-medium tracking-wide mt-0.5">{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRESTATAIRES — minimal CTA ── */}
      <section className="py-24 bg-white border-t border-charcoal-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-8 lg:gap-20">

            {/* Left — text */}
            <div className="flex-1">
              <p className="label-xs text-champagne-600 mb-4 tracking-[0.12em]">— Portail prestataires</p>
              <h2
                className="font-serif text-charcoal-900 mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 300, lineHeight: 1.08, letterSpacing: '-0.02em' }}
              >
                Vous exercez un métier<br />
                <em className="font-light" style={{ fontStyle: 'italic' }}>autour du mariage ?</em>
              </h2>
              <p className="text-charcoal-500 text-sm font-light leading-relaxed mb-8 max-w-md">
                Rejoignez 1 500 professionnels qui développent leur activité via LeOui. Visibilité premium, leads qualifiés, espace de gestion dédié.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/vendors/join" className="btn-primary">
                  <Store className="w-3.5 h-3.5" /> Créer mon espace pro
                </Link>
                <Link href="/login" className="btn-secondary">
                  J'ai un compte
                </Link>
              </div>
            </div>

            {/* Right — vertical list of benefits */}
            <div className="lg:w-72 flex-shrink-0">
              {[
                { icon: TrendingUp, text: 'Visibilité premium en ligne' },
                { icon: Users,      text: 'Demandes de couples qualifiés' },
                { icon: Award,      text: 'Badge prestataire certifié' },
                { icon: Check,      text: 'Statistiques et analytics' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 py-4 border-b border-charcoal-100 last:border-0">
                  <div className="w-8 h-8 border border-charcoal-200 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-champagne-600" />
                  </div>
                  <span className="text-charcoal-700 text-sm font-light">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
