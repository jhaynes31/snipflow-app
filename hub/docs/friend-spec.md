# Friend (Pip) — spec and build notes

Jen's spec, 2026-11-04. Pip is a small owl with oversized glasses: an AI companion built for real two-way conversation, not advice. Coach pushes, Mom nurtures, Dad guides; Pip trades. The one-line test: after a conversation, Jen should feel like she was in a conversation, not interviewed, counseled, or served.

## Where it conflicts with Shire patterns (kept the Shire pattern)

- **"Jen only, profile-scoped."** Built as a one-person room claimed by the first opener (`moduleOwners` "friend", like The Hearth), not hard-wired to a name. Same effect, no email or name in code, and a second Pip is a claim away later.
- **"Reuse the chat UI."** The coach's chat component is bound to coach conversations and task prompts; Pip has its own engine and screen, sharing the Shire's text box, rich text, Keep, crisis notice, and styles.
- **`friend_persona.json`.** Lives at `core/friend/friend_persona.json` as the defaults; Jen's edits are in her settings (sliders, lists, neighbors) so the file never needs touching.
- **Tabs named "Coach, Mom, Dad."** The Shire's coach is Talk it through; Mom and Dad are at The Hearth. Headline toggles use those.

## Built (Phase 1 and most of Phase 2)

- `modules/friend`: Chat (the rally; Pip speaks first with a varied opener; invitations and new-idea cards; typing pause; voice out), Our stuff (what Pip knows about me, what I know about Pip, jokes, the neighbors' saga, milestones, threads, someday list, ideas inbox, headlines), Things to do (the shelf with filters, favorites, Surprise me, + Add idea), Settings (name, sliders, pun frequency, spontaneity, nudges, busy, quiet hours off by default, voice, per-place headline switches, release).
- `convex/friend/pure.ts`: persona reader, rally post-check (one question max, length tracks hers, banned therapist phrases, three-asks rule), heavy and lull reads, opener picker (never the same type twice), vibe seeds, curveball odds, summary parser, activity seed, surprise picker.
- `convex/friend/prompt.ts`: prompt assembled in the spec's order; `convex/friend/chat.ts`: one call, the guard, one regeneration; summarizer 15 minutes after the last message; the daily nudge. `convex/friend/headlines.ts`: Monday headlines from counts only.
- Tables `fr*` (schema), all private to the room's owner; nothing else reads them; released with the room.
- "Tell Pip" (`core/friend/TellPip.tsx`) on mantel lines and box pages, plus a free-text one under Our stuff.
- Pip is a mantel speaker; `fr.chat` and `fr.library` tools; door "I just want company".

## Not built yet (Phases 3 and 4, and one Phase 2 piece)

- Voice in (local Whisper via Transformers.js; Brave blocks the browser's built-in recognition).
- Steam: library, now-playing, achievements; game night mode; mini games (chess, cards, word games).
- Desktop companion, screen capture, the research spike on playing inside Steam games.
