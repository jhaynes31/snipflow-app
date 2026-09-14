import { describe, expect, test } from "bun:test";
import { HOW_TO_GROUPS, HOW_TO_TOPICS, neighbours, searchTopics, topicById } from "./howTo";

describe("How To index", () => {
  test("every topic has a unique id, a known group, and a title", () => {
    const ids = HOW_TO_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of HOW_TO_TOPICS) {
      expect(HOW_TO_GROUPS).toContain(t.group);
      expect(t.title.length).toBeGreaterThan(3);
    }
    expect(HOW_TO_TOPICS.filter((t) => t.group === "Quest Board").length).toBeGreaterThanOrEqual(6);
  });

  test("search matches titles, groups, and John's words; every typed word must hit", () => {
    expect(searchTopics("").length).toBe(HOW_TO_TOPICS.length);
    expect(searchTopics("remote").map((t) => t.id)).toContain("present-keys");
    expect(searchTopics("keys remote").map((t) => t.id)).toEqual(["present-keys"]);
    expect(searchTopics("bold").map((t) => t.id)).toEqual(["screen-format"]);
    expect(searchTopics("phone present").map((t) => t.id)).toContain("present");
    expect(searchTopics("quest board").every((t) => t.group === "Quest Board")).toBe(true);
    expect(searchTopics("zzzz nothing").length).toBe(0);
  });

  test("lookup and neighbours", () => {
    expect(topicById("recruits")?.group).toBe("Recruits");
    expect(topicById("nope")).toBeUndefined();
    const first = HOW_TO_TOPICS[0];
    expect(neighbours(first.id).prev).toBeUndefined();
    expect(neighbours(first.id).next?.id).toBe(HOW_TO_TOPICS[1].id);
    expect(neighbours("recruits").next).toBeUndefined();
  });
});
