import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <section className="bg-charcoal-900 py-20 text-center px-6">
        <p className="text-xs font-semibold text-rose-400 tracking-[0.14em] uppercase mb-4">— Nous écrire</p>
        <h1 className="font-display text-display-lg text-white mb-4">Contact</h1>
        <p className="text-body-md text-white/60 max-w-xl mx-auto">
          Une question, une suggestion ou un partenariat ? Notre équipe vous répond sous 24h.
        </p>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Contact info */}
          <div className="space-y-6">
            <h2 className="font-serif text-heading-xl text-charcoal-900" style={{ fontWeight: 400 }}>Nos coordonnées</h2>
            {[
              { icon: Mail, label: 'Email', value: 'hello@leoui.fr', href: 'mailto:hello@leoui.fr' },
              { icon: Phone, label: 'Téléphone', value: '+33 1 23 45 67 89', href: 'tel:+33123456789' },
              { icon: MapPin, label: 'Adresse', value: '15 rue de la Paix, 75001 Paris', href: null },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-charcoal-500 font-medium mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-body-md text-charcoal-900 hover:text-rose-600 transition-colors">{value}</a>
                  ) : (
                    <p className="text-body-md text-charcoal-900">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-charcoal-100">
              <p className="text-body-sm text-charcoal-500 mb-3">Vous êtes prestataire ?</p>
              <Link href="/vendors/join" className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium text-sm transition-colors">
                <MessageSquare className="w-4 h-4" /> Rejoindre LeOui →
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-soft p-8">
            <h2 className="font-serif text-heading-xl text-charcoal-900 mb-6" style={{ fontWeight: 400 }}>Envoyer un message</h2>
            <form className="space-y-5" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Prénom</label>
                  <input type="text" placeholder="Sophie" className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Nom</label>
                  <input type="text" placeholder="Dupont" className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all bg-ivory-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Email</label>
                <input type="email" placeholder="sophie@email.fr" className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Sujet</label>
                <select className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all bg-ivory-50">
                  <option>Question générale</option>
                  <option>Problème technique</option>
                  <option>Partenariat prestataire</option>
                  <option>Presse & médias</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-500 mb-1.5">Message</label>
                <textarea rows={5} placeholder="Votre message…" className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all bg-ivory-50 resize-none" />
              </div>
              <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Envoyer le message
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
