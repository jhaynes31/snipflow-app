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
import { generateAuthKeys, siteUrlFromVercel } from "./lib/authKeys.mjs";

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
  // Arguments are passed as an array, so multi-line and quoted values are safe.
  execFileSync("npx", ["convex", "env", "set", name, value], { stdio: ["ignore", "ignore", "inherit"] });
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
}

if (isProduction && hasKey) {
  await configureAuth();
  execSync("npx convex deploy --cmd 'npm run build'", { stdio: "inherit" });
} else {
  console.log(
    hasKey
      ? "Preview build: building the site only, leaving the production database alone."
      : "No CONVEX_DEPLOY_KEY: building the site only.",
  );
  execSync("npm run build", { stdio: "inherit" });
}
