import type { SessionTemplate, SessionType } from '@/domain/types';

/** Section 8.2 Foundation sessions. Every strength day has a PT warm-up and cool-down. */
export const STRENGTH_WARMUP = ['wu-march-supported', 'wu-ankle-circles', 'wu-cat-cow', 'wu-arm-circles', 'wu-glute-bridge'];
export const STRENGTH_COOLDOWN = ['cd-figure-four', 'cd-hip-flexor-block', 'cd-open-book', 'cd-breathing'];

export const TEMPLATES: Record<SessionType, SessionTemplate> = {
  strengthA: {
    id: 'strengthA', name: 'Strength A', shortName: 'Strength A', estimatedMinutes: 35,
    blocks: [
      { kind: 'warmup', exerciseIds: STRENGTH_WARMUP },
      { kind: 'main', exerciseIds: ['sit-to-stand', 'db-rdl', 'incline-push-up-counter', 'band-row', 'glute-bridge-block', 'dead-bug'] },
      { kind: 'cooldown', exerciseIds: STRENGTH_COOLDOWN },
    ],
  },
  strengthB: {
    id: 'strengthB', name: 'Strength B', shortName: 'Strength B', estimatedMinutes: 35,
    blocks: [
      { kind: 'warmup', exerciseIds: STRENGTH_WARMUP },
      { kind: 'main', exerciseIds: ['goblet-squat-box', 'db-floor-press', 'db-row-one-arm', 'band-pull-apart', 'clamshell-band', 'side-plank-knees'] },
      { kind: 'cooldown', exerciseIds: STRENGTH_COOLDOWN },
    ],
  },
  ptAnkles: {
    id: 'ptAnkles', name: 'PT: Ankles & Balance', shortName: 'Ankles & Balance', estimatedMinutes: 15,
    blocks: [
      { kind: 'warmup', exerciseIds: ['pt-weight-shifts'] },
      { kind: 'main', exerciseIds: ['wu-ankle-circles', 'pt-ankle-4way', 'wu-calf-raise-supported', 'pt-sls-two-hands', 'pt-toe-yoga'] },
      { kind: 'cooldown', exerciseIds: ['cd-calf-wall'] },
    ],
  },
  ptKneesHips: {
    id: 'ptKneesHips', name: 'PT: Knees & Hips', shortName: 'Knees & Hips', estimatedMinutes: 15,
    blocks: [
      { kind: 'warmup', exerciseIds: ['pt-heel-slides'] },
      // Supported step-ups are caution-locked; the generator swaps them until unlocked.
      { kind: 'main', exerciseIds: ['pt-tke', 'pt-seated-knee-extension', 'hip-abduction-side-lying', 'bird-dog', 'pt-step-up-supported'] },
      { kind: 'cooldown', exerciseIds: ['cd-figure-four'] },
    ],
  },
  ptMobility: {
    id: 'ptMobility', name: 'PT: Full-Body Mobility', shortName: 'Mobility', estimatedMinutes: 15,
    blocks: [
      { kind: 'warmup', exerciseIds: ['mob-pelvic-tilts'] },
      { kind: 'main', exerciseIds: ['wu-cat-cow', 'cd-open-book', 'cd-hip-flexor-block', 'mob-shoulder-band-circles', 'pt-knee-to-wall'] },
      { kind: 'cooldown', exerciseIds: ['cd-breathing'] },
    ],
  },
  freestyle: {
    id: 'freestyle', name: 'Freestyle', shortName: 'Freestyle', estimatedMinutes: 15,
    // Built on the fly from chosen body areas and minutes (src/domain/freestyle.ts).
    blocks: [],
  },
};

export const SESSION_ORDER_WEEK_ODD: SessionType[] = ['strengthA', 'ptAnkles', 'strengthB', 'ptKneesHips', 'strengthA', 'ptMobility'];
export const SESSION_ORDER_WEEK_EVEN: SessionType[] = ['strengthB', 'ptAnkles', 'strengthA', 'ptKneesHips', 'strengthB', 'ptMobility'];

/** Which exercises to keep for the 5-minute version (one from warm-up, 3 main, one cool-down). */
export const FIVE_MINUTE_MAIN_COUNT = 3;
