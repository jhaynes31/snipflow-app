// The Vercel build. Run by `vercel.json`.
//
// Production (CONVEX_DEPLOY_KEY present and VERCEL_ENV=production):
//   1. If the Convex deployment has no login keys yet, generate them and
//      store them there. Same for SITE_URL. Nothing is printed or kept.
//   2. Push the Convex functions and build the site.
//
// Anything else (a preview build, or no key): just build the site, and never
// touch the production database.
import { execFileSync, execSync } from "node:child_process";
import webpush from "web-push";
import { generateAuthKeys, siteUrlFromVercel } from "./lib/authKeys.mjs";
import { importEveryBoxIfNeeded } from "./import-every-box.mjs";
import { buildEmbeddedApps } from "./build-embedded-apps.mjs";

const isProduction = process.env.VERCEL_ENV === "production";
const hasKey = Boolean(process.env.CONVEX_DEPLOY_KEY);

function convexEnvGet(name) {
  try {
    return execFileSync("npx", ["convex", "env", "get", name], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function convexEnvSet(name, value) {
  // `--` ends option parsing, so a value that starts with dashes (a PEM key
  // does) is read as a value. Output is captured, never printed, so a secret
  // can't land in the build log even when the command fails.
  try {
    execFileSync("npx", ["convex", "env", "set", "--", name, value], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().replace(value, "<redacted>") : "";
    throw new Error(`Could not set ${name} on the Convex deployment.\n${stderr}`);
  }
  console.log(`Set ${name} on the Convex deployment.`);
}

async function configureAuth() {
  const privateKey = convexEnvGet("JWT_PRIVATE_KEY");
  const jwks = convexEnvGet("JWKS");
  if (!privateKey || !jwks) {
    const keys = await generateAuthKeys();
    convexEnvSet("JWT_PRIVATE_KEY", keys.JWT_PRIVATE_KEY);
    convexEnvSet("JWKS", keys.JWKS);
  } else {
    console.log("Login keys already present on the Convex deployment.");
  }

  const siteUrl = siteUrlFromVercel(process.env);
  if (!convexEnvGet("SITE_URL") && siteUrl) {
    convexEnvSet("SITE_URL", siteUrl);
  }

  // The two allowed sign-in addresses (2026-09-25). Set HUB_ALLOWED_EMAILS on the
  // Vercel project (Settings > Environment Variables) and each production build
  // copies it to the Convex deployment, where the sign-up check actually runs.
  // Left unset, sign-up is still capped at two accounts but not pinned to emails.
  const allowed = (process.env.HUB_ALLOWED_EMAILS ?? "").trim();
  if (allowed && convexEnvGet("HUB_ALLOWED_EMAILS") !== allowed) {
    convexEnvSet("HUB_ALLOWED_EMAILS", allowed);
  }

  // Notification signing keys (VAPID), once. The private key never leaves Convex.
  if (!convexEnvGet("VAPID_PUBLIC_KEY") || !convexEnvGet("VAPID_PRIVATE_KEY")) {
    const keys = webpush.generateVAPIDKeys();
    convexEnvSet("VAPID_PUBLIC_KEY", keys.publicKey);
    convexEnvSet("VAPID_PRIVATE_KEY", keys.privateKey);
    if (siteUrl) convexEnvSet("VAPID_SUBJECT", siteUrl);
  } else {
    console.log("Notification keys already present on the Convex deployment.");
  }
}

// Heartwood Fitness and Love & Release first, so `next build` picks up their files under public/.
buildEmbeddedApps();

if (isProduction && hasKey) {
  await configureAuth();
  execSync("npx convex deploy --cmd 'npm run build'", { stdio: "inherit" });
  // After the functions are deployed, so the import helpers exist.
  await importEveryBoxIfNeeded();
} else {
  console.log(
    hasKey
      ? "Preview build: building the site only, leaving the production database alone."
      : "No CONVEX_DEPLOY_KEY: building the site only.",
  );
  execSync("npm run build", { stdio: "inherit" });
}
