export default function WhyBookDirect() {
  return (
    <section className="bg-brand-brown text-brand-cream py-14 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-script text-2xl sm:text-3xl text-brand-tan mb-4">
          Skip the middleman.
        </p>
        <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-wide uppercase mb-4">
          Book Direct &amp; Save
        </h2>
        <p className="font-sans text-lg font-light leading-relaxed max-w-xl mx-auto">
          Some pet-sitting platforms charge clients booking fees ranging from{" "}
          <strong className="font-semibold">11% to 40%</strong>. Booking
          direct saves you those fees AND ensures 100% goes to your
          pets&rsquo; care.
        </p>

        {/* 3-column layout */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-3xl mb-3">🐾</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-2">
              No Service Fees
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80">
              Keep up to 40% in your pocket ,  every dollar goes to exceptional
              care for your pets and home.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-2">
              Direct Communication
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80">
              Talk straight to Jen &amp; John ,  no platform between you
              and your pets&rsquo; caregivers.
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-3">🏡</div>
            <h3 className="font-sans font-semibold tracking-wide text-sm uppercase mb-2">
              Personal Care
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80">
              A real relationship with caregivers who know your pets ,  not
              a transactional platform. We both work from home, so your
              pets enjoy close to 24/7 companionship.
            </p>
          </div>
        </div>

        {/* Perfect for section */}
        <div className="mt-10 pt-8 border-t border-brand-cream/15">
          <p className="font-script text-2xl text-brand-tan mb-4">
            Perfect for pets who need a little extra love.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-sans text-sm font-light text-brand-cream/80">
            <span>Senior pets</span>
            <span className="text-brand-cream/30">|</span>
            <span>Velcro animals</span>
            <span className="text-brand-cream/30">|</span>
            <span>Anxious companions</span>
            <span className="text-brand-cream/30">|</span>
            <span>Medication needs</span>
            <span className="text-brand-cream/30">|</span>
            <span>Any pet that deserves extra love</span>
          </div>
        </div>

        {/* Cleaning callout */}
        <div className="mt-8 pt-6 border-t border-brand-cream/15">
          <p className="font-sans text-base font-medium text-brand-cream tracking-wide">
            🧹 At the end of the stay, we clean the home ,  leaving it
            spotless for your return.
          </p>
        </div>
      </div>
    </section>
  );
}
