'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import SplitFormLayout from '@/components/market/SplitFormLayout';
import ListingForm from '@/components/market/ListingForm';
import { Field, SectionTitle, inputCls, primaryBtn } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketSellerProfile } from '@/lib/market/types';
import { splitCityLabel } from '@/lib/market/utils';

const TIPS = [
  'Des photos lumineuses, sous plusieurs angles.',
  'Décrivez les défauts : c’est ce qui évite les litiges.',
  'Un prix juste : comparez avec le neuf.',
];

export default function DeposerAnnoncePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<MarketSellerProfile | null>(null);
  const [checking, setChecking] = useState(true);

  // Création du profil vendeur (RM-004) si absent
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<'particulier' | 'professionnel'>('particulier');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/market/connexion?next=${encodeURIComponent('/market/deposer-une-annonce')}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/market/seller-profile', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.ok && data.profile) setProfile(data.profile);
        else setDisplayName(user.displayName || '');
      } finally {
        setChecking(false);
      }
    })();
  }, [user]);

  const createProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cityOnly = splitCityLabel(city).city;
    if (displayName.trim().length < 2 || !cityOnly) return toast.error('Renseignez un nom public et une ville');
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/seller-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName,
          status,
          phone: phone || undefined,
          address: { city: cityOnly, postal_code: postalCode || splitCityLabel(city).postal },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de la création');
      setProfile(data.profile);
      toast.success('Profil vendeur créé');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de créer le profil vendeur');
    } finally {
      setSaving(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-ivory-50 flex flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );

  if (authLoading || checking || !user) {
    return shell(
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return shell(
      <SplitFormLayout
        eyebrow="Avant de publier"
        title="Votre profil vendeur"
        subtitle="Il s’affiche sur vos annonces et rassure les acheteurs."
        image="/mariage%20(3).jpg"
        imagePosition="85% center"
        tips={TIPS}
      >
        <form onSubmit={createProfile} className="space-y-6">
          <SectionTitle eyebrow="Identité" title="Qui vend ?" />
          <Field label="Nom ou pseudonyme public" required hint="Visible par les acheteurs sur toutes vos annonces.">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex : Sophie M. ou Les Petits Mariés"
              className={inputCls}
            />
          </Field>

          <div>
            <span className="label-xs text-charcoal-600 mb-2 block">Vous vendez en tant que</span>
            <div className="grid grid-cols-2 gap-3">
              {(['particulier', 'professionnel'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`text-left p-4 border transition-colors ${
                    status === s ? 'border-rose-600 bg-rose-50/40' : 'border-charcoal-200 hover:border-charcoal-400'
                  }`}
                >
                  <span className="block text-sm font-semibold text-charcoal-900 capitalize">{s}</span>
                  <span className="block text-xs text-charcoal-500 mt-0.5">
                    {s === 'particulier' ? 'Anciens mariés, revente' : 'Boutique, loueur, créateur'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Ville" required>
              <CityAutocompleteInput
                value={city}
                onChange={setCity}
                onSelectLocation={(loc: LocationSuggestion) => {
                  const parsed = splitCityLabel(loc.label || loc.name);
                  setCity(parsed.city);
                  if (parsed.postal) setPostalCode(parsed.postal);
                }}
                types="city"
                placeholder="Ex : Lyon"
                showPostalCode={false}
                icon={false}
                className="w-full"
                inputClassName="px-4 py-3 border-charcoal-200"
              />
            </Field>
            <Field label="Téléphone" hint="Facultatif — jamais affiché publiquement">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="pt-6 border-t border-charcoal-200 flex justify-end">
            <button type="submit" disabled={saving} className={`${primaryBtn} sm:min-w-[14rem]`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuer'}
            </button>
          </div>
        </form>
      </SplitFormLayout>
    );
  }

  return shell(
    <SplitFormLayout
      eyebrow="Nouvelle annonce"
      title="Déposer une annonce"
      subtitle="Quelques minutes suffisent : votre article est visible dès la publication."
      image="/mariage%20(3).jpg"
        imagePosition="85% center"
      tips={TIPS}
      seller={{ name: profile.display_name, status: profile.status, photoUrl: profile.photo_url }}
    >
      <ListingForm
        mode="create"
        defaultCity={profile.address?.city ?? ''}
        defaultPostalCode={profile.address?.postal_code ?? ''}
      />
    </SplitFormLayout>
  );
}
