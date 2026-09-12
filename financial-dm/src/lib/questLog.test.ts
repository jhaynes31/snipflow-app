import { describe, expect, test } from "bun:test";
import { DEFAULT_QUEST_LOG_STEPS, daysSince, needsNudge, newQuestLog, nextStep, nudgeText, parseQuestLog, questLogProgress, stageFromLog } from "./questLog";

describe("quest log", () => {
  test("a new log has the default steps, none done, and unique ids", () => {
    const log = newQuestLog(new Date("2026-09-01T12:00:00Z"));
    expect(log.steps.length).toBe(DEFAULT_QUEST_LOG_STEPS.length);
    expect(log.steps.every((s) => !s.done)).toBe(true);
    expect(new Set(log.steps.map((s) => s.id)).size).toBe(log.steps.length);
    expect(questLogProgress(log)).toEqual({ done: 0, total: log.steps.length, percent: 0 });
    expect(nextStep(log)?.id).toBe("kickoff");
  });

  test("the steps that move a recruit's stage line up with the pipeline", () => {
    const stages = DEFAULT_QUEST_LOG_STEPS.filter((s) => s.stage).map((s) => s.stage);
    expect(stages).toEqual(["getting_licensed", "licensed", "contracted", "first_sale"]);
  });

  test("stored logs are parsed defensively", () => {
    expect(parseQuestLog(null)).toBeNull();
    expect(parseQuestLog("")).toBeNull();
    expect(parseQuestLog("not json")).toBeNull();
    expect(parseQuestLog({ steps: "nope" })).toBeNull();
    const log = parseQuestLog(JSON.stringify({ steps: [{ id: "a", title: "A", done: true, doneBy: "recruit", stage: "bogus" }, { id: "", title: "skip me" }, { id: "b", title: "  " }], startedAt: "2026-09-01T00:00:00Z", message: "hi" }));
    expect(log?.steps.map((s) => s.id)).toEqual(["a"]);
    expect(log?.steps[0].stage).toBeUndefined();
    expect(log?.steps[0].doneBy).toBe("recruit");
    expect(log?.lastProgressAt).toBe("2026-09-01T00:00:00Z");
    expect(log?.message).toBe("hi");
  });

  test("progress, next step, and the stage the ticked steps imply", () => {
    const log = newQuestLog();
    log.steps[0].done = true; log.steps[0].doneBy = "john";
    log.steps[1].done = true; log.steps[1].doneBy = "john";
    expect(questLogProgress(log).done).toBe(2);
    expect(nextStep(log)?.id).toBe("course_done");
    expect(stageFromLog(log)).toBe("getting_licensed");
    // A step the recruit ticked never moves the stage on its own.
    const lic = log.steps.find((s) => s.id === "license_approved")!;
    lic.done = true; lic.doneBy = "recruit";
    expect(stageFromLog(log)).toBe("getting_licensed");
    lic.doneBy = "john";
    expect(stageFromLog(log)).toBe("licensed");
  });

  test("nudges fire after a quiet week and never on a finished log", () => {
    const now = new Date("2026-09-12T12:00:00Z");
    const log = newQuestLog(new Date("2026-09-01T12:00:00Z"));
    expect(daysSince(log.startedAt, now)).toBe(11);
    expect(needsNudge(log, now)).toBe(true);
    log.lastProgressAt = "2026-09-10T12:00:00Z";
    expect(needsNudge(log, now)).toBe(false);
    for (const s of log.steps) { s.done = true; s.doneBy = "john"; }
    log.lastProgressAt = "2026-08-01T00:00:00Z";
    expect(needsNudge(log, now)).toBe(false);
  });

  test("the nudge text names the person and the next step, with no pressure words", () => {
    const log = newQuestLog();
    log.steps[0].done = true;
    const t = nudgeText("Sam Rivera", log, "https://thefinancialdm.com/quest-log/abc");
    expect(t).toContain("Hey Sam, John here.");
    expect(t).toContain("Enroll in the pre-licensing course");
    expect(t).toContain("/quest-log/abc");
    expect(t).not.toMatch(/deadline|urgent|asap|hurry/i);
  });
});
