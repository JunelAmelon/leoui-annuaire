'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CityAutocompleteInput from '@/components/CityAutocompleteInput';
import { VENDOR_CATEGORY_GROUPS } from '@/lib/vendor-categories';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Check, ArrowRight, Star, Users, Shield, MessageCircle,
  Eye, Search, Award, Loader2, Heart, CreditCard, Target,
  Mail, BarChart3, MessageSquare, LayoutDashboard,
  Phone, MapPin, HelpCircle, ChevronDown, ChevronUp, X,
  CheckCircle2, Zap, Rocket
} from 'lucide-react';

// --- DATA CONSTANTS ---

const STATS = [
  { value: '2,400+', label: 'Prestataires actifs', icon: Users },
  { value: '50K+', label: 'Couples fiancés', icon: Heart },
  { value: '€4.2K', label: 'Panier moyen', icon: CreditCard },
  { value: '35%', label: 'Taux conversion', icon: Target },
];


const FAQS = [
  {
    q: 'Comment puis-je m\'inscrire ?',
    a: 'L\'inscription se fait en ligne en quelques minutes. Créez votre compte, complétez votre profil avec photos et description, et commencez à recevoir des demandes dès aujourd\'hui.'
  },
  {
    q: 'Quand vais-je recevoir mes premiers leads ?',
    a: 'La plupart de nos prestataires reçoivent leur première demande sous 48h après l\'activation de leur profil. La visibilité dépend de votre localisation et de votre catégorie.'
  },
  {
    q: 'Puis-je changer de formule à tout moment ?',
    a: 'Oui, vous pouvez upgrader ou downgrader votre abonnement à tout moment. La modification prend effet immédiatement.'
  },
  {
    q: 'Comment sont qualifiés les couples ?',
    a: 'Les couples vérifient leur identité et indiquent leur budget, date et lieu de mariage. Vous ne recevez que des demandes correspondant à vos critères.'
  },
  {
    q: 'Y a-t-il un engagement de durée ?',
    a: 'Non, tous nos abonnements sont sans engagement. Vous pouvez résilier à tout moment depuis votre espace prestataire.'
  },
];

// --- SUB-COMPONENTS ---

function FAQItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-charcoal-100 last:border-b-0">
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between py-5 px-6 text-left transition-colors ${
          isOpen ? 'bg-rose-50' : 'hover:bg-stone-50'
        }`}
      >
        <span className={`font-medium pr-4 ${isOpen ? 'text-rose-600' : 'text-charcoal-900'}`}>
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-rose-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-charcoal-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 bg-rose-50">
          <p className="text-charcoal-600 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function VendorJoinPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', businessName: '', category: '', city: '', email: '', phone: '', password: '', terms: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformStats, setPlatformStats] = useState<{ vendorsCount: number; weddingsCount: number } | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        setPlatformStats({
          vendorsCount: Number(json.vendorsCount || 0),
          weddingsCount: Number(json.weddingsCount || 0),
        });
      })
      .catch(() => setPlatformStats(null));
  }, []);

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

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO — Harmonized Style */}
      <section className="relative overflow-hidden bg-rose-600" style={{ minHeight: '580px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/31953104/pexels-photo-31953104.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Espace prestataire"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">Espace prestataire</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-3 leading-tight">
              Développez votre activité
              <span className="block italic text-champagne-300 mt-1">avec LeOui.net</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white/80 mb-6 max-w-xl leading-relaxed">
              Rejoignez la communauté de professionnels du mariage. Recevez des demandes qualifiées et gérez votre activité depuis un seul espace.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <a
                href="#register"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-charcoal-900 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Créer mon profil <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
              >
                Découvrir comment ça marche
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?w=100',
                    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=100',
                    'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?w=100',
                    'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?w=100'
                  ].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-rose-600" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="text-white/80 text-sm ml-1">4.8</span>
                  </div>
                  <p className="text-white/50 text-xs">Recommandé par 2,400+ pros</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-b border-charcoal-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className="w-5 h-5 text-rose-500" />
                  <span className="font-display text-3xl font-bold text-charcoal-900">{stat.value}</span>
                </div>
                <p className="text-sm text-charcoal-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS — 3 piliers impactants */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Pourquoi nous rejoindre</span>
            <h2 className="font-display text-3xl sm:text-4xl text-charcoal-900 mb-4">
              Trois raisons de vous lancer
            </h2>
            <p className="text-charcoal-500 max-w-lg mx-auto">
              Des outils concrets pour développer votre activité sans complexité.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pilier 1 */}
            <div className="group">
              <div className="relative mb-6 overflow-hidden rounded-2xl aspect-[4/3]">
                <img 
                  src="https://images.pexels.com/photos/37710459/pexels-photo-37710459.jpeg?auto=compress&cs=tinysrgb&w=600" 
                  alt="Visibilité"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5" />
                    <span className="font-semibold">Visibilité ciblée</span>
                  </div>
                </div>
              </div>
              <h3 className="font-serif text-xl text-charcoal-900 mb-2">Apparaissez où ça compte</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">
                Votre profil est visible par les couples qui recherchent activement vos services dans votre région. Pas de visiteurs passifs, que des prospects qualifiés.
              </p>
            </div>

            {/* Pilier 2 */}
            <div className="group">
              <div className="relative mb-6 overflow-hidden rounded-2xl aspect-[4/3]">
                <img 
                  src="https://images.pexels.com/photos/9870230/pexels-photo-9870230.jpeg?auto=compress&cs=tinysrgb&w=600" 
                  alt="Leads qualifiés"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-semibold">Demandes qualifiées</span>
                  </div>
                </div>
              </div>
              <h3 className="font-serif text-xl text-charcoal-900 mb-2">Recevez les bons contacts</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">
                Chaque demande inclut le budget, la date et les besoins précis du couple. Fini les échanges interminables qui ne mènent nulle part.
              </p>
            </div>

            {/* Pilier 3 */}
            <div className="group">
              <div className="relative mb-6 overflow-hidden rounded-2xl aspect-[4/3]">
                <img 
                  src="https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=600" 
                  alt="Dashboard"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-semibold">Gestion simplifiée</span>
                  </div>
                </div>
              </div>
              <h3 className="font-serif text-xl text-charcoal-900 mb-2">Tout centralisé</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">
                Contrats, planning et messagerie dans un seul espace. Gagnez du temps sur l'administratif pour vous concentrer sur vos prestations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — Conversion oriented */}
      <section id="comment-ca-marche" className="py-20 lg:py-24 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Comment ça marche</span>
            <h2 className="font-display text-3xl sm:text-4xl text-charcoal-900 mb-4">
              Trois étapes pour décrocher vos premiers clients
            </h2>
            <p className="text-charcoal-500 max-w-2xl mx-auto">
              Un processus pensé pour vous faire gagner du temps et convertir plus de couples.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Étape 1 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-rose-600" />
              </div>
              <div className="text-3xl font-display font-bold text-rose-100 mb-2">01</div>
              <h3 className="font-serif text-lg text-charcoal-900 mb-3">Créez votre profil</h3>
              <p className="text-sm text-charcoal-500 leading-relaxed">
                Photos, portfolio, tarifs, disponibilités : montrez votre savoir-faire aux couples qui recherchent exactement ce que vous proposez.
              </p>
            </div>

            {/* Étape 2 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-champagne-50 flex items-center justify-center mb-5">
                <MessageSquare className="w-6 h-6 text-champagne-700" />
              </div>
              <div className="text-3xl font-display font-bold text-champagne-100 mb-2">02</div>
              <h3 className="font-serif text-lg text-charcoal-900 mb-3">Recevez des demandes qualifiées</h3>
              <p className="text-sm text-charcoal-500 leading-relaxed">
                Date, lieu, budget, nombre d'invités : chaque demande contient les informations dont vous avez besoin pour répondre en 1 clic.
              </p>
            </div>

            {/* Étape 3 */}
            <div className="bg-white rounded-2xl p-7 border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-5">
                <Award className="w-6 h-6 text-rose-600" />
              </div>
              <div className="text-3xl font-display font-bold text-rose-100 mb-2">03</div>
              <h3 className="font-serif text-lg text-charcoal-900 mb-3">Convertissez</h3>
              <p className="text-sm text-charcoal-500 leading-relaxed">
                Discutez dans la messagerie, suivez vos contacts et transformez vos premiers échanges en réservations confirmées.
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* FAQ — Réassurance */}
      <section className="py-20 lg:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">FAQ</span>
            <h2 className="font-display text-3xl sm:text-4xl text-charcoal-900 mb-4">
              Vous avez des <span className="italic text-rose-600">questions</span> ?
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-charcoal-100 overflow-hidden">
            {FAQS.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>

          {/* Support contact */}
          <div className="mt-12 text-center">
            <p className="text-charcoal-600 mb-4">Vous ne trouvez pas votre réponse ?</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-rose-600 font-semibold hover:underline"
            >
              <MessageCircle className="w-5 h-5" />
              Contactez notre équipe
            </Link>
          </div>
        </div>
      </section>



      {/* REGISTRATION FORM — Conversion maximisée */}
      <section id="register" className="py-14 lg:py-20 px-4 sm:px-6 bg-stone-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-10 lg:gap-12 items-start">
            {/* Left: pitch */}
            <div className="lg:col-span-2 lg:sticky lg:top-28">
              <span className="text-rose-600 text-xs font-medium tracking-[0.2em] uppercase mb-4 block">Espace prestataire</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-charcoal-900 mb-4">
                Rejoignez LeOui et recevez vos premières demandes
              </h2>
              <p className="text-charcoal-600 mb-8 leading-relaxed">
                Des milliers de couples recherchent leurs prestataires sur notre plateforme. Créez votre compte, présentez votre travail et soyez contacté par les bons clients.
              </p>

              <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm mb-8">
                <p className="font-serif text-lg text-charcoal-800 mb-4">
                  "Depuis mon inscription, j'ai doublé mes demandes. Les couples arrivent déjà avec une vision claire du budget et de la date."
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=100"
                    alt="Témoignage"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">Sophie M.</p>
                    <p className="text-xs text-charcoal-500">Photographe, Bordeaux</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-8 md:p-10 border border-charcoal-100 shadow-sm">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Prénom *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.firstName} 
                    onChange={e => setField('firstName', e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Nom *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.lastName} 
                    onChange={e => setField('lastName', e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Nom de l'entreprise</label>
                <input 
                  type="text" 
                  value={form.businessName} 
                  onChange={e => setField('businessName', e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                  placeholder="Atelier Photo, Maison des Fleurs..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Secteur d'activité *</label>
                  <select
                    required
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                  >
                    <option value="">Sélectionnez votre spécialité...</option>
                    {VENDOR_CATEGORY_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Ville principale *</label>
                  <CityAutocompleteInput
                    value={form.city}
                    onChange={v => setField('city', v)}
                    placeholder="Paris, Lyon, Bordeaux..."
                    showPostalCode={false}
                    icon={false}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Email professionnel *</label>
                  <input 
                    type="email" 
                    required 
                    value={form.email} 
                    onChange={e => setField('email', e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                    placeholder="contact@entreprise.fr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">Téléphone</label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setField('phone', e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Mot de passe *</label>
                <input 
                  type="password" 
                  required 
                  minLength={8} 
                  value={form.password} 
                  onChange={e => setField('password', e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border border-charcoal-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-white"
                  placeholder="8 caractères minimum"
                />
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={form.terms} 
                  onChange={e => setField('terms', e.target.checked)} 
                  className="mt-1 w-5 h-5 rounded border-charcoal-300 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="terms" className="text-sm text-charcoal-600">
                  J'accepte les <Link href="/terms" className="text-rose-600 hover:underline font-medium">conditions d'utilisation</Link> et la <Link href="/privacy" className="text-rose-600 hover:underline font-medium">politique de confidentialité</Link> *
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-rose-600/25 text-lg"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Création en cours...</>
                ) : (
                  <><Rocket className="w-5 h-5" /> Créer mon compte gratuit</>
                )}
              </button>

              <p className="text-center text-sm text-charcoal-500">
                Déjà membre ? <Link href="/login" className="text-rose-600 font-medium hover:underline">Connectez-vous</Link>
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