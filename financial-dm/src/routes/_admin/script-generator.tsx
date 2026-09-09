import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ScriptGenerator from "~/components/ScriptGenerator";
import SavedScripts from "~/components/SavedScripts";

type Tab = "forge" | "saved";

export const Route = createFileRoute("/_admin/script-generator")({
  component: ScriptGeneratorPage,
});

function ScriptGeneratorPage() {
  const [tab, setTab] = useState<Tab>("forge");

  return (
    <main
      className="min-h-dvh py-6 px-4"
      style={{
        background:
          "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-4">
          <img
            src="/logo.png"
            alt="The Financial DM"
            className="h-20 sm:h-24 mx-auto drop-shadow-lg"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl sm:text-4xl font-fantasy text-[#c08020] tracking-wide"
            style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
          >
            📜 Financial Facts &amp; Script Forge
          </h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-2">
            John only: Roll a topic and forge a complete posting package with
            script, hook, caption, and hashtags together
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setTab("forge")}
            className={`px-6 py-3 rounded-lg font-fantasy text-sm transition-all border ${
              tab === "forge"
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            🧙 Forge
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`px-6 py-3 rounded-lg font-fantasy text-sm transition-all border ${
              tab === "saved"
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            📚 Saved Library
          </button>
        </div>

        {tab === "forge" ? <ScriptGenerator /> : <SavedScripts />}

        {/* Footer nav */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy transition-colors"
          >
            ⚔️ Return to Quest Board
          </a>
        </div>
      </div>
    </main>
  );
}
