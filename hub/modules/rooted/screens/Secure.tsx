"use client";

import Link from "next/link";
import { PRACTICES, PROTESTS, SCRIPTS } from "@/core/rooted/content";
import { useTools } from "@/core/tools/useTools";
import { toolByKey } from "@/convex/toolIndex";
import { Card, CopyButton, PageTitle } from "@/core/ui";

export function Secure() {
  const tools = useTools();
  const href = (key?: string) => {
    if (!key) return null;
    const t = toolByKey(key);
    return t ? (tools ? tools.href(t) : t.href) : null;
  };
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Becoming secure" subtitle="Not insight alone. Repeated experience. Each of these is a small deposit; none of them has to be large." />

      <Card>
        <h2 className="sh-h2">Protest behaviors, and the secure move beside each</h2>
        <p className="sh-hint">A protest behavior is a nervous system doing what once kept it alive. No shame. Find the one you did, read what was underneath, and take the move next time.</p>
        {PROTESTS.map((p) => (
          <details key={p.key} className="rt-tell rt-entry">
            <summary>{p.name}</summary>
            <p><strong>Looks like:</strong> {p.looksLike}</p>
            <p><strong>Underneath:</strong> {p.underneath}</p>
            <p><strong>The secure move:</strong> {p.secureMove}</p>
          </details>
        ))}
      </Card>

      <Card>
        <h2 className="sh-h2">Practices</h2>
        {PRACTICES.map((p) => {
          const link = href(p.tool);
          const t = p.tool ? toolByKey(p.tool) : undefined;
          return (
            <div key={p.key} className="rt-entry">
              <h3 className="sh-h3">{p.name}</h3>
              <p className="sh-muted">{p.when}</p>
              <ol style={{ paddingLeft: "1.2rem", margin: "0.3rem 0" }}>{p.how.map((h) => <li key={h}>{h}</li>)}</ol>
              {link && t && (t.href.includes("/app/") ? <a href={link} className="sh-btn sh-btn-secondary sh-btn-inline">{t.name} →</a> : <Link href={link} className="sh-btn sh-btn-secondary sh-btn-inline">{t.name} →</Link>)}
            </div>
          );
        })}
      </Card>

      <Card tone="alt">
        <h2 className="sh-h2">The secure voice, for when you go blank</h2>
        <p className="sh-hint">Copy one, change it to your words, send it once.</p>
        {SCRIPTS.map((s) => (
          <div key={s.when} className="rt-entry">
            <p className="sh-muted">{s.when}</p>
            <p>&ldquo;{s.say}&rdquo;</p>
            <CopyButton text={s.say} />
          </div>
        ))}
      </Card>
    </div>
  );
}
