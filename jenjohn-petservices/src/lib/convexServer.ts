/**
 * The ONE server-side path to Convex. Every Convex function in convex/ is an
 * internal function, which the public Convex HTTP API refuses to run unless the
 * request carries a deploy key. This module attaches that key, so:
 *
 *   - nobody who learns the deployment URL can read or change data directly;
 *   - the browser never talks to Convex at all (it only ever hits /api/*);
 *   - the deploy key lives only in the server environment (CONVEX_DEPLOY_KEY).
 *
 * Generate the key in the Convex dashboard (Settings -> Deploy keys) for the
 * production deployment and set it in the site .env next to
 * CONVEX_DEPLOYMENT_URL. This module is server-only and must never be imported
 * from client code.
 *
 * FAIL-LOUD contract: missing configuration, a network error, a non-OK HTTP
 * status, invalid JSON, or a Convex {status:"error"} payload all THROW with a
 * message that names the function, so a caller can never mistake an outage
 * for "no rows". Read calls are retried once after a short pause (a cold
 * server's first request is the one most likely to fail); writes are never
 * retried, so nothing can be double-written.
 */

export type ConvexKind = "query" | "mutation" | "action";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function deploymentUrl(): string {
  const url = (process.env.CONVEX_DEPLOYMENT_URL || "").trim().replace(/\/+$/, "");
  if (!url) throw new Error("CONVEX_DEPLOYMENT_URL is not set");
  return url;
}

function deployKey(): string {
  const key = (process.env.CONVEX_DEPLOY_KEY || "").trim();
  if (!key) {
    throw new Error(
      "CONVEX_DEPLOY_KEY is not set. Create a deploy key in the Convex dashboard (Settings -> Deploy keys) and add it to the server environment.",
    );
  }
  return key;
}

/** Convex spells the module prefix after the file name: queries:x, mutations:x. */
function functionPath(kind: ConvexKind, name: string): string {
  if (name.includes(":")) return name;
  const module = kind === "query" ? "queries" : kind === "mutation" ? "mutations" : "scheduling";
  return `${module}:${name}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce(
  kind: ConvexKind,
  path: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; value: unknown } | { ok: false; retryable: boolean; error: Error }> {
  let res: Response;
  try {
    res = await fetch(`${deploymentUrl()}/api/${kind}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${deployKey()}`,
      },
      body: JSON.stringify({ path, args, format: "json" }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, retryable: true, error: new Error(`Convex ${kind} ${path} unreachable: ${msg}`) };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      retryable: RETRYABLE_STATUS.has(res.status),
      error: new Error(`Convex ${kind} ${path} failed: HTTP ${res.status}${detail ? ` ${detail.slice(0, 300)}` : ""}`),
    };
  }
  let json: { status?: string; value?: unknown; errorMessage?: string };
  try {
    json = await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, retryable: false, error: new Error(`Convex ${kind} ${path} returned invalid JSON: ${msg}`) };
  }
  if (json && json.status === "error") {
    return {
      ok: false,
      retryable: false,
      error: new Error(`Convex ${kind} ${path} failed: ${json.errorMessage || "unknown Convex error"}`),
    };
  }
  return { ok: true, value: json.value ?? json };
}

export async function convexCall(
  kind: ConvexKind,
  name: string,
  args: Record<string, unknown> = {},
): Promise<any> {
  const path = functionPath(kind, name);
  const attempts = kind === "query" ? 2 : 1;
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await callOnce(kind, path, args);
    if (result.ok) return result.value;
    lastError = result.error;
    console.error(`[convex] ${result.error.message} (attempt ${attempt}/${attempts})`);
    if (!result.retryable || attempt === attempts) break;
    await sleep(400 * attempt);
  }
  throw lastError ?? new Error(`Convex ${kind} ${path} failed`);
}

export function convexQuery(name: string, args: Record<string, unknown> = {}): Promise<any> {
  return convexCall("query", name, args);
}

export function convexMutation(name: string, args: Record<string, unknown> = {}): Promise<any> {
  return convexCall("mutation", name, args);
}
