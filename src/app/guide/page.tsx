import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookOpen, CheckCircle, Calendar, Camera, Utensils, Flower2, Music, Heart } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: Calendar,
    title: 'Fixer la date & le budget',
    text: 'Commencez par choisir une date et établir un budget global. Comptez en moyenne entre 15 000 € et 25 000 € pour un mariage en France. La date déterminera la disponibilité de vos prestataires.',
  },
  {
    step: '02',
    icon: Heart,
    title: 'Choisir le lieu de réception',
    text: 'Le lieu est la pièce maîtresse de votre mariage. Château, domaine viticole, grange, espace urbain — réservez-le 12 à 18 mois à l\'avance pour les dates les plus prisées.',
  },
  {
    step: '03',
    icon: Camera,
    title: 'Sélectionner vos photographes & vidéastes',
    text: 'Vos photos et vidéos sont les souvenirs qui durent. Rencontrez plusieurs photographes, vérifiez leurs portfolios et assurez-vous que leur style correspond à votre vision.',
  },
  {
    step: '04',
    icon: Utensils,
    title: 'Choisir le traiteur',
    text: 'Le repas est l\'un des moments forts de votre journée. Prévoyez une dégustation, définissez vos menus et vérifiez les options végétariennes et allergies alimentaires.',
  },
  {
    step: '05',
    icon: Flower2,
    title: 'Créer votre décoration florale',
    text: 'Fleurs de la mariée, centres de table, arches — la décoration florale donne le ton de votre mariage. Rencontrez votre fleuriste 6 à 9 mois avant le grand jour.',
  },
  {
    step: '06',
    icon: Music,
    title: 'Organiser la musique & l\'animation',
    text: 'DJ, groupe live, quatuor à cordes — la musique crée l\'ambiance. Préparez votre playlist de cérémonie et définissez les moments clés (premier danse, dîner, soirée).',
  },
];

const CHECKLIST = [
  { timing: '18 mois avant', items: ['Définir le budget', 'Choisir la date', 'Réserver le lieu', 'Commencer la liste des invités'] },
  { timing: '12 mois avant', items: ['Réserver le photographe', 'Choisir le traiteur', 'Sélectionner la robe / le costume', 'Envoyer les save-the-dates'] },
  { timing: '6 mois avant', items: ['Confirmer tous les prestataires', 'Choisir le fleuriste', 'Organiser la musique', 'Réserver les hébergements'] },
  { timing: '1 mois avant', items: ['Confirmer les plans de table', 'Derniers essayages', 'Briefer tous les prestataires', 'Préparer les paiements finaux'] },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* Hero */}
      <section className="relative bg-charcoal-900 py-24 overflow-hidden text-center px-6">
        <div className="absolute inset-0 opacity-15">
          <img src="https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-xs font-semibold text-rose-400 tracking-[0.14em] uppercase mb-4">— Guide complet</p>
          <h1 className="font-display text-display-lg text-white mb-6">Le guide du mariage parfait</h1>
          <p className="text-body-lg text-white/70 max-w-2xl mx-auto">
            De la date à la lune de miel, retrouvez toutes les étapes pour organiser un mariage inoubliable.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Les étapes clés</p>
            <h2 className="font-serif text-display-sm text-charcoal-900" style={{ fontWeight: 300 }}>Organiser votre mariage étape par étape</h2>
          </div>
          <div className="space-y-8">
            {STEPS.map(({ step, icon: Icon, title, text }) => (
              <div key={step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-serif text-charcoal-300 text-sm" style={{ fontStyle: 'italic' }}>{step}</span>
                    <h3 className="font-serif text-heading-xl text-charcoal-900" style={{ fontWeight: 400 }}>{title}</h3>
                  </div>
                  <p className="text-body-md text-charcoal-600 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-20 bg-ivory-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Planning</p>
            <h2 className="font-serif text-display-sm text-charcoal-900" style={{ fontWeight: 300 }}>
              <BookOpen className="w-8 h-8 text-rose-500 inline-block mr-3 mb-1" />
              Votre checklist de mariage
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CHECKLIST.map(({ timing, items }) => (
              <div key={timing} className="bg-white rounded-2xl p-6 border border-charcoal-100">
                <h3 className="font-semibold text-charcoal-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-500 rounded-full inline-block" />
                  {timing}
                </h3>
                <ul className="space-y-2.5">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                      <CheckCircle className="w-4 h-4 text-charcoal-200 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-charcoal-900 text-center px-6">
        <h2 className="font-display text-display-sm text-white mb-4" style={{ fontWeight: 300 }}>Trouvez vos prestataires idéaux</h2>
        <p className="text-body-md text-white/60 mb-8">Des professionnels d'exception pour chaque étape de votre mariage.</p>
        <Link href="/vendors" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors inline-block">
          Explorer les prestataires
        </Link>
      </section>

      <Footer />
    </div>
  );
}
