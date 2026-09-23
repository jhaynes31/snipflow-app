# The Hearth: Spec (the third door in Re-Centered, Jen's room)

Written 2026-09-23 from Jen's brief. A room for one daughter: a father's chair and a
mother's table for the daughter who had two parents who never acted like them. Follows
the Hub Contract in full: privacy gate on every row, shame-free copy, module autonomy,
no scores, no streaks, no comparison.

## Why

Jen's parents were present and absent at once. Her father was verbally abusive,
especially about her body, her appearance and her weight. She is strong, tough, wise,
full of grace and patience, carries a lot of lived experience that no one asks for, and
is tired of being the one who mothers everyone. She wanted the opposite of what she
got: a father's voice that is affirming, kind, encouraging, empathetic and protective;
a mother's voice that is extensive (advice, encouragement, life skills, Biblical
equipping, marriage advice, nurture, gentleness, tenderness), with a self-care and
teaching shelf (hair for wavy/curly hair on autoimmune days, simple makeup and style
from what she likes, hygiene and skin care for oily skin and large pores, natural and
holistic), advice for the emotionally intelligent and available Christian woman, wife
advice that aligns with the Word and is not the watered-down Proverbs 31 woman,
somewhere for her wisdom, and rooms for her inner child and inner teenager.

**The difference from Metamorphosis:** John's room equips a man still finding out who
he is, so it is a quest with a Character Sheet. Jen knows who she is. What she didn't
get was parents. The Hearth does not build her; it looks after her.

**The one test:** does this make Jen more looked after, or more managed? If the second,
it doesn't go in.

## Ownership

Same lock as Metamorphosis (`convex/rooms.ts`, module id `hearth`). The door is visible
to both inside Re-Centered; before it is claimed it says "For one person; the first to
open it keeps it." After that the other account sees "This room is Jen's." Every row is
owned and private, except What I know entries she shares one at a time. Releasing the
room wipes `hhKnow` and `hhLetters` and the room's coach conversations.

## The two voices

Both live in `convex/coach/prompt.ts` (`FATHER_VOICE`, `MOTHER_VOICE`, `HEARTH_SHARED`,
`HEARTH_TASKS`, `hearthVoiceFor`) and are appended to any coach task starting with
`hearth.`. Shared rules: they are not her real parents and never pretend to be; they
never mention, defend or judge her real parents; they never comment on her weight, size
or shape and never praise her appearance in a way that depends on the day; she is the
daughter in here, not handed tasks; they know her conditions (autoimmune, POTS-type,
hypermobility, MCAS-type, AuDHD, CPTSD) and that rest is not laziness; scripture only
with a sure wording and a reference, never as a rule.

- **The Father's chair** (`core/hearth/father.ts`): He'd say (24 daily words, some with a
  passage), Ask him (`hearth.father`), Tell him what happened (`hearth.told`, listens
  first, then the protective thing), In his eyes (18 lines that are the opposite of what
  was said about her body, plus `hearth.eyes` where whatever she writes, he answers with
  the truth a father should have said; never weight, never a suggestion to change
  anything), What a father teaches (money, cars, reading a man, standing your ground,
  negotiating, fixing things, safety, what I'm proud of), and a blessing to read aloud.
- **The Mother's Table** (`core/hearth/mother.ts`): She'd say (24), Come sit
  (`hearth.sit` plus cards: sick day, being tucked in, after you've cried, being held,
  gentleness practiced, tenderness, when it's all too much, what I'm proud of), Ask her
  (`hearth.mother`), What a mother teaches (14 life-skill cards), Equipped (13 women
  who were actually in the text, passage first: Deborah, Jael, Abigail, Ruth, the
  Shunammite, Huldah, Shiphrah and Puah, Esther, the Syrophoenician woman, Mary of
  Bethany, the woman at the well, Mary Magdalene, and Proverbs 31 read as eshet chayil),
  For my married daughter (truth, sex, money together, fighting well, when he goes
  absent, submission honestly, stay yourself, delight), The available woman (8 cards,
  grace and steel), Her body (8 cards, never a word about size), and a blessing.
- **Her care shelf** (`core/hearth/care.ts`): Skin (morning, evening, weekly, flare day;
  oily, large pores, natural), Hygiene (shower in order, sink bath, teeth, sweat and
  folds, wash schedule, hands and feet, period care), Hair (12 cards with numbered steps
  and line-drawing glyphs, `modules/hearth/Glyphs.tsx`: wash day, product while soaking
  wet, plop, air dry and scrunch out the crunch, diffuse seated, sleep, day-two refresh,
  flat roots, frizz, low-energy protective styles, flare-day hair, what to buy, flaxseed
  gel), and Face and style (an in-app intake, multi-select, stored in
  `moduleSettings.hearth.style`; `styleSuggestions()` turns it into colors, clothes,
  face and a morning in her minutes; the mother's voice reads the intake via
  `styleSummary()` for `hearth.care`).

## What I know

`hhKnow`: topic, title, text, ready, visibility. Private by default. "Ready" marks the
version she'd hand someone. "Share with John" flips visibility to shared; John reads
them on his partner page under "From Jen's table" (`hearth.entries.sharedWithMe`). The
coach anywhere in The Shire gets her entries as `known` (Talk it through, Re-Centered,
Tend, and the Hearth) and hands them back in her words, never reworded (`hearth.know`
also refuses to improve them).

## The girl and the teenager

`hhLetters`, always private. The girl is five to seven; the teenager is twelve to
sixteen (Jen's ages). Prompts: what she loved, what she needed to hear, a letter to her,
a letter from her, what she was right about (teen only), what she'd do today. "Let a
parent speak to her" opens `hearth.girl` / `hearth.teen` with Mom or Dad chosen; the
voice speaks to the child at her age (`LITTLE_VOICE_NOTES`). The crisis notice watches
the text; Need help now and Talk it through are on the page; nothing asks her to
remember anything.

## Left out on purpose

Points, streaks, unlocks, comparison to other women, anything the voices say about
her real parents, any comment on weight. Blessings are static content Jen edits by
asking; if she wants to write her own, that's a later table.
