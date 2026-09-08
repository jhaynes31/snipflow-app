export default function WhyFamiliesTrustUs() {
  return (
    <section className="bg-brand-brown text-brand-cream py-14 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-wide uppercase mb-10">
          Why Families Trust Us
        </h2>

        {/* 3-column card layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Card 1: Close to 24/7 companionship */}
          <div className="text-center">
            <div className="text-4xl mb-4">🐾</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-3">
              Close to 24/7 Companionship
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80 leading-relaxed">
              We both work from home, so your pets are rarely alone. From
              morning snuggles to bedtime routines, they&rsquo;re part of our
              day ,  and we&rsquo;re part of theirs.
            </p>
          </div>

          {/* Card 2: Double the love */}
          <div className="text-center">
            <div className="text-4xl mb-4">💕</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-3">
              Double the Love
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80 leading-relaxed">
              Two caregivers means twice the attention, twice the play, and
              twice the affection. Your pets get the love of a whole family
              while you&rsquo;re away.
            </p>
          </div>

          {/* Card 3: A spotless home when you return */}
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-3">
              A Spotless Home When You Return
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80 leading-relaxed">
              We believe coming home should
              feel as good as leaving did. That&rsquo;s why we handle the full
              clean before we go, so there&rsquo;s no &ldquo;vacation from the
              vacation&rdquo; needed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
