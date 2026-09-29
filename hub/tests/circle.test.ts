import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { circleText, GREEN_FLAGS, hasAnything, parseSort, RED_FLAGS } from "../convex/reCentered/circlePure.ts";

describe("Someone in my circle", () => {
  it("offers plain-word flags with no duplicates and no diagnoses", () => {
    for (const list of [GREEN_FLAGS, RED_FLAGS]) {
      assert.ok(list.length >= 10);
      assert.equal(new Set(list.map((f) => f.toLowerCase())).size, list.length);
      for (const f of list) assert.ok(!/narciss|borderline|toxic|psychopath|disorder/i.test(f), f);
    }
    assert.ok(RED_FLAGS.some((f) => /body, weight, or looks/.test(f)));
  });
  it("parses the coach's six headings into buckets", () => {
    const sort = parseSort(`Green flags:
- Remembered your appointment
- Took the no about Saturday well
Red flags:
- Nothing here yet.
Something to confront:
- "When you joked about my plate, it stung. Please don't."
Something to monitor:
- Whether she initiates over the next few weeks
Not enough to tell yet:
- The story that she's avoiding you (that's a story, not a fact)
A line for you:
You saw two real things and one story. Trust grows in the mundane, not the intense.`);
    assert.deepEqual(sort.green, ["Remembered your appointment", "Took the no about Saturday well"]);
    assert.deepEqual(sort.red, []);
    assert.equal(sort.confront.length, 1);
    assert.equal(sort.monitor.length, 1);
    assert.equal(sort.unclear.length, 1);
    assert.match(sort.line, /^You saw two real things/);
    assert.ok(hasAnything(sort));
  });
  it("tolerates bold headings, hashes, and stray text, and reports nothing for nonsense", () => {
    const sort = parseSort(`Here you go.\n## **Green flags**\n* Kind to the waiter\n**Red Flags:**\n- none\nSomething to watch:\n- Favors`);
    assert.deepEqual(sort.green, ["Kind to the waiter"]);
    assert.deepEqual(sort.red, []);
    assert.deepEqual(sort.monitor, ["Favors"]);
    assert.ok(!hasAnything(parseSort("I'm not sure what you mean.")));
  });
  it("writes the entry for the coach in the person's words", () => {
    const text = circleText({ name: "Amy", text: "We met at church.", green: ["Keeps small promises"], red: [], sort: { green: ["Keeps small promises"], red: [], confront: [], monitor: ["Initiating"], unclear: [], line: "x" } });
    assert.match(text, /^About Amy\./);
    assert.match(text, /Green flags I tapped: Keeps small promises\./);
    assert.ok(!/Red flags I tapped/.test(text));
    assert.match(text, /How it was sorted: Green flags: Keeps small promises \| Something to monitor: Initiating/);
  });
});
