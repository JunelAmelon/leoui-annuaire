'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Check, ArrowRight, Calendar, Users, Sparkles, CreditCard,
  MessageCircle, Image, ClipboardList, LayoutDashboard, CalendarDays,
  FileText, Star
} from 'lucide-react';

export default function WeddingPlannerPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO — same style as vendors page */}
      <section className="relative overflow-hidden bg-rose-600" style={{ minHeight: '380px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Wedding Planner"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-white/90">Wedding Planner</span>
            </div>
            <h1 className="font-display text-display-md text-white mb-3">
              Organisez votre mariage<br />
              <span className="italic text-champagne-300">sereinement</span>
            </h1>
            <p className="text-body-md text-white/80 mb-7 max-w-lg">
              Votre espace couple numérique tout-en-un : planning, prestataires, budget et documents, centralisés en un seul endroit.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 bg-black/20 rounded-2xl p-2 max-w-lg border border-white/15">
              <Link href="/signup" className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Organiser mon mariage
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#features" className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                Découvrir l&apos;outil
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES — Espace couple */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-rose-300" />
              <span className="text-rose-600 text-xs font-semibold uppercase tracking-widest">Votre espace couple</span>
              <span className="h-px w-8 bg-rose-300" />
            </div>
            <h2 className="font-display text-charcoal-900 mb-3" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.5rem)' }}>
              Tout ce dont vous avez besoin,<br />
              <span className="italic text-rose-600">en un seul endroit</span>
            </h2>
            <p className="text-charcoal-600 max-w-xl mx-auto text-sm leading-relaxed">
              Un espace numérique dédié à votre mariage, accessible 24h/24, pour organiser chaque détail avec notre équipe de wedding planners experts.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: LayoutDashboard,
                title: 'Tableau de bord',
                desc: 'Compte à rebours J-X, budget total, nombre d\'invités et progression globale — tout visible en un coup d\'œil.',
              },
              {
                icon: CalendarDays,
                title: 'Planning & Calendrier',
                desc: 'Gérez vos rendez-vous et étapes clés. Confirmez les jalons directement depuis votre espace couple.',
              },
              {
                icon: Users,
                title: 'Gestion des prestataires',
                desc: 'Consultez vos prestataires assignés avec leur statut, note client et prochain rendez-vous prévu.',
              },
              {
                icon: FileText,
                title: 'Documents & Contrats',
                desc: 'Tous vos documents et contrats centralisés, accessibles en un clin d’œil.',
              },
              {
                icon: CreditCard,
                title: 'Budget maîtrisé',
                desc: 'Suivez chaque dépense et gardez le contrôle de votre budget au fil des mois.',
              },
              {
                icon: MessageCircle,
                title: 'Messagerie intégrée',
                desc: 'Échangez directement avec votre wedding planner et vos prestataires sans quitter votre espace.',
              },
              {
                icon: Image,
                title: 'Moodboard & Thème',
                desc: 'Définissez votre style, choisissez vos couleurs et constituez votre moodboard d\'inspiration.',
              },
              {
                icon: ClipboardList,
                title: 'Checklist personnalisée',
                desc: 'Une liste de tâches sur-mesure pour ne rien oublier avant et pendant votre grand jour.',
              },
            ].map((f, i) => (
              <div key={i} className="bg-charcoal-50 rounded-2xl p-5 flex flex-col gap-3 hover:bg-champagne-50 transition-colors border border-transparent hover:border-champagne-200">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-serif text-charcoal-900 font-semibold text-sm">{f.title}</h3>
                <p className="text-charcoal-600 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD MOCKUP */}
      <section className="py-20 px-4 sm:px-6 bg-champagne-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-px w-8 bg-champagne-400" />
                <span className="text-champagne-700 text-xs font-semibold uppercase tracking-widest">Tableau de bord</span>
              </div>
              <h2 className="font-display text-charcoal-900 mb-4" style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.3rem)', lineHeight: '1.15' }}>
                Votre mariage en<br />
                <span className="italic text-rose-600">un coup d&apos;œil</span>
              </h2>
              <p className="text-charcoal-600 mb-6 text-sm leading-relaxed">
                Accédez à votre espace couple depuis n&apos;importe quel appareil. Suivez la progression, confirmez les étapes et échangez avec votre équipe en temps réel.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Compte à rebours en temps réel jusqu\'à votre mariage',
                  'Suivi des étapes validées par vous et votre planner',
                  'Vue complète de votre budget',
                  'Vos prestataires avec statuts et coordonnées',
                  'Documents et contrats centralisés',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-charcoal-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                Commencer gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Mock dashboard card */}
            <div className="bg-white rounded-3xl p-5 shadow-soft border border-charcoal-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-charcoal-900 text-sm">Tableau de bord</p>
                  <p className="text-xs text-charcoal-500">Sophie & Thomas · Juin 2025</p>
                </div>
                <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full">J-45</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: Calendar,   value: 'J-45',   label: 'Compte à rebours', bg: 'bg-rose-50',      color: 'text-rose-600' },
                  { icon: Users,      value: '120',    label: 'Invités',          bg: 'bg-champagne-50', color: 'text-champagne-700' },
                  { icon: CreditCard, value: '18 500€',label: 'Budget total',     bg: 'bg-charcoal-50',  color: 'text-charcoal-700' },
                  { icon: Sparkles,   value: '75%',    label: 'Progression',      bg: 'bg-rose-50',      color: 'text-rose-600' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-3`}>
                    <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                    <p className="font-display text-lg font-bold text-charcoal-900">{s.value}</p>
                    <p className="text-xs text-charcoal-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-charcoal-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-charcoal-600 mb-3">Prochaines étapes</p>
                {[
                  { text: 'Confirmation du menu traiteur', date: '15 avr.', done: true },
                  { text: 'Essayage robe finale', date: '22 avr.', done: false },
                  { text: 'Réunion coordination J-1', date: '01 juin', done: false },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 py-2 ${i < 2 ? 'border-b border-charcoal-100' : ''}`}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${step.done ? 'bg-rose-600' : 'border-2 border-charcoal-300'}`} />
                    <p className={`flex-1 text-xs ${step.done ? 'line-through text-charcoal-400' : 'text-charcoal-700'}`}>{step.text}</p>
                    <span className="text-xs text-charcoal-400 flex-shrink-0">{step.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-rose-300" />
              <span className="text-rose-600 text-xs font-semibold uppercase tracking-widest">Notre accompagnement</span>
              <span className="h-px w-8 bg-rose-300" />
            </div>
            <h2 className="font-display text-charcoal-900 mb-3" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.5rem)' }}>
              4 étapes vers le mariage parfait
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '01', title: 'Premier rendez-vous', desc: 'Nous découvrons votre projet, vos envies, votre budget et votre date de mariage.' },
              { num: '02', title: 'Sélection des prestataires', desc: 'Accès à notre réseau exclusif. Nous négocions les meilleurs tarifs en votre faveur.' },
              { num: '03', title: 'Suivi depuis votre espace', desc: 'Planning et documents — tout centralisé dans votre espace couple 24h/24.' },
              { num: '04', title: 'Le grand jour', desc: 'Coordination complète sur place. Vous profitez pleinement sans vous soucier de rien.' },
            ].map((step, i) => (
              <div key={i} className="bg-charcoal-50 rounded-2xl p-6">
                <span className="font-display text-4xl font-bold text-charcoal-200 leading-none block mb-3">{step.num}</span>
                <h3 className="font-serif text-charcoal-900 font-semibold mb-2 text-sm">{step.title}</h3>
                <p className="text-charcoal-600 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="py-14 px-4 sm:px-6 bg-rose-600">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+',  label: 'Mariages organisés' },
              { value: '4.9/5', label: 'Note client moyenne' },
              { value: '98%',   label: 'Couples satisfaits' },
              { value: '12 ans',label: "D'expérience" },
            ].map((s, i) => (
              <div key={i}>
                <p className="font-display text-3xl font-bold text-champagne-400 mb-1">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 sm:px-6 bg-ivory-50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-rose-300" />
            <span className="text-rose-600 text-xs font-semibold uppercase tracking-widest">Gratuit pour les couples</span>
            <span className="h-px w-8 bg-rose-300" />
          </div>
          <h2 className="font-display text-charcoal-900 mb-4" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
            Prêt à organiser votre mariage de rêve ?
          </h2>
          <p className="text-charcoal-600 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Créez votre espace couple gratuitement en 2 minutes. Planning, budget, prestataires, documents — tout y est.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-sm">
              Créer mon espace couple gratuit <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/vendors" className="inline-flex items-center justify-center gap-2 border border-charcoal-200 hover:bg-charcoal-50 text-charcoal-700 font-medium px-8 py-3.5 rounded-xl transition-colors text-sm">
              Parcourir les prestataires
            </Link>
          </div>
          <p className="text-xs text-charcoal-400 mt-4">Aucune carte bancaire requise. Accès immédiat.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
