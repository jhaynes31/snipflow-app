import { useState, useCallback, useLayoutEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import Hero from "~/components/Hero";
import WhyFamiliesTrustUs from "~/components/WhyFamiliesTrustUs";
import AvailabilityCalendar from "~/components/AvailabilityCalendar";
import type { DateRangeSelection } from "~/components/AvailabilityCalendar";
import BookingForm from "~/components/BookingForm";
import ReviewsCarousel from "~/components/ReviewsCarousel";
import PetGallery from "~/components/PetGallery";
import ReferralProgram from "~/components/ReferralProgram";
import HolidayPolicy from "~/components/HolidayPolicy";
import FAQ from "~/components/FAQ";
import Footer from "~/components/Footer";

const getBusinessName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const cfg = JSON.parse(await readFile("site.json", "utf8")) as {
      businessName?: string;
    };
    return cfg.businessName?.trim() ?? "";
  } catch {
    return "";
  }
});

export const Route = createFileRoute("/")({
  loader: () => getBusinessName(),
  component: Home,
});

function Home() {
  const businessName = Route.useLoaderData();
  const [selectedRange, setSelectedRange] = useState<DateRangeSelection | undefined>();

  const handleDateRangeSelect = useCallback(
    (range: DateRangeSelection | undefined) => {
      setSelectedRange(range);
    },
    [],
  );

  // Deep-link support: when the page is opened with a hash (e.g. /#faq from
  // the "review our policies" link in our emails), scroll to that section so
  // clients land on the deposit/cancellation policy rather than the top.
  useLayoutEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }, []);

  return (
    <>
      <Hero />
      <WhyFamiliesTrustUs />
      <ReviewsCarousel />
      <PetGallery />
      <section className="py-12 px-6 bg-brand-cream">
        <div className="max-w-md mx-auto">
          <AvailabilityCalendar
            onDateRangeSelect={handleDateRangeSelect}
            selectedRange={selectedRange}
          />
        </div>
      </section>
      <BookingForm
        externalArrivalDate={selectedRange?.from}
        externalDepartureDate={selectedRange?.to}
      />
      <ReferralProgram />
      <HolidayPolicy />
      <FAQ />
      <Footer />
      {/* Hidden business name for SSR ,  avoids unused variable warning */}
      <span hidden>{businessName}</span>
    </>
  );
}
