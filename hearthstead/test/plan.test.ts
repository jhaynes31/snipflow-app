import "./helpers";
import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlan } from "../src/orchestrator";

const item = (key: string, dependsOn: string[] = [], requiresApproval = false) => ({
  key, title: key, brief: key, role: "copywriter", dependsOn, requiresApproval,
});

test("parses a plan wrapped in prose", () => {
  const items = parsePlan(`Here you go:\n${JSON.stringify({ tasks: [item("a"), item("b", ["a"], true)] })}\nThanks`);
  assert.deepEqual(items.map((i) => i.key), ["a", "b"]);
});

test("the last task needs approval when the plan forgot to say", () => {
  const items = parsePlan(JSON.stringify({ tasks: [item("a"), item("b", ["a"])] }));
  assert.equal(items[1].requiresApproval, true);
});

test("rejects unknown deps, cycles, duplicate keys, and empty plans", () => {
  assert.throws(() => parsePlan(JSON.stringify({ tasks: [item("a", ["x"])] })), /unknown/);
  assert.throws(() => parsePlan(JSON.stringify({ tasks: [item("a", ["b"]), item("b", ["a"])] })), /cycle/);
  assert.throws(() => parsePlan(JSON.stringify({ tasks: [item("a"), item("a")] })), /unique/);
  assert.throws(() => parsePlan(JSON.stringify({ tasks: [] })), /no tasks/);
});
