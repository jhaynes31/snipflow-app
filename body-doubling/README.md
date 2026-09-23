# Body Doubling Community

The member portal and session booking system for Jen & John's neurodivergent body doubling community. It takes over the spreadsheet and DM coordination: memberships, booking, pre-session goals and attendance.

This is its own app. It shares no code or data with SnipFlow or the Hub. It uses the same stack: Next.js 16, Convex (database and login) and Stripe.

## What's in v1 (the MVP loop)

| Before | After |
| --- | --- |
| Members DM to claim a seat; someone updates a spreadsheet | Members tap **Save my seat**. Included hours are used first, then purchased extras |
| Hours tracked by hand each month | Stripe renewals reset the 8 included hours automatically. Extra hours carry over |
| Drop-ins pay by Venmo/PayPal and wait for a reply | Drop-ins pick **Whole session ($70)** or **By the hour ($18/hr, work blocks only)**, pay through Stripe, and get a private link |
| Cancellations leave empty seats | Canceling gives the hours back and seats the next person on the waitlist automatically |
| Goals collected in chat right before the call | The goals form opens 48 hours before (or right away if they booked later), with one short field per work block. Hosts see the answers on the roster |
| No-shows tracked from memory | Hosts tap **✓ Here / Missed**, or members check themselves in. The first miss sends a friendly note. From the second miss on, that member's waitlist spot sits at the back until a host resets it |

### Screens

- **`/`** is the public, shareable schedule: upcoming sessions, the block lineup as colored strips, open member and drop-in seats (shown as dots), and pricing.
- **`/sessions/[id]`** is where people book. Members book with their hours (or join the waitlist, or top up if they're short). Drop-ins pay here.
- **`/portal`** is the member's home: an hours meter, buying extra hours, managing billing, their sessions with goals, check-in and cancel, and notices.
- **`/drop-in/[token]`** is a drop-in's private page for goals and check-in. No account needed.
- **`/admin`** (hosts) lists sessions with headcount, the member/drop-in split, waitlist, flags for past missed sessions, and how many goals are in. It also has **+ New session**, with a live preview.
- **`/admin/sessions/[id]`** is the roster, with each person's goals, attendance buttons, the waitlist, **Comp a seat** (sliding scale), edit, mark done and cancel.
- **`/admin/members`** shows hours left, missed sessions, a sliding-scale flag (hosts only), **Reset misses** and **± Hours**.

### Rules (all in `convex/rules.ts`)

- Membership is $50/month for 8 included hours per billing cycle.
- Members buy extra time at $12/hr or $40 for a full 4-hour session. Checkout picks whichever is cheaper.
- Drop-ins pay $70 for a full session, or $18/hr for work blocks only (no opening or closing bookends).
- A session has 8–10 seats. 2 are saved for drop-ins, or 3 once capacity is 10 or more. Hosts can change this.
- A drop-in who hasn't paid holds their seat for 30 minutes while checking out.
- Comped (sliding-scale) seats use a member seat.

### Not in v1 (as the spec said, these can follow)

- Revenue overview. Every payment is already recorded in the `payments` table (membership, drop-in or extra hours), so the dashboard only needs a view on top.
- The session recap and celebration log.
- Email and text reminders. The goals form and policy notes show up in the member portal for now; drop-ins reach theirs through their private link.

## Questions for Jen & John

These are defaults I picked. Each one is quick to change:

1. **Cancellations:** members can cancel anytime before the start and get their hours back. Do you want a cutoff, like 12 hours before?
2. **Paused priority** currently only affects the waitlist order. Paused members can still book any open seat. Should they also lose early access to new sessions?
3. **Drop-in cancellations and refunds** are handled by you in Stripe. Drop-ins have no self-cancel button.
4. **Waitlist:** members only. Drop-in seats that free up go back on sale.
5. **Unused included hours** don't roll over. Purchased extra hours never expire.

## Setup

```bash
cd body-doubling
npm install
npx convex dev              # creates the Convex project and regenerates convex/_generated
npx @convex-dev/auth        # one-time: sets JWT_PRIVATE_KEY, JWKS, SITE_URL for login
npx convex env set ADMIN_EMAILS "jen@example.com,john@example.com"
npx convex env set STRIPE_SECRET_KEY sk_test_...
npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
npm run dev
```

**Stripe webhook:** point it at `https://<your-deployment>.convex.site/stripe/webhook` and select these events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`.
You don't need to create Products or Prices in Stripe, because the prices come from `rules.ts`. Turn on the **Customer portal** in Stripe settings so members can update their card or cancel.

**Deploy (Vercel):** set the build command to `npx convex deploy --cmd 'npm run build'`, and add `CONVEX_DEPLOY_KEY` and `NEXT_PUBLIC_COMMUNITY_NAME`.

## Checks

```bash
npm test            # rules (node --test) + booking/waitlist/attendance/payment flows (convex-test)
npm run typecheck
npm run lint
npm run build
```
