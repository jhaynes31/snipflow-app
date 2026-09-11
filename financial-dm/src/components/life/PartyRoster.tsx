import { PARTY_IDS, PARTY_META, isSolo, type Party, type PartyId } from "~/lib/armorEngine";
import { YOUNGEST_OPTIONS } from "~/lib/lifeQuestions";
import type { YoungestAge } from "~/lib/armorConfig";
import { PARTY_BUTTON, PARTY_PROMPT, PETS_LINE, SOLO_LINE, YOUNGEST_PROMPT } from "./lifeCopy";

interface PartyRosterProps {
  party: Party;
  onChange: (party: Party) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_KIDS = 6;

/**
 * "Build your party" (Section 6): multi-select cards, a kids stepper, the
 * youngest-child follow-up, and the exclusive "nobody depends on me" card.
 */
export default function PartyRoster({ party, onChange, onNext, onBack }: PartyRosterProps) {
  const has = (id: PartyId) => party.members.includes(id);
  const solo = isSolo(party) && party.members.length > 0;
  const needsYoungest = has("kids") && !has("solo") && !party.youngest;
  const canContinue = party.members.length > 0 && !needsYoungest;

  const toggle = (id: PartyId) => {
    let members = [...party.members];
    if (id === "solo") {
      // Exclusive: keeps only the pets.
      members = has("solo") ? members.filter((m) => m !== "solo") : ["solo", ...members.filter((m) => m === "pets")];
    } else if (has(id)) {
      members = members.filter((m) => m !== id);
    } else {
      // Any real dependent or obligation cancels "nobody depends on me".
      members = [...members.filter((m) => m !== "solo" || id === "pets"), id];
    }
    onChange({ ...party, members, kids: members.includes("kids") ? Math.max(1, party.kids || 1) : party.kids });
  };

  const setKids = (n: number) => onChange({ ...party, kids: Math.max(1, Math.min(MAX_KIDS, n)) });
  const setYoungest = (y: YoungestAge) => onChange({ ...party, youngest: y });

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-1 animate-slide-in">
      <div
        className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6"
        style={{
          background: "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
          boxShadow: "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex items-center justify-between text-[#8b6914] opacity-70 text-sm select-none">
          <span>❦</span>
          <span className="font-fantasy tracking-widest text-xs uppercase">Thy Party</span>
          <span>❦</span>
        </div>
        <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center leading-snug">Build your party</h2>
        <p className="mt-2 text-sm italic text-[#7a5f30] text-center font-fantasy leading-relaxed">“{PARTY_PROMPT}”</p>

        <div className="mt-5 grid grid-cols-1 gap-2.5" role="group" aria-label="Who depends on you">
          {PARTY_IDS.map((id) => {
            const on = has(id);
            const meta = PARTY_META[id];
            return (
              <div key={id} className="flex flex-col">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  data-party={id}
                  onClick={() => toggle(id)}
                  className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-all duration-200 flex items-center gap-3 ${
                    on
                      ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8] shadow-lg"
                      : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80 hover:bg-[#fdf3dc]"
                  } ${id === "solo" ? "mt-2 border-dashed" : ""}`}
                >
                  <span className="text-2xl w-8 text-center shrink-0" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium leading-snug">{meta.label}</span>
                    <span className={`block text-xs mt-0.5 ${on ? "text-[#e8d5a3]/80" : "text-[#7a5f30]"}`}>{meta.hint}</span>
                  </span>
                </button>
                {id === "kids" && on && (
                  <div className="mt-1.5 ml-11 flex items-center gap-2 text-[#3a2c1a]" data-kids-stepper>
                    <span className="text-sm font-medium">How many?</span>
                    <button
                      type="button"
                      aria-label="Fewer kids"
                      disabled={party.kids <= 1}
                      onClick={() => setKids(party.kids - 1)}
                      className="w-8 h-8 rounded-md border border-[#8b6914]/60 bg-[#fdf3dc] text-[#3a2c1a] disabled:opacity-30 font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold tabular-nums" aria-live="polite" aria-label={`${party.kids >= MAX_KIDS ? "6 or more" : party.kids} kids`}>
                      {party.kids >= MAX_KIDS ? "6+" : party.kids}
                    </span>
                    <button
                      type="button"
                      aria-label="More kids"
                      disabled={party.kids >= MAX_KIDS}
                      onClick={() => setKids(party.kids + 1)}
                      className="w-8 h-8 rounded-md border border-[#8b6914]/60 bg-[#fdf3dc] text-[#3a2c1a] disabled:opacity-30 font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {has("pets") && (
          <p className="mt-3 text-sm text-[#7a5f30] italic font-fantasy text-center leading-relaxed" data-pets-line>
            “{PETS_LINE}”
          </p>
        )}
        {solo && (
          <p className="mt-3 text-sm text-[#7a5f30] italic font-fantasy text-center leading-relaxed">“{SOLO_LINE}”</p>
        )}

        {has("kids") && !has("solo") && (
          <div className="mt-5 rounded-lg border border-[#8b6914]/40 bg-[#fdf3dc]/50 p-4 animate-slide-in" data-youngest>
            <p className="font-bold text-[#3a2c1a] text-center">{YOUNGEST_PROMPT}</p>
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={YOUNGEST_PROMPT}>
              {YOUNGEST_OPTIONS.map((opt) => {
                const on = party.youngest === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setYoungest(opt.id as YoungestAge)}
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      on ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8]" : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-between items-center">
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-lg font-fantasy text-sm text-[#7a5f30] hover:text-[#3a2c1a] transition-all">
            ← Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className={`px-6 py-2.5 rounded-lg font-fantasy text-sm transition-all ${
              canContinue ? "bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30" : "bg-[#c9b27e]/50 text-[#8a7a58] cursor-not-allowed"
            }`}
          >
            {PARTY_BUTTON} →
          </button>
        </div>
        {needsYoungest && <p className="mt-2 text-xs text-[#7a5f30] text-right font-fantasy">Tell us your youngest's age to continue.</p>}
      </div>
    </div>
  );
}
