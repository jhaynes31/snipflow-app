// Scans user-facing source for phrases the shame-free rules forbid.
// Run: npm run check-copy (also part of `npm run lint`).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findBanned } from "../core/copy/banned.mjs";

const ROOTS = ["app", "core", "modules"];
const SKIP_FILES = new Set(["core/copy/banned.mjs"]);
const EXT = /\.(tsx?|mjs|css|md)$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.test(name)) yield p;
  }
}

let problems = 0;
for (const root of ROOTS) {
  let files;
  try {
    files = [...walk(root)];
  } catch {
    continue;
  }
  for (const file of files) {
    const rel = relative(".", file);
    if (SKIP_FILES.has(rel)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Comments explain rules; only literal text is checked.
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
      for (const phrase of findBanned(line)) {
        problems++;
        console.log(`${rel}:${i + 1}: contains "${phrase}"`);
      }
    });
  }
}

if (problems) {
  console.error(`\n${problems} line(s) use copy the shame-free rules forbid. See docs/hub-contract.md.`);
  process.exit(1);
} else {
  console.log("Copy check passed: no forbidden phrases in app/, core/ or modules/.");
}
