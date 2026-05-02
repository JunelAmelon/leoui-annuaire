"use client";

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeSearchBar from '@/components/HomeSearchBar';
import HomeFeaturedVendors from '@/components/HomeFeaturedVendors';
import HomeRegions from '@/components/HomeRegions';
import { ArrowRight, MapPin, Heart, Camera, Utensils, Flower2, Music, Star, TrendingUp, Users, Award, Check, Store } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-ivory-50">
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

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-20 sm:py-24 flex items-center" style={{ minHeight: '100svh' }}>
          <div className="w-full max-w-3xl">
            <p className="label-xs text-white/70 mb-5 tracking-[0.14em]">La maison du mariage en France</p>
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

          <div className="flex items-end justify-between mb-10">
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
            <Link href="/inspiration" className="group lg:col-span-3 relative overflow-hidden block" style={{ height: 'clamp(280px, 50vw, 540px)' }}>
              <img
                src="https://images.pexels.com/photos/574011/pexels-photo-574011.jpeg"
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
              <Link href="/inspiration" className="group relative overflow-hidden block flex-1" style={{ height: 'clamp(200px, 25vw, 260px)' }}>
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
              <Link href="/inspiration" className="group relative overflow-hidden block flex-1" style={{ height: 'clamp(200px, 25vw, 260px)' }}>
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

          {/* <div className="mt-8 flex justify-end">
            <Link href="/inspiration" className="inline-flex items-center gap-2 text-[0.75rem] font-medium tracking-[0.08em] uppercase text-charcoal-500 hover:text-charcoal-900 transition-colors group">
              Explorer la galerie
              <span className="h-px w-6 bg-charcoal-400 group-hover:w-10 transition-all duration-300" />
            </Link>
          </div> */}
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
          <HomeRegions />
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

      <Footer />
    </div>
  );
}
