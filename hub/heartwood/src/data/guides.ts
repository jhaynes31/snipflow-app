import type { Speaker } from '@/coach/messages';
import type { SessionType } from '@/domain/types';

/**
 * The people who speak in Heartwood (2026-09-23). Every guide is written to know
 * how trauma, AuDHD, hypermobility (EDS/HSD), POTS, MCAS and CPTSD shape the body,
 * the mind and the joints, and their lines and exercise notes are held to that.
 */
export interface Guide {
  id: Speaker;
  name: string;
  role: string;
  /** Which session template this guide leads. The coach leads strength; the PT leads the ankle and knee sessions. */
  leads: SessionType[];
  approach: string;
  knows: string[];
}

export const SHARED_TRAINING: string[] = [
  'Trauma and CPTSD: a nervous system that has lived through hard things braces, scans and dissociates. Every guide treats stopping, orienting and leaving early as skills, never as failure, and never pushes past a freeze.',
  'AuDHD: interoception (feeling the body from the inside) can be faint or overwhelming, and transitions are the hardest part. Cues are short, one at a time, and the plan asks for the smallest next step rather than the whole session.',
  'Hypermobility (EDS/HSD): joints go further than they should, so the goal is control of the range you have, never more range. Stretching is replaced by slow, controlled movement and release. Pressure is light, joints are never leaned on.',
  'POTS: standing still, hot rooms and fast position changes spike the heart rate. Every session has a seated or lying version, gets up slowly, and never times a rest standing still.',
  'MCAS: firm pressure, heat and hard effort can trigger a flare. Skin flushing during release work is the sign to lighten up. Water after, always.',
  'How it all connects: a guarded nervous system tightens the jaw, the diaphragm, the hip flexors and the pelvic floor together. Loosen one and the others follow, which is why the four therapies share a breath.',
];

export const GUIDES: Guide[] = [
  {
    id: 'coach', name: 'Coach', role: 'Strength coach', leads: ['strengthA', 'strengthB'],
    approach: 'Strength on the two lifting days: slow tempo, support always within reach, and the load only rises when the last session was clean and comfortable.',
    knows: ['Hypermobile joints need muscle to do what ligaments cannot, so strength is protective, and it is built with control, never speed or bounce.', 'Effort that runs the heart rate up is dosed with seated rests for POTS.', 'A missed week is a comeback, never a debt.'],
  },
  {
    id: 'pt', name: 'PT', role: 'Physical therapist', leads: ['ptAnkles', 'ptKneesHips'],
    approach: 'Ankles, knees and balance: the small, unglamorous work that stops falls and keeps the knees quiet. Progresses only after clean, repeated sessions.',
    knows: ['Balance work starts with two hands on the counter and earns its way to none.', 'The knee is never the whole story; the hip above and the ankle below usually are.', 'Discomfort of 5 or more swaps the exercise and leaves a note for your real-life PT.'],
  },
  {
    id: 'somatic', name: 'Somatic guide', role: 'Somatic movement', leads: ['somatic'],
    approach: 'Nervous system first. Slow movement felt from the inside, orienting, rocking, shaking and self-holding. Nothing is a performance and every step can be skipped.',
    knows: ['Trauma is held as bracing; movements that end in a slow release teach the body it can stop guarding.', 'For AuDHD, feeling the body is a skill that grows with practice, and drifting away is information, not a failure.', 'Pandiculation (tighten, then release slowly) replaces stretching for hypermobile joints.'],
  },
  {
    id: 'fascia', name: 'Fascia guide', role: 'Fascia release', leads: ['fascia'],
    approach: 'Feet to jaw, with hands or a tennis ball, light pressure and slow. The tissue lets go when it feels safe, never when it is forced.',
    knows: ['With EDS the tissue bruises and the joints are never to be leaned on; pressure stays lighter than feels effective.', 'MCAS: warmth and flushing mean stop; water after every session.', 'The jaw, the diaphragm and the pelvic floor release together, so the session ends at the jaw on purpose.'],
  },
  {
    id: 'pelvic', name: 'Pelvic floor therapist', role: 'Pelvic floor', leads: ['pelvicFloor'],
    approach: 'Relax first, coordinate second, strengthen last. Breath-led, all external, all on your terms. Most pelvic floors are holding, not weak.',
    knows: ['Trauma is often stored here; every position is an invitation and there is never internal work.', 'Hypermobility makes an overactive pelvic floor common, so release always comes before any lift, and lifts stay at a third of effort.', 'The pelvic floor and the diaphragm move together, so the breath is the whole method.'],
  },
  {
    id: 'mobility', name: 'Mobility therapist', role: 'Joint mobility', leads: ['ptMobility'],
    approach: 'Controlled rotations joint by joint, neck to ankle, once a week. The goal is to own every degree you already have, not to find more.',
    knows: ['For hypermobile joints, stretching makes things worse and control makes them better; circles shrink if a joint clicks or slips.', 'The neck is never rolled back or loaded.', 'The ankle and knee PT work rides along in this session so the whole body gets covered every week.'],
  },
];

export const GUIDE_MAP: Record<Speaker, Guide> = Object.fromEntries(GUIDES.map((g) => [g.id, g])) as Record<Speaker, Guide>;

/** The guide who leads a session template. */
export function guideForTemplate(t: SessionType): Guide {
  return GUIDES.find((g) => g.leads.includes(t)) ?? GUIDE_MAP.coach;
}

/** The guide who speaks for an exercise, by category. */
export function guideForCategory(cat: 'strength' | 'pt' | 'warmup' | 'cooldown' | 'somatic' | 'fascia' | 'pelvic' | 'mobility'): Guide {
  switch (cat) {
    case 'strength': return GUIDE_MAP.coach;
    case 'somatic': return GUIDE_MAP.somatic;
    case 'fascia': return GUIDE_MAP.fascia;
    case 'pelvic': return GUIDE_MAP.pelvic;
    case 'mobility': return GUIDE_MAP.mobility;
    default: return GUIDE_MAP.pt;
  }
}
