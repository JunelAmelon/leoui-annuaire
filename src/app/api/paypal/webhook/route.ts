import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getTierFromPaypalPlanId, verifyPaypalWebhookSignature } from '@/lib/paypal';
import { syncPayPalSubscription, cleanupActiveSubscriptions } from '@/lib/subscription-manager';
import { sendEmailServer } from '@/lib/email.server';
import { renderSubscriptionConfirmedEmail, renderSubscriptionCanceledEmail, renderPaymentFailedEmail } from '@/lib/email-template';

/** Récupère email + nom du prestataire (vendors puis profiles). */
async function getVendorContact(uid: string): Promise<{ email: string; name: string }> {
  try {
    const v = await adminDb.collection('vendors').doc(uid).get();
    const vd = v.data() as any;
    if (vd?.email) return { email: vd.email, name: vd.name || '' };
  } catch {}
  try {
    const p = await adminDb.collection('profiles').doc(uid).get();
    const pd = p.data() as any;
    if (pd?.email) return { email: pd.email, name: pd.name || '' };
  } catch {}
  return { email: '', name: '' };
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let event: any;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }

  const verified = await verifyPaypalWebhookSignature(event, req.headers);
  if (!verified) {
    return NextResponse.json({ error: 'Signature webhook PayPal invalide' }, { status: 400 });
  }

  try {
    const eventType = String(event?.event_type || '');
    const resource = event?.resource || {};
    const subscriptionId = String(resource?.id || '');
    const uid = String(resource?.custom_id || '');
    const planId = String(resource?.plan_id || '');

    if (!subscriptionId) return NextResponse.json({ received: true });

    const vendorDocId = uid || await findVendorByPaypalSubscriptionId(subscriptionId);
    if (!vendorDocId) return NextResponse.json({ received: true });

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' || eventType === 'BILLING.SUBSCRIPTION.UPDATED') {
      const tier = getTierFromPaypalPlanId(planId);
      const nextBillingTime = resource?.billing_info?.next_billing_time || null;
      
      // 🔄 SYNC VERS SUBSCRIPTIONS COLLECTION
      const subscription = await syncPayPalSubscription(vendorDocId, resource);
      if (subscription) {
        // Nettoyer les anciens abonnements Stripe
        await cleanupActiveSubscriptions(vendorDocId, subscription.id);
        
        // Annuler les abonnements Stripe actifs en base
        const stripeSubs = await adminDb
          .collection('subscriptions')
          .where('userId', '==', vendorDocId)
          .where('provider', '==', 'stripe')
          .where('status', 'in', ['active', 'pending'])
          .get();
        
        const batch = adminDb.batch();
        stripeSubs.docs.forEach(doc => {
          batch.update(doc.ref, { 
            status: 'canceled', 
            canceledAt: new Date(),
            updatedAt: new Date(),
          });
        });
        await batch.commit();
      }
      
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: nextBillingTime,
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        paypalPlanId: planId,
        pendingPaypalSubscriptionId: null,
        pendingPaypalPlanId: null,
        stripeSubscriptionId: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Email de confirmation d'abonnement
      const contact = await getVendorContact(vendorDocId);
      if (contact.email) {
        sendEmailServer({
          to: contact.email,
          subject: 'Votre abonnement LeOui.net est actif',
          html: renderSubscriptionConfirmedEmail({ name: contact.name || 'Prestataire', planName: tier, provider: 'PayPal' }),
        }).catch(() => {});
      }
    }

    if (
      eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ||
      eventType === 'BILLING.SUBSCRIPTION.SUSPENDED'
    ) {
      // 🔄 SYNC VERS SUBSCRIPTIONS COLLECTION - marquer comme canceled
      const subSnapshot = await adminDb
        .collection('subscriptions')
        .where('providerSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();
      
      if (!subSnapshot.empty) {
        await subSnapshot.docs[0].ref.update({
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        subscriptionCurrentPeriodEnd: null,
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Email de résiliation
      const contact = await getVendorContact(vendorDocId);
      if (contact.email) {
        sendEmailServer({
          to: contact.email,
          subject: 'Votre abonnement LeOui.net a été résilié',
          html: renderSubscriptionCanceledEmail({ name: contact.name || 'Prestataire' }),
        }).catch(() => {});
      }
    }

    if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      // 🔄 SYNC VERS SUBSCRIPTIONS COLLECTION - marquer comme past_due
      const subSnapshot = await adminDb
        .collection('subscriptions')
        .where('providerSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();
      
      if (!subSnapshot.empty) {
        await subSnapshot.docs[0].ref.update({
          status: 'past_due',
          updatedAt: new Date(),
        });
      }
      
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionStatus: 'past_due',
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Email d'échec de paiement
      const contact = await getVendorContact(vendorDocId);
      if (contact.email) {
        sendEmailServer({
          to: contact.email,
          subject: 'Un paiement LeOui.net a échoué',
          html: renderPaymentFailedEmail({ name: contact.name || 'Prestataire' }),
        }).catch(() => {});
      }
    }
  } catch (e: any) {
    console.error('[paypal/webhook] handler error:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function findVendorByPaypalSubscriptionId(subscriptionId: string): Promise<string> {
  const snap = await adminDb.collection('vendors')
    .where('paypalSubscriptionId', '==', subscriptionId).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;

  const pendingSnap = await adminDb.collection('vendors')
    .where('pendingPaypalSubscriptionId', '==', subscriptionId).limit(1).get();
  if (!pendingSnap.empty) return pendingSnap.docs[0].id;

  return '';
}
