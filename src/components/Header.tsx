'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Menu, X } from 'lucide-react';

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navLinks = [
    { href: '/vendors',         label: 'Prestataires' },
    { href: '/venues',          label: 'Lieux' },
    { href: '/inspiration',     label: 'Inspiration' },
    { href: '/wedding-planner', label: 'Wedding Planner' },
    { href: '/cities',          label: 'Régions' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-effect border-b border-charcoal-100/60">
        <nav className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[4.25rem]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-7 h-7 border border-rose-600 flex items-center justify-center transition-colors duration-300 group-hover:bg-rose-600">
                <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 group-hover:text-white group-hover:fill-white transition-colors duration-300" />
              </div>
              <span className="font-serif text-[1.3rem] tracking-wide text-charcoal-900 leading-none">LeOui</span>
            </Link>

            {/* Desktop nav — animated underline links */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="relative text-[0.8rem] font-medium tracking-[0.05em] text-charcoal-600 hover:text-charcoal-900 transition-colors duration-200 group py-1"
                >
                  {label}
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-rose-600 group-hover:w-full transition-all duration-300 ease-out" />
                </Link>
              ))}
            </div>

            {/* Desktop auth */}
            <div className="hidden lg:flex items-center gap-6">
              <Link
                href="/login"
                className="text-[0.8rem] font-medium tracking-[0.05em] text-charcoal-600 hover:text-charcoal-900 transition-colors duration-200"
              >
                Connexion
              </Link>
              <Link href="/signup" className="btn-primary py-2.5 px-6 text-[0.72rem]">
                S'inscrire
              </Link>
            </div>

            {/* Mobile: auth + burger */}
            <div className="flex items-center gap-3 lg:hidden">
              <Link
                href="/login"
                className="text-[0.8rem] font-medium text-charcoal-600"
              >
                Connexion
              </Link>
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
              <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
                <div className="w-6 h-6 border border-rose-600 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
                </div>
                <span className="font-serif text-lg text-charcoal-900 tracking-wide">LeOui</span>
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
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Auth */}
            <div className="px-6 pb-10 pt-4 space-y-3 border-t border-charcoal-100">
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="block text-center py-3 border border-charcoal-300 text-charcoal-800 text-sm font-medium tracking-[0.05em] hover:bg-charcoal-50 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                onClick={() => setDrawerOpen(false)}
                className="block text-center py-3 bg-rose-600 text-white text-sm font-medium tracking-[0.07em] uppercase hover:bg-rose-700 transition-colors"
              >
                Créer un compte
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
