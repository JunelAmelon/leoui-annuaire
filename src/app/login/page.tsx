'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Eye, EyeOff, ArrowRight, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  const handleGoogle = async () => {
    setSocialLoading(true);
    setError('');
    try {
      const { isNew } = await signInWithGoogle();
      if (isNew) toast.success('Compte créé avec succès ! Bienvenue sur LeOui 🎉');
      else toast.success('Connexion réussie !');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/account-exists-with-different-credential') {
        setError('Un compte existe déjà avec cet email. Connectez-vous par email/mot de passe.');
      } else {
        setError('Erreur lors de la connexion. Veuillez réessayer.');
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
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

  return (
    <div className="min-h-screen flex bg-ivory-50">

      {/* LEFT — editorial photo panel */}
      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden flex-shrink-0">
        <img
          src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Mariage"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 overlay-full" />

        {/* Content layer */}
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <div className="w-7 h-7 border border-white/50 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-serif text-[1.3rem] tracking-wide text-white">LeOui</span>
          </Link>

          {/* Quote */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-champagne-400/60" />
              <span className="label-xs text-white/40 tracking-[0.14em]">Témoignage</span>
            </div>
            <blockquote
              className="font-serif text-white mb-7 leading-snug"
              style={{ fontSize: 'clamp(1.25rem, 2.2vw, 1.625rem)', fontWeight: 300, fontStyle: 'italic', maxWidth: '28ch' }}
            >
              « LeOui a transformé l'organisation de notre mariage. Chaque prestataire était exceptionnel. »
            </blockquote>
            <div className="flex items-center gap-3">
              <img
                src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120"
                alt="Sophie"
                className="w-10 h-10 object-cover border border-white/20"
                style={{ borderRadius: 0 }}
              />
              <div>
                <p className="text-white text-sm font-medium font-sans">Sophie & Thomas</p>
                <p className="text-white/50 text-xs font-sans font-light mt-0.5">Mariés en juin 2025, Paris</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-12 bg-white overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-12 flex items-center gap-2.5">
          <div className="w-6 h-6 border border-rose-600 flex items-center justify-center">
            <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
          </div>
          <span className="font-serif text-lg tracking-wide text-charcoal-900">LeOui</span>
        </div>

        <div className="max-w-[22rem] w-full mx-auto">

          {/* Heading */}
          <p className="label-xs text-champagne-600 mb-4 tracking-[0.12em]">— Connexion</p>
          <h1
            className="font-serif text-charcoal-900 mb-2"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 300, lineHeight: 1.08, letterSpacing: '-0.02em' }}
          >
            Bon retour
          </h1>
          <p className="text-charcoal-500 text-sm font-light leading-relaxed mb-10">
            Continuez la planification de votre mariage.
          </p>

          {/* Error */}
          {error && (
            <div className="border-l-2 border-rose-600 pl-4 py-2 bg-rose-50 text-sm text-rose-800 mb-8 font-sans font-light">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="label-xs text-charcoal-500 block mb-2.5 tracking-[0.1em]">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field text-sm"
                placeholder="sophie@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="label-xs text-charcoal-500 tracking-[0.1em]">Mot de passe</label>
                <Link
                  href="/forgot-password"
                  className="text-[0.7rem] font-medium text-charcoal-400 hover:text-charcoal-700 transition-colors tracking-wide"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pr-10 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                className="w-3.5 h-3.5 border border-charcoal-300 accent-rose-600"
              />
              <label htmlFor="remember" className="text-xs text-charcoal-500 font-light">Se souvenir de moi</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 justify-center disabled:opacity-50"
            >
              {loading ? 'Connexion…' : (<>Se connecter <ArrowRight className="w-3.5 h-3.5" /></>)}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-charcoal-100" />
            <span className="label-xs text-charcoal-300 tracking-[0.1em]">ou</span>
            <div className="flex-1 h-px bg-charcoal-100" />
          </div>

          {/* Social */}
          <div className="mb-10">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={socialLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-xs font-medium text-charcoal-700 tracking-wide disabled:opacity-60"
            >
              {socialLoading ? <span className="w-4 h-4 border-2 border-charcoal-300 border-t-charcoal-700 rounded-full animate-spin" /> : (
                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continuer avec Google
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-xs text-charcoal-500 font-light">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-rose-600 font-medium hover:text-rose-700 transition-colors">
              S'inscrire gratuitement
            </Link>
          </p>

          {/* Vendor CTA */}
          <div className="mt-8 pt-8 border-t border-charcoal-100 flex items-center gap-4">
            <div className="w-8 h-8 border border-champagne-300 flex items-center justify-center flex-shrink-0">
              <Store className="w-3.5 h-3.5 text-champagne-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-charcoal-900">Vous êtes un prestataire ?</p>
              <p className="text-[0.7rem] text-charcoal-400 font-light mt-0.5">Accédez à votre espace professionnel</p>
            </div>
            <Link
              href="/vendors/join"
              className="text-[0.7rem] font-medium text-champagne-700 hover:text-champagne-800 transition-colors whitespace-nowrap tracking-wide"
            >
              Portail pro →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
