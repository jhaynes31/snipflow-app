# The Apothecary: Spec

Asked for by Jen on 2026-09-23. Her brief: a place to look up body issues (her example was
swelling, enlargement and discomfort in one calf); suggestions of causes and holistic things
to try (tinctures, herbs, massage and stretch, supplements); clarity on whether it's an
emergency without constant "see your doctor" disclaimers; what emotions and trauma the
holistic traditions say a place holds (Chinese medicine); extensive questions over time that
gather body patterns; her signs of POTS, Ehlers-Danlos, MCAS, CPTSD and autoimmune flares;
and, added the same day, local low-cost and free places to get care.

## The rules

- One "not a doctor" line, once, on the Ask page. Nowhere else.
- "A person, today" is said plainly and only for the true red flags (`RED_FLAGS` in
  `convex/apothecary/pure.ts`). The coach's rules (`apothecary.ask` in
  `convex/coach/prompt.ts`) forbid "consult your doctor" boilerplate in every other case and
  require a fixed six-part answer with exact headings: Needs a person now? / What it could be
  / What to try / What this place tends to hold / For next time / Tonight.
- Private to each person. Nothing here is shared, and Seasons doesn't read it.

## The screens

- **Ask** (`/apothecary`): where (twenty areas), side, qualities (pick every one), severity
  1 to 5, onset, duration, and the person's own words. Ask saves the entry first
  (`apEntries`), then opens the coach with the entry, the conditions tracked, the cabinet,
  and the last six entries as its opening context.
- **Now?** (`/apothecary/now`): the red flags in two groups, now and today, and a plain list
  of what is not on the page.
- **Log** (`/apothecary/log`): today's thirty-second line of factor chips (`apDays`: sleep,
  water, salt, standing, heat, stress, histamine foods, cycle, supplements, and so on) and
  every entry with "what I tried, what helped."
- **Patterns** (`/apothecary/patterns`): for each area with three or more symptom days,
  the factors present on at least 60% of those days and at least 1.5x their everyday rate,
  written as plain lines (`patterns()` in pure.ts). Starts at five logged days.
- **Body** (`/apothecary/body`): twenty places, the meridian, and what the traditions say
  each holds, offered as tradition.
- **Conditions** (`/apothecary/conditions`): POTS, hypermobility/EDS, MCAS, CPTSD in the
  body, autoimmune signs: looks like, travels with, and home checks that make real numbers
  (the lying-then-standing pulse test, the Beighton nine, a histamine diary,
  dermatographia). Toggles stored in `moduleSettings.apothecary.conditions`.
- **Cabinet** (`/apothecary/cabinet`): what's on the shelf (`apCabinet`); the coach reaches
  for it first.
- **Where to go** (`/apothecary/where`): `core/apothecary/resources.ts`, national finders for
  community health centers (sliding scale), free clinics, hospital financial assistance and
  Hill-Burton, 2-1-1, Planned Parenthood, urgent care self-pay, Cost Plus Drugs, GoodRx,
  NeedyMeds, Open Path Collective, community mental health, 988, Medicaid, the Marketplace,
  Dollar For, dental schools. A saved zip (`moduleSettings.apothecary.zip`) points the
  finders that take one at the person's town.

## Data

`apEntries` (day, area, side, qualities, severity, onset?, duration?, text, tried?,
helped?), `apDays` (day, factors, note?), `apCabinet` (name, kind, forWhat?, amount?).
Tests: `tests/apothecary.test.ts`.
