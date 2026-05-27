import { NextResponse } from 'next/server';
import { processVideo } from '@/lib/video-processor';

export async function POST(req: Request) {
  try {
    const { url, packId, options } = await req.json();

    if (!url || !packId) {
      return NextResponse.json({ error: 'Missing url or packId' }, { status: 400 });
    }

    processVideo(url, packId, options).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
