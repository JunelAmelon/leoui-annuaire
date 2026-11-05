'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import MarketAuthShell from '@/components/market/MarketAuthShell';
import LeOuiNetEntryCard from '@/components/market/LeOuiNetEntryCard';
import { inputCls, primaryBtn } from '@/components/market/ui';
import { toast } from 'sonner';

const safeNext = (n: string | null | undefined) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/app/market');

export default function MarketLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeNext(searchParams?.get('next'));
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setError('');
    setLoading(true);
    try {
      redirected.current = true;
      await signIn(email, password, nextUrl);
    } catch (err: any) {
      redirected.current = false;
      const code = err?.code || '';
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        setError('Email ou mot de passe incorrect.');
      } else if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
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
      setError(
        code === 'auth/account-exists-with-different-credential'
          ? 'Un compte existe déjà avec cet email. Connectez-vous par email et mot de passe.'
          : 'Erreur lors de la connexion. Veuillez réessayer.'
      );
    } finally {
      setSocialLoading(false);
    }
  };

  const nextQuery = nextUrl !== '/app/market' ? `?next=${encodeURIComponent(nextUrl)}` : '';

  return (
    <>
      <MarketAuthShell
      eyebrow="Espace Market"
      title="Connexion"
      subtitle="Retrouvez vos achats, vos ventes et vos annonces."
    >
      {error && <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 mb-5">{error}</div>}

      <LeOuiNetEntryCard />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="label-xs text-charcoal-600 mb-2 block">Adresse email</span>
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
        </label>

        <label className="block">
          <span className="flex items-center justify-between mb-2">
            <span className="label-xs text-charcoal-600">Mot de passe</span>
            <Link href="/forgot-password" className="text-xs text-charcoal-400 hover:text-charcoal-800 transition-colors">
              Oublié ?
            </Link>
          </span>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
        </label>

        <button type="submit" disabled={loading} className={`${primaryBtn} w-full h-12`}>
          {loading ? 'Connexion…' : (<>Se connecter <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <span className="flex-1 h-px bg-charcoal-100" />
        <span className="text-xs text-charcoal-400 uppercase tracking-wider">ou</span>
        <span className="flex-1 h-px bg-charcoal-100" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={socialLoading}
        className="w-full h-12 flex items-center justify-center gap-3 border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-sm font-medium text-charcoal-700 disabled:opacity-60"
      >
        <Chrome className="w-4 h-4" /> Continuer avec Google
      </button>

      <p className="text-center text-sm text-charcoal-500 mt-8">
        Nouveau sur LeOui Market ?{' '}
        <Link href={`/market/inscription${nextQuery}`} className="text-rose-600 font-semibold hover:underline">
          Créer mon espace
        </Link>
      </p>

    </MarketAuthShell>
    </>
  );
}
