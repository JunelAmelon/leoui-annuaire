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

      {/* HERO — Editorial Style */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background with parallax effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1920')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/95 via-stone-800/80 to-stone-700/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="max-w-xl">
              <AnimatedSection delay={0}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-12 bg-rose-400" />
                  <span className="text-rose-300 text-xs font-medium tracking-[0.2em] uppercase">Wedding Planner</span>
                </div>
              </AnimatedSection>
              
              <AnimatedSection delay={100}>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-6">
                  Organisez votre mariage
                  <span className="block italic text-rose-200 mt-2">avec sérénité</span>
                </h1>
              </AnimatedSection>
              
              <AnimatedSection delay={200}>
                <p className="text-lg text-stone-300 leading-relaxed mb-8 max-w-md">
                  Votre espace couple numérique tout-en-un. Planning, prestataires, budget et documents — centralisés avec l\'accompagnement d\'experts.
                </p>
              </AnimatedSection>
              
              <AnimatedSection delay={300}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/signup" 
                    className="group inline-flex items-center justify-center gap-3 bg-white hover:bg-rose-50 text-stone-900 font-medium px-8 py-4 transition-all duration-300"
                  >
                    <span>Commencer l\'aventure</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a 
                    href="#decouvrir" 
                    className="group inline-flex items-center justify-center gap-2 text-white/80 hover:text-white px-6 py-4 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Découvrir en vidéo</span>
                  </a>
                </div>
              </AnimatedSection>

              {/* Trust indicators */}
              <AnimatedSection delay={400}>
                <div className="flex items-center gap-6 mt-12 pt-8 border-t border-white/10">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-stone-600 border-2 border-stone-800 flex items-center justify-center text-xs text-white/60">
                        <Heart className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-white/80 text-sm ml-1">4.9</span>
                    </div>
                    <p className="text-white/50 text-xs">Plus de 500 couples accompagnés</p>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Right - Dashboard Preview */}
            <AnimatedSection delay={200} className="hidden lg:block">
              <div className="relative">
                {/* Decorative elements */}
                <div className="absolute -top-6 -left-6 w-24 h-24 border border-rose-300/30" />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-rose-500/10" />
                
                {/* Dashboard Card */}
                <div className="relative bg-white rounded-sm shadow-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider">Tableau de bord</p>
                      <p className="font-serif text-stone-800">Sophie & Thomas</p>
                    </div>
                    <div className="bg-rose-50 px-3 py-1.5">
                      <span className="text-rose-600 text-sm font-medium">J-127</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { value: '127', label: 'Jours', sub: 'avant le J-J' },
                      { value: '18', label: 'Prestataires', sub: 'sélectionnés' },
                      { value: '85%', label: 'Progression', sub: 'planification' },
                      { value: '12 400€', label: 'Budget', sub: 'sur 25 000€' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-stone-50 p-4">
                        <p className="font-serif text-xl text-stone-800">{stat.value}</p>
                        <p className="text-xs text-stone-500">{stat.label}</p>
                        <p className="text-[10px] text-stone-400">{stat.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-stone-400 uppercase tracking-wider">Prochaines étapes</p>
                    {[
                      { text: 'Validation du menu traiteur', done: true },
                      { text: 'Essayage robe de mariée', done: false },
                      { text: 'Réunion coordination finale', done: false },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? 'bg-rose-500' : 'border border-stone-300'}`}>
                          {step.done && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${step.done ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
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
              Quatre étapes vers l\'exceptionnel
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
                    
                    <div className={`flex items-center gap-2 text-rose-600 font-medium text-sm ${i % 2 === 1 ? 'lg:justify-end' : ''}`}>
                      <span>Découvrir</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-24 px-4 sm:px-6 bg-stone-900">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <Quote className="w-12 h-12 text-rose-400 mx-auto mb-8" />
            <blockquote className="font-serif text-2xl sm:text-3xl text-white leading-relaxed mb-8">
              "LeOui a transformé nos préparatifs en un moment de plaisir. L\'équipe a été à l\'écoute de chaque détail de notre histoire."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-700" />
              <div className="text-left">
                <p className="text-white font-medium">Marie & Julien</p>
                <p className="text-stone-400 text-sm">Mariés en juin 2024 · Château de Versailles</p>
              </div>
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
