'use client'

import Link from "next/link";
import { CheckCircle, ArrowRight, Video } from "lucide-react";
import posthog from 'posthog-js'
import { FAQSection } from "@/components/FAQSection";

export default function Home() {
  const trackCta = (ctaName: string) => {
    posthog.capture('cta_clicked', { cta_name: ctaName });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center text-center px-4">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Turn Your Webinar Into <span className="text-primary">30 Days of Content</span> in 60 Seconds.
                </h1>
                <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                  Paste a YouTube link or upload a video — SnipFlow&apos;s AI finds the best moments and writes ready-to-post LinkedIn posts, Twitter threads, and TikTok captions for you.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/app"
                  onClick={() => trackCta('hero_get_started')}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Get Started — from $19/mo
                </Link>
                <Link
                  href="/demo"
                  onClick={() => trackCta('hero_see_sample')}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-primary text-primary px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  See Sample Output →
                </Link>
              </div>
              <p className="text-sm text-foreground/60">
                 Join 500+ B2B creators already saving 5 hours/week.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 bg-primary/5 border-y border-primary/10">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <p className="text-lg md:text-xl italic font-medium max-w-3xl">
                &quot;SnipFlow turned our last webinar into 2 weeks of LinkedIn posts in under a minute. The tone was spot on.&quot;
              </p>
              <p className="text-sm text-foreground/60">
                — Mark D., Demand Gen Lead
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full border border-border">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">No manual editing</h3>
                <p className="text-foreground/70">
                  No more manual editing or reformatting. Our AI identifies the most engaging moments automatically.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full border border-border">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Platform-optimized copy</h3>
                <p className="text-foreground/70">
                  Platform-optimized copy for LinkedIn, X, and TikTok. Get professional posts tailored for each platform.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-4 bg-background rounded-full border border-border">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">One-click download</h3>
                <p className="text-foreground/70">
                  Download everything as a content pack in one click. Ready to publish immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 border-t border-border">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-center mb-12">Simple Pricing</h2>
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <div className="flex flex-col p-6 bg-card border border-border rounded-xl shadow-lg relative overflow-hidden">
                <h3 className="text-2xl font-bold mb-2">Pro Monthly</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-foreground/60">/month</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">5 Content Packs per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">LinkedIn, X, and TikTok output</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Full Dashboard access</span>
                  </li>
                </ul>
                <Link href="/app" className="w-full">
                   <button 
                    onClick={() => trackCta('pricing_subscribe_monthly')}
                    className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-lg font-bold hover:bg-primary/20 transition-colors"
                   >
                      Subscribe Monthly
                   </button>
                </Link>
              </div>

              <div className="flex flex-col p-6 bg-background border-2 border-primary rounded-xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider">
                  Best Value
                </div>
                <h3 className="text-2xl font-bold mb-2">Lifetime Access</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-foreground/60">one-time</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Unlimited Content Packs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Priority AI processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm">Never pay again</span>
                  </li>
                </ul>
                <Link href="/app" className="w-full">
                   <button 
                    onClick={() => trackCta('pricing_lifetime_buy')}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
                   >
                      Buy Once, Own Forever
                   </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FAQSection />

        <section className="w-full py-12 md:py-24 lg:py-32 border-t border-border">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Ready to automate your content?</h2>
              <p className="mx-auto max-w-[600px] text-foreground/70 md:text-xl">
                Get started today and turn your next webinar into a month of social media presence.
              </p>
              <Link
                href="/app"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Get Started Now
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border">
        <p className="text-xs text-foreground/60">© 2026 SnipFlow. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/refund-policy">
            Refund Policy
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/#faq">
            FAQ
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
