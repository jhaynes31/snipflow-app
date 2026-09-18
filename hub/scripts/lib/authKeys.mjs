// Generates the signing keys Convex Auth needs, in the exact format its own
// `npx @convex-dev/auth` setup command writes them. Pure; used by the Vercel
// build script and by tests.
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

export async function generateAuthKeys() {
  const keys = await generateKeyPair("RS256");
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  return {
    JWT_PRIVATE_KEY: privateKey.trimEnd().replace(/\n/g, " "),
    JWKS: JSON.stringify({ keys: [{ use: "sig", ...publicKey }] }),
  };
}

/** The site URL Convex Auth should trust, from Vercel's build-time variables. */
export function siteUrlFromVercel(env) {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  return host ? `https://${host}` : null;
}
