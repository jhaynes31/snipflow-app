import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MIN_PASSWORD_LENGTH, changeAdminPassword, getAuthStatus } from "~/server/auth";

export const Route = createFileRoute("/_admin/admin/settings_/password")({
  loader: async () => getAuthStatus(),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const status = Route.useLoaderData();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    if (next.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await changeAdminPassword({ data: { current, next } });
      if (!res.ok) {
        setError(res.error || "Could not change the password.");
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-1 w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 disabled:opacity-50";

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}
    >
      <img src="/logo.png" alt="The Financial DM" className="h-20 sm:h-24 mx-auto mb-4 drop-shadow-lg" />
      <div className="w-full max-w-md rounded-xl border border-[#406080]/30 bg-[#111a28] p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>
            🔑 Change the Password
          </h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
            One password opens the lead dashboard and every forge. Changing it signs out every other device.
          </p>
        </div>

        <p className="text-[#606080] text-xs font-fantasy text-center">
          {status?.customPassword
            ? "The current password was set here on the site."
            : "The current password is the one set in Vercel (ADMIN_PASSWORD)."}
        </p>

        {done ? (
          <div className="space-y-3 text-center">
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-300 text-sm font-fantasy">
              ✅ Password changed. You are still signed in on this device.
            </div>
            <a href="/admin/leads" className="inline-block px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm transition-all">
              Back to the dashboard →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[#a0a0a0] text-xs font-fantasy">Current password</span>
              <input type={show ? "text" : "password"} autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-[#a0a0a0] text-xs font-fantasy">New password (at least {MIN_PASSWORD_LENGTH} characters)</span>
              <input type={show ? "text" : "password"} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="block">
              <span className="text-[#a0a0a0] text-xs font-fantasy">New password again</span>
              <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={submitting} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 text-[#a0a0a0] text-xs font-fantasy">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              Show passwords
            </label>
            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-fantasy">{error}</div>
            )}
            <button
              type="submit"
              disabled={submitting || !current || !next || !confirm}
              className="w-full px-4 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold font-fantasy transition-all"
            >
              {submitting ? "Saving..." : "Change Password"}
            </button>
          </form>
        )}

        <details>
          <summary className="cursor-pointer text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy text-center">
            What if I forget it?
          </summary>
          <p className="mt-2 text-[#a0a0a0] text-xs font-fantasy leading-relaxed">
            Set a new value for ADMIN_PASSWORD in Vercel (Settings, then Environment Variables), redeploy, and sign in with it. That replaces whatever was set here.
          </p>
        </details>
      </div>
      <a href="/admin/leads" className="mt-8 text-[#606080] hover:text-[#a0a0a0] text-xs font-fantasy transition-colors">
        ⚔️ Back to the Lead Dashboard
      </a>
    </main>
  );
}
