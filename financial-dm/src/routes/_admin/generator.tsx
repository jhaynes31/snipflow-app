import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  getRandomTopics,
  type TopicPick,
  type TopicSelection,
} from "~/server/topics";
import TopicPainPointPicker from "~/components/generator/TopicPainPointPicker";
import ToneControls from "~/components/generator/ToneControls";
import ScriptGenerator from "~/components/ScriptGenerator";
import MemeGenerator from "~/components/MemeGenerator";
import CarouselGenerator from "~/components/CarouselGenerator";
import SocialCardGenerator from "~/components/SocialCardGenerator";
import SavedScripts from "~/components/SavedScripts";
import SavedConcepts from "~/components/SavedConcepts";
import SavedCarousels from "~/components/SavedCarousels";
import SavedSocialCards from "~/components/SavedSocialCards";
import BrollForge from "~/components/BrollForge";
import SavedBroll from "~/components/SavedBroll";
import { DEFAULT_TONE } from "~/lib/contentOptions";

/**
 * The unified generator hub. One shell, one topic and pain point roll, one
 * tone setting, shared by every forge. Each tab owns only what is specific
 * to its medium (hook aim, card format, deck editor) and its saved library.
 *
 * URL state: /generator?tab=script|meme|carousel|card|broll&view=forge|saved
 * The old per tool routes redirect here so bookmarks keep working.
 */

export const GENERATOR_TABS = [
  "script",
  "meme",
  "carousel",
  "card",
  "broll",
] as const;
export type GeneratorTab = (typeof GENERATOR_TABS)[number];
type View = "forge" | "saved";

const TAB_META: Record<
  GeneratorTab,
  { label: string; title: string; blurb: string; saved: string }
> = {
  script: {
    label: "📜 Script",
    title: "Script Forge",
    blurb:
      "Roll a topic, pick the viewer's pain point, and forge a script with three hook options, captions, and hashtags.",
    saved: "📚 Saved Scripts",
  },
  meme: {
    label: "🎭 Meme",
    title: "Meme Forge",
    blurb:
      "Three meme concepts on real templates, each with caption options and hashtags, all in the bartender's voice.",
    saved: "📜 Saved Memes",
  },
  carousel: {
    label: "🎠 Carousel",
    title: "Carousel Forge",
    blurb:
      "A swipeable slide deck you can edit, export as PNGs, and post with caption options and hashtags.",
    saved: "📚 Saved Carousels",
  },
  card: {
    label: "🎨 Social Card",
    title: "Social Card Forge",
    blurb:
      "Trap or Treasure and Stat cards, one per selected topic, with a shared caption and hashtag set.",
    saved: "📚 Saved Cards",
  },
  broll: {
    label: "🎬 B Roll",
    title: "B Roll Planner",
    blurb:
      "Pick a saved script and get a shot list: what to film or find under each line, from which source, with on screen text and cues in seconds.",
    saved: "🎞️ Saved Shot Lists",
  },
};

function normalizeTab(raw: unknown): GeneratorTab {
  return (GENERATOR_TABS as readonly string[]).includes(String(raw))
    ? (raw as GeneratorTab)
    : "script";
}

export const Route = createFileRoute("/_admin/generator")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: normalizeTab(search.tab),
    view: (search.view === "saved" ? "saved" : "forge") as View,
  }),
  component: GeneratorHub,
});

function GeneratorHub() {
  const { tab, view } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Shared across every tab.
  const [picks, setPicks] = useState<TopicPick[]>([]);
  const [selections, setSelections] = useState<TopicSelection[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rollError, setRollError] = useState("");
  const [tone, setTone] = useState<string>(DEFAULT_TONE);
  const [dndThemed, setDndThemed] = useState(false);

  const pickerMode = tab === "card" ? "multi" : "single";

  // Moving from the multi select card tab back to a single select tab keeps
  // only the first selection so the picker never shows an impossible state.
  useEffect(() => {
    if (pickerMode === "single" && selections.length > 1) {
      setSelections(selections.slice(0, 1));
    }
  }, [pickerMode, selections]);

  const setTab = useCallback(
    (next: GeneratorTab) => navigate({ search: { tab: next, view: "forge" } }),
    [navigate],
  );
  const setView = useCallback(
    (next: View) => navigate({ search: { tab, view: next } }),
    [navigate, tab],
  );

  const handleRoll = useCallback(async () => {
    setRolling(true);
    setRollError("");
    try {
      // Send the topics already on screen so "Roll again" never repeats them.
      const next = await getRandomTopics({
        data: { exclude: picks.map((p) => p.topic) },
      });
      setPicks(next);
      setSelections([]);
    } catch {
      setRollError("Could not roll the topics. Please try again.");
    } finally {
      setRolling(false);
    }
  }, [picks]);

  const meta = TAB_META[tab];
  const single = selections[0] ?? null;

  return (
    <main
      className="min-h-dvh py-6 px-4"
      style={{
        background:
          "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-4">
          <img
            src="/logo.png"
            alt="The Financial DM"
            className="h-20 sm:h-24 mx-auto drop-shadow-lg"
          />
        </div>

        <div className="text-center mb-6">
          <h1
            className="text-2xl sm:text-4xl font-fantasy text-[#c08020] tracking-wide"
            style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
          >
            🧙 The Content Forge
          </h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-2">
            John only: one roll, one pain point, one voice, every format.
          </p>
        </div>

        {/* Generator tabs */}
        <nav
          className="flex justify-center gap-2 mb-3 flex-wrap"
          aria-label="Generators"
        >
          {GENERATOR_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`px-5 py-3 rounded-lg font-fantasy text-sm transition-all border ${
                tab === t
                  ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                  : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
              }`}
            >
              {TAB_META[t].label}
            </button>
          ))}
        </nav>

        {/* Forge / Saved sub tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setView("forge")}
            aria-pressed={view === "forge"}
            className={`px-4 py-2 rounded-lg font-fantasy text-xs transition-all border ${
              view === "forge"
                ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            🔨 Forge
          </button>
          <button
            type="button"
            onClick={() => setView("saved")}
            aria-pressed={view === "saved"}
            className={`px-4 py-2 rounded-lg font-fantasy text-xs transition-all border ${
              view === "saved"
                ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            {meta.saved}
          </button>
        </div>

        {view === "saved" ? (
          <div className={tab === "meme" ? "max-w-6xl mx-auto" : ""}>
            {tab === "script" && <SavedScripts />}
            {tab === "meme" && <SavedConcepts />}
            {tab === "carousel" && <SavedCarousels />}
            {tab === "card" && <SavedSocialCards />}
            {tab === "broll" && <SavedBroll />}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-fantasy text-[#e0e0e0] text-lg">
                {meta.title}
              </h2>
              <p className="text-[#606080] text-xs font-fantasy mt-1">
                {meta.blurb}
              </p>
            </div>

            <TopicPainPointPicker
              mode={pickerMode}
              picks={picks}
              selections={selections}
              rolling={rolling}
              onRoll={handleRoll}
              onChange={setSelections}
              heading={
                pickerMode === "multi"
                  ? "Step 1: Roll Topics (up to 3 cards)"
                  : "Step 1: Roll a Topic"
              }
            />
            {rollError && (
              <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
                {rollError}
              </div>
            )}

            <ToneControls
              tone={tone}
              onTone={setTone}
              dndThemed={dndThemed}
              onDndThemed={setDndThemed}
            />

            {tab === "script" && (
              <ScriptGenerator
                selection={single}
                tone={tone}
                dndThemed={dndThemed}
              />
            )}
            {tab === "meme" && (
              <MemeGenerator
                selection={single}
                tone={tone}
                dndThemed={dndThemed}
              />
            )}
            {tab === "carousel" && (
              <CarouselGenerator
                selection={single}
                tone={tone}
                dndThemed={dndThemed}
              />
            )}
            {tab === "card" && (
              <SocialCardGenerator
                selections={selections}
                tone={tone}
                dndThemed={dndThemed}
              />
            )}
            {tab === "broll" && (
              <BrollForge
                selection={single}
                tone={tone}
                dndThemed={dndThemed}
              />
            )}
          </div>
        )}

        <div className="mt-12 text-center flex flex-col gap-2 items-center">
          <a
            href="/dashboard"
            className="text-[#a0a0a0] hover:text-[#c08020] text-xs font-fantasy transition-colors"
          >
            ⚔️ Lead Dashboard
          </a>
          <a
            href="/"
            className="text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy transition-colors"
          >
            🏰 Return to Quest Board
          </a>
        </div>
      </div>
    </main>
  );
}
