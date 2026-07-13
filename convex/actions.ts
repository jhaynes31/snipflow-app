"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { Anthropic } from "@anthropic-ai/sdk";
import { DeepgramClient } from "@deepgram/sdk";

const execAsync = promisify(exec);

export const processVideo = action({
  args: {
    input: v.optional(v.string()), // YouTube URL
    audioStorageId: v.optional(v.string()), // Convex Storage ID
    packId: v.id("contentPacks"),
    options: v.object({
      twitterOnly: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const { input, audioStorageId, packId, options } = args;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });
    const deepgram = new DeepgramClient({
      apiKey: process.env.DEEPGRAM_API_KEY || "",
    });

    const tmpDir = path.join(os.tmpdir(), "snipflow", packId);
    
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    try {
      console.log(`Starting processing for Pack: ${packId}`);
      
      const audioPath = path.join(tmpDir, "audio.mp3");

      if (input) {
          await ctx.runMutation(internal.content.updateStatus, {
            id: packId,
            status: "downloading",
          });

          // 1. Get audio from URL
          await execAsync(
            `yt-dlp -x --audio-format mp3 --force-overwrites -o "${audioPath}" "${input}"`
          );
      } else if (audioStorageId) {
          await ctx.runMutation(internal.content.updateStatus, {
            id: packId,
            status: "downloading",
          });

          // 1. Get audio from Storage
          const audioBlob = await ctx.storage.get(audioStorageId);
          if (!audioBlob) throw new Error("Audio not found in storage");
          
          const buffer = Buffer.from(await audioBlob.arrayBuffer());
          fs.writeFileSync(audioPath, buffer);
      } else {
          throw new Error("Missing input or audioStorageId");
      }
      
      console.log(`Audio ready for ${packId}`);

      await ctx.runMutation(internal.content.updateStatus, {
        id: packId,
        status: "transcribing",
      });

      // 2. Transcribe
      let transcript = "";
      if (
        process.env.DEEPGRAM_API_KEY &&
        !process.env.DEEPGRAM_API_KEY.startsWith("mock")
      ) {
        const response = await deepgram.listen.v1.media.transcribeFile(
          fs.readFileSync(audioPath),
          {
            smart_format: true,
            model: "nova-2",
            language: "en-US",
          }
        );
        transcript =
          (response as any).results?.channels[0].alternatives[0].transcript || "";
      } else {
        console.log(`Using mock transcript for ${packId}`);
        transcript =
          "In this video we talk about how SnipFlow is the ultimate tool for B2B creators to repurpose their webinars into LinkedIn posts, Twitter threads, and TikTok captions. It's fast, efficient and powered by AI. Join 500+ creators today.";
      }

      await ctx.runMutation(internal.content.updateStatus, {
        id: packId,
        status: "generating",
      });

      // 3. Identify Moments & Generate Content
      let moments = [];
      if (
        process.env.ANTHROPIC_API_KEY &&
        !process.env.ANTHROPIC_API_KEY.startsWith("mock")
      ) {
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
              ${transcript}`,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          moments = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse JSON from Claude response");
        }
      } else {
        // ... (Mock moments logic from video-processor.ts)
        moments = getMockMoments(options.twitterOnly);
      }

      // 4. Update Convex with results
      await ctx.runMutation(internal.content.updateMoments, {
        id: packId,
        moments: moments,
      });
      console.log(`Processing complete for ${packId}`);

      // 5. Notify user via email
      try {
        const pack = await ctx.runQuery(api.content.getPack, { id: packId });
        if (pack?.userId) {
            const user = await ctx.runQuery(api.users.getById, { id: pack.userId });
            if (user?.email) {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snipflow.com";
                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: "Jen <snipflow-d374d107@ctomail.io>",
                        to: [user.email],
                        subject: "Your SnipFlow content pack is ready",
                        html: `
                            <p>Hi there,</p>
                            <p>Jen here, founder of SnipFlow.</p>
                            <p>I’m reaching out because your video has been processed. Your custom content pack — featuring platform-optimized posts for LinkedIn, X, and TikTok — is ready for review.</p>
                            <p>Most creators lose 90% of their video value the moment the live session ends. SnipFlow is built to fix that by treating your video as the single source of truth for your entire distribution strategy.</p>
                            <p>You can access your highlights and draft posts here: <a href="${appUrl}/app?id=${packId}">${appUrl}/app?id=${packId}</a></p>
                            <p>Take a look at the outputs. They are designed to retain your specific voice while following the best practices for each social platform.</p>
                            <p>If you have any questions about the generation or how to use the assets, just hit reply.</p>
                            <p>Best,<br>Jen<br>Founder, SnipFlow</p>
                        `,
                    }),
                });
                console.log(`Email sent to ${user.email}`);
            }
        }
      } catch (emailError) {
          console.error("Failed to send email notification", emailError);
      }
    } catch (error) {
      console.error(`Processing failed for ${packId}`, error);
      await ctx.runMutation(internal.content.updateStatus, {
        id: packId,
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
  },
});

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
          // ... (rest of mock moments)
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
