# Phase 1: security and trust boundary

This pass closes the holes found in the code review. Nothing about the public
site's look or the admin panel's screens changed; what changed is who the server
believes.

## What changed

**Admin sessions are real now.** A correct password makes the server set an
`admin_session` cookie that is HttpOnly and signed with HMAC-SHA256. Every admin
action on `/api/action` checks that signature and its 24 hour expiry before it
runs. Sign out clears it server side. The browser no longer sets or reads any
auth cookie itself. Login attempts are limited to 10 per address per 15 minutes
and password comparison is constant time.

**The database is closed to the outside.** Every Convex function is now an
internal function, which Convex refuses to run over its public HTTP API unless
the caller presents a deploy key. The site server sends that key from
`CONVEX_DEPLOY_KEY` through one shared module, `src/lib/convexServer.ts`, which
is also the only place that talks to Convex (the email and meet-and-greet
modules used to have their own copies). Read calls get one automatic retry,
which addresses the "calendar is empty right after login" report.

**Callback secrets have no defaults.** The two secrets that authorize scheduled
jobs to call back into the site used to have fallback values written in the
source. They are now required environment variables on both sides.

**Booking requests are validated and priced on the server.** The public form's
numbers are only a preview. `src/lib/bookingValidation.ts` checks every field,
rejects past or inverted dates and malformed pets, re-prices the stay with the
same engine the form uses, and refuses dates that are blocked or partially
booked on the calendar. The stored price and holiday flags are the server's.

**Admin emails come from the database record.** Approve, decline, deposit
received, balance received, cancel, and reschedule now load the request and
booking from Convex and build the client email from that, instead of from
whatever the admin page posted. Side effects of this:

- The approval email uses the deposit amount you set at approval (it used to
  recompute 50 percent and could disagree with the booking).
- The "your pet profile is saved, here is your return code" email now actually
  sends on a first approval. A wrong field read meant it never did.
- Reschedule re-prices on the server and stores a matching breakdown.
- A cancellation with no deposit recorded as paid reports a zero refund instead
  of promising money back.

Public form posts (booking, pet profile lookup, resend code) are rate limited to
20 per address per minute.

## Environment variables you must set

See `.env.example` for the full list. New or newly required:

| Variable | Where | How to get it |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | site `.env` | Convex dashboard, Settings, Deploy keys, for the production deployment |
| `SESSION_SECRET` | site `.env` | `openssl rand -hex 32` |
| `POST_COMPLETION_SECRET` | site `.env` and `npx convex env set POST_COMPLETION_SECRET <value>` | `openssl rand -hex 24` |
| `DEPOSIT_REMINDER_SECRET` | site `.env` and `npx convex env set DEPOSIT_REMINDER_SECRET <value>` | `openssl rand -hex 24` |
| `SITE_PUBLIC_URL` | site `.env` and `npx convex env set SITE_PUBLIC_URL https://jenjohnpetservices.com` | your domain |

Because the old fallback secrets were in the source export, treat them as
public and generate fresh values. After deploying, sign in to the admin panel
once and change the password, since the old admin password may have been
exposed the same way.

## Deploying this version

1. `npx convex deploy` from this folder so the internal function definitions
   and the new `getRequest` / `getBooking` queries go live.
2. Set the Convex environment variables above.
3. Set the site `.env` variables above, then restart the site server.
4. Sign in at `/admin`. The first sign in after deploy seeds the stored password
   hash from `ADMIN_PASSWORD` if none exists.

## Checks that ran

- `scripts/phase1-tests.ts`: sessions, cookie parsing, rate limiter, booking
  validation, server pricing against the brief's worked example, availability
  conflicts. All pass.
- `scripts/holiday_stress_test.ts` and `scripts/meet-greet-stress.ts`: unchanged
  engines, all pass.
- TypeScript: no new errors. The remaining ones predate this work (missing Bun
  type definitions and a handful of unused variables).
- `bun run build`: client and server bundles build.

## Still ahead (phases 2 to 4)

Replacing the Bun server with native TanStack server functions for Vercel,
removing the CTO.new leftovers, the remaining functional bug list from the
review (3pm cutoff minutes, template editor placeholders, cancelled bookings in
the list, admin calendar unblocking booked dates, 12:30 partial day), and the
admin and email refactors.
