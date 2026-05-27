import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Header } from "@/components/Header";
import { CSPostHogProvider } from "@/components/PostHogProvider";
import { Suspense } from 'react';
import PostHogPageView from "@/components/PostHogPageView";
import { ReferralTracker } from "@/components/ReferralTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnipFlow - Turn Your Webinar Into 30 Days of Content",
  description: "Paste a YouTube link or upload a video — SnipFlow's AI finds the best moments and writes ready-to-post LinkedIn posts, Twitter threads, and TikTok captions for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ConvexClientProvider>
          <CSPostHogProvider>
            <Suspense fallback={null}>
              <PostHogPageView />
            </Suspense>
            <Suspense fallback={null}>
              <ReferralTracker />
            </Suspense>
            <Header />
            <main className="flex-1">{children}</main>
          </CSPostHogProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
