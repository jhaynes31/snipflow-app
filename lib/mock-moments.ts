export interface MockMoment {
  timestamp: string;
  description: string;
  linkedinPost: string;
  twitterThread: string[];
  tiktokCaption: string;
  linkedinCarousel: { slide: number; title: string; content: string }[];
}

export function getMockMoments(twitterOnly?: boolean): MockMoment[] {
  const allMockMoments: MockMoment[] = [
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
      timestamp: "01:30",
      description: "The challenge of content repurposing",
      linkedinPost: "Most creators lose 90% of their video content the moment the recording ends. I've been there too. Spending hours editing transcripts, trying to find quotable moments, reformatting for each platform... it's exhausting. That's why I built SnipFlow — to automate the boring parts so you can focus on creating. #CreatorEconomy #ContentStrategy",
      twitterThread: [
        "Most creators lose 90% of their content. 📉",
        "Hours spent editing transcripts by hand.",
        "Struggling to find quotable moments.",
        "Reformatting for every platform manually.",
        "SnipFlow does all this in 60 seconds. Try it!"
      ],
      tiktokCaption: "Stop losing 90% of your webinar content! 🎯 #contentmarketing #b2bmarketing #productivityhacks #aitools #webinar",
      linkedinCarousel: [
        { slide: 1, title: "The Problem", content: "90% of video content is never repurposed." },
        { slide: 2, title: "The Cost", content: "Hours wasted on manual editing and reformatting." },
        { slide: 3, title: "The Solution", content: "SnipFlow automates everything in 60 seconds." },
        { slide: 4, title: "The Result", content: "More content, less effort, better engagement." },
        { slide: 5, title: "CTA", content: "Start saving 5 hours/week at snipflow.com!" }
      ]
    },
    {
      timestamp: "03:45",
      description: "How SnipFlow works in 3 steps",
      linkedinPost: "Here's exactly how SnipFlow works: Step 1: Paste your YouTube link or upload a file. Step 2: Our AI transcribes and finds the top 5 moments in your video. Step 3: Get ready-to-post LinkedIn posts, Twitter threads, and TikTok captions — platform-optimized in seconds. No learning curve. No manual editing. Just content. 🚀 #SaaS #Productivity",
      twitterThread: [
        "How SnipFlow works — 3 simple steps 🧵",
        "Step 1: Paste a YouTube link or upload a file",
        "Step 2: AI transcribes & finds top 5 moments",
        "Step 3: Get ready-to-post content for LinkedIn, X & TikTok",
        "Simple. Fast. Effective. Try it: snipflow.com"
      ],
      tiktokCaption: "3 steps to turn any video into 30 days of content! ✨ #productivitytips #aitools #contentcreation #marketingtips #snipflow",
      linkedinCarousel: [
        { slide: 1, title: "Step 1", content: "Paste YouTube link or upload a video file" },
        { slide: 2, title: "Step 2", content: "AI transcribes and identifies top 5 moments" },
        { slide: 3, title: "Step 3", content: "Get LinkedIn, X, and TikTok content instantly" },
        { slide: 4, title: "Bonus", content: "Download everything as a content pack" },
        { slide: 5, title: "CTA", content: "Try SnipFlow free at snipflow.com!" }
      ]
    },
    {
      timestamp: "06:20",
      description: "Platform-specific optimization tips",
      linkedinPost: "Not all content works on all platforms. A LinkedIn post needs a professional tone with industry insights. X/Twitter threads need punchy, scannable tweets. TikTok captions need energy and hashtags. SnipFlow optimizes for each platform automatically — so your content resonates everywhere without extra effort. #SocialMediaStrategy #ContentTips",
      twitterThread: [
        "One video. Three platforms. Zero manual work. 🧵",
        "LinkedIn: Professional tone with industry insights",
        "X/Twitter: Punchy, scannable thread format",
        "TikTok: Energetic captions with trending hashtags",
        "SnipFlow optimizes for all three automatically."
      ],
      tiktokCaption: "Different platforms = different content! Here's how SnipFlow handles it 🎬 #socialmediamarketing #contentstrategy #aitools #b2bmarketing #growth",
      linkedinCarousel: [
        { slide: 1, title: "LinkedIn", content: "Professional tone, industry insights, carousel scripts" },
        { slide: 2, title: "X (Twitter)", content: "Punchy threads, scannable format, 5 tweets each" },
        { slide: 3, title: "TikTok", content: "Energetic captions with relevant hashtags" },
        { slide: 4, title: "All at Once", content: "One upload generates content for all platforms" },
        { slide: 5, title: "CTA", content: "Get your multi-platform content pack at snipflow.com" }
      ]
    },
    {
      timestamp: "09:45",
      description: "Call to action and pricing",
      linkedinPost: "The best time to start repurposing your content was yesterday. The second best time is now. SnipFlow's Founding Member offer gives you lifetime access for $49 — that's less than the cost of one hour of manual editing. Join 500+ B2B creators already saving 5 hours/week. Links in comments. ⬇️ #B2BMarketing #GrowthHacking",
      twitterThread: [
        "Ready to save 5 hours every week? 🕐",
        "Founding Member offer: $49 for lifetime access",
        "Less than one hour of manual editing",
        "Join 500+ B2B creators already saving time",
        "Start at snipflow.com 🚀"
      ],
      tiktokCaption: "Founding Member pricing ends soon! $49 lifetime access 🏃‍♂️ #entrepreneur #b2b #saas #productivity #earlybird",
      linkedinCarousel: [
        { slide: 1, title: "The Offer", content: "Founding Member — $49 lifetime access" },
        { slide: 2, title: "The Value", content: "Unlimited content packs, priority processing" },
        { slide: 3, title: "The Savings", content: "Less than 1 hour of manual editing time" },
        { slide: 4, title: "The Community", content: "Join 500+ B2B creators" },
        { slide: 5, title: "CTA", content: "Claim your founding member price at snipflow.com" }
      ]
    }
  ];

  if (twitterOnly) {
    return allMockMoments.map(m => ({
      timestamp: m.timestamp,
      description: m.description,
      linkedinPost: "",
      twitterThread: m.twitterThread,
      tiktokCaption: "",
      linkedinCarousel: []
    }));
  }
  return allMockMoments;
}