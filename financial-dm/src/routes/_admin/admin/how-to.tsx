import { createFileRoute } from "@tanstack/react-router";
import ToolGuide from "~/components/admin/ToolGuide";

/** The How To tab: the plain-English guide to the DM Screen and the Sparring Dummy. */
export const Route = createFileRoute("/_admin/admin/how-to")({
  validateSearch: (s: Record<string, unknown>): { topic?: string } => ({
    topic: s.topic === "screen" || s.topic === "present" || s.topic === "dummy" || s.topic === "recruits" ? s.topic : undefined,
  }),
  component: HowToPage,
});

function HowToPage() {
  const { topic } = Route.useSearch();
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-how-to-page>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>📖 How To</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">The DM Screen and the Sparring Dummy, in plain English.</p>
        </div>
        <ToolGuide topic={topic} />
      </div>
    </main>
  );
}
