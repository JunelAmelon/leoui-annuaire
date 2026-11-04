'use client';

import Link from 'next/link';
import { Heart, Instagram, Facebook, Youtube, Linkedin, Twitter, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Explorer',
    links: [
      { href: '/vendors', label: 'Prestataires' },
      { href: '/market', label: 'Marketplace' },
      { href: '/bon-plan', label: 'Bon plans' },
      { href: '/inspiration', label: 'Inspiration' },
      { href: '/planifier-votre-mariage', label: 'Planifier votre mariage' },
    ],
  },
  {
    title: 'Market',
    links: [
      { href: '/market/annonces', label: 'Parcourir les annonces' },
      { href: '/market/deposer-une-annonce', label: 'Déposer une annonce' },
      { href: '/app/market/mes-commandes', label: 'Mes achats' },
      { href: '/app/market/mes-ventes', label: 'Mes ventes' },
      { href: '/app/market/litiges', label: 'Litiges' },
    ],
  },
  {
    title: 'Informations',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/about', label: 'Qui sommes-nous' },
      { href: '/vendors/join', label: 'Devenir prestataire' },
      { href: '/terms', label: 'Conditions générales' },
      { href: '/privacy', label: 'Protection des données' },
    ],
  },
];

const SOCIALS = [
  { href: '#', label: 'Instagram', icon: Instagram },
  { href: '#', label: 'Facebook', icon: Facebook },
  { href: '#', label: 'YouTube', icon: Youtube },
  { href: '#', label: 'LinkedIn', icon: Linkedin },
  { href: '#', label: 'X (Twitter)', icon: Twitter },
];

export default function Footer() {
  const { user, hasCoupleSpace } = useAuth();

  // Colonne « Votre espace » : adaptée au compte réel. Un compte purement
  // Market (sans projet mariage) ne voit aucun lien vers l'espace couple.
  const spaceLinks: { href: string; label: string }[] = user
    ? [
        ...(hasCoupleSpace ? [{ href: '/espace-client', label: 'Espace couple' }] : []),
        ...(user.role === 'admin' ? [{ href: '/admin', label: 'Administration' }] : []),
        ...(user.role === 'planner' || user.role === 'vendor'
          ? [{ href: '/espace-prestataire', label: 'Espace prestataire' }]
          : []),
        { href: '/app/market', label: 'Espace Market' },
        { href: '/app/market/messages', label: 'Messages' },
      ]
    : [
        { href: '/market/connexion', label: 'Espace Market' },
        { href: '/login', label: 'Connexion' },
      ];

  return (
    <footer className="bg-charcoal-950 text-ivory-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Bandeau marque + appel Market */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12 border-b border-white/10">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="Retour à l'accueil LeOui.net">
              <span className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </span>
              <span className="font-serif text-2xl text-ivory-50">LeOui.net</span>
            </Link>
            <p className="font-serif text-xl text-ivory-50/80 leading-relaxed mt-6 max-w-md">
              Organisez votre mariage où et quand vous voulez.
            </p>
            <p className="text-sm text-ivory-50/50 mt-2 max-w-md">
              Prestataires, outils de planification et seconde main entre particuliers.
            </p>
            <div className="flex gap-2.5 mt-6">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-white/15 text-ivory-50/60 hover:text-rose-400 hover:border-rose-400/50 flex items-center justify-center transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:border-l lg:border-white/10 lg:pl-10 flex flex-col justify-center">
            <p className="label-xs text-rose-400">LeOui Market</p>
            <p className="font-serif text-2xl sm:text-3xl text-ivory-50 leading-snug mt-3">
              Donnez une seconde vie aux beaux objets de mariage.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
              <Link
                href="/market/annonces"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ivory-50 hover:text-rose-300 transition-colors"
              >
                Parcourir les annonces <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/market/deposer-une-annonce"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
              >
                Vendre un article
              </Link>
            </div>
          </div>
        </div>

        {/* Colonnes de liens */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 py-12">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="label-xs text-ivory-50/40 pb-3 border-b border-white/10 mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-ivory-50/65 hover:text-rose-300 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="label-xs text-ivory-50/40 pb-3 border-b border-white/10 mb-4">Votre espace</h3>
            <ul className="space-y-2.5">
              {spaceLinks.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ivory-50/65 hover:text-rose-300 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barre basse */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ivory-50/40">© 2026 LeOui.net · Tous droits réservés</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="text-xs text-ivory-50/40 hover:text-rose-300 transition-colors">Conditions</Link>
            <Link href="/privacy" className="text-xs text-ivory-50/40 hover:text-rose-300 transition-colors">Confidentialité</Link>
            <p className="text-xs text-ivory-50/40 flex items-center gap-1.5">
              Fait avec <Heart className="w-3 h-3 text-rose-400 fill-rose-400" /> en France
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
