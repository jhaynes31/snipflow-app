import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * A read-only page for someone the room's owner chose to show a few
 * sections to, such as a therapist. No login. The token is the key, it
 * expires, and the owner can turn it off any time.
 */
export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const shared = url ? await new ConvexHttpClient(url).query(api.metamorphosis.more.sharedByToken, { token }) : null;
  if (!shared) {
    return (
      <main className="sh-container sh-narrow">
        <h1 className="sh-h1">This link isn&apos;t open</h1>
        <p>It may have expired or been turned off by the person who made it.</p>
      </main>
    );
  }
  return (
    <main className="sh-container sh-narrow">
      <h1 className="sh-h1">Pages shared by {shared.name}</h1>
      <p className="sh-muted">Read-only. This link stops working on {new Date(shared.expiresAt).toLocaleDateString()}, or sooner if it is turned off.</p>
      {shared.sections.map((s) => (
        <section key={s.section} className="sh-card mt-6">
          <h2 className="sh-h2">{s.section}</h2>
          {s.lines.length === 0 ? <p className="sh-muted">Nothing here yet.</p> : s.lines.map((l, i) => <p key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</p>)}
        </section>
      ))}
    </main>
  );
}
