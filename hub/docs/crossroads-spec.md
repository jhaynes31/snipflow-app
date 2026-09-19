# The Crossroads: Spec (Hub Module)

Built 2026-09-19 from Jen's ask: help the two of them decide whether to stay in the US,
move to another state, or move to another country, and lay out the steps in order with
details and costs. Visual, with extensive questions, and recommendations that weigh
faith, cost of living, safety, religious demographics, government reach, transit, and
more. Follows the Hub Contract in full; the guide never picks for them and never takes
one spouse's side.

**Honesty rule:** the place ratings are Claude's rough 2026 starting points on a five-point
scale, not measurements. Every card says so, any rating can be changed, and the Sources
page names where the real numbers live. Step costs and times are 2026 US figures Claude is
fairly sure of; each step names where to confirm.

| Place | What it does |
|---|---|
| Questions | Thirty-three questions in eight sections (the life we want, faith, safety and government, money, work, health, place, people, the path). Each is an importance from 0 to 5, free text, or both. Each person answers alone; both can read both once written. |
| Together | Where both rated something 4 or 5; where they differ by two or more on something at least one cares about; and every free-text answer side by side. |
| Places | Fifteen countries and six US states, each with a line, why it fits, what to watch, and the usual legal path for Americans. A fit from 1 to 5: the place's ratings weighted by the two of them's averaged importance, with strong and thin factors named in words. Shortlist, choose, add your own place, change any rating dot by dot, note. |
| Ask the guide | The coach, handed both sets of answers and the shortlist (task `crossroads.guide`). Compares plainly, says what it can't verify and where to check, never picks, ends with the questions to answer next. |
| The Road | The steps in order as a road with stages: Decide, Papers, Money, Health and pets, Work, Home, The move, Landing. Twenty-seven steps, each with details, cost, time, and where; filtered by the chosen path (another state or another country). Status per step (to do, doing, done, skip), who's carrying it, and a note. |
| Sources | Numbeo, State Department advisories, Pew, Freedom House, the consulates, and the two that matter most: an expat tax preparer and people who live there. |

**Data:** `crAnswers` (per person, shared), `crPlaces` (overrides and custom places),
`crSteps` (per step state), `crSettings` (path and chosen place). **Cooperates with:** Kept
Word (a step someone takes on), The Storehouse (a Barn for the move), Tend (nothing).
