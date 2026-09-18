# The Shire

One private home for two people and the apps they use together. This folder is the
Hub foundation from `docs/hub-contract.md`: login for exactly two accounts, profiles
with a plain-language user manual, a privacy gate on every record, heads-up cards
delivered through the home screen, the app-icon badge and a calendar feed, gentle day
mode, and the module system the four apps plug into.

Read `docs/hub-contract.md` for the rules, `docs/spec-update-1.md` for the names and
theme, and `docs/foundation.md` for where things live and how to add a module.

Deploying is a Vercel project with **Root Directory** `hub` and one variable,
`CONVEX_DEPLOY_KEY`; the build configures the login keys on Convex by itself.
For local development:

```bash
npm install
npx convex dev
npx @convex-dev/auth
npm run dev
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Deployed on Vercel as the `the-shire` project (root directory `hub`).
