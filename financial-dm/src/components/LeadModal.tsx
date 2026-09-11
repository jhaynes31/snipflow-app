import { useEffect, useId, useRef, useState } from "react";
import { checkEmail, checkName, checkPhone } from "~/lib/contactValidation";
import { FOUND_VIA_OPTIONS } from "~/lib/attribution";

/** What a submit handler may hand back: nothing on success, or a rejection. */
export type LeadSubmitOutcome = void | { error: string; field?: "name" | "email" | "phone" };

interface LeadModalProps {
  isOpen: boolean;
  /**
   * Called with the cleaned values. Return (or resolve to) a rejection to keep
   * the dialog open and show the message; return nothing when the lead is in.
   */
  onSubmit: (name: string, email: string, phone: string, foundVia: string) => LeadSubmitOutcome | Promise<LeadSubmitOutcome>;
  onClose: () => void;
}

/**
 * The lead capture form shown at the end of both quizzes. Rendered as a real
 * dialog: labelled fields, focus moves into it when it opens, Escape closes
 * it, and the page behind it stops scrolling while it is up.
 */
export default function LeadModal({ isOpen, onSubmit, onClose }: LeadModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // "Where did you find John?" Optional, never scored (Quest Board spec, Section 8.3).
  const [foundVia, setFoundVia] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const ids = {
    title: `${uid}-title`,
    name: `${uid}-name`,
    email: `${uid}-email`,
    phone: `${uid}-phone`,
    foundVia: `${uid}-found-via`,
  };

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => nameRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // The same checks the server runs, so nearly every problem is caught before
  // the request leaves the browser. The server has the final say.
  const validate = () => {
    const e: Record<string, string> = {};
    const n = checkName(name);
    const m = checkEmail(email);
    const p = checkPhone(phone);
    if (!n.ok) e.name = n.message ?? "Please enter your name.";
    if (!m.ok) e.email = m.message ?? "Please enter a real email.";
    if (!p.ok) e.phone = p.message ?? "Please enter a real phone number.";
    setErrors(e);
    setSuggestion(m.ok ? null : (m.suggestion ?? null));
    if (Object.keys(e).length) return null;
    return { name: n.value!, email: m.value!, phone: p.value! };
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    const clean = validate();
    if (!clean) return;
    setSubmitting(true);
    try {
      const outcome = await onSubmit(clean.name, clean.email, clean.phone, foundVia);
      if (outcome && outcome.error) {
        setErrors({ [outcome.field ?? "form"]: outcome.error });
      }
    } catch (err) {
      console.error("[lead] submit threw:", err);
      setErrors({ form: "Something went wrong on our end. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setEmail(suggestion);
    setSuggestion(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.email;
      return next;
    });
  };

  // text-base on the inputs keeps iOS Safari from zooming the page on focus.
  const inputClass =
    "w-full px-3 py-2.5 rounded-lg bg-[#204060]/20 border border-[#406080]/50 text-[#e0e0e0] placeholder:text-[#406080] focus:outline-none focus:border-[#c08020] focus:ring-1 focus:ring-[#c08020]/30 transition-all text-base sm:text-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8, 14, 22, 0.85)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        className="w-full max-w-sm rounded-xl border-2 border-[#406080]/50 shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0d1520 0%, #111a28 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 text-center border-b border-[#406080]/40"
          style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}
        >
          <h3 id={ids.title} className="text-lg font-fantasy text-[#c08020]">
            Summon Thy DM
          </h3>
          <p className="text-xs text-[#a0a0a0] mt-1">
            Enter thy details to book a council with John
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4" noValidate>
          <div>
            <label htmlFor={ids.name} className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Name *
            </label>
            <input
              id={ids.name}
              ref={nameRef}
              type="text"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thy name, adventurer"
              aria-invalid={Boolean(errors.name)}
              className={inputClass}
            />
            {errors.name && (
              <p role="alert" className="text-red-400 text-xs mt-1 font-fantasy">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.email} className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Email *
            </label>
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="thy@email.com"
              aria-invalid={Boolean(errors.email)}
              className={inputClass}
            />
            {errors.email && (
              <p role="alert" className="text-red-400 text-xs mt-1 font-fantasy">
                {errors.email}
                {suggestion && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="underline text-[#c08020] hover:text-[#e0a030]"
                    >
                      Yes, fix it
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.phone} className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Phone *
            </label>
            <input
              id={ids.phone}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(415) 123 4567"
              aria-invalid={Boolean(errors.phone)}
              className={inputClass}
            />
            {errors.phone && (
              <p role="alert" className="text-red-400 text-xs mt-1 font-fantasy">
                {errors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.foundVia} className="block text-sm font-fantasy text-[#a0a0a0] mb-1">
              Where did you find John? <span className="text-[#606080]">(optional)</span>
            </label>
            <select
              id={ids.foundVia}
              value={foundVia}
              onChange={(e) => setFoundVia(e.target.value)}
              className={`${inputClass} cursor-pointer`}
              style={{ background: "rgba(32, 64, 96, 0.2)" }}
              data-found-via
            >
              <option value="" className="bg-gray-900">Pick one, if you like</option>
              {FOUND_VIA_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} className="bg-gray-900 text-[#e0e0e0]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {errors.form && (
            <p role="alert" className="text-red-400 text-xs font-fantasy text-center">
              {errors.form}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#406080]/50 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#406080]/60 transition-all font-fantasy text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:opacity-60 disabled:cursor-wait text-[#0d1520] font-bold shadow-lg shadow-[#c08020]/20 transition-all font-fantasy text-sm"
            >
              {submitting ? "Checking…" : "Roll for Initiative!"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
