import { useId, useState } from "react";
import { BEST_TIME_OPTIONS, GUILD_CONFIG, HEARD_ABOUT_OPTIONS, checkInterest, smsLink, type InterestInput } from "~/lib/guildConfig";
import { submitGuildInterest } from "~/server/guild";

/**
 * The Guild Hall interest form (recruiting spec, Section 5.3). Collects only
 * the fields in Rule 2.5. Email updates are opt-in and unchecked by default.
 * Styled in the flyer's palette: navy, gold, cream.
 */
const EMPTY: InterestInput = { name: "", email: "", phone: "", state: "", bestTime: "", heardAbout: "", note: "", confirmed18: false, emailConsent: false };

export default function InterestForm({ source = "interest_form", fitResult }: { source?: "interest_form" | "fit_quiz"; fitResult?: { guildClass: string; fitLevel: string } }) {
  const [form, setForm] = useState<InterestInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const set = <K extends keyof InterestInput>(k: K, v: InterestInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const check = checkInterest(form);
    setErrors(check.errors as Record<string, string>);
    if (!check.ok) return;
    setBusy(true);
    try {
      const res = await submitGuildInterest({ data: { ...check.clean, source, fitResult } });
      if (res.ok) setDone(true);
      else setErrors({ [res.field ?? "form"]: res.error ?? "Please check the form." });
    } catch {
      setErrors({ form: "Something went wrong on our end. Please try again, or text INTERVIEW." });
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full px-3 py-2.5 rounded-lg border border-[#1c3660]/30 bg-white text-[#1c2b3a] placeholder:text-[#8a94a6] focus:outline-none focus:border-[#c8a24b] focus:ring-2 focus:ring-[#c8a24b]/30 text-base";
  const label = "block text-sm font-semibold text-[#1c3660] mb-1";
  const err = (k: string) => errors[k] && <p role="alert" className="text-[#a33a2a] text-xs mt-1">{errors[k]}</p>;

  if (done) {
    return (
      <div className="rounded-xl border-2 border-[#2e7d4f]/40 bg-[#eef6ef] p-6 text-center" data-interest-done>
        <p className="text-[#1c3660] text-lg font-semibold">Thanks! John will reach out personally, usually by text or phone.</p>
        <p className="text-[#2a3442] mt-2">
          You can also text {GUILD_CONFIG.smsKeyword} to{" "}
          <a href={smsLink()} className="font-semibold text-[#1c3660] underline underline-offset-2">{GUILD_CONFIG.recruitPhone}</a> anytime.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2" data-interest-form>
      <div className="sm:col-span-2">
        <label htmlFor={id("name")} className={label}>Name *</label>
        <input id={id("name")} className={input} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={120} />
        {err("name")}
      </div>
      <div>
        <label htmlFor={id("email")} className={label}>Email</label>
        <input id={id("email")} type="email" inputMode="email" autoComplete="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} />
        {err("email")}
      </div>
      <div>
        <label htmlFor={id("phone")} className={label}>Phone</label>
        <input id={id("phone")} type="tel" inputMode="tel" autoComplete="tel" className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
        {err("phone")}
      </div>
      {errors.contact && <p role="alert" className="sm:col-span-2 text-[#a33a2a] text-sm -mt-2">{errors.contact}</p>}
      <div>
        <label htmlFor={id("state")} className={label}>State you live in</label>
        <input id={id("state")} className={input} value={form.state} onChange={(e) => set("state", e.target.value)} autoComplete="address-level1" maxLength={40} placeholder="e.g. Kansas" />
      </div>
      <div>
        <label htmlFor={id("time")} className={label}>Best time to talk</label>
        <select id={id("time")} className={input} value={form.bestTime} onChange={(e) => set("bestTime", e.target.value)}>
          <option value="">Pick one</option>
          {BEST_TIME_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("heard")} className={label}>How did you hear about us?</label>
        <select id={id("heard")} className={input} value={form.heardAbout} onChange={(e) => set("heardAbout", e.target.value)} data-heard-about>
          <option value="">Pick one</option>
          {HEARD_ABOUT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("note")} className={label}>Anything you want John to know? <span className="font-normal text-[#5c6675]">(optional)</span></label>
        <textarea id={id("note")} className={`${input} resize-none`} rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} maxLength={500} />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <label className="flex items-start gap-3 text-sm text-[#1c2b3a]">
          <input type="checkbox" checked={form.confirmed18} onChange={(e) => set("confirmed18", e.target.checked)} className="mt-1 accent-[#1c3660]" data-confirm-18 />
          <span>I'm 18 or older. *</span>
        </label>
        {err("confirmed18")}
        <label className="flex items-start gap-3 text-sm text-[#1c2b3a]">
          <input type="checkbox" checked={form.emailConsent} onChange={(e) => set("emailConsent", e.target.checked)} className="mt-1 accent-[#1c3660]" data-email-consent />
          <span>Send me updates about next steps by email.</span>
        </label>
      </div>
      {errors.form && <p role="alert" className="sm:col-span-2 text-[#a33a2a] text-sm">{errors.form}</p>}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="px-6 py-3 rounded-lg bg-[#1c3660] hover:bg-[#14294a] text-white font-semibold disabled:opacity-60" data-interest-submit>
          {busy ? "Sending…" : "Request an interview"}
        </button>
        <p className="text-xs text-[#5c6675]">Interviews are free, with no obligation.</p>
      </div>
    </form>
  );
}
