import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { availableTools, coachToolList, DOORS_EITHER, DOORS_HER, DOORS_JOHN, searchTools, splitReply, TOOL_INDEX, toolByKey } from "../convex/toolIndex.ts";

describe("the tool index", () => {
  it("has unique keys and real addresses", () => {
    const keys = new Set<string>();
    for (const t of TOOL_INDEX) {
      assert.ok(!keys.has(t.key), `duplicate ${t.key}`);
      keys.add(t.key);
      assert.ok(t.href.startsWith("/"), t.key);
      assert.ok(t.words.length >= 2, t.key);
    }
  });
  it("every door opens a tool that exists", () => {
    for (const d of [...DOORS_HER, ...DOORS_JOHN, ...DOORS_EITHER]) assert.ok(toolByKey(d.toolKey), d.label);
    assert.ok(DOORS_HER.length >= 6 && DOORS_JOHN.length >= 6);
  });
  it("finds the right tool for what people say", () => {
    const first = (q: string) => searchTools(q)[0]?.key;
    assert.equal(first("I can't start"), "tend.smallestStep");
    assert.equal(first("he broke his word again"), "rc.now");
    assert.equal(first("about to say yes when I mean no"), "lr.fawn");
    assert.equal(first("money worry"), "storehouse.worries");
    assert.equal(first("we fought"), "tend.repair");
    assert.equal(first("tired and it still needs doing"), "mm.tired");
    assert.ok(searchTools("something stung").some((t) => t.key === "tend.storyCheck"));
    assert.ok(searchTools("looping").some((t) => t.key === "tend.loopBreaker" || t.key === "lr.loop"));
    assert.deepEqual(searchTools("zzzz"), []);
    assert.ok(searchTools("hardship help").length <= 3);
  });
  it("hides room tools from anyone but the room's owner", () => {
    const none = availableTools({ metamorphosis: false, reCentered: false });
    assert.ok(!none.some((t) => t.room));
    const jen = availableTools({ metamorphosis: false, reCentered: true });
    assert.ok(jen.some((t) => t.key === "rc.pause") && !jen.some((t) => t.key === "mm.tired"));
    const john = availableTools({ metamorphosis: true, reCentered: false });
    assert.ok(john.some((t) => t.key === "mm.tired") && !john.some((t) => t.key === "rc.pause"));
    assert.ok(!searchTools("overfunction", none).some((t) => t.key === "rc.pause"));
  });
  it("turns coach tags into buttons, once each, and drops unknown ones", () => {
    const parts = splitReply("Try Smallest Step [[tool:tend.smallestStep]] tonight. Or [[tool:tend.smallestStep]] again, or [[tool:nope.nothing]]. Then rest.");
    assert.deepEqual(parts.map((p) => p.kind), ["text", "tool", "text"]);
    assert.equal(parts[2].kind === "text" && parts[2].text, "tonight. Or again, or . Then rest.");
    assert.equal(parts[1].kind === "tool" && parts[1].tool.name, "Smallest Step");
    assert.ok(!parts.some((p) => p.kind === "text" && p.text.includes("[[")));
    assert.deepEqual(splitReply("Plain words only."), [{ kind: "text", text: "Plain words only." }]);
  });
  it("drops the tool name the coach wrote next to the tag, and a dangling dash after it", () => {
    const name = toolByKey("tend.smallestStep")!.name;
    const parts = splitReply(`If you want somewhere to put it down: ${name} [[tool:tend.smallestStep]] — it has prompts for this.`);
    assert.deepEqual(parts.map((p) => (p.kind === "text" ? p.text : `<${p.tool.key}>`)), ["If you want somewhere to put it down:", "<tend.smallestStep>", "it has prompts for this."]);
    const paren = splitReply(`Try the ${name} ([[tool:tend.smallestStep]]) tonight.`);
    assert.deepEqual(paren.map((p) => (p.kind === "text" ? p.text : `<${p.tool.key}>`)), ["Try", "<tend.smallestStep>", "tonight."]);
    const bare = splitReply("Open [[tool:tend.smallestStep]] when you are ready.");
    assert.deepEqual(bare.map((p) => (p.kind === "text" ? p.text : `<${p.tool.key}>`)), ["Open", "<tend.smallestStep>", "when you are ready."]);
    const loose = splitReply("Remembering [[well.remembering]] for the whisper, or Evidence Bank [[ tool: tend.evidenceBank ]] for the rest, and [[nothing.here]] too.");
    assert.deepEqual(loose.filter((p) => p.kind === "tool").map((p) => p.kind === "tool" && p.tool.key), ["well.remembering", "tend.evidenceBank"]);
    assert.ok(!loose.some((p) => p.kind === "text" && p.text.includes("[[")));
  });
  it("gives the coach a compact list", () => {
    const list = coachToolList(availableTools({ metamorphosis: false, reCentered: false }));
    assert.ok(list.includes("tend.smallestStep: Smallest Step (Tend)."));
    assert.ok(!list.includes("mm.tired"));
  });
});
