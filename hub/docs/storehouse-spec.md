# The Storehouse: Spec (Hub Module)

Built 2026-09-19 from Jen's brainstorm (see docs/app-ideas.md, "The Storehouse").
Household money, shared by nature. Follows the Hub Contract in full.

**Rule:** no red numbers, no "over budget," no scorekeeping between the two of them. The
app does the math so neither is the money police. What's true, then what's next.

| Place | What it does |
|---|---|
| This month | The Sit-Down on one page. Coming in (entries with an expected day). Where it goes: starter categories (Giving optional, Needs, Debts, The Barns, Savings, Life, Buffer), every line editable, add or remove any. The truth line: "$X still needs a job" or "$X more is planned than is coming in," never "over." Debt lines follow the chosen strategy; barn lines follow The Barns. Freedom Day as a date. Last month in one honest line. Each person taps "I agree"; both agreeing sets the month and emits `sitDown.agreed`. Start a month fresh or from last month. |
| Debts | Every debt: name, kind, lender, balance, rate, minimum, due day. Balance updates in place. The four strategies compared in sentences (smallest first, highest interest first, a blend, and a counseling-plan estimate at reduced rates with a fee), each with the finish month, the interest, and the order. A slider for extra toward debt. "Follow this one" sets the household strategy. Per-debt hardship status and a call log (who, offered, accepted). Paid-off debts move to "Gone" and emit `debt.paid`. A minimum that can't cover its interest is flagged and pointed at The Lifeboat. |
| The Lifeboat | Support that doesn't depend on a credit score: nonprofit counseling and debt management plans (NFCC 800-388-2227), lenders' hardship programs with a phone script, hospital financial assistance, student-loan income-driven repayment, freeing up cash (211, LIHEAP, SNAP, church benevolence), collector rights (FDCPA, validation letters, CFPB), credit-union small loans. What to avoid. Rebuilding credit in order. A call can be logged from any resource; a link to make the call a word in Kept Word. |
| The Barns | Sinking funds: name, balance, monthly, optional target. Monthly amounts become plan lines each new month. |
| Worries | A money worry, said once. Private unless shared; the partner's shared ones shown. |

**Also:** bills with a due day go on the calendar feed as monthly repeating events with a
two-day alarm. Today widget: a bill due within three days, or an open Sit-Down in the
first week. The big-purchase pause amount lives in settings and points at Pause Before
Big Moves in Tend.

**Data:** `shDebts`, `shCalls`, `shIncome`, `shLines`, `shBarns`, `shSitDowns`, `shSettings`
(one household row: strategy, extra, giving, pause amount), `shWorries` (private unless
shared). Money in dollars.

**Left out on purpose:** bank syncing; per-transaction tracking. **Waiting on Jen:** the
ODT to mirror categories; giving as a first line (on by default, switchable); plan-only
(built) versus a rough actual-spending view later.
