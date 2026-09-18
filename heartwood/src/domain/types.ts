// ---------- Exercise tagging (Section 4.2) ----------

export type MovementPattern =
  | 'squat' | 'hinge' | 'push' | 'pull' | 'carry'
  | 'core-antiextension' | 'core-antirotation' | 'core-lateral'
  | 'balance' | 'mobility' | 'ankle' | 'knee' | 'hip' | 'breathing';

export type Joint = 'neck' | 'shoulder' | 'elbow' | 'wrist' | 'spine' | 'hip' | 'knee' | 'ankle';
export type Impact = 'none' | 'low' | 'high';
export type Stance =
  | 'supine' | 'prone' | 'seated' | 'side-lying' | 'quadruped' | 'kneeling'
  | 'supported-standing' | 'bilateral-standing' | 'single-leg' | 'split';
export type NeckDemand = 'none' | 'low' | 'high';
export type Equipment = 'dumbbell' | 'band' | 'yoga-block' | 'bodyweight' | 'chair' | 'wall' | 'step' | 'counter';
export type SupportLevel = 'two-hands' | 'one-hand' | 'fingertips' | 'none';
export type TimerType = 'hold' | 'tempo' | 'rest' | 'interval' | 'none';

export type ExclusionTag = 'lunge' | 'burpee' | 'crunch' | 'situp' | 'neck-flexion-loaded' | 'plyometric' | 'jumping';
export type CautionTag = 'unsupported-single-leg' | 'deep-knee-flexion' | 'heavy-overhead' | 'step-up';

export type MediaType = 'gif' | 'video' | 'svg' | 'custom';

export interface ExerciseMedia {
  type: MediaType;
  src: string;      // URL, /media path, or a blob key for custom uploads
  credit?: string;
}

export type MuscleRegion =
  | 'neck' | 'upper-back' | 'shoulders' | 'chest' | 'arms' | 'forearms'
  | 'core' | 'lower-back' | 'glutes' | 'hips' | 'quads' | 'hamstrings' | 'calves' | 'ankles-feet';

export interface Exercise {
  id: string;
  name: string;
  summary: string;
  steps: string[];
  cues: string[];
  mistakes: string[];
  whyItMatters: string;
  media: ExerciseMedia[];
  movementPatterns: MovementPattern[];
  jointsLoaded: Joint[];
  impact: Impact;
  stance: Stance;
  neckDemand: NeckDemand;
  equipment: Equipment[];
  supportLevel?: SupportLevel;
  exclusionTags: ExclusionTag[];
  cautionTags: CautionTag[];
  timerType: TimerType;
  /** Default prescription; the generator overrides sets/reps by phase. */
  defaultReps?: number;
  defaultHoldSeconds?: number;
  regressionId?: string;
  progressionId?: string;
  lessonIds: string[];
  musclesPrimary: MuscleRegion[];
  musclesSecondary: MuscleRegion[];
  unilateral: boolean;
  /** Category used by templates and the "swap" engine. */
  category: 'strength' | 'pt' | 'warmup' | 'cooldown';
  /** For user-added "My PT's exercises". */
  custom?: boolean;
}

// ---------- Program ----------

export type SessionType = 'strengthA' | 'strengthB' | 'ptAnkles' | 'ptKneesHips' | 'ptMobility' | 'freestyle';

export interface TemplateBlock {
  kind: 'warmup' | 'main' | 'cooldown';
  /** Ordered exercise ids. The generator substitutes as needed. */
  exerciseIds: string[];
}

export interface SessionTemplate {
  id: SessionType;
  name: string;
  shortName: string;
  blocks: TemplateBlock[];
  estimatedMinutes: number;
}

export type Phase = 'foundation' | 'build' | 'maintain';

export interface Prescription {
  exerciseId: string;
  sets: number;
  reps?: number;
  holdSeconds?: number;
  weight?: number;        // kg or lb per user unit
  bandLevel?: string;
  supportLevel?: SupportLevel;
  side?: 'left' | 'right' | 'both';
  restSeconds: number;
  block: 'warmup' | 'main' | 'cooldown';
  /** Which exercise this one was swapped in for (if any). */
  substitutedFor?: string;
}

export interface PlannedSession {
  id: string;
  templateId: SessionType;
  /** Global order in the program. Sessions run in sequence, not dates. */
  sequenceIndex: number;
  /** ISO date the generator currently suggests for it. */
  scheduledDate: string;
  status: 'planned' | 'in-progress' | 'completed' | 'skipped' | 'partial';
  prescriptions: Prescription[];
  phase: Phase;
  weekNumber: number;
  isRecoveryWeek: boolean;
  isComeback: boolean;
  fiveMinute?: boolean;
  /** Freestyle sessions: chosen body areas and time budget. */
  focusAreas?: string[];
  minutes?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface SetLog {
  id?: number;
  sessionId: string;
  exerciseId: string;
  side?: 'left' | 'right';
  setNumber: number;
  reps?: number;
  weight?: number;
  bandLevel?: string;
  holdSeconds?: number;
  supportLevel?: SupportLevel;
  effort: number;         // 1-10
  discomfort: number;     // 0-10
  discomfortLocations: string[];
  loggedAt: string;
}

// ---------- Profile ----------

export type Goal = 'strength' | 'balance' | 'joint-health' | 'feel-better';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
export type SabbathDay = 'sat' | 'sun';
export type CoachTone = 'gentle' | 'fierce' | 'calm';
export type CritiqueLevel = 'off' | 'light' | 'detailed';
export type VoiceMode = 'on' | 'off' | 'cues';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface EquipmentProfile {
  dumbbellWeights: number[];      // ascending
  weightUnit: 'lb' | 'kg';
  bandLevels: string[];           // ascending, e.g. ['light','medium','heavy']
  yogaBlocks: boolean;
  chair: boolean;
  counter: boolean;
  wall: boolean;
  step: boolean;
}

export interface BodyHistory {
  neckIssues: boolean;
  balanceIssues: boolean;
  ankleHistory: boolean;
  leftKneeInjury: boolean;
  rightKneeInjury: boolean;
  painAreas: string[];        // body map region ids
  tightnessAreas: string[];
  pastInjuryAreas: string[];
  notes: string;
}

export interface CoachSettings {
  tone: CoachTone;
  critique: CritiqueLevel;
  voice: VoiceMode;
  faithTrack: boolean;
  coachDesign: 'oak' | 'willow' | 'cedar';
  ptDesign: 'fern' | 'moss' | 'river';
}

export interface SensorySettings {
  reducedMotion: boolean;
  soundCues: boolean;
  vibrationCues: boolean;
  visualIntensity: 'soft' | 'normal';
  outdoorMode: boolean;
  keepScreenAwake: boolean;
  remindersEnabled: boolean;
  reminderTime?: string;
}

/** A restriction entered from a real PT. Feeds the filter engine. */
export interface PTRestriction {
  id: string;
  label: string;
  /** Exclude exercises loading any of these joints. */
  avoidJoints?: Joint[];
  /** Exclude exercises with any of these patterns. */
  avoidPatterns?: MovementPattern[];
  /** Exclude specific exercises by id. */
  avoidExerciseIds?: string[];
  /** Exclude specific stances. */
  avoidStances?: Stance[];
  notes?: string;
}

export interface PTPlan {
  ptName?: string;
  restrictions: PTRestriction[];
  customExerciseIds: string[];
  notes: string;
  scheduleInto: SessionType[];
}

export interface UserProfile {
  id: 'me';
  /** Which person this database belongs to. */
  userId?: 'her' | 'john';
  bodyType?: 'woman' | 'man';
  name: string;
  goals: Goal[];
  sessionLength: 15 | 25 | 35 | 45;
  preferredDays: Weekday[];
  sabbathDay: SabbathDay;
  equipment: EquipmentProfile;
  bodyHistory: BodyHistory;
  ptPlan: PTPlan;
  why: { text?: string; audioKey?: string };
  coachSettings: CoachSettings;
  themeMode: ThemeMode;
  sensorySettings: SensorySettings;
  unlockedCautions: CautionTag[];
  onboardingStep: number;
  onboardingComplete: boolean;
  createdAt: string;
  programStartDate?: string;
  maintainMode: boolean;
}

// ---------- Weeks / assessments / events ----------

export interface WeekSettings {
  weekStart: string;         // ISO date of Monday
  sabbathDay: SabbathDay;
  askedAt?: string;
}

export type AssessmentRating = 'easy' | 'okay' | 'hard' | 'painful';

export interface AssessmentResult {
  testId: string;
  side?: 'left' | 'right';
  value?: number;            // count or seconds
  rating: AssessmentRating;
}

export interface Assessment {
  id?: number;
  date: string;
  results: AssessmentResult[];
  kind: 'onboarding' | 'reassessment' | 'comeback-check';
}

export interface RedFlagEvent {
  id?: number;
  date: string;
  symptom: string;
  notes: string;
  clearedDate?: string;
  emergency: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  content: string[];
  unlockedBy: string;
  unlockedAt?: string;
}

export interface LessonUnlock {
  lessonId: string;
  unlockedAt: string;
}

export interface TreeState {
  id: 'tree';
  growthPoints: number;
  rootPoints: number;
  milestones: string[];
  totalSessions: number;
}

/** Per-exercise progression state (per side for unilateral). */
export interface ProgressionState {
  key: string;               // `${exerciseId}` or `${exerciseId}:${side}`
  exerciseId: string;
  side?: 'left' | 'right';
  weight?: number;
  bandLevel?: string;
  supportLevel?: SupportLevel;
  holdSeconds?: number;
  consecutiveSuccesses: number;
  flaggedForPT: boolean;
  updatedAt: string;
}

export interface CustomMedia {
  key: string;
  blob: Blob;
  mime: string;
  createdAt: string;
}
