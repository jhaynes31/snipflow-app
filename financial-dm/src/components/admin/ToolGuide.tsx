import { useEffect } from "react";
import { GUILD_CONFIG } from "~/lib/guildConfig";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, TEMPERAMENTS } from "~/lib/practiceConfig";
import { DM_SCREEN_CONFIG } from "~/lib/dmScreen";

/**
 * The how-to for John's two rehearsal-and-stage tools, kept next to the tools
 * themselves under Settings. Plain English, no scores, no jargon. Pulls its
 * few numbers from the same config the tools read, so it never drifts.
 */

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28] p-4 space-y-3";
const h2 = "font-fantasy text-[#c08020] text-lg";
const h3 = "font-fantasy text-[#e0e0e0] text-sm";
const p = "text-sm text-[#c9d3e3] leading-relaxed";
const small = "text-[11px] text-[#808080]";
const list = "list-decimal pl-5 space-y-1.5 text-sm text-[#c9d3e3] leading-relaxed marker:text-[#c08020]";
const bullets = "list-disc pl-5 space-y-1.5 text-sm text-[#c9d3e3] leading-relaxed marker:text-[#c08020]";
const kbd = "inline-block rounded border border-[#406080]/60 bg-[#0d1520] px-1.5 text-[11px] text-[#e0e0e0] whitespace-nowrap";
const note = "rounded-lg border-l-4 border-[#c08020] bg-[#1c1a12]/80 px-3 py-2 text-[13px] text-[#e0c080]";

export default function ToolGuide({ topic }: { topic?: string }) {
  // A "How to" link from a tool lands on that tool's part of the page.
  useEffect(() => {
    if (!topic) return;
    document.getElementById(`guide-${topic}`)?.scrollIntoView({ block: "start" });
  }, [topic]);
  const levels = DIFFICULTY_LEVELS;
  return (
    <div className="space-y-4" data-settings-view="guide" data-tool-guide>
      <div className="flex flex-wrap items-center gap-3">
        <a href="/admin/settings" className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">← All settings</a>
        <span className="flex-1" />
        <a href="#guide-screen" className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">The DM Screen</a>
        <a href="#guide-present" className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">Presenting</a>
        <a href="#guide-dummy" className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">The Sparring Dummy</a>
        <a href="#guide-recruits" className="text-xs font-fantasy text-[#a0a0a0] hover:text-[#c08020]">Recruits</a>
      </div>
      <p className={p}>Two tools for the same job. The DM Screen is what you read from during a presentation. The Sparring Dummy is where you rehearse the conversation first. Both sit behind this login; nothing here is visible to the public.</p>

      <section id="guide-screen" className={card} data-guide-section="screen">
        <h2 className={h2}>📜 The DM Screen</h2>
        <p className={small}>Scripts tab in the top bar. Home also has an "Open a script" shortcut.</p>
        <p className={p}>A script is your presentation, written out section by section. You write it once, practice against it, and read from it live. Nothing in it is generated: every word is yours.</p>
        <h3 className={h3}>Writing one</h3>
        <ol className={list}>
          <li>Type a name, pick <b>For clients</b> or <b>For recruits</b>, and press Create. Your recruiting outline from the practice tool is already there as your first recruit script.</li>
          <li>Press <b>Add a section</b>. Each section has a title, the slide it goes with, a target time in minutes, the words you say, and a notes box you never read aloud.</li>
          <li>Use the arrows to move a section up or down. The ✕ removes one; earlier versions keep it.</li>
          <li>Everything saves on its own about a second after you stop typing. The top right says <b>Saved</b>, <b>Unsaved changes</b>, or <b>Saving</b>.</li>
        </ol>
        <h3 className={h3}>Formatting the words</h3>
        <p className={p}>Plain text with three markers, so it stays readable on stage. Press <b>Preview</b> under any section to see how it will look.</p>
        <ul className={bullets}>
          <li><b>**two stars**</b> around words makes them bold</li>
          <li><b>*one star*</b> around words makes them italic</li>
          <li><b>- a dash and a space</b> at the start of a line makes a bullet</li>
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Never lost</h3>
            <p className={p}>Every save is kept. Press <b>History</b> to see the last {DM_SCREEN_CONFIG.versionsKept} and restore any of them. Scripts are never deleted; <b>Archive</b> puts one away and <b>Bring back</b> returns it.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Variations</h3>
            <p className={p}>Want a short version? Press <b>Duplicate</b> on the list and edit the copy. <b>Set as default</b> marks the one you use most for each audience.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Things to check</h3>
            <p className={p}>As you type, phrases that could cause trouble get a small warning under the section: guarantees in client scripts, income claims and hiring language in recruit scripts. They never stop you saving. Fix the words and the warning goes.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Trust and Presentation tags</h3>
            <p className={p}>In recruit scripts each section can be marked <b>Trust fact</b> (safe to say anywhere) or <b>Presentation fact</b> (for the conversation). It is a label for you, nothing more.</p>
          </div>
        </div>
      </section>

      <section id="guide-present" className={card} data-guide-section="present">
        <h2 className={h2}>🎤 Presenting</h2>
        <p className={p}>Press <b>▶ Present</b> on the list or in the editor. It opens in its own window with nothing else on screen: the section title and slide number, your words in large type, your notes beside them, the next section's title at the bottom, and a thin progress bar. A short screen comes first with the script name, the section count, any warnings, and a Start button. One click and you are in.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Two monitors</h3>
            <p className={p}>Drag the window to your second monitor and present on the first. Advance with the arrow keys, the spacebar, a click, or a presentation remote.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Phone</h3>
            <p className={p}>Open the same address on your phone. Tap the right side or swipe left for the next section, the left side or swipe right to go back. Notes sit behind a button, and Back and Next are at the bottom within reach of your thumb. The screen stays awake while you present.</p>
          </div>
        </div>
        <h3 className={h3}>Keys</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[#808080] font-fantasy border-b border-[#406080]/30"><th className="py-1 pr-3">Press</th><th className="py-1">What happens</th></tr>
            </thead>
            <tbody className="text-[#c9d3e3]">
              <tr className="border-b border-[#406080]/15"><td className="py-1.5 pr-3 whitespace-nowrap"><span className={kbd}>→</span> <span className={kbd}>Space</span> <span className={kbd}>Page Down</span></td><td className="py-1.5">Next section. Page Down is what most remotes send.</td></tr>
              <tr className="border-b border-[#406080]/15"><td className="py-1.5 pr-3 whitespace-nowrap"><span className={kbd}>←</span> <span className={kbd}>Page Up</span></td><td className="py-1.5">Previous section.</td></tr>
              <tr className="border-b border-[#406080]/15"><td className="py-1.5 pr-3"><span className={kbd}>L</span></td><td className="py-1.5">The section list. One click jumps anywhere, for when someone derails you.</td></tr>
              <tr className="border-b border-[#406080]/15"><td className="py-1.5 pr-3 whitespace-nowrap"><span className={kbd}>T</span> <span className={kbd}>R</span></td><td className="py-1.5">Start or pause the timer; reset it. When a section has a target, its own time shows against it and turns red if you run over.</td></tr>
              <tr className="border-b border-[#406080]/15"><td className="py-1.5 pr-3 whitespace-nowrap"><span className={kbd}>+</span> <span className={kbd}>-</span></td><td className="py-1.5">Bigger or smaller text. Remembered separately for the monitor and the phone.</td></tr>
              <tr><td className="py-1.5 pr-3"><span className={kbd}>Esc</span></td><td className="py-1.5">Closes the list. Pressed again, asks whether to end. Nothing ends without that question.</td></tr>
            </tbody>
          </table>
        </div>
        <p className={note}>Built to survive the live moment. Once it has started it needs no internet. If the window closes or refreshes, opening it again offers to resume at the same section. If you edit the script in another window while presenting, the presenter shows a tiny "edited elsewhere" mark and changes nothing until you end. The sun and moon button switches between dark and light.</p>
        <p className={small}>iPhone: Safari does not allow a page to go full screen on its own. Add the page to your home screen once (Share, then "Add to Home Screen") and it opens full screen from there.</p>
      </section>

      <section id="guide-dummy" className={card} data-guide-section="dummy">
        <h2 className={h2}>🥊 The Sparring Dummy</h2>
        <p className={small}>Practice tab in the top bar.</p>
        <p className={p}>A fictional person, played by an AI, who you talk to as if they were a real prospect. It is for reps: wording, structure, and getting back on track when interrupted. AI people are more patient and more articulate than real ones, so a good session is practice, not proof.</p>
        <h3 className={h3}>Setting up a session</h3>
        <ol className={list}>
          <li><b>Conversation:</b> Coverage or Recruiting.</li>
          <li><b>Who:</b> pick a profile. The person is invented from the profile's description only. Never a real lead or recruit.</li>
          <li><b>Temperament:</b> how they show up. {TEMPERAMENTS.slice(0, 4).map((t) => t.label).join(", ")}, and so on.</li>
          <li><b>Difficulty:</b> {levels[0].level} to {levels[levels.length - 1].level}. Level {DEFAULT_DIFFICULTY} is the default and where most practice should happen. Higher is not better practice; Level {levels[levels.length - 1].level} builds nerve, it does not measure skill, and any level can end any way.</li>
          <li><b>The person:</b> press <b>Invent a person</b>. Reroll if they do not fit, or <b>Save this person</b> to practice with them again later.</li>
          <li><b>Mode:</b> <b>Objection Practice</b> is open back and forth. <b>Presentation Practice</b> walks through one of your DM Screen scripts section by section while they react, interrupt, and jump ahead.</li>
        </ol>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>During</h3>
            <p className={p}>Type what you would say, or turn on the voice bar to speak and hear them. <b>Pause for a hint</b> tells you what they are actually worried about. In Presentation Practice, mark each section delivered and, if you like, type the key lines you said. <b>End</b> when you would in real life and say how it went.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>The debrief</h3>
            <p className={p}>No scores, ever. It shows how it ended, any phrases of yours that tripped a rule, whether you addressed what the person was really worried about, how you did against your own rubric, and one thing to try next time.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Your rubric</h3>
            <p className={p}>At the bottom of the Practice page, one line per thing you want noticed, separately for Coverage and Recruiting. The debrief judges only against these. The starter lines are examples; make them yours.</p>
          </div>
          <div className="rounded-lg border border-[#406080]/30 p-3 space-y-1">
            <h3 className={h3}>Sessions</h3>
            <p className={p}>"Sessions and recruits" at the top of the Practice page lists everything you have run. <b>Share</b> on a finished session makes it an example recruits can read.</p>
          </div>
        </div>
      </section>

      <section id="guide-recruits" className={card} data-guide-section="recruits">
        <h2 className={h2}>🛡️ Recruits</h2>
        <p className={p}>Anyone on the Guild tab can be given the Sparring Dummy. Open their card, press <b>Give them practice access</b>, then Copy or Text it. They get a private link, no login, with the same setup you have minus the editors, a suggested level for their stage, their own sessions, and any examples you shared.</p>
        <ul className={bullets}>
          <li>Their transcripts are private unless they turn on <b>Share this transcript with John</b>. You see how often they practiced and how sessions ended. Practice should feel safe to be bad at.</li>
          <li>The AI never hears their name.</li>
          <li><b>New link</b> replaces the link. <b>Take it back</b> ends their access at once. Their history stays counted.</li>
          <li>A recruit who has joined can also get a Quest Log from the same card: the onboarding steps, your note, and a way to reach you at {GUILD_CONFIG.recruitPhone}.</li>
        </ul>
        <p className={note}>The single most useful thing right now: run two or three real practice sessions. What you notice in the first real ones is what gets tuned next.</p>
      </section>
    </div>
  );
}
