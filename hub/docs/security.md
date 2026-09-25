# Security: how The Shire keeps its contents private (reviewed 2026-09-25)

Written after Jen asked for top-notch security. This is what is true today, what
was changed in this review, and what only she can do.

## Who can get in

- **Two accounts, ever.** Sign-up is refused once two users exist (`convex/auth.ts`).
  With `HUB_ALLOWED_EMAILS` set, only those two addresses can ever create an account.
  The build copies that setting from the Vercel project to Convex on every production
  build (`scripts/vercel-build.mjs`).
- **Passwords**: at least 12 characters for new passwords (raised from 8 in this
  review). There is no lockout on failed attempts in the sign-in library, so length is
  the defense, along with the fact that only two email addresses exist.
- **Sessions** are Convex Auth JWTs signed with a key that lives only on the Convex
  deployment (generated once at build; never printed).

## Who can see what

- **Every row has an owner and a visibility.** Every server function starts by
  finding the signed-in person (`requireMe`) and reads or writes only their rows, or a
  partner's rows marked shared. Single-person rooms (Metamorphosis, Re-Centered's
  inner room, The Hearth) add a second gate: the claim (`convex/rooms.ts`). A review
  script in this pass found no public function without a sign-in check; the two
  token-based reads (calendar feed, Metamorphosis share links) are covered below.
- **The partner sees only**: first name, photo, time zone, and rows explicitly shared
  (manual sections, What I know entries, mantel lines, Orchard notes, etc.). Private
  rows do not exist from the other account's point of view.
- **The coach** sees only: the manual sections the person allowed, the partner's
  shared sections, Renewed Mind truer lines, mantel lines, What I know entries, and
  the conversation. It is told not to follow instructions inside pasted text.

## Where data goes

- **Convex** (US) holds the database. Everything is over HTTPS/WSS.
- **Anthropic** receives the text of coach conversations plus the context above, to
  write replies. Under Anthropic's API terms that data is not used to train models.
- **Browser push services** (Google/Apple/Mozilla) carry notifications; the payload
  is encrypted end to end with keys that live in Convex and the browser.
- **RSS sources** for John's Field Guide are fetched by the server from a fixed list;
  nothing personal is sent.
- **Nothing else.** No analytics, no third-party scripts, no fonts from Google (the
  two embedded apps now ship their own font files; the main site already did). The
  content security policy below makes the browser refuse any other origin.
- **On the device**: Heartwood and the Re-Centered app keep their data in the
  browser's own storage on that device, never on a server. Anyone who can open that
  browser profile can open them. Their Settings pages export a backup file.

## Browser-side locks (added in this review)

`next.config.ts` sends on every response: a Content-Security-Policy (only this site,
the Convex backend, and data/blob images; no framing; no other scripts), HSTS (two
years, preload), nosniff, X-Frame-Options DENY, a strict referrer policy, a
Permissions-Policy that turns off camera, microphone, location, payment and ad
topics, and Cross-Origin-Opener-Policy.

## Bearer links (know these exist)

- **Calendar feed** (`/calendar/<token>`): a 32-character random token per person.
  Anyone with the link can read that calendar. Regenerate it in Settings to cut off
  an old link.
- **Metamorphosis share links**: 40-character random tokens with an expiry, revocable.
  Anyone with the link can read the sections shared, until it expires or is revoked.

## Dependencies

`npm audit` (production dependencies) was clean after this review for the site and
both embedded apps: Next.js, Convex Auth and its `@auth/core` were upgraded to the
versions that fix the published advisories. Re-run `npm audit` after any upgrade.

## What only Jen and John can do

1. **Turn on two-factor sign-in** for the GitHub, Vercel and Convex accounts. Those
   accounts can read or change everything; they are the real front door.
2. **Set `HUB_ALLOWED_EMAILS`** on the Vercel project to the two sign-in addresses
   (Vercel: Project → Settings → Environment Variables → add, Production). The next
   deploy copies it to Convex.
3. **Use long passwords** (a short sentence) for The Shire, GitHub, Vercel and Convex,
   different for each, in a password manager.
4. **Keep browsers updated**, and sign out on any shared device.
5. **Treat calendar and share links as keys**: only paste them where you'd paste a
   password.

## Known limits

- No lockout after repeated wrong passwords (a sign-in library limit). Mitigated by
  the two-account cap, the email allowlist, and 12-character passwords. Passkeys or
  email-code sign-in would remove the password entirely; possible later.
- No password reset flow. If a password is forgotten, the account is reset from the
  Convex dashboard.
- Convex staff and Anthropic staff operate their services under their own policies;
  data is not end-to-end encrypted against the providers themselves.
