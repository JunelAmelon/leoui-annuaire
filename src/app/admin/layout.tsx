'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, LayoutDashboard, Users, MessageSquare, Settings, LogOut, Menu, X, Bell } from 'lucide-react';

const NAV = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { href: '/admin/clients',    icon: Users,            label: 'Clients' },
  { href: '/admin/messages',   icon: MessageSquare,    label: 'Messages' },
  { href: '/admin/parametres', icon: Settings,          label: 'Paramètres' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (item: typeof NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-charcoal-900">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 border border-white/30 flex items-center justify-center group-hover:border-white/60 transition-colors">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="font-serif text-lg tracking-wide text-white leading-none">LeOui</span>
        </Link>
        <button className="lg:hidden p-1 text-white/40 hover:text-white transition-colors" onClick={() => setOpen(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      <div className="px-6 py-4 border-b border-white/10 flex-shrink-0">
        <p className="label-xs text-white/25 tracking-[0.14em]">Administration</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 px-6 py-2.5 text-[0.8125rem] font-medium transition-colors duration-150 group ${
                active ? 'text-white bg-white/8' : 'text-white/40 hover:text-white/75 hover:bg-white/5'
              }`}
            >
              {active && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-champagne-500" />}
              <item.icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-champagne-400' : 'text-white/25 group-hover:text-white/50'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Signout */}
      <div className="border-t border-white/10 py-2 flex-shrink-0">
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-6 py-2.5 text-[0.8125rem] font-medium text-white/35 hover:text-white/70 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ivory-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:w-56 lg:fixed lg:inset-y-0 lg:z-30">
        <SidebarInner />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/55" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <SidebarInner />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:pl-56">
        <header className="sticky top-0 z-20 bg-white/92 backdrop-blur-sm border-b border-charcoal-100 px-5 sm:px-7 h-14 flex items-center justify-between">
          <button className="lg:hidden p-1.5 text-charcoal-600" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4 lg:ml-auto">
            <Bell className="w-4 h-4 text-charcoal-400" />
            <Link
              href="/"
              className="hidden sm:block text-[0.7rem] font-medium tracking-[0.07em] uppercase text-charcoal-400 hover:text-charcoal-700 transition-colors"
            >
              ← Retour au site
            </Link>
          </div>
        </header>
        <main className="p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
