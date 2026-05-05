'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Search, Award, FileCheck, ArrowLeft, Star } from 'lucide-react';

export default function ExpertisePage() {
  const criteres = [
    { label: 'Qualité du travail', desc: 'Portfolio analysé, cohérence artistique' },
    { label: 'Expérience terrain', desc: 'Minimum 3 ans d\'activité, références vérifiées' },
    { label: 'Réactivité', desc: 'Délai de réponse aux demandes < 24h' },
    { label: 'Transparence', desc: 'Devis clairs, pas de frais cachés' },
    { label: 'Assurances', desc: 'RC Pro à jour, conformité légale' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Sélection prestataires"
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
          
          <span className="text-rose-400 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Étape 2</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
            Notre expertise,
            <span className="block italic text-rose-300 mt-1">votre sérénité</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            Nous ne vous proposons pas une liste de prestataires au hasard. 
            Chaque professionnel est sélectionné selon des critères stricts et adapté à votre projet spécifique.
          </p>
        </div>
      </section>

      {/* Contenu */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Notre méthode */}
          <div className="mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-800 mb-6">
              Comment nous sélectionnons nos prestataires
            </h2>
            <p className="text-stone-600 mb-8">
              Notre réseau comprend plus de 500 professionnels, mais seulement 40% sont présentés à nos couples. 
              Voici les critères qui font la différence :
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {criteres.map((critere, i) => (
                <div key={i} className="bg-stone-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4 text-rose-600" />
                    <span className="font-medium text-stone-800 text-sm">{critere.label}</span>
                  </div>
                  <p className="text-stone-600 text-xs">{critere.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Process de matching */}
          <div className="mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-6">Notre process de matching</h3>
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-rose-100 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-rose-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-stone-800 mb-1">Analyse de votre brief</h4>
                  <p className="text-stone-600 text-sm">Nous reprenons les éléments clés de notre premier échange : budget, style, date, lieu.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-champagne-100 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-champagne-700">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-stone-800 mb-1">Sélection ciblée</h4>
                  <p className="text-stone-600 text-sm">Nous consultons notre réseau et sélectionnons 2 à 3 prestataires par catégorie, disponibles à votre date.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-stone-100 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-stone-700">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-stone-800 mb-1">Présentation personnalisée</h4>
                  <p className="text-stone-600 text-sm">Vous recevez un document détaillant chaque recommandation, avec portfolios, tarifs et disponibilités.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chiffres concrets */}
          <div className="grid grid-cols-3 gap-6 mb-16 py-8 border-y border-stone-200">
            <div className="text-center">
              <p className="font-display text-3xl text-rose-600 font-bold">500+</p>
              <p className="text-stone-600 text-sm">Prestataires référencés</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl text-rose-600 font-bold">40%</p>
              <p className="text-stone-600 text-sm">Taux de sélection</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl text-rose-600 font-bold">48h</p>
              <p className="text-stone-600 text-sm">Délai de proposition</p>
            </div>
          </div>

          {/* Témoignage */}
          <div className="mb-16">
            <div className="bg-stone-900 p-8">
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/90 italic mb-6">
                "On avait peur de tomber sur des prestataires "tout le monde les connaît" sans originalité. 
                Finalement, on a découvert une fleuriste locale incroyable qu'on n'aurait jamais trouvée seuls."
              </p>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=100" 
                  alt="Sophie & Marc"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-white text-sm">Sophie & Marc</p>
                  <p className="text-white/50 text-xs">Mariés en juin 2024 — Lyon</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="font-serif text-2xl text-stone-800 mb-4">
              Vous aussi, trouvez vos prestataires idéaux
            </h3>
            <p className="text-stone-600 mb-8 max-w-lg mx-auto">
              Chaque recommandation est pensée pour votre projet. Pas de propositions génériques, 
              que des suggestions qui font sens.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium px-8 py-4 transition-colors"
              >
                Commencer mon projet <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/planifier-votre-mariage/espace" 
                className="inline-flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium px-8 py-4 transition-colors"
              >
                Découvrir les outils <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
