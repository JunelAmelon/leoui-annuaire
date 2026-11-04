'use client';

/**
 * Modal « Connexion via LeOui.net »
 * Layout : image à gauche (style MarketAuthShell) + formulaire à droite.
 * Flux en deux étapes : e-mail → mot de passe (style Google).
 * Utilise createPortal pour s'ancrer au viewport indépendamment du DOM parent.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, Mail, Lock, Heart, X, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  /** Mode initial — seul 'login' est utilisé désormais. */
  mode?: 'login';
  onClose: () => void;
}

export default function LeOuiNetModal({ onClose }: Props) {
  // Étape 1 : e-mail  |  Étape 2 : mot de passe
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mounted = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    document.body.style.overflow = 'hidden';
    // Focus initial
    setTimeout(() => emailRef.current?.focus(), 80);
    return () => {
      mounted.current = false;
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (step === 2) setTimeout(() => pwdRef.current?.focus(), 80);
  }, [step]);

  // Étape 1 : valider l'e-mail et passer à l'étape 2
  const handleEmailStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setError('Adresse email invalide.');
    }
    setEmail(trimmed);
    setStep(2);
  };

  // Étape 2 : authentification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged du parent prend le relais → redirect automatique.
    } catch (err: any) {
      if (!mounted.current) return;
      const code = err?.code || '';
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        if (code === 'auth/user-not-found') {
          setStep(1);
          setError('Aucun compte LeOui.net avec cette adresse email.');
        } else {
          setError('Mot de passe incorrect. Réessayez ou réinitialisez-le.');
        }
      } else if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez patienter puis réessayer.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
      setLoading(false);
    }
  };

  if (typeof window === 'undefined') return null;

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-charcoal-950/45 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white w-full max-w-2xl shadow-soft-xl flex overflow-hidden"
           style={{ maxHeight: '90vh' }}>

        {/* ── Panneau image (gauche) ── */}
        <aside className="hidden sm:block sm:w-[44%] flex-shrink-0 relative bg-charcoal-900 overflow-hidden">
          <img
            src="/mariage%20(4).jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '52% center' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
          <div className="relative z-10 h-full flex flex-col justify-between p-8 text-white">
            {/* Logo */}
            <div className="flex items-center gap-2 w-fit">
              <div className="w-6 h-6 border border-white/60 flex items-center justify-center">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>
              <span className="font-serif text-base tracking-wide">LeOui.net</span>
            </div>
            {/* Baseline */}
            <div>
              <p className="text-[10px] font-medium tracking-[0.18em] uppercase text-white/60 mb-3">Espace couple</p>
              <p className="font-serif leading-snug text-white/95" style={{ fontSize: 'clamp(1.25rem, 2.2vw, 1.6rem)', fontWeight: 400 }}>
                Organisez votre mariage.<br />
                <em className="italic text-champagne-200">Avec sérénité.</em>
              </p>
            </div>
          </div>
        </aside>

        {/* ── Panneau formulaire (droite) ── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-charcoal-100">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600 mb-1">Connexion via LeOui.net</p>
              <h2 className="font-serif text-xl text-charcoal-900 leading-tight">
                {step === 1 ? 'Votre adresse email' : 'Votre mot de passe'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-800 transition-colors flex-shrink-0 ml-4"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Corps */}
          <div className="px-7 py-7 flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 mb-5 leading-snug">
                {error}
              </div>
            )}

            {/* ── Étape 1 : e-mail ── */}
            {step === 1 && (
              <form onSubmit={handleEmailStep} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal-500 mb-2">
                    Adresse email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 pl-10 border border-charcoal-200 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-rose-400 bg-white transition-colors"
                    />
                  </div>
                  <p className="text-xs text-charcoal-400 mt-1.5">
                    L'adresse utilisée pour votre compte LeOui.net.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold tracking-[0.04em] flex items-center justify-center gap-2 transition-colors"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-xs text-charcoal-400 text-center leading-relaxed">
                  Pas encore de compte LeOui.net ?{' '}
                  <Link href="/signup" className="text-rose-600 font-semibold hover:underline" onClick={onClose}>
                    Créer un espace couple
                  </Link>
                </p>
              </form>
            )}

            {/* ── Étape 2 : mot de passe ── */}
            {step === 2 && (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* E-mail affiché en lecture seule */}
                <div className="flex items-center gap-3 p-3 bg-ivory-50 border border-charcoal-100">
                  <Mail className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                  <span className="text-sm text-charcoal-700 flex-1 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); setPassword(''); }}
                    className="text-xs text-charcoal-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                    aria-label="Changer d'email"
                  >
                    <ArrowLeft className="w-3 h-3" /> Modifier
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal-500">
                      Mot de passe <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] text-charcoal-400 hover:text-charcoal-800 transition-colors"
                      onClick={onClose}
                    >
                      Oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                    <input
                      ref={pwdRef}
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pl-10 pr-11 border border-charcoal-200 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-rose-400 bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700"
                      aria-label={showPwd ? 'Masquer' : 'Afficher'}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold tracking-[0.04em] flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? 'Connexion…' : (<>Se connecter <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-7 py-4 border-t border-charcoal-100 text-center">
            <p className="text-[11px] text-charcoal-400">
              En continuant, vous acceptez les{' '}
              <Link href="/terms" className="underline hover:text-charcoal-700" onClick={onClose}>conditions</Link>
              {' '}et la{' '}
              <Link href="/privacy" className="underline hover:text-charcoal-700" onClick={onClose}>confidentialité</Link>
              {' '}de LeOui.net.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
