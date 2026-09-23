import { formatMoney, INCLUDED_HOURS_PER_CYCLE, PRICES } from "@/convex/rules";

export function Pricing() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card" style={{ borderColor: "var(--accent)" }}>
        <p className="pill">Members</p>
        <p className="mt-2 text-3xl font-bold">
          {formatMoney(PRICES.membershipMonthly)}
          <span className="muted text-base font-normal"> / month</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>✓ {INCLUDED_HOURS_PER_CYCLE} hours a month — two full 4-hour sessions</li>
          <li>✓ Book early, from your member seats</li>
          <li>✓ Waitlist that fills itself when a seat opens</li>
          <li>
            ✓ Extra time: {formatMoney(PRICES.memberExtraHour)}/hr or {formatMoney(PRICES.memberExtraSession)} for a full extra
            session
          </li>
        </ul>
      </div>
      <div className="card">
        <p className="pill">Drop in</p>
        <p className="mt-2 text-3xl font-bold">
          {formatMoney(PRICES.dropInSession)}
          <span className="muted text-base font-normal"> / session</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>✓ No account needed</li>
          <li>✓ Or {formatMoney(PRICES.dropInHour)}/hr for just the work blocks you want</li>
          <li>✓ A few seats saved for drop-ins at every session</li>
        </ul>
      </div>
    </div>
  );
}
