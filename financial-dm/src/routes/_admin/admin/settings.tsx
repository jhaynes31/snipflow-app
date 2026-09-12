import { Link, createFileRoute } from "@tanstack/react-router";

/**
 * Settings tab (Tavern Keeper's Morning spec, Section 7): a hub that points
 * at the config and content other tools own. Phase 1 links what has a
 * screen today; read-only views of file-based config arrive in Phase 3.
 */
export const Route = createFileRoute("/_admin/admin/settings")({
  component: SettingsPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, search?: Record<string, string>) => ({ to, search } as any);

const ENTRIES: Array<{ label: string; blurb: string; to?: string; search?: Record<string, string>; soon?: string }> = [
  { label: "Guild facts and FAQ", blurb: "Every claim the Guild Hall makes, in John's words, plus the pause switch and the fit quiz approval.", to: "/admin/guild", search: { view: "facts" } },
  { label: "Client profiles and recruit profiles", blurb: "Who each quest is aimed at.", to: "/admin/quests", search: { section: "profiles" } },
  { label: "Password", blurb: "Change the password for these private tools.", to: "/admin/settings/password" },
  { label: "Estimate values", blurb: "The Life Insurance Quiz's coverage estimate numbers, with John's confirmation flag.", soon: "Read-only view coming in Phase 3. Lives in the quiz config file." },
  { label: "Loot table and loot content", blurb: "The armor loot pages and the ten Wealth Check guides.", soon: "Read-only view coming in Phase 3. Lives in the loot config files." },
  { label: "Compliance and flag word lists", blurb: "Words the forges flag: earnings hype, hiring-safe, titles, scam patterns.", soon: "Read-only view coming in Phase 3. Lives in the Quest Board and Guild config files." },
  { label: "Platform list", blurb: "Where posts go: the platforms a quest can plan for.", soon: "Read-only view coming in Phase 3." },
  { label: "Email templates and mailing address", blurb: "Nothing is sent by email yet; there is no email provider connected.", soon: "Not built. Needs an email provider first." },
];

function SettingsPage() {
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-settings>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>⚙️ Settings</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Where everything is set. Each entry opens the screen that owns it.</p>
        </div>
        <ul className="space-y-2">
          {ENTRIES.map((e) => (
            <li key={e.label} className={`${card} p-4 flex flex-wrap items-start justify-between gap-3`} data-setting={e.label}>
              <div className="min-w-0">
                <p className="text-[#e0e0e0] font-fantasy">{e.label}</p>
                <p className="text-[#a0a0a0] text-xs mt-0.5">{e.blurb}</p>
                {e.soon && <p className="text-[#806040] text-[11px] font-fantasy mt-1">Coming soon · {e.soon}</p>}
              </div>
              {e.to && (
                <Link {...linkTo(e.to, e.search)} className="shrink-0 px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]">
                  Open →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
