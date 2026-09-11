import { useEffect, useState } from "react";
import type { LootBlock, LootPageContent } from "~/lib/lootPages";
import { lootPdfUrl } from "~/lib/lootPages";
import TreasureChest from "~/components/wealth/TreasureChest";

/**
 * The one loot page template (loot pages spec, Section 5): header band,
 * John's intro, the body blocks, the CTA box with a QR code, and the footer
 * with John's title and the item's own disclaimer.
 *
 * On screen it sits on the site's navy background with Download and Print
 * buttons. In print (and in the PDF, which is printed from this same page)
 * only the parchment sheet remains, edge to edge, with 0.6in of padding.
 * Nothing on the page is ever submitted or saved (Section 2.2).
 */
export default function LootPage({ page }: { page: LootPageContent }) {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((m) => m.toString(page.cta.url, { type: "svg", margin: 0, color: { dark: "#2a1e10", light: "#0000" } }))
      .then((svg) => alive && setQr(svg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [page.cta.url]);

  return (
    <main className="loot-page min-h-dvh py-6 px-3 sm:px-6" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}>
      <style>{PRINT_CSS}</style>

      <div className="loot-toolbar max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <a href="/" className="text-[#a0a0a0] hover:text-[#e0e0e0] text-sm font-fantasy">
          ← The Financial DM
        </a>
        <div className="flex gap-2">
          <a
            href={lootPdfUrl(page.id)}
            download
            className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm shadow-lg shadow-[#c08020]/20"
          >
            ⬇️ Download PDF
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-[#406080]/60 text-[#e0e0e0] hover:border-[#c08020] font-fantasy text-sm"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <article className="loot-sheet max-w-3xl mx-auto rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 text-[#2a1e10]" style={{ background: "#eedcb4" }}>
        <div className="loot-inner px-5 py-6 sm:px-10 sm:py-8">
          {/* 1. Header band */}
          <header className="flex items-center gap-4 border-b-2 border-[#8b6914]/50 pb-4">
            <div className="shrink-0 w-16 h-16 flex items-center justify-center" aria-hidden="true">
              {page.icon === "chest" ? <TreasureChest open={false} className="w-16 h-16" /> : <D20Icon />}
            </div>
            <div className="min-w-0">
              <p className="loot-kicker font-fantasy text-[#7a5f30] text-[11px] tracking-[0.25em] uppercase">The Financial DM · Loot drop</p>
              <h1 className="font-fantasy text-[#3a2c1a] text-2xl sm:text-3xl leading-tight mt-0.5">{page.title}</h1>
              <p className="text-[#7a5f30] italic text-sm sm:text-base mt-1">{page.subtitle}</p>
            </div>
          </header>

          {/* 2. John's intro */}
          <p className="loot-john mt-4 rounded-r-lg border-l-4 border-[#c08020] bg-[#fff8e6]/70 px-4 py-2.5 text-[15px] leading-relaxed">
            <span className="font-fantasy text-[#8b6914]">John says: </span>
            {page.intro}
          </p>

          {/* 3. Body */}
          <div className="mt-2">
            {page.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>

          {/* 4. CTA box */}
          <div className="loot-cta mt-5 rounded-lg border border-dashed border-[#8b6914] bg-[#fff8e6]/60 px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-fantasy text-[#3a2c1a] text-base leading-snug">{page.cta.text}</p>
              <a href={page.cta.url} className="text-[#8b6914] underline underline-offset-2 text-sm break-all">
                {page.cta.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
            <div className="shrink-0 w-[68px] h-[68px]" aria-label="QR code for the booking link" role="img" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>

          {/* 5. Footer */}
          <footer className="mt-4 border-t border-[#8b6914]/50 pt-3 text-[#7a5f30]">
            <p className="font-fantasy text-[#3a2c1a] text-sm">
              {page.footer.brand} · {page.footer.agent}, {page.footer.agentTitle}
            </p>
            <p className="text-[11px] leading-snug mt-1">{page.footer.disclaimer}</p>
          </footer>
        </div>
      </article>
    </main>
  );
}

function Block({ block }: { block: LootBlock }) {
  const heading = "heading" in block && block.heading ? <h2 className="font-fantasy text-[#8b6914] text-lg mt-4 mb-1.5 tracking-wide">{block.heading}</h2> : null;
  switch (block.type) {
    case "paragraph":
      return <p className="mt-3 text-[14px] leading-relaxed">{block.text}</p>;
    case "note":
      return (
        <p
          className={`mt-4 rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
            block.tone === "safety" ? "loot-safety border-2 border-[#8b2020]/60 bg-[#fdf3dc] font-medium" : "border border-[#8b6914]/50 bg-[#fff8e6]/60"
          }`}
          data-note={block.tone ?? "info"}
        >
          {block.tone === "safety" && <span aria-hidden="true">⚠️ </span>}
          {block.text}
        </p>
      );
    case "checklist":
      return (
        <div>
          {heading}
          <ul className="loot-check list-none pl-0 space-y-1.5">
            {block.items.map((item) => (
              <li key={item} className="relative pl-8 text-[14px] leading-relaxed">
                <span aria-hidden="true" className="absolute left-0 top-[3px] w-[16px] h-[16px] rounded-[3px] border-[1.5px] border-[#8b6914] bg-[#fff8e6]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
    case "questions":
      return (
        <div>
          {heading}
          <ol className="list-decimal pl-5 space-y-3">
            {block.items.map((item) => (
              <li key={item} className="text-[14px] leading-relaxed">
                {item}
                {Array.from({ length: block.lines ?? 1 }).map((_, i) => (
                  <div key={i} className="loot-line" aria-hidden="true" />
                ))}
              </li>
            ))}
          </ol>
        </div>
      );
    case "table":
      return (
        <div>
          {heading}
          <table className="loot-table w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th key={c} className="border border-[#8b6914]/60 bg-[#8b6914]/15 font-fantasy font-normal text-[#5a3f14] text-left px-2 py-1.5">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: block.rows }).map((_, r) => (
                <tr key={r}>
                  {block.columns.map((c) => (
                    <td key={c} className="border border-[#8b6914]/60 bg-[#fff8e6]/55 h-[34px]" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "fields":
      return (
        <div className="loot-fields">
          {heading}
          <div className="space-y-2">
            {block.items.map((label) => (
              <div key={label} className="flex items-end gap-2 text-[14px]">
                <span className="shrink-0 text-[#3a2c1a]">{label}</span>
                <span className="loot-line flex-1" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      );
    case "facts":
      return (
        <div>
          {heading}
          <ul className="list-disc pl-5 space-y-1">
            {block.items.map((item) => (
              <li key={item} className="text-[14px] leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

function D20Icon() {
  return (
    <svg viewBox="0 0 120 120" width="60" height="60" aria-hidden="true">
      <polygon points="60,8 112,38 112,82 60,112 8,82 8,38" fill="#162030" stroke="#c08020" strokeWidth="3" />
      <polygon points="60,8 112,38 60,68" fill="#1a2840" stroke="#c08020" strokeWidth="1.5" />
      <polygon points="60,8 8,38 60,68" fill="#1f3050" stroke="#c08020" strokeWidth="1.5" />
      <text x="60" y="46" textAnchor="middle" dominantBaseline="central" fill="#c08020" fontSize="26" fontWeight="bold" fontFamily="serif">
        20
      </text>
    </svg>
  );
}

/**
 * Fill-in lines tall enough to write on by hand (about a third of an inch),
 * and the print layout: only the sheet, parchment to the page edge, 0.6in of
 * padding, no buttons. The PDF is printed from exactly this layout.
 */
const PRINT_CSS = `
.loot-sheet { font-family: Georgia, 'Times New Roman', 'Liberation Serif', serif; }
.loot-line { display: block; height: 0.32in; border-bottom: 1px solid rgba(139,105,20,.7); }
.loot-fields .loot-line { height: 0.28in; }
@media (max-width: 480px) { .loot-kicker { letter-spacing: 0.12em; } }
@media print {
  @page { size: Letter; margin: 0; }
  html, body { background: #eedcb4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .loot-page { background: #eedcb4 !important; padding: 0 !important; min-height: 0 !important; }
  .loot-toolbar { display: none !important; }
  .loot-sheet { max-width: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
  .loot-inner { padding: 0.6in !important; }
  .loot-table td { height: 28px !important; }
  header { padding-bottom: 8px !important; }
  .loot-check li, ul.list-disc li { margin-top: 3px !important; }
  header h1 { font-size: 26px !important; }
  .loot-john { margin-top: 10px !important; padding-top: 7px !important; padding-bottom: 7px !important; }
  h2 { margin-top: 11px !important; margin-bottom: 4px !important; }
  .loot-cta { margin-top: 12px !important; padding-top: 8px !important; padding-bottom: 8px !important; }
  footer { margin-top: 10px !important; }
  .loot-table, .loot-cta, .loot-john, .loot-safety { break-inside: avoid; }
  h2 { break-after: avoid; }
}
`;
