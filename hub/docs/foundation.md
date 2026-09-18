# The foundation, as built

Phase 1 of `hub-contract.md`. This is the map for anyone adding a module or changing shared code.

## Why Convex, not Supabase

The contract recommended Supabase for row-level security, then said to keep Every Box's stack if it differs. Every Box is Next.js 16 plus Convex plus Convex Auth, so the foundation uses the same.

What that trades:

- **Gained.** One login, one database, one deploy for every module. Phase 2 becomes moving folders rather than porting an auth system and migrating data between databases. Live updates for heads-ups come free with Convex queries.
- **Given up.** Postgres row-level security. In its place, the browser can only reach data through Convex functions, and every function that touches an owned record calls the privacy gate in `convex/lib.ts` (`access`, `requireOwned`). That is enforcement at the data layer, just written in TypeScript rather than SQL policies. The pure rules are in `convex/privacy.ts` and unit-tested.
- **Also given up.** Magic-link login. Convex Auth's email/password provider is used instead, the same as Every Box. Sign-up is capped at exactly two accounts in `convex/auth.ts`, and `HUB_ALLOWED_EMAILS` on the deployment can pin them to two addresses.

## Where things live

| Path | What |
| --- | --- |
| `core/config.ts` | `APP_DISPLAY_NAME` and friends. The only place the name "The Shire" is written. |
| `core/theme/tokens.ts` | Every color, light and dark. The root layout writes them to CSS variables. `tests/theme.test.ts` checks contrast. |
| `core/copy/strings.ts` | Shell copy. `core/copy/banned.mjs` is the forbidden-phrase list; `npm run check-copy` scans `app/`, `core/`, `modules/`. |
| `core/modules/types.ts`, `registry.ts` | The manifest type and the list of modules. |
| `core/shell/` | `HubShell` (auth gate, profile setup, view settings), `Nav` (top bar, doorway tabs, bottom nav, floating check-in, gentle toggle, profile menu), `HeadsUpCard`, `BadgeSync`, `ModuleFrame`. |
| `core/manual/sections.ts` | The eight user-manual sections and how heads-ups draw Do / Say / Skip lines from them. |
| `core/calendar/ics.ts` | Pure `.ics` builder for the calendar feed. |
| `convex/schema.ts` | Tables. Every owned table has `ownerId` and `visibility`. |
| `convex/lib.ts` | `requireMe`, `partnerOf`, `access`, `requireOwned`. Use these; never read another profile's rows directly. |
| `convex/events.ts`, `moduleHooks.ts` | The event bus. `emitEvent` on the server, `api.events.emit` from screens, `LISTENERS` for server-side reactions. |
| `app/[moduleId]/[[...path]]/page.tsx` | Serves every module's screens from its manifest. |
| `app/calendar/[token]/route.ts` | The per-person calendar feed. |

## Adding a module

1. Create `modules/<id>/manifest.tsx` exporting a `ModuleManifest` (see `core/modules/types.ts`). `name` is the only place the display name is written. `Screen` receives the path segments after `route`.
2. Add it to `MODULES` in `core/modules/registry.ts`. That is the one shared line.
3. Put the module's tables in `convex/schema.ts` with the module id as a prefix, each with `ownerId` and `visibility`. Put its functions in `convex/<id>*.ts` and go through `convex/lib.ts` for every read and write.
4. To react to another module's event, add a listener to `LISTENERS` in `convex/moduleHooks.ts`. To emit one, call `emitEvent` in a mutation or `api.events.emit` from a screen. Names look like `module.thing`.
5. To reach the partner, call `api.headsUps.send` with `sourceModule: "<id>"`. Never build a notification of your own.
6. A gentle day is a signal only (`useHub().gentle` tells you it is on) and must never change what your module shows. Design screens meant for hard moments with the low-demand layout from the start: at most three large choices, one idea per screen.
7. Run `npm run lint` (includes the copy check), `npm run typecheck`, and `npm test`.

Module settings for a person live under `profile.moduleSettings[<id>]`; write them with `api.profiles.setModuleSettings`.

## Running it

**On Vercel (the normal way, no terminal needed).** Create a Vercel project from this repo with **Root Directory** set to `hub` and one environment variable, `CONVEX_DEPLOY_KEY`, set for Production only. The build runs `scripts/vercel-build.mjs`, which on the first production deploy generates the Convex Auth signing keys, stores them and `SITE_URL` on the Convex deployment (nothing is printed), pushes the Convex functions, and builds the site. Later deploys see the keys already present and skip that step. Preview builds never touch the production deployment.

The deploy key needs these scopes: `deployment:deploy`, `deployment:env:view`, `deployment:env:write`, and optionally `deployment:logs:view`.

Set `HUB_ALLOWED_EMAILS` on the Convex deployment (Dashboard, Settings, Environment Variables) to the two addresses. The first two sign-ups become the two accounts either way; the allowlist just stops a stranger from taking a seat first.

**Locally (for development).**

```bash
cd hub
npm install
npx convex dev          # first run creates a Convex project and writes .env.local
npx @convex-dev/auth    # one time: sets JWT_PRIVATE_KEY, JWKS and SITE_URL on the dev deployment
npm run dev             # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Phase 1 acceptance, walked through

- **Both can log in.** `/login`, email and password, two accounts maximum. First sign-in asks for a name and time zone, then opens the home screen.
- **Fill a manual section.** `/profile`. Each section saves privately, and "Share with …" shows the exact text (or the one-line summary) before it goes.
- **Send and answer a heads-up.** `/heads-up/new` previews the card, `send` puts it on the partner's home screen, badge, and calendar feed (if chosen); the partner taps "I'm on it," "Send a hug," or "Can we talk later?" and the sender sees the response on their home screen.
- **Gentle day.** The top-bar toggle, or the offer after a low check-in. The partner sees only a banner. "Feeling steadier" at the next check-in turns it off.
- **Need help now.** In the profile menu on every screen, on the login screen, and at `/help-now` without signing in.
