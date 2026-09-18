import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accessFor, relationshipTo, VISIBILITY } from "../convex/privacy.ts";

describe("privacy gate", () => {
  it("the author always sees everything of their own", () => {
    for (const v of VISIBILITY) assert.equal(accessFor("self", v), "full");
  });
  it("private stays with the author", () => {
    assert.equal(accessFor("partner", "private"), "none");
    assert.equal(accessFor("stranger", "private"), "none");
  });
  it("shared reaches the partner in full, never a stranger", () => {
    assert.equal(accessFor("partner", "shared"), "full");
    assert.equal(accessFor("stranger", "shared"), "none");
  });
  it("shared summary gives the partner only the summary", () => {
    assert.equal(accessFor("partner", "sharedSummary"), "summary");
    assert.equal(accessFor("stranger", "sharedSummary"), "none");
  });
  it("relationship is decided by profile ids", () => {
    assert.equal(relationshipTo("a", "b", "a"), "self");
    assert.equal(relationshipTo("a", "b", "b"), "partner");
    assert.equal(relationshipTo("a", null, "b"), "stranger");
    assert.equal(relationshipTo("a", "b", "c"), "stranger");
  });
});
