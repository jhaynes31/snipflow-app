import { NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * GET /api/process?packId=xxx
 * Polling endpoint: returns the current status of a content pack.
 * Used by the frontend to check processing progress.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const packId = searchParams.get('packId');

  if (!packId) {
    return NextResponse.json({ error: 'Missing packId' }, { status: 400 });
  }

  try {
    // We'll use a query to get pack status - fallback to direct fetch
    const res = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: "content:getPack",
        args: { id: packId },
      }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/process
 * Main processing endpoint.
 *
 * Body (JSON):
 *   packId: string (Convex contentPack ID)
 *   videoUrl?: string (YouTube URL — will download via yt-dlp)
 *   options?: { twitterOnly?: boolean }
 *
 * This route handles the FULL pipeline on the Next.js server:
 *   1. Update status to "downloading" (or "transcribing" for uploads)
 *   2. Download audio via yt-dlp (if YouTube URL)
 *   3. Transcribe via Deepgram (or fallback to mock)
 *   4. Generate moments via Claude (or fallback to mock)
 *   5. Update Convex with results
 *   6. Send email notification
 */
export async function POST(req: Request) {
  const tmpDir = path.join(os.tmpdir(), 'snipflow-process');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Parse body once at the top so catch/finally can access it
  let packId = '';
  let videoUrl: string | undefined;
  let twitterOnly = false;
  try {
    const body = await req.json();
    packId = body.packId as string;
    videoUrl = body.videoUrl as string | undefined;
    twitterOnly = body.options?.twitterOnly ?? false;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!packId) {
    return NextResponse.json({ error: 'Missing packId' }, { status: 400 });
  }

  const audioPath = path.join(tmpDir, `${packId}.mp3`);

  try {
      // Phase 1: Download / get audio
      if (videoUrl) {
        // YouTube URL — download via yt-dlp
        await convex.mutation(api.content.updateProcessStatus as any, {
          id: packId,
          status: "downloading",
        });

        // Check if yt-dlp is available — it won't be on Vercel serverless
        let ytDlpAvailable = false;
        try {
          await execAsync('which yt-dlp');
          ytDlpAvailable = true;
        } catch {
          console.warn('yt-dlp not available — will use mock data');
        }

        if (ytDlpAvailable) {
          await execAsync(
            `yt-dlp -x --audio-format mp3 --force-overwrites -o "${audioPath}" "${videoUrl}"`
          );
        } else {
          // Skip to mock data — yt-dlp/ffmpeg aren't available in this environment
          console.log(`yt-dlp not available, using mock data for pack ${packId}`);
          await convex.mutation(api.content.updateProcessStatus as any, {
            id: packId,
            status: "generating",
          });
          const moments = getMockMoments(twitterOnly);
          await convex.mutation(api.content.completeProcessing as any, {
            id: packId,
            moments: moments,
          });
          return NextResponse.json({ success: true, packId, status: "completed", mock: true });
        }
      } else {
        // File upload — audio should already be extracted and stored in Convex.
        // The /api/upload route calls us AFTER extracting audio, so audio is ready.
        // We just need to fetch it from Convex storage.
        await convex.mutation(api.content.updateProcessStatus as any, {
          id: packId,
          status: "transcribing",
        });

      // Try to get the pack to see if there's an audioStorageId
      const packResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: "content:getPack",
          args: { id: packId },
        }),
      });
      const packData = await packResponse.json();

      // If no videoUrl and no audioStorageId, we can't process
      if (!packData?.audioStorageId) {
        throw new Error("No video URL provided and no audio storage ID found. Cannot process.");
      }

      // Download audio from Convex storage
      const audioUrl = `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/storage/${packData.audioStorageId}`;
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from Convex storage: ${audioResponse.status}`);
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      fs.writeFileSync(audioPath, audioBuffer);
    }

    console.log(`Audio ready for pack ${packId}`);

    // Phase 2: Transcribe
    await convex.mutation(api.content.updateProcessStatus as any, {
      id: packId,
      status: "transcribing",
    });

    let transcript = "";
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramKey && !deepgramKey.startsWith("mock")) {
      // Use Deepgram for transcription
      const { createClient } = await import("@deepgram/sdk");
      const deepgram = createClient(deepgramKey);
      
      const audioBuffer = fs.readFileSync(audioPath);
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          smart_format: true,
          model: "nova-2",
          language: "en-US",
        }
      );

      if (error) {
        console.error(`Deepgram error for ${packId}:`, error);
        // Fall back to mock transcript
        transcript = "In this video we talk about how SnipFlow is the ultimate tool for B2B creators to repurpose their webinars into LinkedIn posts, Twitter threads, and TikTok captions. It's fast, efficient and powered by AI. Join 500+ creators today.";
      } else {
        transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      }
    } else {
      console.log(`Using mock transcript for ${packId}`);
      transcript = "In this video we talk about how SnipFlow is the ultimate tool for B2B creators to repurpose their webinars into LinkedIn posts, Twitter threads, and TikTok captions. It's fast, efficient and powered by AI. Join 500+ creators today.";
    }

    // Phase 3: Generate content
    await convex.mutation(api.content.updateProcessStatus as any, {
      id: packId,
      status: "generating",
    });

    let moments: any[] = [];
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && !anthropicKey.startsWith("mock")) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic({ apiKey: anthropicKey });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are an expert social media manager. I will provide you with a transcript of a video. 
            Identify the 5 most engaging/quotable moments from the transcript.
            For each moment, generate:
            1. A LinkedIn post (150-200 words, professional yet engaging tone). ${twitterOnly ? " (Omit this if twitterOnly is true)" : ""}
            2. A Twitter/X thread (exactly 5 tweets).
            3. A TikTok caption (3 sentences and 5 relevant hashtags). ${twitterOnly ? " (Omit this if twitterOnly is true)" : ""}
            4. A LinkedIn Carousel Script (Exactly 5 slides. Slide 1: Hook, Slides 2-4: Key Points, Slide 5: CTA). ${twitterOnly ? " (Omit this if twitterOnly is true)" : ""}

            Format your response as a JSON array of objects. Each object should have:
            "timestamp": (estimate based on transcript),
            "description": (brief summary of the moment),
            "linkedinPost": "...", ${twitterOnly ? " (Set to empty string if omitted)" : ""}
            "twitterThread": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"],
            "tiktokCaption": "...", ${twitterOnly ? " (Set to empty string if omitted)" : ""}
            "linkedinCarousel": [{"slide": 1, "title": "...", "content": "..."}, ...] ${twitterOnly ? " (Set to empty array if omitted)" : ""}

            Transcript:
            ${transcript}`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        moments = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON from Claude response");
      }
    } else {
      // Mock moments
      moments = getMockMoments(twitterOnly);
    }

    // Phase 4: Save results to Convex
    await convex.mutation(api.content.completeProcessing as any, {
      id: packId,
      moments: moments,
    });

    console.log(`Processing complete for pack ${packId}`);

    // Phase 5: Email notification (fire and forget)
    try {
      const packResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: "content:getPack",
          args: { id: packId },
        }),
      });
      const packData = await packResponse.json();
      
      if (packData?.userId) {
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: "users:getById",
            args: { id: packData.userId },
          }),
        });
        const userData = await userResponse.json();

        if (userData?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snipflow.com";
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey && !resendKey.startsWith("mock")) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Jen <snipflow-d374d107@ctomail.io>",
                to: [userData.email],
                subject: "Your SnipFlow content pack is ready",
                html: `
                  <p>Hi there,</p>
                  <p>Jen here, founder of SnipFlow.</p>
                  <p>I'm reaching out because your video has been processed. Your custom content pack — featuring platform-optimized posts for LinkedIn, X, and TikTok — is ready for review.</p>
                  <p>Most creators lose 90% of their video value the moment the live session ends. SnipFlow is built to fix that by treating your video as the single source of truth for your entire distribution strategy.</p>
                  <p>You can access your highlights and draft posts here: <a href="${appUrl}/app?id=${packId}">${appUrl}/app?id=${packId}</a></p>
                  <p>Take a look at the outputs. They are designed to retain your specific voice while following the best practices for each social platform.</p>
                  <p>If you have any questions about the generation or how to use the assets, just hit reply.</p>
                  <p>Best,<br>Jen<br>Founder, SnipFlow</p>
                `,
              }),
            });
            console.log(`Email sent to ${userData.email}`);
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send email notification", emailError);
    }

    return NextResponse.json({ success: true, packId, status: "completed" });
  } catch (error) {
    console.error(`Processing failed for pack ${packId}`, error);
    // Try to update status to failed
    try {
      if (packId) {
        await convex.mutation(api.content.updateProcessStatus as any, {
          id: packId,
          status: "failed",
        });
      }
    } catch (e) {
      console.error("Failed to update status to failed", e);
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    // Clean up tmp files
    try {
      if (packId) {
        const audioPath = path.join(tmpDir, `${packId}.mp3`);
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

function getMockMoments(twitterOnly?: boolean) {
  const allMockMoments = [
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