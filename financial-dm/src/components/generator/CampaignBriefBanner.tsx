import { seriesOpener, type CampaignBrief } from "~/lib/campaign";
import { generatorById } from "~/lib/questConfig";

/** The brief a Quest Board slot handed to the forge (spec, Section 7.1). */
export default function CampaignBriefBanner({ brief, onClear }: { brief: CampaignBrief; onClear: () => void }) {
  const g = generatorById(brief.generator);
  const opener = seriesOpener(brief.series);
  return (
    <section className="rounded-xl border border-[#c08020]/50 bg-[#0d1520]/70 p-4 space-y-2" data-campaign-brief>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[#c08020] font-fantasy text-sm">🗺️ Campaign brief · {brief.questName}</p>
          <p className="text-[#a0a0a0] text-xs font-fantasy">
            {brief.date} · {g?.label ?? brief.generator}
            {opener ? ` · ${opener}${brief.series?.totalParts ? ` of ${brief.series.totalParts}` : ""}` : ""} · for {brief.profileName || "the profile"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/quest-board?section=quests&quest=${brief.questId}`} className="px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy">
            ← Back to quest
          </a>
          <button type="button" onClick={onClear} className="px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy">
            Clear brief
          </button>
        </div>
      </div>
      <div className="grid gap-1 text-sm">
        <p className="text-[#e0e0e0]">
          <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Pain point</span>“{brief.painPoint}”
        </p>
        {brief.hookAngle && (
          <p className="text-[#e8c884]">
            <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Hook angle</span>
            {brief.hookAngle}
          </p>
        )}
        {brief.series?.previousPartSummary && (
          <p className="text-[#a0a0a0] text-xs">
            <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Last part covered</span>
            {brief.series.previousPartSummary}
          </p>
        )}
        <p className="text-[#7fd08a] font-fantasy text-sm">
          <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Say at the end</span>“{brief.spokenLine}”
        </p>
      </div>
      {!brief.generatorAvailable && <p className="text-red-300 text-xs font-fantasy">This slot's generator isn't built yet. Make it another way, or switch the slot's generator on the Quest Board.</p>}
    </section>
  );
}
