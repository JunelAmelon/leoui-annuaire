'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, X, Building2, ChevronDown, LayoutDashboard, ShoppingBag, Wallet, Tag, LogOut, User as UserIcon, Scale, Settings, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/market/ui';

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, hasCoupleSpace, signOut, signOutTo } = useAuth();
  const pathname = usePathname();
  const inMarket = !!pathname && (pathname.startsWith('/app/market') || pathname.startsWith('/market'));

  const displayName = user?.displayName || 'Mon compte';
  const firstName = displayName.split(' ')[0];
  const roleHome =
    user?.role === 'admin' ? { href: '/admin', label: 'Administration' }
    : user?.role === 'planner' || user?.role === 'vendor' ? { href: '/espace-prestataire', label: 'Espace prestataire' }
    : hasCoupleSpace ? { href: '/espace-client', label: 'Espace couple' }
    : null; // compte purement Market : aucun lien vers l'espace couple
  const marketLinks = [
    { href: '/app/market', label: 'Vue d’ensemble', icon: LayoutDashboard },
    { href: '/app/market/mes-commandes', label: 'Mes achats', icon: ShoppingBag },
    { href: '/app/market/mes-annonces', label: 'Mes annonces', icon: Tag },
    { href: '/app/market/mes-ventes', label: 'Mes ventes', icon: Wallet },
    { href: '/app/market/litiges', label: 'Litiges', icon: Scale },
    { href: '/app/market/profil', label: 'Mon profil', icon: Settings },
  ];
  const handleSignOut = async () => {
    setMenuOpen(false);
    setDrawerOpen(false);
    if (inMarket) await signOutTo("/market"); else await signOut();
  };

  const navLinks = [
    { href: '/',                label: 'Accueil' },
    { href: '/vendors',         label: 'Prestataires' },
    { href: '/market',          label: 'Marketplace' },
    { href: '/bon-plan',        label: 'Bon plans' },
    { href: '/inspiration',     label: 'Inspiration' },
    { href: '/planifier-votre-mariage', label: 'Planifier votre mariage' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-effect border-b border-charcoal-100/60">
        {/* Top bar — accès entreprise */}
        <div className="hidden sm:block bg-charcoal-900 text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 h-9 flex items-center justify-end gap-6">
            <Link
              href={user ? '/app/market' : '/market/connexion'}
              className="flex items-center gap-1.5 text-[0.7rem] font-medium tracking-[0.04em] hover:text-rose-200 transition-colors"
              title="Espace Market : acheter et vendre"
              aria-label="Espace Market"
            >
              {user && inMarket ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" aria-hidden />
                  Vous êtes connecté
                </>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5" />
                  {user ? 'Mon espace Market' : 'Espace Market'}
                </>
              )}
            </Link>
            <span className="h-3 w-px bg-white/20" aria-hidden />
            <Link
              href="/vendors/join"
              className="flex items-center gap-1.5 text-[0.7rem] font-medium tracking-[0.04em] hover:text-rose-200 transition-colors"
              title="Espace prestataire"
              aria-label="Accès entreprise"
            >
              <Building2 className="w-3.5 h-3.5" />
              Accès entreprise
            </Link>
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[4.25rem]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0" title="LeOui.net - Accueil" aria-label="Retour à l'accueil">
              <div className="w-7 h-7 border border-rose-600 flex items-center justify-center transition-colors duration-300 group-hover:bg-rose-600">
                <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 group-hover:text-white group-hover:fill-white transition-colors duration-300" />
              </div>
              <span className="font-serif text-[1.3rem] tracking-wide text-charcoal-900 leading-none">LeOui.net</span>
            </Link>

            {/* Desktop nav — animated underline links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="relative text-[0.8rem] font-medium tracking-[0.05em] text-charcoal-600 hover:text-charcoal-900 transition-colors duration-200 group py-1"
                  title={`${label} - LeOui.net`}
                  aria-label={`Aller à ${label}`}
                >
                  {label}
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-rose-600 group-hover:w-full transition-all duration-300 ease-out" />
                </Link>
              ))}
            </div>

            {/* Desktop auth */}
            <div className="hidden lg:flex items-center gap-6">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2.5 py-1 group"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <Avatar name={displayName} photoUrl={user?.photoURL} size={30} />
                    <span className="text-[0.8rem] font-medium tracking-[0.03em] text-charcoal-700 group-hover:text-charcoal-900 max-w-[7rem] truncate">{firstName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-charcoal-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-3 w-64 bg-white shadow-soft-xl border border-charcoal-200 z-50 py-2" role="menu">
                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">LeOui Market</p>
                        {marketLinks.map(({ href, label, icon: Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-ivory-50 hover:text-rose-600 transition-colors"
                          >
                            <Icon className="w-4 h-4 text-charcoal-400" /> {label}
                          </Link>
                        ))}
                        <div className="my-2 border-t border-charcoal-100" />
                        {roleHome && (
                          <Link
                            href={roleHome.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-ivory-50 hover:text-rose-600 transition-colors"
                          >
                            <UserIcon className="w-4 h-4 text-charcoal-400" /> {roleHome.label}
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-700 hover:bg-ivory-50 hover:text-rose-600 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-charcoal-400" /> Déconnexion
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[0.8rem] font-medium tracking-[0.05em] text-charcoal-600 hover:text-charcoal-900 transition-colors duration-200"
                    title="Se connecter - LeOui.net"
                    aria-label="Connexion"
                  >
                    Connexion
                  </Link>
                  <Link href="/signup" className="btn-primary py-2.5 px-6 text-[0.72rem]" title="Créer un compte sur LeOui.net" aria-label="S'inscrire">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: auth + burger */}
            <div className="flex items-center gap-3 lg:hidden">
              {user ? (
                <Link href="/app/market" className="text-[0.8rem] font-medium text-charcoal-700" aria-label="Mon espace Market">
                  Mon espace
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-[0.8rem] font-medium text-charcoal-600"
                  title="Se connecter"
                  aria-label="Connexion"
                >
                  Connexion
                </Link>
              )}
              <button
                onClick={() => setDrawerOpen(true)}
                className="p-1.5 text-charcoal-700"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-charcoal-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-white flex flex-col shadow-soft-xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal-100">
              <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5" title="Accueil" aria-label="Retour à l'accueil">
                <div className="w-6 h-6 border border-rose-600 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                </div>
                <span className="font-serif text-lg text-charcoal-900 tracking-wide">LeOui.net</span>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-charcoal-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-8 px-6 space-y-0">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className="block py-3.5 border-b border-charcoal-100 text-[0.9375rem] font-medium text-charcoal-800 hover:text-rose-600 transition-colors"
                  title={label}
                  aria-label={`Aller à ${label}`}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/vendors/join"
                onClick={() => setDrawerOpen(false)}
                className="block py-3.5 border-b border-charcoal-100 text-[0.9375rem] font-medium text-rose-600 hover:text-rose-700 transition-colors"
                title="Espace prestataire"
                aria-label="Accès entreprise"
              >
                Accès entreprise
              </Link>
              {!user && (
                <Link
                  href="/market/connexion"
                  onClick={() => setDrawerOpen(false)}
                  className="block py-3.5 border-b border-charcoal-100 text-[0.9375rem] font-medium text-charcoal-800 hover:text-rose-600 transition-colors"
                  aria-label="Espace Market"
                >
                  Espace Market
                </Link>
              )}
            </nav>

            {/* Auth */}
            <div className="px-6 pb-10 pt-4 space-y-3 border-t border-charcoal-100">
              {user ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">LeOui Market</p>
                  {marketLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setDrawerOpen(false)}
                      className="block text-sm font-medium text-charcoal-800 hover:text-rose-600 transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                  {roleHome && (
                    <Link
                      href={roleHome.href}
                      onClick={() => setDrawerOpen(false)}
                      className="block text-sm font-medium text-charcoal-800 hover:text-rose-600 transition-colors pt-2 border-t border-charcoal-100"
                    >
                      {roleHome.label}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center py-3 border border-charcoal-300 text-charcoal-800 text-sm font-medium hover:bg-charcoal-50 transition-colors"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="block text-center py-3 border border-charcoal-300 text-charcoal-800 text-sm font-medium tracking-[0.05em] hover:bg-charcoal-50 transition-colors"
                    title="Se connecter"
                    aria-label="Connexion"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setDrawerOpen(false)}
                    className="block text-center py-3 bg-rose-600 text-white text-sm font-medium tracking-[0.07em] uppercase hover:bg-rose-700 transition-colors"
                    title="Créer un compte"
                    aria-label="S'inscrire"
                  >
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
