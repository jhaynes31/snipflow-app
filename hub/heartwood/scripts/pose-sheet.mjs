// Renders every pose to a contact sheet PNG so the drawings can be checked by eye.
//   node scripts/pose-sheet.mjs [out.png]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const dir = mkdtempSync(join(tmpdir(), 'poses-'));
await build({ entryPoints: ['src/media/poses.ts'], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'poses.mjs') });
await build({ entryPoints: ['src/media/pose.ts'], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'pose.mjs') });
const { POSES } = await import(join(dir, 'poses.mjs'));
const { poseSvg } = await import(join(dir, 'pose.mjs'));
const only = process.argv[3] ? process.argv[3].split(',') : null;
const ids = Object.keys(POSES).filter((id) => !only || only.some((o) => id.startsWith(o)));
const cells = ids.map((id) => `<figure><div class="row"><div class="a">${poseSvg({ ...POSES[id], b: undefined }, id)}</div><div class="b">${POSES[id].b ? poseSvg({ a: POSES[id].b, props: POSES[id].props }, id) : ''}</div></div><figcaption>${id}</figcaption></figure>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:12px;background:#fff;font:12px system-ui}figure{display:inline-flex;flex-direction:column;margin:6px;width:330px;vertical-align:top}.row{display:flex;gap:4px}svg{width:160px;height:120px;display:block}figcaption{text-align:center}</style>${cells}`;
const file = join(dir, 'sheet.html');
writeFileSync(file, html);
const out = process.argv[2] ?? join(dir, 'sheet.png');
const rows = Math.ceil(ids.length / 2);
execFileSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=1040,${Math.max(300, rows * 176 + 60)}`, `--screenshot=${out}`, `file://${file}`], { stdio: 'ignore' });
console.log(out, ids.length);
