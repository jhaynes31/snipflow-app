import { forwardRef } from "react";
import { SHARE_QUIZ_URL, shareText, type ShareFacts } from "~/lib/wealthShare";

/**
 * The 1080 by 1080 share card, laid out in real pixels for that frame. It
 * is rendered offscreen for export and shown scaled down as a preview. It
 * never contains the weakest stat, answers, or the quest.
 */
const ShareCard = forwardRef<HTMLDivElement, { facts: ShareFacts }>(function ShareCard({ facts }, ref) {
  const text = shareText(facts);
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
          <div style={{ fontSize: 24, color: "#a0a0a0", marginTop: 4 }}>Roll for Wealth</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 34, color: "#f0a0a0", letterSpacing: 4, textTransform: "uppercase" }}>⚔️ {facts.eventName}</div>
        <div style={{ marginTop: 28, fontSize: 168, lineHeight: 1, color: facts.success ? "#7fd08a" : "#e0b45a", textShadow: "0 0 40px rgba(192,128,32,0.45)" }}>
          {facts.natural20 ? "20" : facts.total}
        </div>
        <div style={{ marginTop: 10, fontSize: 30, color: "#a0a0a0" }}>
          {facts.natural20 ? "NATURAL 20" : facts.success ? "Saving throw: success" : "Saving throw: not this time"}
          {facts.stat ? ` · ${facts.stat.key} +${facts.stat.value}` : ""}
        </div>
        <div style={{ marginTop: 34, fontSize: 40, color: "#e0e0e0", lineHeight: 1.35 }}>{text}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28 }}>
        <span style={{ color: "#c08020" }}>👑 {facts.tierTitle}</span>
        <span style={{ color: "#7fd08a" }}>{SHARE_QUIZ_URL}</span>
      </div>
    </div>
  );
});

export default ShareCard;
