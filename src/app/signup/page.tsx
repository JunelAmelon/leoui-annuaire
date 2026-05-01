'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, Store, Calendar, Chrome, Search, ClipboardList, MessageSquare, BarChart3 } from 'lucide-react';
import { signUp } from '@/lib/auth-helpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [partner, setPartner] = useState('');
  const [email, setEmail] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [stats, setStats] = useState<{ vendorsCount: number; weddingsCount: number } | null>(null);
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    fetch('/api/public/stats')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        setStats({
          vendorsCount: Number(json.vendorsCount || 0),
          weddingsCount: Number(json.weddingsCount || 0),
        });
      })
      .catch(() => setStats(null));
  }, []);

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
        setError('Un compte existe déjà avec cet email. Essayez de vous connecter.');
      } else {
        setError('Erreur lors de la connexion. Veuillez réessayer.');
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms) { setError('Vous devez accepter les conditions d\'utilisation.'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setError('');
    setLoading(true);
    try {
      await signUp({ email, password, name, partner, role: 'client' });
      router.push('/espace-client');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('Cet email est déjà utilisé.');
      else if (code === 'auth/weak-password') setError('Mot de passe trop faible.');
      else setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Search, text: `Accès à ${stats ? stats.vendorsCount.toLocaleString('fr-FR') : '—'} prestataires` },
    { icon: ClipboardList, text: 'Outils de planification intégrés' },
    { icon: Heart, text: 'Liste de favoris et comparaison' },
    { icon: MessageSquare, text: 'Messagerie directe avec les prestataires' },
    { icon: BarChart3, text: 'Tableau de bord de suivi de projet' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* LEFT — photo + benefits panel */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col">
        <img
          src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Mariage de rêve"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,5,20,0.5) 0%, rgba(10,5,20,0.75) 60%, rgba(10,5,20,0.92) 100%)' }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/15">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display text-2xl text-white">LeOui.net</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Benefits */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="h-px w-8 bg-rose-400" />
              <span className="text-rose-400 text-sm font-medium uppercase tracking-widest">Pourquoi LeOui.net ?</span>
            </div>
            <h2 className="font-display text-3xl text-white leading-snug mb-7">
              Tout ce qu'il vous faut<br />
              <span className="italic text-champagne-300">en un seul endroit</span>
            </h2>
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-3.5">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                    <b.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/85 text-sm">{b.text}</span>
                </li>
              ))}
            </ul>

            {/* Social proof */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[
                  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=60',
                  'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=60',
                  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=60',
                ].map((src, i) => (
                  <img key={i} src={src} className="w-8 h-8 rounded-full border-2 border-white/20 object-cover" alt="" />
                ))}
              </div>
              <p className="text-white/70 text-sm">
                <span className="text-white font-medium">{stats ? stats.weddingsCount.toLocaleString('fr-FR') : '—'}</span> couples nous font déjà confiance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10 bg-white overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-200" />
          </div>
          <span className="font-display text-xl text-charcoal-900">LeOui.net</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h1 className="font-display text-[2rem] leading-tight text-charcoal-900 mb-2">
            Créez votre compte
          </h1>
          <p className="text-charcoal-500 text-sm mb-7">
            Rejoignez des milliers de couples qui planifient leur mariage de rêve.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Names row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Votre prénom</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="text"
                    placeholder="Sophie"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Prénom partenaire</label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="text"
                    placeholder="Thomas"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Date de mariage prévue</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all text-charcoal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-charcoal-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Au moins 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-11 py-3 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
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

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-charcoal-300 accent-rose-600 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-xs text-charcoal-500 leading-relaxed">
                J'accepte les{' '}
                <Link href="/terms" className="text-rose-600 hover:underline">conditions d'utilisation</Link>{' '}
                et la{' '}
                <Link href="/privacy" className="text-rose-600 hover:underline">politique de confidentialité</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Création du compte...' : (<>Créer mon compte gratuit <ArrowRight className="w-4 h-4" /></>)}
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
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-charcoal-200 rounded-xl hover:bg-charcoal-50 transition-colors text-sm font-medium text-charcoal-700 disabled:opacity-60"
          >
            {socialLoading ? <span className="w-4 h-4 border-2 border-charcoal-300 border-t-charcoal-700 rounded-full animate-spin" /> : (
              <Chrome className="w-4 h-4" />
            )}
            Continuer avec Google
          </button>

          <p className="text-center text-sm text-charcoal-500 mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-rose-600 font-semibold hover:underline">Se connecter</Link>
          </p>

          {/* Vendor portal CTA */}
          <div className="mt-6 p-4 bg-charcoal-50 rounded-2xl border border-charcoal-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-champagne-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-champagne-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-charcoal-900">Vous êtes un prestataire ?</p>
              <p className="text-xs text-charcoal-500">Créez votre espace pro gratuitement</p>
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
