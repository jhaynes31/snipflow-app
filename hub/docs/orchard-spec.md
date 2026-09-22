# The Orchard: Spec

Asked for by Jen on 2026-09-22, for both of them. Her brief: they meet people and get
overly excited fast when the vibes are good; they trust too quickly when someone seems
kind and gives attention; they need to remember they don't actually know the person yet
and rein in the stories, expectations and fantasies; they need help knowing if someone is
safe and right for them; and down the road, when conflict or a pattern shows, whether to
confront, quietly adjust access (move them to a different layer), or leave.

Grew from the pacing and circles work Jen did in Re-Centered's "Everyone, and me" side
(2026-09-17), which stays hers and on her device. The Orchard is the Shire-native, shared
version for both of them, wired to the coach and Seasons.

## The five screens

- **People** (`/orchard`): everyone by layer, days known beside each. "I met someone" asks
  for the story they're already telling themselves and the pearls they're holding, and
  books a re-read of the story thirty days out (also a Today line on home when due).
- **A person** (`/orchard/person/:id`): the story, then "what they've actually shown"
  (facts, green flags, showed up) beside the stories caught, watch notes, and what I've
  given. Three checks: the **halo check** (excitement 1 to 5, five questions, a plain
  reading), **safe for me?** (eight give-and-take questions, a reading of steady, mixed, or
  one-way, and the tests not yet taken), and a link to the Compass. **Move** between layers
  with a reason; the slow-trust rule is said out loud and can be overridden ("move anyway")
  with a reason. Rest, release, share with the partner, delete.
- **Slow trust** (`/orchard/slow-trust`): the five layers, from Just met (day one) to
  Getting to know (14 days), Friend (60), Close friend (180), Chosen family (365): what each
  gets, what to expect, what earns it, what moves someone out. The pearls. What to watch for.
- **The Compass** (`/orchard/compass`): what happened, first time or pattern, said out loud
  or not, touches safety or not, what you expect if you raise it, whether they've repaired
  before, filled or drained. One reading: say it once small; say it plainly then match
  access; adjust quietly; step back; leave, or nearly. With the why, a short script when
  talking is the call, and a suggested layer with a one-tap move. "Talk it through" opens
  the coach with the situation loaded (task `orchard.compass`). The event is also filed as a
  conflict note on the person.
- **Together** (`/orchard/together`): the partner's shared people and yours. Sharing shows
  the name, the layer, and only notes marked shared. Never the story, checks, or pearls.
- **Ways** (`/orchard/ways`): where people like us are, the one small ask, following up,
  hosting small, being a friend back, when it fizzles, keeping your pace. Links to Renewed
  Mind's Live It friendship steps.

## My signals (added 2026-09-22, the same day)

Jen's list of what she is done with in friendships, seventeen patterns, each with the
early tell, the test that reveals it (usually something she does less of), what to do when
it shows, and its twin, the green version. Both people start from the same list; each can
switch any off and add their own (`moduleSettings.orchard.{off, custom}`). The twins are
what earn the layers on the Slow trust screen. Gossip and a broken confidence are hard lines.

- **Sightings:** a watch note or a conflict note can carry a signal. The person's page shows
  "Signals seen" with counts and dates. The Compass asks "which of your signals is this?"
  and, with two or more earlier sightings, treats it as a pattern; a hard line goes straight
  to adjusting access.
- **The initiation ledger:** "They reached out" / "I reached out" on the person's page, read
  back as who initiated in the last six contacts. **Let it be quiet:** a window (fourteen days
  by default) where she doesn't initiate; a contact from them ends it as a fact, and the
  window passing with nothing files a "never initiates" sighting.
- **The coach** in The Orchard carries the list by name.

## Rules

- Nothing is enforced; the rule is said. The reason given is the point.
- No verdicts on people. Readings are directions for the person using the app.
- Private by default; a person is shared one at a time, on purpose.
- Safety anywhere in a compass answer points to Need help now.

## Data

`orPeople` (name, howMet?, metDay, layer 0-4, state growing|resting|released, story?,
storyReadDay?, pearls[]), `orNotes` (personId, kind fact|story|green|flag|gave|showedUp|
conflict, text, day), `orChecks` (personId, kind halo|safe|compass, answers, read),
`orMoves` (personId, from, to, reason). Pure logic and content in `convex/orchard/pure.ts`,
tested in `tests/orchard.test.ts`.
