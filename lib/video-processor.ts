import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Anthropic } from "@anthropic-ai/sdk";
import { DeepgramClient } from "@deepgram/sdk";

const execAsync = promisify(exec);

// Global queue to ensure sequential processing and avoid crashing the sandbox
let processingQueue: Promise<any> = Promise.resolve();

export async function processVideo(input: string, packId: string, options: { twitterOnly?: boolean } = {}) {
  // We wrap the entire function logic in the queue
  const task = async () => {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY || '' });
    
    const tmpDir = path.join(process.cwd(), 'tmp', packId);
    const isUrl = input.startsWith('http');
    
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    try {
      console.log(`Starting processing for ${input} (Pack: ${packId})`);
      
      // 1. Get audio
      const audioPath = path.join(tmpDir, 'audio.mp3');
      if (isUrl) {
        await execAsync(`yt-dlp -x --audio-format mp3 --force-overwrites -o "${audioPath}" "${input}"`);
      } else {
        await execAsync(`ffmpeg -i "${input}" -vn -ar 44100 -ac 2 -b:a 192k "${audioPath}" -y`);
      }
      console.log(`Audio extracted for ${packId}`);

      // 2. Transcribe
      let transcript = "";
      if (process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.startsWith('mock') && !process.env.DEEPGRAM_API_KEY.includes('PLACEHOLDER')) {
        const response = await deepgram.listen.v1.media.transcribeFile(
          fs.readFileSync(audioPath),
          {
            smart_format: true,
            model: "nova-2",
            language: "en-US",
          }
        );
        transcript = (response as any).results?.channels[0].alternatives[0].transcript || "";
      } else {
        console.log(`Using mock transcript for ${packId}`);
        transcript = "In this video we talk about how SnipFlow is the ultimate tool for B2B creators to repurpose their webinars into LinkedIn posts, Twitter threads, and TikTok captions. It's fast, efficient and powered by AI. Join 500+ creators today.";
      }

      // 3. Identify Moments & Generate Content
      let moments = [];
      if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('mock') && !process.env.ANTHROPIC_API_KEY.includes('PLACEHOLDER')) {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: `You are an expert social media manager. I will provide you with a transcript of a video. 
              Identify the 5 most engaging/quotable moments from the transcript.
              For each moment, generate:
              1. A LinkedIn post (150-200 words, professional yet engaging tone). ${options.twitterOnly ? " (Omit this if twitterOnly is true)" : ""}
              2. A Twitter/X thread (exactly 5 tweets).
              3. A TikTok caption (3 sentences and 5 relevant hashtags). ${options.twitterOnly ? " (Omit this if twitterOnly is true)" : ""}
              4. A LinkedIn Carousel Script (Exactly 5 slides. Slide 1: Hook, Slides 2-4: Key Points, Slide 5: CTA). ${options.twitterOnly ? " (Omit this if twitterOnly is true)" : ""}

              Format your response as a JSON array of objects. Each object should have:
              "timestamp": (estimate based on transcript),
              "description": (brief summary of the moment),
              "linkedinPost": "...", ${options.twitterOnly ? " (Set to empty string if omitted)" : ""}
              "twitterThread": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"],
              "tiktokCaption": "...", ${options.twitterOnly ? " (Set to empty string if omitted)" : ""}
              "linkedinCarousel": [{"slide": 1, "title": "...", "content": "..."}, ...] ${options.twitterOnly ? " (Set to empty array if omitted)" : ""}

              Transcript:
              ${transcript}`
            }
          ],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          moments = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse JSON from Claude response");
        }
      } else {
        console.log(`Using mock moments for ${packId}`);
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
            tiktokCaption: "Scale your content without scaling your effort. 📈 #growth #socialmedia #automation",
            linkedinCarousel: [
              { slide: 1, title: "Scale with AI", content: "Multi-channel presence is hard." },
              { slide: 2, title: "Burnout", content: "Most creators burn out trying to be everywhere." },
              { slide: 3, title: "The Solution", content: "Turn one video into many posts with SnipFlow." },
              { slide: 4, title: "Efficiency", content: "Save hours every week." },
              { slide: 5, title: "Action", content: "Start today." }
            ]
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
            tiktokCaption: "Mastering the LinkedIn feed has never been easier. 👔 #linkedin #personalbranding #tips",
            linkedinCarousel: [
              { slide: 1, title: "LinkedIn Mastery", content: "Tone matters." },
              { slide: 2, title: "Nuance", content: "LinkedIn isn't Twitter. AI knows the difference." },
              { slide: 3, title: "Insights", content: "Turn video insights into feed-friendly posts." },
              { slide: 4, title: "Branding", content: "Build your personal brand with ease." },
              { slide: 5, title: "Join", content: "snipflow.com" }
            ]
          },
          {
            timestamp: "06:00",
            description: "Twitter thread strategy",
            linkedinPost: "Threads are the engine of Twitter growth. But writing them is tedious. SnipFlow takes your webinar's core points and structures them into a compelling 5-tweet thread that keeps people scrolling and engaging.",
            twitterThread: [
              "Threads = Twitter Growth. 🧵",
              "But they take forever to write.",
              "SnipFlow does it for you in seconds.",
              "High value, perfectly structured, ready to post.",
              "Stop thinking, start tweeting."
            ],
            tiktokCaption: "Crush it on Twitter with zero effort. 🐦 #twittertips #threads #growthhacking",
            linkedinCarousel: [
              { slide: 1, title: "Twitter Threads", content: "Threads drive growth." },
              { slide: 2, title: "Tedious", content: "Writing them manually is slow." },
              { slide: 3, title: "Fast", content: "SnipFlow does it in seconds." },
              { slide: 4, title: "Structure", content: "Perfectly structured for engagement." },
              { slide: 5, title: "Post", content: "Start tweeting now." }
            ]
          },
          {
            timestamp: "08:20",
            description: "Short-form video hooks",
            linkedinPost: "TikTok and Reels are all about the hook. SnipFlow identifies the most quotable moments that work as standalone clips and provides the perfect captions and hashtags to ensure they get seen.",
            twitterThread: [
              "TikTok is all about the hook. 🎣",
              "SnipFlow finds your best 'hooks' automatically.",
              "Perfect for repurposing as TikToks or Reels.",
              "Get the caption and the hashtags in one go.",
              "Maximize your reach with minimum friction."
            ],
            tiktokCaption: "The secret to viral short-form content. 🤫 #tiktoktips #viral #videomarketing",
            linkedinCarousel: [
              { slide: 1, title: "Short Form Hooks", content: "Hooks are everything." },
              { slide: 2, title: "Identify", content: "Find the best moments for clips." },
              { slide: 3, title: "Captions", content: "AI writes the captions and hashtags." },
              { slide: 4, title: "Reach", content: "Maximize reach with zero friction." },
              { slide: 5, title: "Try", content: "Get SnipFlow today." }
            ]
          }
        ];

        if (options.twitterOnly) {
          moments = allMockMoments.map(m => ({
            timestamp: m.timestamp,
            description: m.description,
            linkedinPost: "",
            twitterThread: m.twitterThread,
            tiktokCaption: "",
            linkedinCarousel: []
          }));
        } else {
          moments = allMockMoments;
        }
      }
      console.log(`Moments generated for ${packId}`);

      // 4. Update Convex
      await convex.mutation(api.content.updateContentPack, {
        id: packId as any,
        status: "completed",
        moments: moments,
      });
      console.log(`Processing complete for ${packId}`);

    } catch (error) {
      console.error(`Processing failed for ${packId}`, error);
      await convex.mutation(api.content.updateContentPack, {
        id: packId as any,
        status: "failed",
      });
    } finally {
      // Clean up tmp directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`Failed to clean up ${tmpDir}`, e);
      }
    }
  };

  // Queue the task
  const nextInQueue = processingQueue.then(task);
  processingQueue = nextInQueue.catch(() => {}); // Continue queue even if one fails
  return nextInQueue;
}
