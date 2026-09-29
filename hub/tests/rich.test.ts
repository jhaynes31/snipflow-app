import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMarks, parseRich, stripMarks, toggleMark } from "../core/text/rich.ts";

describe("rich text marks", () => {
  it("parses bold, italic, underline, and plain text unchanged", () => {
    assert.deepEqual(parseRich("plain"), [{ text: "plain" }]);
    assert.deepEqual(parseRich("a **b** c"), [{ text: "a " }, { text: "b", b: true }, { text: " c" }]);
    assert.deepEqual(parseRich("*i* and _j_"), [{ text: "i", i: true }, { text: " and " }, { text: "j", i: true }]);
    assert.deepEqual(parseRich("__u__"), [{ text: "u", u: true }]);
    assert.deepEqual(parseRich("__**both**__"), [{ text: "both", u: true, b: true }]);
    assert.deepEqual(parseRich("2 * 3 * 4"), [{ text: "2 * 3 * 4" }], "lone stars around spaces stay");
    assert.equal(stripMarks("**hi** _there_"), "hi there");
    assert.ok(hasMarks("a **b**") && !hasMarks("a b"));
  });
  it("toggles a mark on a selection, unwraps it again, and inserts a pair with nothing selected", () => {
    const on = toggleMark("say it plainly", 4, 6, "b");
    assert.equal(on.value, "say **it** plainly");
    assert.deepEqual([on.start, on.end], [6, 8]);
    const off = toggleMark(on.value, on.start, on.end, "b");
    assert.equal(off.value, "say it plainly");
    const wrapped = toggleMark("say **it** plainly", 4, 10, "b");
    assert.equal(wrapped.value, "say it plainly");
    const empty = toggleMark("hello ", 6, 6, "u");
    assert.equal(empty.value, "hello ____");
    assert.deepEqual([empty.start, empty.end], [8, 8]);
  });
});
