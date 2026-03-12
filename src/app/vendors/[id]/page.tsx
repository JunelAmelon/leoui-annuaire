'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VendorCard from '@/components/VendorCard';
import ChatAssistant from '@/components/ChatAssistant';
import {
  Star, MapPin, Phone, Heart, Share2, Check,
  TrendingUp, Users, X, Send, Zap, Tag, ChevronLeft,
  Play, Image as ImageIcon, ChevronDown, Award,
} from 'lucide-react';

export default function VendorProfilePage() {
  const [activeTab, setActiveTab] = useState('informations');
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const vendor = {
    name: 'Atelier Lumière',
    category: 'Photographe de mariage',
    tagline: 'Capturer l\'émotion de votre plus beau jour',
    location: 'Paris & Île-de-France',
    rating: 4.9,
    ratingLabel: 'Fabuleux',
    reviewCount: 127,
    startingPrice: '2 500€',
    experience: '12 ans',
    weddingsCompleted: 450,
    responseTime: '24 heures',
    promotionCount: 2,
    promotionLabel: '10% réduction',
    videoCount: 8,
    photoCount: 32,
  };

  const photos = [
    'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600',
    'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
    'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600',
    'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=600',
  ];

  const services = [
    { name: 'Reportage complet de la journée', included: true },
    { name: 'Séance engagement incluse', included: true },
    { name: 'Retouches professionnelles', included: true },
    { name: 'Galerie en ligne privée', included: true },
    { name: 'Album photo premium', included: false },
    { name: 'Tirage d\'art grand format', included: false },
  ];

  const reviews = [
    {
      author: 'Sophie M.',
      initials: 'SM',
      rating: 5,
      date: 'Juin 2025',
      content: 'Un photographe exceptionnel ! Les photos sont magnifiques et capturent parfaitement l\'émotion de notre mariage. Professionnel, discret et très à l\'écoute.',
      weddingDate: '15 juin 2025',
    },
    {
      author: 'Marie & Alexandre',
      initials: 'MA',
      rating: 5,
      date: 'Mai 2025',
      content: 'Nous sommes absolument ravis ! Le travail d\'Atelier Lumière dépasse toutes nos attentes. Les photos sont artistiques, authentiques et racontent parfaitement notre histoire.',
      weddingDate: '8 mai 2025',
    },
    {
      author: 'Julie R.',
      initials: 'JR',
      rating: 4,
      date: 'Avril 2025',
      content: 'Très belles photos et service professionnel. Seul petit bémol : le délai de livraison un peu long, mais le résultat en vaut la peine !',
      weddingDate: '20 avril 2025',
    },
  ];

  const faqs = [
    { q: 'Quel est votre style photographique ?', a: 'Notre style est documentaire et artistique — nous privilégions les moments spontanés et authentiques, avec une touche éditoriale pour les portraits.' },
    { q: 'Combien de temps après le mariage recevons-nous les photos ?', a: 'Vous recevrez une sélection de 50 photos sous 72h, et la galerie complète (500-800 photos) dans un délai de 6 à 8 semaines.' },
    { q: 'Déplacez-vous partout en France ?', a: 'Oui, nous intervenons dans toute la France et à l\'international. Les frais de déplacement au-delà de 100km de Paris sont à prévoir.' },
    { q: 'Proposez-vous une séance engagement ?', a: 'Absolument ! La séance engagement est incluse dans toutes nos formules. C\'est l\'occasion idéale pour apprendre à vous connaître avant le grand jour.' },
  ];

  const reportages = [
    { title: 'Mariage au Château de Vaux-le-Vicomte', date: 'Septembre 2025', imageUrl: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { title: 'Cérémonie laïque en Provence', date: 'Juillet 2025', imageUrl: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { title: 'Mariage bohème au Domaine des Moines', date: 'Juin 2025', imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { title: 'Réception au Jardin des Tuileries', date: 'Mai 2025', imageUrl: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600' },
  ];

  const team = [
    { name: 'Lucas Beaumont', role: 'Photographe principal', imageUrl: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=300', bio: '12 ans d\'expérience, spécialiste du reportage de mariage artistique.' },
    { name: 'Camille Rousseau', role: 'Photographe & Vidéaste', imageUrl: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=300', bio: 'Passionnée de cinéma et de mariage, Camille apporte une dimension cinématographique unique.' },
  ];

  const similarVendors = [
    { id: 'vision-cine', name: 'Vision Ciné', category: 'Vidéographie', location: 'Paris', rating: 4.9, reviewCount: 73, imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800', startingPrice: '3 200€' },
    { id: 'instant-precieux', name: 'Instant Précieux', category: 'Photographie', location: 'Versailles', rating: 4.8, reviewCount: 92, imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800', startingPrice: '2 200€' },
    { id: 'capture-emotion', name: 'Capture Émotion', category: 'Photographie', location: 'Paris', rating: 4.7, reviewCount: 68, imageUrl: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', startingPrice: '2 800€' },
  ];

  const tabs = [
    { id: 'informations', label: 'Informations' },
    { id: 'faq', label: 'FAQ' },
    { id: 'avis', label: `Avis ${vendor.reviewCount}` },
    { id: 'reportages', label: `Reportages ${reportages.length}` },
    { id: 'promotions', label: `Promotions ${vendor.promotionCount}` },
    { id: 'equipe', label: `Équipe ${team.length}` },
    { id: 'carte', label: 'Carte' },
  ];

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 text-body-sm text-charcoal-500">
          <Link href="/" className="hover:text-rose-600 transition-colors">Accueil</Link>
          <span>/</span>
          <Link href="/vendors" className="hover:text-rose-600 transition-colors">Prestataires</Link>
          <span>/</span>
          <Link href="/vendors" className="hover:text-rose-600 transition-colors">Photographes</Link>
          <span>/</span>
          <span className="text-charcoal-800 font-medium">{vendor.name}</span>
        </div>
      </div>

      {/* Main layout: photo grid (left) + sticky sidebar (right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0">

            {/* Photo Gallery Grid */}
            <div className="flex gap-2 h-56 sm:h-80 lg:h-[460px] rounded-2xl overflow-hidden">
              {/* Main large photo */}
              <div className="flex-[1.7] relative overflow-hidden">
                <img src={photos[0]} alt="Photo principale" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700" />
              </div>
              {/* 2×2 grid - hidden on mobile */}
              <div className="hidden sm:grid flex-1 grid-cols-2 grid-rows-2 gap-2 relative">
                <div className="overflow-hidden">
                  <img src={photos[1]} alt="Photo 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden relative">
                  <img src={photos[2]} alt="Photo 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  {/* Badges top-right */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-charcoal-700 text-xs font-medium rounded-full shadow-soft">
                      Déjà réservé ?
                    </div>
                    <button
                      onClick={() => setIsFavorite(f => !f)}
                      className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-soft hover:bg-white transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-600 fill-rose-600' : 'text-charcoal-600'}`} />
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <img src={photos[3]} alt="Photo 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden relative">
                  <img src={photos[4]} alt="Photo 5" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  {/* See more buttons */}
                  <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-charcoal-700 text-xs font-medium rounded-lg shadow-soft hover:bg-white transition-colors">
                      <Play className="w-3 h-3" /> Voir Vidéos {vendor.videoCount}
                    </button>
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-charcoal-700 text-xs font-medium rounded-lg shadow-soft hover:bg-white transition-colors">
                      <ImageIcon className="w-3 h-3" /> Voir Photos {vendor.photoCount}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 lg:mt-6 border-b border-charcoal-200 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
                      activeTab === tab.id
                        ? 'text-charcoal-900'
                        : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="mt-6 pb-16">

              {/* INFORMATIONS */}
              {activeTab === 'informations' && (
                <div>
                  <div className="flex items-center gap-3 mb-4 text-body-sm text-charcoal-500">
                    <span>Sur LeOui depuis 2019</span>
                    <span>·</span>
                    <span>Dernière mise à jour : Septembre 2025</span>
                  </div>
                  <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
                    Bienvenue chez Atelier Lumière, votre photographe de mariage passionné basé à Paris.
                    Nous mettons tout notre art au service de votre histoire d'amour. Anthony et Camille
                    privilégient une collaboration approfondie avec les futurs mariés, s'assurant de
                    comprendre pleinement vos attentes et aspirations pour ce jour si spécial.
                  </p>

                  <h3 className="font-serif text-heading-lg text-charcoal-900 mb-3 mt-8">Expérience</h3>
                  <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
                    Après douze années passées à immortaliser des mariages à travers toute la France,
                    notre équipe a développé une vision artistique unique, mêlant créativité et exigence
                    technique. Fort de ces expériences, nous nous consacrons à la création de{' '}
                    <strong>films et reportages de mariage empreints de sensibilité et d'émotion</strong>,
                    où chaque détail raconte une histoire personnelle et authentique.
                  </p>

                  <h3 className="font-serif text-heading-lg text-charcoal-900 mb-4 mt-8">Services proposés</h3>
                  <p className="text-body-md text-charcoal-700 mb-4">Deux formules adaptées à vos besoins :</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div className="bg-ivory-50 border border-charcoal-200 rounded-xl p-6">
                      <h4 className="font-semibold text-charcoal-900 mb-1">Formule Essentielle</h4>
                      <p className="font-display text-heading-xl text-rose-600 mb-4">2 500€</p>
                      <ul className="space-y-2">
                        {services.filter(s => s.included).map((s, i) => (
                          <li key={i} className="flex items-center gap-2 text-body-sm text-charcoal-700">
                            <Check className="w-4 h-4 text-rose-500 flex-shrink-0" /> {s.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-6">
                      <span className="inline-block px-2.5 py-0.5 bg-rose-600 text-white text-xs font-semibold rounded-full mb-2">Populaire</span>
                      <h4 className="font-semibold text-charcoal-900 mb-1">Formule Premium</h4>
                      <p className="font-display text-heading-xl text-rose-600 mb-4">3 800€</p>
                      <ul className="space-y-2">
                        {services.map((s, i) => (
                          <li key={i} className="flex items-center gap-2 text-body-sm text-charcoal-700">
                            <Check className="w-4 h-4 text-rose-500 flex-shrink-0" /> {s.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button className="text-rose-600 font-medium text-body-sm underline underline-offset-2 hover:text-rose-700 transition-colors">
                    En savoir plus
                  </button>
                </div>
              )}

              {/* FAQ */}
              {activeTab === 'faq' && (
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="border border-charcoal-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-charcoal-50 transition-colors"
                      >
                        <span className="font-medium text-charcoal-900">{faq.q}</span>
                        <ChevronDown className={`w-5 h-5 text-charcoal-500 transition-transform flex-shrink-0 ml-4 ${faqOpen === i ? 'rotate-180' : ''}`} />
                      </button>
                      {faqOpen === i && (
                        <div className="px-5 pb-5 text-body-md text-charcoal-700 leading-relaxed border-t border-charcoal-100">
                          <p className="pt-4">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AVIS */}
              {activeTab === 'avis' && (
                <div>
                  <div className="flex items-center gap-6 p-6 bg-white rounded-2xl border border-charcoal-200 mb-6">
                    <div className="text-center">
                      <p className="font-display text-[3.5rem] leading-none text-charcoal-900">{vendor.rating}</p>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-body-sm text-charcoal-600 mt-1">{vendor.ratingLabel}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5,4,3,2,1].map(n => (
                        <div key={n} className="flex items-center gap-3">
                          <span className="text-body-sm w-3">{n}</span>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2 bg-charcoal-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-amber-400 rounded-full`} style={{ width: n === 5 ? '78%' : n === 4 ? '15%' : '4%' }} />
                          </div>
                          <span className="text-body-sm text-charcoal-500 w-6">{n === 5 ? '78%' : n === 4 ? '15%' : n === 3 ? '4%' : '2%'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {reviews.map((review, i) => (
                      <article key={i} className="bg-white rounded-2xl border border-charcoal-100 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 font-semibold text-sm">
                              {review.initials}
                            </div>
                            <div>
                              <p className="font-semibold text-charcoal-900 text-sm">{review.author}</p>
                              <p className="text-xs text-charcoal-500">Marié(e) le {review.weddingDate}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-body-md text-charcoal-700 leading-relaxed">{review.content}</p>
                        <p className="text-body-sm text-charcoal-400 mt-2">{review.date}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* REPORTAGES */}
              {activeTab === 'reportages' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {reportages.map((r, i) => (
                    <article key={i} className="group relative h-60 rounded-2xl overflow-hidden cursor-pointer">
                      <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 p-5">
                        <p className="text-xs text-white/70 mb-1">{r.date}</p>
                        <h3 className="font-serif text-heading-sm text-white">{r.title}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* PROMOTIONS */}
              {activeTab === 'promotions' && (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-rose-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-5 h-5 text-rose-600" />
                      <span className="font-semibold text-rose-600">Offre de lancement — 10% de réduction</span>
                    </div>
                    <p className="text-body-md text-charcoal-700 mb-3">
                      Pour toute réservation avant le 31 décembre 2025, bénéficiez de 10% de remise sur la formule Premium.
                    </p>
                    <p className="text-body-sm text-charcoal-500">Valable jusqu'au 31 décembre 2025 · Code : LEOUI10</p>
                    <button onClick={() => setShowContactModal(true)} className="mt-4 btn-primary">
                      En profiter
                    </button>
                  </div>
                  <div className="bg-white border border-charcoal-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-5 h-5 text-champagne-600" />
                      <span className="font-semibold text-champagne-700">Séance engagement offerte</span>
                    </div>
                    <p className="text-body-md text-charcoal-700">
                      Pour toute réservation en semaine, la séance engagement (valeur 300€) est offerte.
                    </p>
                  </div>
                </div>
              )}

              {/* EQUIPE */}
              {activeTab === 'equipe' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {team.map((member, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-charcoal-100 p-6 flex items-start gap-4">
                      <img src={member.imageUrl} alt={member.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-charcoal-900">{member.name}</h3>
                        <p className="text-body-sm text-rose-600 mb-2">{member.role}</p>
                        <p className="text-body-sm text-charcoal-600">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CARTE */}
              {activeTab === 'carte' && (
                <div>
                  <div className="bg-charcoal-100 rounded-2xl h-80 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                      <p className="font-semibold text-charcoal-800">Paris & Île-de-France</p>
                      <p className="text-body-sm text-charcoal-500 mt-1">Zone d'intervention principale</p>
                    </div>
                  </div>
                  <p className="text-body-sm text-charcoal-500 mt-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Déplacements dans toute la France et à l'international sur demande.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT STICKY SIDEBAR */}
          <div className="w-full lg:w-[310px] flex-shrink-0 order-first lg:order-last">
            <div className="sticky top-24">
              {/* Vendor name + rating */}
              <h1 className="font-display text-[1.6rem] leading-tight text-charcoal-900 mb-2">{vendor.name}</h1>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="font-semibold text-charcoal-900">{vendor.rating}</span>
                <span className="text-charcoal-600">{vendor.ratingLabel}</span>
                <span className="text-charcoal-400">·</span>
                <button className="text-charcoal-600 underline underline-offset-2 hover:text-rose-600 text-sm" onClick={() => setActiveTab('avis')}>
                  {vendor.reviewCount} Avis
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-body-sm text-charcoal-600 mb-1">
                <MapPin className="w-4 h-4 text-charcoal-400" />
                <span className="underline cursor-pointer hover:text-rose-600 transition-colors">{vendor.location}</span>
              </div>
              <div className="flex items-center gap-1.5 mb-5">
                <Tag className="w-4 h-4 text-charcoal-400" />
                <button className="text-body-sm underline underline-offset-1 text-charcoal-600 hover:text-rose-600 transition-colors" onClick={() => setActiveTab('promotions')}>
                  {vendor.promotionCount} promotion
                </button>
                <span className="text-rose-600 font-medium text-body-sm">{vendor.promotionLabel}</span>
              </div>

              {/* Price card */}
              <div className="bg-white border border-charcoal-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-champagne-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-champagne-600" />
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500">Tarif à partir de</p>
                    <p className="font-semibold text-charcoal-900 text-base">{vendor.startingPrice}</p>
                  </div>
                </div>
              </div>

              {/* Response time */}
              <div className="flex items-center gap-2 mb-4 text-body-sm text-charcoal-600">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Réponse en {vendor.responseTime}</span>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
                >
                  Nous contacter
                </button>
                <button className="w-12 h-12 border-2 border-rose-600 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </button>
              </div>

              {/* Trust badges */}
              <div className="space-y-3 pt-4 border-t border-charcoal-100">
                <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                  <TrendingUp className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Très sollicité en Île-de-France</span>
                </div>
                <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                  <Users className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Plus de {vendor.weddingsCompleted} couples l'ont engagé</span>
                </div>
                <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                  <Star className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Très recommandé en Île-de-France</span>
                </div>
              </div>

              {/* Share */}
              <button className="flex items-center gap-2 text-body-sm text-charcoal-500 hover:text-charcoal-800 mt-5 transition-colors">
                <Share2 className="w-4 h-4" />
                Partager ce prestataire
              </button>

              {/* Mobile CTA strip — visible only on small screens */}
              <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-charcoal-100 px-4 py-3 flex gap-3 shadow-lg">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Nous contacter
                </button>
                <button className="w-12 h-12 border-2 border-rose-600 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Similar vendors */}
      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-display-sm text-charcoal-900 mb-8">Prestataires similaires</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similarVendors.map((v) => (
              <VendorCard key={v.id} {...v} />
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-7">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest mb-1">
                    {vendor.name}
                  </p>
                  <h2 className="font-display text-[1.7rem] leading-tight text-charcoal-900">
                    Plus d'information
                  </h2>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-9 h-9 bg-charcoal-100 rounded-lg flex items-center justify-center hover:bg-charcoal-200 transition-colors mt-1"
                >
                  <X className="w-4 h-4 text-charcoal-700" />
                </button>
              </div>

              <p className="text-body-sm text-charcoal-500 mb-1">
                Ce n'est pas vous ?{' '}
                <button className="underline underline-offset-1 hover:text-rose-600 transition-colors">Effacer données</button>
              </p>
              <p className="text-body-sm text-charcoal-600 mb-6">
                Remplissez ce formulaire et <strong>{vendor.name}</strong> vous contactera dans les plus brefs délais.
                Toutes les données que vous nous soumettez seront traitées de manière confidentielle.
              </p>

              <form className="space-y-3" onSubmit={e => { e.preventDefault(); setShowContactModal(false); }}>
                <div>
                  <label className="block text-xs font-medium text-charcoal-600 mb-1">Message</label>
                  <textarea
                    rows={4}
                    defaultValue="Bonjour, nous sommes en pleins préparatifs de mariage et nous aimerions en savoir plus sur vos services et disponibilités."
                    className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm text-charcoal-800 resize-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-600 mb-1">Prénom et Nom</label>
                  <input
                    type="text"
                    placeholder="Sophie Dupont"
                    className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-charcoal-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="sophie@email.fr"
                      className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-600 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      placeholder="06 12 34 56 78"
                      className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ChatAssistant />
    </div>
  );
}
