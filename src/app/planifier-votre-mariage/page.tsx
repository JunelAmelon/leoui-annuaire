'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, ArrowUpRight, Quote, Star } from 'lucide-react';
import TitleDecoration from '@/components/market/TitleDecoration';

// Animation hook for scroll reveal
function useScrollReveal() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Animated Section Component
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function WeddingPlannerPageV1() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const TESTIMONIALS = [
    {
      text: "LeOui.net a transformé nos préparatifs en un moment de plaisir. L'équipe a été à l'écoute de chaque détail de notre histoire.",
      name: 'Marie & Julien',
      city: 'Mariés en juin 2024 · Château de Versailles',
      photo: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      text: "Grâce à LeOui.net, nous avons trouvé notre photographe et notre traiteur en une semaine. Tout était parfait le jour J.",
      name: 'Sophie & Raphaël',
      city: 'Mariés en septembre 2024 · Domaine de Provence',
      photo: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      text: "L'espace couple nous a permis de tout centraliser. Budget, planning, prestataires — rien n'a été laissé au hasard.",
      name: 'Inès & Karim',
      city: 'Mariés en mai 2025 · Bordeaux',
      photo: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      text: "Un accompagnement d'une rare qualité. Notre wedding planner a anticipé chaque détail, nous n'avons rien eu à gérer.",
      name: 'Camille & Antoine',
      city: 'Mariés en octobre 2024 · Lyon',
      photo: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      text: "LeOui.net a changé notre façon de préparer notre mariage. Sereins, confiants, nous avons profité de chaque instant.",
      name: 'Léa & Thomas',
      city: 'Mariés en juillet 2025 · Annecy',
      photo: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [TESTIMONIALS.length]);

  const steps = [
    {
      num: '01',
      title: 'Votre vision',
      subtitle: 'Premier rendez-vous',
      desc: 'Nous prenons le temps de comprendre vos rêves, vos envies, votre histoire. Chaque détail compte.',
      image: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      num: '02', 
      title: 'Notre expertise',
      subtitle: 'Sélection sur-mesure',
      desc: 'Notre équipe sélectionne les meilleurs prestataires adaptés à votre style et votre budget.',
      image: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      num: '03',
      title: 'Votre espace',
      subtitle: 'Outils connectés',
      desc: 'Un espace digital dédié où tout se centralise. Planning, documents, messagerie — en un seul lieu.',
      image: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
      num: '04',
      title: 'Le grand jour',
      subtitle: 'Coordination complète',
      desc: 'Le jour J, nous sommes à vos côtés. Vous n\'avez qu\'à profiter de chaque instant précieux.',
      image: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO — Harmonized Style */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '580px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Wedding Planner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5B1A2E]/95 via-[#5B1A2E]/75 sm:via-[#5B1A2E]/60 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">Wedding Planner</span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-white mb-3" style={{ fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', fontWeight: 400, lineHeight: 1.15 }}>
              Organisez votre{' '}
              <span className="relative inline-block">
                mariage
                <TitleDecoration />
              </span>
              <span className="block italic text-champagne-300 mt-1">avec sérénité</span>
            </h1>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-charcoal-900 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Commencer l'aventure <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?w=100',
                    'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?w=100',
                    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?w=100',
                    'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?w=100'
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-rose-600" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-white/80 text-sm ml-1">4.9</span>
                  </div>
                  <p className="text-white/50 text-xs">500+ couples accompagnés</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="font-display text-xl text-white font-bold">98%</p>
                  <p className="text-white/50 text-xs">Satisfaction</p>
                </div>
                <div>
                  <p className="font-display text-xl text-white font-bold">24h</p>
                  <p className="text-white/50 text-xs">Réponse garantie</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Cards élégantes */}
      <section id="decouvrir" className="py-24 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Votre espace couple</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-stone-500 max-w-lg mx-auto">
              Un écosystème complet pensé pour vous faire gagner du temps et vous accompagner sereinement.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1 — Tableau de bord · carte photo */}
            <AnimatedSection delay={0}>
              <div className="group relative rounded-2xl overflow-hidden h-full min-h-[320px] bg-charcoal-900">
                <img
                  src="/mariage%20(1).jpg"
                  alt="Tableau de bord mariage"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/85 via-charcoal-950/25 to-transparent" />
                <span className="absolute top-4 right-4 bg-white/95 text-charcoal-900 text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums">J-145</span>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-serif text-xl text-white mb-1.5">Tableau de bord</h3>
                  <p className="text-xs text-white/70 leading-relaxed mb-3">
                    Visualisez votre progression en un coup d'œil. Compte à rebours, budget, invités — tout est là.
                  </p>
                  <Link href="/signup" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-rose-300 transition-colors">
                    Découvrir <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            {/* 2 — Planning intelligent · bloc rose affirmé */}
            <AnimatedSection delay={100}>
              <div className="group relative rounded-2xl bg-rose-600 p-6 h-full min-h-[320px] flex flex-col overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                <span className="self-start border border-white/30 text-white/80 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  Connecté en continu
                </span>
                <p className="font-serif text-5xl text-white mt-8 mb-auto tabular-nums">24/7</p>
                <h3 className="font-serif text-xl text-white mt-8 mb-1.5">
                  Planning <span className="bg-white text-rose-600 px-1.5">intelligent</span>
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  Un calendrier qui s'adapte à votre rythme. Rappels automatiques et synchronisation facile.
                </p>
                <Link href="/signup" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-white/80 transition-colors">
                  Découvrir <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </AnimatedSection>

            {/* 3 — Prestataires vérifiés · carte photo */}
            <AnimatedSection delay={200}>
              <div className="group relative rounded-2xl overflow-hidden h-full min-h-[320px] bg-charcoal-900">
                <img
                  src="/mariage%20(2).jpg"
                  alt="Prestataires de mariage"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/85 via-charcoal-950/25 to-transparent" />
                <span className="absolute top-4 right-4 bg-white/95 text-charcoal-900 text-xs font-semibold px-2.5 py-1 rounded-full tabular-nums">500+</span>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-serif text-xl text-white mb-1.5">Prestataires vérifiés</h3>
                  <p className="text-xs text-white/70 leading-relaxed mb-3">
                    Accédez à notre réseau exclusif de professionnels sélectionnés avec soin.
                  </p>
                  <Link href="/vendors" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-rose-300 transition-colors">
                    Découvrir <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            {/* 4 — Budget maîtrisé · bloc charbon */}
            <AnimatedSection delay={300}>
              <div className="group relative rounded-2xl bg-charcoal-900 p-6 h-full min-h-[320px] flex flex-col overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                <span className="self-start border border-white/20 text-white/70 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  Inclus dans votre espace
                </span>
                <p className="font-serif text-5xl text-champagne-300 mt-8 mb-auto tabular-nums">0&nbsp;€</p>
                <h3 className="font-serif text-xl text-white mt-8 mb-1.5">
                  Budget <span className="bg-rose-600 text-white px-1.5">maîtrisé</span>
                </h3>
                <p className="text-xs text-white/60 leading-relaxed mb-3">
                  Suivez chaque dépense et anticipez votre budget au plus juste.
                </p>
                <Link href="/signup" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-rose-300 transition-colors">
                  Découvrir <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* STEPS — Timeline élégante */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Notre méthode</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-4">
              Quatre étapes vers l'exceptionnel
            </h2>
          </AnimatedSection>

          <div className="space-y-16">
            {steps.map((step, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className={`grid lg:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                  {/* Image */}
                  <div className={`relative ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={step.image} 
                        alt={step.title}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 to-transparent" />
                    </div>
                    {/* Step number overlay */}
                    <div className="absolute -bottom-4 -left-4 bg-white px-6 py-3 shadow-lg">
                      <span className="font-serif text-3xl text-rose-600">{step.num}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`${i % 2 === 1 ? 'lg:order-1 lg:text-right' : ''}`}>
                    <span className="text-stone-400 text-xs uppercase tracking-wider mb-2 block">{step.subtitle}</span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-stone-800 mb-4">{step.title}</h3>
                    <p className="text-stone-600 leading-relaxed mb-6 max-w-md">{step.desc}</p>
                    
                    <Link 
                      href={`/planifier-votre-mariage/${step.num === '01' ? 'vision' : step.num === '02' ? 'expertise' : step.num === '03' ? 'espace' : 'jour-j'}`}
                      className={`inline-flex items-center gap-2 text-rose-600 font-medium text-sm hover:text-rose-700 transition-colors ${i % 2 === 1 ? 'lg:justify-end' : ''}`}
                    >
                      <span>Découvrir</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — Auto-rotating slider */}
      <section className="py-24 px-4 sm:px-6 bg-stone-900 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <Quote className="w-12 h-12 text-rose-400 mx-auto mb-8" />
            <div className="relative min-h-[280px] sm:min-h-[240px]">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-all duration-700 ${
                    i === activeTestimonial ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <blockquote className="font-serif text-2xl sm:text-3xl text-white leading-relaxed mb-8">
                    "{t.text}"
                  </blockquote>
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={t.photo}
                      alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-rose-400/30"
                    />
                    <div className="text-left">
                      <p className="text-white font-medium">{t.name}</p>
                      <p className="text-stone-400 text-sm">{t.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-10">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === activeTestimonial ? 'w-8 bg-rose-400' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Témoignage ${i + 1}`}
                />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6 bg-rose-50">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Gratuit pour les couples</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-800 mb-6">
              Prêt à écrire votre histoire ?
            </h2>
            <p className="text-stone-600 mb-10 max-w-lg mx-auto">
              Commencez votre aventure sans engagement. Un wedding planner vous contactera sous 24h pour échanger sur votre projet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="group inline-flex items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 text-white font-medium px-10 py-4 transition-all duration-300"
              >
                <span>Créer mon espace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/vendors" 
                className="inline-flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium px-8 py-4 transition-colors"
              >
                Explorer les prestataires
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
