'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart, LayoutDashboard, Megaphone, MessageSquare, FileText,
  CalendarDays, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  FileCheck2, Receipt, Tag, Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '/espace-prestataire',              label: 'Tableau de bord',     icon: LayoutDashboard, exact: true },
  { href: '/espace-prestataire/mon-annonce',  label: 'Mon annonce',         icon: Megaphone },
  { href: '/espace-prestataire/contacts',     label: 'Contacts',            icon: MessageSquare },
  { href: '/espace-prestataire/devis',        label: 'Devis',               icon: FileText },
  { href: '/espace-prestataire/contrats',     label: 'Contrats',            icon: FileCheck2 },
  { href: '/espace-prestataire/factures',     label: 'Factures',            icon: Receipt },
  { href: '/espace-prestataire/planning',     label: 'Planning',            icon: CalendarDays },
  { href: '/espace-prestataire/promotions',   label: 'Promotions',          icon: Tag },
  { href: '/espace-prestataire/avis',         label: 'Avis clients',        icon: Star },
];

export default function PrestataireDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Mon espace';
  const initials = displayName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const SW = collapsed ? 84 : 224;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#ECEAE5' }}>

      {/* ── DESKTOP FLOATING SIDEBAR ── */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen z-30 p-2.5"
        style={{ width: SW, transition: 'width 0.2s ease' }}
      >
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Logo */}
          <div className={`flex items-center pt-4 pb-3 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
            <Link href="/"
              className="w-10 h-10 flex-shrink-0 bg-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-700 transition-colors">
              <Heart className="w-4 h-4 text-white fill-white" />
            </Link>
            {!collapsed && (
              <span className="font-serif text-charcoal-900 text-base leading-none truncate">LeOui Pro</span>
            )}
          </div>

          <div className="mx-3 h-px bg-stone-100 flex-shrink-0" />

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto overflow-x-hidden">
            {NAV.map(item => {
              const active = isActive(item);
              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-150 ${
                      collapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5'
                    } ${active ? 'bg-rose-600' : 'hover:bg-rose-50'}`}
                  >
                    <item.icon className={`flex-shrink-0 w-[17px] h-[17px] ${active ? 'text-white' : 'text-charcoal-400 group-hover:text-rose-600'}`} />
                    {!collapsed && (
                      <span className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-charcoal-600 group-hover:text-rose-700'}`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                  {collapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-rose-700" />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mx-3 h-px bg-stone-100 flex-shrink-0" />

          {/* Bottom */}
          <div className="flex flex-col gap-0.5 py-3 px-2 flex-shrink-0">

            {/* Paramètres */}
            <div className="relative group">
              <Link href="/espace-prestataire/parametres"
                className={`flex items-center gap-3 rounded-xl transition-all ${
                  collapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5'
                } ${pathname === '/espace-prestataire/parametres' ? 'bg-rose-600' : 'hover:bg-rose-50'}`}>
                <Settings className={`w-[17px] h-[17px] flex-shrink-0 ${pathname === '/espace-prestataire/parametres' ? 'text-white' : 'text-charcoal-400 group-hover:text-rose-600'}`} />
                {!collapsed && <span className={`text-sm font-medium ${pathname === '/espace-prestataire/parametres' ? 'text-white' : 'text-charcoal-600 group-hover:text-rose-700'}`}>Paramètres</span>}
              </Link>
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Paramètres
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-rose-700" />
                </div>
              )}
            </div>

            {/* Avatar row */}
            <div className={`flex items-center gap-2.5 mt-1 ${collapsed ? 'justify-center' : 'px-3 py-1'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-champagne-400 to-rose-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-[11px] font-bold leading-none">{initials}</span>
              </div>
              {!collapsed && (
                <span className="text-xs text-charcoal-500 truncate">{displayName}</span>
              )}
            </div>

            {/* Logout */}
            <div className="relative group">
              <button
                onClick={() => signOut()}
                className={`flex items-center gap-3 rounded-xl hover:bg-rose-50 transition-colors w-full ${
                  collapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5'
                }`}
              >
                <LogOut className="flex-shrink-0 w-[17px] h-[17px] text-charcoal-400 group-hover:text-rose-600" />
                {!collapsed && <span className="text-sm font-medium text-charcoal-600 group-hover:text-rose-700">Déconnexion</span>}
              </button>
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Déconnexion
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-rose-700" />
                </div>
              )}
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className={`mt-1 flex items-center justify-center gap-2 rounded-xl py-2 hover:bg-rose-50 transition-colors text-charcoal-400 hover:text-rose-600 ${collapsed ? 'w-10 mx-auto' : 'px-3 w-full'}`}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                <><ChevronLeft className="w-4 h-4 flex-shrink-0" /><span className="text-xs font-medium">Réduire</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE SLIDE-OVER ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl flex flex-col z-50">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 bg-rose-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="font-serif text-lg text-charcoal-900">LeOui Pro</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-champagne-400 to-rose-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{initials}</span>
              </div>
              <p className="font-serif text-charcoal-900 text-sm font-medium truncate">{displayName}</p>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2">
              {NAV.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:text-rose-700 hover:bg-rose-50'
                    }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-charcoal-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-stone-100 py-2 px-2">
              <Link href="/espace-prestataire/parametres" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-charcoal-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors">
                <Settings className="w-4 h-4 text-charcoal-400" /> Paramètres
              </Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-charcoal-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors w-full">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-stone-200 px-4 h-14 flex items-center justify-between shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-charcoal-600 rounded-xl hover:bg-stone-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif text-lg text-charcoal-900">LeOui Pro</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-champagne-400 to-rose-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
        </header>

        <main className="p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
