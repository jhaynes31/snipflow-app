import { useEffect, useRef, useState } from 'react';
import { db } from '@/db/db';
import type { UserProfile } from '@/domain/types';
import { Button } from './ui';

/** Write or record your Why (Section 5.7). Audio stays on-device in IndexedDB. */
export function WhyRecorder({ why, onChange }: { why: UserProfile['why']; onChange: (w: UserProfile['why']) => void }) {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    let u: string | null = null;
    if (why.audioKey) db.customMedia.get(why.audioKey).then((m) => { if (m) { u = URL.createObjectURL(m.blob); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [why.audioKey]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        const key = 'why-audio';
        await db.customMedia.put({ key, blob, mime: blob.type, createdAt: new Date().toISOString() });
        onChange({ ...why, audioKey: key });
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch { setRecording(false); }
  };
  const stop = () => { rec.current?.stop(); setRecording(false); };

  return (
    <div className="stack-sm">
      <textarea className="input" rows={4} placeholder="I'm doing this because…" value={why.text ?? ''} onChange={(e) => onChange({ ...why, text: e.target.value })} aria-label="Your why" />
      {supported && (
        <div className="flex items-center gap-2 flex-wrap">
          {!recording ? <Button variant="secondary" size="sm" onClick={start}>Record it in your voice</Button> : <Button variant="danger" size="sm" onClick={stop}>Stop recording</Button>}
          {url && <audio controls src={url} className="max-w-full" />}
        </div>
      )}
    </div>
  );
}
