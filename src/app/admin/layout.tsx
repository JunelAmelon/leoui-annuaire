'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Heart, LayoutDashboard, Users, Store, MapPin, Database,
  Settings, LogOut, Menu, X, ChevronRight, BookOpen, Scale,
  MessageSquare, User,
} from 'lucide-react';

const NAV: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; exact?: boolean; danger?: boolean }[] = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { href: '/admin/clients',       icon: Users,            label: 'Clients' },
  { href: '/admin/prestataires',  icon: Store,            label: 'Prestataires' },
  { href: '/admin/messages',      icon: MessageSquare,    label: 'Messages' },
  { href: '/admin/articles',      icon: BookOpen,         label: 'Articles' },
  { href: '/admin/litiges',       icon: Scale,            label: 'Litiges Market' },
  { href: '/admin/cities',        icon: MapPin,           label: 'Villes' },
  { href: '/admin/seed',          icon: Database,         label: 'Seed (dev)', danger: true },
];

function AdminLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF6F8' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center shadow-md">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sidebar réduite par défaut sur desktop
  const [collapsed, setCollapsed]   = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/login');
  }, [user, loading, router]);

  if (loading) return <AdminLoadingScreen />;
  if (!user || user.role !== 'admin') return null;

  const photoURL    = (user as any)?.photoURL as string | undefined;
  const displayName = (user as any)?.displayName || user.email?.split('@')[0] || 'Admin';
  const initials    = displayName.slice(0, 2).toUpperCase();

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  // ── Composant NavItem réutilisé desktop + mobile ─────────────────────────
  const NavItem = ({ item, onClick }: { item: typeof NAV[0]; onClick?: () => void }) => {
    const active = isActive(item);
    if (collapsed) {
      return (
        <div className="relative group flex justify-center">
          <Link
            href={item.href}
            onClick={onClick}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              active
                ? item.danger ? 'bg-amber-500' : 'bg-rose-600'
                : item.danger ? 'hover:bg-amber-50' : 'hover:bg-stone-100'
            }`}
          >
            <item.icon className={`w-4 h-4 ${
              active ? 'text-white'
                : item.danger ? 'text-amber-500' : 'text-charcoal-400 group-hover:text-charcoal-700'
            }`} />
          </Link>
          {/* Tooltip */}
          <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1.5 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg ${item.danger ? 'bg-amber-600' : 'bg-charcoal-900'}`}>
            {item.label}
          </div>
        </div>
      );
    }
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
          active
            ? item.danger ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
            : item.danger
              ? 'text-amber-600 hover:bg-amber-50'
              : 'text-charcoal-600 hover:bg-stone-100 hover:text-charcoal-900'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : item.danger ? 'text-amber-500' : 'text-charcoal-400'}`} />
        <span className="font-medium truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F7F4F5' }}>

      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen z-30"
        style={{ width: collapsed ? 56 : 220, transition: 'width 0.18s ease' }}
      >
        {/* Contenu sidebar — pas de padding externe pour éviter la barre visible */}
        <div className="flex flex-col h-full bg-white border-r border-charcoal-100">

          {/* ── Logo ── */}
          <div className={`flex items-center h-14 flex-shrink-0 border-b border-charcoal-100 ${collapsed ? 'justify-center' : 'px-4 gap-3'}`}>
            <Link href="/" className="w-8 h-8 flex-shrink-0 bg-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-700 transition-colors" title="Retour à LeOui.net">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </Link>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-serif text-charcoal-900 text-[0.95rem] leading-none block font-medium">LeOui.net</span>
                <span className="text-[9px] text-charcoal-400 font-semibold uppercase tracking-widest">Admin</span>
              </div>
            )}
          </div>

          {/* ── Navigation ── */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2" aria-label="Navigation admin">
            {NAV.map((item, idx) => (
              <React.Fragment key={item.href}>
                {item.danger && idx > 0 && <div className="my-1.5 mx-1 h-px bg-charcoal-100" />}
                <NavItem item={item} />
              </React.Fragment>
            ))}
          </nav>

          {/* ── Pied de sidebar ── */}
          <div className="border-t border-charcoal-100 py-2 px-2 space-y-0.5 flex-shrink-0">

            {/* Paramètres */}
            {collapsed ? (
              <div className="relative group flex justify-center">
                <Link href="/admin/parametres"
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${pathname === '/admin/parametres' ? 'bg-rose-600' : 'hover:bg-stone-100'}`}>
                  <Settings className={`w-4 h-4 ${pathname === '/admin/parametres' ? 'text-white' : 'text-charcoal-400 group-hover:text-charcoal-700'}`} />
                </Link>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1.5 bg-charcoal-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Paramètres
                </div>
              </div>
            ) : (
              <Link href="/admin/parametres"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${pathname === '/admin/parametres' ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:bg-stone-100 hover:text-charcoal-900'}`}>
                <Settings className={`w-4 h-4 flex-shrink-0 ${pathname === '/admin/parametres' ? 'text-white' : 'text-charcoal-400'}`} />
                <span className="font-medium">Paramètres</span>
              </Link>
            )}

            {/* Avatar + nom */}
            <div className={`flex items-center gap-2.5 px-2 py-1.5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-rose-400 to-rose-600">
                {photoURL
                  ? <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                }
              </div>
              {!collapsed && (
                <span className="text-xs text-charcoal-500 truncate flex-1">{displayName}</span>
              )}
            </div>

            {/* Déconnexion */}
            {collapsed ? (
              <div className="relative group flex justify-center">
                <button onClick={() => signOut()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors">
                  <LogOut className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700" />
                </button>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1.5 bg-charcoal-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Déconnexion
                </div>
              </div>
            ) : (
              <button onClick={() => signOut()}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-charcoal-600 hover:bg-stone-100 hover:text-charcoal-900 transition-all w-full">
                <LogOut className="w-4 h-4 flex-shrink-0 text-charcoal-400" />
                <span className="font-medium">Déconnexion</span>
              </button>
            )}

            {/* Toggle expand/collapse — petit bouton discret en bas */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className={`flex items-center justify-center w-9 h-7 rounded-lg hover:bg-stone-100 transition-colors text-charcoal-300 hover:text-charcoal-600 ${collapsed ? 'mx-auto' : 'ml-auto mr-0'}`}
              title={collapsed ? 'Développer' : 'Réduire'}
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── DRAWER MOBILE ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-60 bg-white shadow-2xl flex flex-col z-50">
            <div className="px-4 py-3.5 border-b border-charcoal-100 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <div className="w-7 h-7 bg-rose-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </div>
                <span className="font-serif text-charcoal-900 text-base">LeOui.net</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {NAV.map((item, idx) => (
                <React.Fragment key={item.href}>
                  {item.danger && idx > 0 && <div className="my-1.5 mx-1 h-px bg-charcoal-100" />}
                  <Link href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive(item)
                        ? item.danger ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                        : item.danger ? 'text-amber-600 hover:bg-amber-50' : 'text-charcoal-600 hover:bg-stone-100'
                    }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive(item) ? 'text-white' : item.danger ? 'text-amber-500' : 'text-charcoal-400'}`} />
                    {item.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
            <div className="border-t border-charcoal-100 py-2 px-2 space-y-0.5">
              <Link href="/admin/parametres" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-charcoal-600 hover:bg-stone-100 rounded-xl transition-colors">
                <Settings className="w-4 h-4 text-charcoal-400" /> Paramètres
              </Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-charcoal-600 hover:bg-stone-100 rounded-xl transition-colors w-full">
                <LogOut className="w-4 h-4 text-charcoal-400" /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-charcoal-100 px-4 h-12 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-charcoal-600 rounded-lg hover:bg-stone-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif text-charcoal-900">LeOui.net Admin</span>
          <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-rose-400 to-rose-600">
            {photoURL
              ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
            }
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
