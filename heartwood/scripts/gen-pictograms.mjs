// Generates simple, calm stance pictograms used as fallback demos for every exercise.
// Real GIF/video demos are layered on top via scripts/fetch-exercisedb.mjs + media manifest.
import { writeFileSync } from 'node:fs';

const F = '#2F4A2E', M = '#5B7B3A', BG = '#E6ECD8', LINE = '#6B4F3A';
const head = (x, y) => `<circle cx="${x}" cy="${y}" r="13" fill="${F}"/>`;
const seg = (x1, y1, x2, y2, c = F) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="10" stroke-linecap="round"/>`;
const floor = `<line x1="24" y1="204" x2="296" y2="204" stroke="${LINE}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>`;
const counter = `<rect x="228" y="110" width="52" height="94" rx="6" fill="${M}" opacity="0.5"/>`;
const chair = `<rect x="196" y="150" width="56" height="10" rx="4" fill="${M}" opacity="0.6"/><rect x="244" y="96" width="8" height="64" rx="3" fill="${M}" opacity="0.6"/><line x1="200" y1="160" x2="200" y2="204" stroke="${M}" stroke-width="8" opacity="0.6"/><line x1="248" y1="160" x2="248" y2="204" stroke="${M}" stroke-width="8" opacity="0.6"/>`;

const figures = {
  'supine': head(60, 178) + seg(74, 180, 150, 182) + seg(150, 182, 200, 150) + seg(200, 150, 232, 200) + seg(120, 182, 150, 150) + seg(150, 150, 185, 160),
  'prone': head(60, 186) + seg(74, 184, 150, 184) + seg(150, 184, 240, 186) + seg(100, 184, 90, 204) + seg(200, 186, 205, 204),
  'seated': chair + head(190, 92) + seg(190, 106, 190, 156) + seg(190, 156, 150, 158) + seg(150, 158, 152, 204) + seg(190, 120, 160, 150),
  'side-lying': head(56, 176) + seg(70, 176, 150, 176) + seg(150, 176, 190, 190) + seg(190, 190, 230, 178) + seg(110, 176, 130, 150) + seg(130, 150, 165, 158),
  'quadruped': head(224, 108) + seg(210, 118, 120, 118) + seg(120, 118, 100, 204) + seg(200, 118, 200, 204) + seg(120, 118, 120, 204) + seg(214, 118, 214, 204),
  'kneeling': head(150, 78) + seg(150, 92, 150, 150) + seg(150, 150, 110, 154) + seg(110, 154, 110, 204) + seg(150, 150, 190, 200) + seg(150, 110, 200, 120),
  'supported-standing': counter + head(150, 60) + seg(150, 74, 150, 140) + seg(150, 140, 140, 204) + seg(150, 140, 165, 204) + seg(150, 92, 232, 120),
  'bilateral-standing': head(150, 60) + seg(150, 74, 150, 140) + seg(150, 140, 132, 204) + seg(150, 140, 168, 204) + seg(150, 92, 118, 140) + seg(150, 92, 182, 140),
  'single-leg': counter + head(150, 60) + seg(150, 74, 150, 140) + seg(150, 140, 150, 204) + seg(150, 140, 120, 170) + seg(150, 92, 232, 120),
  'split': head(150, 60) + seg(150, 74, 150, 140) + seg(150, 140, 118, 204) + seg(150, 140, 190, 200) + seg(150, 92, 120, 130) + seg(150, 92, 180, 130),
};

for (const [name, body] of Object.entries(figures)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240" role="img" aria-label="${name.replace('-', ' ')} position">
<style>@media (prefers-reduced-motion: no-preference){ .b{ animation: breathe 4s ease-in-out infinite; transform-origin: 150px 150px; } @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} } }</style>
<rect width="320" height="240" rx="24" fill="${BG}"/>
<circle cx="270" cy="44" r="22" fill="#F2C94C" opacity="0.6"/>
${floor}
<g class="b">${body}</g>
</svg>`;
  writeFileSync(`public/media/stance-${name}.svg`, svg);
}

// App icons.
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${pad ? 0 : 110}" fill="#2F4A2E"/><circle cx="380" cy="130" r="54" fill="#F2C94C" opacity="0.9"/><path d="M256 430 V250" stroke="#6B4F3A" stroke-width="26" stroke-linecap="round"/><path d="M256 300 Q190 260 150 200 Q230 210 256 300 Z" fill="#8BA868"/><path d="M256 250 Q322 210 362 150 Q282 160 256 250 Z" fill="#5B7B3A"/><path d="M256 350 Q200 330 170 280 Q240 285 256 350 Z" fill="#5B7B3A"/><path d="M180 440 Q256 400 332 440" stroke="#6B4F3A" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.7"/></svg>`;
writeFileSync('public/icons/icon.svg', icon(false));
writeFileSync('public/icons/icon-maskable.svg', icon(true));
console.log('generated', Object.keys(figures).length, 'pictograms + icons');
