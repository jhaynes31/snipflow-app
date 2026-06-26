import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - SnipFlow",
  description: "Read the Terms of Service for SnipFlow.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-background">
        <Link className="flex items-center justify-center" href="/"><span className="text-2xl font-bold text-primary">SnipFlow</span></Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/blog">Blog</Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">Login</Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-8">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-2 text-primary">Terms of Service</h1>
        <p className="text-foreground/60 text-sm mb-8">Last updated: June 25, 2026</p>

        <div className="space-y-8">
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2><p className="text-foreground/80 leading-relaxed">By accessing or using SnipFlow (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not access or use the Service.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">2. Description of Service</h2><p className="text-foreground/80 leading-relaxed">SnipFlow is an AI-powered tool that transcribes video content, identifies engaging moments, and generates platform-optimized social media copy including LinkedIn posts, Twitter/X threads, TikTok captions, and LinkedIn Carousel scripts. The Service is provided "as is".</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">3. User Accounts</h2><p className="text-foreground/80 leading-relaxed">To access certain features, you must create an account. You agree to provide accurate information, maintain confidentiality of your login credentials, and accept responsibility for all activity under your account.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">4. Acceptable Use</h2><p className="text-foreground/80 leading-relaxed">You agree not to upload content you lack rights to, violate applicable laws, reverse-engineer the Service, access others&apos; accounts without authorization, or impair our infrastructure.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">5. Intellectual Property</h2><p className="text-foreground/80 leading-relaxed">The Service and its original features are owned by SnipFlow. AI-generated content outputs are owned by you. You are solely responsible for reviewing and editing AI-generated content before publication.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">6. Payment Terms</h2><p className="text-foreground/80 leading-relaxed">One-Time Purchase ($49): Lifetime access, no recurring charges. Monthly Subscription ($19/mo): Up to 5 content packs per month, auto-renews. Payments processed securely by Stripe. See our <a href="/refund-policy" className="text-primary hover:underline">Refund Policy</a> for details.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">7. Cancellation</h2><p className="text-foreground/80 leading-relaxed">Cancel your monthly subscription anytime. Access continues until end of billing period. Content packs remain accessible from your dashboard.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2><p className="text-foreground/80 leading-relaxed">SnipFlow shall not be liable for indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service or AI-generated content you publish.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">9. Disclaimer of Warranties</h2><p className="text-foreground/80 leading-relaxed">The Service is provided "as is" and "as available" without warranties of any kind. SnipFlow does not guarantee uninterrupted, secure, or error-free operation.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">10. Termination</h2><p className="text-foreground/80 leading-relaxed">We may terminate or suspend your account immediately for breach of these Terms.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">11. Changes</h2><p className="text-foreground/80 leading-relaxed">We may modify these Terms. Material changes will be communicated via email to registered users.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">12. Contact</h2><p className="text-foreground/80 leading-relaxed">Questions? <a href="mailto:support@snipflow.com" className="text-primary hover:underline">support@snipflow.com</a></p></section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">Back to SnipFlow</Link>
        </div>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-border">
        <p className="text-xs text-foreground/60">© 2026 SnipFlow. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="/refund-policy">Refund Policy</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/terms">Terms</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/privacy">Privacy</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="/#faq">FAQ</Link>
        </nav>
      </footer>
    </div>
  );
}
