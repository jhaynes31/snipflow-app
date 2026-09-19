# App ideas for The Shire

Brainstormed 2026-09-19, parked until Jen picks which to spec. Every one follows the
Hub Contract: private by default, two people, no streaks or scores, nothing that shames,
gentle day is a signal only, and each app minds its own business while sharing what
helps through the event bus.

| Working name | Area | The idea | Cooperates with |
|---|---|---|---|
| Hearth | Faith | Private prayer lists, a shared list you both pray over, answered prayers kept to reread on low days, a scripture of the week picked together, a "pray for me about this" heads-up type. Never tracks whether you prayed today. | Feeds Tend's Anchor tool so faith anchors live in one place |
| The Storehouse | Finances, for two | A calm shared view of what's due this month and what's handled; a "big purchase pause"; a private money-worry note each person can choose to share. Stays small and feeling-focused, since John has his own financial software. | Tend's Pause Before Big Moves rule |
| The Pantry | Meals and groceries | A rotating list of meals you both actually eat, sorted by how much energy they take, so a heavy day only offers low-energy meals. A shared grocery list. | A low check-in in Tend quietly moves easy meals to the top |
| The Garden | Home and chores | Every household task is a plant that needs tending, in the spirit of Every Box freshness. No due dates. Either person can water a plant or ask for help with one. | Gentle day makes no plant look wilted |
| The Lantern | Memories and gratitude | One optional line a day, private or shared: something good, something funny, something noticed about each other. A "this day last year" home card. | Feeds Tend's Evidence Bank when chosen |
| The Almanac | Household calendar | Birthdays, appointments, medication refills, and the tender-week forecast on one shared calendar, extending the existing calendar feed. | Calendar feed, Tend forecast |
| The Green | Date nights and rest | A jar of date ideas by cost and energy level, a shared someday list, and a simple rest planner: who needs a quiet evening this week. | Tend's Love Menus |
| The Study | Learning together | Books, sermons, podcasts, or courses each person is working through, with a place to leave each other a note about them. | Notes between partners |

Suggested first specs: Hearth and The Pantry. Names are placeholders until Jen chooses.

Still planned from the original contract: Heartwood Fitness (phase 5) and Love & Release (phase 6).

---

## The faith app (Jen's own idea, 2026-09-19): notes toward a spec

Jen's brief, in her words: a faith-based app rooted in the simplicity and truth of the
Gospel of Jesus Christ, focused on being like Jesus, learning from his ways, and
following his example in all areas (managing the home, marriage, people, unexpected
circumstances). A way to tend to a relationship with Jesus as neurodivergent people who
generally forget to read daily. Both Jen and John grew up with religious and church
trauma; they know religion so well it gets in the way of Jesus. The focus is building
and maintaining a relationship with Jesus. Built-in tools to understand the Bible (Old
and New Testaments) and to combat lies and shame-based identities.

**The one test:** does this help John or Jen know Jesus better today, or does it just
help them feel religious? If the second, it doesn't go in.

**Ruled out:** reading plans with days to catch up on; streaks, badges, counts; a
devotional voice; "quiet time", "devotions", "backsliding", "conviction", "should";
any notification that the app misses you. The app gets its own banned-words list that
Jen and John add to.

**Working names:** The Well (John 4), Emmaus (Luke 24), Abide (John 15). Jen to pick.

**Places inside it (proposed):**

| Place | What it does |
|---|---|
| Today | One small thing whenever you open it, not on a schedule: a short passage (Gospels first), one plain sentence on what Jesus did or said, one question to carry. Two-minute version and read-aloud. Never mentions the gap since last time. |
| The Ways of Jesus | His example organized by real life: home, marriage, people who hurt you, money, rest, unexpected trouble, anger, grief, being misunderstood, being wrong, being tired. What Jesus did and said, not rules drawn from it. Claude drafts from the Gospels; Jen and John review every line. |
| The Bible, with a guide | Full Bible reader; a "Where am I?" card per book (who, to whom, why, how it points to Jesus); plain-words glossary for churchy terms; a thread of Jesus through the Old Testament; "ask about this passage" with the coach. Coach rule: quote scripture only from the built-in text, never from memory; say "Christians read this differently" instead of picking a side. |
| Lies and truth | Cards pairing a lie with what Jesus says and does. Identity lies ("I'm too much", "I'm lazy", "I'm a burden") and religious lies ("God is disappointed when I don't read", "I have to earn it", "doubt is disobedience", "my needs are selfish"). Personal lie cards with the truth found. Offered by Tend's Shame Interrupter; saved truths can go to the Evidence Bank. |
| Untangle | The church-trauma tool: two columns, "what I was taught" and "what Jesus actually did". The person writes the first; the app helps find the second in the Gospels. No one grades it; the coach points to text and never declares doctrine. |
| Talking with him | Prayer in your own words, no formulas. Lament allowed, Psalms at hand. An "I can't pray right now" button that shows one line and nothing else. A "pray for me about this" heads-up to the partner (the Hub's prayer help kind). |
| Remembering | Private log of times he showed up, to reread on low days. Tend's Anchor tool draws from this so anchors live in one place. |
| Together | A passage one marks for the other with a note; one question a week for the two of them; never a comparison of who read what. |

**Additions proposed by Claude:** a Permissions page (to skip, doubt, be angry at God,
rest, not finish, come back after months; written by Jen and John); a weekly Rest
invitation (Jesus slept in the boat); a "Jesus and a neurodivergent brain" section (the
disciples were messy, literal, impulsive, forgetful, anxious); audio everywhere;
reminders that are off by default and worded by the person who turns them on.

**How it fits The Shire:** stays in its lane. Tend may offer a Remembering card after a
low check-in only if faith features are on, and changes nothing. Anchor reads from it.
Nothing from it appears in Every Box. Everything private by default; sharing is a choice.

**Decisions still open (Jen and John):**
1. The name.
2. Bible translation: Berean Standard Bible is modern, readable, and free to build in; ESV can be added with a free personal-use key; NIV and most others cost money.
3. Whether the coach answers scripture questions (with the strict quoting rule) or stays out of this app.
4. Whether Untangle and the religious-lies cards are in, or the app stays a Jesus-only space.
5. Their banned-words list.

Next step when they return to it: Claude writes the full spec in the shape of the Tend
spec, saves it to docs, and they review before any code.


---

## Urgent build (2026-09-19): Solid Ground and Kept Word, then Seasons

Specified in full in `docs/kept-word-spec.md`. Jen approved building both. Solid Ground
is a visible tile only Jen can open; Kept Word is shared and John does the writing;
Seasons is the cross-app pattern report (My season, private; Our season, shared and
identical for both). Name for Solid Ground still to be chosen by Jen.


### Built 2026-09-19 as "The Well" (step 1)

Jen said "move onto the faith app"; Claude built step 1 under stated assumptions
rather than wait on the five decisions. Each is one string or one switch to change:

1. **Name:** The Well (working). Rename by changing `name` in `modules/the-well/manifest.tsx` and `core/modules/names.ts`.
2. **Translation:** Berean Standard Bible (public domain), built into `public/bible/bsb/` by `scripts/build-bible.mjs` from the scrollmapper/bible_databases JSON.
3. **Coach on scripture:** on, with the quoting rule (task prompts `well.passage` and `well.untangle` in `convex/coach/prompt.ts`). The passage text is sent with the question so the coach quotes only the text in front of it.
4. **Untangle and the religious-lies cards:** included.
5. **Banned words:** "you should have" added to the Hub list; The Well's own copy avoids "quiet time", "devotions", "backsliding" except to defuse them in the glossary. Jen and John to add theirs.

Built: Today (45 Gospel passages by day, read-aloud, a question to carry), Bible (66
"Where am I?" cards, chapter reader, pick up where you left off with no gap shown,
plain-words glossary, ask about this passage), Ways of Jesus (12 areas incl. "Jesus and
a brain like yours"), Lies and truth (17 starter cards + personal cards, save to
Evidence Bank, linked from Shame Interrupter), Untangle (two columns + coach), Talking
with him (prayer notes, answered → Remembering, "I can't pray right now", lament
Psalms, "pray for me" heads-up), Remembering (feeds Tend's Anchor), Together (mark a
passage for the other with a note; one question a week), Permissions (editable).

Not yet: a weekly Rest invitation; a "Jesus through the Old Testament" thread; John and
Jen's review of the starter content.

**Translations, next (asked 2026-09-19):** Jen wants ESV, and possibly NIV and NLT, as
options. She has no capacity for key work right now. Plan when she says "set up ESV":
Claude builds a translation switch in the reader with the Berean always built in and
working; ESV via Crossway's free personal-use API (Jen creates the key at api.esv.org and
pastes it into Convex as `ESV_API_KEY`); NIV/NLT via a licensed service such as
API.Bible (`BIBLE_API_KEY`), availability per translation to be confirmed. Fetched
passages cached in Convex so each is fetched once. A translation without a key shows
"add a key to turn this on", never hides.

**Compare (built 2026-09-19):** the King James (1769) and American Standard Version
(1901), both public domain, are built in beside the Berean. The chapter reader has a
translation switch (remembered per browser), and every chapter has a Compare view:
up to three translations side by side, verse by verse, with an optional verse range and
"Ask about the differences" (coach task `well.compare`, which quotes only the pasted
text and never crowns a translation). ESV, NIV, and NLT appear as "later" chips until
their keys exist.

**For me (built 2026-09-19):** each person chooses a path, never assumed: "as a man, and a
husband" or "as a woman, and a wife" (`core/well/paths.ts`). Four sections each: God's
heart for you, the men Jesus and the Father called / the women Jesus met, as a husband /
as a wife, and "when this has been used against you" (Ephesians 5:21 heads the marriage
passage in both). A daily pick shows on Today; the coach inside The Well is told the
chosen path. First draft for John and Jen to review line by line.


---

## Metamorphosis (Jen's brief, 2026-09-19): John's own room

Specified in `docs/metamorphose-spec.md` (name settled as Metamorphosis). A room for one man, claimed by John, that Jen
cannot open. The father's voice he didn't get, survival first, and his own language
(Character Sheet, Quest Log, The Map, Session Zero, The Party) with no points or levels.
Jen will tell him it exists in one sentence and leave it alone. Not yet built.

**Friendship builder (idea, 2026-09-19):** Jen is thinking of a separate app for the two
of them on how to find and build friendships (John has none right now; both families are
toxic). Elements are in Metamorphosis's The Party for John. A shared version would hold:
where people like us are, the one small ask, following up, hosting something small,
being a friend back, and what to do when it fizzles. Parked until Jen says.

---

## The Storehouse (finances): brainstorm 2026-09-19

Jen's ask: replace the beginning-of-month budget ritual (an ODT spreadsheet); enter every
debt; enter planned income for the month and where it should go; suggest payment
strategies and payoff dates. Context: consolidation loan denied; both credit scores
low; savings gone; a lot of debt. She does not want bankruptcy; she wants support.

**Rule:** no red numbers, no "over budget," no scorekeeping between the two of them. The
app does the math so neither is the money police. What's true, then what's next.

**Proposed places:** The Sit-Down (guided monthly plan, ends with both tapping "we
agree"; says-so items go to Kept Word); Debts (balance, rate, minimum, due day; snowball,
avalanche, blend, and "with a counseling plan" compared as dates and interest, with a
what-if slider); Where the money goes (every dollar a job; safe to spend; due days on the
calendar feed); The Barns (sinking funds); Freedom Day (the date only, no bar); Big-purchase
pause (links to Pause Before Big Moves); Money worries said once (private, shareable).

**The Lifeboat (added at Jen's ask):** hardship and get-out-of-debt support, not
bankruptcy. Nonprofit credit counseling and debt management plans (NFCC 800-388-2227;
no loan, no credit check); lenders' own hardship and forbearance programs with a phone
script and a per-debt call log (who, what they offered, what was accepted); hospital
financial assistance for medical bills; income-driven repayment and deferment for
student loans; utility assistance, 211, church benevolence, food assistance; collector
rights (FDCPA, debt validation in writing, CFPB complaints); what to avoid (for-profit
settlement companies, payday loans); rebuilding (12–24 months of on-time payments,
secured card, credit-union payday-alternative loan). Calls become Kept Word words or
quests. Details to be verified against current program terms at build time.

**Left out on purpose:** bank syncing; per-transaction tracking (plan + bills + debts,
revisited monthly). **John:** treated as the man who knows this; the Sit-Down is led by
whoever they choose, his to accept.

**Waiting on Jen:** the ODT file (to mirror categories); giving as a first line, yes or
no; plan-only versus a rough actual-spending view at month's end.
