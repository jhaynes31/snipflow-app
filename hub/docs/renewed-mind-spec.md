# Renewed Mind: Spec

Asked for by Jen on 2026-09-21: "mindset tools for changing the neuropathways in my brain
and limiting beliefs. As a man thinks, so he is; healing and transformation come from a
renewed mind." Built the same day as its own place (module id `renewed-mind`), for both of
them, with doors from Tend, The Well, Re-Centered and Metamorphosis.

## The basis

A belief is a worn path. Changing it takes three things together, and the research on
cognitive change (restructuring, retrieval practice, memory reconsolidation, self-affirmation
in one's own words) and the scriptures Jen named describe the same sequence:

1. Catch the old thought at the moment it fires (2 Corinthians 10:5).
2. Say a truer line, in your own words, at that moment and often enough that it becomes
   the easier path (Romans 12:2, Ephesians 4:22-24). Retrieving it beats reading it.
3. Gather lived evidence that the new line holds, so it is felt, not recited
   (Philippians 4:8: whatever is true).

No affirmation packs, no quotas, no scores. The words are the person's own.

## The five tools

- **Rehearse** (`/renewed-mind`): one line a day, chosen as the least recently rehearsed
  (ties broken by the day, so reloads don't shuffle). The old line shows; the truer line is
  blurred until "I've said it. Show me." Then "Read it to me" (Web Speech) and one answer:
  felt true today? Not yet, a little, mostly. One answer per line per day; re-answering
  replaces it. A toggle puts "today's line is waiting" in the home Today row until answered.
- **Put Off, Put On** (`/renewed-mind/beliefs`): old line, where it came from (optional),
  truer line, and (when faith features are on) a verse reference and its words. Lines can be
  set down (kept with their evidence, out of rotation), brought back, shared (only the truer
  line, one at a time, off by default), or deleted with their evidence. The partner's shared
  lines show at the bottom. `?old=` and `?ref=` prefill from The Well's Lies and truth.
- **Take It Captive** (`/renewed-mind/captive`): the thought, the feeling, three checks (true,
  kind, necessary: yes, partly, no), what you'd say to a friend, and the matching truer line
  from the list, shown large. Recent captures can be deleted.
- **Live It** (`/renewed-mind/live`), added the same day at Jen's request: the lived-evidence
  loop. For a chosen line, a library of practical steps matched to its theme
  (`convex/renewedMind/library.ts`: too much, can't say no, burden, if they knew me, not
  enough, alone, fix everything, failed, seen, scorekeeper, don't matter, plus a friendship
  set), each tagged with an arena: the marriage, outside the house, friends, work, with God,
  on your own. "Ask the coach for steps" opens a chat (task `renewedMind.steps`) whose bullet
  lines become "Add this step" buttons. A planned step can carry what the old line predicts;
  "Done" asks what actually happened, and when it proved the truer line the pair goes
  straight into Evidence. Steps can be skipped ("not this week") without a mark against them.
- **Evidence for the New** (`/renewed-mind/evidence`): moments filed under a line. Distinct
  from Tend's Evidence Bank (the wider record), and linked to it.

## Connections

- The coach and the mentor are given the person's active truer lines and told to hand one
  back word for word, never reworded, and to offer Take It Captive with an Open button.
- Front desk: four tools in the index; the door "An old lie is running me" for both of them.
- The Well's Lies and truth cards and own cards have "Make this mine."
- Re-Centered's Now and Metamorphosis's Mirror link to Take It Captive.
- Seasons (mine only): rehearsals and captures counted against the period before, and each
  line's first and last "felt true" in the period, quoted in the person's words. Nothing from
  here enters the shared season.

## Data

`rmBeliefs` (oldLine, origin?, newLine, verse?, verseText?, retiredAt?), `rmRehearsals`
(beliefId, feltTrue, day), `rmCaptures` (thought, feeling?, isTrue, isKind, isNecessary,
friendSays?, beliefId?), `rmEvidence` (beliefId, text), `rmSteps` (beliefId, text, arena?, source, status, prediction?,
happened?, evidenceId?). All owned and private; `rmBeliefs`
may be `shared`. Setting `moduleSettings["renewed-mind"].rehearseDaily`. Pure helpers and
tests: `convex/renewedMind/pure.ts`, `tests/renewed-mind.test.ts`.
