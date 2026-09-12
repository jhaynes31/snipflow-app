import { QUEST_LOG_STALE_DAYS } from "./questLog";

/**
 * The admin shell (Tavern Keeper's Morning spec, Section 3). One config
 * drives the top bar, the phone bottom bar, breadcrumbs, and which tools
 * are switched on. Adding a tool later is one entry here.
 */

export type TabId = "home" | "leads" | "quests" | "forge" | "quizzes" | "guild" | "settings";

export interface AdminTab {
  id: TabId;
  /** Full label for desktop. */
  label: string;
  /** Short label for tablets and the phone bar. */
  short: string;
  icon: string;
  to: string;
  search?: Record<string, string>;
  /** Rule 2.2: an unbuilt tool's tab is hidden and its cards never render. */
  available: boolean;
  /** Section 3.2, mobile: the five most-used tabs sit in the bottom bar; the rest go under More. */
  mobilePrimary: boolean;
}

/** Section 2.2: one place that says what exists. Flip a flag and the shell and Home follow. */
export const TOOLS_BUILT = {
  leads: true,
  quests: true,
  forge: true,
  quizzes: true,
  guild: true,
  settings: true,
  approvals: true,
  /** Card 2 needs a readable booking source; decided server-side by the presence of CALENDLY_TOKEN (Phase 4). */
  appointments: false,
} as const;

export const ADMIN_TABS: AdminTab[] = [
  { id: "home", label: "The Tavern Keeper's Morning", short: "Home", icon: "🍺", to: "/admin", available: true, mobilePrimary: true },
  { id: "leads", label: "Leads", short: "Leads", icon: "⚔️", to: "/admin/leads", available: TOOLS_BUILT.leads, mobilePrimary: true },
  { id: "quests", label: "Quest Board", short: "Quests", icon: "🗺️", to: "/admin/quests", search: { section: "quests" }, available: TOOLS_BUILT.quests, mobilePrimary: true },
  { id: "forge", label: "Content Forge", short: "Forge", icon: "🧙", to: "/admin/forge", search: { tab: "script", view: "forge" }, available: TOOLS_BUILT.forge, mobilePrimary: true },
  { id: "quizzes", label: "Quizzes", short: "Quizzes", icon: "🎲", to: "/admin/quizzes", available: TOOLS_BUILT.quizzes, mobilePrimary: false },
  { id: "guild", label: "Guild", short: "Guild", icon: "🛡️", to: "/admin/guild", search: { view: "recruits" }, available: TOOLS_BUILT.guild, mobilePrimary: true },
  { id: "settings", label: "Settings", short: "Settings", icon: "⚙️", to: "/admin/settings", available: TOOLS_BUILT.settings, mobilePrimary: false },
];

export const availableTabs = () => ADMIN_TABS.filter((t) => t.available);

/** Which tab a path belongs to. Child screens keep their parent's tab marked (Section 3.2). */
export function activeTab(pathname: string): AdminTab | undefined {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/admin") return ADMIN_TABS[0];
  let best: AdminTab | undefined;
  for (const t of ADMIN_TABS) {
    if (t.id === "home") continue;
    if ((p === t.to || p.startsWith(t.to + "/")) && (!best || t.to.length > best.to.length)) best = t;
  }
  // Anything else under /admin (the approvals queue, for one) belongs to Home.
  return best ?? (p.startsWith("/admin/") ? ADMIN_TABS[0] : undefined);
}

const QUEST_SECTIONS: Record<string, string> = { profiles: "Profiles", quests: "Quests", scoreboard: "Scoreboard", guide: "Guide" };
const FORGE_TABS: Record<string, string> = { script: "Script forge", meme: "Meme forge", carousel: "Carousel forge", card: "Social card forge", broll: "B Roll finder", guild: "Guild forge" };
const GUILD_VIEWS: Record<string, string> = { recruits: "Recruits", questlogs: "Quest Logs", facts: "Guild facts and FAQ" };

/**
 * Breadcrumb for deep screens (Section 3.2): the tool name, then where
 * inside it John is. Empty when he is on a tool's main view.
 */
export function crumb(pathname: string, search: Record<string, unknown>): { tab: AdminTab; sub: string[] } | null {
  const tab = activeTab(pathname);
  if (!tab) return null;
  const sub: string[] = [];
  const s = (k: string) => (search[k] == null ? "" : String(search[k]));
  const p = pathname.replace(/\/+$/, "");
  if (tab.id === "quests") {
    const sec = s("section") || "quests";
    if (sec !== "quests") sub.push(QUEST_SECTIONS[sec] ?? sec);
    if (s("quest")) sub.push("Quest detail");
  } else if (tab.id === "forge") {
    const t = s("tab") || "script";
    if (t !== "script" || s("view") === "saved" || s("slot")) sub.push(FORGE_TABS[t] ?? t);
    if (s("view") === "saved") sub.push("Saved work");
    if (s("slot")) sub.push("Working on a quest post");
  } else if (tab.id === "guild") {
    const v = s("view") || "recruits";
    if (v !== "recruits") sub.push(GUILD_VIEWS[v] ?? v);
  } else if (tab.id === "settings") {
    if (p.endsWith("/password")) sub.push("Password");
  } else if (tab.id === "home") {
    if (p.endsWith("/approvals")) sub.push("Approvals");
  }
  return { tab, sub };
}

/** Section 8 config. Only the shell and Home read these. */
export const SHELL_CONFIG = {
  cardItemLimit: 5,
  filmWindowDays: 3,
  coldLeadDays: 7,
  stallDays: QUEST_LOG_STALE_DAYS,
  /** "none" until CALENDLY_TOKEN is set; Phase 4 reads Calendly. */
  bookingSource: "calendly" as "none" | "calendly",
  /** John's week starts Monday at midnight, Central time (assumed; easy to change). */
  weekStart: { weekday: 1, hour: 0, timeZone: "America/Chicago" },
} as const;

/** Section 5.2: time-aware and plain. */
export function greetingWord(hour: number): "Morning" | "Afternoon" | "Evening" {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}
