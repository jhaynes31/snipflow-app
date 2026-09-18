import { useEffect, useRef, useState } from 'react';
import { mediaOverride } from '@/data/media';
import { db } from '@/db/db';
import type { Exercise } from '@/domain/types';

/** Looping demo with pause and slow-motion where supported (Section 6.3). */
export function DemoMedia({ exercise, slow = false, height = 220 }: { exercise: Exercise; slow?: boolean; height?: number }) {
  const media = mediaOverride(exercise.id) ?? exercise.media[0];
  const [paused, setPaused] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let url: string | null = null;
    if (media?.type === 'custom') {
      db.customMedia.get(media.src).then((m) => { if (m) { url = URL.createObjectURL(m.blob); setBlobUrl(url); } });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [media?.src, media?.type]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = slow ? 0.5 : 1;
    if (paused) v.pause(); else v.play().catch(() => {});
  }, [slow, paused]);

  if (!media) return null;
  const style = { height, width: '100%', objectFit: 'contain' as const, borderRadius: 18, background: 'var(--bg-card-soft)' };

  if (media.type === 'video' || (media.type === 'custom' && blobUrl)) {
    return (
      <div className="relative">
        <video ref={videoRef} src={media.type === 'custom' ? blobUrl! : media.src} style={style} loop muted playsInline autoPlay aria-label={`${exercise.name} demonstration`} />
        <button type="button" className="btn btn-ghost btn-sm absolute bottom-2 right-2" onClick={() => setPaused((p) => !p)}>{paused ? 'Play' : 'Pause'}</button>
      </div>
    );
  }
  if (media.type === 'gif') {
    return (
      <figure className="m-0">
        <img src={media.src} alt={`${exercise.name} demonstration`} style={style} loading="lazy" />
        {media.credit && <figcaption className="muted text-xs mt-1 text-right">{media.credit}</figcaption>}
      </figure>
    );
  }
  return (
    <div style={{ ...style, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <img src={media.src} alt={`${exercise.name}: ${exercise.stance.replace('-', ' ')} position`} style={{ height: '100%', objectFit: 'contain', animationPlayState: paused ? 'paused' : 'running' }} />
    </div>
  );
}
