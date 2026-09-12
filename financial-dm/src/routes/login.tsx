import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { getAuthStatus, loginWithPassword } from "~/server/auth";

/**
 * Only allow redirects back into this site. Anything that is not a plain
 * absolute path (for example "//evil.example") falls back to the dashboard.
 */
export function safeRedirectTarget(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  if (s.startsWith("/") && !s.startsWith("//") && !s.includes("\\")) return s;
  return "/admin";
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  loader: async () => getAuthStatus(),
  component: LoginPage,
});

function LoginPage() {
  const status = Route.useLoaderData();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const target = safeRedirectTarget(redirect);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await loginWithPassword({ data: { password } });
      if (!res.ok) {
        setError(res.error || "Could not sign in.");
        return;
      }
      // Full navigation so the new cookie is sent with the next request and
      // the admin layout's server check sees it.
      window.location.assign(target);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-10"
      style={{
        background:
          "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)",
      }}
    >
      <img
        src="/logo.png"
        alt="The Financial DM"
        className="h-20 sm:h-24 mx-auto mb-4 drop-shadow-lg"
      />
      <div className="w-full max-w-sm rounded-xl border border-[#406080]/30 bg-[#111a28] p-6 space-y-4">
        <div className="text-center">
          <h1
            className="text-2xl font-fantasy text-[#c08020]"
            style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}
          >
            🔐 The Tavern Back Room
          </h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
            John only. Enter the password to reach the dashboard and forges.
          </p>
        </div>

        {status.authenticated ? (
          <div className="space-y-3 text-center">
            <p className="text-[#e0e0e0] text-sm font-fantasy">
              You are already signed in.
            </p>
            <button
              type="button"
              onClick={() => navigate({ href: target })}
              className="w-full px-4 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy transition-all"
            >
              Continue →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {!status.configured && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-fantasy">
                Sign in is not configured. Set ADMIN_PASSWORD in the server
                environment (see .env.example) and restart the site.
              </div>
            )}
            <label className="block">
              <span className="text-[#a0a0a0] text-xs font-fantasy">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!status.configured || submitting}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 disabled:opacity-50"
              />
            </label>
            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-fantasy">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!status.configured || submitting || !password}
              className="w-full px-4 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold font-fantasy transition-all"
            >
              {submitting ? "Checking..." : "Enter"}
            </button>
            <details className="pt-1">
              <summary className="cursor-pointer text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy text-center">
                Forgot the password?
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-[#0d1520]/60 border border-[#406080]/30 text-[#a0a0a0] text-xs font-fantasy leading-relaxed space-y-2">
                <p>There is no email reset, on purpose: the only way in is through the site's own settings.</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open the project in Vercel, then Settings, then Environment Variables.</li>
                  <li>Give ADMIN_PASSWORD a new value and save it.</li>
                  <li>Redeploy the latest deployment.</li>
                  <li>Sign in here with that new value. It replaces any password set from the site and signs out every other device.</li>
                </ol>
              </div>
            </details>
          </form>
        )}
      </div>
      <a
        href="/"
        className="mt-8 text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy transition-colors"
      >
        ⚔️ Return to Quest Board
      </a>
    </main>
  );
}
