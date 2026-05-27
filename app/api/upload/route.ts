import { NextResponse } from 'next/server';
import { processVideo } from '@/lib/video-processor';
import fs from 'fs';
import path from 'path';

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

    const filePath = path.join(tmpDir, 'video.mp4');
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Trigger processing
    // In this case, we use the local file instead of a URL
    processVideo(filePath, packId, options).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
