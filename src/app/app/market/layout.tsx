'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Avatar } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceHeartbeat, useUnreadCount } from '@/lib/market/client/realtime';
import {
  LayoutDashboard, ShoppingBag, Wallet, Tag, Scale, Settings, Plus, Loader2, Mail, type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Général',
    items: [
      { href: '/app/market', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
      { href: '/app/market/messages', label: 'Messages', icon: Mail },
    ],
  },
  { title: 'Acheter', items: [{ href: '/app/market/mes-commandes', label: 'Mes achats', icon: ShoppingBag }] },
  {
    title: 'Vendre',
    items: [
      { href: '/app/market/mes-annonces', label: 'Mes annonces', icon: Tag },
      { href: '/app/market/mes-ventes', label: 'Mes ventes', icon: Wallet },
    ],
  },
  { title: 'Assistance', items: [{ href: '/app/market/litiges', label: 'Litiges', icon: Scale }] },
  { title: 'Compte', items: [{ href: '/app/market/profil', label: 'Mon profil', icon: Settings }] },
];

// Espace personnel Market : indépendant de l'espace couple / prestataire (CDC §1.1).
export default function MarketSpaceLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadCount(user?.uid);
  usePresenceHeartbeat(!!user);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/market/connexion?next=${encodeURIComponent(pathname || '/app/market')}`);
    }
  }, [loading, user, pathname, router]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-ivory-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = user.displayName || 'Mon compte';

  return (
    <div className="min-h-screen bg-ivory-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        <aside className="lg:sticky lg:top-32 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} photoUrl={user.photoURL} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal-900 truncate">{displayName}</p>
              <p className="flex items-center gap-1.5 text-xs text-charcoal-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden />
                Vous êtes connecté
              </p>
            </div>
          </div>

          <Link
            href="/market/deposer-une-annonce"
            className="flex items-center justify-center gap-2 h-11 w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold tracking-[0.03em] whitespace-nowrap transition-colors"
          >
            <Plus className="w-4 h-4 flex-shrink-0" /> Déposer une annonce
          </Link>

          {/* Desktop */}
          <nav className="hidden lg:block space-y-5 pt-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="label-xs text-charcoal-400 mb-2">{group.title}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 py-2 pl-3 -ml-px border-l-2 text-sm transition-colors ${
                      isActive(item)
                        ? 'border-rose-600 text-charcoal-900 font-semibold'
                        : 'border-charcoal-200 text-charcoal-500 hover:border-charcoal-500 hover:text-charcoal-900'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive(item) ? 'text-rose-600' : 'text-charcoal-400'}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/app/market/messages' && unread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ))}
            <Link
              href="/market/annonces"
              className="block pt-4 border-t border-charcoal-200 label-xs text-charcoal-500 hover:text-rose-600 transition-colors"
            >
              ← Retour à la marketplace
            </Link>
          </nav>

          {/* Mobile : grille, jamais de scroll horizontal */}
          <nav className="lg:hidden grid grid-cols-2 gap-px bg-charcoal-200 border border-charcoal-200">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold bg-white transition-colors ${
                  isActive(item) ? 'text-rose-600' : 'text-charcoal-600'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {item.href === '/app/market/messages' && unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
