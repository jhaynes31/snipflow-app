"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Video } from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import posthog from "posthog-js";

const MOCK_MOMENTS = [
  {
    timestamp: "00:15",
    description: "Introduction to content repurposing",
    linkedinPost: "Stop wasting time on manual editing! I just learned how to turn one webinar into a month of content. SnipFlow finds the best moments and writes the posts for me. It's a game changer for B2B creators. #SnipFlow #ContentMarketing #AI",
    twitterThread: [
      "Stop wasting time on manual editing! 🧵",
      "Turn one webinar into a month of content with SnipFlow.",
      "Our AI finds the best moments automatically.",
      "Get platform-optimized copy for LinkedIn, X, and TikTok.",
      "Try it today at snipflow.com!"
    ],
    tiktokCaption: "Turn your webinars into 30 days of content! 🚀 #marketing #ai #productivity #b2b #contentcreator",
    linkedinCarousel: [
    { slide: 1, title: "Hook", content: "Stop wasting time on manual editing!" },
    { slide: 2, title: "Problem", content: "Webinars are goldmines, but they take hours to repurpose." },
    { slide: 3, title: "Solution", content: "SnipFlow finds the best moments automatically." },
    { slide: 4, title: "Benefit", content: "Get platform-optimized copy for all channels." },
    { slide: 5, title: "CTA", content: "Try it today at snipflow.com!" }
    ]
  },
  {
    timestamp: "02:30",
    description: "The power of multi-channel presence",
    linkedinPost: "Being everywhere at once is the dream, but the reality is usually burnout. SnipFlow changed that for me. One video becomes a week of high-quality presence across LinkedIn, X, and TikTok. Focus on your expertise, let AI handle the distribution.",
    twitterThread: [
      "Multi-channel doesn't have to mean burnout. 🕊️",
      "SnipFlow turns one video into many posts.",
      "Same message, optimized for each platform.",
      "Save hours of work every single week.",
      "This is the future of content creation."
    ],
    tiktokCaption: "Scale your content without scaling your effort. 📈 #growth #socialmedia #automation"
  },
  {
    timestamp: "04:15",
    description: "Optimizing for LinkedIn",
    linkedinPost: "LinkedIn requires a specific tone—professional yet personal. SnipFlow's AI understands this nuance. It doesn't just copy-paste; it reformats your insights into a post that actually performs in the feed.",
    twitterThread: [
      "LinkedIn is a different beast. 🦁",
      "You can't just cross-post blindly.",
      "SnipFlow writes specific copy for LinkedIn's audience.",
      "Professional, insightful, and feed-friendly.",
      "The easiest way to build your personal brand."
    ],
    tiktokCaption: "Mastering the LinkedIn feed has never been easier. 👔 #linkedin #personalbranding #tips"
  }
];

export default function DemoPage() {
  const handleDownloadDemo = async () => {
    const zip = new JSZip();
    
    MOCK_MOMENTS.forEach((moment, i) => {
      const folder = zip.folder(`Moment-${i + 1}`);
      folder?.file("linkedin.txt", moment.linkedinPost);
      folder?.file("twitter.txt", moment.twitterThread.join("\n\n"));
      folder?.file("tiktok.txt", moment.tiktokCaption);
      if (moment.linkedinCarousel) {
      const carouselText = moment.linkedinCarousel.map(s => `Slide ${s.slide} (${s.title}): ${s.content}`).join("\n\n");
      folder?.file("linkedin-carousel.txt", carouselText);
      }
      });

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `snipflow-demo-content-pack.zip`;
    link.click();
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">SnipFlow Demo</h1>
            <p className="text-foreground/70">This is a sample output generated from a 45-minute webinar.</p>
          </div>
          <Link href="/app?from=demo">
            <Button onClick={() => posthog.capture('demo_to_app', { position: 'top' })} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Video className="mr-2 h-4 w-4" />
              Try with your video
            </Button>
          </Link>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-center gap-3 text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-medium">Experience the power of SnipFlow. These posts were written by AI in seconds.</p>
        </div>

        <div className="grid gap-6">
          {MOCK_MOMENTS.map((moment, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Moment {i + 1}: {moment.timestamp}</CardTitle>
                <CardDescription>{moment.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">LinkedIn Post</h4>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap p-3 bg-background rounded border border-border">{moment.linkedinPost}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">Twitter Thread</h4>
                  <div className="space-y-2">
                    {moment.twitterThread.map((tweet, j) => (
                      <p key={j} className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">
                        {j + 1}/ {tweet}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">TikTok Caption</h4>
                  <p className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">{moment.tiktokCaption}</p>
                </div>
                {moment.linkedinCarousel && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-1">LinkedIn Carousel Script</h4>
                  <div className="space-y-2">
                    {moment.linkedinCarousel.map((slide, j) => (
                      <div key={j} className="text-sm text-foreground/80 p-3 bg-background rounded border border-border">
                        <span className="font-bold">Slide {slide.slide} ({slide.title}):</span> {slide.content}
                      </div>
                    ))}
                  </div>
                </div>
                )}
                </CardContent>
              </Card>
            ))}
        </div>

        <div className="flex flex-col items-center gap-4 pt-6 border-t border-border">
            <h3 className="text-xl font-bold text-center">Ready to unlock your own content?</h3>
            <p className="text-foreground/60 text-center max-w-lg">
                Stop leaving money on the table. Turn your next webinar into a month of social media presence with SnipFlow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={handleDownloadDemo} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    <Download className="mr-2 h-5 w-5" />
                    Download Sample ZIP
                </Button>
                <Link href="/app?from=demo">
                    <Button onClick={() => posthog.capture('demo_to_app', { position: 'bottom' })} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Get Started — from $19/mo
                    </Button>
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
