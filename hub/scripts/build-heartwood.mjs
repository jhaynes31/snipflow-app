// Build Heartwood Fitness (hub/heartwood, a Vite app) and place its output at
// public/fitness/app so Next serves it at /fitness/app/. Run by
// scripts/vercel-build.mjs before the site builds, or by `npm run build:heartwood`.
//
// Heartwood keeps its own package.json and lockfile; nothing of it is bundled
// into the Next app. Its data stays in the browser (IndexedDB), so this step
// touches no database.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hub = dirname(dirname(fileURLToPath(import.meta.url)));
const app = join(hub, "heartwood");
const out = join(hub, "public", "fitness", "app");

export function buildHeartwood() {
  if (!existsSync(join(app, "package.json"))) {
    console.log("No heartwood/ folder; skipping Heartwood Fitness.");
    return;
  }
  console.log("Building Heartwood Fitness…");
  const opts = { cwd: app, stdio: "inherit" };
  execSync("npm ci --no-audit --no-fund", opts);
  execSync("npm run build", opts);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(dirname(out), { recursive: true });
  cpSync(join(app, "dist"), out, { recursive: true });
  console.log("Heartwood Fitness placed at public/fitness/app.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) buildHeartwood();
