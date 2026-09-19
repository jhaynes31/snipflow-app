# Heartwood Fitness: moving it into The Shire

Written 2026-09-19 after reading the Heartwood app on branch `claude/brave-dirac-5rvz7q`
(folder `heartwood/`, built 2026-09-17 to 18 in session "Heartwood"). Jen approves this
plan before anything moves.

## What Heartwood is today

- A stand-alone web app built with Vite and React, deployed on its own Vercel project at
  a `heartwood-*.vercel.app` address, installable on a phone, fully offline after first load.
- Fourteen pages: Who (pick the person), Onboarding (ten calm steps), Today, Session
  player (timers, logging, swaps, exits, red flags), Freestyle with a 3D body, Exercise
  library and detail, Learn (body map and micro-lessons), Progress (the growing tree,
  charts, sticker book), Settings, My PT's Plan, Reassessment, Red flag, Disclaimer.
- A domain layer with tests: ~75 curated exercises, the safety filter (excluded
  exercises can never appear), the program generator (A/B alternation, phases, recovery
  weeks, Sabbath, Comeback Mode), double progression with conservative knee, ankle, and
  balance rules, and a coach with a hundred-plus message library and voice cues.
- Two people already: each person gets a separate on-device database; the device
  remembers who is active. All data lives in the browser (IndexedDB), never on a server.
- Optional real exercise GIFs from the ExerciseDB free dataset, with attribution.

## What to keep, exactly as it is

Everything above. The safety engine and its tests are the reason the app is trustworthy,
and nothing in The Shire needs them rewritten. The 3D body, the player, the tree, the
stickers, the PT plan, and the offline behavior all stay.

## What to switch to the foundation

| Today | In The Shire |
|---|---|
| Its own address and its own "Who are you?" screen | Opened from the Heartwood Fitness tile; The Shire tells it who is signed in, so the Who screen is skipped |
| Its own bottom nav with no way back | A "Back to The Shire" link in its nav |
| Its own icon and install prompt | The Shire's install; Heartwood stays offline-capable inside it |
| Nothing from Tend | The Shire passes the day's signals when it opens Heartwood: gentle day on, tender week on, and today's check-in weather, so Heartwood can suggest the lighter session it already knows how to build |
| Nothing on The Shire's home | A Today line ("Heartwood: today's session is Lower body A, 35 minutes") read from Heartwood's own on-device data, since both live on the same address |

## What to leave alone, on purpose

- **Data stays on the device.** Moving Heartwood's data to Convex would mean rewriting
  its data layer and every page that touches it, and it would put body history and
  session logs on a server that today never sees them. The cost is that a person's
  Heartwood data lives on the phone or laptop they use it on, and Seasons cannot read it.
  That is the same as today. A later step can add sync if you want it.
- **The Shire's coach stays out of it** for now. Heartwood has its own coach voice and
  message library. "Ask My Coach" through the shared coach is a later step.

## How the move works

1. Copy the `heartwood/` folder from its branch into `hub/heartwood/`, unchanged except
   for a base path (`/fitness/app/`), a "Back to The Shire" link, and reading the
   signed-in person and the day's signals from the address it is opened with.
2. The Shire's build runs Heartwood's build too and places the result under The Shire
   so it is served at `/fitness/app/`. One Vercel project, one address.
3. The Heartwood Fitness tile opens a Shire page at `/fitness` with one big button,
   "Open Heartwood," and the Today line. Tapping the button opens the app itself.
4. Which person is which: The Shire maps the signed-in profile to Heartwood's two
   people. If a name contains "John" it is John; otherwise it is the first person
   (whose body history the app was built around). A chooser on `/fitness` lets either
   of you correct it once.
5. Heartwood's own service worker is scoped to `/fitness/app/`, so offline sessions
   keep working and The Shire's own offline page is untouched.

## Existing data

Any sessions logged on the old `heartwood-*.vercel.app` address stay in that browser's
storage; browsers do not move data between addresses. Heartwood already has a JSON
export and import in Settings. If either of you has logged sessions there: open the old
address, Settings, Export, save the file; open the new one, Settings, Import. If you
haven't used it yet, there is nothing to move. The old address can be deleted after.

## Done when

- Both of you open Heartwood from The Shire tile and land on your own Today without a
  Who screen.
- A full session runs Today, Start, Finish inside The Shire, offline included.
- On a tender week or a gentle day, Heartwood's Today offers the lighter option.
- The Shire's home shows the Heartwood Today line for the signed-in person.

## Later, only if wanted

- Sync to Convex so a person's Heartwood data follows them across devices and Seasons
  can include sessions.
- "Ask My Coach" through the shared coach, with Heartwood's safety context.
- Real exercise GIFs, which need a free ExerciseDB key and a build-time download.
