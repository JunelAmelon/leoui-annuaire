import Link from 'next/link';
import { Heart, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-charcoal-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-6 group" title="LeOui.net - Plateforme de mariage" aria-label="Retour à l'accueil LeOui.net">
              <div className="w-8 h-8 border border-rose-500 flex items-center justify-center transition-colors duration-300 group-hover:bg-rose-600">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 group-hover:text-white group-hover:fill-white transition-colors duration-300" />
              </div>
              <span className="font-serif text-[1.5rem] leading-none tracking-wide">LeOui.net</span>
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
              <li><Link href="/vendors?cat=Photographes" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Photographes de mariage professionnels" aria-label="Trouver un photographe de mariage">Photographes</Link></li>
              <li><Link href="/vendors?cat=Traiteurs" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Traiteurs et cuisine de mariage" aria-label="Trouver un traiteur pour mariage">Traiteurs</Link></li>
              <li><Link href="/vendors?cat=Fleuristes" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Fleuristes pour bouquets et décorations" aria-label="Trouver un fleuriste pour mariage">Fleuristes</Link></li>
              <li><Link href="/vendors?cat=DJ+%26+Musiciens" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="DJ et musiciens pour animation mariage" aria-label="Trouver un DJ ou musicien pour mariage">DJ & Musiciens</Link></li>
              <li><Link href="/vendors" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Tous les prestataires mariage" aria-label="Voir tous les prestataires de mariage">Tous les prestataires</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-heading-sm mb-4">Ressources</h3>
            <ul className="space-y-3">
              <li><Link href="/inspiration" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Inspiration et idées pour votre mariage" aria-label="Inspiration mariage">Inspiration</Link></li>
              <li><Link href="/planifier-votre-mariage" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Outils pour planifier votre mariage" aria-label="Planifier mon mariage">Planifier mon mariage</Link></li>
              <li><Link href="/cities" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Trouver des prestataires par ville" aria-label="Prestataires par ville">Régions</Link></li>
              <li><Link href="/guide" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Guide complet du mariage" aria-label="Guide du mariage">Guide du mariage</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans font-semibold text-heading-sm mb-4">LeOui.net</h3>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="À propos de LeOui.net" aria-label="À propos">À propos</Link></li>
              <li><Link href="/vendors/join" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Devenir prestataire sur LeOui.net" aria-label="Devenir prestataire mariage">Devenir prestataire</Link></li>
              <li><Link href="/contact" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Contacter LeOui.net" aria-label="Contact">Contact</Link></li>
              <li><Link href="/privacy" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Politique de confidentialité" aria-label="Confidentialité">Confidentialité</Link></li>
              <li><Link href="/terms" className="text-charcoal-300 hover:text-rose-400 transition-colors" title="Conditions d'utilisation" aria-label="Conditions">Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-charcoal-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-body-sm text-charcoal-400">
            © 2026 LeOui.net. Tous droits réservés.
          </p>
          <p className="text-body-sm text-charcoal-400 mt-4 md:mt-0">
            Fait avec <span className="text-rose-500">♥</span> en France
          </p>
        </div>
      </div>
    </footer>
  );
}
