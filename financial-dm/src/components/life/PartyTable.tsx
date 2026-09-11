import { PARTY_META, isSolo, type Party } from "~/lib/armorEngine";

/**
 * The party "at the table": one portrait chip per selected member. Stays on
 * screen through the questions, the way the financial quiz's stat sheet does.
 */
export default function PartyTable({ party, compact = false }: { party: Party; compact?: boolean }) {
  const members = party.members.filter((m) => m !== "solo");
  const solo = isSolo(party);
  if (members.length === 0 && !solo) return null;
  return (
    <div
      className={`w-full rounded-xl border border-[#406080]/40 bg-[#0d1520]/90 backdrop-blur shadow-lg shadow-black/30 ${compact ? "px-2 py-1.5" : "px-3 py-2.5"}`}
      aria-label="Your party"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
        <span className="text-[10px] font-fantasy tracking-widest uppercase text-[#606080] shrink-0 pl-1">At the table</span>
        {solo && (
          <span className="shrink-0 rounded-lg border border-[#406080]/50 bg-[#111a28] px-2 py-1 text-xs text-[#e0e0e0] font-fantasy">
            <span aria-hidden="true">{PARTY_META.solo.icon} </span>Just you{party.members.includes("pets") ? " and the pets" : ""}
          </span>
        )}
        {!solo &&
          members.map((m) => (
            <span
              key={m}
              className="shrink-0 rounded-lg border border-[#c08020]/40 bg-[#111a28] px-2 py-1 text-xs text-[#e0e0e0] font-fantasy whitespace-nowrap"
              title={PARTY_META[m].label}
            >
              <span aria-hidden="true">{PARTY_META[m].icon} </span>
              {m === "kids" ? (party.kids >= 6 ? "6+ kids" : party.kids === 1 ? "1 kid" : `${party.kids} kids`) : shortLabel(m)}
            </span>
          ))}
      </div>
    </div>
  );
}

function shortLabel(m: keyof typeof PARTY_META): string {
  switch (m) {
    case "partner":
      return "Partner";
    case "parent":
      return "Parent";
    case "cosigner":
      return "Co-signer";
    case "business":
      return "Business partner";
    case "pets":
      return "Pets";
    default:
      return PARTY_META[m].label;
  }
}
