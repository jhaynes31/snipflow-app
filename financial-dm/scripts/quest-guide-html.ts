// Builds the shareable Quest Board tutorial page from the same text the
// in-app Guide tab shows (src/lib/questGuide.ts), so the two never drift.
//   bun run scripts/quest-guide-html.ts > quest-board-guide.html
import { readFileSync } from "node:fs";
import { GUIDE_LOOP, GUIDE_RULES, GUIDE_SECTIONS } from "../src/lib/questGuide";

// The page is shared as a standalone file, so the logo travels inside it.
const logo = `data:image/png;base64,${readFileSync(new URL("../public/logo.png", import.meta.url)).toString("base64")}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const loop = GUIDE_LOOP.map((s, i) => `<li><span class="n">${i + 1}</span><span><b>${esc(s.label)}</b><small>${esc(s.detail)}</small></span></li>`).join("");
const toc = GUIDE_SECTIONS.map((s, i) => `<a href="#${s.id}">${i + 1}. ${esc(s.title)}</a>`).join("");
const sections = GUIDE_SECTIONS.map(
  (s, i) => `<section id="${s.id}">
  <p class="eyebrow">Step ${i + 1} · ${esc(s.where)}</p>
  <h2>${esc(s.title)}</h2>
  <p class="intro">${esc(s.intro)}</p>
  <ol class="steps">${s.steps.map((st) => `<li><span>${esc(st.do)}</span>${st.note ? `<small>${esc(st.note)}</small>` : ""}</li>`).join("")}</ol>
  ${s.tip ? `<p class="tip">🕯️ ${esc(s.tip)}</p>` : ""}
</section>`,
).join("\n");
const rules = GUIDE_RULES.map((r) => `<li>${esc(r)}</li>`).join("");

process.stdout.write(`<title>Quest Board Guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=MedievalSharp&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap">
<style>
  :root {
    --ground: #0d1520; --panel: #111a28; --panel-2: #0b1219; --line: rgba(64, 96, 128, 0.35);
    --gold: #c08020; --gold-soft: #e0c890; --ink: #e6e1d6; --ink-2: #a8a49b; --ink-3: #6b6f80;
    --display: 'MedievalSharp', 'Macondo', Georgia, serif;
    --body: 'Alegreya Sans', 'Gill Sans', 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ground); color: var(--ink); font-family: var(--body); font-size: 17px; line-height: 1.55; padding-block: 32px 64px; padding-inline: 20px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  header { text-align: center; margin-bottom: 28px; }
  header img { width: 88px; height: 88px; border-radius: 50%; }
  h1 { font-family: var(--display); font-weight: 400; color: var(--gold); font-size: clamp(30px, 6vw, 42px); margin: 10px 0 4px; text-shadow: 0 0 22px rgba(192, 128, 32, 0.28); text-wrap: balance; }
  header p { color: var(--ink-2); margin: 0; font-size: 16px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 22px 22px; }
  .card.lead { border-color: rgba(192, 128, 32, 0.4); }
  .card h2, .card h3 { font-family: var(--display); font-weight: 400; color: var(--gold); margin: 0; text-wrap: balance; }
  .card h2 { font-size: 24px; }
  .loop { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 640px) { .loop { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .loop li { display: flex; gap: 10px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
  .loop .n { font-family: var(--display); color: var(--gold); font-size: 20px; line-height: 1; padding-top: 3px; width: 18px; flex: none; font-variant-numeric: tabular-nums; }
  .loop b { display: block; font-weight: 500; font-family: var(--display); font-size: 15px; }
  .loop small { display: block; color: var(--ink-3); font-size: 13px; line-height: 1.35; }
  .toc { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .toc a { color: var(--ink-2); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; font-size: 13px; font-family: var(--display); }
  .toc a:hover, .toc a:focus-visible { color: var(--ink); border-color: rgba(192, 128, 32, 0.5); outline: none; }
  section { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 22px; margin-top: 18px; scroll-margin-top: 16px; }
  .eyebrow { margin: 0; color: var(--ink-3); font-family: var(--display); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
  section h2 { font-family: var(--display); font-weight: 400; color: var(--gold); font-size: 24px; margin: 4px 0 0; text-wrap: balance; }
  .intro { color: var(--ink-2); margin: 10px 0 0; }
  .steps { margin: 16px 0 0; padding: 0 0 0 26px; display: grid; gap: 12px; }
  .steps li::marker { color: var(--gold); font-family: var(--display); }
  .steps li span { display: block; }
  .steps li small { display: block; color: var(--ink-2); font-size: 14.5px; margin-top: 3px; line-height: 1.45; }
  .tip { margin: 16px 0 0; background: rgba(192, 128, 32, 0.1); border: 1px solid rgba(192, 128, 32, 0.25); border-radius: 10px; padding: 9px 12px; color: var(--gold-soft); font-family: var(--display); font-size: 14.5px; }
  .rules { margin: 12px 0 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  @media (min-width: 640px) { .rules { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .rules li { padding-left: 20px; position: relative; }
  .rules li::before { content: "◆"; color: var(--gold); position: absolute; left: 0; top: 0; font-size: 12px; line-height: 1.8; }
  footer { text-align: center; color: var(--ink-3); font-size: 13px; margin-top: 28px; font-family: var(--display); }
  a:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
  @media print { body { background: #fff; color: #111; } .card, section { border-color: #bbb; background: #fff; } .tip { color: #7a4f10; } }
</style>
<div class="wrap">
  <header>
    <img src="${logo}" alt="" width="88" height="88">
    <h1>The Quest Board</h1>
    <p>John's guide to running a campaign, from the first profile to the last booked call.</p>
  </header>
  <div class="card lead">
    <h2>How a quest works, start to finish</h2>
    <p class="intro">The Quest Board turns "I should post more" into a short campaign with one goal: booked calls. This is the loop. Each step has its own section below.</p>
    <ol class="loop">${loop}</ol>
    <nav class="toc" aria-label="Sections">${toc}</nav>
  </div>
  ${sections}
  <section>
    <h2>House rules</h2>
    <ul class="rules">${rules}</ul>
  </section>
  <footer>Sign in at thefinancialdm.com/quest-board · the same guide lives under the 📖 Guide tab.</footer>
</div>
`);
