'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BadgeCheck, CalendarDays, Clock, Loader2, MapPin, Mail, Phone, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ListingCard from '@/components/market/ListingCard';
import ContactSeller from '@/components/market/ContactSeller';
import { Avatar } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { MarketListing } from '@/lib/market/types';
import type { PublicSeller } from '@/lib/market/seller-public';
import type { ActivityBucket } from '@/lib/market/messaging-rules';

const ACTIVITY: Record<Exclude<ActivityBucket, null>, string> = {
  online: 'En ligne',
  hour: 'Actif dans l’heure',
  day: 'Actif aujourd’hui',
  week: 'Actif cette semaine',
  longer: 'Actif il y a plus d’une semaine',
};

export default function SellerPublicPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [seller, setSeller] = useState<PublicSeller | null>(null);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, l] = await Promise.all([
          fetch(`/api/market/sellers/${id}`).then((r) => r.json()),
          fetch(`/api/market/listings?seller=${id}`).then((r) => r.json()),
        ]);
        setSeller(s.ok ? s.seller : null);
        setListings(l.ok ? l.listings : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ivory-50 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return shell(
      <div className="max-w-xl mx-auto px-4 py-28 text-center">
        <h1 className="font-serif text-3xl text-charcoal-900 mb-3">Vendeur introuvable</h1>
        <Link href="/market/annonces" className="label-xs text-rose-600 hover:underline">Parcourir les annonces</Link>
      </div>
    );
  }

  const isMe = user?.uid === seller.id;

  return shell(
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <section className="bg-white border border-charcoal-200 p-6 sm:p-10 flex flex-col md:flex-row md:items-start gap-8">
        <Avatar name={seller.display_name} photoUrl={seller.photo_url} size={112} />

        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <p className="label-xs text-rose-600 mb-2">{seller.status === 'professionnel' ? 'Vendeur professionnel' : 'Vendeur particulier'}</p>
            <h1 className="font-serif text-4xl text-charcoal-900 leading-none">{seller.display_name}</h1>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal-600">
            {seller.city && (
              <li className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-charcoal-400" /> {seller.city}</li>
            )}
            <li className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-charcoal-400" />
              Membre depuis {new Date(seller.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </li>
            {seller.activity && (
              <li className="flex items-center gap-1.5">
                {seller.activity === 'online' ? (
                  <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
                ) : (
                  <Clock className="w-4 h-4 text-charcoal-400" />
                )}
                {ACTIVITY[seller.activity]}
              </li>
            )}
            {seller.rating_count > 0 && (
              <li className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {seller.rating_avg.toFixed(1)} · {seller.rating_count} avis
              </li>
            )}
          </ul>

          {seller.bio && <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-line max-w-2xl">{seller.bio}</p>}

          <div className="flex flex-wrap gap-2.5">
            {seller.verified.email && (
              <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-600 border border-charcoal-200 px-3 py-1.5"><Mail className="w-3.5 h-3.5 text-rose-600" /> Email vérifié</span>
            )}
            {seller.verified.phone && (
              <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-600 border border-charcoal-200 px-3 py-1.5"><Phone className="w-3.5 h-3.5 text-rose-600" /> Numéro vérifié</span>
            )}
            {seller.verified.identity && (
              <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-600 border border-charcoal-200 px-3 py-1.5"><BadgeCheck className="w-3.5 h-3.5 text-rose-600" /> Identité vérifiée</span>
            )}
          </div>
        </div>

        <div className="md:w-56 flex-shrink-0">
          {isMe ? (
            <Link href="/app/market/profil" className="flex items-center justify-center h-11 px-5 rounded-xl border border-charcoal-300 hover:border-charcoal-900 text-sm font-semibold text-charcoal-900 transition-colors">
              Modifier mon profil
            </Link>
          ) : (
            <ContactSeller sellerId={seller.id} sellerName={seller.display_name} sellerPhoto={seller.photo_url} variant="primary" className="w-full" />
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between pb-3 mb-6 border-b border-charcoal-900">
          <h2 className="font-serif text-2xl text-charcoal-900 leading-none">Ses annonces</h2>
          <span className="text-xs text-charcoal-500 tabular-nums">{listings.length} en ligne</span>
        </div>
        {listings.length === 0 ? (
          <p className="text-sm text-charcoal-500 py-8">Ce vendeur n’a aucune annonce en ligne pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
