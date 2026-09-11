import type { CSSProperties } from "react";
import type { SocialCard } from "~/server/socialCardGenerator";
import {
  borderContentPaddingClass,
  isPaleThemeBackground,
  themeBackgroundStyle,
  themeBorderImage,
} from "~/lib/slideEditor";

/**
 * Renders a single square, branded social card for "The Financial DM".
 * Both card formats share the same frame, palette, fonts, and footer brand
 * (text plus the small logo under it, mirroring the carousel slide brand).
 * They differ only in how the text content is arranged:
 *
 *  - "trap": a bold myth (Trap) is stated at the top and busted with the
 *    truth (Treasure) beneath it, D&D style.
 *  - "stat": ONE striking statistic/fact is shown huge, with a supporting
 *    sentence and a brand kicker.
 *
 * The card is purely presentational so the live DOM can be captured cleanly
 * by html-to-image for PNG export. Callers own any editing UI.
 */
export default function SocialCardPreview({
  card,
  themeBackground,
  themeBorder,
  className = "",
  refEl,
}: {
  card: SocialCard;
  themeBackground?: string;
  themeBorder?: string;
  className?: string;
  refEl?: (el: HTMLDivElement | null) => void;
}) {
  const backgroundStyle: CSSProperties = themeBackground
    ? themeBackgroundStyle(themeBackground)
    : {
        background:
          "linear-gradient(160deg, #16233a 0%, #111a28 45%, #0d1520 100%)",
      };
  const borderSrc = themeBorder ? themeBorderImage(themeBorder) : undefined;
  const padding = borderContentPaddingClass(themeBorder) ?? "p-[6%]";
  const isTrap = card.format === "trap";
  // Pale backgrounds (Parchment Map) get the same dark palette the carousel
  // slides use, otherwise cream text vanishes into the paper.
  const light = isPaleThemeBackground(themeBackground);
  const c = light
    ? {
        heading: "text-[#1d2733]",
        body: "text-[#2f3a47]",
        muted: "text-[#46525f]",
        gold: "text-[#8a5a10]",
        chipBg: "bg-[#fff7e6]/70",
        shadow: "[text-shadow:0_0.3cqw_1.2cqw_rgba(255,248,230,0.9)]",
        shadowSoft: "[text-shadow:0_0.2cqw_0.8cqw_rgba(255,248,230,0.9)]",
        rule: "border-[#8a5a10]/40",
      }
    : {
        heading: "text-[#f0e6d0]",
        body: "text-[#e0e0e0]",
        muted: "text-[#a0a0a0]",
        gold: "text-[#e0b45a]",
        chipBg: "bg-[#0d1520]/70",
        shadow: "[text-shadow:0_0.5cqw_2cqw_rgba(0,0,0,0.9)]",
        shadowSoft: "[text-shadow:0_0.3cqw_1cqw_rgba(0,0,0,0.9)]",
        rule: "border-[#c08020]/30",
      };

  return (
    <div
      ref={refEl}
      style={{ ...backgroundStyle, aspectRatio: "1 / 1" }}
      className={`relative w-full rounded-xl border border-[#b9803a]/45 overflow-hidden flex flex-col [container-type:inline-size] ${padding} ${className}`}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Topic tag */}
        {card.topic && (
          <div className="shrink-0 flex justify-center">
            <span className={`inline-block px-[3cqw] py-[0.8cqw] rounded-full ${c.chipBg} border border-[#406080]/40 ${c.gold} text-[2.6cqw] font-fantasy tracking-wider uppercase`}>
              {card.topic}
            </span>
          </div>
        )}

        {isTrap ? (
          /*
           * ── Trap or Treasure ──
           * TRUE FLOW: every text block (badge → headline → divider → fact →
           * divider → tagline → brand) sits in a normal top to bottom flex
           * column, so each element is positioned by the real rendered height
           * of the one before it. There are NO fixed pixel heights and NO fixed
           * X/Y coordinates anywhere in the text layout (the only absolutely
           * positioned element is the decorative border frame, which sits
           * behind at z-[3]). The outer card pins a fixed 1:1 square
           * (aspectRatio 1 / 1) and is a CSS container, so ALL text sizes use
           * container-query units (cqw) that scale proportionally with the
           * card width. Because every size is a fixed fraction of the square,
           * the whole content block always fits the frame at ANY card width —
           * there is no width at which it can overflow or hard-clip. The
           * middle band is flex-1 min-h-0 (it takes the slice left after the
           * badge, punchline and brand), centers its text vertically in that
           * slice, and overflow-hidden there is only a backstop, never relied
           * on. Each paragraph is line-clamped so an
           * extreme field truncates with a clean word-boundary ellipsis
           * instead of ever overflowing.
           */
          <div className="flex-1 min-h-0 flex flex-col justify-center gap-y-[1.6cqw] overflow-hidden py-[1.5cqw]">
            {/* Myth block */}
            <div className="shrink-0 flex flex-col items-center gap-[0.9cqw] text-center max-w-full">
              <span className={`shrink-0 inline-block px-[2.5cqw] py-[0.9cqw] rounded ${c.chipBg} border border-[#9a6a6a]/50 ${light ? "text-[#8a3a3a]" : "text-[#c98a8a]"} text-[2.7cqw] font-fantasy tracking-widest`}>
                ⚔️ TRAP · The Myth
              </span>
              <p className={`shrink-0 font-fantasy ${c.heading} text-[4.6cqw] leading-[1.3] line-clamp-3 break-words ${c.shadow}`}>
                {card.headline || "Some myth that sounds true"}
              </p>
            </div>
            {/* Divider */}
            <div className={`shrink-0 flex items-center justify-center gap-[2cqw] ${c.gold} font-fantasy text-[2.6cqw]`}>
              <span className="h-[0.4cqw] w-[16cqw] bg-[#c08020]/50" />
              <span>🖋️</span>
              <span className="h-[0.4cqw] w-[16cqw] bg-[#c08020]/50" />
            </div>
            {/* Fact block */}
            <div className="shrink-0 flex flex-col items-center gap-[0.9cqw] text-center max-w-full">
              <span className={`shrink-0 inline-block px-[2.5cqw] py-[0.9cqw] rounded ${c.chipBg} border border-[#c08020]/50 ${c.gold} text-[2.7cqw] font-fantasy tracking-widest`}>
                🏆 TREASURE · The Truth
              </span>
              <p className={`shrink-0 ${c.body} text-[3.4cqw] leading-[1.35] line-clamp-5 break-words ${c.shadow}`}>
                {card.body || "The reality that busts the myth"}
              </p>
            </div>
          </div>
        ) : (
          /* ── Stat Card ── */
          <div className="flex-1 min-h-0 flex flex-col justify-center items-center gap-[1.5cqw] text-center overflow-hidden py-[1.5cqw]">
            <p className={`shrink-0 font-fantasy ${c.heading} text-[6cqw] leading-[1.22] line-clamp-3 break-words ${c.shadow}`}>
              {card.headline || "One striking statistic"}
            </p>
            {card.body && (
              <p className={`shrink-0 ${c.body} text-[3.4cqw] leading-[1.35] max-w-[94%] line-clamp-4 break-words ${c.shadow}`}>
                {card.body}
              </p>
            )}
          </div>
        )}

        {/* Punchline */}
        {card.punchline && (
          <div className="shrink-0 flex justify-center mb-[2cqw]">
            <p className={`shrink-0 text-center italic ${c.muted} text-[3cqw] font-fantasy line-clamp-2 ${c.shadowSoft}`}>
              {card.punchline}
            </p>
          </div>
        )}

        {/* Brand footer */}
        <div className={`shrink-0 flex flex-col items-center gap-[1cqw] border-t ${c.rule} pt-[2cqw]`}>
          <p className={`${c.gold} font-fantasy text-[3.8cqw] tracking-wide`}>
            The Financial DM
          </p>
          <img
            src="/logo.png"
            alt="The Financial DM"
            className="h-[5cqw]"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
      </div>

      {borderSrc && (
        <img
          src={borderSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[3] select-none"
        />
      )}
    </div>
  );
}
