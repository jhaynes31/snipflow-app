# The Financial DM — Claude Code handoff prompt

Paste everything below the line into Claude Code, with the unzipped `source/`
folder open as the working directory.

Before you start: unzip `source.zip` from the export into your working folder.
`database.zip` is useful if you want to restore the DB locally. `brand-assets.zip`
(34MB) is not needed for any of this work.

---

Here is the exported source for a TanStack Start + Postgres (Neon) lead-gen and
content-generation site for a life insurance business, "The Financial DM." The
stack is React + Vite + Tailwind, served by a single Bun server (`serve.ts`) on
port 3000. Postgres is accessed through `src/db.ts` and is genuinely used
throughout. The Anthropic API is called directly from server functions
(`scriptGenerator.ts`, `carouselGenerator.ts`, `memeGenerator.ts`,
`socialCardGenerator.ts`); I've confirmed the API key is server-only and never
reaches client code, so that part is correct as-is.

Five tables: `leads`, `meme_concepts`, `saved_scripts`, `saved_carousels`,
`social_cards`. As of the last snapshot there is no real client data yet, which
is why item 1 needs to happen before launch rather than after.

Give me a verdict per component — keep as-is, fix, or rebuild — and work through
the priorities below in order.

## Priority 1 — There is no authentication anywhere in this app

No password, no login, no session, nothing. I grepped the whole `src/` tree; the
only session-related code is `sessionStorage` in the quiz routes storing UTM
parameters, which has nothing to do with access control.

Every server function in `src/server/leads.ts` (`getLeads`, `saveLead`,
`updateLeadStatus`, `deleteLead`) and every generator server function is callable
by anyone who reaches `/dashboard`, `/script-generator`, `/carousel-generator`,
`/meme-generator`, or `/social-card-generator`. Those pages are "private" only in
the sense that they aren't linked from the public nav.

The `leads` table is the real exposure once it has rows: name, email, phone,
income, health status, tobacco use, coverage amount, monthly budget — per lead.

Add a real server-side auth check to `/dashboard` and all four generator routes,
plus the server functions behind them. A shared password gate is fine, but it
must be enforced server-side, not just in the client. Do this before anything
else.

## Priority 2 — The PNG export bug is in six places, not one

Symptom: exports come out as a full-length image with the actual content
scrunched into the upper-left corner, requiring manual cropping. Posted content
also looks fuzzy or blurry.

The cause is the same pattern repeated in six call sites:

```js
const rect = el.getBoundingClientRect();
const dataUrl = await toPng(el, {
  width: rect.width * 2,
  height: rect.height * 2,
  pixelRatio: 1,
  ...
});
```

`html-to-image`'s `toPng` does not scale the captured node to fill a larger
canvas. Telling it to output at 2x the measured size without also rendering the
content at that scale leaves the node at normal size in the top-left of a canvas
with 4x the area. That explains the framing bug, and it likely explains the
blurriness too — nothing actually gains resolution, so the output is a 1x render
in an oversized frame.

The six sites:

- `src/lib/carouselUtils.ts` — two calls (`downloadSlidePng`, `slideToPngBlob`)
- `src/lib/socialCardUtils.ts` — two calls
- `src/components/MemeGenerator.tsx` — one call
- `src/components/SavedConcepts.tsx` — one call

Fix: use `pixelRatio: 2` and drop the manual width/height doubling, or add
`style: { transform: 'scale(2)', transformOrigin: 'top left' }`. Apply the same
fix consistently across all six. Verify by running an actual export of a saved
carousel (there are saved rows in the dump) and checking both the framing and the
output resolution.

Then check legibility separately. Once the resolution issue is fixed, export a
slide with a long heading and a long body line and confirm nothing is clipped,
overflowing, or shrunk to an unreadable size. `EditableSlideCard.tsx` uses
`overflow-hidden` on several nested containers, which clips correctly on screen
but will also silently cut off text that runs long. Text and graphics on every
exported slide need to be crisp and fully visible at the size these get posted
at — this content is viewed on phones.

## Priority 3 — Content generator upgrades

Note what already exists before building anything, so you don't duplicate it:

- `generateScript` already returns `caption` and `hashtags` alongside the script.
- `getRandomTopics` already rolls 3 topics from a curated pool of 20+
  (`EXTRA_TOPICS` in `src/server/scriptGenerator.ts`).
- A regenerate button already exists, but it re-rolls the entire package.
- The carousel generator already produces captions and hashtags.

### 3a. Pain point selection (new — nothing exists for this)

Under each of the 3 rolled topics, let John select which specific pain point he
wants the content to address. Each topic in `EXTRA_TOPICS` should carry a small
set of associated pain points. The selected pain point should flow into the
generation prompt as an input, alongside the existing `targetViewer` and `payoff`
fields.

This applies to every generator, not just scripts — meme, carousel, and social
card should all take a topic plus a pain point.

### 3b. Multiple hook options with hook-only regenerate

Currently: one hook, or two if the A/B toggle is on.

Wanted: generate 2–3 hook options at once, each using a different mechanism, so
John can compare them. Add a regenerate that re-rolls **only the hooks** and
keeps the script, caption, and hashtags intact. The existing all-or-nothing
regenerate should stay available as a separate action.

### 3c. John's on-camera character must drive the copy (currently absent)

I grepped the whole codebase: the persona appears nowhere in any generation
prompt. This is the single biggest reason the copy has been underwhelming.

John's on-camera character is a **medieval tavern bartender** — warm, welcoming,
genuinely helpful, talking directly to the guests in front of him. Not a
salesperson, not a lecturer, not a hype account. Think of someone who leans on
the bar, tells you something useful about money that you didn't know, and
actually wants you to be better off for hearing it.

Every piece of generated copy needs to sound like that person speaking:

- Every generated script, spoken in that voice.
- Any on-screen text for b-roll videos, written in that voice.
- Slide text, captions, and meme copy, all the same voice.

Concrete requirements: second person, speaking directly to the viewer. Warm and
caring, never condescending. Informative first — the viewer should leave knowing
something. The medieval flavor is in the warmth and the direct address, not in
piling on "thee" and "hark"; it should feel like a real person, not a costume.

Add this persona to the shared system prompt for all four generators, and make
sure it holds across the whole output, not just the opening line.

### 3d. Plain language, no jargon

There is no anti-jargon instruction anywhere in the prompts right now. Add one to
every generator.

The audience is future clients, not other agents. Insurance and finance
terminology needs to be either avoided or explained in the same breath. If a term
like "rider," "term versus whole," "beneficiary," or "liquidity" has to appear,
the copy has to make it immediately understandable from context. The test is
whether someone with no financial background can read a slide once and both
understand it and see why it matters to them.

Prefer short, concrete sentences. Use real-life situations over abstractions. No
invented statistics.

### 3e. Tone options in every generator

Tone selection already exists in three generators — `TONES` in
`ScriptGenerator.tsx`, `CarouselGenerator.tsx`, and `SocialCardGenerator.tsx`
("Informative", "Warm", "Funny", "Mix / Surprise Me"), backed by `TONE_GUIDANCE`
maps in the corresponding server files.

The meme generator has no tone parameter at all. Add one, matching the existing
pattern. When the b-roll step is built, it needs tone selection too.

Important: tone is a variation *within* the bartender character, not a
replacement for it. "Funny" means a funny bartender, not a different person.
Make sure the persona from 3c survives every tone setting.

### 3f. Caption and hashtag parity across generators

The meme generator produces a caption but no hashtags. Bring every generator up
to the same output: caption options plus hashtag options. Reuse the hashtag
prompt approach already working in `src/server/carouselGenerator.ts` (6–10 tags,
mix of broad and niche, single-word with leading `#`).

### 3g. Unified generator hub (do this last)

Consolidate the four generator routes into one page with tabs — script, meme,
carousel, social card, and eventually b-roll — sharing one shell and one topic/
pain-point picker rather than four separate routes. This is the largest item and
the least functional payoff, so only do it if the work above is done and
verified. Do not let this refactor change any generation logic.

## Do not touch

- `src/server/scriptGenerator.ts`'s hook-generation prompt. It enforces a
  specific mechanism per hook type (curiosity gap, direct callout, contrarian,
  number-specific), requires the hook to be the first line and under 12 words,
  and includes an explicit self-check step. It is well above average and should
  not be rewritten. If hooks still feel weak, look at how topic, pain point,
  target viewer, and payoff reach the prompt — not the prompt itself.
- `EditableSlideCard.tsx`. It's correctly built as a fixed aspect-square element
  with `overflow-hidden`, so the on-screen render clips properly. Carry its
  structure forward as-is.
- API key handling. Confirmed server-only across all four AI-calling files.

## Cleanup

`html2canvas` is in `package.json` but is no longer used anywhere. Both
`MemeGenerator.tsx` and `SavedConcepts.tsx` now call `toPng` from
`html-to-image`; the only remaining trace of html2canvas is two stale code
comments. Remove the dependency and fix the comments. This is not a migration.

## Environment

`.env` needs `DATABASE_URL` and `ANTHROPIC_API_KEY` (see `.env.example`).
Deployment via `go-live.sh` additionally needs `VERCEL_TOKEN` exported, and the
Vercel project itself needs `DATABASE_URL` and `ANTHROPIC_API_KEY` set in its
dashboard. Run locally with `bun install` then `bun run dev`.
