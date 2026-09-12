import { describe, expect, test } from "bun:test";
import { ADMIN_TABS, activeTab, availableTabs, crumb, greetingWord } from "./adminShell";

describe("admin shell", () => {
  test("tabs are in the fixed order and every built one has a route", () => {
    expect(ADMIN_TABS.map((t) => t.id)).toEqual(["home", "leads", "quests", "forge", "quizzes", "guild", "settings"]);
    for (const t of availableTabs()) expect(t.to.startsWith("/admin")).toBe(true);
    // Home, Leads, and Quest Board are never collapsed away on a phone.
    for (const id of ["home", "leads", "quests"]) expect(ADMIN_TABS.find((t) => t.id === id)?.mobilePrimary).toBe(true);
    expect(ADMIN_TABS.filter((t) => t.mobilePrimary).length).toBe(5);
  });

  test("child screens keep the parent tab active", () => {
    expect(activeTab("/admin")?.id).toBe("home");
    expect(activeTab("/admin/")?.id).toBe("home");
    expect(activeTab("/admin/leads")?.id).toBe("leads");
    expect(activeTab("/admin/settings/password")?.id).toBe("settings");
    expect(activeTab("/admin/approvals")?.id).toBe("home");
    expect(activeTab("/login")).toBeUndefined();
  });

  test("breadcrumbs name the deep screen and stay empty on a main view", () => {
    expect(crumb("/admin/quests", { section: "quests" })?.sub).toEqual([]);
    expect(crumb("/admin/quests", { section: "scoreboard" })?.sub).toEqual(["Scoreboard"]);
    expect(crumb("/admin/quests", { section: "quests", quest: 4 })?.sub).toEqual(["Quest detail"]);
    expect(crumb("/admin/forge", { tab: "guild", view: "saved" })?.sub).toEqual(["Guild forge", "Saved work"]);
    expect(crumb("/admin/guild", { view: "facts" })?.sub).toEqual(["Guild facts and FAQ"]);
    expect(crumb("/admin/settings/password", {})?.sub).toEqual(["Password"]);
  });

  test("greeting follows the clock", () => {
    expect(greetingWord(7)).toBe("Morning");
    expect(greetingWord(13)).toBe("Afternoon");
    expect(greetingWord(20)).toBe("Evening");
  });
});
