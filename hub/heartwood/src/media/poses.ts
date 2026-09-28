import { front, kneeling, prone, quadruped, seated, sideLying, stand, supine, type Anchor, type Pose, type Prop, type SideFrame } from './pose';

/**
 * One pose per exercise, by id. Frame a is the start, frame b the end of the
 * movement (or the hold), so the picture shows what the words say. Drawn to
 * match the exercise steps in data/exercises.ts; if a step changes, change
 * the pose. Excluded exercises (x-…) never show a picture.
 *
 * Side view faces right. Angles are degrees from straight down, positive
 * toward the right: an arm at 90 points forward, at 180 overhead.
 */
const P = (a: Pose['a'], b?: Pose['b'], props?: Pose['props']): Pose => ({ a, b, props });
const bare = (f: SideFrame): SideFrame => ({ ...f, props: [] });
const counter: Prop = { kind: 'counter', x: 196, h: 100 };
const wall: Prop = { kind: 'wall', x: 214 };
const chairBehind: Prop = { kind: 'chair', x: 92, back: 'left' };
const chairAhead: Prop = { kind: 'chair', x: 196, back: 'right' };
const db = (at: Anchor): Prop => ({ kind: 'dumbbell', at });
const band = (from: Anchor, to: Anchor | [number, number]): Prop => ({ kind: 'band', from, to });

// Shared frames
const holdCounter = { armF: 42, foreF: 42, armB: 42, foreB: 42 };
const handsOnHips = { armF: -10, foreF: 60, armB: -10, foreB: 60 };
const supineFlat = supine({ x: 150, armF: -85, foreF: -85, armB: -85, foreB: -85 });
const supineKneesBent = supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: -85, foreF: -85, armB: -85, foreB: -85 });

export const POSES: Record<string, Pose> = {
  // ---------- warm-up ----------
  'wu-march-supported': P(stand({ x: 150, thighF: 70, shinF: 0, ...holdCounter }), stand({ x: 150, thighB: 70, shinB: 0, ...holdCounter }), [counter]),
  'wu-ankle-circles': P(seated({ x: 150, thighF: 70, shinF: 40, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, thighF: 70, shinF: 60, armF: 20, foreF: 60, armB: 20, foreB: 60 })),
  'wu-cat-cow': P(quadruped({ x: 120, torso: 105, head: -40 }), quadruped({ x: 120, torso: 118, head: 40 }), [{ kind: 'mat' }]),
  'wu-arm-circles': P(front({ x: 160, armL: -90, foreL: -90, armR: 90, foreR: 90 }), front({ x: 160, armL: -170, foreL: -170, armR: 170, foreR: 170 })),
  'wu-hinge-pattern': P(stand({ x: 160, ...handsOnHips }), stand({ x: 160, torso: 125, thighF: 8, shinF: 0, thighB: 8, shinB: 0, armF: 30, foreF: 100, armB: 30, foreB: 100 })),
  'wu-glute-bridge': P(supineKneesBent, { ...supineKneesBent, hip: [150, 164], torso: -70, head: -20, thighF: 110, shinF: -10, thighB: 110, shinB: -10, armF: -100, foreF: -100, armB: -100, foreB: -100 }),
  'wu-calf-raise-supported': P(stand({ x: 150, ...holdCounter }), { ...stand({ x: 150, ...holdCounter }), hip: [150, 90], shinF: 12, shinB: 12 }, [counter]),

  // ---------- cool-down ----------
  'cd-figure-four': P(seated({ x: 150, thighF: 100, shinF: -80, thighB: 90, shinB: 0, armF: 40, foreF: 40, armB: 40, foreB: 40 }), seated({ x: 150, torso: 160, thighF: 100, shinF: -80, thighB: 90, shinB: 0, armF: 40, foreF: 40, armB: 40, foreB: 40 })),
  'cd-hip-flexor-block': P(kneeling({ x: 150, thighF: 80, shinF: 0, thighB: -10, shinB: -90, armF: 40, foreF: 40, armB: 8, foreB: 8, props: [{ kind: 'block', x: 176, y: 168, w: 26, h: 36 }] }), kneeling({ x: 162, thighF: 88, shinF: 0, thighB: -25, shinB: -90, armF: 40, foreF: 40, armB: 8, foreB: 8, props: [{ kind: 'block', x: 176, y: 168, w: 26, h: 36 }] })),
  'cd-open-book': P(sideLying({ x: 150, armF: -60, foreF: -60, armB: -60, foreB: -60 }), sideLying({ x: 150, armF: -60, foreF: -60, armB: 160, foreB: 160 }), [{ kind: 'mat' }]),
  'cd-hamstring-band': P(supine({ x: 150, thighF: 150, shinF: 165, thighB: 90, shinB: 90, armF: 20, foreF: 120, armB: 20, foreB: 120, props: [band('handF', 'footF')] }), supine({ x: 150, thighF: 168, shinF: 172, thighB: 90, shinB: 90, armF: 40, foreF: 150, armB: 40, foreB: 150, props: [band('handF', 'footF')] })),
  'cd-calf-wall': P(stand({ x: 146, torso: 165, thighF: 30, shinF: -12, thighB: -22, shinB: -22, armF: 70, foreF: 80, armB: 70, foreB: 80 }), undefined, [wall]),
  'cd-chest-wall': P(stand({ x: 150, thighF: 6, shinF: 0, thighB: -6, shinB: 0, armF: 90, foreF: 90, armB: 8, foreB: 8 }), stand({ x: 150, torso: 175, thighF: 20, shinF: -6, thighB: -6, shinB: 0, armF: 90, foreF: 90, armB: 8, foreB: 8 }), [{ kind: 'wall', x: 226 }]),
  'cd-breathing': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 95, foreF: 140, armB: 95, foreB: 140 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }]),

  'cd-child-pose': P({ ...kneeling({ x: 130 }), hip: [130, 174], torso: 80, head: 12, thighF: 60, shinF: -90, thighB: 60, shinB: -90, armF: 72, foreF: 86, armB: 72, foreB: 86 }, undefined, [{ kind: 'mat' }]),

  // ---------- strength: squat and hinge ----------
  'sit-to-stand-elevated': P(bare(seated({ x: 150, armF: 70, foreF: 110, armB: 70, foreB: 110 })), stand({ x: 162, armF: 60, foreF: 120, armB: 60, foreB: 120 }), [{ kind: 'chair', x: 110, back: 'left', seatY: 128 }, { kind: 'block', x: 112, y: 136, w: 44, h: 10 }]),
  'sit-to-stand': P(bare(seated({ x: 150, armF: 70, foreF: 110, armB: 70, foreB: 110 })), stand({ x: 162, armF: 60, foreF: 120, armB: 60, foreB: 120 }), [{ kind: 'chair', x: 110, back: 'left' }]),
  'goblet-squat-box': P(stand({ x: 160, armF: 35, foreF: 175, armB: 35, foreB: 175, props: [db('handF')] }), stand({ x: 160, torso: 165, thighF: 68, shinF: -22, thighB: 68, shinB: -22, armF: 40, foreF: 175, armB: 40, foreB: 175, props: [db('handF')] }), [chairBehind]),
  'goblet-squat-block': P(stand({ x: 160, armF: 35, foreF: 175, armB: 35, foreB: 175, props: [db('handF')] }), stand({ x: 160, torso: 165, thighF: 72, shinF: -24, thighB: 72, shinB: -24, armF: 40, foreF: 175, armB: 40, foreB: 175, props: [db('handF')] }), [{ kind: 'block', x: 126, y: 158, w: 30, h: 46 }]),
  'goblet-squat-deep': P(stand({ x: 160, armF: 35, foreF: 175, armB: 35, foreB: 175, props: [db('handF')] }), stand({ x: 160, torso: 160, thighF: 92, shinF: -35, thighB: 92, shinB: -35, armF: 45, foreF: 175, armB: 45, foreB: 175, props: [db('handF')] })),
  'wall-sit-partial': P({ ...stand({ x: 150, thighF: 50, shinF: -10, thighB: 50, shinB: -10, armF: 8, foreF: 8, armB: 8, foreB: 8 }), torso: 180 }, undefined, [{ kind: 'wall', x: 130 }]),
  'band-good-morning': P(stand({ x: 160, armF: 30, foreF: 170, armB: 30, foreB: 170, props: [band('footF', 'handF')] }), stand({ x: 160, torso: 120, thighF: 8, shinF: 0, thighB: 8, shinB: 0, armF: 60, foreF: 170, armB: 60, foreB: 170, props: [band('footF', 'handF')] })),
  'db-rdl': P(stand({ x: 160, armF: 6, foreF: 6, armB: 6, foreB: 6, props: [db('hands')] }), stand({ x: 160, torso: 118, thighF: 10, shinF: 0, thighB: 10, shinB: 0, armF: 20, foreF: 20, armB: 20, foreB: 20, props: [db('hands')] })),
  'db-rdl-staggered': P(stand({ x: 140, thighB: -12, shinB: -30, armF: 6, foreF: 6, armB: 55, foreB: 70, props: [db('handF')] }), stand({ x: 140, torso: 120, thighF: 10, shinF: 0, thighB: -20, shinB: -30, armF: 22, foreF: 22, armB: 70, foreB: 70, props: [db('handF')] }), [chairAhead]),

  // ---------- strength: push ----------
  'wall-push-up': P(stand({ x: 150, torso: 170, thighF: 12, shinF: 0, thighB: 12, shinB: 0, armF: 75, foreF: 75, armB: 75, foreB: 75 }), stand({ x: 156, torso: 160, thighF: 16, shinF: 0, thighB: 16, shinB: 0, armF: 20, foreF: 100, armB: 20, foreB: 100 }), [{ kind: 'wall', x: 232 }]),
  'incline-push-up-counter': P(stand({ x: 130, torso: 140, thighF: 30, shinF: 0, thighB: 30, shinB: 0, armF: 50, foreF: 50, armB: 50, foreB: 50 }), stand({ x: 138, torso: 135, thighF: 34, shinF: 0, thighB: 34, shinB: 0, armF: -10, foreF: 100, armB: -10, foreB: 100 }), [counter]),
  'incline-push-up-chair': P({ ...stand({ x: 110, torso: 118, thighF: 40, shinF: 0, thighB: 40, shinB: 0, armF: 30, foreF: 30, armB: 30, foreB: 30 }) }, { ...stand({ x: 116, torso: 114, thighF: 44, shinF: 0, thighB: 44, shinB: 0, armF: -20, foreF: 90, armB: -20, foreB: 90 }) }, [{ kind: 'chair', x: 210, back: 'right' }, { kind: 'wall', x: 262 }]),
  'db-floor-press': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 100, foreF: 180, armB: 100, foreB: 180, props: [db('hands')] }), supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 180, foreF: 180, armB: 180, foreB: 180, props: [db('hands')] })),
  'db-floor-press-alternating': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 180, foreF: 180, armB: 100, foreB: 180, props: [db('hands')] }), supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 100, foreF: 180, armB: 180, foreB: 180, props: [db('hands')] })),
  'db-overhead-press-seated': P(front({ x: 160, hip: [160, 130], armL: -100, foreL: 180, armR: 100, foreR: 180, legL: -30, shinL: 0, legR: 30, shinR: 0, props: [db('handL'), db('handR')] }), front({ x: 160, hip: [160, 130], armL: -175, foreL: 180, armR: 175, foreR: 180, legL: -30, shinL: 0, legR: 30, shinR: 0, props: [db('handL'), db('handR')] }), [{ kind: 'chair', x: 136, back: 'none', seatY: 134 }]),

  // ---------- strength: pull ----------
  'band-row-seated': P(supine({ x: 120, hip: [120, 190], torso: 180, thighF: 88, shinF: 84, thighB: 88, shinB: 84, armF: 85, foreF: 85, armB: 85, foreB: 85, props: [band('hands', 'footF')] }), supine({ x: 120, hip: [120, 190], torso: 180, thighF: 88, shinF: 84, thighB: 88, shinB: 84, armF: -30, foreF: 80, armB: -30, foreB: 80, props: [band('hands', 'footF')] })),
  'band-row': P(stand({ x: 140, torso: 172, armF: 88, foreF: 88, armB: 88, foreB: 88, props: [band('hands', [232, 40])] }), stand({ x: 140, torso: 172, armF: -35, foreF: 70, armB: -35, foreB: 70, props: [band('hands', [232, 40])] }), [{ kind: 'wall', x: 226 }]),
  'db-row-one-arm': P(stand({ x: 150, torso: 130, thighF: 12, shinF: 0, thighB: 12, shinB: 0, armF: 40, foreF: 40, armB: 20, foreB: 20, props: [db('handB')] }), stand({ x: 150, torso: 130, thighF: 12, shinF: 0, thighB: 12, shinB: 0, armF: 40, foreF: 40, armB: -40, foreB: 40, props: [db('handB')] }), [chairAhead]),
  'band-pull-apart': P(front({ x: 160, armL: -88, foreL: -88, armR: 88, foreR: 88, props: [band('handL', 'handR')] }), front({ x: 160, armL: -95, foreL: -95, armR: 95, foreR: 95, props: [band('handL', 'handR')] })),
  'band-face-pull': P(stand({ x: 140, armF: 100, foreF: 100, armB: 100, foreB: 100, props: [band('hands', [232, 46])] }), stand({ x: 140, armF: 80, foreF: 170, armB: 80, foreB: 170, props: [band('hands', [232, 46])] }), [{ kind: 'wall', x: 226 }]),
  'band-wall-slide': P(front({ x: 160, armL: -90, foreL: 180, armR: 90, foreR: 180, props: [band('handL', 'handR')] }), front({ x: 160, armL: -150, foreL: 180, armR: 150, foreR: 180, props: [band('handL', 'handR')] }), [{ kind: 'block', x: 80, y: 18, w: 160, h: 186 }]),

  // ---------- strength: carry and core ----------
  'db-farmer-carry': P(stand({ x: 140, thighF: 20, shinF: -8, thighB: -14, shinB: 4, armF: 4, foreF: 4, armB: 4, foreB: 4, props: [db('hands')] }), stand({ x: 170, thighF: -14, shinF: 4, thighB: 20, shinB: -8, armF: 4, foreF: 4, armB: 4, foreB: 4, props: [db('hands')] })),
  'db-suitcase-carry': P(stand({ x: 140, thighF: 20, shinF: -8, thighB: -14, shinB: 4, armF: 4, foreF: 4, armB: 20, foreB: 60, props: [db('handF')] }), stand({ x: 170, thighF: -14, shinF: 4, thighB: 20, shinB: -8, armF: 4, foreF: 4, armB: 20, foreB: 60, props: [db('handF')] })),
  'dead-bug-heel-slide': P(supineKneesBent, supine({ x: 150, thighF: 110, shinF: 60, thighB: 135, shinB: 0, armF: -85, foreF: -85, armB: -85, foreB: -85 })),
  'dead-bug': P(supine({ x: 150, thighF: 150, shinF: 80, thighB: 150, shinB: 80, armF: 180, foreF: 180, armB: 180, foreB: 180 }), supine({ x: 150, thighF: 110, shinF: 100, thighB: 150, shinB: 80, armF: 180, foreF: 180, armB: -95, foreB: -95 })),
  'dead-bug-band': P(supine({ x: 150, thighF: 150, shinF: 80, thighB: 150, shinB: 80, armF: 180, foreF: 180, armB: 180, foreB: 180, props: [band('hands', [60, 20])] }), supine({ x: 150, thighF: 110, shinF: 100, thighB: 150, shinB: 80, armF: 180, foreF: 180, armB: 180, foreB: 180, props: [band('hands', [60, 20])] })),
  'glute-bridge-block': P({ ...supineKneesBent, props: [{ kind: 'block', x: 176, y: 140, w: 14, h: 22 }] }, { ...supineKneesBent, hip: [150, 164], torso: -70, head: -20, thighF: 110, shinF: -10, thighB: 110, shinB: -10, armF: -100, foreF: -100, armB: -100, foreB: -100, props: [{ kind: 'block', x: 186, y: 128, w: 14, h: 22 }] }),
  'glute-bridge-weighted': P({ ...supineKneesBent, armF: 60, foreF: 150, armB: 60, foreB: 150, props: [db('hands')] }, { ...supineKneesBent, hip: [150, 164], torso: -70, head: -20, thighF: 110, shinF: -10, thighB: 110, shinB: -10, armF: 40, foreF: 150, armB: 40, foreB: 150, props: [db('hands')] }),
  'pallof-hold': P(front({ x: 150, armL: 70, foreL: 90, armR: 110, foreR: 90, props: [band('handR', [300, 100])] }), undefined),
  'pallof-press': P(front({ x: 150, armL: 40, foreL: 150, armR: 140, foreR: 30, props: [band('handR', [300, 100])] }), front({ x: 150, armL: 60, foreL: 90, armR: 120, foreR: 90, props: [band('handR', [300, 100])] })),
  'bird-dog': P(quadruped({ x: 120 }), quadruped({ x: 120, thighB: -85, shinB: -90, armF: 110, foreF: 110 }), [{ kind: 'mat' }]),
  'bird-dog-arm-only': P(quadruped({ x: 120 }), quadruped({ x: 120, armF: 110, foreF: 110 }), [{ kind: 'mat' }]),
  'side-plank-knees': P(sideLying({ x: 150, thighF: 100, shinF: 10, thighB: 100, shinB: 10, armF: -20, foreF: 80, armB: -20, foreB: 80 }), { ...sideLying({ x: 150 }), hip: [150, 150], torso: -78, head: 0, thighF: 105, shinF: 0, thighB: 105, shinB: 0, armF: -20, foreF: 80, armB: -20, foreB: 80 }, [{ kind: 'mat' }]),
  'side-lying-hip-lift': P(sideLying({ x: 150, thighF: 100, shinF: 10, thighB: 100, shinB: 10, armF: -20, foreF: 80, armB: -20, foreB: 80 }), { ...sideLying({ x: 150 }), hip: [150, 158], torso: -80, head: 0, thighF: 108, shinF: 0, thighB: 108, shinB: 0, armF: -20, foreF: 80, armB: -20, foreB: 80 }, [{ kind: 'mat' }]),
  'side-plank-feet': P(sideLying({ x: 150, thighF: 92, shinF: 92, thighB: 92, shinB: 92, armF: -20, foreF: 80, armB: -20, foreB: 80 }), { ...sideLying({ x: 150 }), hip: [150, 150], torso: -78, head: 0, thighF: 100, shinF: 100, thighB: 100, shinB: 100, armF: -20, foreF: 80, armB: -20, foreB: 80 }, [{ kind: 'mat' }]),
  'plank-knees': P({ ...prone({ x: 150 }), hip: [150, 181], torso: -110, head: 10, thighF: 60, shinF: 90, thighB: 60, shinB: 90, armF: 0, foreF: 90, armB: 0, foreB: 90 }, undefined, [{ kind: 'mat' }]),
  'clamshell': P(sideLying({ x: 150, thighF: 110, shinF: 20, thighB: 110, shinB: 20 }), sideLying({ x: 150, thighF: 110, shinF: 20, thighB: 150, shinB: 60 }), [{ kind: 'mat' }]),
  'clamshell-band': P(sideLying({ x: 150, thighF: 110, shinF: 20, thighB: 110, shinB: 20, props: [band('kneeF', 'kneeB')] }), sideLying({ x: 150, thighF: 110, shinF: 20, thighB: 150, shinB: 60 }), [{ kind: 'mat' }]),
  'hip-abduction-side-lying': P(sideLying({ x: 150, thighF: 92, shinF: 92, thighB: 100, shinB: 40 }), sideLying({ x: 150, thighF: 120, shinF: 120, thighB: 100, shinB: 40 }), [{ kind: 'mat' }]),
  'hip-abduction-standing': P(front({ x: 150, legL: -6, shinL: -6, legR: 6, shinR: 6, armL: -60, foreL: -60, armR: 20, foreR: 20 }), front({ x: 150, legL: -6, shinL: -6, legR: 34, shinR: 34, armL: -60, foreL: -60, armR: 20, foreR: 20 }), [{ kind: 'counter', x: 40, w: 44, h: 100 }]),

  // ---------- PT: ankles, balance, knees ----------
  'pt-ankle-4way': P(seated({ x: 150, thighF: 70, shinF: 30, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [band('footF', [250, 196])] }), seated({ x: 150, thighF: 70, shinF: 60, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [band('footF', [250, 196])] })),
  'pt-calf-raise-one-hand': P(stand({ x: 150, armF: 42, foreF: 42, armB: 8, foreB: 8 }), { ...stand({ x: 150, armF: 42, foreF: 42, armB: 8, foreB: 8 }), hip: [150, 90], shinF: 12, shinB: 12 }, [counter]),
  'pt-calf-raise-fingertips': P(stand({ x: 150, armF: 40, foreF: 50, armB: 8, foreB: 8 }), { ...stand({ x: 150, armF: 40, foreF: 50, armB: 8, foreB: 8 }), hip: [150, 90], shinF: 12, shinB: 12 }, [counter]),
  'pt-sls-two-hands': P(stand({ x: 150, thighB: 12, shinB: -55, ...holdCounter }), undefined, [counter]),
  'pt-sls-one-hand': P(stand({ x: 150, thighB: 12, shinB: -55, armF: 42, foreF: 42, armB: 8, foreB: 8 }), undefined, [counter]),
  'pt-sls-fingertips': P(stand({ x: 150, thighB: 12, shinB: -55, armF: 40, foreF: 50, armB: 8, foreB: 8 }), undefined, [counter]),
  'pt-sls-none': P(stand({ x: 160, thighB: 12, shinB: -55, armF: -30, foreF: -30, armB: 30, foreB: 30 }), undefined),
  'pt-tandem-stance': P(stand({ x: 150, thighF: 14, shinF: -6, thighB: -14, shinB: 6, ...holdCounter }), undefined, [counter]),
  'pt-weight-shifts': P(stand({ x: 146, torso: 176, thighF: 10, shinF: 4, thighB: -14, shinB: -4, ...holdCounter }), stand({ x: 154, torso: 184, thighF: 4, shinF: 10, thighB: -6, shinB: -14, ...holdCounter }), [counter]),
  'pt-heel-toe-walk': P(stand({ x: 140, thighF: 22, shinF: -8, thighB: -6, shinB: 0, armF: 42, foreF: 42, armB: 42, foreB: 42 }), stand({ x: 156, thighF: -6, shinF: 0, thighB: 22, shinB: -8, armF: 42, foreF: 42, armB: 42, foreB: 42 }), [counter]),
  'pt-toe-yoga': P(seated({ x: 150, thighF: 75, shinF: 0, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, thighF: 75, shinF: 0, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'block', x: 188, y: 196, w: 40, h: 6 }] })),
  'pt-knee-to-wall': P(stand({ x: 146, thighF: 20, shinF: 0, thighB: -14, shinB: 0, armF: 62, foreF: 78, armB: 62, foreB: 78 }), stand({ x: 146, torso: 172, thighF: 40, shinF: -18, thighB: -14, shinB: 4, armF: 66, foreF: 80, armB: 66, foreB: 80 }), [wall]),
  'pt-tke': P(stand({ x: 150, thighF: 14, shinF: -14, thighB: 0, shinB: 0, armF: 42, foreF: 42, armB: 8, foreB: 8, props: [band('kneeF', [40, 150])] }), stand({ x: 150, thighF: 2, shinF: -2, thighB: 0, shinB: 0, armF: 42, foreF: 42, armB: 8, foreB: 8, props: [band('kneeF', [40, 150])] }), [counter]),
  'pt-seated-knee-extension': P(seated({ x: 150 }), seated({ x: 150, thighF: 90, shinF: 85 })),
  'pt-seated-knee-extension-band': P(seated({ x: 150, props: [band('footF', [92, 196])] }), seated({ x: 150, thighF: 90, shinF: 85, props: [band('footF', [92, 196])] })),
  'pt-straight-leg-raise': P(supine({ x: 150, thighF: 90, shinF: 90, thighB: 135, shinB: 0, armF: -85, foreF: -85, armB: -85, foreB: -85 }), supine({ x: 150, thighF: 125, shinF: 125, thighB: 135, shinB: 0, armF: -85, foreF: -85, armB: -85, foreB: -85 })),
  'pt-heel-slides': P(supineFlat, supine({ x: 150, thighF: 135, shinF: 0, thighB: 90, shinB: 90, armF: -85, foreF: -85, armB: -85, foreB: -85 })),
  'pt-step-up-supported': P(stand({ x: 140, thighF: 60, shinF: -6, armF: 42, foreF: 42, armB: 42, foreB: 42 }), { ...stand({ x: 156, armF: 42, foreF: 42, armB: 42, foreB: 42 }), hip: [156, 76], thighF: 0, shinF: 0, thighB: 30, shinB: -50 }, [{ kind: 'step', x: 130, w: 60, h: 22 }, counter]),
  'pt-hip-hinge-chair': P(stand({ x: 140, armF: 42, foreF: 42, armB: 42, foreB: 42 }), stand({ x: 140, torso: 125, thighF: 8, shinF: 0, thighB: 8, shinB: 0, armF: 60, foreF: 60, armB: 60, foreB: 60 }), [chairAhead]),
  'mob-thoracic-chair': P(seated({ x: 150, armF: 150, foreF: 120, armB: 150, foreB: 120 }), seated({ x: 150, torso: 200, head: 20, armF: 170, foreF: 130, armB: 170, foreB: 130 })),
  'mob-thread-needle': P(quadruped({ x: 120 }), quadruped({ x: 120, torso: 118, head: -30, armF: -60, foreF: -60 }), [{ kind: 'mat' }]),
  'mob-90-90-seated': P(seated({ x: 150, thighF: 100, shinF: -80, armF: 30, foreF: 90, armB: 30, foreB: 90 }), seated({ x: 150, thighF: 100, shinF: -80, torso: 176, armF: 30, foreF: 90, armB: 30, foreB: 90 })),
  'mob-shoulder-band-circles': P(front({ x: 160, armL: -100, foreL: -100, armR: 100, foreR: 100, props: [band('handL', 'handR')] }), front({ x: 160, armL: -170, foreL: -170, armR: 170, foreR: 170, props: [band('handL', 'handR')] })),
  'mob-pelvic-tilts': P(supineKneesBent, { ...supineKneesBent, hip: [150, 186], torso: -84 }),

  // ---------- somatic ----------
  'som-orient': P(seated({ x: 150, head: -30, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, head: 30, armF: 20, foreF: 60, armB: 20, foreB: 60 })),
  'som-ground-feet': P(seated({ x: 150, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, torso: 176, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'arrow', from: [188, 186], to: [188, 200] }] })),
  'som-360-breath': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 95, foreF: 140, armB: 95, foreB: 140 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }]),
  'som-pandiculate': P(supineFlat, supine({ x: 150, thighF: 90, shinF: 90, thighB: 90, shinB: 90, armF: -92, foreF: -92, armB: -92, foreB: -92, head: -6 })),
  'som-arch-flatten': P({ ...supineKneesBent, hip: [150, 186] }, { ...supineKneesBent, hip: [150, 194], torso: -86 }),
  'som-spinal-wave': P(seated({ x: 150, armF: 8, foreF: 8, armB: 8, foreB: 8 }), seated({ x: 150, torso: 120, head: -40, armF: 40, foreF: 40, armB: 40, foreB: 40 })),
  'som-side-reach': P(front({ x: 160, armL: -12, foreL: -12, armR: 175, foreR: 175 }), front({ x: 160, lean: -14, armL: -12, foreL: -12, armR: 200, foreR: 205 })),
  'som-hip-rock': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: -70, foreF: -70, armB: -70, foreB: -70 }), supine({ x: 150, thighF: 120, shinF: -10, thighB: 150, shinB: 10, armF: -70, foreF: -70, armB: -70, foreB: -70 }), [{ kind: 'mat' }]),
  'som-shake': P(stand({ x: 150, thighF: 6, shinF: -6, thighB: 6, shinB: -6, armF: 30, foreF: 40, armB: 42, foreB: 42 }), stand({ x: 150, thighF: 10, shinF: -10, thighB: 10, shinB: -10, armF: 60, foreF: 20, armB: 42, foreB: 42 }), [counter]),
  'som-eye-neck': P(seated({ x: 150, head: 0, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, head: 35, armF: 20, foreF: 60, armB: 20, foreB: 60 })),
  'som-self-hold': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 70, foreF: 150, armB: 110, foreB: 150 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }]),

  // ---------- fascia ----------
  'fas-foot-roll': P(seated({ x: 150, thighF: 82, shinF: 0, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'ball', x: 196, y: 197, r: 7 }] }), seated({ x: 150, thighF: 100, shinF: 0, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'ball', x: 196, y: 197, r: 7 }] })),
  'fas-calf-strip': P(seated({ x: 150, thighF: 100, shinF: -80, thighB: 90, shinB: 0, armF: 60, foreF: 20, armB: 60, foreB: 20 }), seated({ x: 150, thighF: 100, shinF: -80, thighB: 90, shinB: 0, armF: 50, foreF: 60, armB: 50, foreB: 60 })),
  'fas-shin-glide': P(seated({ x: 150, thighF: 90, shinF: 0, torso: 160, armF: 60, foreF: 40, armB: 60, foreB: 40 }), seated({ x: 150, thighF: 90, shinF: 25, torso: 160, armF: 60, foreF: 40, armB: 60, foreB: 40 })),
  'fas-thigh-glide': P(seated({ x: 150, torso: 172, armF: 55, foreF: 70, armB: 55, foreB: 70 }), seated({ x: 150, torso: 172, armF: 75, foreF: 20, armB: 75, foreB: 20 })),
  'fas-hamstring-glide': P(seated({ x: 150, thighF: 90, shinF: 0, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'ball', x: 176, y: 148, r: 7 }] }), seated({ x: 150, thighF: 90, shinF: 85, armF: 20, foreF: 60, armB: 20, foreB: 60, props: [{ kind: 'ball', x: 176, y: 148, r: 7 }] })),
  'fas-glute-ball': P(stand({ x: 150, thighF: 6, shinF: 0, thighB: 6, shinB: 0, armF: 30, foreF: 30, armB: 30, foreB: 30 }), undefined, [{ kind: 'wall', x: 116 }, { kind: 'ball', x: 136, y: 96, r: 8 }]),
  'fas-hip-flexor-pin': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 100, foreF: 130, armB: 100, foreB: 130 }), supine({ x: 150, thighF: 150, shinF: 10, thighB: 135, shinB: 0, armF: 100, foreF: 130, armB: 100, foreB: 130 })),
  'fas-thoracic-roll': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: -110, foreF: -110, armB: -110, foreB: -110 }), undefined, [{ kind: 'roll', x: 104, y: 190 }, { kind: 'pillow', x: 70, y: 194 }]),
  'fas-pec-doorway': P(stand({ x: 150, torso: 176, armF: 60, foreF: 60, armB: 8, foreB: 8 }), stand({ x: 150, torso: 176, armF: 150, foreF: 150, armB: 8, foreB: 8 }), [{ kind: 'wall', x: 214 }, { kind: 'ball', x: 205, y: 60, r: 8 }]),
  'fas-forearm-glide': P(seated({ x: 150, armF: 60, foreF: 90, armB: 40, foreB: 100 }), seated({ x: 150, armF: 60, foreF: 90, armB: 40, foreB: 120 })),
  'fas-suboccipital': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: -140, foreF: -170, armB: -140, foreB: -170 }), undefined),
  'fas-jaw-release': P(seated({ x: 150, armF: 90, foreF: 175, armB: 90, foreB: 175 }), seated({ x: 150, head: 6, armF: 90, foreF: 175, armB: 90, foreB: 175 })),

  // ---------- pelvic floor ----------
  'pel-360-breath': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 100, foreF: 150, armB: 100, foreB: 150 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }]),
  'pel-drop': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: -85, foreF: -85, armB: -85, foreB: -85 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }]),
  'pel-happy-baby': P(supine({ x: 150, thighF: 165, shinF: 160, thighB: 165, shinB: 160, armF: 150, foreF: 175, armB: 150, foreB: 175 }), undefined, [{ kind: 'mat' }]),
  'pel-adductor-rock': P(quadruped({ x: 130, thighB: 90, shinB: 90 }), quadruped({ x: 112, torso: 112, thighB: 100, shinB: 95, armF: 40, foreF: 40, armB: 40, foreB: 40 }), [{ kind: 'mat' }]),
  'pel-hip-circles': P(quadruped({ x: 120 }), quadruped({ x: 128, torso: 108 }), [{ kind: 'mat' }]),
  'pel-deep-squat-breath': P(stand({ x: 140, torso: 160, thighF: 95, shinF: -30, thighB: 95, shinB: -30, armF: 50, foreF: 40, armB: 50, foreB: 40 }), undefined, [counter, { kind: 'block', x: 96, y: 176, w: 34, h: 28 }]),
  'pel-elevator': P(supine({ x: 150, thighF: 135, shinF: 0, thighB: 135, shinB: 0, armF: 100, foreF: 150, armB: 100, foreB: 150 }), undefined, [{ kind: 'pillow', x: 82, y: 190 }, { kind: 'arrow', from: [150, 176], to: [150, 156] }]),
  'pel-bridge-exhale': P({ ...supineKneesBent, props: [{ kind: 'block', x: 176, y: 140, w: 14, h: 22 }] }, { ...supineKneesBent, hip: [150, 172], torso: -76, head: -14, thighF: 118, shinF: -6, thighB: 118, shinB: -6, armF: -95, foreF: -95, armB: -95, foreB: -95, props: [{ kind: 'block', x: 184, y: 132, w: 14, h: 22 }] }),
  'pel-childs-pose-breath': P({ ...kneeling({ x: 130 }), hip: [130, 174], torso: 80, head: 12, thighF: 60, shinF: -90, thighB: 60, shinB: -90, armF: 72, foreF: 86, armB: 72, foreB: 86 }, undefined, [{ kind: 'mat' }, { kind: 'pillow', x: 214, y: 196 }]),
  'pel-sidelying-breath': P(sideLying({ x: 150, thighF: 110, shinF: 30, thighB: 110, shinB: 30, armF: 60, foreF: 140, armB: -60, foreB: -120 }), undefined, [{ kind: 'pillow', x: 84, y: 186 }, { kind: 'pillow', x: 196, y: 170 }]),

  // ---------- mobility ----------
  'mob-neck-cars': P(seated({ x: 150, head: -25, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, head: 25, armF: 20, foreF: 60, armB: 20, foreB: 60 })),
  'mob-shoulder-cars': P(front({ x: 160, armL: -8, foreL: -8, armR: 90, foreR: 90 }), front({ x: 160, armL: -8, foreL: -8, armR: 178, foreR: 178 })),
  'mob-thoracic-rotation': P(seated({ x: 150, armF: 60, foreF: 170, armB: 60, foreB: 170 }), seated({ x: 150, head: 20, armF: 40, foreF: 150, armB: 80, foreB: 190 })),
  'mob-hip-cars': P(stand({ x: 150, thighF: 80, shinF: 0, ...holdCounter }), stand({ x: 150, thighF: -30, shinF: -70, ...holdCounter }), [counter]),
  'mob-90-90': P({ ...supine({ x: 130 }), hip: [130, 190], torso: 175, thighF: 100, shinF: 10, thighB: 60, shinB: -30, armF: -50, foreF: -50, armB: -50, foreB: -50 }, { ...supine({ x: 150 }), hip: [150, 190], torso: 185, thighF: 120, shinF: 30, thighB: 80, shinB: -10, armF: -50, foreF: -50, armB: -50, foreB: -50 }, [{ kind: 'mat' }]),
  'mob-ankle-cars': P(seated({ x: 150, thighF: 70, shinF: 30, armF: 20, foreF: 60, armB: 20, foreB: 60 }), seated({ x: 150, thighF: 70, shinF: 65, armF: 20, foreF: 60, armB: 20, foreB: 60 })),
};

/** True when an exercise has its own drawing. */
export function hasPose(id: string): boolean {
  return id in POSES;
}
