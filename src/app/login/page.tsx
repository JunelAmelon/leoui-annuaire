'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Heart, Store, Chrome } from 'lucide-react';
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
      if (isNew) toast.success('Compte créé avec succès ! Bienvenue sur LeOui.net 🎉');
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
    <div className="min-h-screen flex bg-white">

      {/* LEFT — editorial photo panel */}
      <div className="hidden lg:block lg:w-[48%] relative overflow-hidden flex-shrink-0">
        <img
          src="https://images.pexels.com/photos/32795181/pexels-photo-32795181.jpeg"
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
            <span className="font-serif text-[1.3rem] tracking-wide text-white">LeOui.net</span>
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
              « LeOui.net a transformé l'organisation de notre mariage. Chaque prestataire était exceptionnel. »
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
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10 bg-white overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-50 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-200" />
          </div>
          <span className="font-display text-xl text-charcoal-900">LeOui.net</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h1 className="font-display text-[2rem] leading-tight text-charcoal-900 mb-2">
            Bon retour
          </h1>
          <p className="text-charcoal-500 text-sm mb-7">
            Continuez la planification de votre mariage.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-3 border border-charcoal-200 text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-charcoal-700">Mot de passe</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-charcoal-400 hover:text-charcoal-700 transition-colors"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 py-3 border border-charcoal-200 text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 border-charcoal-300 accent-rose-600 flex-shrink-0"
              />
              <label htmlFor="remember" className="text-xs text-charcoal-500 leading-relaxed">Se souvenir de moi</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Connexion…' : (<>Se connecter <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-charcoal-100" />
            <span className="text-xs text-charcoal-400 uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-charcoal-100" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={socialLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-sm font-medium text-charcoal-700 disabled:opacity-60"
          >
            {socialLoading ? <span className="w-4 h-4 border-2 border-charcoal-300 border-t-charcoal-700 rounded-full animate-spin" /> : (
              <Chrome className="w-4 h-4" />
            )}
            Continuer avec Google
          </button>

          <p className="text-center text-sm text-charcoal-500 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-rose-600 font-semibold hover:underline">S'inscrire gratuitement</Link>
          </p>

          {/* Vendor portal CTA */}
          <div className="mt-6 p-4 bg-charcoal-50 border border-charcoal-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-champagne-100 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-champagne-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-charcoal-900">Vous êtes un prestataire ?</p>
              <p className="text-xs text-charcoal-500">Accédez à votre espace professionnel</p>
            </div>
            <Link
              href="/vendors/join"
              className="text-xs font-semibold text-champagne-700 hover:underline whitespace-nowrap"
            >
              Portail pro →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
