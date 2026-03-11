import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Check, ArrowRight, Calendar, Users, Sparkles, CreditCard,
  MessageCircle, Image, ClipboardList, LayoutDashboard, CalendarDays,
  FileText,
} from 'lucide-react';

export default function WeddingPlannerPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* HERO — vendors-listing style */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '380px' }}>
        {/* Mobile: full background image */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Wedding Planner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(10, 5, 15, 0.72)' }} />
        </div>
        {/* Desktop: image right half */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2">
          <img
            src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Wedding Planner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900 via-charcoal-900/40 to-transparent" />
        </div>
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:w-1/2">
          <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-white/90">Wedding Planner</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-rose-400" />
            <span className="text-rose-400 text-xs font-medium uppercase tracking-widest">Service premium pour les couples</span>
          </div>
          <h1 className="font-display text-white mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: '1.1' }}>
            Organisez votre mariage<br />
            <span className="italic text-champagne-300">sereinement</span>
          </h1>
          <p className="text-white/70 mb-8 max-w-lg text-base leading-relaxed">
            Votre espace couple numérique pour gérer chaque détail : planning, prestataires, documents, paiements — accompagné par notre équipe d&apos;experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="#contact" className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              Prendre rendez-vous <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#features" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm">
              Voir l&apos;espace couple
            </a>
          </div>
          <div className="flex flex-wrap gap-5 mt-8">
            {[
              { label: '500+', sub: 'Mariages organisés' },
              { label: '4.9/5', sub: 'Note moyenne' },
              { label: '100%', sub: 'Satisfaction garantie' },
            ].map((s, i) => (
              <div key={i}>
                <p className="font-display text-xl text-white font-bold">{s.label}</p>
                <p className="text-white/50 text-xs">{s.sub}</p>
              </div>
            ))}
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
                desc: 'Tous vos documents centralisés : contrats, bons de commande, devis. Signez en ligne en toute sécurité.',
              },
              {
                icon: CreditCard,
                title: 'Suivi des paiements',
                desc: 'Visualisez acomptes versés, soldes à régler et calendrier de paiements pour chaque prestataire.',
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
                  'Vue complète de votre budget et vos paiements',
                  'Vos prestataires avec statuts et coordonnées',
                  'Documents, contrats et devis centralisés',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="text-charcoal-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <a href="#contact" className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                Démarrer avec un planner <ArrowRight className="w-4 h-4" />
              </a>
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
              { num: '03', title: 'Suivi depuis votre espace', desc: 'Planning, documents, paiements — tout centralisé dans votre espace couple 24h/24.' },
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
      <section className="py-14 px-4 sm:px-6 bg-charcoal-900">
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

      {/* CONTACT FORM */}
      <section id="contact" className="py-20 px-4 sm:px-6 bg-ivory-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-charcoal-900 mb-3" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)' }}>
              Rencontrons-nous
            </h2>
            <p className="text-charcoal-600 text-sm">Premier rendez-vous gratuit et sans engagement pour discuter de votre projet.</p>
          </div>
          <div className="bg-white rounded-3xl shadow-soft p-8 sm:p-10">
            <form className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Prénom</label>
                  <input type="text" className="input-field text-sm" placeholder="Votre prénom" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Nom</label>
                  <input type="text" className="input-field text-sm" placeholder="Votre nom" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Email</label>
                  <input type="email" className="input-field text-sm" placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Téléphone</label>
                  <input type="tel" className="input-field text-sm" placeholder="06 12 34 56 78" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Date du mariage</label>
                  <input type="date" className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Nombre d&apos;invités</label>
                  <select className="input-field text-sm">
                    <option>Moins de 50</option>
                    <option>50 - 100</option>
                    <option>100 - 150</option>
                    <option>Plus de 150</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Votre projet en quelques mots</label>
                <textarea className="input-field text-sm resize-none" rows={4} placeholder="Votre lieu de rêve, votre thème, vos envies..." />
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
                Demander mon rendez-vous gratuit <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-xs text-charcoal-500">Réponse garantie sous 24h ouvrées.</p>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
