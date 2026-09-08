"use client";

import { useState } from "react";

interface QA {
  question: string;
  answer: string;
}

interface FAQCategory {
  category: string;
  items: QA[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    category: "Booking & Deposits",
    items: [
      {
        question: "How far in advance should I book?",
        answer:
          "We recommend booking as early as possible, especially around holidays when availability fills up fast. A deposit secures your dates.",
      },
      {
        question: "Is there a fee for meet & greets?",
        answer:
          "If you're within 19 miles of us, meet & greets are free. At 20 miles and beyond, there's a flat $75 fee. Between 20 and 29 miles, the fee stays at $75. Beyond that, the fee scales with distance, starting from $75 and adding $1.25 per mile round trip beyond 29 miles, capped at $110 no matter how far out you are within our service area. This covers our travel time, gas, and vehicle wear and tear. We also offer a free phone or video meet & greet as an alternative if you'd rather skip the in-person fee entirely.",
      },
      {
        question: "How much is the deposit?",
        answer:
          "It depends on how far out you book relative to your stay's start date. If you book more than 2 weeks before your stay begins, you'll pay a 50% deposit. That deposit stays fully refundable if you need to cancel, right up until you reach the 2 week mark before your stay. Once you're within 2 weeks of your stay start, the deposit becomes non refundable, since it's difficult to refill that slot on such short notice. If you book within 72 hours (3 days) of your stay start, full payment is required upfront and it is not refundable. Holiday bookings work differently. They require full payment at the time of booking, and that payment is non refundable, regardless of how far in advance you book.",
      },
      {
        question: "What if I need to cancel?",
        answer:
          "Refunds follow the policy above based on how far out you cancel. All holidays, and the full weekend they fall on, require full, non refundable payment at the time of booking, regardless of when you book. This includes New Year's Day, Memorial Day, July 4th, Labor Day, Thanksgiving, Easter weekend, and the Christmas period from December 24 through January 2.",
      },
      {
        question: "Why are the first and final days of my stay included in the price?",
        answer:
          "Your total covers the day we arrive at your home and the day we leave, not just the nights. Because we stay in your home, the time we spend caring for your pets on arrival and departure days is included too, whether that means an early morning start or staying until late on the final day. Arrivals before 3pm count as a full day, after 3pm as a half day. Departures after 3pm count as a full day, before 3pm as a half day.",
      },
    ],
  },
  {
    category: "Holidays",
    items: [
      {
        question: "Is there an extra charge for holidays?",
        answer:
          "Yes, a $15 per day surcharge applies during recognized holidays, added once per day regardless of how many pets you have.",
      },
      {
        question: "What counts as a holiday?",
        answer:
          "New Year's Day, Memorial Day, July 4th, Labor Day, Thanksgiving Day, Christmas Eve through January 2nd, and Easter weekend. If a holiday falls Thursday through Monday, the surcharge and policy apply for the whole weekend.",
      },
    ],
  },
  {
    category: "Pets & Care",
    items: [
      {
        question: "Do you care for multiple pets?",
        answer:
          "Yes! We happily care for multiple dogs, cats, and other pets in the same household. See our pricing page for additional pet rates.",
      },
      {
        question: "Can you administer medication?",
        answer:
          "Yes, we're experienced with medication administration for pets with routine or complex health needs.",
      },
      {
        question: "Do you care for puppies and kittens?",
        answer:
          "Yes, we love them! Puppies and kittens have their own rates since they typically need more frequent attention and supervision.",
      },
      {
        question: "What other pets can you care for?",
        answer:
          "Beyond dogs and cats, we also care for small animals, birds, and fish; see our pricing page for details.",
      },
    ],
  },
  {
    category: "Logistics",
    items: [
      {
        question: "How do I know my pet is doing okay while I'm away?",
        answer:
          "We send consistent updates, photos, and quick responses throughout your pet's stay so you always know how things are going.",
      },
      {
        question: "Will my home be clean when I get back?",
        answer:
          "Yes! We handle a full clean before we go, not just light tidying. We've all felt that exhausted feeling after a long trip, so we like to make sure your homecoming doesn't add to it.",
      },
      {
        question: "How many caregivers will be in my home?",
        answer:
          "Two! Jen and John both provide care, so your pet gets near around the clock companionship and double the love.",
      },
    ],
  },
  {
    category: "Referral Program",
    items: [
      {
        question: "How does the referral program work?",
        answer:
          "When you refer a friend and they complete a full booking with us, you get 10% off your next booking. There's no limit; you can refer as many friends as you'd like and bank one discounted booking per completed referral.",
      },
      {
        question: "Can I use more than one referral discount on a single booking?",
        answer:
          "No, only one referral discount can be applied per booking. If you've earned multiple discounts, you'll use them one at a time across future bookings.",
      },
    ],
  },
];

function FAQItem({
  qa,
  isOpen,
  onToggle,
}: {
  qa: QA;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-brand-cream/50 transition-colors"
      >
        <span className="font-sans text-base font-semibold text-brand-brown">
          {qa.question}
        </span>
        <span
          className={`text-brand-tan text-xl transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 font-sans text-sm text-brand-brown-light leading-relaxed">
          {qa.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  // Track which item is open using "categoryIndex-itemIndex" key
  const [openKey, setOpenKey] = useState<string | null>(null);

  const handleToggle = (key: string) => {
    setOpenKey(openKey === key ? null : key);
  };

  return (
    <section id="faq" className="py-14 px-6 bg-brand-cream">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-sans text-2xl sm:text-3xl font-semibold tracking-wide uppercase text-brand-brown mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-6">
          {FAQ_CATEGORIES.map((cat, ci) => (
            <div key={ci}>
              <h3 className="font-sans text-lg font-semibold text-brand-brown mb-3 border-b border-brand-tan/30 pb-1">
                {cat.category}
              </h3>
              <div className="space-y-3">
                {cat.items.map((qa, ii) => {
                  const key = `${ci}-${ii}`;
                  return (
                    <FAQItem
                      key={key}
                      qa={qa}
                      isOpen={openKey === key}
                      onToggle={() => handleToggle(key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
