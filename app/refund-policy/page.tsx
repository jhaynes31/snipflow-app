import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy - SnipFlow",
  description:
    "SnipFlow offers a 14-day money-back guarantee on all purchases. Read our full refund policy.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-background">
        <Link className="flex items-center justify-center" href="/">
          <span className="text-2xl font-bold text-primary">SnipFlow</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link
            className="text-sm font-medium hover:text-primary transition-colors"
            href="/blog"
          >
            Blog
          </Link>
          <Link
            className="text-sm font-medium hover:text-primary transition-colors"
            href="/login"
          >
            Login
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-8"
        >
          <ChevronLeft size={16} />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2 text-primary">Refund Policy</h1>
        <p className="text-foreground/60 text-sm mb-8">Last updated: June 25, 2026</p>

        <div className="prose prose-invert prose-green max-w-none text-foreground/80 leading-relaxed space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              14-Day Money-Back Guarantee
            </h2>
            <p>
              We believe SnipFlow will save you hours of time and dramatically improve your social
              media content strategy. That&apos;s why we back every purchase with a simple,
              no-questions-asked refund policy.
            </p>
            <p className="mt-2">
              If you&apos;re not satisfied with SnipFlow for any reason, you can request a full
              refund within <strong>14 days</strong> of your purchase. We&apos;ll process your
              refund promptly — no hassle, no fine print.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Eligibility
            </h2>
            <p>To be eligible for a refund:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your refund request must be submitted within 14 days of the original purchase date.</li>
              <li>You must provide the email address used at checkout so we can verify your purchase.</li>
              <li>Refunds apply to both one-time ($49) and monthly ($19) subscription payments.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              How to Request a Refund
            </h2>
            <p>Simply email us at:</p>
            <p className="mt-2 font-medium">
              <a
                href="mailto:support@snipflow.com?subject=Refund%20Request"
                className="text-primary hover:underline"
              >
                support@snipflow.com
              </a>
            </p>
            <p className="mt-2">
              Include the subject line &ldquo;Refund Request&rdquo; and the email address you used
              during checkout. We&apos;ll process your refund within 3-5 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              What Happens After a Refund
            </h2>
            <p>
              Once your refund is processed:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your access to SnipFlow&apos;s download features will be revoked.</li>
              <li>
                Any content packs already generated and downloaded remain yours to use.
              </li>
              <li>
                For monthly subscriptions, the current billing period will be cancelled and you
                won&apos;t be charged again.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Questions?
            </h2>
            <p>
              If you have any questions about our refund policy, don&apos;t hesitate to reach out:
              <br />
              <a
                href="mailto:support@snipflow.com"
                className="text-primary hover:underline"
              >
                support@snipflow.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Back to SnipFlow
          </Link>
        </div>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border">
        <p className="text-xs text-foreground/60">
          © 2026 SnipFlow. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            className="text-xs hover:underline underline-offset-4"
            href="/refund-policy"
          >
            Refund Policy
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}