# Kept Word and Solid Ground: Spec (Hub Modules)

Written 2026-09-19 from Jen's brief. Two modules, built in this order: Solid Ground
(Jen's alone), then Kept Word (both). Plus one Hub-level feature, Seasons (the pattern
report), specified at the end. Both modules follow the Hub Contract in full: privacy
gate on every record, shame-free copy, gentle day as a signal only, module autonomy.

## Why

Jen is carrying two things at once: John's pattern of saying and not doing, and her
own pattern of overfunctioning, managing, and rescuing him from his consequences, so
that her security ends up living in his hands. She is also worn out by hard
conversations. She started a "what he said vs. what happened" list and found it both
validating and corrosive.

**Design stance:** keep the record, but Jen stops being the one who keeps it. Give Jen
a private place that is only about her own change. Give both of them a shared place
where John's word is logged by John and read back to both without editorial. Never put
"be more grateful" on Jen's side of the scale; John's kept promises show up because the
record is accurate, not because Jen was assigned to notice them.

Neither module takes sides. The trust repair itself is counselor work; these sit under it.

---

## Solid Ground (working name; Jen to choose)

**For:** Jen only. A visible tile in the village that only Jen can open.

**How "only Jen" works:** the first person to open the tile claims it ("This is my
room"). After that, the other person opening it sees one line: "This room is Jen's."
No email or name is written in code; the claim lives in a tiny `moduleOwners` table.
Every record inside is owned by Jen with `visibility: "private"` and there is no
sharing switch anywhere in the module. The partner's account cannot read a single row,
enforced in the Convex functions, not the screen.

**Places inside it:**

| Place | What it does |
|---|---|
| Now | The four tools below as big buttons, plus "What I will and won't do" read-only at the top when it has content. Low-demand design. |
| Whose is this? | Something has landed. Write it in one line, then sort it: mine to carry / his to carry / not mine at all. Optional line: "what I'll do about the part that's mine". Saved. Two minutes. |
| The pause before rescuing | Four questions, one per screen: If I do nothing, what happens? Who does that land on? What am I afraid of? What do I need right now? Ends with "I'm going to step in", "I'm going to let it land", or "I don't know yet". No wrong answer. Can end in a Tend tool (Ground Me, Sit With It) or nothing. |
| Let it land | The log of times Jen didn't fix or manage it, written in her words, with how it felt after. This is her evidence of her own change. Reread on hard days. Never shows a count of John's failures; it is only ever about what Jen did. |
| Where my security is sitting today | One tap, any day, optional: in John / in others / in me and God / mixed. No score, no chart with a target line. A calm monthly view shows the taps as dots so she can notice drift over months. |
| My own life | The things that are hers: people, rest, work, faith, play, body. Each with a small "one way back in" line she writes. On a day she marked "his to carry" or "let it land", Now offers one of these. |
| What I will and won't do | Her boundaries in her words, written on a steady day. Shown at the top of Now when it has content. Never sent to John from here. |

**Data:** `sgSorts`, `sgPauses`, `sgLandings`, `sgSecurityTaps`, `sgOwnLife`, and the
boundaries text in `moduleSettings.solidGround`. All private, all deletable, exportable
as plain text from Settings like everything else.

**Cooperates with:** Tend's tools by link only. Emits nothing to the partner. Listens
to nothing. Seasons (below) may read Jen's own Solid Ground data for Jen's own report
only, and only the counts and dates she allows.

**Copy rules on top of the Hub's:** never "you rescued him again"; never "how many
times John"; the log of landings is titled by what Jen did, not by what John didn't.

---

## Kept Word

**For:** both. Shared by nature, like Every Box. John does the writing.

**The record:** a word is one thing John said he would do: what, by when (a day, or
"no date" for ongoing), and for whom. Only John creates words. Jen can add an "I heard
you say" draft; it becomes a word only when John confirms or edits it. Until then it
shows to both as "waiting for John".

**Closing a word:** the app asks John, never Jen. Kept / Not yet / Didn't. For
"Didn't" he can pick what got in the way: forgot, overcommitted, avoided, changed my
mind and didn't say, something outside my control. No essay required; a line is
optional. Jen can see all of it. Jen never marks a word herself.

**Renegotiating counts as honesty:** before the day comes, John can say "I can't keep
this as said; here's what I can do", and the word becomes a new word with the old one
shown as renegotiated, not broken. After the day has passed, that option is gone; only
Kept / Not yet / Didn't remain.

**The week, put together by the app:** each week (day chosen in Settings) Kept Word
writes the week for both of them: every word, with its outcome, in plain words. Jen
never writes it, never sends it, never edits it. It appears in both home screens and
in the Kept Word "Weeks" place. Both see exactly the same page.

**No streaks, no percentages, no comparisons.** The week shows the list. It does not
say "3 of 7". It does not color John red. What John kept sits beside what he didn't,
in the same type, in date order. Accuracy is the point.

**For John, built to help him show up:**

- "Say it smaller": when adding a word, a hint to make it small enough to keep this week.
- One-tap links from any open word to Smallest Step, Focus Mode, or an Every Box
  commitment (via the existing `project.sendToEveryBox` style hook, new event
  `word.sendToEveryBox`).
- A private-to-John pattern notice, only after several closed words: "Most of your
  'didn't' words were 'forgot'. Tend's Focus Mode and an Every Box commitment might
  help." Jen never sees pattern notices; she sees the words.
- Reminder the day before a word is due, to John only, in his own reminder settings.

**For Jen:** nothing to do here except read, and add "I heard you say" when she wants
it on the record. What she will do if a word isn't kept is hers alone and lives in
Solid Ground.

**Places inside it:**

| Place | What it does |
|---|---|
| Open words | Every open word, soonest first, with the due day. John: add a word, close a word, renegotiate. Jen: add "I heard you say". |
| Weeks | The app-written weeks, newest first. Same page for both. |
| Kept | Every word John kept, in date order. Nothing else on this page. |
| Settings | Week day; John's reminder; John's pattern notices on/off (John only). |

**Data:** `kwWords` (ownerId John, visibility shared, text, forWhom, dueDay, status
open/kept/notYet/didnt/renegotiated, reason, note, replacedBy, createdBy,
confirmedAt), `kwWeeks` (shared, weekStart, body, generated at), `kwHeard` (Jen's
drafts, shared).

**Emits:** `word.kept`, `word.didnt`, `word.sendToEveryBox`. **Listens:** nothing.
Seasons reads the shared record for both people's reports.

**Only works if John chooses it.** If he doesn't use it, that is information too, and
Jen gets it without writing a line. The module says this nowhere; it is simply what
happens.

---

## Seasons (Hub feature: the pattern report)

Jen's ask: all the apps together, cohesively, put together data of our patterns for
each other and individually, then a well broken down and explained report at chosen
intervals (weekly, every two weeks, monthly, or all), so we can see tools used vs. not,
progress, change, and growth (our brains minimize it), and the areas to develop.

**Two reports, never one:**

1. **My season.** About me, for me. Built from my own data in every module: check-ins,
   tools used and which helped, Solid Ground entries (Jen), open and kept words
   (John), Every Box tending, Love Menu actions I did, repairs I took part in. Written
   by the coach in plain, warm words from structured counts the app prepares, with
   the coach told: name growth specifically, never shame, never compare to the
   partner, and offer at most two areas to grow with one concrete next step each.
   Private. The other person never sees it.
2. **Our season.** About us, for both, identical for both. Built only from data that
   is shared by nature or that each person switched on: heads-ups sent and responded
   to, love actions done, repairs completed, the Kept Word record, tender weeks
   announced, Every Box weekly reviews. No private counts leak in: Jen's Solid Ground
   never appears here; John's pattern notices never appear here; tool use appears
   only for a person who turned on "share which tools helped me" (already a Tend
   setting). Both see the same page at the same time.

**Rules that hold in both:** no scores, no percentages, no comparisons between the two
people, no "you missed", no "you didn't use". "Tools you didn't use" is phrased as
"tools that were there and might fit next time", and only in My season. Growth is named
with specifics ("you let it land four times this month; in July that was once").

**Interval:** each person chooses weekly, every two weeks, monthly, or all of them, and
the day they arrive. Our season arrives on the interval both share (default monthly)
and only when both have it on. Reports land on the home screen and the calendar feed.
Each report can be deleted by its reader; Our season is deleted for both by either.

**Build after Kept Word**, because it needs that record to be worth reading.

---

## Build order and done-when

| Step | What | Done when |
|---|---|---|
| 1 | Solid Ground: claim, the six places, private tables, export | Jen claims it, uses every tool, and John's account cannot read a row |
| 2 | Kept Word: words, heard drafts, close, renegotiate, the app-written week, Kept page | John logs and closes a word; the week appears for both; Jen never has to write anything |
| 3 | Seasons: My season and Our season with intervals | Both reports arrive on the chosen day and no private count appears in Our season |

**Open decisions:** the name for Solid Ground (Jen); whether John wants the day-before
reminder on by default (John).
