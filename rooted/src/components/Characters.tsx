import type { CoachSettings } from '@/domain/types';

/** Illustrated Coach and PT (Section 11.1). Earthy palette, three designs each. */
const COACH: Record<CoachSettings['coachDesign'], { skin: string; hair: string; shirt: string; motif: 'sun' | 'oak' | 'stone' }> = {
  oak: { skin: '#C9956B', hair: '#3E2F25', shirt: '#2F4A2E', motif: 'oak' },
  willow: { skin: '#E7C3A0', hair: '#6B4F3A', shirt: '#5B7B3A', motif: 'sun' },
  cedar: { skin: '#8A5A3C', hair: '#1F3322', shirt: '#B5563A', motif: 'stone' },
};
const PT: Record<CoachSettings['ptDesign'], { skin: string; hair: string; shirt: string; motif: 'fern' | 'moss' | 'river' }> = {
  fern: { skin: '#E7C3A0', hair: '#B5563A', shirt: '#8BA868', motif: 'fern' },
  moss: { skin: '#C9956B', hair: '#3E2F25', shirt: '#5B7B3A', motif: 'moss' },
  river: { skin: '#F0D5BE', hair: '#DAD5C6', shirt: '#6B4F3A', motif: 'river' },
};

function Face({ skin, hair, shirt, size, badge }: { skin: string; hair: string; shirt: string; size: number; badge: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="var(--bg-card-soft)" />
      <path d="M22 100 q0 -30 28 -30 q28 0 28 30 z" fill={shirt} />
      <circle cx="50" cy="44" r="20" fill={skin} />
      <path d="M30 40 q20 -26 40 0 q-4 -10 -20 -12 q-16 2 -20 12 z" fill={hair} />
      <circle cx="43" cy="45" r="2.2" fill="#3E2F25" />
      <circle cx="57" cy="45" r="2.2" fill="#3E2F25" />
      <path d="M43 53 q7 6 14 0" stroke="#3E2F25" strokeWidth="2" fill="none" strokeLinecap="round" />
      <text x="82" y="26" fontSize="18" textAnchor="middle">{badge}</text>
    </svg>
  );
}

export function CoachAvatar({ design, size = 56 }: { design: CoachSettings['coachDesign']; size?: number }) {
  const c = COACH[design];
  return <Face {...c} size={size} badge={c.motif === 'sun' ? '☀️' : c.motif === 'oak' ? '🌳' : '🪨'} />;
}
export function PTAvatar({ design, size = 56 }: { design: CoachSettings['ptDesign']; size?: number }) {
  const c = PT[design];
  return <Face {...c} size={size} badge={c.motif === 'fern' ? '🌿' : c.motif === 'moss' ? '🍃' : '💧'} />;
}
