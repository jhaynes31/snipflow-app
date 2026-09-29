# Tend: "What I Need Right Now" cards (built 2026-09-29 from Jen's spec)

Seed content: `core/tend/needCards/tend-need-cards.json`, loaded by
`core/tend/needCards/cards.ts`. No card text is hard-coded in a component.

- **Sender's flow** (`/tend/signal`): "I'm struggling" on Tend's Now. A grid of the ten
  cards (multi-select), then optional need types, intensity, and a note. Two taps is
  enough: a card, then Send. "Shutdown" on Now goes to `/tend/signal/shutdown` and
  sends at once. Cards with `nonverbal_mode` open the one-tap panel after sending
  (Stay near me, Give me space, Water please, Blanket please, Yes, No, I'm coming
  back); each tap notifies the partner. Confirmation: "John's been told. You don't
  have to do anything else."
- **Support view** (`/tend/support/<id>`): what was picked with the time; Do first as a
  big checklist (merged across cards, deduplicated, starred first, at most five);
  Say this; Avoid (softer); Practical, Emotional, Spiritual expandable with the ones
  matching the need types open; Signs; scripture. Several cards show in tabs. "I'm on
  it" notifies the sender; "Resolved" closes it. The Depression card's `safety` box
  always shows, never collapses, and never appears on the sender's side.
- **Personalization** (`/tend/need-cards`, owner only): edit, add, reorder, hide, star
  any item; add "say this" phrases; the plan for cards with `personalize_prompt`
  (shown until filled). Every save keeps the previous version (`tnCardHistory`, last
  twenty) for undo. Edits are keyed by profile so John's own set can come later; the
  seed set belongs to `owner_profile` (Jen), decided by `ownsSeedSet()`.
- **After a hard moment**: the day after a signal is resolved, Tend's Now offers "what
  helped, what didn't" with one-tap options from that card's items (`tnReflections`).
- **Notifications** are gentle: "Jen could use you right now 🌿", "Jen: Water please 🌿",
  "John's on it 🌿". Shutdown and intensity 3 bypass quiet hours.
- **Look**: soft colors, large targets, short text, no motion; reduced-motion respected.
- **Tables**: `tnSignals` (shared by design), `tnCardEdits` (shared), `tnCardHistory`,
  `tnReflections` (private).
