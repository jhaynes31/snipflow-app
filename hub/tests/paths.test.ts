import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSystemPrompt, FATHER_VOICE, MOTHER_VOICE } from "../convex/coach/prompt.ts";
import { availablePaths, coachPathList, PATH_MAP, PATHS, pathsFor, readCustomPaths, readPathState, searchPaths } from "../convex/paths.ts";
import { availableTools, splitReply, TOOL_INDEX, toolByKey } from "../convex/toolIndex.ts";

describe("paths", () => {
  it("every step of every path is a real tool, keys are unique, and paths are two to five steps", () => {
    const keys = PATHS.map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const p of PATHS) {
      assert.ok(p.steps.length >= 2 && p.steps.length <= 5, p.key);
      for (const s of p.steps) assert.ok(toolByKey(s), `${p.key}: ${s}`);
      assert.ok(p.words.length >= 3, p.key);
    }
  });
  it("a path is offered only when every step is open to this person", () => {
    const none = availablePaths(availableTools({ metamorphosis: false, reCentered: false }));
    assert.ok(!none.some((p) => p.key === "her.stung"), "needs Re-Centered and The Hearth");
    assert.ok(none.some((p) => p.key === "either.money"));
    const hers = availablePaths(availableTools({ metamorphosis: false, reCentered: true, hearth: true }));
    for (const k of ["her.stung", "her.dysregulated", "her.unheard", "her.flare", "her.mirror", "her.overfunction", "her.lonely", "her.spiral"]) assert.ok(hers.some((p) => p.key === k), k);
    assert.ok(!hers.some((p) => p.key === "john.survival"));
    const his = availablePaths(availableTools({ metamorphosis: true, reCentered: false }));
    assert.ok(his.some((p) => p.key === "john.survival") && !his.some((p) => p.key === "her.stung"));
  });
  it("words find the right path", () => {
    assert.equal(searchPaths("I feel so unheard and misunderstood", PATHS)[0]?.key, "her.unheard");
    assert.equal(searchPaths("dysregulated", PATHS)[0]?.key, "her.dysregulated");
    assert.equal(searchPaths("flare day", PATHS)[0]?.key, "her.flare");
    assert.equal(searchPaths("survival mode", PATHS)[0]?.key, "john.survival");
    assert.deepEqual(searchPaths("x", PATHS), []);
    assert.deepEqual(searchPaths("zebra pancakes", PATHS), []);
  });
  it("custom paths ride along, and settings round-trip", () => {
    const tools = availableTools({ metamorphosis: false, reCentered: true, hearth: true });
    const mine = pathsFor(tools, [{ key: "custom-1", name: "After a hard call", words: ["phone call"], steps: ["tend.groundMe", "hh.sit"] }, { key: "custom-2", name: "Broken", words: [], steps: ["nope.nothing"] }]);
    assert.equal(mine[0].key, "custom-1");
    assert.ok(!mine.some((p) => p.key === "custom-2"));
    assert.equal(searchPaths("a phone call drained me", mine)[0]?.key, "custom-1");
    assert.deepEqual(readPathState({ hub: { path: { key: "her.stung", step: 2, startedAt: 5 } } }), { key: "her.stung", step: 2, startedAt: 5 });
    assert.equal(readPathState({ hub: { background: "moss" } }), null);
    assert.equal(readPathState(undefined), null);
    assert.equal(readCustomPaths({ hub: { paths: [{ key: "c", name: "n", steps: [] }, "junk"] } }).length, 1);
  });
  it("the coach can propose a path with a tag, and the reply becomes a Start button", () => {
    const list = coachPathList(availablePaths(TOOL_INDEX));
    assert.match(list, /her\.stung: Something stung \(Story Check, then Whose is this\?, then Let it land, then Come sit\)/);
    const parts = splitReply("This sounds like Something stung [[path:her.stung]] — start there. Or just [[tool:tend.storyCheck]].", TOOL_INDEX, PATHS);
    assert.deepEqual(parts.map((p) => p.kind), ["text", "path", "text", "tool", "text"]);
    assert.equal(parts[1].kind === "path" && parts[1].path.key, "her.stung");
    assert.equal(parts[0].kind === "text" && parts[0].text, "This sounds like");
    assert.ok(!splitReply("[[path:nope]] fine", TOOL_INDEX, PATHS).some((p) => p.kind === "path"));
    const base = { displayName: "Jen", partnerName: "John", faith: true, mySections: [], partnerSections: [], loopSuspected: false };
    const prompt = buildSystemPrompt({ ...base, tools: "tend.groundMe: Ground Me (Tend). x", paths: list });
    assert.match(prompt, /\[\[path:KEY\]\]/);
    assert.match(prompt, /never both for the same thing/);
    assert.ok(PATH_MAP["her.unheard"].steps.includes("hh.told"));
  });
  it("Dad and Mom do not sound like the coach", () => {
    const base = { displayName: "Jen", partnerName: "John", faith: true, mySections: [], partnerSections: [], loopSuspected: false };
    const dad = buildSystemPrompt({ ...base, hearth: { voice: FATHER_VOICE, known: [] } });
    assert.doesNotMatch(dad, /You are the coach inside The Shire/);
    assert.match(dad, /You are Dad/);
    assert.match(dad, /Hard rules/);
    const mom = buildSystemPrompt({ ...base, hearth: { voice: MOTHER_VOICE, known: [] }, tools: "tend.groundMe: Ground Me (Tend). x", paths: "her.stung: Something stung (a, then b). x" });
    assert.match(mom, /You are Mom/);
    assert.match(mom, /at most one tool or one path per conversation/);
    assert.match(FATHER_VOICE, /never say "one small step"|You don't say "one small step"|"one small step"/);
    assert.match(MOTHER_VOICE, /"one small next step,"/);
  });
});
