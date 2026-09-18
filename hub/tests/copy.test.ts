import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findBanned } from "../core/copy/banned.mjs";
import { COPY } from "../core/copy/strings.ts";

function flatten(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String((value as (n: string) => string)("Jen"))];
  if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
  return [];
}

describe("shame-free copy", () => {
  it("flags the phrases the contract forbids", () => {
    assert.deepEqual(findBanned("Don't forget your streak!"), ["don't forget", "streak"]);
    assert.deepEqual(findBanned("You missed 3 days"), ["you missed"]);
    assert.deepEqual(findBanned("Welcome back."), []);
  });
  it("shell copy contains none of them", () => {
    for (const s of flatten(COPY)) assert.deepEqual(findBanned(s), [], s);
  });
  it("returns after a gap are greeted with welcome, not with what was missed", () => {
    assert.equal(COPY.welcomeBack, "Welcome back.");
    assert.equal(COPY.welcomeHome("Jen"), "Welcome home, Jen.");
  });
});
