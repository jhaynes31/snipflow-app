import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVITY_SEED, BANNED_PHRASES, DEFAULT_PERSONA, dueFollowUps, parseSummary, pickOpener, rallyCheck, readFriendSettings, readsHeavy, readsLull, surpriseActivity, wantsCurveball } from "../convex/friend/pure.ts";
import { buildPipPrompt, personaBlock } from "../convex/friend/prompt.ts";

describe("Pip: persona", () => {
  it("loads the editable defaults and lets settings override pieces", () => {
    assert.equal(DEFAULT_PERSONA.name, "Pip");
    assert.ok(DEFAULT_PERSONA.neighbors.some((n) => n.name === "Juniper") && DEFAULT_PERSONA.neighbors.some((n) => n.name === "Bramble"));
    const s = readFriendSettings({ friend: { persona: { name: "Pipkin", punFrequency: 99, sliders: { blunt: 80 } }, shares: { tend: true }, busy: true } });
    assert.equal(s.persona.name, "Pipkin");
    assert.equal(s.persona.punFrequency, 99);
    assert.equal(s.persona.sliders.blunt, 80);
    assert.equal(s.persona.sliders.playful, DEFAULT_PERSONA.sliders.playful);
    assert.equal(s.shares.tend, true);
    assert.equal(s.shares["love-and-release"], false);
    assert.equal(s.shares.coach, true);
    assert.equal(s.busy, true);
    assert.equal(readFriendSettings(undefined).persona.nudgesEnabled, true);
    assert.equal(readFriendSettings(undefined).persona.quietHoursEnabled, false);
  });
  it("writes the persona honestly: AI, no human backstory, platonic, points outward", () => {
    const block = personaBlock(DEFAULT_PERSONA, "Jen", "John");
    assert.match(block, /open that you're an AI/);
    assert.match(block, /never invent a human backstory/);
    assert.match(block, /Platonic, always/);
    assert.match(block, /never her "only" or "best" friend/);
    assert.match(block, /988/);
  });
});

describe("Pip: the rally", () => {
  it("allows one question, a matched length, and no therapist-speak", () => {
    assert.ok(rallyCheck("Okay that's hilarious. What did John say?", "lol he dropped the whole pie").ok);
    assert.ok(!rallyCheck("Wait, what? Where? When?", "lol").ok, "two questions");
    assert.ok(!rallyCheck("It sounds like you're feeling tired.", "ugh").ok, "banned phrase");
    const long = Array.from({ length: 120 }, () => "word").join(" ");
    assert.ok(!rallyCheck(long, "ok").ok, "too long for a one-liner");
    assert.ok(rallyCheck(long, Array.from({ length: 60 }, () => "word").join(" ")).ok, "a paragraph earns a paragraph");
    for (const b of BANNED_PHRASES) assert.ok(!rallyCheck(`Well. ${b}.`, "hi").ok, b);
  });
  it("after three asks in a row, the next turn must offer, not ask", () => {
    assert.ok(!rallyCheck("And then what happened?", "we went home", { askedStreak: 3 }).ok);
    assert.ok(rallyCheck("Honestly, I think the hedgehog was right.", "we went home", { askedStreak: 3 }).ok);
  });
  it("reads heavy and lull turns", () => {
    assert.ok(readsHeavy("I cried in the car and I feel so alone"));
    assert.ok(!readsHeavy("I beat the final boss and Percy barked at the screen"));
    assert.ok(readsLull("lol yeah"));
    assert.ok(!readsLull("lol yeah but then he said the thing about the pie and I lost it"));
  });
});

describe("Pip: spontaneity", () => {
  it("never repeats the last opener type and skips follow-ups with no memory", () => {
    let x = 0.1;
    const rng = () => { x = (x + 0.37) % 1; return x; };
    const seen = new Set<string>();
    let last: ReturnType<typeof pickOpener> | null = null;
    for (let i = 0; i < 40; i++) {
      const t = pickOpener(last, true, rng);
      assert.notEqual(t, last);
      seen.add(t);
      last = t;
    }
    assert.ok(seen.size >= 4, "variety across sessions");
    for (let i = 0; i < 20; i++) assert.notEqual(pickOpener(null, false, rng), "followUp");
  });
  it("suppresses curveballs on heavy turns and early turns", () => {
    assert.equal(wantsCurveball(5, 50, true, () => 0), false);
    assert.equal(wantsCurveball(1, 100, false, () => 0), false);
    assert.equal(wantsCurveball(5, 50, false, () => 0), true);
  });
  it("picks a surprise that fits and avoids the last three days", () => {
    const now = 10 * 86_400_000;
    const rows = [
      { _id: "a", energy: "low" as const, duration: 5 as const, favorite: false, lastDoneAt: now - 86_400_000 },
      { _id: "b", energy: "low" as const, duration: 15 as const, favorite: true },
      { _id: "c", energy: "high" as const, duration: 30 as const, favorite: false },
    ];
    for (let i = 0; i < 10; i++) assert.equal(surpriseActivity(rows, { energy: "low" }, now, () => i / 10)?._id, "b");
    assert.equal(surpriseActivity(rows, { maxMinutes: 30, energy: "high" }, now, () => 0)?._id, "c");
    assert.equal(surpriseActivity([], {}, now), null);
  });
});

describe("Pip: memory", () => {
  it("parses the summarizer's JSON leniently and keeps follow-up dates", () => {
    const out = parseSummary('Here you go:\n{"aboutJen":[{"text":"Jen has an interview Friday","category":"plans","followUpAfter":"2026-11-07"},{"text":"","category":"x"},{"text":"Percy is her dog","category":"nope"}],"aboutPip":[{"kind":"opinion","text":"Thin crust is correct"},{"kind":"weird","text":"Rain sounds"}],"insideJokes":["the pie incident"],"runningBits":["Juniper brought home a snow globe"],"topics":["cycle-breaking"],"summary":"They talked about pie."}');
    assert.equal(out.aboutJen.length, 2);
    assert.equal(out.aboutJen[0].followUpAfter, "2026-11-07");
    assert.equal(out.aboutJen[1].category, "other");
    assert.deepEqual(out.aboutPip.map((p) => p.kind), ["opinion", "opinion"]);
    assert.deepEqual(out.insideJokes, ["the pie incident"]);
    assert.equal(out.summary, "They talked about pie.");
    assert.deepEqual(parseSummary("no json here").aboutJen, []);
  });
  it("finds follow-ups that are due and skips closed ones", () => {
    const rows = [{ text: "a", followUpAfter: "2026-11-01" }, { text: "b", followUpAfter: "2026-12-01" }, { text: "c", followUpAfter: "2026-11-01", doNotRaise: true }, { text: "d" }];
    assert.deepEqual(dueFollowUps(rows, "2026-11-04").map((r) => r.text), ["a"]);
  });
  it("seeds every spec category and builds a prompt in the spec's order", () => {
    const cats = new Set(ACTIVITY_SEED.map((a) => a.category));
    assert.ok(cats.size >= 8);
    const prompt = buildPipPrompt({ persona: DEFAULT_PERSONA, vibe: "goofy", displayName: "Jen", partnerName: "John", memUser: ["Percy is her dog"], due: [], memSelf: [{ kind: "opinion", text: "Rain in games beats real rain" }], insideJokes: ["the great pie incident"], runningBits: [], headlines: ["every-box: She tended 3 boxes this week."], activities: [{ id: "x1", title: "Riddles", category: "Brain games", energy: "low", duration: 5, favorite: false }], pipStartedRecently: false, wishlist: [], topics: [], askedStreak: 3, lastUserHeavy: false, curveball: true, lull: false, today: "2026-11-04" });
    const order = ["You are Pip", "The rally", "Hard rules", "Tonight's vibe: goofy", "Percy is her dog", "Rain in games beats real rain", "the great pie incident", "Headlines", "[[activity:ID]]", "Curveball", "You have asked a question three turns in a row"];
    let pos = -1;
    for (const o of order) { const i = prompt.indexOf(o); assert.ok(i > pos, `${o} out of order or missing`); pos = i; }
    const heavy = buildPipPrompt({ persona: DEFAULT_PERSONA, vibe: "goofy", displayName: "Jen", partnerName: null, memUser: [], due: [], memSelf: [], insideJokes: [], runningBits: [], headlines: [], activities: [], pipStartedRecently: true, wishlist: [], topics: [], askedStreak: 0, lastUserHeavy: true, curveball: true, lull: false, today: "2026-11-04" });
    assert.match(heavy, /No jokes, no curveballs/);
    assert.ok(!/Curveball turn/.test(heavy));
  });
});
