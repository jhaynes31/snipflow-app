import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { anyCrisis, crisisReply, detectCrisis, detectReassuranceLoop } from "../convex/coach/safety.ts";
import { buildSystemPrompt, taskPromptFor } from "../convex/coach/prompt.ts";

describe("crisis detection", () => {
  const crisis = [
    "I want to die",
    "i don't want to be alive anymore",
    "I've been thinking about killing myself",
    "Sometimes I want to hurt myself",
    "I feel suicidal tonight",
    "everyone would be better off without me",
    "There's no point in living",
    "I'm not safe at home right now",
    "he is going to hurt me",
    "I want to unalive",
    "I took all my pills",
    "I have a plan to end it",
    "Been cutting myself again",
    "I'm afraid for my life",
    "I want to end my life.",
    "I wish I could just not wake up",
  ];
  for (const text of crisis) {
    it(`flags: ${text}`, () => {
      assert.equal(detectCrisis(text).level, "crisis", text);
    });
  }

  const ordinary = [
    "",
    "ok",
    "I'm dying to see that movie",
    "Just killing some time before the meeting",
    "The deadline is killing me but I'll be fine",
    "My phone is dying, talk later",
    "I hurt my back moving boxes",
    "I'm dead tired after work",
    "Cutting back on coffee this week",
    "She hurt my feelings and I'm still stinging",
    "I feel low and heavy today and can't start anything",
    "The shame voice says I'm lazy",
    "Kill the lights when you leave",
    "Not sure what I need. Maybe quiet.",
    "I feel safe with him",
    "We watched a show about suicide prevention",
  ];
  for (const text of ordinary) {
    it(`stays quiet: ${text || "(empty)"}`, () => {
      assert.equal(detectCrisis(text).level, "none", text);
    });
  }

  it("checks several fields at once", () => {
    assert.equal(anyCrisis(["fine", "also fine"]), false);
    assert.equal(anyCrisis(["fine", "i want to die"]), true);
    assert.equal(anyCrisis([undefined, null]), false);
  });

  it("gives a fixed care reply with 988 and 911", () => {
    const reply = crisisReply("John");
    assert.match(reply, /988/);
    assert.match(reply, /911/);
    assert.match(reply, /tell John with one tap/);
    assert.doesNotMatch(crisisReply(null), /one tap/);
  });
});

describe("reassurance loop", () => {
  it("is quiet for a normal conversation", () => {
    assert.equal(detectReassuranceLoop(["I can't start the report", "Okay, two minutes", "Done, that helped"]), false);
    assert.equal(detectReassuranceLoop(["are you sure?"]), false);
  });
  it("notices the same reassurance asked for again", () => {
    assert.equal(
      detectReassuranceLoop([
        "Do you think Jen is mad at me?",
        "But are you sure she isn't mad at me?",
        "Just tell me she isn't mad at me",
      ]),
      true,
    );
  });
  it("notices near-identical questions with one classic phrasing", () => {
    assert.equal(
      detectReassuranceLoop([
        "Did I ruin the whole evening with what I said?",
        "I keep thinking I ruined the whole evening with what I said",
        "What if I really ruined the whole evening with what I said",
      ]),
      true,
    );
  });
});

describe("system prompt", () => {
  const base = {
    displayName: "John",
    partnerName: "Jen",
    faith: true,
    mySections: [{ title: "What helps", body: "Quiet. Tea. Literal words." }],
    partnerSections: [{ title: "Communication needs", body: "Time to process." }],
    taskPrompt: taskPromptFor("tend.talkItOut"),
    loopSuspected: false,
  };
  it("includes only the allowed sections and the partner's shared ones", () => {
    const p = buildSystemPrompt(base);
    assert.match(p, /Quiet\. Tea\. Literal words\./);
    assert.match(p, /Time to process\./);
    assert.match(p, /Their partner is Jen/);
    assert.match(p, /Talk It Out/);
    assert.match(p, /never adjust|never suggest starting, stopping, or changing any medication/);
    assert.match(p, /988/);
    assert.match(p, /Never take sides/);
  });
  it("respects faith off and loop notice", () => {
    const p = buildSystemPrompt({ ...base, faith: false, loopSuspected: true, mySections: [], partnerName: null, partnerSections: [] });
    assert.match(p, /faith features off/);
    assert.doesNotMatch(p, /faith anchors/);
    assert.match(p, /noticed the loop/);
    assert.match(p, /has not allowed any manual sections/);
    assert.match(p, /has not joined yet/);
    assert.doesNotMatch(p, /Time to process/);
  });
  it("adds the chosen path only when given", () => {
    const p = buildSystemPrompt({ ...base, wellPath: "woman" });
    assert.match(p, /ezer/);
    assert.match(p, /Ephesians 5:21/);
    assert.doesNotMatch(buildSystemPrompt(base), /ezer/);
  });
  it("ignores unknown task keys", () => {
    assert.equal(taskPromptFor("nope"), undefined);
    assert.equal(taskPromptFor(undefined), undefined);
  });
});
