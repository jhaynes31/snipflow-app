# Every Box

A shared, ambient dashboard for two partners. Every part of life gets a box;
Every Box shows how recently each one has been *tended*, using a soft five-stage
growth visual instead of a score, a streak, or a "days overdue" count.

It lives inside this repository under `/everybox` and reuses the existing
Next.js + Convex + Convex Auth stack. Nothing about SnipFlow changes except that
the site header hides itself on Every Box routes.

## Where things are

| Area | Path |
| --- | --- |
| Freshness engine (pure, shared) | `convex/everybox/freshness.ts` |
| Themes (pure skin layer) | `convex/everybox/themes.ts` |
| Convex tables | `convex/schema.ts` (tables prefixed `eb`) |
| Convex functions | `convex/everybox/{households,categories,reviews,commitments}.ts` |
| Pages | `app/everybox/**` |
| Components | `components/everybox/**` |
| PWA manifest / service worker / icons | `app/everybox/manifest.webmanifest/route.ts`, `public/everybox/` |
| Calendar invite generator | `app/everybox/checkin.ics/route.ts` |
| Unit tests | `tests/everybox/freshness.test.ts` (`npm test`) |

## The mechanic

```
freshness_ratio = days_since_last_tended / ideal_cadence_days
```

| ratio | stage |
| --- | --- |
| ≤ 0.5 | 5 · Flourishing |
| ≤ 1.0 | 4 · Thriving |
| ≤ 1.5 | 3 · Growing |
| ≤ 2.5 | 2 · Sprouting |
| otherwise, or never tended | 1 · Dormant ("sleeping, ready to wake") |

Because it is a ratio, a weekly category and a monthly category are each judged
against their own rhythm. Stages are computed on the client from
`lastTendedAt` + `idealCadenceDays` with a once-a-minute clock, so a page left
open all morning stays honest without re-querying.

## Permissions

* Both partners see every category, note, commitment and review.
* Each category has one **tender**. Only the tender can log a tending event.
  The Convex `categories.tend` mutation enforces this server-side.
* The other partner can leave a **context note** on any category. Notes never
  change freshness.
* Commitments: either partner can propose; only the assigned partner can
  agree (which activates it), check in on it, or mark it done. Marking done
  archives it for good.

## Reminder channels (no push banners)

1. **Browser homepage / new tab.** `/everybox/widget` is a chrome-free
   glanceable view meant for exactly this. Settings has copy buttons.
2. **App icon badge.** `components/everybox/BadgeSync.tsx` calls the Badging
   API with the count of *my* categories at sprouting/dormant plus my
   commitments that are proposed-to-me or wilting. It only updates while the
   app is open (there is no push channel by design), and the badge persists on
   the icon after the app closes. Toggle in Settings.
3. **Calendar invite.** `/everybox/checkin.ics?freq=daily|weekdays|mwf|weekly&hour=8&minute=0&day=SU`
   returns a recurring `.ics` with floating local times.

The service worker (`public/everybox/sw.js`) exists only for installability and
an offline fallback page. It never shows notifications.

## Themes

A theme is five stage visuals, five labels, a tend verb and a palette. See
`convex/everybox/themes.ts`. Free: garden, aquarium, character sheet, house
restoration. Premium: terrarium/bonsai, party/guild, cozy village.

Premium is a household-level flag (`ebHouseholds.isPremium`) plus an optional
per-theme `unlockedThemes` list. Both are set only through the internal
mutations `households.setPremium` and `households.unlockTheme`, ready to be
called from a billing webhook. Nothing but theming is gated.

## Running it

```bash
npm install
npx convex dev        # pushes the schema + functions and regenerates convex/_generated
npm run dev           # then open http://localhost:3000/everybox
```

`convex/_generated/api.d.ts` was extended by hand to include the `everybox/*`
modules; `npx convex dev` will regenerate it identically.

Checks:

```bash
npm run typecheck
npm run lint
npm test
```

To regenerate the icons: `node scripts/everybox-icons.mjs`.
