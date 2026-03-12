'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Check, ArrowRight, Building2, LayoutDashboard, Star, Megaphone,
  CalendarDays, FileText, BarChart3, MessageSquare, Eye, Clock,
  Search, Award, Loader2,
} from 'lucide-react';

export default function VendorJoinPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', businessName: '', category: '', city: '', email: '', phone: '', password: '', terms: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (field: string, value: string | boolean) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.terms) { setError('Vous devez accepter les conditions d\'utilisation.'); return; }
    if (form.password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: `${form.firstName} ${form.lastName}`.trim(),
          businessName: form.businessName,
          category: form.category,
          city: form.city,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      await signInWithCustomToken(auth, data.customToken);
      router.push('/espace-prestataire');
    } catch (e: any) {
      setError(e?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '380px' }}>
        {/* Mobile: full background image */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Prestataires de mariage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(10, 5, 15, 0.72)' }} />
        </div>
        {/* Desktop: right photo */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2">
          <img
            src="https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Prestataires de mariage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900 via-charcoal-900/40 to-transparent" />
        </div>
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:w-1/2">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-white/90">Espace prestataire</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-champagne-400" />
            <span className="text-champagne-400 text-xs font-medium uppercase tracking-widest">Portail prestataires</span>
          </div>
          <h1 className="font-display text-white mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: '1.1' }}>
            Développez votre activité<br />
            <span className="italic text-champagne-300">avec LeOui</span>
          </h1>
          <p className="text-white/70 mb-8 max-w-lg text-base leading-relaxed">
            Vitrine en ligne, gestion des devis, avis clients, statistiques — tout ce dont vous avez besoin pour toucher des milliers de couples chaque mois.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="#register" className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              <Building2 className="w-4 h-4" /> Créer mon espace gratuit
            </a>
            <a href="#features" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
              Découvrir les fonctionnalités <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              { label: '1 500+', sub: 'Prestataires actifs' },
              { label: '50 000+', sub: 'Couples / an' },
              { label: '4.8/5', sub: 'Note moyenne' },
            ].map((s, i) => (
              <div key={i}>
                <p className="font-display text-xl text-white font-bold">{s.label}</p>
                <p className="text-white/50 text-xs">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-rose-300" />
              <span className="text-rose-600 text-xs font-semibold uppercase tracking-widest">Processus</span>
              <span className="h-px w-8 bg-rose-300" />
            </div>
            <h2 className="font-display text-charcoal-900 mb-3" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.5rem)' }}>
              Comment ça marche ?
            </h2>
            <p className="text-charcoal-600 max-w-xl mx-auto text-sm leading-relaxed">
              En quelques étapes, obtenez un flux constant de demandes qualifiées directement depuis votre espace.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01', icon: Search,
                title: 'Les couples vous découvrent',
                desc: "Ils remplissent une demande de devis avec leurs données personnelles et spécifient le service qui les intéresse. Votre profil apparaît sur LeOui et sur Google.",
              },
              {
                num: '02', icon: MessageSquare,
                title: 'Vous recevez la demande',
                desc: "Accédez à toutes vos demandes depuis votre tableau de bord. Répondez via la messagerie intégrée et envoyez votre devis en quelques clics.",
              },
              {
                num: '03', icon: Award,
                title: 'Vous signez un mariage de plus',
                desc: "Entrez instantanément en contact avec les couples intéressés, gérez vos contrats en ligne et développez votre clientèle.",
              },
            ].map((step, i) => (
              <div key={i} className="bg-charcoal-50 rounded-2xl p-7 flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <span className="font-display text-4xl text-charcoal-200 font-bold leading-none">{step.num}</span>
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-rose-600" />
                  </div>
                </div>
                <h3 className="font-serif text-charcoal-900 font-semibold mb-2" style={{ fontSize: '1rem' }}>{step.title}</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-champagne-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-champagne-400" />
              <span className="text-champagne-700 text-xs font-semibold uppercase tracking-widest">Votre espace pro</span>
              <span className="h-px w-8 bg-champagne-400" />
            </div>
            <h2 className="font-display text-charcoal-900 mb-3" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.5rem)' }}>
              6 outils pour développer votre activité
            </h2>
            <p className="text-charcoal-600 max-w-xl mx-auto text-sm leading-relaxed">
              Un espace de gestion complet, simple et efficace, conçu spécialement pour les professionnels du mariage.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: LayoutDashboard, color: 'rose',
                title: 'Ma Vitrine',
                desc: "Un espace où figure toute l'information sur votre entreprise. Les couples vous trouvent sur LeOui et sur Google grâce à votre profil optimisé avec photos, vidéos et descriptions.",
              },
              {
                icon: Star, color: 'champagne',
                title: 'Mes Avis',
                desc: "L'avis d'un marié est la meilleure publicité. Demandez aux couples de vous laisser un avis, consultez-les tous et boostez votre réputation en ligne.",
              },
              {
                icon: Megaphone, color: 'rose',
                title: 'Mes Promotions',
                desc: "Pour une meilleure visibilité, partagez vos offres, réductions et promotions directement sur votre vitrine pour attirer de nouveaux clients.",
              },
              {
                icon: CalendarDays, color: 'champagne',
                title: 'Mes Événements',
                desc: "Partagez vos événements (portes ouvertes, inaugurations, shows...) — l'occasion de mettre en avant la qualité de vos services auprès des couples.",
              },
              {
                icon: FileText, color: 'rose',
                title: 'Demandes de devis',
                desc: "L'outil le plus simple, rapide et sûr pour contrôler toutes les demandes reçues, y répondre et gérer votre pipeline de prospects qualifiés.",
              },
              {
                icon: BarChart3, color: 'champagne',
                title: 'Mes Statistiques',
                desc: "La gestion des données est clé. Analysez vos impressions, taux de réponse, conversions et l'évolution de votre visibilité en temps réel.",
              },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 flex flex-col gap-3 border border-charcoal-100 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color === 'rose' ? 'bg-rose-50' : 'bg-champagne-100'}`}>
                  <f.icon className={`w-5 h-5 ${f.color === 'rose' ? 'text-rose-600' : 'text-champagne-700'}`} />
                </div>
                <h3 className="font-serif text-charcoal-900 font-semibold" style={{ fontSize: '1rem' }}>{f.title}</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-px w-8 bg-rose-300" />
                <span className="text-rose-600 text-xs font-semibold uppercase tracking-widest">Tableau de bord</span>
              </div>
              <h2 className="font-display text-charcoal-900 mb-4" style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.3rem)', lineHeight: '1.15' }}>
                Votre menu de gestion<br />
                <span className="italic text-rose-600">en temps réel</span>
              </h2>
              <p className="text-charcoal-600 mb-6 text-sm leading-relaxed">
                Un outil simple pour gérer votre vitrine, ajouter des photos, vidéos, promotions. Un système sécurisé pour chercher et répondre aux demandes de devis. Demandez des avis aux mariés et consultez vos statistiques.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Gérez votre vitrine en ligne : photos, vidéos, promotions',
                  'Recevez et répondez aux demandes de devis qualifiées',
                  'Collectez des avis clients et boostez votre réputation',
                  'Suivez vos statistiques de visibilité en temps réel',
                  'Gérez vos contrats et signatures électroniques en ligne',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-rose-600" />
                    </div>
                    <span className="text-charcoal-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <a href="#register" className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                Commencer gratuitement <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Mock dashboard */}
            <div className="bg-charcoal-50 rounded-3xl p-5 border border-charcoal-100">
              <div className="bg-white rounded-2xl border border-charcoal-100 p-5 shadow-sm mb-4">
                <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-4">Vos 12 derniers mois</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FileText,  value: '454',    label: 'Demandes reçues',        color: 'text-rose-600' },
                    { icon: Clock,     value: '0h 45m', label: 'Temps de réponse moyen', color: 'text-champagne-700' },
                    { icon: Star,      value: '32',     label: 'Avis clients',            color: 'text-rose-600' },
                    { icon: Eye,       value: '24 751', label: 'Impressions vitrine',     color: 'text-champagne-700' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-charcoal-50 rounded-xl">
                      <stat.icon className={`w-4 h-4 ${stat.color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <p className="font-display text-xl font-bold text-charcoal-900">{stat.value}</p>
                        <p className="text-xs text-charcoal-500 leading-tight">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '50 000+', sub: 'Couples / an' },
                  { label: '1 500+',  sub: 'Prestataires' },
                  { label: '4.8/5',   sub: 'Note moyenne' },
                ].map((s, i) => (
                  <div key={i} className="bg-charcoal-900 rounded-xl p-3 text-center">
                    <p className="font-display text-base font-bold text-champagne-400">{s.label}</p>
                    <p className="text-xs text-white/60 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REGISTRATION FORM */}
      <section id="register" className="bg-ivory-50">
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: '620px' }}>
          {/* Left: photo with overlay */}
          <div className="relative hidden lg:block">
            <img
              src="https://images.pexels.com/photos/3621234/pexels-photo-3621234.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="Prestataire de mariage"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,5,15,0.88) 0%, rgba(10,5,15,0.35) 55%, rgba(10,5,15,0.15) 100%)' }} />
            <div className="absolute bottom-12 left-10 right-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/70 text-sm font-medium">LeOui Pro</span>
              </div>
              <p className="font-display text-white leading-tight mb-3" style={{ fontSize: 'clamp(1.8rem, 2.5vw, 2.5rem)' }}>
                Boostez votre activité<br />
                <span className="italic text-champagne-300">avec nous !</span>
              </p>
              <p className="text-white/60 text-sm leading-relaxed">Créez votre vitrine et devenez visible auprès de milliers de couples dès aujourd&apos;hui.</p>
            </div>
          </div>

          {/* Right: form */}
          <div className="px-6 sm:px-12 py-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-8">
                <h2 className="font-display text-charcoal-900 mb-2" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)' }}>
                  Créez votre profil prestataire
                </h2>
                <p className="text-charcoal-600 text-sm">Commencez gratuitement — sans engagement, sans carte bancaire.</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Prénom</label>
                    <input type="text" required value={form.firstName} onChange={e => setField('firstName', e.target.value)} className="input-field text-sm" placeholder="Votre prénom" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Nom</label>
                    <input type="text" required value={form.lastName} onChange={e => setField('lastName', e.target.value)} className="input-field text-sm" placeholder="Votre nom" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Nom de l&apos;entreprise</label>
                  <input type="text" value={form.businessName} onChange={e => setField('businessName', e.target.value)} className="input-field text-sm" placeholder="Atelier Lumière, Maison Florale..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Secteur d&apos;activité</label>
                    <select required value={form.category} onChange={e => setField('category', e.target.value)} className="input-field text-sm">
                      <option value="">Sélectionnez...</option>
                      <option>Photographe</option>
                      <option>Vidéaste</option>
                      <option>Traiteur</option>
                      <option>Fleuriste</option>
                      <option>DJ & Animation</option>
                      <option>Décorateur</option>
                      <option>Wedding Planner</option>
                      <option>Salle & Domaine</option>
                      <option>Pâtissier</option>
                      <option>Musicien</option>
                      <option>Coiffure & Beauté</option>
                      <option>Transport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Ville principale</label>
                    <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} className="input-field text-sm" placeholder="Paris, Lyon..." />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Email professionnel</label>
                  <input type="email" required value={form.email} onChange={e => setField('email', e.target.value)} className="input-field text-sm" placeholder="contact@votrebusiness.fr" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Téléphone</label>
                  <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} className="input-field text-sm" placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Mot de passe</label>
                  <input type="password" required minLength={8} value={form.password} onChange={e => setField('password', e.target.value)} className="input-field text-sm" placeholder="Au moins 8 caractères" />
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <input type="checkbox" id="vendor-terms" checked={form.terms} onChange={e => setField('terms', e.target.checked)} className="mt-1 w-4 h-4 rounded text-rose-600 flex-shrink-0" />
                  <label htmlFor="vendor-terms" className="text-xs text-charcoal-600 leading-relaxed">
                    J&apos;accepte les <Link href="/terms" className="text-rose-600 hover:underline">conditions d&apos;utilisation</Link> et la <Link href="/privacy" className="text-rose-600 hover:underline">politique de confidentialité</Link>
                  </label>
                </div>
                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création du compte...</> : <>Créer mon espace prestataire gratuit <ArrowRight className="w-4 h-4" /></>}
                </button>
                <p className="text-center text-xs text-charcoal-500 pt-1">
                  Déjà inscrit ?{' '}
                  <Link href="/login" className="text-rose-600 font-medium hover:underline">Se connecter</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}