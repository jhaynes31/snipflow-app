import type { MuscleRegion } from '@/domain/types';

export interface RegionInfo {
  id: MuscleRegion;
  name: string;
  muscles: string;
  joints: string;
  dailyLife: string;
  /** SVG shapes for the front and back figure, in a 200x420 viewBox. */
  front?: string;
  back?: string;
}

export const REGIONS: RegionInfo[] = [
  { id: 'neck', name: 'Neck', muscles: 'Deep neck flexors, upper trapezius, levator scapulae', joints: 'Cervical spine', dailyLife: 'Holds the head up all day. Supported indirectly by the upper back; never loaded directly in this program.',
    front: 'M88 58 h24 v22 h-24 z', back: 'M88 58 h24 v22 h-24 z' },
  { id: 'shoulders', name: 'Shoulders', muscles: 'Deltoids, rotator cuff', joints: 'Shoulder (glenohumeral), shoulder blade', dailyLife: 'Reaching for shelves, carrying bags on the shoulder, washing hair.',
    front: 'M56 82 a16 14 0 1 0 32 0 a16 14 0 1 0 -32 0 M112 82 a16 14 0 1 0 32 0 a16 14 0 1 0 -32 0', back: 'M56 82 a16 14 0 1 0 32 0 a16 14 0 1 0 -32 0 M112 82 a16 14 0 1 0 32 0 a16 14 0 1 0 -32 0' },
  { id: 'chest', name: 'Chest', muscles: 'Pectoralis major and minor', joints: 'Shoulder', dailyLife: 'Pushing doors, pushing up from the floor, hugging.',
    front: 'M72 84 h56 v34 h-56 z' },
  { id: 'upper-back', name: 'Upper back', muscles: 'Rhomboids, middle and lower trapezius, lats', joints: 'Thoracic spine, shoulder blade', dailyLife: 'Posture. Pulling a door open, lifting a bag from the floor, supporting the neck.',
    back: 'M72 84 h56 v50 h-56 z' },
  { id: 'arms', name: 'Arms', muscles: 'Biceps, triceps', joints: 'Elbow', dailyLife: 'Carrying groceries, lifting a pan, pushing up from a chair.',
    front: 'M48 96 h18 v56 h-18 z M134 96 h18 v56 h-18 z', back: 'M48 96 h18 v56 h-18 z M134 96 h18 v56 h-18 z' },
  { id: 'forearms', name: 'Forearms & grip', muscles: 'Wrist flexors and extensors', joints: 'Wrist', dailyLife: 'Opening jars, holding dumbbells, gripping a rail.',
    front: 'M46 154 h18 v44 h-18 z M136 154 h18 v44 h-18 z', back: 'M46 154 h18 v44 h-18 z M136 154 h18 v44 h-18 z' },
  { id: 'core', name: 'Core', muscles: 'Transverse abdominis, obliques, rectus abdominis', joints: 'Lumbar spine, pelvis', dailyLife: 'Keeps the trunk steady when you carry, reach or turn. Protects the back.',
    front: 'M74 120 h52 v52 h-52 z' },
  { id: 'lower-back', name: 'Lower back', muscles: 'Erector spinae, multifidus', joints: 'Lumbar spine', dailyLife: 'Holds the spine long when you hinge to lift something.',
    back: 'M76 136 h48 v38 h-48 z' },
  { id: 'hips', name: 'Hips', muscles: 'Hip flexors, adductors, deep rotators', joints: 'Hip', dailyLife: 'Stepping up, turning, sitting down and standing up.',
    front: 'M70 174 h60 v26 h-60 z' },
  { id: 'glutes', name: 'Glutes', muscles: 'Gluteus maximus, medius, minimus', joints: 'Hip', dailyLife: 'Standing up, climbing stairs, keeping the knee straight when you stand on one leg.',
    back: 'M70 176 h60 v40 h-60 z' },
  { id: 'quads', name: 'Thighs (front)', muscles: 'Quadriceps', joints: 'Knee, hip', dailyLife: 'Straightening the knee. Getting out of a chair, going down stairs with control.',
    front: 'M70 202 h26 v90 h-26 z M104 202 h26 v90 h-26 z' },
  { id: 'hamstrings', name: 'Thighs (back)', muscles: 'Hamstrings', joints: 'Knee, hip', dailyLife: 'Hinging to pick things up, slowing the leg when you walk.',
    back: 'M70 218 h26 v76 h-26 z M104 218 h26 v76 h-26 z' },
  { id: 'calves', name: 'Calves', muscles: 'Gastrocnemius, soleus', joints: 'Ankle, knee', dailyLife: 'Push-off in every step. Balance on uneven ground.',
    front: 'M72 304 h22 v70 h-22 z M106 304 h22 v70 h-22 z', back: 'M72 300 h22 v74 h-22 z M106 300 h22 v74 h-22 z' },
  { id: 'ankles-feet', name: 'Ankles & feet', muscles: 'Tibialis anterior, peroneals, intrinsic foot muscles', joints: 'Ankle, foot', dailyLife: 'Catching yourself on a curb. Absorbing every step.',
    front: 'M70 376 h26 v30 h-26 z M104 376 h26 v30 h-26 z', back: 'M70 376 h26 v30 h-26 z M104 376 h26 v30 h-26 z' },
];

export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<MuscleRegion, RegionInfo>;

/** Discomfort locations (Section 9.4) include left/right for limbs. */
export const DISCOMFORT_LOCATIONS = [
  'neck', 'left shoulder', 'right shoulder', 'upper back', 'lower back', 'chest', 'left elbow', 'right elbow', 'left wrist', 'right wrist',
  'left hip', 'right hip', 'left knee', 'right knee', 'left ankle', 'right ankle', 'left foot', 'right foot', 'other',
];
