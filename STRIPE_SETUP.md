# Stripe Production Setup Guide

The application is now configured with the live Stripe Restricted Keys and Publishable Keys. 

## Webhook Configuration
To enable automatic content unlocking and email notifications, you must configure a Stripe Webhook:

1.  **Go to your Stripe Dashboard**: [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2.  **Add an endpoint**:
    *   **URL**: `https://YOUR_PRODUCTION_DOMAIN.com/api/webhooks/stripe`
    *   **Select events to listen to**:
        *   `checkout.session.completed`
        *   `customer.subscription.deleted`
        *   `invoice.paid`
3.  **Get your Webhook Secret**:
    *   Once the endpoint is created, reveal the "Signing secret" (starts with `whsec_`).
4.  **Update the Environment Variable**:
    *   Update `STRIPE_WEBHOOK_SECRET` in your production environment (e.g., Vercel or your `.env.local` on the server) with this value.

## Current Status
- **Stripe Live Mode**: ENABLED
- **Webhook Status**: MOCK MODE (Bypasses verification because secret is a placeholder). 
    - *Note: In Mock Mode, the application will still process payments but it is less secure against spoofed webhook events. It is highly recommended to set the `STRIPE_WEBHOOK_SECRET` as soon as the domain is live.*
