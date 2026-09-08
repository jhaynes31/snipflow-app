export default function Footer() {
  return (
    <footer className="bg-brand-brown text-brand-cream py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* Service Area */}
          <div>
            <h3 className="font-sans text-sm font-semibold tracking-widest uppercase mb-4">
              Service Area
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80">
              Proudly serving Maryland, West Virginia &amp; Pennsylvania within a
              50 mile radius of our home base in Bruceton Mills, WV.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-sans text-sm font-semibold tracking-widest uppercase mb-4">
              Contact
            </h3>
            <p className="font-sans text-sm font-light text-brand-cream/80">
              Jen &amp; John
            </p>
            <p className="font-sans text-sm font-light text-brand-cream/80 mt-1">
              Call or text:{" "}
              <a
                href="tel:304-441-7592"
                className="hover:text-brand-tan transition-colors"
              >
                304-441-7592
              </a>
            </p>
            <p className="font-sans text-sm font-light text-brand-cream/80 mt-1">
              <a
                href="mailto:jen.johnpetservices@proton.me"
                className="hover:text-brand-tan transition-colors"
              >
                jen.johnpetservices@proton.me
              </a>
            </p>
          </div>

          {/* Brand */}
          <div>
            <h3 className="font-sans text-sm font-semibold tracking-widest uppercase mb-4">
              Jen &amp; John
            </h3>
            {/* Polaroid photo — replace /about-photo.webp with your image */}
            <div className="inline-block bg-white p-2 pb-6 shadow-md rotate-1 rounded-sm mb-3">
              <div className="w-28 h-28 bg-brand-tan/20 rounded-sm flex items-center justify-center overflow-hidden">
                <img
                  src="/about-photo.webp"
                  alt="Jen &amp; John"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<span class="text-brand-tan text-xs">📷</span>';
                  }}
                />
              </div>
            </div>
            <p className="font-script text-xl text-brand-tan leading-relaxed">
              Constant care, loving presence, spotless homes.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-brand-cream/20 text-center">
          <div className="flex items-center justify-center gap-5 mb-4">
            <a
              href="https://www.facebook.com/profile.php?id=61593502117126"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Jen &amp; John's Pet Services on Facebook"
              className="w-10 h-10 rounded-full border border-brand-cream/25 flex items-center justify-center text-brand-cream/80 hover:text-brand-tan hover:border-brand-tan transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://nextdoor.com/page/jen-johns-pet-services/?share_action_id=5681d0fa-d27e-4e8a-b0e1-1b04e87306c7"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Jen &amp; John's Pet Services on Nextdoor"
              className="w-10 h-10 rounded-full border border-brand-cream/25 flex items-center justify-center text-brand-cream/80 hover:text-brand-tan hover:border-brand-tan transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.4 L17.2 7 V4.6 H19.4 V8 L21 10.4 H17.6 V21.6 H6.4 V10.4 H3 Z M12 6.6 L14.6 12 H12.8 L15.4 16.6 H13 L16 21 H8 L11 16.6 H8.6 L11.2 12 H9.4 Z"
                />
              </svg>
            </a>
            <a
              href="https://www.google.com/maps/place/Jen+%26+John's+Pet+Services/@39.6079183,-80.2216053,9z/data=!3m1!4b1!4m6!3m5!1s0x23013d5cc013cc09:0x98b5eda4f3b6f883!8m2!3d39.609782!4d-79.5622075!16s%2Fg%2F11zh70fvfw?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Jen &amp; John's Pet Services on Google"
              className="w-10 h-10 rounded-full border border-brand-cream/25 flex items-center justify-center text-brand-cream/80 hover:text-brand-tan hover:border-brand-tan transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
              </svg>
            </a>
          </div>
          <p className="font-sans text-xs text-brand-cream/50 tracking-wide">
            &copy; {new Date().getFullYear()} Jen &amp; John Pet
            Services. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
