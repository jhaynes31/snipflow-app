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
    // The Mobility Therapist's session (renamed 2026-09-23; the id stays for saved plans).
    // Joint by joint, neck to ankle, with the ankle and knee PT folded in, so the whole body
    // gets controlled range every week. For hypermobile joints: control, not stretch.
    id: 'ptMobility', name: 'Mobility Therapist', shortName: 'Mobility', estimatedMinutes: 20,
    blocks: [
      { kind: 'warmup', exerciseIds: ['mob-pelvic-tilts', 'wu-cat-cow'] },
      { kind: 'main', exerciseIds: ['mob-neck-cars', 'mob-shoulder-cars', 'mob-thoracic-rotation', 'mob-hip-cars', 'mob-90-90', 'pt-knee-to-wall', 'pt-ankle-4way', 'mob-ankle-cars', 'pt-tke'] },
      { kind: 'cooldown', exerciseIds: ['cd-open-book', 'cd-breathing'] },
    ],
  },
  somatic: {
    // Somatic Movement: the nervous system first. Slow, felt from the inside, every step optional.
    id: 'somatic', name: 'Somatic Movement', shortName: 'Somatic', estimatedMinutes: 20,
    blocks: [
      { kind: 'warmup', exerciseIds: ['som-orient', 'som-ground-feet'] },
      { kind: 'main', exerciseIds: ['som-360-breath', 'som-pandiculate', 'som-arch-flatten', 'som-spinal-wave', 'som-side-reach', 'som-hip-rock', 'som-shake', 'som-eye-neck'] },
      { kind: 'cooldown', exerciseIds: ['som-self-hold'] },
    ],
  },
  fascia: {
    // Fascia Release: feet to jaw, light pressure, slow. Hands or a ball; never grinding.
    id: 'fascia', name: 'Fascia Release', shortName: 'Fascia', estimatedMinutes: 18,
    blocks: [
      { kind: 'warmup', exerciseIds: ['som-360-breath'] },
      { kind: 'main', exerciseIds: ['fas-foot-roll', 'fas-calf-strip', 'fas-shin-glide', 'fas-thigh-glide', 'fas-hamstring-glide', 'fas-glute-ball', 'fas-hip-flexor-pin', 'fas-thoracic-roll', 'fas-pec-doorway', 'fas-forearm-glide', 'fas-suboccipital', 'fas-jaw-release'] },
      { kind: 'cooldown', exerciseIds: ['cd-breathing'] },
    ],
  },
  pelvicFloor: {
    // Pelvic Floor: relax first, coordinate second, strengthen last. Consent to every step.
    id: 'pelvicFloor', name: 'Pelvic Floor', shortName: 'Pelvic floor', estimatedMinutes: 14,
    blocks: [
      { kind: 'warmup', exerciseIds: ['pel-360-breath'] },
      { kind: 'main', exerciseIds: ['pel-drop', 'pel-happy-baby', 'pel-adductor-rock', 'pel-childs-pose-breath', 'pel-hip-circles', 'pel-deep-squat-breath', 'pel-elevator', 'pel-bridge-exhale'] },
      { kind: 'cooldown', exerciseIds: ['pel-sidelying-breath'] },
    ],
  },
  freestyle: {
    id: 'freestyle', name: 'Freestyle', shortName: 'Freestyle', estimatedMinutes: 15,
    // Built on the fly from chosen body areas and minutes (src/domain/freestyle.ts).
    blocks: [],
  },
};

/**
 * The week, six training days (2026-09-23, at Jen's direction): two strength days,
 * and the four therapy days every week: Somatic Movement, Fascia Release, the Mobility
 * Therapist (with the ankle and knee PT folded in), and Pelvic Floor. Strength A and B
 * lead alternate weeks. The whole body is addressed across the six.
 */
export const SESSION_ORDER_WEEK_ODD: SessionType[] = ['strengthA', 'somatic', 'strengthB', 'fascia', 'ptMobility', 'pelvicFloor'];
export const SESSION_ORDER_WEEK_EVEN: SessionType[] = ['strengthB', 'somatic', 'strengthA', 'fascia', 'ptMobility', 'pelvicFloor'];
/** Index in the week's order that maintain mode drops (the second strength day). */
export const MAINTAIN_DROP_INDEX = 2;

/** Which exercises to keep for the 5-minute version (one from warm-up, 3 main, one cool-down). */
export const FIVE_MINUTE_MAIN_COUNT = 3;
