import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.includes('PLACEHOLDER')) {
        console.warn('STRIPE_WEBHOOK_SECRET is not set or is a placeholder, skipping verification (MOCK MODE ENABLED)');
        event = JSON.parse(body);
    } else {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { packId, batchId, userId, planType } = session.metadata || {};

    if (planType === 'monthly' && userId) {
      console.log(`Subscription successful for user: ${userId}`);
      await convex.mutation(api.users.updateSubscription, {
        userId: userId as any,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        plan: 'monthly',
        usageCount: 0,
        usageResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    } else if (planType === 'lifetime' && userId) {
      console.log(`Lifetime purchase successful for user: ${userId}`);
      await convex.mutation(api.users.updateSubscription, {
        userId: userId as any,
        stripeCustomerId: session.customer as string,
        plan: 'lifetime',
      });
      if (packId) {
        await convex.mutation(api.content.updateContentPack, {
          id: packId as any,
          isPaid: true,
        });
      }
      if (batchId) {
        await convex.mutation(api.content.markBatchAsPaid, {
          batchId: batchId as any,
        });
      }
    } else if (batchId) {
      console.log(`Payment successful for batch: ${batchId}`);
      await convex.mutation(api.content.markBatchAsPaid, {
        batchId: batchId as any,
      });
    } else if (packId) {
      console.log(`Payment successful for pack: ${packId}`);
      
      // 1. Mark as paid in Convex
      await convex.mutation(api.content.updateContentPack, {
        id: packId as any,
        isPaid: true,
      });

      // 2. Fetch pack and user info for email
      const pack = await convex.query(api.content.getPack, { id: packId as any });
      if (pack) {
        let userEmail = session.customer_details?.email;
        let userName = session.customer_details?.name;

        if (pack.userId) {
          const user = await convex.query(api.users.getById, { id: pack.userId });
          if (user?.email) userEmail = user.email;
          if (user?.name) userName = user.name;
          
          // If user is logged in, maybe they have a lifetime plan now?
          // For now we just mark the pack as paid.
        }

        if (userEmail) {
          console.log(`Sending confirmation email to ${userEmail} for pack ${packId}`);
          // MOCK EMAIL SENDING
          console.log(`
            --- MOCK EMAIL ---
            To: ${userEmail}
            Subject: Your SnipFlow Content Pack is Ready!
            Body: Hi ${userName || 'there'}, 
                  Your payment for "${pack.videoTitle}" was successful.
                  You can download your content pack here: ${process.env.NEXT_PUBLIC_APP_URL}/app?id=${packId}
                  Or access it anytime from your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
            ------------------
          `);
        }
      }
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const user = await convex.query(api.users.getByStripeCustomerId, {
      stripeCustomerId: subscription.customer as string,
    });
    if (user) {
      await convex.mutation(api.users.updateSubscription, {
        userId: user._id,
        plan: 'free',
        stripeSubscriptionId: undefined,
      });
      console.log(`Subscription cancelled for user: ${user._id}`);
    }
  } else if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    if (invoice.subscription) {
      const user = await convex.query(api.users.getByStripeCustomerId, {
        stripeCustomerId: invoice.customer as string,
      });
      if (user && user.plan === 'monthly') {
        await convex.mutation(api.users.updateSubscription, {
          userId: user._id,
          usageCount: 0,
          usageResetAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        });
        console.log(`Usage count reset for user: ${user._id}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
