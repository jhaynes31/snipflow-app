import { CoachAvatar, PTAvatar } from './Characters';
import type { Speaker } from '@/coach/messages';
import { GUIDE_MAP } from '@/data/guides';
import type { CoachSettings } from '@/domain/types';

/** Small corner bubble, never full-screen (Section 11.1). Any guide can speak; the therapists show their name. */
export function CoachBubble({ speaker, text, settings, onDismiss }: { speaker: Speaker; text: string; settings: CoachSettings; onDismiss?: () => void }) {
  if (!text) return null;
  const guide = GUIDE_MAP[speaker];
  return (
    <div className="flex items-start gap-3 fade-in" role="status" aria-live="polite">
      {speaker === 'coach' ? <CoachAvatar design={settings.coachDesign} /> : <PTAvatar design={settings.ptDesign} />}
      <div className="callout flex-1 relative">
        {speaker !== 'coach' && speaker !== 'pt' && <p className="text-xs muted mb-1">{guide.name}</p>}
        <p className="text-[1rem]">{text}</p>
        {onDismiss && <button type="button" className="absolute top-1 right-2 text-sm muted" onClick={onDismiss} aria-label="Dismiss message">×</button>}
      </div>
    </div>
  );
}
