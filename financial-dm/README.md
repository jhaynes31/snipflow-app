# The Financial DM

Lead generation and content creation site for John's life insurance practice,
built as a Dungeons & Dragons flavored experience.

- **Public pages**: the landing page (`/`), the life insurance quiz
  "Roll for Initiative" (`/quiz`), and the financial health quiz
  "Roll for Wealth" (`/wealth-check`). Both quizzes end with a lead form and
  a hand off to John's Calendly.
- **Private pages** (password protected): the lead dashboard (`/dashboard`)
  and the content forge (`/generator`), which produces scripts, memes,
  carousels, and social cards in John's tavern bartender voice.

## Stack

React 19 + [TanStack Start](https://tanstack.com/start) (Vite) + Tailwind,
served by Bun locally and by a Vercel serverless function in production.
Data lives in a Postgres database on Neon. Content generation calls the
Anthropic API from the server only.

```
src/
  routes/            pages. Files under _admin/ require login.
  components/        UI pieces (quizzes, generators, previews, saved views)
  components/generator/  the shared topic/pain point picker, tone controls,
                     caption + hashtag panel used by every forge tab
  server/            server functions (database + AI calls). auth.ts is the
                     password gate, contentVoice.ts is the shared persona and
                     prompt rules, topics.ts is the topic pool with pain points
  lib/               client safe helpers (slide model, PNG export, text export)
public/              images: logo, dragon tiers, carousel themes
database/            SQL dump of the five tables plus notes
```

## Configuration

Copy `.env.example` to `.env` and fill it in:

| Variable            | Required | Purpose |
| ------------------- | -------- | ------- |
| `DATABASE_URL`      | yes      | Neon Postgres connection string |
| `ANTHROPIC_API_KEY` | yes      | key for the content forge |
| `ADMIN_PASSWORD`    | yes      | shared password for `/dashboard` and `/generator` |
| `AUTH_SECRET`       | no       | signs the login cookie; derived from the password when unset |

Never commit `.env`. The same variables must be set in the Vercel project
(Settings, Environment Variables) for the live site.

## Run locally

```bash
bun install
bun run dev        # http://localhost:3000
```

Other scripts: `bun run build` (production build), `bun run start` (serve the
build on port 3000 via serve.ts), `bun run publish` (build + restart, meant for
the original sandbox host), `bun run go-live` (deploy to Vercel).

Type check with `bunx tsc --noEmit`.

## Deploy

There are two ways to put the site live. Both need `DATABASE_URL`,
`ANTHROPIC_API_KEY`, and `ADMIN_PASSWORD` set in the Vercel project
(Settings, Environment Variables).

**Option A, connect the repository (recommended).** In Vercel choose
"Add New Project", import this repository, and set the Root Directory to
`financial-dm`. `vercel.json` already tells Vercel to install with Bun and
run `build-vercel.sh`, which produces a Build Output bundle in
`.vercel/output`. After that every push to the production branch deploys
automatically and no token is needed.

**Option B, deploy from a computer with the code.**

```bash
export VERCEL_TOKEN=...   # from the Vercel account that owns the project
bash go-live.sh
```

`go-live.sh` builds the same bundle, deploys it to production, passes any
values from a local `.env` as runtime variables, and prints the live URL.
The Vercel project, the Neon database, and this repository should all live
in accounts John controls.

## Authentication

There is one shared password. `src/server/auth.server.ts` issues an HMAC
signed, HttpOnly cookie that lasts 14 days. `src/routes/_admin.tsx` redirects
anonymous visitors to `/login` before any private page renders, and every
private server function runs the `requireAdmin` middleware, so the data is
protected even if the functions are called directly. Wrong passwords are
throttled per address. Only `saveLead` (the quiz submission) is public.

## Database

Five tables: `leads`, `saved_scripts`, `saved_carousels`, `social_cards`,
`meme_concepts`. Each server module creates or upgrades its own table on
first use with `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`,
so no separate migration step is needed. `database/the-financial-dm-dump.sql`
restores the schema and the saved content from the last export.

## Content voice

Every generator builds its prompt from `src/server/contentVoice.ts`: the
bartender persona, the plain language rule, tone as a variation within that
character, formatting rules, and the caption and hashtag rules. Topic and
pain point come from `src/server/topics.ts`. The hook rule in
`src/server/scriptGenerator.ts` is intentionally unchanged from the original
and should be left alone; adjust the inputs that reach it instead.

## PNG export

`src/lib/exportPng.ts` is the single export path for slides, cards, and
memes. It renders at a pixel ratio that yields at least 1080 px on the short
edge. Exports capture the on screen render, so export from a desktop width
window; slide text is sized in fixed pixels and clips at phone widths.
