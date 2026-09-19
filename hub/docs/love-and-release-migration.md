# Love & Release: moving it into The Shire

> Renamed 2026-09-19: the whole place, both doors, is now called **Re-Centered** (Jen's
> choice). The module id, folder and route keep `love-and-release`; the room inside is
> titled "{partner}, and me" and keeps module id `re-centered` for its data and claim.
> Names in this file below are as they were when written.

Done 2026-09-19, the same way as Heartwood Fitness (docs/heartwood-migration-plan.md).
The app came from branch `claude/eloquent-meitner-ysxxf6` (folder `love-and-release/`,
built 2026-09-17 to 18 in session "Love & Release app").

## What it is

A faith-centered people-pleasing recovery companion built for a CPTSD and neurodivergent
brain: the front door with feeling-language doors, comfort path, fawn alarm, taking it
personally, threads, circles with layers and moves, red flags, boundaries, Unhooked (the
loop tools), Walk With Jesus cards, truths, release journal, wins, a sixty-second morning
and evening, and settings with a passcode lock, reminders, export and import. Everything is
on the device in IndexedDB; there is no server and no account. Its README lists every route.

## What changed to live inside The Shire

- `hub/love-and-release/`: Vite `base` and the PWA `start_url`, `scope` and offline
  fallback at `/love-and-release/app/`; `src/app/person.ts` reads `?who=her|john` once at
  startup, remembers it on the device, and clears it from the address. Jen's database keeps
  its original name, so nothing of hers moves; John's gets `-john` on the database and the
  seed markers. A "Shire" link sits in the bottom nav; "Reset everything" returns to the
  Shire page. The hosted-preview build (`PREVIEW=1`) is untouched.
- `hub/scripts/build-embedded-apps.mjs` builds it with Heartwood and copies `dist` to
  `hub/public/love-and-release/app/` (gitignored). `next.config.ts` rewrites
  `/love-and-release/app` and deeper paths to its `index.html`; its service worker is never
  served stale.
- `modules/love-and-release/`: `settings.ts` (which person, `moduleSettings["love-and-release"].who`
  or the profile's first name), `screens/Open.tsx` (the `/love-and-release` page with one button).
  No Today line on purpose: what happens in there is private, and The Shire does not read it.
- `hub/tsconfig.json` and `eslint.config.mjs` leave `love-and-release/` to its own toolchain.

## One place, two doors (2026-09-19)

Jen asked to combine Love & Release and Re-Centered without cutting Re-Centered's wire to
Kept Word. So Re-Centered's data did not move; its address did.

- The Love & Release tile is the front door for both. "Everyone, and me" opens the app
  above. "{partner}, and me" opens Re-Centered's screens at `/love-and-release/john/…`,
  rendered by `modules/love-and-release/manifest.tsx` from `modules/re-centered`. The
  Re-Centered tile is gone from the tab bar; `/re-centered/…` redirects.
- Re-Centered's rows stay in The Shire's database, so Kept Word's `word.didnt` still
  lights up the if-then plan on its Now screen within three days, and Seasons still reads
  its sorts, pauses, landings and security taps. The room's claim is unchanged.
- One signal crosses over: when a word wasn't kept recently, the front door opens the app
  with `plan=1`, and the app's own front door shows "the plan is ready" with a link to
  Re-Centered. Only the yes-or-no travels, never the word.
- Cross-links: Re-Centered's Now has "Fawn alarm," "I'm in a loop," "A breathing pause"
  and "Boundaries with anyone," each opening that tool in the app. The app's front door
  has a "This is about John" door (Jen's copy only) that opens Re-Centered.
- The app now wears The Shire's palette (parchment, cream, moss, candlelight, and the
  lantern-lit dark) with the fonts it already shared. Its own tokens in
  `src/styles/global.css` were remapped; no screen changed.

## Existing data

Anything written at the app's old address stays in that browser. Its Settings has Export
and Import: open the old address, Settings, Export, save the file; open it from The Shire,
Settings, Import.
