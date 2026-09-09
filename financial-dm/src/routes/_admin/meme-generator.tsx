import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import MemeGenerator from "~/components/MemeGenerator";
import SavedConcepts from "~/components/SavedConcepts";

type Tab = "generate" | "saved";

export const Route = createFileRoute("/_admin/meme-generator")({
  component: MemeGeneratorPage,
});

function MemeGeneratorPage() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <main
      className="min-h-dvh py-6 px-4"
      style={{
        background:
          "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-4">
          <img
            src="/logo.png"
            alt="The Financial DM"
            className="h-20 sm:h-24 mx-auto drop-shadow-lg"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl sm:text-4xl font-fantasy text-[#c08020] tracking-wide"
            style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
          >
            🎭 Meme & Caption Generator
          </h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-2">
            The Financial DM: Forge legendary memes from financial wisdom
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setTab("generate")}
            className={`px-6 py-3 rounded-lg font-fantasy text-sm transition-all border ${
              tab === "generate"
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            ⚒️ Forge Memes
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`px-6 py-3 rounded-lg font-fantasy text-sm transition-all border relative ${
              tab === "saved"
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            📜 Saved Memes
          </button>
        </div>

        {/* Tab Content */}
        {tab === "generate" ? <MemeGenerator /> : <SavedConcepts />}

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
