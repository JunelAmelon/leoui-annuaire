import type { SubscriptionTier } from './subscription-plans';

export const PAYPAL_PLAN_IDS: Record<Exclude<SubscriptionTier, 'free'>, string> = {
  starter: process.env.PAYPAL_PLAN_STARTER || '',
  pro: process.env.PAYPAL_PLAN_PRO || '',
  elite: process.env.PAYPAL_PLAN_ELITE || '',
};

export function getPaypalBaseUrl(): string {
  const mode = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function getPaypalCustomerManageUrl(): string {
  const mode = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  return mode === 'live'
    ? 'https://www.paypal.com/myaccount/autopay'
    : 'https://www.sandbox.paypal.com/myaccount/autopay';
}

export async function getPaypalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    throw new Error('PayPal non configuré (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }

  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'Impossible de récupérer le token PayPal');
  }
  return data.access_token as string;
}

export function getTierFromPaypalPlanId(planId: string): SubscriptionTier {
  for (const [key, id] of Object.entries(PAYPAL_PLAN_IDS)) {
    if (id && id === planId) return key as SubscriptionTier;
  }
  return 'free';
}

export async function verifyPaypalWebhookSignature(payload: unknown, headers: Headers): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  if (!webhookId) return true;

  const transmissionId = headers.get('paypal-transmission-id') || '';
  const transmissionTime = headers.get('paypal-transmission-time') || '';
  const certUrl = headers.get('paypal-cert-url') || '';
  const authAlgo = headers.get('paypal-auth-algo') || '';
  const transmissionSig = headers.get('paypal-transmission-sig') || '';
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: payload,
    }),
  });

  const data = await response.json();
  return response.ok && data?.verification_status === 'SUCCESS';
}
