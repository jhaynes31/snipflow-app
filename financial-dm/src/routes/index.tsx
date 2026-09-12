import { createFileRoute, Link } from "@tanstack/react-router";
import { JOHN_TITLE_LINE } from "~/lib/johnTitles";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 pb-20 text-center"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      <img src="/logo.png" alt="The Financial DM" className="h-40 sm:h-52 w-auto mx-auto mb-2 drop-shadow-lg" />
      <p className="text-[#c9a25a] text-xs sm:text-sm font-fantasy tracking-wide -mt-1 mb-3">Protect what matters most, because life is unpredictable.</p>
      <span className="rounded-full bg-[#204060]/30 px-3 py-1 text-sm font-fantasy text-[#c08020] border border-[#406080]/30">
        {JOHN_TITLE_LINE}
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl font-fantasy text-[#e0e0e0]"
        style={{ textShadow: "0 0 30px rgba(192, 128, 32, 0.2)" }}
      >
        The Financial DM
      </h1>
      <p className="max-w-md text-lg text-[#a0a0a0]">
        Roll the dice on your financial future. Take the quiz.
      </p>

      <Link
        to="/quiz"
        className="mt-4 px-6 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold shadow-xl shadow-[#c08020]/20 transition-all font-fantasy text-lg tracking-wider"
      >
        🛡️ Roll a Wisdom Saving Throw 🛡️
      </Link>

      <Link
        to="/wealth-check"
        className="px-6 py-3 rounded-lg border-2 border-[#c08020]/60 text-[#c08020] hover:bg-[#c08020]/10 hover:text-[#e0b45a] font-bold transition-all font-fantasy text-lg tracking-wider"
      >
        💰 Roll for Wealth 💰
      </Link>

    </main>
  );
}
