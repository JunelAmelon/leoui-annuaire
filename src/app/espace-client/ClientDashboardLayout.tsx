'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart, LayoutDashboard, CalendarDays, Users, CheckSquare,
  MessageSquare, FileText, CreditCard, Image, Bell,
  Settings, LogOut, Menu, X, UserCheck, MapPin, ChevronLeft, ChevronRight, Calculator,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';

const NAV = [
  { href: '/espace-client',              label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/espace-client/mariage',      label: 'Mon mariage',     icon: MapPin },
  { href: '/espace-client/planning',     label: 'Planning',        icon: CalendarDays },
  { href: '/espace-client/prestataires', label: 'Prestataires',    icon: Users },
  { href: '/espace-client/checklist',    label: 'Checklist',       icon: CheckSquare },
  { href: '/espace-client/invites',      label: 'Invités',         icon: UserCheck },
  { href: '/espace-client/messages',     label: 'Messages',        icon: MessageSquare },
  { href: '/espace-client/documents',    label: 'Documents',       icon: FileText },
  { href: '/espace-client/paiements',    label: 'Paiements',       icon: CreditCard },
  { href: '/espace-client/galerie',      label: 'Galerie',         icon: Image },
  { href: '/espace-client/calculatrice', label: 'Calculatrice',    icon: Calculator },
];

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { client, event } = useClientData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const coupleName = client
    ? `${client.name}${client.partner ? ` & ${client.partner}` : ''}`
    : user?.displayName || user?.email?.split('@')[0] || 'Mon mariage';

  const initials = coupleName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const daysLeft = event?.event_date
    ? Math.max(0, Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000))
    : null;

  const SW = collapsed ? 84 : 224; // sidebar pixel width

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#ECEAE5' }}>

      {/* ── DESKTOP FLOATING SIDEBAR (collapsible) ── */}
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
              <span className="font-serif text-charcoal-900 text-base leading-none truncate">LeOui</span>
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
                  {/* Tooltip — only when collapsed */}
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

          {/* Bottom: Bell + Settings + Avatar + Toggle */}
          <div className="flex flex-col gap-0.5 py-3 px-2 flex-shrink-0">
            {/* Bell */}
            <div className="relative group">
              <Link href="/espace-client/notifications"
                className={`flex items-center gap-3 rounded-xl hover:bg-rose-50 transition-colors ${collapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5'}`}>
                <div className="relative flex-shrink-0">
                  <Bell className="w-[17px] h-[17px] text-charcoal-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                </div>
                {!collapsed && <span className="text-sm font-medium text-charcoal-600">Notifications</span>}
              </Link>
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-rose-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  Notifications
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-rose-700" />
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative group">
              <Link href="/espace-client/parametres"
                className={`flex items-center gap-3 rounded-xl hover:bg-rose-50 transition-colors ${collapsed ? 'w-10 h-10 mx-auto justify-center' : 'px-3 py-2.5'}`}>
                <Settings className="w-[17px] h-[17px] text-charcoal-400 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium text-charcoal-600">Paramètres</span>}
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
              <Link href="/espace-client/parametres"
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0 bg-gradient-to-br from-champagne-400 to-rose-400">
                {client?.photo ? (
                  <img src={client.photo} alt={coupleName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-[11px] font-bold leading-none">{initials}</span>
                )}
              </Link>
              {!collapsed && (
                <span className="text-xs text-charcoal-500 truncate">{coupleName}</span>
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

            {/* Collapse toggle button */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className={`mt-1 flex items-center justify-center gap-2 rounded-xl py-2 hover:bg-rose-50 transition-colors text-charcoal-400 hover:text-rose-600 ${collapsed ? 'w-10 mx-auto' : 'px-3 w-full'}`}
              title={collapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                <>
                  <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">Réduire</span>
                </>
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
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 bg-charcoal-900 rounded-xl flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <span className="font-serif text-lg text-charcoal-900">LeOui</span>
              </Link>
              <button onClick={() => setMobileOpen(false)}
                className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Couple identity */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-champagne-400 to-rose-400 flex items-center justify-center flex-shrink-0">
                {client?.photo ? (
                  <img src={client.photo} alt={coupleName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-charcoal-900 text-sm font-medium truncate">{coupleName}</p>
                {daysLeft !== null && (
                  <p className="text-xs text-champagne-600 font-semibold mt-0.5">J-{daysLeft}</p>
                )}
              </div>
            </div>
            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-2">
              {NAV.map(item => {
                const active = isActive(item);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:text-rose-700 hover:bg-rose-50'
                    }`}>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-charcoal-400 group-hover:text-rose-600'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {/* Bottom */}
            <div className="border-t border-stone-100 py-2 px-2">
              <Link href="/espace-client/notifications" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-charcoal-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors">
                <Bell className="w-4 h-4 text-charcoal-400" /> Notifications
              </Link>
              <Link href="/espace-client/parametres" onClick={() => setMobileOpen(false)}
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
          <span className="font-serif text-lg text-charcoal-900">LeOui</span>
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-champagne-400 to-rose-400 flex items-center justify-center">
            {client?.photo ? (
              <img src={client.photo} alt={coupleName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{initials}</span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
