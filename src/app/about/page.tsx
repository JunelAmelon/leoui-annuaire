import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Heart, Users, Award, MapPin } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* Hero */}
      <section className="relative bg-charcoal-900 py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-semibold text-rose-400 tracking-[0.14em] uppercase mb-4">— Notre histoire</p>
          <h1 className="font-display text-display-lg text-white mb-6">À propos de LeOui</h1>
          <p className="text-body-lg text-white/70 max-w-2xl mx-auto">
            LeOui est née d'une conviction simple : chaque couple mérite les meilleurs prestataires pour le plus beau jour de leur vie.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Notre mission</p>
              <h2 className="font-serif text-display-sm text-charcoal-900 mb-4" style={{ fontWeight: 300 }}>
                Mettre en lumière l'excellence
              </h2>
              <p className="text-body-md text-charcoal-600 leading-relaxed mb-4">
                Nous sélectionnons rigoureusement les meilleurs artisans du mariage en France — photographes, traiteurs, fleuristes, décorateurs — pour vous offrir une sélection fiable et inspirante.
              </p>
              <p className="text-body-md text-charcoal-600 leading-relaxed">
                Notre plateforme connecte les couples avec des professionnels d'exception, créant des mariages qui racontent votre histoire unique.
              </p>
            </div>
            <div className="relative h-80 rounded-2xl overflow-hidden">
              <img src="https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Mariage" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-ivory-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Users, value: '1 500+', label: 'Prestataires' },
              { icon: Heart, value: '12 000+', label: 'Mariages célébrés' },
              { icon: MapPin, value: '85+', label: 'Villes couvertes' },
              { icon: Award, value: '4.9/5', label: 'Note moyenne' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-rose-600" />
                </div>
                <p className="font-display text-3xl text-charcoal-900 mb-1" style={{ fontWeight: 300 }}>{value}</p>
                <p className="text-body-sm text-charcoal-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="label-xs text-champagne-600 mb-3 tracking-[0.12em]">— Nos valeurs</p>
          <h2 className="font-serif text-display-sm text-charcoal-900 mb-12" style={{ fontWeight: 300 }}>Ce qui nous anime</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Excellence', text: 'Chaque prestataire est vérifié et sélectionné pour son savoir-faire et sa fiabilité.' },
              { title: 'Confiance', text: 'Avis authentiques, profils détaillés, communication directe — tout pour décider sereinement.' },
              { title: 'Passion', text: 'Nous aimons les mariages autant que vous. Chaque détail compte pour nous.' },
            ].map(({ title, text }) => (
              <div key={title} className="bg-ivory-50 rounded-2xl p-7">
                <h3 className="font-serif text-heading-xl text-charcoal-900 mb-3" style={{ fontWeight: 400 }}>{title}</h3>
                <p className="text-body-md text-charcoal-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-charcoal-900 text-center px-6">
        <h2 className="font-display text-display-sm text-white mb-4" style={{ fontWeight: 300 }}>Prêts à commencer ?</h2>
        <p className="text-body-md text-white/60 mb-8">Trouvez les prestataires idéaux pour votre mariage dès aujourd'hui.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/vendors" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
            Découvrir les prestataires
          </Link>
          <Link href="/contact" className="border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl transition-colors">
            Nous contacter
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
