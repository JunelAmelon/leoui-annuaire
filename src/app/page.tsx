"use client";

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSearchBar from '@/components/HomeSearchBar';
import HomeFeaturedVendors from '@/components/HomeFeaturedVendors';
import HomeRegions from '@/components/HomeRegions';
import { ArrowRight, MapPin, Heart, Camera, Utensils, Flower2, Music, Star, TrendingUp, Users, Award, Check, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const MÉTIERS = [
  { n: '01', label: 'Photographie',   icon: Camera,   href: '/vendors?cat=Photographes', img: 'https://images.pexels.com/photos/33996615/pexels-photo-33996615.jpeg' },
  { n: '02', label: 'Fleurs & Décor', icon: Flower2,   href: '/vendors?cat=Fleuristes',   img: 'https://images.pexels.com/photos/5789240/pexels-photo-5789240.jpeg' },
  { n: '03', label: 'Gastronomie',    icon: Utensils,  href: '/vendors?cat=Traiteurs',    img: 'https://images.pexels.com/photos/17906675/pexels-photo-17906675.jpeg' },
  { n: '04', label: 'Musique & Son',  icon: Music,     href: '/vendors?cat=DJ+%26+Musiciens', img: 'https://images.pexels.com/photos/15865408/pexels-photo-15865408.jpeg' },
];


const TESTIMONIALS = [
  { name: 'Sophie & Thomas',    city: 'Paris · juin 2025',      text: '« Une sélection irréprochable. Chaque prestataire trouvé sur LeOui.net a dépassé nos attentes. Notre jour J était exactement comme imaginé. »' },
  { name: 'Marie & Alexandre',  city: 'Lyon · septembre 2025',  text: '« Grâce à LeOui.net, nous avons constitué toute notre équipe en quelques jours. Un gain de temps précieux, une qualité incomparable. »' },
  { name: 'Camille & Julien',   city: 'Bordeaux · mai 2025',    text: "« L’interface est élégante, les prestataires sont d’une qualité rare. Notre photographe était absolument exceptionnel. »" },
];

export default function HomePage() {
  const [stats, setStats] = useState<{ vendorsCount: number; citiesCount: number; weddingsCount: number } | null>(null);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        setStats({
          vendorsCount: Number(json.vendorsCount || 0),
          citiesCount: Number(json.citiesCount || 0),
          weddingsCount: Number(json.weddingsCount || 0),
        });
      })
      .catch(() => setStats(null));
  }, []);

  // Show floating CTA when scrolling to recommendations section on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (ctaDismissed) return;
      // Find the recommendations section
      const recSection = document.getElementById('recommandations');
      if (recSection) {
        const recRect = recSection.getBoundingClientRect();
        // Show when recommendations section is reached (stays visible until footer)
        const recReached = recRect.top < window.innerHeight * 0.6;
        
        // Once shown, it stays visible until user dismisses it
        if (recReached) {
          setShowFloatingCta(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ctaDismissed]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ── HERO — clean editorial ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '100svh' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/13434415/pexels-photo-13434415.jpeg"
            alt="Mariage en France"
            className="w-full h-full object-cover object-center sm:object-center"
            style={{ objectPosition: 'center top' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-2 pb-20 sm:pt-4 sm:pb-24 flex items-center" style={{ minHeight: '100svh' }}>
          <div className="w-full max-w-3xl">
            <h1
              className="font-serif text-white mb-6"
              style={{
                fontSize: 'clamp(2.8rem, 6vw, 5.8rem)',
                lineHeight: '0.95',
                fontWeight: 300,
                letterSpacing: '-0.025em',
                maxWidth: '13ch',
              }}
            >
              Imaginez votre<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300 }}>jour parfait</em>
            </h1>
            <p className="text-white/80 mb-9 font-sans font-light leading-relaxed" style={{ fontSize: 'clamp(0.95rem, 1.3vw, 1.15rem)', maxWidth: '44ch' }}>
              Photographes, traiteurs, fleuristes, lieux de réception : une sélection haut de gamme pour créer un mariage qui vous ressemble.
            </p>

            <HomeSearchBar />
          </div>
        </div>

        {/* Animated cloud wave effect at bottom - full height to hide border */}
        <div className="absolute bottom-0 left-0 right-0 z-20" style={{ height: '140px' }}>
          <svg
            viewBox="0 0 1440 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 180L48 165C96 150 192 120 288 110C384 100 480 115 576 125C672 135 768 135 864 125C960 115 1056 100 1152 100C1248 100 1344 115 1392 125L1440 135V180H1392C1344 180 1248 180 1152 180C1056 180 960 180 864 180C768 180 672 180 576 180C480 180 384 180 288 180C192 180 96 180 48 180H0Z"
              fill="white"
            >
              <animate
                attributeName="d"
                dur="8s"
                repeatCount="indefinite"
                values="
                  M0 180L48 165C96 150 192 120 288 110C384 100 480 115 576 125C672 135 768 135 864 125C960 115 1056 100 1152 100C1248 100 1344 115 1392 125L1440 135V180H1392C1344 180 1248 180 1152 180C1056 180 960 180 864 180C768 180 672 180 576 180C480 180 384 180 288 180C192 180 96 180 48 180H0Z;
                  M0 180L48 170C96 160 192 135 288 125C384 115 480 125 576 132C672 140 768 138 864 130C960 122 1056 110 1152 108C1248 106 1344 115 1392 120L1440 125V180H1392C1344 180 1248 180 1152 180C1056 180 960 180 864 180C768 180 672 180 576 180C480 180 384 180 288 180C192 180 96 180 48 180H0Z;
                  M0 180L48 160C96 140 192 105 288 95C384 85 480 100 576 115C672 130 768 128 864 118C960 108 1056 95 1152 92C1248 89 1344 100 1392 108L1440 115V180H1392C1344 180 1248 180 1152 180C1056 180 960 180 864 180C768 180 672 180 576 180C480 180 384 180 288 180C192 180 96 180 48 180H0Z;
                  M0 180L48 165C96 150 192 120 288 110C384 100 480 115 576 125C672 135 768 135 864 125C960 115 1056 100 1152 100C1248 100 1344 115 1392 125L1440 135V180H1392C1344 180 1248 180 1152 180C1056 180 960 180 864 180C768 180 672 180 576 180C480 180 384 180 288 180C192 180 96 180 48 180H0Z
                "
              />
            </path>
          </svg>
          {/* Second wave layer for depth */}
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 left-0 right-0 w-full h-auto opacity-70"
            style={{ height: '120px' }}
            preserveAspectRatio="none"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 52C480 44 600 65 720 75C840 85 960 78 1080 67C1200 56 1320 48 1380 45L1440 42V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            >
              <animate
                attributeName="d"
                dur="12s"
                repeatCount="indefinite"
                values="
                  M0 120L60 105C120 90 240 60 360 52C480 44 600 65 720 75C840 85 960 78 1080 67C1200 56 1320 48 1380 45L1440 42V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z;
                  M0 120L60 112C120 104 240 80 360 72C480 64 600 78 720 85C840 92 960 85 1080 75C1200 65 1320 55 1380 52L1440 48V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z;
                  M0 120L60 98C120 76 240 45 360 40C480 35 600 55 720 65C840 75 960 68 1080 58C1200 48 1320 38 1380 35L1440 32V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z;
                  M0 120L60 105C120 90 240 60 360 52C480 44 600 65 720 75C840 85 960 78 1080 67C1200 56 1320 48 1380 45L1440 42V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z
                "
              />
            </path>
          </svg>
        </div>
      </section>

      {/* ── NOS MÉTIERS — numbered horizontal strip ── */}
      <section className="py-24 bg-white" style={{ backgroundColor: '#ffffff' }}>
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
                    className="font-serif text-white text-5xl leading-none drop-shadow-lg"
                    style={{ fontWeight: 200, fontStyle: 'italic', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
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
      <section id="recommandations" className="py-24 bg-white" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">

          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-medium text-rose-500 tracking-[0.1em] uppercase mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-rose-400"></span>
                Sélection
              </p>
              <h2
                className="font-serif text-charcoal-900"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em' }}
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

          {/* Magazine list — dynamic data from DB */}
          <HomeFeaturedVendors />

          <div className="mt-10 text-center">
            <Link href="/vendors" className="btn-secondary">
              Voir tous les prestataires
            </Link>
          </div>
        </div>
      </section>

      {/* ── GALERIE — asymmetric editorial grid ── */}
      <section className="py-24 bg-white" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="mb-12">
            <p className="text-sm font-medium text-rose-500 tracking-[0.1em] uppercase mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-rose-400"></span>
              Inspiration
            </p>
            <h2
              className="font-serif text-charcoal-900"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em', maxWidth: '18ch' }}
            >
              Des mariages qui nous inspirent
            </h2>
          </div>

          {/* Mobile: 3 equal cards stacked / Desktop: asymmetric grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
            <Link href="/inspiration" className="group lg:col-span-3 relative overflow-hidden block aspect-[4/3] lg:aspect-auto lg:h-[clamp(280px,50vw,540px)]">
              <img
                src="https://images.pexels.com/photos/574011/pexels-photo-574011.jpeg"
                alt="Mariage Champêtre en Provence"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 overlay-warm" />
              <div className="absolute bottom-0 left-0 p-6 lg:p-8">
                <p className="label-xs text-white/50 mb-1.5 lg:mb-2">Tendances</p>
                <h3 className="font-serif text-white text-lg lg:text-2xl font-light" style={{ letterSpacing: '-0.01em' }}>
                  Mariage champêtre<br className="hidden lg:block" /> en Provence
                </h3>
              </div>
            </Link>

            <div className="lg:col-span-2 flex flex-col gap-3 lg:gap-4 lg:h-[clamp(280px,50vw,540px)]">
              <Link href="/inspiration" className="group relative overflow-hidden block aspect-[4/3] lg:flex-1 lg:min-h-0">
                <img
                  src="https://images.pexels.com/photos/33642063/pexels-photo-33642063.jpeg"
                  alt="Élégance Parisienne"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 overlay-warm" />
                <div className="absolute bottom-0 left-0 p-6">
                  <p className="label-xs text-white/50 mb-1.5">Real Weddings</p>
                  <h3 className="font-serif text-white text-lg font-light">Élégance au château</h3>
                </div>
              </Link>
              <Link href="/inspiration" className="group relative overflow-hidden block aspect-[4/3] lg:flex-1 lg:min-h-0">
                <img
                  src="https://images.pexels.com/photos/26972546/pexels-photo-26972546.jpeg"
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
              <p className="text-sm font-medium text-rose-400 tracking-[0.1em] uppercase mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-rose-400"></span>
                Par région
              </p>
              <h2
                className="font-serif text-white"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em' }}
              >
                Trouvez vos prestataires locaux
              </h2>
            </div>
          </div>
          <HomeRegions />
        </div>
      </section>

      {/* ── TÉMOIGNAGES — pull quotes ── */}
      <section className="py-24 bg-white" style={{ backgroundColor: '#ffffff' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-rose-500 tracking-[0.1em] uppercase mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-rose-400"></span>
              Témoignages
            </p>
            <h2
              className="font-serif text-charcoal-900"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em' }}
            >
              Ce qu'ils disent
            </h2>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-champagne-500 fill-champagne-500" />
              ))}
              <span className="text-charcoal-500 text-xs ml-2 font-medium">
                4.9 / 5 — {stats ? stats.weddingsCount.toLocaleString('fr-FR') : '—'} couples
              </span>
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
                Rejoignez 1 500 professionnels qui développent leur activité via LeOui.net. Visibilité premium, leads qualifiés, espace de gestion dédié.
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

      {/* ── SEO LINKS SECTION — Entreprises par secteur et département ── */}
      <section className="py-16 bg-charcoal-50 border-t border-charcoal-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {/* Section 1: Par secteur */}
          <div className="mb-12">
            <h3 className="font-serif text-charcoal-900 text-lg mb-6" style={{ fontWeight: 500 }}>
              Entreprises spécialisées dans les mariages par secteur
            </h3>

            {/* Réception */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-charcoal-700 mb-3 uppercase tracking-wide">Réception</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Domaine mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Auberge mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Hôtel mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Restaurant mariage', href: '/vendors?cat=Traiteurs' },
                  { label: 'Salle mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Château mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Mariages à la plage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Bateau mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Prestataires */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-charcoal-700 mb-3 uppercase tracking-wide">Prestataires</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Traiteur mariage', href: '/vendors?cat=Traiteurs' },
                  { label: 'Faire part mariage', href: '/vendors?cat=Faire-part' },
                  { label: 'Cadeaux invités mariage', href: '/vendors?cat=Cadeaux+invit%C3%A9s' },
                  { label: 'Photo mariage', href: '/vendors?cat=Photographes' },
                  { label: 'Vidéo mariage', href: '/vendors?cat=Vid%C3%A9astes' },
                  { label: 'Musique mariage', href: '/vendors?cat=DJ+%26+Musiciens' },
                  { label: 'Voiture mariage', href: '/vendors?cat=Transport' },
                  { label: 'Bus mariage', href: '/vendors?cat=Transport' },
                  { label: 'Décoration mariage', href: '/vendors?cat=Fleuristes' },
                  { label: 'Chapiteau mariage', href: '/vendors?cat=Lieu+de+r%C3%A9ception' },
                  { label: 'Animation mariage', href: '/vendors?cat=Animations' },
                  { label: 'Fleurs mariage', href: '/vendors?cat=Fleuristes' },
                  { label: 'Liste de mariage', href: '/vendors?cat=Liste+de+mariage' },
                  { label: 'Organisation mariage', href: '/planifier-votre-mariage' },
                  { label: 'Lune de miel', href: '/vendors?cat=Agences+de+voyage' },
                  { label: 'Wedding cake', href: '/vendors?cat=P%C3%A2tissiers' },
                  { label: 'Food Truck', href: '/vendors?cat=Food+Truck' },
                  { label: 'Mariements', href: '/vendors' },
                  { label: 'DJ mariage', href: '/vendors?cat=DJ+%26+Musiciens' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mariée */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-charcoal-700 mb-3 uppercase tracking-wide">Mariée</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Robe de mariée', href: '/vendors?cat=Boutiques+de+robes' },
                  { label: 'Accessoires mariage', href: '/vendors?cat=Accessoires' },
                  { label: 'Bijoux mariage', href: '/vendors?cat=Bijoux' },
                  { label: 'Esthétique coiffure mariage', href: '/vendors?cat=Coiffeurs+%26+Maquilleurs' },
                  { label: 'Robe de cocktail', href: '/vendors?cat=Boutiques+de+robes' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Marié */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-charcoal-700 mb-3 uppercase tracking-wide">Marié</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Costumes mariage', href: '/vendors?cat=Costumes' },
                  { label: 'Accessoires marié', href: '/vendors?cat=Accessoires' },
                  { label: 'Soins beauté', href: '/vendors?cat=Coiffeurs+%26+Maquilleurs' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-charcoal-200 my-8" />

          {/* Section 2: Par département */}
          <div>
            <h3 className="font-serif text-charcoal-900 text-lg mb-6" style={{ fontWeight: 500 }}>
              Entreprises spécialisées dans les réceptions par département
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Île-de-France */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Île-de-France</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Seine-et-Marne', city: 'Seine-et-Marne' },
                    { label: 'Réception Paris', city: 'Paris' },
                    { label: 'Réception Yvelines', city: 'Yvelines' },
                    { label: 'Réception Val-d\'Oise', city: 'Val-d\'Oise' },
                    { label: 'Réception Essonne', city: 'Essonne' },
                    { label: 'Réception Val-de-Marne', city: 'Val-de-Marne' },
                    { label: 'Réception Seine-Saint-Denis', city: 'Seine-Saint-Denis' },
                    { label: 'Réception Hauts-de-Seine', city: 'Hauts-de-Seine' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Provence-Alpes-Côte d'Azur */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Provence - Alpes - Côte d'Azur</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Var', city: 'Var' },
                    { label: 'Réception Bouches-du-Rhône', city: 'Bouches-du-Rhône' },
                    { label: 'Réception Alpes-Maritimes', city: 'Alpes-Maritimes' },
                    { label: 'Réception Alpes-de-Haute-Provence', city: 'Alpes-de-Haute-Provence' },
                    { label: 'Réception Hautes-Alpes', city: 'Hautes-Alpes' },
                    { label: 'Réception Vaucluse', city: 'Vaucluse' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Rhône-Alpes */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Rhône - Alpes</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Rhône', city: 'Rhône' },
                    { label: 'Réception Isère', city: 'Isère' },
                    { label: 'Réception Haute-Savoie', city: 'Haute-Savoie' },
                    { label: 'Réception Savoie', city: 'Savoie' },
                    { label: 'Réception Ardèche', city: 'Ardèche' },
                    { label: 'Réception Drôme', city: 'Drôme' },
                    { label: 'Réception Loire', city: 'Loire' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Languedoc-Roussillon */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Languedoc - Roussillon</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Hérault', city: 'Hérault' },
                    { label: 'Réception Gard', city: 'Gard' },
                    { label: 'Réception Aude', city: 'Aude' },
                    { label: 'Réception Pyrénées-Orientales', city: 'Pyrénées-Orientales' },
                    { label: 'Réception Lozère', city: 'Lozère' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pays de la Loire */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Pays de la Loire</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Loire-Atlantique', city: 'Loire-Atlantique' },
                    { label: 'Réception Maine et Loire', city: 'Maine-et-Loire' },
                    { label: 'Réception Vendée', city: 'Vendée' },
                    { label: 'Réception Sarthe', city: 'Sarthe' },
                    { label: 'Réception Mayenne', city: 'Mayenne' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Midi-Pyrénées */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Midi - Pyrénées</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Haute-Garonne', city: 'Haute-Garonne' },
                    { label: 'Réception Tarn', city: 'Tarn' },
                    { label: 'Réception Gers', city: 'Gers' },
                    { label: 'Réception Tarn-et-Garonne', city: 'Tarn-et-Garonne' },
                    { label: 'Réception Ariège', city: 'Ariège' },
                    { label: 'Réception Lot', city: 'Lot' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Centre */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Centre</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Indre-et-Loire', city: 'Indre-et-Loire' },
                    { label: 'Réception Loiret', city: 'Loiret' },
                    { label: 'Réception Eure-et-Loir', city: 'Eure-et-Loir' },
                    { label: 'Réception Loir-et-Cher', city: 'Loir-et-Cher' },
                    { label: 'Réception Cher', city: 'Cher' },
                    { label: 'Réception Indre', city: 'Indre' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Nord Pas-de-Calais */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Nord Pas-de-Calais</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Nord', city: 'Nord' },
                    { label: 'Réception Pas-de-Calais', city: 'Pas-de-Calais' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Poitou-Charentes */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Poitou - Charentes</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Charente Maritime', city: 'Charente-Maritime' },
                    { label: 'Réception Vienne', city: 'Vienne' },
                    { label: 'Réception Charente', city: 'Charente' },
                    { label: 'Réception Deux-Sèvres', city: 'Deux-Sèvres' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Bourgogne */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Bourgogne</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Yonne', city: 'Yonne' },
                    { label: 'Réception Côte d\'Or', city: 'Côte-d\'Or' },
                    { label: 'Réception Saône et Loire', city: 'Saône-et-Loire' },
                    { label: 'Réception Nièvre', city: 'Nièvre' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Haute-Normandie */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Haute - Normandie</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Eure', city: 'Eure' },
                    { label: 'Réception Seine-Maritime', city: 'Seine-Maritime' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Basse-Normandie */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Basse - Normandie</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Calvados', city: 'Calvados' },
                    { label: 'Réception Orne', city: 'Orne' },
                    { label: 'Réception Manche', city: 'Manche' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Alsace */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Alsace</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Bas Rhin', city: 'Bas-Rhin' },
                    { label: 'Réception Haut Rhin', city: 'Haut-Rhin' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Suisse */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Suisse</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Genève', city: 'Genève' },
                    { label: 'Réception Vaud', city: 'Vaud' },
                    { label: 'Réception Valais', city: 'Valais' },
                    { label: 'Réception Fribourg', city: 'Fribourg' },
                    { label: 'Réception Neuchâtel', city: 'Neuchâtel' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Picardie */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Picardie</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Oise', city: 'Oise' },
                    { label: 'Réception Aisne', city: 'Aisne' },
                    { label: 'Réception Somme', city: 'Somme' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Bretagne */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-700 mb-3">Bretagne</h4>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Réception Finistère', city: 'Finistère' },
                    { label: 'Réception Morbihan', city: 'Morbihan' },
                    { label: 'Réception Côtes-d\'Armor', city: 'Côtes-d\'Armor' },
                    { label: 'Réception Ille-et-Vilaine', city: 'Ille-et-Vilaine' },
                  ].map((link, i) => (
                    <Link key={i} href={`/vendors?city=${encodeURIComponent(link.city)}`} className="text-sm text-charcoal-500 hover:text-rose-600 transition-colors">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating CTA Button - Mobile only */}
      {showFloatingCta && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-charcoal-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-charcoal-500 truncate">Trouvez votre prestataire</p>
              <p className="text-sm font-semibold text-charcoal-900">Inscription gratuite</p>
            </div>
            <Link
              href="/signup"
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-5 py-2.5 text-sm transition-colors whitespace-nowrap tracking-wide"
            >
              Commencer
            </Link>
            <button
              onClick={() => setCtaDismissed(true)}
              className="w-8 h-8 flex items-center justify-center text-charcoal-400 hover:text-charcoal-600"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
