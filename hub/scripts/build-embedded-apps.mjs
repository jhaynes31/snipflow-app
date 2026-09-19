// Build the apps that live inside The Shire as their own Vite projects and
// place their output under public/ so Next serves them as static files:
//
//   hub/heartwood        → public/fitness/app          (/fitness/app/)
//   hub/love-and-release → public/love-and-release/app (/love-and-release/app/)
//
// Run by scripts/vercel-build.mjs before the site builds, or alone with
// `npm run build:embedded`. Each app keeps its own package.json and lockfile;
// nothing of them is bundled into the Next app, and their data stays in the
// browser (IndexedDB), so this step touches no database.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hub = dirname(dirname(fileURLToPath(import.meta.url)));

export const EMBEDDED_APPS = [
  { name: "Heartwood Fitness", dir: "heartwood", out: join("fitness", "app") },
  { name: "Love & Release", dir: "love-and-release", out: join("love-and-release", "app") },
];

export function buildEmbeddedApp({ name, dir, out }) {
  const app = join(hub, dir);
  const target = join(hub, "public", out);
  if (!existsSync(join(app, "package.json"))) {
    console.log(`No ${dir}/ folder; skipping ${name}.`);
    return;
  }
  console.log(`Building ${name}…`);
  // Vercel builds with NODE_ENV=production, which makes npm skip devDependencies;
  // the compiler and bundler live there, so ask for them explicitly.
  const opts = { cwd: app, stdio: "inherit", env: { ...process.env, NODE_ENV: "development" } };
  execSync("npm ci --no-audit --no-fund --include=dev", opts);
  execSync("npm run build", opts);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(app, "dist"), target, { recursive: true });
  console.log(`${name} placed at public/${out}.`);
}

export function buildEmbeddedApps() {
  for (const app of EMBEDDED_APPS) buildEmbeddedApp(app);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) buildEmbeddedApps();
