'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { PAID_PLANS, TIER_BADGE } from '@/lib/subscription-plans';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import {
  Check, Crown, Loader2, Zap, AlertCircle, CheckCircle2, ExternalLink, RefreshCw,
} from 'lucide-react';

export default function AbonnementPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [vendor, setVendor] = useState<any>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadVendor = async () => {
    if (!user?.uid) return;
    try {
      const doc = await getDocument('vendors', user.uid);
      setVendor(doc);
    } catch { /* ignore */ }
    finally { setLoadingVendor(false); }
  };

  useEffect(() => { loadVendor(); }, [user?.uid]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      showToast('success', 'Paiement confirmé ! Votre abonnement est maintenant actif. Bienvenue 🎉');
      setTimeout(() => loadVendor(), 3000);
    } else if (searchParams.get('canceled') === 'true') {
      showToast('error', 'Paiement annulé. Vous pouvez réessayer à tout moment.');
    }
  }, []);

  const getToken = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('Non connecté');
    return current.getIdToken();
  };

  const handleSubscribe = async (planId: SubscriptionTier) => {
    setCheckoutLoading(planId);
    try {
      const token = await getToken();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de la création du paiement');
      window.location.href = data.url;
    } catch (e: any) {
      showToast('error', e.message || 'Une erreur est survenue');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur portail');
      window.location.href = data.url;
    } catch (e: any) {
      showToast('error', e.message || 'Une erreur est survenue');
      setPortalLoading(false);
    }
  };

  const currentTier: SubscriptionTier = vendor?.subscriptionTier || 'free';
  const subStatus: string = vendor?.subscriptionStatus || 'inactive';
  const isActive = subStatus === 'active';
  const isPastDue = subStatus === 'past_due';
  const periodEnd: string = vendor?.subscriptionCurrentPeriodEnd || '';
  const badge = TIER_BADGE[currentTier];

  return (
    <PrestataireDashboardLayout>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium max-w-sm ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
          Mon abonnement
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">
          Choisissez le plan adapté à vos ambitions et boostez votre visibilité.
        </p>
      </div>

      {/* Current plan banner */}
      {!loadingVendor && (
        <div className={`mb-8 rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          currentTier === 'free'
            ? 'bg-stone-50 border-stone-200'
            : isPastDue
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              currentTier === 'elite' ? 'bg-amber-100' : currentTier === 'pro' ? 'bg-blue-100' : currentTier === 'starter' ? 'bg-stone-100' : 'bg-stone-100'
            }`}>
              <Crown className={`w-5 h-5 ${
                currentTier === 'elite' ? 'text-amber-600' : currentTier === 'pro' ? 'text-blue-600' : 'text-stone-500'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-charcoal-900 text-sm">
                Plan actuel : <span className="capitalize">{currentTier === 'free' ? 'Gratuit' : currentTier}</span>
                {badge && <span className={`ml-2 px-2 py-0.5 text-xs rounded-full border ${badge.classes}`}>{badge.label}</span>}
              </p>
              {currentTier !== 'free' && periodEnd && (
                <p className="text-xs text-charcoal-500 mt-0.5">
                  {isPastDue
                    ? '⚠️ Paiement en échec — votre visibilité est réduite'
                    : `Renouvellement le ${new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
              )}
              {currentTier === 'free' && (
                <p className="text-xs text-charcoal-500 mt-0.5">Vous êtes sur le plan gratuit — votre visibilité est limitée.</p>
              )}
            </div>
          </div>
          {currentTier !== 'free' && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2.5 border border-charcoal-200 bg-white hover:bg-stone-50 text-charcoal-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Gérer mon abonnement
            </button>
          )}
        </div>
      )}

      {/* Plans grid */}
      {loadingVendor ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 text-rose-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {PAID_PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id && isActive;
            const isPopular = plan.popular;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 shadow-sm flex flex-col transition-all ${
                  isPopular ? 'border-blue-500 shadow-blue-100' : isCurrent ? 'border-green-400' : plan.accentClass
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full tracking-wide shadow">
                    ⭐ Le plus populaire
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow">
                    ✓ Plan actuel
                  </div>
                )}

                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-serif text-charcoal-900 text-xl font-medium">{plan.name}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${plan.badgeClasses}`}>
                      {plan.badgeLabel}
                    </span>
                  </div>
                  <p className="text-charcoal-500 text-xs mb-4">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="font-serif text-charcoal-900 text-4xl font-light">{plan.price}€</span>
                    <span className="text-charcoal-400 text-sm">/mois</span>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal-700">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  {isCurrent ? (
                    <button
                      onClick={handlePortal}
                      disabled={portalLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-charcoal-200 bg-stone-50 hover:bg-stone-100 text-charcoal-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Gérer / Annuler
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={!!checkoutLoading}
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${
                        isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : plan.id === 'elite'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-charcoal-900 hover:bg-charcoal-800 text-white'
                      }`}
                    >
                      {checkoutLoading === plan.id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                        : <><Zap className="w-4 h-4" /> {currentTier !== 'free' && !isCurrent ? 'Changer de plan' : 'Commencer maintenant'}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ / reassurance */}
      <div className="bg-white rounded-2xl border border-charcoal-100 p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
        {[
          { icon: '🔒', title: 'Paiement sécurisé', desc: 'Stripe gère votre paiement. Vos données bancaires ne nous sont jamais transmises.' },
          { icon: '🔄', title: 'Sans engagement', desc: 'Résiliez à tout moment depuis votre portail Stripe, sans frais ni pénalités.' },
          { icon: '⚡', title: 'Activation immédiate', desc: 'Votre plan est activé dès la confirmation du paiement. Visibilité boostée instantanément.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex gap-3">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-charcoal-900 mb-1">{title}</p>
              <p className="text-charcoal-500 text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </PrestataireDashboardLayout>
  );
}
