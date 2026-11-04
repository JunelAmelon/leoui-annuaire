'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { sendEmailVerification } from 'firebase/auth';
import { signUp } from '@/lib/auth-helpers';
import { useAuth } from '@/contexts/AuthContext';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import AddressAutocompleteInput, { AddressSuggestion } from '@/components/AddressAutocompleteInput';
import MarketAuthShell from '@/components/market/MarketAuthShell';
import { Field, inputCls, primaryBtn } from '@/components/market/ui';
import LeOuiNetEntryCard from '@/components/market/LeOuiNetEntryCard';
import { splitCityLabel } from '@/lib/market/utils';
import { toast } from 'sonner';

const safeNext = (n: string | null | undefined) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app/market');

export default function MarketSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeNext(searchParams?.get('next'));
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);

  // Profil vendeur — toujours collecté
  const [sellerStatus, setSellerStatus] = useState<'particulier' | 'professionnel'>('particulier');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (authLoading || !user || redirected.current) return;
    redirected.current = true;
    router.replace(nextUrl);
  }, [authLoading, user, nextUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) return setError("Vous devez accepter les conditions d'utilisation.");
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (!splitCityLabel(city).city) return setError('Indiquez votre ville.');

    setError('');
    setLoading(true);
    try {
      redirected.current = true;
      const cityOnly = splitCityLabel(city).city;
      const created = await signUp({
        email,
        password,
        name,
        role: 'client',
        marketOnly: true,
        phone: phone || undefined,
        address: { street: street || undefined, city: cityOnly, postalCode },
      });

      sendEmailVerification(created).catch(() => {});

      // Profil vendeur créé systématiquement
      const token = await created.getIdToken();
      const res = await fetch('/api/market/seller-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: name,
          status: sellerStatus,
          phone: phone || undefined,
          address: {
            street: street || undefined,
            city: cityOnly,
            postal_code: postalCode || undefined,
          },
        }),
      });
      if (!res.ok) toast.error('Profil vendeur à compléter depuis votre espace.');

      toast.success('Bienvenue sur LeOui Market ! Un email de vérification vous a été envoyé.');
      router.push(nextUrl);
    } catch (err: any) {
      redirected.current = false;
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('Cet email est déjà utilisé. Connectez-vous plutôt.');
      else if (code === 'auth/weak-password') setError('Mot de passe trop faible.');
      else setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setSocialLoading(true);
    setError('');
    try {
      redirected.current = true;
      const { isNew } = await signInWithGoogle(nextUrl);
      toast.success(isNew ? 'Compte créé avec succès !' : 'Connexion réussie !');
    } catch (err: any) {
      redirected.current = false;
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError('Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setSocialLoading(false);
    }
  };

  const nextQuery = nextUrl !== '/app/market' ? `?next=${encodeURIComponent(nextUrl)}` : '';

  return (
    <>
      <MarketAuthShell
        eyebrow="Espace Market"
        title="Créez votre espace"
        subtitle="Achetez et vendez entre particuliers. Aucune information de mariage demandée."
      >
        {error && <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 mb-5">{error}</div>}

        <LeOuiNetEntryCard />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Field label="Prénom et nom" required>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sophie Martin"
                className={`${inputCls} pl-10`}
              />
            </div>
          </Field>

          <Field label="Adresse email" required>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className={`${inputCls} pl-10`}
              />
            </div>
          </Field>

          <Field label="Mot de passe" required hint="8 caractères minimum">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {/* Profil vendeur — toujours affiché */}
          <div className="space-y-4 pt-1">
            <p className="label-xs text-charcoal-600">Votre profil vendeur</p>

            <div className="grid grid-cols-2 gap-2">
              {(['particulier', 'professionnel'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSellerStatus(s)}
                  className={`text-left p-3 border text-sm transition-colors ${
                    sellerStatus === s
                      ? 'border-rose-600 bg-white text-charcoal-900'
                      : 'border-charcoal-200 bg-white text-charcoal-500 hover:border-charcoal-400'
                  }`}
                >
                  <span className="block font-semibold capitalize">{s}</span>
                  <span className="block text-[11px] text-charcoal-500 mt-0.5">
                    {s === 'particulier' ? 'Anciens mariés, particulier' : 'Boutique, loueur, créateur'}
                  </span>
                </button>
              ))}
            </div>

            <Field label="Rue et numéro" hint="Remplit automatiquement la ville — jamais affichée publiquement">
              <AddressAutocompleteInput
                value={street}
                onChange={setStreet}
                onSelectAddress={(a: AddressSuggestion) => {
                  setStreet(a.street);
                  if (a.city) setCity(a.city);
                  if (a.postcode) setPostalCode(a.postcode);
                }}
                placeholder="12 rue des Lilas"
                inputClassName={`${inputCls} pl-10`}
              />
            </Field>

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
                inputClassName="px-4 py-3 border-charcoal-200 bg-white"
              />
            </Field>

            <Field label="Téléphone" hint="Facultatif — jamais affiché publiquement">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className={inputCls}
              />
            </Field>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-rose-600" />
            <span className="text-xs text-charcoal-500 leading-relaxed">
              J'accepte les{' '}
              <Link href="/terms" className="underline hover:text-charcoal-800">conditions d'utilisation</Link> et la{' '}
              <Link href="/privacy" className="underline hover:text-charcoal-800">politique de confidentialité</Link>.
            </span>
          </label>

          <button type="submit" disabled={loading} className={`${primaryBtn} w-full h-12`}>
            {loading ? 'Création…' : (<>Créer mon espace <ArrowRight className="w-4 h-4" /></>)}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-charcoal-100" />
          <span className="text-xs text-charcoal-400 uppercase tracking-wider">ou</span>
          <span className="flex-1 h-px bg-charcoal-100" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={socialLoading}
            className="w-full h-12 flex items-center justify-center gap-3 border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-sm font-medium text-charcoal-700 disabled:opacity-60"
          >
            <Chrome className="w-4 h-4" /> Continuer avec Google
          </button>


        </div>

        <p className="text-center text-sm text-charcoal-500 mt-8">
          Déjà un espace Market ?{' '}
          <Link href={`/market/connexion${nextQuery}`} className="text-rose-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </MarketAuthShell>
    </>
  );
}
