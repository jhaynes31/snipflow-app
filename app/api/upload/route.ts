import { NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const packId = formData.get('packId') as string;
    const optionsJson = formData.get('options') as string;
    const options = optionsJson ? JSON.parse(optionsJson) : {};

    if (!file || !packId) {
      return NextResponse.json({ error: 'Missing file or packId' }, { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), 'tmp', packId);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const videoPath = path.join(tmpDir, 'video.mp4');
    const audioPath = path.join(tmpDir, 'audio.mp3');
    
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(videoPath, buffer);

    // 1. Extract audio locally
    await execAsync(`ffmpeg -i "${videoPath}" -vn -ar 44100 -ac 2 -b:a 192k "${audioPath}" -y`);

    // 2. Upload audio to Convex Storage
    const uploadUrl = await convex.mutation(api.content.generateUploadUrl);
    const audioBuffer = fs.readFileSync(audioPath);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "audio/mpeg" },
      body: audioBuffer,
    });
    
    const { storageId } = await uploadResponse.json();

    // 3. Store the audioStorageId on the pack
    await convex.mutation(api.content.updateContentPack, {
        id: packId as any,
        audioStorageId: storageId,
    });

    // 4. Fire processing via /api/process (handles the full pipeline server-side)
    // We don't await this — let it run in the background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, options }),
    }).catch(err => console.error("Process API error:", err));

    // Clean up
    try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
        console.error("Failed to cleanup tmp dir", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}