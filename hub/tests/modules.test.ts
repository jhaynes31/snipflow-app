import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestionLines } from "../core/manual/sections.ts";

describe("heads-up suggestion lines", () => {
  it("splits a manual section into short lines and strips bullets", () => {
    assert.deepEqual(suggestionLines("- Sit with me.\n- Make tea. Don't ask questions."), ["Sit with me.", "Make tea.", "Don't ask questions."]);
  });
  it("caps the number of lines", () => {
    assert.equal(suggestionLines("a. b. c. d. e.", 2).length, 2);
  });
  it("ignores empty input", () => {
    assert.deepEqual(suggestionLines("   \n  "), []);
  });
});
