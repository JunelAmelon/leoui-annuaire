'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, LayoutDashboard, CalendarDays, MessageSquare, FileText, ArrowLeft, Check } from 'lucide-react';

export default function EspacePage() {
  const outils = [
    {
      icon: LayoutDashboard,
      title: 'Tableau de bord',
      desc: 'Vue d\'ensemble de votre mariage en un coup d\'œil. Budget, checklist, compte à rebours.',
      color: 'bg-rose-50',
      iconColor: 'text-rose-600'
    },
    {
      icon: CalendarDays,
      title: 'Planning intelligent',
      desc: 'Calendrier synchronisé avec rappels automatiques. Plus rien ne tombe dans l\'oubli.',
      color: 'bg-champagne-50',
      iconColor: 'text-champagne-700'
    },
    {
      icon: MessageSquare,
      title: 'Messagerie centralisée',
      desc: 'Tous vos échanges avec prestataires regroupés. Historique conservé, rien ne se perd.',
      color: 'bg-stone-50',
      iconColor: 'text-stone-700'
    },
    {
      icon: FileText,
      title: 'Documents organisés',
      desc: 'Contrats, plannings et documents utiles stockés et classés en un seul endroit.',
      color: 'bg-amber-50',
      iconColor: 'text-amber-700'
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Espace digital"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-stone-900/45" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <Link 
            href="/planifier-votre-mariage" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          
          <span className="text-rose-400 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Étape 3</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
            Votre espace,
            <span className="block italic text-rose-300 mt-1">centralisé et clair</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            Fini les post-its partout, les emails éparpillés et les documents oubliés dans un tiroir. 
            Votre espace LeOui rassemble tout ce dont vous avez besoin pour avancer sereinement.
          </p>
        </div>
      </section>

      {/* Outils */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          <h2 className="font-serif text-2xl sm:text-3xl text-stone-800 mb-12 text-center">
            Les outils qui simplifient vos préparatifs
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 mb-16">
            {outils.map((outil, i) => (
              <div key={i} className={`${outil.color} p-6`}>
                <div className="w-12 h-12 bg-white flex items-center justify-center mb-4">
                  <outil.icon className={`w-5 h-5 ${outil.iconColor}`} />
                </div>
                <h3 className="font-serif text-lg text-stone-800 mb-2">{outil.title}</h3>
                <p className="text-stone-600 text-sm">{outil.desc}</p>
              </div>
            ))}
          </div>

          {/* Accès et sécurité */}
          <div className="bg-stone-50 p-8 mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-6">Accès et sécurité</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Accès illimité</p>
                  <p className="text-stone-600 text-sm">Web, mobile, tablette — votre espace vous suit partout.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Partage avec votre moitié</p>
                  <p className="text-stone-600 text-sm">Vous et votre conjoint avez chacun un accès complet, synchronisé en temps réel.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Données sécurisées</p>
                  <p className="text-stone-600 text-sm">Hébergement en France, chiffrement SSL, conformité RGPD.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Support réactif</p>
                  <p className="text-stone-600 text-sm">Une question sur l'utilisation ? Notre équipe répond sous 2h en moyenne.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Avantages concrets */}
          <div className="grid sm:grid-cols-3 gap-6 mb-16 py-8 border-y border-stone-200">
            <div className="text-center">
              <p className="font-display text-3xl text-stone-900 font-bold">-40%</p>
              <p className="text-stone-600 text-sm">Temps de recherche gagné</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl text-stone-900 font-bold">3h</p>
              <p className="text-stone-600 text-sm">Économisées par semaine</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl text-stone-900 font-bold">0</p>
              <p className="text-stone-600 text-sm">Documents égarés</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="font-serif text-2xl text-stone-800 mb-4">
              Prêt à centraliser vos préparatifs ?
            </h3>
            <p className="text-stone-600 mb-8 max-w-lg mx-auto">
              Créez votre espace en 2 minutes. Gratuit et sans engagement — 
              vous ne payez que si vous engagez un wedding planner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium px-8 py-4 transition-colors"
              >
                Créer mon espace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/planifier-votre-mariage/jour-j" 
                className="inline-flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium px-8 py-4 transition-colors"
              >
                Découvrir l'étape finale <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
