import { promises as dns } from "node:dns";

/**
 * Does this domain receive mail? Looks for MX records, then falls back to a
 * plain address record (some small domains accept mail without MX). Lookup
 * failures that are not "no such domain" fail open, so a DNS hiccup never
 * blocks a real lead; results are cached briefly per instance.
 */
const cache = new Map<string, { at: number; ok: boolean }>();
const TTL_MS = 10 * 60 * 1000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }, (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function verifyMailDomain(domain: string): Promise<boolean> {
  const key = domain.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok;
  let ok = true;
  try {
    const mx = await withTimeout(dns.resolveMx(key), 2500);
    ok = mx.length > 0;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN") {
      try {
        const a = await withTimeout(dns.resolve4(key), 2500);
        ok = a.length > 0;
      } catch (e2) {
        const c2 = (e2 as { code?: string }).code;
        ok = !(c2 === "ENOTFOUND" || c2 === "ENODATA" || c2 === "NXDOMAIN");
      }
    } else {
      console.warn("[leads] mail domain lookup failed open for", key, code);
      ok = true;
    }
  }
  cache.set(key, { at: Date.now(), ok });
  return ok;
}
