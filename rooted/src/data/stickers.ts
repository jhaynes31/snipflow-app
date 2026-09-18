/**
 * Sticker book (completion stickers). After a session the user picks a sticker
 * for that day and it goes on the monthly sticker chart. Packs unlock as she
 * trains. Unlocks are derived from lifetime stats, so they are retroactive and
 * can never be lost. No unlock is ever tied to a streak (Section 14).
 */

export type UnlockRule =
  | { kind: 'start' }
  | { kind: 'sessions'; count: number }          // lifetime completed or partial sessions
  | { kind: 'pt-sessions'; count: number }
  | { kind: 'strength-sessions'; count: number }
  | { kind: 'roots'; count: number }             // rest / Sabbath days recorded
  | { kind: 'progressions'; count: number }      // times a load went up
  | { kind: 'balance-progressions'; count: number }
  | { kind: 'lessons'; count: number }
  | { kind: 'reassessments'; count: number }
  | { kind: 'comebacks'; count: number };        // comeback sessions completed

export interface StickerPack { id: string; name: string; blurb: string; unlock: UnlockRule }
export interface Sticker { id: string; emoji: string; name: string; pack: string }

export interface StickerStats {
  sessions: number; ptSessions: number; strengthSessions: number; roots: number;
  progressions: number; balanceProgressions: number; lessons: number; reassessments: number; comebacks: number;
}

export const EMPTY_STATS: StickerStats = { sessions: 0, ptSessions: 0, strengthSessions: 0, roots: 0, progressions: 0, balanceProgressions: 0, lessons: 0, reassessments: 0, comebacks: 0 };

export const PACKS: StickerPack[] = [
  { id: 'sprouts', name: 'Sprouts', blurb: 'Yours from day one.', unlock: { kind: 'start' } },
  { id: 'garden', name: 'Garden', blurb: 'Three PT sessions tended.', unlock: { kind: 'pt-sessions', count: 3 } },
  { id: 'forest-friends', name: 'Forest friends', blurb: 'Five sessions, lifetime.', unlock: { kind: 'sessions', count: 5 } },
  { id: 'steady-roots', name: 'Steady roots', blurb: 'Four rest days honoured.', unlock: { kind: 'roots', count: 4 } },
  { id: 'golden-hour', name: 'Golden hour', blurb: 'Ten sessions, lifetime.', unlock: { kind: 'sessions', count: 10 } },
  { id: 'strong', name: 'Strong', blurb: 'The first time a weight or band went up.', unlock: { kind: 'progressions', count: 1 } },
  { id: 'balance', name: 'Balance', blurb: 'The first time a balance hold needed less support.', unlock: { kind: 'balance-progressions', count: 1 } },
  { id: 'scholar', name: 'Scholar', blurb: 'Five lessons unlocked.', unlock: { kind: 'lessons', count: 5 } },
  { id: 'comeback', name: 'Comeback', blurb: 'You came back after a gap. That is the skill.', unlock: { kind: 'comebacks', count: 1 } },
  { id: 'harvest', name: 'Harvest', blurb: 'Your first reassessment.', unlock: { kind: 'reassessments', count: 1 } },
  { id: 'grove', name: 'Grove', blurb: 'Twenty-five sessions, lifetime.', unlock: { kind: 'sessions', count: 25 } },
  { id: 'summit', name: 'Summit', blurb: 'Fifty sessions, lifetime.', unlock: { kind: 'sessions', count: 50 } },
];

const s = (pack: string, list: [string, string][]): Sticker[] => list.map(([emoji, name]) => ({ id: `${pack}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, emoji, name, pack }));

export const STICKERS: Sticker[] = [
  ...s('sprouts', [['🌱', 'Sprout'], ['☀️', 'Sunshine'], ['🍃', 'Leaf'], ['🌼', 'Daisy'], ['⭐', 'Star'], ['💪', 'Strong arm'], ['🐞', 'Ladybug'], ['🌈', 'Rainbow'], ['🍄', 'Mushroom'], ['🐝', 'Bee'], ['🪨', 'River stone'], ['💧', 'Dewdrop']]),
  ...s('garden', [['🌷', 'Tulip'], ['🌻', 'Sunflower'], ['🌹', 'Rose'], ['🌺', 'Hibiscus'], ['🥕', 'Carrot'], ['🍓', 'Strawberry']]),
  ...s('forest-friends', [['🦊', 'Fox'], ['🦌', 'Deer'], ['🦉', 'Owl'], ['🐿️', 'Squirrel'], ['🐇', 'Rabbit'], ['🦔', 'Hedgehog']]),
  ...s('steady-roots', [['🌳', 'Oak'], ['🌲', 'Pine'], ['🪵', 'Log'], ['🍂', 'Autumn leaf'], ['🏡', 'Home'], ['☕', 'Tea']]),
  ...s('golden-hour', [['🌅', 'Sunrise'], ['🌄', 'Dawn hills'], ['🌤️', 'Sun and cloud'], ['🔥', 'Hearth'], ['🕯️', 'Candle'], ['🌟', 'Glow']]),
  ...s('strong', [['🏋️', 'Lifter'], ['🦵', 'Leg day'], ['🧗', 'Climber'], ['🏔️', 'Peak'], ['🛡️', 'Shield'], ['🦁', 'Lion']]),
  ...s('balance', [['🦩', 'Flamingo'], ['🧘', 'Stillness'], ['🪶', 'Feather'], ['🎋', 'Bamboo'], ['🦢', 'Swan'], ['🪁', 'Kite']]),
  ...s('scholar', [['📖', 'Book'], ['🔍', 'Lens'], ['💡', 'Idea'], ['🧠', 'Brain'], ['🦋', 'Butterfly'], ['🗝️', 'Key']]),
  ...s('comeback', [['🐢', 'Turtle'], ['🌦️', 'Sun after rain'], ['🧭', 'Compass'], ['🕊️', 'Dove'], ['🚪', 'Open door'], ['🌙', 'Moon']]),
  ...s('harvest', [['🍎', 'Apple'], ['🌾', 'Wheat'], ['🎃', 'Pumpkin'], ['🍯', 'Honey'], ['🧺', 'Basket'], ['🍁', 'Maple']]),
  ...s('grove', [['🐦', 'Songbird'], ['🦜', 'Parrot'], ['🐸', 'Frog'], ['🦎', 'Lizard'], ['🐌', 'Snail'], ['🌸', 'Blossom']]),
  ...s('summit', [['🏆', 'Trophy'], ['👑', 'Crown'], ['🎉', 'Celebration'], ['🎈', 'Balloon'], ['🎗️', 'Ribbon'], ['💎', 'Gem']]),
];

export const STICKER_MAP = Object.fromEntries(STICKERS.map((x) => [x.id, x])) as Record<string, Sticker>;
export const PACK_MAP = Object.fromEntries(PACKS.map((p) => [p.id, p])) as Record<string, StickerPack>;

export function ruleMet(rule: UnlockRule, st: StickerStats): boolean {
  switch (rule.kind) {
    case 'start': return true;
    case 'sessions': return st.sessions >= rule.count;
    case 'pt-sessions': return st.ptSessions >= rule.count;
    case 'strength-sessions': return st.strengthSessions >= rule.count;
    case 'roots': return st.roots >= rule.count;
    case 'progressions': return st.progressions >= rule.count;
    case 'balance-progressions': return st.balanceProgressions >= rule.count;
    case 'lessons': return st.lessons >= rule.count;
    case 'reassessments': return st.reassessments >= rule.count;
    case 'comebacks': return st.comebacks >= rule.count;
  }
}

/** Progress toward a rule as [have, need]; [1,1] for 'start'. */
export function ruleProgress(rule: UnlockRule, st: StickerStats): [number, number] {
  switch (rule.kind) {
    case 'start': return [1, 1];
    case 'sessions': return [Math.min(st.sessions, rule.count), rule.count];
    case 'pt-sessions': return [Math.min(st.ptSessions, rule.count), rule.count];
    case 'strength-sessions': return [Math.min(st.strengthSessions, rule.count), rule.count];
    case 'roots': return [Math.min(st.roots, rule.count), rule.count];
    case 'progressions': return [Math.min(st.progressions, rule.count), rule.count];
    case 'balance-progressions': return [Math.min(st.balanceProgressions, rule.count), rule.count];
    case 'lessons': return [Math.min(st.lessons, rule.count), rule.count];
    case 'reassessments': return [Math.min(st.reassessments, rule.count), rule.count];
    case 'comebacks': return [Math.min(st.comebacks, rule.count), rule.count];
  }
}

export function unlockedPacks(st: StickerStats): StickerPack[] {
  return PACKS.filter((p) => ruleMet(p.unlock, st));
}

export function unlockedStickers(st: StickerStats): Sticker[] {
  const ok = new Set(unlockedPacks(st).map((p) => p.id));
  return STICKERS.filter((x) => ok.has(x.pack));
}

/** Packs that became available between two stat snapshots. */
export function newlyUnlockedPacks(before: StickerStats, after: StickerStats): StickerPack[] {
  return PACKS.filter((p) => !ruleMet(p.unlock, before) && ruleMet(p.unlock, after));
}
