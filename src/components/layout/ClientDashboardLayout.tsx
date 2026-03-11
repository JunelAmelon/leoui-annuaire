'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CreditCard,
  MessageSquare,
  CheckSquare,
  Image,
  Heart,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
  clientName?: string;
  daysRemaining?: number;
}

const navItems = [
  { href: '/espace-client', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/espace-client/planning', icon: Calendar, label: 'Planning' },
  { href: '/espace-client/prestataires', icon: Users, label: 'Prestataires' },
  { href: '/espace-client/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/espace-client/documents', icon: FileText, label: 'Documents' },
  { href: '/espace-client/paiements', icon: CreditCard, label: 'Paiements' },
  { href: '/espace-client/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/espace-client/galerie', icon: Image, label: 'Galerie' },
  { href: '/espace-client/mariage', icon: Heart, label: 'Mon Mariage' },
  { href: '/espace-client/parametres', icon: Settings, label: 'Paramètres' },
];

export function ClientDashboardLayout({ children, clientName, daysRemaining }: ClientDashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/espace-client') return pathname === '/espace-client';
    return pathname.startsWith(href);
  };

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="block">
          <span className="font-serif text-2xl text-white font-bold tracking-wide">Le Oui</span>
        </Link>
        {clientName && (
          <p className="text-white/70 text-sm mt-1 truncate">{clientName}</p>
        )}
        {daysRemaining !== undefined && daysRemaining > 0 && (
          <div className="mt-3 bg-white/10 rounded-lg px-3 py-2">
            <p className="text-white text-xs font-medium">Votre mariage dans</p>
            <p className="text-white text-xl font-bold">{daysRemaining} jours</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-brand-purple shadow-sm'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Link
          href="/espace-client/notifications"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all mb-1"
        >
          <Bell className="h-4 w-4" />
          Notifications
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-brand-purple fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-purple transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5 text-brand-gray" />
              </Button>
              <div className="hidden sm:block">
                <p className="text-sm text-brand-gray font-medium">
                  {clientName && `Bonjour, ${clientName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/espace-client/notifications">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5 text-brand-gray" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
