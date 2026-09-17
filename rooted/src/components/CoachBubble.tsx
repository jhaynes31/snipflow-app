import { CoachAvatar, PTAvatar } from './Characters';
import type { CoachSettings } from '@/domain/types';

/** Small corner bubble, never full-screen (Section 11.1). */
export function CoachBubble({ speaker, text, settings, onDismiss }: { speaker: 'coach' | 'pt'; text: string; settings: CoachSettings; onDismiss?: () => void }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-3 fade-in" role="status" aria-live="polite">
      {speaker === 'coach' ? <CoachAvatar design={settings.coachDesign} /> : <PTAvatar design={settings.ptDesign} />}
      <div className="callout flex-1 relative">
        <p className="text-[1rem]">{text}</p>
        {onDismiss && <button type="button" className="absolute top-1 right-2 text-sm muted" onClick={onDismiss} aria-label="Dismiss message">×</button>}
      </div>
    </div>
  );
}
