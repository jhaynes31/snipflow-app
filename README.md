# SnipFlow 🚀

**Turn Your Webinar Into 30 Days of Content in 60 Seconds.**

SnipFlow is a micro-SaaS that uses AI to repurpose long-form videos (YouTube or MP4) into platform-optimized social media content for LinkedIn, X (Twitter), and TikTok.

## Core Features

- **AI Transcription**: High-accuracy transcription powered by Deepgram.
- **Intelligent Moment Identification**: Claude 3.5 Sonnet finds the 5 most engaging moments from your video.
- **Platform-Specific Generation**:
  - **LinkedIn**: Professional posts + 5-slide Carousel scripts.
  - **X (Twitter)**: Engaging 5-tweet threads.
  - **TikTok**: Punchy captions + trending hashtags.
- **One-Click Export**: Download all content as a neatly organized .zip pack.
- **Viral Loop**: Built-in referral program to earn free content packs.
- **Modern UI**: Dark-mode first, responsive design built with Tailwind CSS and Radix UI.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database & Auth**: [Convex](https://convex.dev/)
- **Payments**: [Stripe](https://stripe.com/)
- **AI Models**: 
  - [Claude 3.5 Sonnet](https://www.anthropic.com/) (Content Generation)
  - [Deepgram Nova-2](https://deepgram.com/) (Transcription)
- **Analytics**: [PostHog](https://posthog.com/)

## Environment Setup

Create a `.env.local` file with the following keys:

```bash
# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Stripe
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...

# AI APIs
ANTHROPIC_API_KEY=...
DEEPGRAM_API_KEY=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. In a separate terminal, start the Convex dev server:
   ```bash
   npx convex dev
   ```

## Referral Program

Users can invite others using a unique referral link found in their dashboard. 
- **Reward**: For every 3 qualified referrals (new users who process at least one video), the referrer receives:
  - **Monthly Subscribers**: +5 bonus content packs.
  - **Free/Guest Users**: Automatic upgrade to the **Lifetime Access** tier.

---
Built with ❤️ by the SnipFlow Team.
