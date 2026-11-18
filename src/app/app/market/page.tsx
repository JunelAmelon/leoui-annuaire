'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Avatar, Leader, SectionTitle, primaryBtn } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketListing, MarketOrder, MarketSellerProfile } from '@/lib/market/types';
import { sellerNetFromAmounts } from '@/lib/market/utils';

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isDone = (o: MarketOrder) => o.order_status === 'completed' || o.order_status === 'receipt_confirmed';
const isLive = (o: MarketOrder) => !isDone(o) && !['cancelled', 'refunded'].includes(o.order_status);

interface Todo {
  key: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

export default function MarketOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [purchases, setPurchases] = useState<MarketOrder[]>([]);
  const [sales, setSales] = useState<MarketOrder[]>([]);
  const [profile, setProfile] = useState<MarketSellerProfile | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const get = (url: string) => fetch(url, { headers }).then((r) => r.json()).catch(() => null);
      const [l, p, s, prof] = await Promise.all([
        get('/api/market/listings?mine=1'),
        get('/api/market/orders'),
        get('/api/market/orders?as=seller'),
        get('/api/market/seller-profile'),
      ]);
      setListings(l?.listings ?? []);
      setPurchases(p?.orders ?? []);
      setSales(s?.orders ?? []);
      setProfile(prof?.profile ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const stats = useMemo(() => {
    const toShip = sales.filter((o) => o.delivery_mode === 'shipping' && ['paid', 'preparing'].includes(o.order_status));
    const toHandOver = sales.filter((o) => o.delivery_mode === 'pickup' && ['paid', 'preparing', 'pickup_scheduled'].includes(o.order_status));
    const disputed = [...sales, ...purchases].filter((o) => o.order_status === 'disputed');
    return {
      active: listings.filter((l) => l.status === 'active').length,
      toProcess: toShip.length + toHandOver.length,
      toShip,
      toHandOver,
      buying: purchases.filter(isLive).length,
      disputed: disputed.length,
      escrow: sales.filter(isLive).reduce((sum, o) => sum + sellerNetFromAmounts(o.amounts), 0),
      paidOut: sales.filter(isDone).reduce((sum, o) => sum + sellerNetFromAmounts(o.amounts), 0),
    };
  }, [listings, purchases, sales]);

  const todos: Todo[] = useMemo(() => {
    const list: Todo[] = [];
    stats.toShip.forEach((o) =>
      list.push({
        key: `ship-${o.id}`,
        title: `Expédier « ${o.listing_snapshot?.title} »`,
        text: 'Le paiement est bloqué : renseignez le numéro de suivi.',
        href: '/app/market/mes-ventes',
        cta: 'Expédier',
      })
    );
    stats.toHandOver.forEach((o) =>
      list.push({
        key: `hand-${o.id}`,
        title: `Remettre « ${o.listing_snapshot?.title} »`,
        text: 'Convenez d’un rendez-vous et vérifiez le code de remise.',
        href: '/app/market/mes-ventes',
        cta: 'Voir la vente',
      })
    );
    purchases
      .filter((o) => o.order_status === 'shipped')
      .forEach((o) =>
        list.push({
          key: `recv-${o.id}`,
          title: `Colis en route : « ${o.listing_snapshot?.title} »`,
          text: 'Dès réception, confirmez pour libérer le paiement.',
          href: '/app/market/mes-commandes',
          cta: 'Confirmer',
        })
      );
    if (stats.disputed > 0) {
      list.push({
        key: 'disputes',
        title: `${stats.disputed} litige${stats.disputed > 1 ? 's' : ''} en cours`,
        text: 'Consultez les messages et répondez si nécessaire.',
        href: '/app/market/litiges',
        cta: 'Ouvrir',
      });
    }
    return list;
  }, [stats, purchases]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    );
  }

  const firstName = (user?.displayName || user?.email?.split('@')[0] || '').split(' ')[0];
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const figures = [
    { label: 'Annonces en ligne', value: String(stats.active), href: '/app/market/mes-annonces', hot: false },
    { label: 'Ventes à traiter', value: String(stats.toProcess), href: '/app/market/mes-ventes', hot: stats.toProcess > 0 },
    { label: 'Achats en cours', value: String(stats.buying), href: '/app/market/mes-commandes', hot: false },
    { label: 'En séquestre', value: `${eur(stats.escrow)} €`, href: '/app/market/mes-ventes', hot: false },
  ];

  return (
    <div className="space-y-10">
      <header className="grid grid-cols-1 md:grid-cols-[1fr_17rem] gap-6 md:gap-10 items-stretch">
        <div className="self-center">
          <p className="label-xs text-rose-600 mb-3 capitalize">{today}</p>
          <h1 className="font-serif text-charcoal-900 leading-[1.05]" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', fontWeight: 400 }}>
            Bonjour{firstName ? ` ${firstName}` : ''},
          </h1>
          <p className="text-charcoal-500 mt-3">voici où en sont vos achats, vos ventes et vos annonces.</p>
        </div>
        <div className="order-first md:order-last relative h-36 md:h-auto md:min-h-[12rem] overflow-hidden">
          <img
            src="/mariage%20(5).jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-[35%_center]"
          />
        </div>
      </header>

      {!profile && (
        <div className="border border-charcoal-900 bg-charcoal-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="font-serif text-2xl leading-snug">Donnez une seconde vie à vos articles</p>
            <p className="text-sm text-white/70 mt-1.5 max-w-md">
              Créez votre profil vendeur en une minute : vous êtes payé dès que l’acheteur confirme la réception.
            </p>
          </div>
          <Link href="/market/deposer-une-annonce" className={`${primaryBtn} whitespace-nowrap`}>
            Commencer à vendre <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Chiffres clés : tableau à filets, sans cartes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border-t-2 border-t-charcoal-900 border-l border-charcoal-200">
        {figures.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className="group border-r border-b border-charcoal-200 p-5 sm:p-6 hover:bg-ivory-50/70 transition-colors"
          >
            <p className="label-xs text-charcoal-500">{f.label}</p>
            <p className={`font-serif tabular-nums leading-none mt-4 ${f.hot ? 'text-rose-600' : 'text-charcoal-900'}`} style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}>
              {f.value}
            </p>
            <p className="text-xs text-charcoal-400 mt-3 group-hover:text-rose-600 transition-colors">Voir le détail →</p>
          </Link>
        ))}
      </div>

      {/* À faire */}
      <section>
        <SectionTitle eyebrow="Aujourd’hui" title="À faire" />
        {todos.length === 0 ? (
          <p className="text-sm text-charcoal-500 py-2">Rien à signaler. Tout est à jour.</p>
        ) : (
          <ol className="divide-y divide-charcoal-200 border-b border-charcoal-200">
            {todos.map((t, i) => (
              <li key={t.key} className="py-4 flex items-baseline gap-5">
                <span className="font-serif text-2xl text-charcoal-300 tabular-nums w-8 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal-900">{t.title}</p>
                  <p className="text-xs text-charcoal-500 mt-0.5">{t.text}</p>
                </div>
                <Link href={t.href} className="label-xs text-rose-600 hover:underline whitespace-nowrap">
                  {t.cta} →
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section>
          <SectionTitle eyebrow="Vendre" title="Mes revenus" />
          <div className="space-y-3">
            <Leader label="En séquestre" value={`${eur(stats.escrow)} €`} />
            <Leader label="Libérés" value={`${eur(stats.paidOut)} €`} />
            <div className="pt-3 mt-1 border-t border-charcoal-200">
              <Leader label="Total net" value={`${eur(stats.escrow + stats.paidOut)} €`} strong />
            </div>
          </div>
          <p className="text-xs text-charcoal-500 mt-5 leading-relaxed">
            Montants nets après commission. Le virement bancaire sera activé avec le prestataire de paiement.
          </p>
        </section>

        <section>
          <SectionTitle
            eyebrow="Vendre"
            title="Profil vendeur"
            aside={
              <Link href="/app/market/profil" className="label-xs text-charcoal-500 hover:text-rose-600 transition-colors whitespace-nowrap">
                Modifier →
              </Link>
            }
          />
          {profile ? (
            <div>
              <div className="flex items-center gap-4 mb-5">
                <Avatar name={profile.display_name} photoUrl={profile.photo_url} size={56} />
                <div className="min-w-0">
                  <p className="font-serif text-xl text-charcoal-900 truncate">{profile.display_name}</p>
                  <p className="text-xs text-charcoal-500 capitalize">
                    {profile.status}
                    {profile.address?.city ? ` · ${profile.address.city}` : ''}
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <Leader label="Email" value={profile.verified?.email ? 'Vérifié' : 'Non vérifié'} />
                <Leader label="Téléphone" value={profile.verified?.phone ? 'Vérifié' : 'Non vérifié'} />
                <Leader label="Identité" value={profile.verified?.identity ? 'Vérifiée' : 'Non vérifiée'} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-charcoal-500 leading-relaxed">
              Votre profil vendeur se crée en quelques secondes, au moment de votre première annonce.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
