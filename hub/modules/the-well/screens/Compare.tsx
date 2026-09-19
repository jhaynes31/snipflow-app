"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { preferredTranslation, useBooks } from "@/core/well/bible";
import { alignVerses, builtInTranslations, TRANSLATIONS } from "@/core/well/translations";
import { CoachChat } from "@/core/coach/CoachChat";
import { Btn, Card, LinkBtn, PageTitle, Spinner } from "@/core/ui";

/**
 * Compare: the same chapter in two or three translations, verse by verse.
 * Built-in translations are always on; keyed ones show as "later" until a
 * key is added, never hidden.
 */
export function Compare({ slug, chapter }: { slug: string; chapter: number }) {
  const [codes, setCodes] = useState<string[]>(() => {
    const first = preferredTranslation();
    return [first, first === "kjv" ? "bsb" : "kjv"];
  });
  const stableCodes = useMemo(() => codes, [codes]);
  const books = useBooks(slug, stableCodes);
  const [asking, setAsking] = useState(false);
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);

  function toggle(code: string) {
    if (codes.includes(code)) {
      if (codes.length > 1) setCodes(codes.filter((c) => c !== code));
    } else if (codes.length < 3) setCodes([...codes, code]);
  }

  const name = books?.find((b) => b !== "missing")?.name ?? slug.replace(/-/g, " ");
  const chapters = books ? books.map((b) => (b === "missing" ? null : (b.chapters[chapter - 1] ?? null))) : null;
  const rows = chapters ? alignVerses(chapters) : [];
  const shown = rows.filter((r) => (from === null || r.n >= from) && (to === null || r.n <= to));
  const opening = chapters
    ? `Passage: ${name} ${chapter}${from || to ? `:${from ?? 1}-${to ?? rows.length}` : ""}, in ${codes.map((c) => TRANSLATIONS.find((t) => t.code === c)?.name ?? c).join(", ")}.\n\n` +
      codes
        .map((c, i) => `${TRANSLATIONS.find((t) => t.code === c)?.short ?? c}:\n${shown.map((r) => `${r.n} ${r.texts[i] ?? "(not in this translation)"}`).join("\n")}`)
        .join("\n\n")
    : "";

  return (
    <div className="sh-container">
      <PageTitle title={`${name} ${chapter}, compared`} subtitle="Same chapter, side by side. Differences are usually English changing, sometimes older manuscripts, rarely doctrine." action={<LinkBtn href={`/the-well/bible/${slug}/${chapter}`} variant="ghost">Back to the chapter</LinkBtn>} />
      <div className="sh-chips" role="group" aria-label="Translations to compare">
        {builtInTranslations().map((t) => (
          <button key={t.code} type="button" className="sh-chip" aria-pressed={codes.includes(t.code)} onClick={() => toggle(t.code)} style={codes.includes(t.code) ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} title={t.note}>
            {t.short}
          </button>
        ))}
        {TRANSLATIONS.filter((t) => !t.builtIn).map((t) => (
          <span key={t.code} className="sh-chip" aria-disabled="true" style={{ opacity: 0.55 }} title={t.note}>
            {t.short}, later
          </span>
        ))}
      </div>
      <p className="sh-hint">Pick up to three. ESV, NIV, and NLT turn on once a key is added; they aren&apos;t hidden, just waiting.</p>
      <div className="sh-row sh-wrap">
        <label className="sh-label">
          Verses{" "}
          <input className="sh-input sh-input-sm" type="number" min={1} max={rows.length || 1} value={from ?? ""} placeholder="from" onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : null)} aria-label="From verse" />
        </label>
        <label className="sh-label">
          to{" "}
          <input className="sh-input sh-input-sm" type="number" min={1} max={rows.length || 1} value={to ?? ""} placeholder="to" onChange={(e) => setTo(e.target.value ? Number(e.target.value) : null)} aria-label="To verse" />
        </label>
        <Btn variant={asking ? "ghost" : "primary"} onClick={() => setAsking(!asking)}>{asking ? "Close the question box" : "Ask about the differences"}</Btn>
      </div>
      {asking && <CoachChat module="the-well" task="well.compare" opening={opening} placeholder="Why does one say X and another say Y?" />}
      {!chapters ? (
        <Spinner label="Opening the translations" />
      ) : (
        <Card>
          <div className="well-compare" style={{ gridTemplateColumns: `2.5rem repeat(${codes.length}, minmax(0, 1fr))` }}>
            <span className="sh-eyebrow" aria-hidden />
            {codes.map((c) => (
              <span key={c} className="sh-eyebrow">{TRANSLATIONS.find((t) => t.code === c)?.short ?? c}</span>
            ))}
            {shown.map((r) => (
              <div key={r.n} className="well-compare-row" style={{ gridColumn: `1 / span ${codes.length + 1}`, gridTemplateColumns: `2.5rem repeat(${codes.length}, minmax(0, 1fr))` }}>
                <span className="well-compare-n" id={`v${r.n}`}>{r.n}</span>
                {r.texts.map((t, i) => (
                  <span key={i} className="well-compare-text" data-code={TRANSLATIONS.find((x) => x.code === codes[i])?.short ?? codes[i]}>
                    {t ?? <em className="sh-muted">Not in this translation</em>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      <p className="sh-hint">
        About the translations: {builtInTranslations().map((t) => `${t.short} (${t.note})`).join(" ")} <Link href="/the-well/bible" className="sh-link">All books</Link>.
      </p>
    </div>
  );
}
