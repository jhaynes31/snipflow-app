# Love & Release

A faith-centered people-pleasing recovery companion, built for a CPTSD and neurodivergent brain. Private by design: everything lives on your device, with no accounts, no analytics, and no server.

## Running it

```bash
cd love-and-release
npm install
npm run dev        # local dev server
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run typecheck
```

Deploy `dist/` to any static host. `vercel.json` includes the SPA rewrite so deep links work. The app is an installable PWA: open it on your phone and use "Add to Home Screen."

## What's inside

| Route | Module |
|---|---|
| `/` | Home: today's truth, **Something stung**, quick links, **I'm hurting** |
| `/pause` | Pause: breathing circle, 5-4-3-2-1, name what I feel, hold a truth |
| `/check-in` | Fact vs. Story stepper (every step skippable, auto-saved draft) |
| `/jesus`, `/jesus/:id` | Walk With Jesus library, tag filter, card detail, save to Truths |
| `/truths`, `/hurting` | Truths Deck: add, edit, star, tag; "I'm hurting" view |
| `/boundaries` | Boundary Builder: drafts, templates, gentle checks, rehearsal, "I sent it" |
| `/circles` | Circles: concentric rings with drag-to-move, list view, Unsure and Released tabs |
| `/circles/why` | Why circles? Jesus' circles and supporting verses |
| `/circles/layers`, `/circles/setup` | Define my layers: meaning, access, expectations, entry criteria, exit signals |
| `/circles/move/:personId` | Move Review: closer, further out, or release, with gentle suggestions |
| `/circles/flags`, `/people/:id/flag` | Red flags library and watch-note logging with a hypervigilance check |
| `/circles/boundaries` | Boundaries by layer, with per-person overrides |
| `/circles/review` | Gentle periodic circle review |
| `/people/:id` | Person profile: ring, green flags, watch notes, disclosures, reciprocity, moves, linked entries |
| `/unhooked` | Unhooked home: in-the-moment tools, education, beyond the loop, Jesus, growth, support |
| `/unhooked/loop` | "I'm in a loop" flow: breathe, name it, one tool, one true thing, wrap up |
| `/unhooked/tools/:tool` | Standalone tools: breathing, grounding, defusion, urge surfing, delay/shrink, uncertainty, close the file, before-you-send, one prayer, values action, body check, self-compassion |
| `/unhooked/learn/:id` | Education cards: the cycle, relationships, scrupulosity, thoughts are not sins, conscience vs. OCD |
| `/unhooked/me`, `/unhooked/values` | Who I am beyond the loop, and my values |
| `/unhooked/jesus` | Anxiety and grace cards, grace truths, breath prayers, passages, prayer guardrail |
| `/unhooked/map`, `/unhooked/ladder` | Trigger and pattern map, exposure ladder with practice sessions |
| `/unhooked/reassurance`, `/unhooked/progress`, `/unhooked/plan` | Reassurance plan, skills garden and freedom moments, relapse plan |
| `/unhooked/support` | Therapist contact, finding ERP support, crisis lines |
| `/release`, `/release/new` | Release Journal (Gethsemane prompts) |
| `/wins` | Wins log and "how far you've come" |
| `/history` | Everything, filterable by type, person, tag, date |
| `/settings` | Theme, text size, reduced motion, passcode, reminders, export/import, reset |

## Structure

- `src/db/` Dexie (IndexedDB) schema, types, seeding
- `src/data/` seed content: Truths, Walk With Jesus cards, situation tags, quick-select options
- `src/lib/` passcode hashing, drafts, backup, speech, reminders, settings
- `src/pages/` one file per screen
- `src/components/` shell, chips, stepper, confirm sheet, voice textarea
- `src/styles/global.css` design tokens (warm light and soft dark), reduced-motion handling
- `scripts/make-icons.mjs` regenerates the PNG app icons with no native dependencies

## Notes

- Scripture is referenced and paraphrased in-app; no verse text is copied from a licensed translation.
- The passcode is a local convenience lock stored as a salted hash. It is not encryption.
- Reminders use the Notification API and only fire while the app is open or installed and running.
- Voice entry uses the Web Speech API where the browser supports it; typing is always optional.
- Unhooked never offers reassurance on demand. The loop-detection guardrail notices repeated opens of the same tool, truth, or card within 20 minutes and offers urge surfing instead. Grace truths and prayers are offered once per session.
- Free-text fields in Unhooked run a small crisis-phrase check and surface crisis-line information when it matches.
