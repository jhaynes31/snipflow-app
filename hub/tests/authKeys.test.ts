import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateAuthKeys, siteUrlFromVercel } from "../scripts/lib/authKeys.mjs";

describe("auth key generation for the Vercel build", () => {
  it("writes the private key and JWKS in the format Convex Auth expects", async () => {
    const keys = await generateAuthKeys();
    assert.ok(keys.JWT_PRIVATE_KEY.startsWith("-----BEGIN PRIVATE KEY----- "));
    assert.ok(keys.JWT_PRIVATE_KEY.endsWith(" -----END PRIVATE KEY-----"));
    assert.ok(!keys.JWT_PRIVATE_KEY.includes("\n"));
    const jwks = JSON.parse(keys.JWKS);
    assert.equal(jwks.keys.length, 1);
    assert.equal(jwks.keys[0].use, "sig");
    assert.equal(jwks.keys[0].kty, "RSA");
    assert.ok(jwks.keys[0].n && jwks.keys[0].e);
    assert.ok(!("d" in jwks.keys[0]), "JWKS must hold only the public key");
  });
  it("derives the site URL from Vercel's production host", () => {
    assert.equal(siteUrlFromVercel({ VERCEL_PROJECT_PRODUCTION_URL: "the-shire.vercel.app" }), "https://the-shire.vercel.app");
    assert.equal(siteUrlFromVercel({ VERCEL_URL: "the-shire-abc.vercel.app" }), "https://the-shire-abc.vercel.app");
    assert.equal(siteUrlFromVercel({}), null);
  });
});
