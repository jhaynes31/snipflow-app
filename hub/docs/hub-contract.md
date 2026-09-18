# Hub Contract: Wellness Hub Foundation Spec

2026-09-18 · Jen. Revised the same day to match `spec-update-1.md` (names and theme).

## Naming

The user-facing name of the Hub is **The Shire**. It comes from `APP_DISPLAY_NAME` in `core/config.ts` and is never written into a screen by hand. In this document, "the Hub" is the internal name for the foundation; the words a person sees are always "The Shire."

The four first modules are Every Box, Tend (the support app), Heartwood Fitness (the fitness module; id and route stay `fitness`), and Love & Release. Module display names come only from each module's manifest.

## Purpose and how to use this contract

The Hub is one private wellness home for Jen and John, where each of them logs into their own profile and reaches every app they use together through tabs. The first four apps (called modules here) are Every Box, the fitness module, Love & Release, and Tend. More modules will be added later, so the Hub must make adding one routine.

This contract defines everything the modules share: login, profiles, privacy, reminders, gentle day mode, shame-free rules, design, and AI safety. Every module spec points back to this document.

**Instructions for Claude Code:**

- Build the foundation once, in shared code. Modules must use it and never re-implement login, privacy, reminders, or gentle mode.
- When a module spec seems to conflict with this contract, the contract wins. Stop and flag the conflict rather than choosing silently.
- Diagnose root causes before fixing bugs. Explain the cause in one or two sentences before changing code, and don't patch symptoms.
- Keep this contract updated in the repo as `/docs/hub-contract.md` whenever the foundation changes.

## Users, profiles, and the user manual

There are exactly two accounts, Jen and John, linked as partners. There is no public sign-up. Each account has one profile, and every module reads from it.

Each profile holds a **user manual** that the person writes and edits themselves in plain language. Modules and the AI coach use it as context:

| Manual section | What it holds |
| --- | --- |
| What I struggle with | Their own words for what's hard, in any terms they choose |
| Early warning signs | What it looks like when they're starting to slide |
| What helps | Actions, words, and conditions that help |
| What makes it worse | Things to avoid, including well-meant ones |
| How to love me when I'm low | Practical, emotional, and spiritual support, in their own words |
| Communication needs | For example: literal language, time to process, no surprise conversations |
| Sensory needs | Light, noise, touch, and texture preferences |
| Faith anchors | Scriptures, prayers, or worship songs that ground them (optional) |

Each manual section has its own privacy setting (see Privacy model). The manual starts nearly empty. The Hub offers a gentle guided setup that can be skipped and never nags.

Other profile fields: display name, photo, time zone, reminder preferences, and module-specific settings stored under that module's own key.

## Hub shell and home screen

The shell is the frame around every module: a top bar with the name The Shire, one tab per module, the check-in button, and the profile menu. The "How are you, really?" check-in button belongs to the shell, not to any module, and is visible on every screen. Tend enriches what it opens, but the button itself is always there.

The home screen greets the person by name ("Welcome home, Jen.") and shows, top to bottom:

1. **Heads-up cards** from the partner that are still open, newest first.
2. **Gentle day banner**, if either person has gentle mode on.
3. **Today across modules**: at most one small item from each module that has something worth showing, such as a fitness session or an Every Box category. Modules that have nothing to show stay silent.
4. **Module tiles** that open each module, drawn as little places in the village, each with its own icon and accent.

On phones, the tabs become a bottom navigation bar, and the check-in button floats in a corner. Each module also gets its own direct URL (for example, `/tend`) so it can be bookmarked or pinned as a phone shortcut. That way either person can go straight to what they need on a hard day without passing through anything else.

The home screen should be settable as John's browser homepage and installable as a phone app (PWA) with an icon badge.

## Module system and adding future apps

Every module registers itself with the Hub through one manifest file. Adding a new app means writing a manifest plus the module's own screens, with no changes to the shell.

Each manifest declares:

| Field | Purpose |
| --- | --- |
| `id`, `name`, `icon`, `route` | Tab and URL |
| `theme` | The module's own palette and accents inside the Hub frame |
| `todayWidget` | Optional small item for the home screen's "Today" row |
| `gentleModeBehavior` | What the module hides, softens, or offers when gentle mode is on |
| `headsUpTypes` | Heads-up cards this module can send, if any |
| `sharedData` | Which data types are shared by default (everything else is private) |
| `crossModuleHooks` | Events it emits or listens for (see below) |
| `usesAICoach` | Whether it calls the AI coach layer |

**Cross-module hooks** let modules help each other through named events instead of reaching into each other's data. For example:

- Tend emits `checkin.low`, and every module listens and responds through gentle mode.
- Tend emits `forecast.tenderWeek`, and the fitness module suggests lighter sessions that week.
- Every Box emits `category.stuck`, and Tend offers to open Project Thinker for it.
- Tend emits `loveAction.done`, and Every Box can count it toward a relationship category if the couple turns that on.

A module works fully on its own even if no other module is installed. Hooks are bonuses, never dependencies.

Every module is always on for both people (decided 2026-09-18). Each person can rearrange the tab order in settings.

## Privacy model

Everything a person writes is private to them unless it is shared on purpose. This holds in every module, and it is enforced in the database layer, not just hidden in the interface.

Every record has one of three visibility levels:

| Level | Who sees it | Examples |
| --- | --- | --- |
| Private | Only the author | Journals, loop lists, story checks, mood logs, Love & Release circles |
| Shared | Both partners | Every Box categories, heads-up cards, repair conversations, the Evidence Bank |
| Shared summary | Partner sees a summary the author approves | For example, "Jen's tender week starts Tuesday" without the underlying tracking data |

Rules:

- Private is the default for any new data type unless a module's manifest names it as shared.
- Sharing is always an explicit action, with a preview of exactly what the partner will see.
- A lock icon marks private items. A two-person icon marks shared ones.
- Either person can un-share something they shared, and it disappears from the partner's view.
- Neither account can view, export, or reset the other's private data. There is no admin override.
- Deleting something deletes it, rather than hiding it.
- Each person can export all of their own data as a readable file.

## Heads-ups and the reminder system

The Hub owns the one channel for reaching the partner. Modules never send their own notifications. They hand a heads-up to the Hub, and the Hub delivers it.

**A heads-up card** holds:

- Who sent it and when.
- A short, plain status line in the sender's words ("Rough day").
- What would help, chosen by the sender: space, quiet presence, practical help, words, or "please don't fix it."
- Do / Say / Skip suggestions, drawn from the sender's user manual.
- Response buttons: "I'm on it," "Send a hug," and "Can we talk later?"

The card stays open until the receiver responds or the sender closes it. The sender sees the response.

**Delivery uses three channels**, because generic push notifications get lost among everything else on a phone:

1. **Home screen.** Open cards appear at the top of the home screen, which John can set as his browser homepage.
2. **Icon badge.** The installed app's badge counts open heads-ups only, never chores or reminders.
3. **Calendar invite.** A recurring daily check-in invite links to The Shire. Time-sensitive heads-ups can also add a one-off calendar event if the sender chooses.

Push notifications are optional and off by default. Each person sets quiet hours. A heads-up marked urgent by the sender can break quiet hours. (Push delivery and quiet hours are not built yet; see "Build phases".)

## Gentle day mode

Gentle day mode softens the whole Hub at once when either person is struggling. It is per person: it changes that person's view of the Hub and tells the partner, but it does not change the partner's own view.

**It turns on** when a person taps the gentle day toggle in the top bar, or when a check-in comes in low and the person accepts the offer to turn it on. It never turns on silently.

**While it's on:**

- Every module applies its `gentleModeBehavior`. For example, Every Box rests non-urgent categories and the fitness module offers a short, easy session.
- Screens simplify: bigger buttons, at most three choices, and very little text.
- Nothing asks for input except the check-in button.
- The partner's home screen shows a quiet banner ("Jen's having a gentle day") with a link to her heads-up card, if she sent one.

**It turns off** by tapping the toggle, or automatically at the next morning's check-in if the person chooses "Feeling steadier." If they don't, it stays on. There is no time limit and no counter of gentle days.

## Shame-free design rules

Both users wrestle with shame and perfectionism, so the Hub must never make either of them feel behind, failing, or graded. These rules apply to every module, copy line, and notification, and they override any module spec.

**Never:**

- Streaks, or anything that can "break."
- Scores, grades, percentages of completion toward a personal standard, or leaderboards between the two users.
- Red overdue badges, missed-day counters, or "you haven't done X in N days" messages.
- Guilt copy such as "Don't forget!", "You missed…", or "Get back on track."
- Comparing one partner's activity with the other's.

**Always:**

- Treat "done" as the win, and "good enough" as done.
- Greet a return after a gap with "Welcome back," never with what was missed.
- Celebrate small actions specifically ("You got the first step down") rather than with generic praise.
- Offer the smallest possible version of anything (a 2-minute option, a one-line option).
- Make every reminder easy to snooze or dismiss without explanation.

**The one exception** is Every Box's freshness indicators, because noticing what needs tending is its whole purpose. Freshness stays inside Every Box, uses soft colors (never red), and is never counted toward anything elsewhere in the Hub.

`npm run check-copy` scans every screen for the forbidden phrases and fails the build if one appears.

## Visual design, accessibility, and low-demand mode

The Hub frame is a cozy village: green, mossy, woodsy, and welcoming, like coming home to a warm hearth at the end of a long day. Each module brings its own personality inside it. The fitness module keeps its sunflower and sunshine accents; Tend is a hearth corner of sage green, warm wood, and candlelight gold. Jen is a visual learner, so the Hub leans on icons, color, and simple diagrams over long text.

**Frame design** (from `spec-update-1.md`):

- Color tokens live in one theme file, `core/theme/tokens.ts`, in light mode (parchment) and dark mode ("lantern-lit evening"). Every text and background pairing passes WCAG AA in both modes, and a test enforces it.
- Headings in a warm, rounded serif (Fraunces); body text in a friendly sans-serif (Nunito), at least 16px.
- Rounded corners everywhere, round-topped cards, and arched, doorway-style tab buttons.
- One outline icon set (Lucide), leaning on garden, hearth, lantern, cottage, leaf, and path icons.
- Subtle wood-grain, paper, and moss textures, soft and flat. They turn off completely in the "quiet visuals" setting and in low-demand mode.
- Original artwork only: nothing borrowed from any book or film.
- Motion is minimal and respects the device's reduce-motion setting. No flashing, no sudden pop-ups, and no autoplaying sound.

**Accessibility and sensory comfort:**

- Text size and contrast controls in settings.
- A "quiet visuals" setting that mutes colors and removes all animation.
- Plain, literal wording in all copy. No sarcasm, idioms, or vague phrases like "soon."
- Clear, predictable layouts that don't move around between visits.
- Every screen reachable by keyboard and labeled for screen readers.

**Low-demand mode** is the visual side of gentle day mode: at most three large choices per screen, one idea per screen, and short text. Modules must include a low-demand version of their key screens.

## AI coach layer and safety guardrails

The Hub provides one shared AI coach service, powered by the Claude API, that any module can call. Modules must not call the API directly. Routing every call through one service keeps the safety rules consistent.

**How it works:**

- Each call includes the current person's user manual (only the sections they've allowed the coach to use) plus the module's own task prompt.
- The coach sees only the current person's private data, never the partner's. It can see the partner's manual sections that the partner has shared.
- The API key lives on the server only, never in the browser.
- Conversations are private to the person, and each person can delete them.

**Coach character (the base system prompt):** warm, plain-spoken, and practical. It gives concrete next steps over general comfort, uses literal language, and keeps answers short unless asked for more. It can draw on the person's faith anchors when they've enabled that.

**Hard guardrails (built into the shared service, not left to modules):**

- The coach is a support tool, not a therapist or doctor. It never diagnoses, never adjusts medication, and encourages professional care when patterns suggest it would help.
- **Crisis detection.** If a message suggests thoughts of suicide, self-harm, or being unsafe, the coach stops its normal flow. It responds with care and shows the 988 Suicide & Crisis Lifeline (call or text 988 in the US) and 911 for immediate danger. It offers to send the partner an urgent heads-up with one tap. This screen must also be reachable from a "Need help now" link in the profile menu at all times.
- It never takes sides in a conflict between the two partners. It helps each person understand themselves and the other.
- It does not endlessly repeat reassurance. When someone asks for the same reassurance again and again, it gently names the loop and offers a grounding or "sit with it" tool instead.
- It never shames, lectures, or uses guilt, in line with the shame-free rules.

**Safety plan:** each person can fill in a simple personal safety plan (warning signs, what calms them, people to call, reasons to hold on). It lives behind the "Need help now" link and is optionally shared with the partner.

## Tech stack and data architecture

The original recommendation was Supabase. Every Box already runs on Next.js with Convex and Convex Auth, and this contract says to keep Every Box's stack when it differs, so the foundation is built on the same stack. The trade-off is in `docs/foundation.md`, "Why Convex".

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js with TypeScript, installable as a PWA | One codebase for browser and phone, with icon badges |
| Database and login | Convex with Convex Auth (email and password; exactly two accounts) | Same as Every Box, so phase 2 is a move, not a rewrite. Clients can only reach data through Convex functions, and every function runs the privacy gate. |
| Live updates | Convex reactive queries | Heads-up cards appear instantly for the partner |
| AI | Claude API, called only from a Convex action | Keeps the key secret and routes everything through the guardrails |
| Calendar | Per-person `.ics` feed at a secret URL | Works with any calendar app, no extra accounts |
| Hosting | Vercel | Simple deploys from the repo |

**Repo layout:**

```
/app            Hub shell routes, home screen, settings
/core           config, theme, copy, modules registry, shell, ui, calendar, manual
/convex         schema, auth, privacy gate, profiles, manual, heads-ups, gentle mode, events
/modules/<id>   one folder per module, each with its manifest.tsx
/docs           hub-contract.md, spec-update-1.md, foundation.md, and one spec per module
```

**Core tables:** `profiles`, `userManualSections`, `headsUps`, `gentleModeState`, `events` (the cross-module event log), `checkIns`, `coachConversations`, and `safetyPlans`. Every owned table has `ownerId` and `visibility` fields, and `convex/lib.ts` enforces the privacy model on every read. Module tables live in the same schema, prefixed with the module id (Every Box uses `eb`), and follow the same rules.

## Build phases and moving Every Box in

Build the foundation first, then add modules one at a time. Each phase ends with something Jen and John can actually use.

| Phase | What gets built | Done when |
| --- | --- | --- |
| 1. Foundation | Shell, login, profiles, user manual, privacy, heads-ups, three delivery channels, gentle mode, shame-free copy, event bus | Both can log in, fill a manual section, and send and answer a heads-up |
| 2. Every Box | Move the existing Every Box code into `/modules/every-box` and connect it to the foundation | Every Box works as before, inside The Shire, using its login and reminders |
| 3. Tend | Build from its own spec | Check-in, core tools, and partner cards work end to end |
| 4. AI coach and safety | Shared coach service, crisis flow, safety plan | Crisis detection tested and "Need help now" works from every screen |
| 5. Fitness module | Build from its own spec | First generated plan runs inside The Shire |
| 6. Love & Release | Build from its own spec | Circles work with private-by-default data |

Deferred from phase 1 on purpose: optional push notifications and quiet hours (no channel exists yet to apply them to), and the safety plan editor (phase 4). The crisis screen with 988, 911, and the one-tap urgent heads-up is built.

**Moving Every Box in:** before changing any code, Claude Code should read the current Every Box project and write a short migration plan. The plan covers what it will keep, what it will switch to the foundation (login, reminders, notifications), and how existing data will move over. Jen approves the plan before migration starts. No existing data should be lost.

**Adding a future module:** write its spec with a reference to this contract, create its manifest, and build it in `/modules/<id>`. The shell should need no changes.
