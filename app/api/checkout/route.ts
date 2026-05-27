import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { packId, batchId, userId, planType } = await req.json();

    const isSubscription = planType === 'monthly';
    
    const successUrl = isSubscription 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`
      : batchId 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/app?batchId=${batchId}&success=true`
        : `${process.env.NEXT_PUBLIC_APP_URL}/app?id=${packId}&success=true`;

    const cancelUrl = isSubscription
      ? `${process.env.NEXT_PUBLIC_APP_URL}/app?canceled=true`
      : batchId
        ? `${process.env.NEXT_PUBLIC_APP_URL}/app?batchId=${batchId}&canceled=true`
        : `${process.env.NEXT_PUBLIC_APP_URL}/app?id=${packId}&canceled=true`;

    const line_items = isSubscription ? [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'SnipFlow Pro Plan',
            description: '5 content packs per month + Dashboard access.',
          },
          unit_amount: 1900,
          recurring: {
            interval: 'month' as const,
          },
        },
        quantity: 1,
      }
    ] : [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'SnipFlow Content Pack',
            description: 'Professional social media content generated from your video.',
          },
          unit_amount: 4900,
        },
        quantity: 1,
      },
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
      // For subscriptions, we want to ensure we can link the customer
      ...(isSubscription && userId ? { client_reference_id: userId } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
