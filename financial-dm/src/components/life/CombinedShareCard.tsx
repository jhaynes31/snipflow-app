import { forwardRef } from "react";
import { armorLineFor, combinedShareText, type CharacterSheetRecord } from "~/lib/characterSheet";
import { LIFE_SHARE_URL } from "~/lib/lifeShare";

/**
 * The combined 1080 by 1080 card (dice spec, Section 14.3): the Full
 * Character Sheet Complete badge, the financial tier, and the armor line.
 * Never stat values, dollars, party details, or answers.
 */
const CombinedShareCard = forwardRef<HTMLDivElement, { record: CharacterSheetRecord }>(function CombinedShareCard({ record }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        boxSizing: "border-box",
        padding: 72,
        background: "linear-gradient(160deg, #16233a 0%, #0d1520 55%, #0b1a14 100%)",
        color: "#e0e0e0",
        fontFamily: "'MedievalSharp', 'Macondo', serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 28, border: "4px solid rgba(192,128,32,0.55)", borderRadius: 28 }} />
      <div style={{ position: "absolute", inset: 44, border: "1.5px solid rgba(192,128,32,0.35)", borderRadius: 20 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <img src="/logo.png" alt="" style={{ width: 132, height: 132 }} />
        <div>
          <div style={{ fontSize: 44, color: "#c08020", letterSpacing: 2 }}>The Financial DM</div>
          <div style={{ fontSize: 24, color: "#a0a0a0", marginTop: 4 }}>Two dungeons, one hero</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "14px 36px",
            border: "3px solid #e0b45a",
            borderRadius: 999,
            fontSize: 34,
            color: "#e0b45a",
            letterSpacing: 3,
            textTransform: "uppercase",
            boxShadow: "0 0 40px rgba(224,180,90,0.35)",
          }}
        >
          🏅 Full Character Sheet Complete
        </div>
        <div style={{ marginTop: 44, fontSize: 84, lineHeight: 1.1, color: "#f5e6c8", textShadow: "0 0 40px rgba(192,128,32,0.45)" }}>{record.financial?.tier ?? "Adventurer"}</div>
        <div style={{ marginTop: 22, fontSize: 44, color: "#7fd08a" }}>🛡️ {armorLineFor(record)}</div>
        <div style={{ marginTop: 40, fontSize: 34, color: "#a0a0a0", lineHeight: 1.35 }}>{combinedShareText(record).replace(/ Roll yours\.$/, "")}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
        <span style={{ color: "#c08020" }}>⚔️ Roll yours</span>
        <span style={{ color: "#7fd08a" }}>{LIFE_SHARE_URL}</span>
      </div>
    </div>
  );
});

export default CombinedShareCard;
