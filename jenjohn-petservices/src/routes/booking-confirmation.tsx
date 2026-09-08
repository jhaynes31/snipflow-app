import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/booking-confirmation")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" ? search.name : undefined,
  }),
  component: BookingConfirmation,
});

function BookingConfirmation() {
  const { name } = Route.useSearch();

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-8 sm:p-12">
          {/* Paw / heart seal */}
          <div className="text-5xl mb-4" aria-hidden="true">
            🐾
          </div>

          <h1 className="font-script text-5xl sm:text-6xl text-brand-brown leading-tight mb-4">
            {name ? `Thank you, ${name}!` : "Thank you!"}
          </h1>

          <p className="font-sans text-brand-brown-light leading-relaxed mb-3">
            Your booking request has been received. Jen &amp; John will review
            it and be in touch shortly to confirm availability and next steps.
          </p>
          <p className="font-sans text-sm text-brand-tan mb-8">
            No need to do anything else — sit tight, and we&rsquo;ll take it
            from here.
          </p>

          {/* Contact info */}
          <div className="border-t border-brand-tan/20 pt-6 mb-8">
            <p className="font-sans text-xs font-semibold tracking-widest uppercase text-brand-brown mb-3">
              Questions? Reach us anytime
            </p>
            <p className="font-sans text-sm text-brand-brown-light">
              <a
                href="mailto:jen.johnpetservices@proton.me"
                className="text-brand-tan hover:text-brand-brown transition-colors"
              >
                jen.johnpetservices@proton.me
              </a>
            </p>
            <p className="font-sans text-sm text-brand-brown-light mt-2">
              Call or text:{" "}
              <a
                href="tel:304-441-7592"
                className="text-brand-tan hover:text-brand-brown transition-colors"
              >
                304-441-7592
              </a>
            </p>
          </div>

          <a
            href="/"
            className="inline-block bg-brand-brown text-brand-cream font-sans font-semibold tracking-wide uppercase py-3 px-8 rounded-lg hover:bg-brand-brown-light transition-colors"
          >
            Back to Home
          </a>
        </div>

        <p className="font-script text-2xl text-brand-tan mt-6">
          Constant care, loving presence, spotless homes.
        </p>
      </div>
    </main>
  );
}
