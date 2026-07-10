import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * Build a proper absolute URL from a path, ensuring scheme is always present.
 * Fixes Stripe's "Invalid URL: an explicit scheme" error.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL if it already has http:// or https://
 * 2. Derive from the request's Host header (works on Vercel, localhost, etc.)
 * 3. Hardcoded fallback to snipflow-pearl.vercel.app
 */
function buildAppUrl(req: Request, path: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return `${envUrl.replace(/\/+$/, '')}${path}`;
  }
  // Derive from the incoming request's Host header
  const host = req.headers.get('host') || 'snipflow-pearl.vercel.app';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}${path}`;
}

export async function POST(req: Request) {
  try {
    const { packId, batchId, userId, planType } = await req.json();

    const isSubscription = planType === 'monthly';
    let unitAmount = 4900; // $49 - Founding Member price
    let productName = 'SnipFlow Lifetime Access';
    let productDescription = 'Unlimited content packs + priority processing. Founding Member Price ($49) — first 20 customers only. Normally $97.';

    if (isSubscription) {
      unitAmount = 1900; // $19/mo
      productName = 'SnipFlow Founder Tier';
      productDescription = '5 content packs per month + Dashboard access. Cancel anytime.';
    }

    const successUrl = buildAppUrl(req, isSubscription
      ? '/dashboard?success=true'
      : batchId
        ? `/app?batchId=${batchId}&success=true`
        : `/app?id=${packId}&success=true`);

    const cancelUrl = buildAppUrl(req, isSubscription
      ? '/app?canceled=true'
      : batchId
        ? `/app?batchId=${batchId}&canceled=true`
        : `/app?id=${packId}&canceled=true`);

    const line_items = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: productDescription,
          },
          unit_amount: unitAmount,
          ...(isSubscription ? { recurring: { interval: 'month' as const } } : {}),
        },
        quantity: 1,
      }
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        packId: packId || '',
        batchId: batchId || '',
        userId: userId || '',
        planType: planType || 'one-time',
      },
      ...(isSubscription && userId ? { client_reference_id: userId } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
