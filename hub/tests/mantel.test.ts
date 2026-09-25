import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSystemPrompt } from "../convex/coach/prompt.ts";
import { KIND_LABEL, pickKeep, speakerForTask, sourceForTask } from "../core/mantel/labels.ts";
import { DOORS_EITHER, DOORS_HER, toolByKey } from "../convex/toolIndex.ts";

describe("The Mantel", () => {
  it("knows who spoke and where, from the task", () => {
    assert.equal(speakerForTask("hearth.father"), "dad");
    assert.equal(speakerForTask("hearth.eyes"), "dad");
    assert.equal(speakerForTask("hearth.sit"), "mom");
    assert.equal(speakerForTask("hub.talk"), "coach");
    assert.equal(speakerForTask(undefined), "coach");
    assert.equal(sourceForTask("hearth.mother"), "Ask her");
    assert.equal(sourceForTask("nope"), undefined);
  });
  it("keeps a highlighted sentence when it is really from the reply, else the whole reply", () => {
    const reply = "You did nothing wrong. Go eat something. I'll be right here.";
    assert.equal(pickKeep(reply, "Go eat something."), "Go eat something.");
    assert.equal(pickKeep(reply, "Go eat"), reply);
    assert.equal(pickKeep(reply, "something else entirely"), reply);
    assert.equal(pickKeep(`  ${reply}  `, null), reply);
    assert.equal(Object.keys(KIND_LABEL).length, 4);
  });
  it("the coach hands mantel lines back, and the door exists", () => {
    const base = { displayName: "Jen", partnerName: "John", faith: true, mySections: [], partnerSections: [], loopSuspected: false };
    const p = buildSystemPrompt({ ...base, kept: ["You were never too much."] });
    assert.match(p, /kept on their mantel/);
    assert.match(p, /You were never too much\./);
    assert.ok(toolByKey("hub.mantel"));
    assert.ok([...DOORS_HER, ...DOORS_EITHER].some((d) => d.toolKey === "hub.mantel"));
  });
});
