export default function HolidayPolicy() {
  return (
    <section className="py-14 px-6 bg-brand-cream">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-wide uppercase text-brand-brown mb-8 text-center">
          Holiday Deposit Policy
        </h2>

        <div className="space-y-8">
          {/* Unified Holiday Policy */}
          <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 sm:p-8 border-l-4 border-l-red-400">
            <h3 className="font-sans text-lg font-semibold text-brand-brown mb-4">
              Holidays
            </h3>
            <p className="font-sans text-sm text-brand-brown-light leading-relaxed mb-4">
              All recognized holidays, and the full weekend they fall on, follow
              the same policy. This includes New Year&rsquo;s Day, Memorial Day,
              July 4th, Labor Day, Thanksgiving, Easter weekend, and the
              Christmas period from December 24 through January 2.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans text-sm text-brand-brown-light mb-4">
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> New Year&rsquo;s Day
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> Memorial Day
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> July 4th
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> Labor Day
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> Thanksgiving
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> Easter Weekend
              </li>
              <li className="flex items-center gap-2">
                <span className="text-brand-tan">•</span> Christmas Period
              </li>
            </ul>
            <p className="font-sans text-sm text-brand-brown-light leading-relaxed">
              Bookings for any of these, including the{" "}
              <strong className="text-brand-brown">
                Christmas period (December 24 through January 2)
              </strong>
              , require{" "}
              <strong className="text-brand-brown">
                full, non refundable payment
              </strong>{" "}
              at the time of booking to secure your dates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
