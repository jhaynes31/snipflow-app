# Every Box migration plan (Phase 2)

2026-09-18 · Approved by Jen the same day. Steps 1 through 4 below are done and live; step 5 (data) and step 6 (hand-over) remain.

Source: the `jhaynes31/every-box` repository at commit `eb5a940` (one commit, "Replace emoji stage art with vector illustrations"). Target: `hub/modules/every-box` in The Shire, on the Hub Contract's foundation.

## What Every Box is today

A standalone Next.js 16 + Convex app with the same stack as The Shire. About 5,200 lines. Its pieces:

| Piece | Where | Notes |
| --- | --- | --- |
| Data model | `convex/schema.ts` | Seven `eb*` tables: households, partners, categories (the boxes), tending events, context notes, weekly reviews, commitments |
| Functions | `convex/{households,categories,commitments,reviews}.ts` | Household-scoped. Tender-only tending, either partner can note, agreement-based commitments |
| Freshness engine | `convex/freshness.ts` | Pure. Five stages from a ratio of days-since-tended to ideal cadence. Unit-tested |
| Themes | `convex/themes.ts` | Seven skins (garden, aquarium, character sheet, house, terrarium, guild, village). A "premium" flag exists but every theme is already unlocked |
| Screens | `app/` | Dashboard, boxes list, box detail with history, commitments, weekly review, glance view (`/widget`), settings, login, onboarding, join |
| Components | `components/` | Cards, forms, filters, stage art, world scene, tend button, shell, nav, badge sync |
| Own copies of foundation things | `app/login`, `components/Onboarding`, `app/join`, `BadgeSync`, `app/checkin.ics`, `public/sw.js`, `app/manifest.ts` | These duplicate what The Shire's foundation now owns |

Every Box already follows the shame-free rules: no streaks, scores, or overdue language. Its freshness stages are the one allowed exception and they stay inside the module.

## What I will keep, unchanged or nearly so

- All seven `eb*` tables, with their names and fields, so any existing data moves over as-is.
- All functions for boxes, tending, notes, reviews, and commitments, including who-can-do-what rules.
- The freshness engine and its tests.
- All seven themes and the theme picker. Every theme stays unlocked; the premium flag is left in place but nothing reads it.
- Every screen and component: dashboard with world scene, boxes list with reorder and rest/restore, box detail with history and undo, commitments, weekly review, glance view, filters.
- Every Box's own look (`everybox.css`, the `--eb-*` variables, stage art) inside The Shire's frame. Its variables don't collide with the frame's.

## What switches to the foundation

| Every Box today | In The Shire | Why |
| --- | --- | --- |
| Own login page, sign-up, password | The Shire's login | One login for everything (contract) |
| Households with invite codes, onboarding, join page | Removed. The one household is the two of you, created automatically the first time either of you opens Every Box. Partner records are created from your Shire profiles and linked to them | No public sign-up; exactly two accounts (contract) |
| Display names kept in `ebPartners` | Read from your Shire profile | One profile, every module reads from it (contract) |
| App-icon badge counting boxes that need attention | Removed. The Shire's badge counts open heads-ups only | Contract: the badge never counts chores |
| Own `.ics` calendar invite for check-ins and weekly review | Removed. Proposal: an optional weekly "Every Box review" event in each person's Shire calendar feed, toggled in Every Box settings | Contract: modules hand reminders to the Hub, never send their own |
| "Weekly review is ready" and "A proposal is waiting" cards on Every Box's dashboard | Also offered as Every Box's `todayWidget` on The Shire home screen, one small line, only when there is something | Contract: today row shows at most one item per module |
| Own bottom navigation | A row of tabs inside the Every Box place: Home, Boxes, Commitments, Review, Settings | The Shire owns the outer navigation |
| Own settings (theme, invite, reminders, names) | Theme picker and the weekly-review calendar toggle only. Names and everything else live in Shire Settings | Avoid two places for the same setting |
| Service worker, PWA manifest, icons | The Shire's | One installable app |
| Routes at `/`, `/categories`, `/category/[id]`, `/commitments`, `/review`, `/widget`, `/settings` | Same screens at `/every-box`, `/every-box/boxes`, `/every-box/box/[id]`, `/every-box/commitments`, `/every-box/review`, `/every-box/glance`, `/every-box/settings` | Each place has its own URL under its route |

## New behavior the contract requires

- **Gentle day.** Nothing. Per Jen (2026-09-18), a gentle day never hides or changes anything in any app. Every Box looks and works the same every day.
- **Privacy fields.** Every Box's tables are household-scoped, which means shared by definition, and its manifest lists them under `sharedData`. To honor "every table has `ownerId` and `visibility`", each table gets an optional `visibility` field that reads as `shared` when missing, and `ownerId` maps to the existing `partnerId`, `createdBy`, or `proposedBy`. No existing row needs rewriting.
- **Cross-module hook.** Every Box emits `category.stuck` the first time one of your boxes drops to dormant, once per dormant spell, through the Hub's event bus. Nothing listens yet; Tend will (phase 3).
- **Copy check.** Every Box's text runs through `npm run check-copy` like everything else.

## Data: how existing boxes move over

This depends on one fact I can't see from the code: **whether Every Box is already in use with real boxes and history on a live Convex deployment.** The repository is one day old, so it may not be.

- **If there is no real data yet:** nothing to move. The plan is code only.
- **If there is real data:** it moves in three steps, none of which touch the old deployment.
  1. You download a snapshot of the old Every Box deployment from the Convex dashboard (Settings, Backup & Restore, or Export).
  2. I write a one-time import that reads the snapshot's `eb*` tables and writes them into The Shire's deployment, replacing the old partner ids with the new partner records linked to your profiles, and dropping the old `users` and auth tables (The Shire already has its own).
  3. We compare counts and spot-check a few boxes before the old site is retired.

Either way, the old Every Box site keeps running untouched until you say it's done. Nothing is deleted from it by this plan.

## Order of work

1. **Move the code in.** *(done)* Copy the tables into `convex/schema.ts`, the functions into `convex/eb*.ts`, the screens and components into `modules/every-box/`, the stylesheet and tests alongside. Register the module as `ready`. Everything compiles and tests pass, but it still uses its own login and household flow.
2. **Switch to the foundation.** *(done)* Replace the household and partner flow with automatic provisioning from Shire profiles. Delete login, onboarding, join, badge sync, the `.ics` route, and the PWA files. Point every screen at the foundation's user and partner.
3. **Fit the frame.** *(done)* Sub-navigation tabs, routes under `/every-box`, Every Box settings trimmed to the theme picker, today widget on the home screen.
4. **Contract behaviors.** *(done)* `category.stuck` event, optional weekly-review calendar event, privacy fields.
5. **Data (only if needed).** Import script, run against a snapshot, verify.
6. **Verify and hand over.** Typecheck, lint, copy check, tests, production build. You and John each open Every Box inside The Shire and tend one box. Then the old Every Box site and its Vercel project are archived, not deleted, in case anything was missed.

Each step ends with a push you can see working, so we can stop between steps.

## Done when (from the contract)

Every Box works as before, inside The Shire, using its login and reminders. Specifically: both of you can open the Every Box tab, see the same boxes, tend your own, leave notes on each other's, propose and agree commitments, and run a weekly review, all with the one Shire login and with the review nudge appearing on The Shire home screen.

## Decisions for Jen

1. **Is Every Box already holding real data?** Yes: the production deployment is `youthful-mule-878` in the Convex project "Every Box". The data step is next.
2. **Default theme.** Decided: the "village" theme, reshaped as a woodland village in The Shire's own moss, wood, and greenery, following light and dark mode. All seven themes stay available.
3. **Weekly review on the calendar.** Decided: yes, as a per-person toggle in Every Box settings.
4. **The glance view.** Decided: kept, at `/every-box/glance`.

## Risks and how they're handled

- **Id mapping.** Old partner ids appear in categories (`tenderIds`), events, notes, reviews, and commitments. The import maps every one; a mismatch fails the import rather than writing a broken row.
- **Two Convex deployments.** Every Box's own deployment keeps running until cutover. The import reads a snapshot file, never the live old deployment.
- **Style bleed.** Every Box's styles are scoped under an `.eb` wrapper and use `--eb-*` variables; The Shire uses unprefixed variables and `.sh-*` classes. Both use Tailwind utilities, which are identical in both apps.
- **Nothing lost.** The old site and repository are untouched until you confirm the move.
