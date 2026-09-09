# The Financial DM: Full Project Export
This folder contains everything needed to rebuild and redeploy The Financial DM
from scratch. Everything is packaged as zip files. Unzip each one into a folder
to use it.

## What is in this folder
- `source.zip`  The complete site source code. This is the TanStack Start app
                (React + Vite + Tailwind) served on port 3000. It includes the
                landing page, the Roll for Initiative quiz, the Roll for Wealth
                quiz, the D&D Meme and Caption Generator (John only), the lead
                dashboard, and the Social Card Generator (John only). It also
                includes the deployment scripts (go-live.sh, publish.sh,
                build-vercel.sh) so you can redeploy to Vercel.
- `database.zip` The database dump (the-financial-dm-dump.sql) plus
                snapshot-notes.txt with row counts and the dump method.
- `brand-assets.zip` Logos, flyers, seed fact bank, dragon art source files,
                and carousel themes.
- `.env.example` A template file. Copy it to `.env` and fill in the two
                secret values. See "Where to get the real secrets" below.
- `README.md`  This file.

## Restore the database on a new Postgres or Neon instance
The dump is a plain SQL file produced by pg_dump version 18.6, so it restores
on any Postgres 15 or newer (the app only needs the five tables, nothing else
from the server).

1. Unzip `database.zip` to get the-financial-dm-dump.sql.
2. Create an empty database.
3. Run the dump against it:
   `psql "$DATABASE_URL" -f the-financial-dm-dump.sql`
   where DATABASE_URL is the connection string for the new database.
   If you are using Neon, you can also use the Neon import tool in the Neon
   console and point it at the-financial-dm-dump.sql. The dump uses COPY
   blocks, so either method loads the rows intact.

The dump creates five tables: `leads`, `meme_concepts`, `saved_scripts`,
`saved_carousels`, and `social_cards`.

## Run the site locally
1. Unzip `source.zip` into a working folder.
2. Copy the template and fill in the values:
   `cp .env.example .env`
   DATABASE_URL and ANTHROPIC_API_KEY are required for the site to work.
   ADMIN_PASSWORD is the shared password for John's private tools (the lead
   dashboard at /dashboard and the content forge at /generator). Without it
   those pages and their server functions stay locked. AUTH_SECRET is optional
   (see .env.example).
3. Install dependencies:
   `bun install`
4. Start the dev server:
   `bun run dev`
   The local site runs on port 3000.

## Build the site
`bun run build`
This produces the production build. To preview it:
`bun run start`

## Deploy to Vercel
This project deploys to Vercel. The included `go-live.sh` script handles the
deploy. It sources the local `.env` file, so DATABASE_URL and
ANTHROPIC_API_KEY must both be set in `.env` before you run it.
In addition, the Vercel project itself must have these environment variables
set: DATABASE_URL, ANTHROPIC_API_KEY, and ADMIN_PASSWORD (plus AUTH_SECRET if
you use one). Set them in the Vercel dashboard under Project Settings,
Environment Variables. go-live.sh also passes them from .env on each deploy. The deployed app reads them from the
Vercel environment, so the site keeps working even before you create a local
.env on the new machine.
The deploy script also needs the Vercel token. It reads the token from the
environment variable VERCEL_TOKEN. Set it before running the script:
`export VERCEL_TOKEN=(your token)`
Then deploy:
`bash go-live.sh`

## Where to get the real secrets
- DATABASE_URL: the Neon console. Open your Neon project, copy the connection
  string from the Connection Details or the SQL editor. Use the pooled or the
  direct endpoint, either works for the app.
- ANTHROPIC_API_KEY: the Anthropic console, under API Keys. Create a key and
  copy it.
- ADMIN_PASSWORD: choose it yourself. It is the only credential for the
  private tools, so make it long. Changing it signs every browser out.

Never commit the real `.env` file anywhere. The `.env.example` template is the
only env file that belongs in source control.

## Notes for anyone restoring this project
- The `public/` folder inside `source.zip` holds the dragon tier art and other
  static images used by the quizzes, so it must be deployed alongside `src/`.
- The five database tables above are the only tables the app uses. If the
  production database later gains more tables, re run pg_dump to refresh this
  export and update the row counts in snapshot-notes.txt.
- The content forge (script, meme, carousel, and social card generators at
  /generator) calls the Anthropic API, so it needs a valid ANTHROPIC_API_KEY
  in the environment where it runs (local or Vercel).
- The old per tool routes (/script-generator, /meme-generator,
  /carousel-generator, /social-card-generator) redirect to the matching tab
  of /generator, so existing bookmarks keep working.
- Private pages: /login is the password gate. /dashboard and /generator
  require a signed in session; every server function behind them checks the
  session on the server as well.