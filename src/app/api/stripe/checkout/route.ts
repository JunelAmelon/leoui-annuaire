import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import { syncVendorSubscriptionFromStripe } from '@/lib/stripe-sync';
import { 
  getActiveSubscription, 
  resolveSubscriptionConflict,
  cleanupActiveSubscriptions 
} from '@/lib/subscription-manager';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ ok: false, error: 'STRIPE_SECRET_KEY manquant côté serveur' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { planId } = await req.json();
    const configuredPriceOrProductId = STRIPE_PRICE_IDS[planId as Exclude<SubscriptionTier, 'free'>];
    const priceId = await resolveStripePriceId(configuredPriceOrProductId);
    if (!priceId) return NextResponse.json({ ok: false, error: 'Plan invalide ou prix non configuré' }, { status: 400 });

    // 🔄 VÉRIFICATION ANTI-DOUBLE ABONNEMENT
    const activeSub = await getActiveSubscription(uid);
    let conflictResult = null;
    
    if (activeSub && activeSub.provider === 'paypal') {
      // Annuler PayPal et continuer avec Stripe
      conflictResult = await resolveSubscriptionConflict(uid, 'stripe', true);
      console.log('[stripe/checkout] Conflit résolu:', conflictResult.message);
    }

    const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
    const vendor = vendorSnap.data() as any;
    if (!vendor) return NextResponse.json({ ok: false, error: 'Prestataire introuvable' }, { status: 404 });
    
    // Marquer dans le vendor qu'un switch de provider a eu lieu
    if (conflictResult?.previousSubscription) {
      await adminDb.collection('vendors').doc(uid).set({
        previousProvider: conflictResult.previousSubscription.provider,
        providerSwitchedAt: new Date(),
      }, { merge: true });
    }

    let stripeCustomerId: string = vendor.stripeCustomerId || '';
    let shouldCreateCustomer = !stripeCustomerId;

    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch {
        // Cas fréquent après purge Stripe/test-live mismatch: on recrée un customer propre.
        shouldCreateCustomer = true;
      }
    }

    if (shouldCreateCustomer) {
      const customer = await stripe.customers.create({
        email: decoded.email || vendor.email || '',
        name: vendor.name || decoded.name || '',
        metadata: { uid, vendorId: uid },
      });
      stripeCustomerId = customer.id;
      await adminDb.collection('vendors').doc(uid).set(
        {
          stripeCustomerId,
          stripeSubscriptionId: null,
        },
        { merge: true }
      );
    }

    const existingSubId: string = vendor.stripeSubscriptionId || '';
    if (existingSubId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(existingSubId);
        if (existingSub.status === 'active' || existingSub.status === 'trialing') {
          const currentItem = existingSub.items.data[0];
          const currentPriceId = currentItem?.price?.id || '';
          if (currentPriceId && currentPriceId !== priceId) {
            // 1. Mettre à jour l'abonnement avec prorata
            const updatedSub = await stripe.subscriptions.update(existingSubId, {
              items: [{ id: currentItem.id, price: priceId }],
              proration_behavior: 'create_prorations',
              metadata: { ...(existingSub.metadata || {}), uid, vendorId: uid, planId: String(planId) },
            });
            
            // 2. Récupérer la prochaine invoice pour voir le montant du prorata
            const upcomingInvoice = await (stripe as any).invoices.retrieveUpcoming({
              customer: stripeCustomerId,
              subscription: existingSubId,
            });
            
            // 3. S'il y a un montant à payer maintenant (prorata), créer un checkout
            const amountDue = upcomingInvoice.amount_due;
            if (amountDue > 0) {
              // Créer un paiement immédiat pour le prorata
              const paymentSession = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                mode: 'payment',
                line_items: [{
                  price_data: {
                    currency: 'eur',
                    product_data: {
                      name: `Changement de plan - ${planId}`,
                      description: 'Ajustement proratisé jusqu\'à la prochaine période',
                    },
                    unit_amount: amountDue,
                  },
                  quantity: 1,
                }],
                success_url: `${APP_URL}/espace-prestataire/abonnement?success=true&upgrade=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${APP_URL}/espace-prestataire/abonnement?canceled=true`,
                metadata: { uid, vendorId: uid, planId, type: 'prorata_upgrade' },
              });
              
              // Mettre à jour le vendor avec le nouveau plan
              await syncVendorSubscriptionFromStripe({
                uid,
                subscription: updatedSub,
                stripeCustomerId,
                sessionMetadata: { planId: String(planId), uid },
              });
              
              return NextResponse.json({ ok: true, url: paymentSession.url, requiresPayment: true });
            }
            
            // Pas de prorata à payer, juste mettre à jour
            const sync = await syncVendorSubscriptionFromStripe({
              uid,
              subscription: updatedSub,
              stripeCustomerId,
              sessionMetadata: { planId: String(planId), uid },
            });
            return NextResponse.json({
              ok: true,
              changed: true,
              tier: sync.tier,
              status: sync.status,
            });
          }
          const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${APP_URL}/espace-prestataire/abonnement`,
          });
          return NextResponse.json({ ok: true, url: session.url, portal: true });
        }
      } catch { /* sub may no longer exist */ }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/espace-prestataire/abonnement?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/espace-prestataire/abonnement?canceled=true`,
      subscription_data: {
        metadata: { uid, vendorId: uid, planId },
      },
      metadata: { uid, vendorId: uid, planId },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error('[stripe/checkout]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

async function resolveStripePriceId(configuredValue: string): Promise<string> {
  if (!configuredValue) return '';
  if (configuredValue.startsWith('price_')) {
    const price = await stripe.prices.retrieve(configuredValue);
    if (!price?.active || price.type !== 'recurring' || price.recurring?.interval !== 'month') return '';
    return configuredValue;
  }
  if (!configuredValue.startsWith('prod_')) return '';

  const prices = await stripe.prices.list({
    product: configuredValue,
    active: true,
    recurring: { interval: 'month' },
    limit: 1,
  });
  return prices.data[0]?.id || '';
}
