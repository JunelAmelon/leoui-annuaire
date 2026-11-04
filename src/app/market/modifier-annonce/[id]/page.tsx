'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SplitFormLayout from '@/components/market/SplitFormLayout';
import ListingForm from '@/components/market/ListingForm';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketListing } from '@/lib/market/types';

export default function ModifierAnnoncePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<MarketListing | null>(null);
  const [profileName, setProfileName] = useState<{ name: string; status?: string; photoUrl?: string | null } | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/market/connexion?next=${encodeURIComponent(`/market/modifier-annonce/${id}`)}`);
    }
  }, [authLoading, user, id, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [l, p] = await Promise.all([
          fetch('/api/market/listings?mine=1', { headers }).then((r) => r.json()),
          fetch('/api/market/seller-profile', { headers }).then((r) => r.json()),
        ]);
        setListing((l.listings ?? []).find((x: MarketListing) => x.id === id && x.status !== 'removed') ?? null);
        if (p.profile) setProfileName({ name: p.profile.display_name, status: p.profile.status, photoUrl: p.profile.photo_url });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ivory-50 flex flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );

  if (authLoading || loading) {
    return shell(
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return shell(
      <div className="max-w-xl mx-auto px-4 py-28 text-center">
        <h1 className="font-serif text-3xl text-charcoal-900 mb-3">Annonce introuvable</h1>
        <p className="text-sm text-charcoal-500 mb-8">Cette annonce n’existe pas ou ne vous appartient pas.</p>
        <Link href="/app/market/mes-annonces" className="label-xs text-rose-600 hover:underline">
          Retour à mes annonces
        </Link>
      </div>
    );
  }

  if (['sold', 'reserved'].includes(listing.status)) {
    return shell(
      <div className="max-w-xl mx-auto px-4 py-28 text-center">
        <h1 className="font-serif text-3xl text-charcoal-900 mb-3">Annonce engagée dans une vente</h1>
        <p className="text-sm text-charcoal-500 mb-8">Elle ne peut plus être modifiée tant que la transaction n’est pas terminée.</p>
        <Link href="/app/market/mes-ventes" className="label-xs text-rose-600 hover:underline">
          Voir mes ventes
        </Link>
      </div>
    );
  }

  return shell(
    <SplitFormLayout
      eyebrow="Modification"
      title="Modifier l’annonce"
      subtitle="Les changements sont visibles immédiatement."
      image="/mariage%20(3).jpg"
        imagePosition="85% center"
      tips={['Remplacez une photo sombre ou floue.', 'Ajustez le prix si l’annonce tarde à se vendre.']}
      seller={profileName}
      backHref="/app/market/mes-annonces"
      backLabel="Mes annonces"
    >
      <ListingForm mode="edit" initial={listing} />
    </SplitFormLayout>
  );
}
