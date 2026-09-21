"use client";

import Link from "next/link";
import { useState } from "react";
import { searchTools, type ToolEntry } from "@/convex/toolIndex";
import { useTools } from "./useTools";

/**
 * The front desk on the home page: one box ("What's going on?") and one
 * row of doors in feeling language. Typing shows the three best tools with
 * a direct link, wherever they live. Nothing else; the tiles below stay
 * the map for when you know where you're going.
 */
export function FrontDesk() {
  const t = useTools();
  const [q, setQ] = useState("");
  const [more, setMore] = useState(false);
  if (!t) return null;
  const hits = q.trim().length >= 2 ? searchTools(q, t.tools) : [];
  const doors = more ? t.doors : t.doors.slice(0, 6);
  const isExternal = (tool: ToolEntry) => tool.href.includes("/app/");
  return (
    <section className="sh-desk" aria-label="What's going on?">
      <label className="sh-desk-label" htmlFor="sh-desk-input">What&apos;s going on?</label>
      <input
        id="sh-desk-input"
        className="sh-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="A few words. &ldquo;can't start&rdquo;, &ldquo;something stung&rdquo;, &ldquo;money&rdquo;…"
        autoComplete="off"
      />
      {q.trim().length >= 2 && (
        <ul className="sh-desk-hits" aria-live="polite">
          {hits.length === 0 && <li className="sh-muted">Nothing matched those words. Try one word, or a door below.</li>}
          {hits.map((tool) => (
            <li key={tool.key}>
              {isExternal(tool) ? (
                <a href={t.href(tool)} className="sh-desk-hit">
                  <strong>{tool.name}</strong> <span className="sh-muted">· {tool.place}. {tool.when}</span>
                </a>
              ) : (
                <Link href={t.href(tool)} className="sh-desk-hit">
                  <strong>{tool.name}</strong> <span className="sh-muted">· {tool.place}. {tool.when}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="sh-chips sh-desk-doors">
        {doors.map((d) => {
          const tool = t.tools.find((x) => x.key === d.toolKey)!;
          const href = t.href(tool);
          return isExternal(tool) ? (
            <a key={d.toolKey} href={href} className="sh-chip">{d.label}</a>
          ) : (
            <Link key={d.toolKey} href={href} className="sh-chip">{d.label}</Link>
          );
        })}
        {t.doors.length > 6 && (
          <button type="button" className="sh-chip sh-chip-quiet" onClick={() => setMore((v) => !v)}>
            {more ? "Fewer" : "More…"}
          </button>
        )}
      </div>
    </section>
  );
}
