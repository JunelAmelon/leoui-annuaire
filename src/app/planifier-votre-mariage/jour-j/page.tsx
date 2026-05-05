'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Clock, MapPin, Users, Shield, ArrowLeft, Check, Heart } from 'lucide-react';

export default function JourJPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Le jour du mariage"
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
          
          <span className="text-rose-400 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Étape 4</span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
            Le grand jour,
            <span className="block italic text-rose-300 mt-1">sans stress, sans surprise</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            C'est le moment de profiter. Notre équipe gère l'intégralité de la coordination 
            pour que vous puissiez vivre pleinement chaque instant de votre mariage.
          </p>
        </div>
      </section>

      {/* Contenu */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Notre rôle le jour J */}
          <div className="mb-16">
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-800 mb-6">
              Ce que nous gérons pour vous
            </h2>
            <p className="text-stone-600 mb-8">
              Le jour J, notre équipe est sur le terrain dès les premières heures. 
              Notre mission : que tout se déroule exactement comme prévu, sans que vous ayez à vous soucier de quoi que ce soit.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Timing maîtrisé</h3>
                  <p className="text-stone-600 text-sm">Suivi précis du déroulement, ajustements en temps réel si besoin.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-champagne-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-champagne-700" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Logistique coordonnée</h3>
                  <p className="text-stone-600 text-sm">Arrivées des prestataires, installations, transitions entre les lieux.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-stone-700" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Interface unique</h3>
                  <p className="text-stone-600 text-sm">Point de contact unique pour tous les prestataires. Vous n'intervenez que pour profiter.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800 mb-1">Plan B toujours prêt</h3>
                  <p className="text-stone-600 text-sm">Météo, imprévus techniques — nous avons anticipé chaque scénario.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline de la journée */}
          <div className="bg-stone-50 p-8 mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-6">Une journée type de coordination</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold w-16">7h</span>
                <p className="text-stone-600">Arrivée sur le lieu de réception, vérification des installations avec les techniciens</p>
              </div>
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold w-16">9h</span>
                <p className="text-stone-600">Coordination avec la mairie/église, briefing avec l'officiant et le photographe</p>
              </div>
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold w-16">14h</span>
                <p className="text-stone-600">Transition cocktail → dîner, gestion des animations et surprises éventuelles</p>
              </div>
              <div className="flex gap-4">
                <span className="text-rose-600 font-bold w-16">20h</span>
                <p className="text-stone-600">Soirée dansante lancée, présence discrète en arrière-plan jusqu'à la fin</p>
              </div>
            </div>
          </div>

          {/* Nos engagements */}
          <div className="mb-16">
            <h3 className="font-serif text-xl text-stone-800 mb-6">Nos engagements concrets</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Présence sur site toute la journée</p>
                  <p className="text-stone-600 text-sm">De l'installation matinale à la fin de soirée, sans interruption.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Communication discrète</p>
                  <p className="text-stone-600 text-sm">Oreillette pour l'équipe, interventions invisibles pour les invités.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-800">Rapport post-mariage</p>
                  <p className="text-stone-600 text-sm">Compte-rendu détaillé et photos du montage envoyés sous 48h.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Témoignage */}
          <div className="mb-16">
            <div className="bg-stone-900 p-8">
              <Heart className="w-8 h-8 text-rose-400 mb-4" />
              <p className="text-white/90 italic mb-6">
                "Le jour J, on a complètement oublié qu'on avait une équipe derrière. 
                Tout a coulé de source. Le seul moment où on a pensé à elles, c'était pour les remercier 
                à la fin de la soirée. C'est ça le vrai luxe."
              </p>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?w=100" 
                  alt="Julie & Thomas"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-white text-sm">Julie & Thomas</p>
                  <p className="text-white/50 text-xs">Mariés en août 2024 — Domaine en Bourgogne</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center">
            <h3 className="font-serif text-2xl text-stone-800 mb-4">
              Envie d'un jour J sans stress ?
            </h3>
            <p className="text-stone-600 mb-8 max-w-lg mx-auto">
              Laissez-nous prendre en main la coordination. Vous n'avez qu'à profiter 
              de chaque moment précieux avec vos proches.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-8 py-4 transition-colors"
              >
                Commencer mon projet <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/vendors" 
                className="inline-flex items-center justify-center gap-2 border border-stone-300 hover:border-stone-400 text-stone-700 font-medium px-8 py-4 transition-colors"
              >
                Explorer les prestataires <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
