'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument } from '@/lib/db';
import { auth, db } from '@/lib/firebase';
import { PAID_PLANS, TIER_BADGE } from '@/lib/subscription-plans';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import {
  Check, Crown, Loader2, Zap, AlertCircle, CheckCircle2, ExternalLink, RefreshCw,
  Lock, RotateCcw, Bolt, Star, CreditCard,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AbonnementPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [vendor, setVendor] = useState<any>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paypal'>('stripe');
  const [showUpgradePulse, setShowUpgradePulse] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

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

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'vendors', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setVendor({ id: snap.id, ...(snap.data() as any) });
      } else {
        setVendor(null);
      }
      setLoadingVendor(false);
    }, () => setLoadingVendor(false));
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !vendor || reconcileLoading) return;
    const maybeNeedsReconcile = (vendor.subscriptionTier === 'free' || !vendor.subscriptionTier)
      && !!vendor.stripeCustomerId;
    if (!maybeNeedsReconcile) return;
    setReconcileLoading(true);
    getToken()
      .then((token) => fetch('/api/stripe/reconcile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }))
      .finally(() => setReconcileLoading(false));
  }, [user?.uid, vendor?.subscriptionTier, vendor?.stripeCustomerId]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const provider = searchParams.get('provider');
      if (provider === 'paypal') {
        showToast('success', 'Validation PayPal reçue. Activation en cours (quelques secondes via webhook).');
      } else {
        showToast('success', 'Paiement confirmé ! Votre abonnement est maintenant actif. Bienvenue 🎉');
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
          getToken()
            .then((token) => fetch('/api/stripe/sync-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ sessionId }),
            }))
            .catch(() => null);
        }
      }
      setTimeout(() => loadVendor(), 3000);
      setShowUpgradePulse(true);
      setTimeout(() => setShowUpgradePulse(false), 8000);
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
      const endpoint = paymentProvider === 'paypal' ? '/api/paypal/checkout' : '/api/stripe/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de la création du paiement');
      if (data.changed) {
        showToast('success', 'Formule mise à niveau avec succès. Vos droits premium sont actifs.');
        setCheckoutLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch (e: any) {
      showToast('error', e.message || 'Une erreur est survenue');
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    if (vendor?.subscriptionProvider === 'paypal') {
      const res = await fetch('/api/paypal/manage');
      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      showToast('error', 'Impossible d’ouvrir la gestion PayPal');
      return;
    }
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

  const handleCancelAtPeriodEnd = async () => {
    if (vendor?.subscriptionProvider === 'paypal') {
      await handlePortal();
      return;
    }
    const ok = window.confirm('Confirmer la résiliation à la fin de la période en cours ?');
    if (!ok) return;
    setCancelLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Résiliation impossible');
      showToast('success', 'Résiliation programmée. Votre abonnement restera actif jusqu’à la fin du mois en cours.');
    } catch (e: any) {
      showToast('error', e.message || 'Une erreur est survenue');
    } finally {
      setCancelLoading(false);
    }
  };

  const currentTier: SubscriptionTier = vendor?.subscriptionTier || 'free';
  const subStatus: string = vendor?.subscriptionStatus || 'inactive';
  const isActive = subStatus === 'active';
  const isPastDue = subStatus === 'past_due';
  const periodEnd: string = vendor?.subscriptionCurrentPeriodEnd || '';
  const cancelAtPeriodEnd: boolean = !!vendor?.subscriptionCancelAtPeriodEnd;
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

      <div className="mb-6 bg-white border border-charcoal-100 rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-3">Moyen de paiement</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setPaymentProvider('stripe')}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
              paymentProvider === 'stripe'
                ? 'border-charcoal-900 bg-charcoal-50'
                : 'border-charcoal-200 bg-white hover:bg-stone-50'
            }`}
          >
            <p className="text-sm font-semibold text-charcoal-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Stripe (recommandé)
            </p>
            <p className="text-xs text-charcoal-500 mt-1">Carte bancaire, portail client pour annulation/changement.</p>
          </button>
          <button
            onClick={() => setPaymentProvider('paypal')}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
              paymentProvider === 'paypal'
                ? 'border-charcoal-900 bg-charcoal-50'
                : 'border-charcoal-200 bg-white hover:bg-stone-50'
            }`}
          >
            <p className="text-sm font-semibold text-charcoal-900">PayPal</p>
            <p className="text-xs text-charcoal-500 mt-1">Validation PayPal puis prélèvement mensuel automatique.</p>
          </button>
        </div>
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
                    : cancelAtPeriodEnd
                      ? `Résiliation prévue le ${new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : `Renouvellement le ${new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </p>
              )}
              {currentTier !== 'free' && vendor?.subscriptionProvider && (
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Moyen de paiement: {vendor.subscriptionProvider === 'paypal' ? 'PayPal' : 'Stripe'}
                </p>
              )}
              {currentTier === 'free' && (
                <p className="text-xs text-charcoal-500 mt-0.5">Vous êtes sur le plan gratuit — votre visibilité est limitée.</p>
              )}
            </div>
          </div>
          {currentTier !== 'free' && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handlePortal}
                disabled={portalLoading || cancelLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-charcoal-200 bg-white hover:bg-stone-50 text-charcoal-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Gérer
              </button>
              <button
                onClick={handleCancelAtPeriodEnd}
                disabled={cancelLoading || portalLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Résilier
              </button>
            </div>
          )}
        </div>
      )}

      {!loadingVendor && currentTier !== 'free' && isActive && (
        <div className={`mb-8 rounded-2xl border px-5 py-4 bg-gradient-to-r from-amber-50 via-white to-rose-50 border-amber-200 ${
          showUpgradePulse ? 'animate-pulse' : ''
        }`}>
          <p className="text-xs uppercase tracking-[0.14em] text-amber-700 font-semibold">Nouveau cap franchi</p>
          <p className="text-sm text-charcoal-800 mt-1">
            Votre formule <span className="font-semibold capitalize">{currentTier}</span> est active.
            Votre profil bénéficie maintenant d’une meilleure visibilité dans les résultats.
          </p>
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
            const headerGradient =
              plan.id === 'pro'
                ? 'from-rose-100 via-ivory-50 to-champagne-100'
                : 'from-stone-100 via-stone-50 to-ivory-50';
            const ctaClass = 'bg-charcoal-900 hover:bg-charcoal-800 text-white';
            const badgeClasses =
              plan.id === 'pro'
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : plan.id === 'elite'
                  ? 'bg-stone-100 text-stone-700 border-stone-200'
                  : plan.badgeClasses;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border shadow-soft flex flex-col overflow-hidden transition-all hover:shadow-md ${
                  isPopular ? 'border-rose-200' : isCurrent ? 'border-green-300' : 'border-charcoal-100'
                }`}
              >
                <div className={`relative p-6 pb-5 bg-gradient-to-br ${headerGradient}`}>
                  <div className="absolute inset-0 opacity-[0.28]" style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,.9), transparent 52%), radial-gradient(circle at 80% 0%, rgba(255,255,255,.7), transparent 55%)' }} />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-charcoal-900 text-xl font-medium leading-none">{plan.name}</h3>
                        {isPopular && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 border border-white/80 text-[11px] font-semibold rounded-full text-rose-700">
                            <Star className="w-3 h-3" /> Populaire
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 border border-white/80 text-[11px] font-semibold rounded-full text-green-700">
                            <Check className="w-3 h-3" /> Actuel
                          </span>
                        )}
                      </div>
                      <p className="text-charcoal-600 text-xs mt-1">{plan.tagline}</p>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold bg-white/70 ${badgeClasses}`}>
                      {plan.badgeLabel}
                    </span>
                  </div>

                  <div className="relative mt-5 flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-charcoal-900" style={{ fontSize: '2.4rem', fontWeight: 300, lineHeight: 1 }}>
                        {plan.price}€
                      </span>
                      <span className="text-charcoal-500 text-sm">/mois</span>
                    </div>
                    <span className="text-[11px] text-charcoal-500">Sans engagement</span>
                  </div>
                </div>

                <div className="p-6 pt-5 flex-1">
                  <p className="text-xs font-semibold text-charcoal-700 mb-3">Inclus</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal-700">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </span>
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
                      className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 ${ctaClass}`}
                    >
                      {checkoutLoading === plan.id
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                        : <><Zap className="w-4 h-4" /> {currentTier !== 'free' && !isCurrent ? 'Changer de plan' : `Commencer avec ${paymentProvider === 'paypal' ? 'PayPal' : 'Stripe'}`}</>}
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
          { icon: Lock, title: 'Paiement sécurisé', desc: paymentProvider === 'paypal' ? 'PayPal gère votre paiement. Vos données bancaires ne nous sont jamais transmises.' : 'Stripe gère votre paiement. Vos données bancaires ne nous sont jamais transmises.' },
          { icon: RotateCcw, title: 'Sans engagement', desc: paymentProvider === 'paypal' ? 'Résiliez depuis votre espace PayPal, sans frais ni pénalités.' : 'Résiliez à tout moment depuis votre portail Stripe, sans frais ni pénalités.' },
          { icon: Bolt, title: 'Activation immédiate', desc: 'Votre plan est activé dès la confirmation du paiement. Visibilité boostée instantanément.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-3">
            <span className="w-9 h-9 rounded-xl bg-ivory-50 border border-charcoal-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-charcoal-600" />
            </span>
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
