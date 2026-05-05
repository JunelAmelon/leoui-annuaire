'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Calendar, Heart, MessageCircle, Check, ArrowLeft } from 'lucide-react';

export default function VisionPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Premier rendez-vous"
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
          
          <span className="text-rose-400 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Étape 1</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
            Votre vision,
            <span className="block italic text-rose-300 mt-1">notre point de départ</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            Avant toute chose, nous prenons le temps de vous connaître. Vos envies, votre histoire, 
            ce qui fait vibrer votre couple. Ce premier échange pose les bases de votre mariage sur-mesure.
          </p>
        </div>
      </section>

      {/* Contenu structuré */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* À quoi sert ce rendez-vous */}
          <div className="mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-800 mb-6">
              Ce que nous abordons ensemble
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Votre histoire</h3>
                  <p className="text-stone-600 text-sm">Comment vous vous êtes rencontrés, vos passions communes, ce qui vous définit en tant que couple.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-champagne-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-champagne-700" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Vos contraintes</h3>
                  <p className="text-stone-600 text-sm">Date envisagée, nombre d'invités approximatif, budget global, lieu souhaité.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-stone-700" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Vos attentes</h3>
                  <p className="text-stone-600 text-sm">Ambiance recherchée, style de mariage, éléments indispensables pour vous.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Notre méthode</h3>
                  <p className="text-stone-600 text-sm">Comment nous travaillons, nos outils, le suivi proposé tout au long des préparatifs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Durée et déroulement */}
          <div className="bg-stone-50 p-8 mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-4">Déroulement du rendez-vous</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold">15 min</span>
                <p className="text-stone-600">Présentations et échange sur votre histoire</p>
              </div>
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold">30 min</span>
                <p className="text-stone-600">Analyse de vos besoins et définition des grandes lignes</p>
              </div>
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold">15 min</span>
                <p className="text-stone-600">Présentation de notre accompagnement et réponses à vos questions</p>
              </div>
            </div>
            <p className="text-stone-500 text-sm mt-4">Durée totale : environ 1 heure — En visio ou en présentiel selon votre préférence</p>
          </div>

          {/* Preuve sociale */}
          <div className="mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-6">Ils ont commencé par ce rendez-vous</h3>
            <div className="bg-white border border-stone-200 p-6">
              <p className="text-stone-600 italic mb-4">
                "On est arrivés avec plein d'idées en vrac. En une heure, Marie a su clarifier nos priorités 
                et nous donner une direction claire. On est repartis avec un vrai sentiment de sérénité."
              </p>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100" 
                  alt="Emma & Lucas"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-stone-800 text-sm">Emma & Lucas</p>
                  <p className="text-stone-500 text-xs">Mariés en septembre 2024 — Provence</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="font-serif text-2xl text-stone-800 mb-4">
              Prêt à nous rencontrer ?
            </h3>
            <p className="text-stone-600 mb-8 max-w-lg mx-auto">
              Le premier rendez-vous est gratuit et sans engagement. C'est l'occasion de voir 
              si nous sommes faits pour travailler ensemble.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium px-8 py-4 transition-colors"
              >
                Prendre rendez-vous <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/planifier-votre-mariage/expertise" 
                className="inline-flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium px-8 py-4 transition-colors"
              >
                Découvrir l'étape suivante <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
