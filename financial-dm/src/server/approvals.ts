import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureQuestTables } from "~/server/quests";
import { ensureGuildTables } from "~/server/guild";
import { ensureGuildOutputsTable } from "~/server/guildForge";
import { factLabel, missingFacts, type GuildFacts } from "~/lib/guildConfig";
import { FIT_SCORING } from "~/lib/fitQuiz";
import * as armor from "~/lib/armorConfig";
import { SHELL_CONFIG } from "~/lib/adminShell";
import { REVIEW_ITEMS } from "~/lib/reviewItems";
import { loadSignoffs } from "~/server/homeState";

/**
 * The shared pending-approvals interface (Tavern Keeper's Morning spec,
 * Section 6.3). Every tool contributes one function that returns its
 * waiting items in the same shape. The badge, the Home card, and the
 * Approvals queue only ever read this list; nothing here approves anything.
 * Contributors run in parallel and a failing one never hides the others.
 */

export interface ApprovalItem {
  label: string;
  detail?: string;
  /** Where the approval actually happens. Always a screen inside the shell. */
  href: string;
}

export interface ApprovalGroup {
  id: string;
  tool: string;
  type: string;
  count: number;
  /** Something cannot go live until John acts (Section 6.3). Sorts first. */
  blocking: boolean;
  href: string;
  items: ApprovalItem[];
}

export interface ApprovalsSummary {
  groups: ApprovalGroup[];
  total: number;
  blocking: number;
  /** Tools whose contributor failed, so the queue can say so in place. */
  errors: string[];
}

type Contributor = { id: string; run: (limit: number) => Promise<ApprovalGroup | null> };

const n = (v: unknown) => Number(v ?? 0);

/** Quest Board: content slots drafted but not yet approved. */
const draftedSlots: Contributor = {
  id: "quest_slots",
  async run(limit) {
    await ensureQuestTables();
    const [c] = (await sql()`SELECT count(*)::int AS n FROM content_slots WHERE status = 'drafted'`) as Array<{ n: number }>;
    const count = n(c?.n);
    if (!count) return null;
    const rows = (await sql()`
      SELECT s.quest_id, s.topic, s.date, q.name FROM content_slots s LEFT JOIN quests q ON q.id = s.quest_id
      WHERE s.status = 'drafted' ORDER BY s.date ASC LIMIT ${limit}`) as Array<Record<string, unknown>>;
    return {
      id: "quest_slots",
      tool: "Quest Board",
      type: count === 1 ? "post" : "posts",
      count,
      blocking: false,
      href: "/admin/quests?section=quests",
      items: rows.map((r) => ({ label: String(r.topic || "Untitled post"), detail: [r.name, r.date].filter(Boolean).join(" · "), href: `/admin/quests?section=quests&quest=${n(r.quest_id)}` })),
    };
  },
};

/** Guild forge: saved recruiting pieces not yet approved. */
const guildOutputs: Contributor = {
  id: "guild_outputs",
  async run(limit) {
    await ensureGuildOutputsTable();
    const [c] = (await sql()`SELECT count(*)::int AS n FROM guild_outputs WHERE approved = FALSE`) as Array<{ n: number }>;
    const count = n(c?.n);
    if (!count) return null;
    const rows = (await sql()`SELECT kind, title FROM guild_outputs WHERE approved = FALSE ORDER BY created_at DESC LIMIT ${limit}`) as Array<Record<string, unknown>>;
    return {
      id: "guild_outputs",
      tool: "Guild",
      type: count === 1 ? "recruiting piece" : "recruiting pieces",
      count,
      blocking: false,
      href: "/admin/forge?tab=guild&view=saved",
      items: rows.map((r) => ({ label: String(r.title || r.kind), detail: String(r.kind), href: "/admin/forge?tab=guild&view=saved" })),
    };
  },
};

/** Guild facts: required answers still missing or unconfirmed. Blocking: the Guild Hall hides until they are done. */
const guildFacts: Contributor = {
  id: "guild_facts",
  async run(limit) {
    await ensureGuildTables();
    const rows = (await sql()`SELECT key, value, confirmed FROM guild_facts`) as Array<{ key: string; value: string; confirmed: boolean | string }>;
    const facts: GuildFacts = Object.fromEntries(rows.map((r) => [r.key, { key: r.key, value: String(r.value ?? ""), confirmed: r.confirmed === true || r.confirmed === "t" }]));
    const missing = missingFacts(facts);
    if (!missing.length) return null;
    return {
      id: "guild_facts",
      tool: "Guild",
      type: missing.length === 1 ? "Guild fact to confirm" : "Guild facts to confirm",
      count: missing.length,
      blocking: true,
      href: "/admin/guild?view=facts",
      items: missing.slice(0, limit).map((k) => ({ label: factLabel(k), href: "/admin/guild?view=facts" })),
    };
  },
};

/** Quiz config values that carry a confirmed-by-John flag. Blocking while false. */
const quizConfig: Contributor = {
  id: "quiz_config",
  async run() {
    const items: ApprovalItem[] = [];
    for (const [name, v] of Object.entries(armor)) {
      if (v && typeof v === "object" && "confirmedByJohn" in v && !(v as { confirmedByJohn: boolean }).confirmedByJohn) {
        items.push({ label: `Life Insurance Quiz estimate values (${name})`, detail: "Confirm the numbers in the config file, then set confirmedByJohn to true.", href: "/admin/settings" });
      }
    }
    if (!FIT_SCORING.confirmedByJohn) items.push({ label: "Fit quiz scoring thresholds", detail: "Set confirmedByJohn in the fit quiz config once John approves.", href: "/admin/settings" });
    if (!items.length) return null;
    return { id: "quiz_config", tool: "Quizzes", type: items.length === 1 ? "config value to confirm" : "config values to confirm", count: items.length, blocking: true, href: "/admin/settings", items };
  },
};

/** One-time reviews of copy and numbers that live in code, shown read-only under Settings. Never blocking. */
const configReviews: Contributor = {
  id: "config_reviews",
  async run(limit) {
    const signed = await loadSignoffs();
    const open = REVIEW_ITEMS.filter((r) => !signed[r.key]);
    if (!open.length) return null;
    return {
      id: "config_reviews",
      tool: "Settings",
      type: open.length === 1 ? "config review" : "config reviews",
      count: open.length,
      blocking: false,
      href: "/admin/settings",
      items: open.slice(0, limit).map((r) => ({ label: r.label, detail: `${r.tool} · mark reviewed under Settings`, href: `/admin/settings?view=${r.view}` })),
    };
  },
};

/** Section 6.3: tools register here. A new tool adds one entry and the badge, card, and queue pick it up. */
const CONTRIBUTORS: Contributor[] = [guildFacts, quizConfig, draftedSlots, guildOutputs, configReviews];

export async function collectApprovals(limit: number = SHELL_CONFIG.cardItemLimit): Promise<ApprovalsSummary> {
  const results = await Promise.allSettled(CONTRIBUTORS.map((c) => c.run(limit)));
  const groups: ApprovalGroup[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value) groups.push(r.value);
    } else {
      errors.push(CONTRIBUTORS[i].id);
    }
  });
  groups.sort((a, b) => Number(b.blocking) - Number(a.blocking) || b.count - a.count);
  return {
    groups,
    total: groups.reduce((s, g) => s + g.count, 0),
    blocking: groups.filter((g) => g.blocking).reduce((s, g) => s + g.count, 0),
    errors,
  };
}

export const getApprovals = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<ApprovalsSummary> => collectApprovals());
