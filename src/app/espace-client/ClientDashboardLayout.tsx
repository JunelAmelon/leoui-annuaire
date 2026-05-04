'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart, LayoutDashboard, CalendarDays, Users, CheckSquare,
  MessageSquare, FileText, CreditCard, Image, Bell, HelpCircle,
  Settings, LogOut, Menu, X, UserCheck, MapPin, ChevronLeft, ChevronRight, Calculator,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import InteractiveGuide from '@/components/InteractiveGuide';

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
  { href: '/espace-client/calculatrice', label: 'Budget',          icon: Calculator },
];

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { client, event } = useClientData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpDisabled, setHelpDisabled] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [guideCompleted, setGuideCompleted] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('leoui_help_disabled');
      setHelpDisabled(v === '1');
    } catch {
      setHelpDisabled(false);
    }
    // Check if guide was completed
    try {
      const g = localStorage.getItem('leoui_guide_completed');
      setGuideCompleted(g === '1');
    } catch {
      setGuideCompleted(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadNotifCount(0);
      return;
    }
    const q = query(collection(db, 'notifications'), where('recipient_id', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.reduce((acc, d) => {
        const data = d.data() as any;
        return acc + (data?.read === false ? 1 : 0);
      }, 0);
      setUnreadNotifCount(unread);
    });
    return () => unsub();
  }, [user?.uid]);

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
            <Link
              href="/"
              className="w-10 h-10 flex-shrink-0 border border-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 transition-colors group"
            >
              <Heart className="w-4 h-4 text-rose-600 fill-rose-600 group-hover:text-white group-hover:fill-white transition-colors" />
            </Link>
            {!collapsed && (
              <span className="font-serif text-charcoal-900 text-base leading-none truncate">LeOui.net</span>
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
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="text-sm font-medium text-charcoal-600">Notifications</span>}
                {!collapsed && unreadNotifCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                    {unreadNotifCount}
                  </span>
                )}
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
                <div className="w-8 h-8 border border-rose-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                </div>
                <span className="font-serif text-lg text-charcoal-900">LeOui.net</span>
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
                {unreadNotifCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 border border-rose-600 rounded-lg flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
            </div>
            <span className="font-serif text-lg text-charcoal-900">LeOui.net</span>
          </Link>
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-champagne-400 to-rose-400 flex items-center justify-center">
            {client?.photo ? (
              <img src={client.photo} alt={coupleName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">{initials}</span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-5 sm:p-6 lg:p-8 relative">
          {children}

          {/* Help Button - Updated with Guide */}
          {!helpDisabled && (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="group fixed bottom-5 right-5 z-40 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-3 rounded-full shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 transition-all duration-300 text-sm font-semibold flex items-center gap-2"
              aria-label="Ouvrir le guide interactif"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Aide</span>
              {/* Tooltip for first-time users */}
              {!guideCompleted && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-charcoal-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Découvrir l'app
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal-900" />
                </span>
              )}
            </button>
          )}

          {/* Interactive Guide Component */}
          <InteractiveGuide
            isOpen={showGuide}
            onClose={() => setShowGuide(false)}
            onComplete={() => {
              setGuideCompleted(true);
              try { localStorage.setItem('leoui_guide_completed', '1'); } catch {}
            }}
          />

        </main>
      </div>
    </div>
  );
}
