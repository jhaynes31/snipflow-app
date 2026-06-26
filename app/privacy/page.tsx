import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - SnipFlow",
  description: "Read the Privacy Policy for SnipFlow. We take your data security seriously.",
};

export default function PrivacyPage() {
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
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-8"><ChevronLeft size={16} /> Back to Home</Link>
        <h1 className="text-4xl font-bold mb-2 text-primary">Privacy Policy</h1>
        <p className="text-foreground/60 text-sm mb-8">Last updated: June 25, 2026</p>
        <div className="space-y-8">
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">1. Information We Collect</h2><p className="text-foreground/80 leading-relaxed">We collect information you provide directly: email address for authentication, name (optional), and video content you upload for processing. We also collect usage data via PostHog analytics to improve our Service.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2><p className="text-foreground/80 leading-relaxed">Your information is used solely to: (a) provide and maintain the Service, (b) process payments via Stripe, (c) send transactional emails about your account and content packs, (d) improve our AI models and user experience. We do not sell your personal information to third parties.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">3. Video &amp; Content Data</h2><p className="text-foreground/80 leading-relaxed">Video files you upload are stored temporarily for AI processing. Once your content pack is generated, raw audio/video files are deleted. Generated content (transcripts, posts) is stored in your account for dashboard access. We never share your video content with third parties except as required for AI processing (Deepgram for transcription, Anthropic for content generation).</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">4. Payment Information</h2><p className="text-foreground/80 leading-relaxed">All payments are processed by Stripe, a PCI-compliant payment processor. We do not store or have access to your full payment card details. Stripe&apos;s privacy policy applies to payment data.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">5. Data Security</h2><p className="text-foreground/80 leading-relaxed">We implement industry-standard security measures including encryption in transit (TLS) and at rest, secure access controls, and regular security audits. However, no method of electronic storage is 100% secure.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">6. Data Retention</h2><p className="text-foreground/80 leading-relaxed">We retain your account information and generated content packs for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">7. Third-Party Services</h2><p className="text-foreground/80 leading-relaxed">We use the following third-party services: Stripe (payments), Convex (database), Vercel (hosting), PostHog (analytics), Anthropic (AI generation), Deepgram (transcription). Each service has its own privacy policy governing data handling.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">8. Your Rights</h2><p className="text-foreground/80 leading-relaxed">You have the right to access, correct, or delete your personal data at any time. You may export your data or request account deletion by emailing us. We will respond within 30 days.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">9. Cookies</h2><p className="text-foreground/80 leading-relaxed">We use essential cookies for authentication and session management. We use PostHog analytics cookies to understand usage patterns. You can disable analytics cookies in your browser settings.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2><p className="text-foreground/80 leading-relaxed">We may update this Privacy Policy. Material changes will be communicated via email to registered users.</p></section>
          <section><h2 className="text-2xl font-semibold text-foreground mb-3">11. Contact</h2><p className="text-foreground/80 leading-relaxed">Privacy questions? <a href="mailto:support@snipflow.com" className="text-primary hover:underline">support@snipflow.com</a></p></section>
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

