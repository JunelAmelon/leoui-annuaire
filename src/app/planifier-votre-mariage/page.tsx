'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Check, ArrowRight, Calendar, Users, Sparkles, CreditCard,
  MessageCircle, Image, ClipboardList, LayoutDashboard, CalendarDays,
  FileText, Star, Heart, ArrowUpRight, Play, Quote
} from 'lucide-react';

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
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
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

  const features = [
    {
      icon: LayoutDashboard,
      title: 'Tableau de bord',
      desc: 'Visualisez votre progression en un coup d\'œil. Compte à rebours, budget, invités — tout est là.',
      color: 'from-rose-50 to-rose-100',
      iconColor: 'text-rose-600',
      stat: 'J-145'
    },
    {
      icon: CalendarDays,
      title: 'Planning intelligent',
      desc: 'Un calendrier qui s\'adapte à votre rythme. Rappels automatiques et synchronisation facile.',
      color: 'from-champagne-50 to-champagne-100',
      iconColor: 'text-champagne-700',
      stat: '24/7'
    },
    {
      icon: Users,
      title: 'Prestataires vérifiés',
      desc: 'Accédez à notre réseau exclusif de professionnels sélectionnés avec soin.',
      color: 'from-stone-100 to-stone-200',
      iconColor: 'text-stone-700',
      stat: '500+'
    },
    {
      icon: CreditCard,
      title: 'Budget maîtrisé',
      desc: 'Suivez chaque dépense, visualisez vos acomptes et anticipez les paiements à venir.',
      color: 'from-amber-50 to-amber-100',
      iconColor: 'text-amber-700',
      stat: '0€'
    },
  ];

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
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
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
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-3 leading-tight">
              Organisez votre mariage
              <span className="block italic text-champagne-300 mt-1">avec sérénité</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/80 mb-6 max-w-xl leading-relaxed">
              Votre espace couple numérique tout-en-un. Planning, prestataires, budget et documents — centralisés avec l'accompagnement d'experts.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-charcoal-900 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Commencer l'aventure <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#decouvrir"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
              >
                <Play className="w-4 h-4" /> Découvrir en vidéo
              </a>
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
                    <img key={i} src={src} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-charcoal-900" />
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
            {features.map((feature, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div
                  className={`group relative bg-gradient-to-br ${feature.color} p-6 h-full cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/20" />
                  
                  {/* Stat badge */}
                  <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-2 py-1">
                    <span className="text-xs font-medium text-stone-600">{feature.stat}</span>
                  </div>

                  <div className={`w-12 h-12 bg-white/80 backdrop-blur-sm flex items-center justify-center mb-4 transition-transform duration-300 ${hoveredFeature === i ? 'scale-110' : ''}`}>
                    <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>

                  <h3 className="font-serif text-lg text-stone-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{feature.desc}</p>

                  <div className={`mt-4 flex items-center gap-2 text-sm font-medium text-stone-700 opacity-0 transition-opacity duration-300 ${hoveredFeature === i ? 'opacity-100' : ''}`}>
                    <span>En savoir plus</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </AnimatedSection>
            ))}
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
