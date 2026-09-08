export default function Hero() {
  return (
    <section className="relative bg-brand-cream pt-8 pb-16 px-6 text-center">
      <div className="max-w-3xl mx-auto">
        {/* Real Logo PNG */}
        <img
          src="/logo.webp"
          alt="Jen & John's Pet Services"
          className="mx-auto h-auto max-w-[280px] sm:max-w-[340px] mb-6"
        />

        {/* Tagline in script font */}
        <p className="font-script text-3xl sm:text-4xl text-brand-tan mb-3">
          Constant care, loving presence, spotless homes.
        </p>

        {/* Secondary line */}
        <p className="font-sans text-lg text-brand-brown-light font-light max-w-xl mx-auto mb-4">
          Loving care where they&rsquo;re most comfortable ,  their home.
        </p>

        {/* Business name in tracked-out uppercase sans-serif */}
        <h1 className="font-sans text-3xl sm:text-4xl font-semibold text-brand-brown tracking-widest uppercase mb-6">
          Jen &amp; John&rsquo;s Pet Services
        </h1>

        {/* Service area */}
        <div className="mb-10">
          <p className="font-sans text-sm text-brand-tan tracking-wide font-medium">
            Servicing Maryland, West Virginia, &amp; Pennsylvania
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10">
          <a
            href="#booking"
            className="inline-block bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-8 py-4 rounded-lg hover:bg-brand-brown-light transition-colors shadow-md hover:shadow-lg"
          >
            Request a Stay
          </a>
        </div>
      </div>
    </section>
  );
}
