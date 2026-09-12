import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as armor from "~/lib/armorConfig";
import * as lifeMyths from "~/lib/lifeMyths";
import { MYTH_DECK } from "~/components/life/mythDeck";
import * as wealthProfile from "~/lib/wealthProfile";
import * as armorLoot from "~/lib/armorLoot";
import * as wealthLoot from "~/lib/wealthLoot";
import * as lootPages from "~/lib/lootPages";
import { QUEST_CONFIG } from "~/lib/questConfig";
import { GUILD_CONFIG } from "~/lib/guildConfig";
import { REVIEW_ITEMS, flattenConfig, type SettingsViewId } from "~/lib/reviewItems";
import { getSignoffs, setSignoff, type Signoffs } from "~/server/homeState";
import { getMailStatus } from "~/server/mail";
import type { MailStatus } from "~/server/mail.server";
import { MAIL_TEMPLATES } from "~/lib/mailTemplates";

/**
 * Settings (Tavern Keeper's Morning spec, Section 7): a hub that points at
 * the config and content other tools own. File-based config is shown
 * read-only with a note on where it changes, placeholders are flagged, and
 * John can mark a view reviewed. No editor is built here.
 */
export const Route = createFileRoute("/_admin/admin/settings")({
  validateSearch: (s: Record<string, unknown>): { view?: SettingsViewId } => ({
    view: s.view === "quizzes" || s.view === "loot" || s.view === "flags" || s.view === "platforms" || s.view === "email" ? s.view : undefined,
  }),
  component: SettingsPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const btn = `shrink-0 px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs ${focus}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

/** Picks the plain data exports of a config module: objects and arrays, never functions or types. */
function dataExports(mod: Record<string, unknown>, only?: string[]): Array<[string, unknown]> {
  // Sorted by name so the server and the browser render the same order.
  return Object.entries(mod)
    .filter(([k, v]) => (only ? only.includes(k) : true) && v !== null && typeof v === "object")
    .sort(([a], [b]) => a.localeCompare(b));
}

interface ViewDef {
  id: SettingsViewId;
  title: string;
  where: string;
  sections: Array<{ label: string; data: unknown }>;
  reviewKeys: string[];
}

const VIEWS: ViewDef[] = [
  {
    id: "quizzes",
    title: "Quiz copy and estimate values",
    where: "These live in the quiz config files in the site's code (armorConfig, lifeMyths, wealthProfile). Tell Jen or Claude what to change and it ships with the next deploy.",
    sections: [
      ...dataExports(armor as Record<string, unknown>).map(([k, v]) => ({ label: `Life Insurance Quiz · ${k}`, data: v })),
      { label: "Life Insurance Quiz · Trap or Treasure deck", data: MYTH_DECK },
      ...dataExports(lifeMyths as Record<string, unknown>).map(([k, v]) => ({ label: `Life Insurance Quiz myths · ${k}`, data: v })),
      ...dataExports(wealthProfile as Record<string, unknown>, ["STAT_META", "TIER_CONFIG", "TIER_META", "CLASS_META"]).map(([k, v]) => ({ label: `Wealth Check · ${k}`, data: v })),
    ],
    reviewKeys: ["quiz_life_copy", "quiz_wealth_copy"],
  },
  {
    id: "loot",
    title: "Loot table and loot content",
    where: "The armor loot pages and the Wealth Check guides live in the loot config files (armorLoot, lootPages, wealthLoot). Swap a guide by changing its file address there.",
    sections: [
      ...dataExports(armorLoot as Record<string, unknown>).map(([k, v]) => ({ label: `Armor loot · ${k}`, data: v })),
      ...dataExports(lootPages as Record<string, unknown>, ["LOOT_PAGES"]).map(([k, v]) => ({ label: `Loot pages · ${k}`, data: v })),
      ...dataExports(wealthLoot as Record<string, unknown>, ["LOOT_TABLE"]).map(([k, v]) => ({ label: `Wealth Check guides · ${k}`, data: v })),
    ],
    reviewKeys: ["loot_armor", "loot_wealth_guides"],
  },
  {
    id: "flags",
    title: "Compliance and flag word lists",
    where: "The forges scan every draft against these lists. They live in the Quest Board and Guild config files.",
    sections: [
      { label: "Client content · complianceFlagWords", data: QUEST_CONFIG.complianceFlagWords },
      { label: "Recruiting · earningsFlagWords", data: GUILD_CONFIG.earningsFlagWords },
      { label: "Recruiting · hiringSafeFlagWords", data: GUILD_CONFIG.hiringSafeFlagWords },
      { label: "Recruiting · protected titles", data: GUILD_CONFIG.titleFlagWords },
      { label: "Recruiting · titles flagged on their own or as the role offered", data: GUILD_CONFIG.roleTitleFlagWords },
      { label: "Recruiting · scamPatternFlagWords", data: GUILD_CONFIG.scamPatternFlagWords },
    ],
    reviewKeys: ["flag_words"],
  },
  {
    id: "platforms",
    title: "Platform list and quest defaults",
    where: "Where posts go and how quests are planned. Lives in the Quest Board config file.",
    sections: [
      { label: "Platforms", data: QUEST_CONFIG.platforms },
      { label: "Quest defaults", data: Object.fromEntries(Object.entries(QUEST_CONFIG).filter(([k]) => !["platforms", "complianceFlagWords", "reservedSlugs", "generators"].includes(k))) },
    ],
    reviewKeys: [],
  },
];

const ENTRIES: Array<{ label: string; blurb: string; to?: string; search?: Record<string, string>; view?: SettingsViewId; soon?: string }> = [
  { label: "Guild facts and FAQ", blurb: "Every claim the Guild Hall makes, in John's words, plus the pause switch and the fit quiz approval.", to: "/admin/guild", search: { view: "facts" } },
  { label: "Client profiles and recruit profiles", blurb: "Who each quest is aimed at.", to: "/admin/quests", search: { section: "profiles" } },
  { label: "Quiz copy and estimate values", blurb: "The Life Insurance Quiz's estimate numbers, tier copy, and myth cards; the Wealth Check's classes and tiers.", view: "quizzes" },
  { label: "Loot table and loot content", blurb: "The armor loot pages and the ten Wealth Check guides.", view: "loot" },
  { label: "Compliance and flag word lists", blurb: "Words the forges flag: earnings hype, hiring-safe, titles, scam patterns.", view: "flags" },
  { label: "Platform list", blurb: "Where posts go, and the quest planning defaults.", view: "platforms" },
  { label: "Practice rubrics", blurb: "What the Sparring Dummy's debrief notices, for Coverage and for Recruiting. John's words, edited on the Practice page.", to: "/admin/practice" },
  { label: "Password", blurb: "Change the password for these private tools.", to: "/admin/settings/password" },
  { label: "Email notifications and templates", blurb: "Where John's notifications go, whether sending is set up, and the wording of every email the site can send.", view: "email" },
];

function SettingsPage() {
  const { view } = Route.useSearch();
  const def = VIEWS.find((v) => v.id === view);
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-settings>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>⚙️ Settings</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Where everything is set. Each entry opens the screen that owns it; file-based config is shown read-only.</p>
        </div>
        {view === "email" ? <EmailView /> : def ? <ConfigView def={def} /> : <Hub />}
      </div>
    </main>
  );
}

function Hub() {
  return (
    <ul className="space-y-2">
      {ENTRIES.map((e) => (
        <li key={e.label} className={`${card} p-4 flex flex-wrap items-start justify-between gap-3`} data-setting={e.label}>
          <div className="min-w-0">
            <p className="text-[#e0e0e0] font-fantasy">{e.label}</p>
            <p className="text-[#a0a0a0] text-xs mt-0.5">{e.blurb}</p>
            {e.soon && <p className="text-[#806040] text-[11px] font-fantasy mt-1">Not available · {e.soon}</p>}
          </div>
          {e.to && <Link {...linkTo(e.to, e.search)} className={btn}>Open →</Link>}
          {e.view && <Link {...linkTo("/admin/settings", { view: e.view })} className={btn} data-settings-view-link={e.view}>View values →</Link>}
        </li>
      ))}
    </ul>
  );
}

function ConfigView({ def }: { def: ViewDef }) {
  const [signoffs, setSignoffs] = useState<Signoffs>({});
  const [busy, setBusy] = useState("");
  useEffect(() => {
    getSignoffs().then(setSignoffs).catch(() => setSignoffs({}));
  }, []);
  const sections = useMemo(() => def.sections.map((s) => ({ ...s, rows: flattenConfig(s.data) })), [def]);
  const placeholders = sections.reduce((t, s) => t + s.rows.filter((r) => r.placeholder).length, 0);
  const reviews = REVIEW_ITEMS.filter((r) => def.reviewKeys.includes(r.key));
  const toggle = async (key: string, signed: boolean) => {
    setBusy(key);
    try {
      const res = await setSignoff({ data: { key, signed } });
      if (res.ok) setSignoffs((prev) => {
        const next = { ...prev };
        if (signed) next[key] = res.signedAt ?? new Date().toISOString();
        else delete next[key];
        return next;
      });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-4" data-settings-view={def.id}>
      <Link {...linkTo("/admin/settings")} className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">← All settings</Link>
      <section className={`${card} p-4`}>
        <h2 className="font-fantasy text-[#e0e0e0] text-lg">{def.title}</h2>
        <p className="text-[#a0a0a0] text-xs mt-1">Read-only. {def.where}</p>
        <p className={`text-xs font-fantasy mt-2 ${placeholders ? "text-[#e0c080]" : "text-[#7fd08a]"}`} data-placeholder-count={placeholders}>
          {placeholders ? `${placeholders} value${placeholders === 1 ? " looks" : "s look"} like a placeholder. Flagged below.` : "No placeholders found."}
        </p>
        {reviews.length > 0 && (
          <ul className="mt-3 space-y-1.5" data-review-list>
            {reviews.map((r) => {
              const at = signoffs[r.key];
              return (
                <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#406080]/30 px-3 py-2" data-review={r.key} data-signed={at ? "true" : "false"}>
                  <span className="text-sm text-[#e0e0e0]">{r.label}{at && <span className="block text-[11px] text-[#7fd08a]">Reviewed by John · {new Date(at).toLocaleDateString()}</span>}</span>
                  <button type="button" onClick={() => toggle(r.key, !at)} disabled={busy === r.key} className={at ? btn : `${btn} bg-[#c08020] text-[#0d1520] border-[#c08020] hover:text-[#0d1520]`} data-review-toggle>
                    {at ? "Undo" : "✔ Mark reviewed by John"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {sections.map((s) => (
        <section key={s.label} className={`${card} overflow-hidden`} data-config-section>
          <h3 className="px-4 py-2 border-b border-[#406080]/20 font-fantasy text-[#c08020] text-sm">{s.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                {s.rows.slice(0, 400).map((r) => (
                  <tr key={r.path} className={`border-b border-[#406080]/10 ${r.placeholder ? "bg-[#c08020]/10" : ""}`} data-placeholder={r.placeholder ? "true" : undefined}>
                    <td className="px-4 py-1.5 text-[#808080] font-mono whitespace-nowrap align-top">{r.path}</td>
                    <td className="px-4 py-1.5 text-[#e0e0e0] align-top break-words">{r.placeholder && <span className="mr-2 text-[10px] uppercase tracking-wider text-[#c08020] font-fantasy">placeholder</span>}{r.value}</td>
                  </tr>
                ))}
                {s.rows.length > 400 && <tr><td colSpan={2} className="px-4 py-2 text-[#606080]">and {s.rows.length - 400} more rows in the file</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}


/** Section 7: email status and templates, read-only. Templates live in the mail templates file. */
function EmailView() {
  const [status, setStatus] = useState<MailStatus | null>(null);
  useEffect(() => {
    getMailStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  return (
    <div className="space-y-4" data-settings-view="email">
      <Link {...linkTo("/admin/settings")} className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">← All settings</Link>
      <section className={`${card} p-4`} data-mail-status data-configured={status?.configured ? "true" : "false"}>
        <h2 className="font-fantasy text-[#e0e0e0] text-lg">Email notifications</h2>
        {!status ? (
          <p className="text-[#a0a0a0] text-xs mt-1">Checking...</p>
        ) : status.configured ? (
          <p className="text-[#7fd08a] text-sm mt-1">Sending is set up. From <span className="text-[#e0e0e0]">{status.from}</span> via <span className="text-[#e0e0e0]">{status.host}</span>. John's notifications go to <span className="text-[#e0e0e0]">{status.notifyTo}</span>.</p>
        ) : (
          <div className="text-sm mt-1 space-y-1">
            <p className="text-[#e0c080]">Sending is not set up yet, so no email goes out. Everything else works normally.</p>
            <p className="text-[#a0a0a0] text-xs">Missing in Vercel: <span className="font-mono text-[#e0e0e0]">{status.missing.join(", ")}</span>. Notifications will go to <span className="text-[#e0e0e0]">{status.notifyTo}</span> once they do.</p>
          </div>
        )}
        <p className="text-[11px] text-[#606080] mt-2">Plain SMTP, so it works with Proton's SMTP submission (business plans with a custom domain), Resend, or any other provider. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, and optionally NOTIFY_TO.</p>
      </section>
      {MAIL_TEMPLATES.map((t) => {
        const sample = t.sample();
        return (
          <section key={t.id} className={`${card} overflow-hidden`} data-mail-template={t.id}>
            <div className="px-4 py-3 border-b border-[#406080]/20">
              <h3 className="font-fantasy text-[#c08020] text-sm">{t.name}</h3>
              <p className="text-[11px] text-[#a0a0a0] mt-0.5">To: {t.to} · When: {t.when}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-[#808080]">Sample subject</p>
              <p className="text-sm text-[#e0e0e0]">{sample.subject}</p>
              <p className="text-xs text-[#808080] mt-3">Sample body</p>
              <pre className="text-xs text-[#c9d3e3] whitespace-pre-wrap font-sans mt-1">{sample.text}</pre>
            </div>
          </section>
        );
      })}
      <p className="text-[11px] text-[#606080]">Wording lives in the mail templates file. Tell Jen or Claude what to change.</p>
    </div>
  );
}
