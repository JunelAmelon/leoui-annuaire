import Link from 'next/link';
import { Heart, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-6">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
              <span className="font-display text-2xl">LeOui</span>
            </Link>
            <p className="text-body-md text-charcoal-300 mb-6 max-w-md">
              La plateforme premium pour organiser votre mariage de rêve en France.
              Découvrez les meilleurs prestataires et créez des moments inoubliables.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-charcoal-800 hover:bg-rose-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-charcoal-800 hover:bg-rose-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-charcoal-800 hover:bg-rose-600 rounded-lg flex items-center justify-center transition-colors duration-200">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-heading-sm mb-4">Prestataires</h3>
            <ul className="space-y-3">
              <li><Link href="/vendors/photographes" className="text-charcoal-300 hover:text-rose-400 transition-colors">Photographes</Link></li>
              <li><Link href="/vendors/traiteurs" className="text-charcoal-300 hover:text-rose-400 transition-colors">Traiteurs</Link></li>
              <li><Link href="/vendors/fleuristes" className="text-charcoal-300 hover:text-rose-400 transition-colors">Fleuristes</Link></li>
              <li><Link href="/vendors/dj" className="text-charcoal-300 hover:text-rose-400 transition-colors">DJ & Musiciens</Link></li>
              <li><Link href="/vendors" className="text-charcoal-300 hover:text-rose-400 transition-colors">Tous les prestataires</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-heading-sm mb-4">Ressources</h3>
            <ul className="space-y-3">
              <li><Link href="/inspiration" className="text-charcoal-300 hover:text-rose-400 transition-colors">Inspiration</Link></li>
              <li><Link href="/wedding-planner" className="text-charcoal-300 hover:text-rose-400 transition-colors">Wedding Planner</Link></li>
              <li><Link href="/cities" className="text-charcoal-300 hover:text-rose-400 transition-colors">Villes</Link></li>
              <li><Link href="/guide" className="text-charcoal-300 hover:text-rose-400 transition-colors">Guide du mariage</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-heading-sm mb-4">LeOui</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-charcoal-300 hover:text-rose-400 transition-colors">À propos</Link></li>
              <li><Link href="/vendors/join" className="text-charcoal-300 hover:text-rose-400 transition-colors">Devenir prestataire</Link></li>
              <li><Link href="/contact" className="text-charcoal-300 hover:text-rose-400 transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-charcoal-300 hover:text-rose-400 transition-colors">Confidentialité</Link></li>
              <li><Link href="/terms" className="text-charcoal-300 hover:text-rose-400 transition-colors">Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-charcoal-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-body-sm text-charcoal-400">
            © 2026 LeOui. Tous droits réservés.
          </p>
          <p className="text-body-sm text-charcoal-400 mt-4 md:mt-0">
            Fait avec <span className="text-rose-500">♥</span> en France
          </p>
        </div>
      </div>
    </footer>
  );
}
