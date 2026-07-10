import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

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

    // Build absolute URLs with guaranteed https:// scheme.
    // req.url always includes the scheme on Vercel (e.g., https://snipflow-pearl.vercel.app/api/checkout)
    const origin = (() => {
      const env = process.env.NEXT_PUBLIC_APP_URL;
      if (env && (env.startsWith('http://') || env.startsWith('https://'))) {
        return env.replace(/\/+$/, '');
      }
      // Derive from the incoming request URL — always has scheme on Vercel
      try {
        const u = new URL(req.url);
        return `${u.protocol}//${u.host}`;
      } catch {}
      // Last resort — hardcoded fallback with proper scheme
      return 'https://snipflow-pearl.vercel.app';
    })();

    const successUrl = `${origin}${isSubscription ? '/dashboard?success=true' : batchId ? `/app?batchId=${batchId}&success=true` : `/app?id=${packId}&success=true`}`;
    const cancelUrl = `${origin}${isSubscription ? '/app?canceled=true' : batchId ? `/app?batchId=${batchId}&canceled=true` : `/app?id=${packId}&canceled=true`}`;

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