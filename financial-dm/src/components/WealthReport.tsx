export interface WealthOption {
  text: string;
  points: number;
}

export interface WealthQuestion {
  key: string;
  label: string;
  question: string;
  dm: string;
  options: WealthOption[];
}

export const WEALTH_QUESTIONS: WealthQuestion[] = [
  {
    key: "emergency_fund",
    label: "Emergency Fund",
    question: "How many months could you cover your expenses if you lost your income today?",
    dm: "How many moons could ye survive if thy coin stream ran dry?",
    options: [
      { text: "Paycheck to paycheck", points: 0 },
      { text: "1 to 3 months", points: 4 },
      { text: "3 to 6 months", points: 7 },
      { text: "6+ months: solid fund", points: 10 },
    ],
  },
  {
    key: "budgeting",
    label: "Budgeting",
    question: "Do you track where your money goes each month?",
    dm: "Dost thou track thine gold pieces spent each month?",
    options: [
      { text: "I have no idea", points: 0 },
      { text: "Occasionally", points: 3 },
      { text: "Roughly", points: 7 },
      { text: "Every dollar accounted for", points: 10 },
    ],
  },
  {
    key: "debt_burden",
    label: "Debt Burden",
    question: "What percentage of your monthly income goes toward debt payments?",
    dm: "What share of thy monthly treasure goes to debt?",
    options: [
      { text: "More than 50%", points: 0 },
      { text: "30 to 50%", points: 3 },
      { text: "10 to 30%", points: 7 },
      { text: "Less than 10% or debt free", points: 10 },
    ],
  },
  {
    key: "credit_awareness",
    label: "Credit Awareness",
    question: "Do you know your credit score range?",
    dm: "Knowest thou thy credit score range?",
    options: [
      { text: "I'm afraid to look", points: 0 },
      { text: "Below 600", points: 3 },
      { text: "600 to 700", points: 7 },
      { text: "700+", points: 10 },
    ],
  },
  {
    key: "retirement",
    label: "Retirement",
    question: "Are you actively saving for retirement?",
    dm: "Hast thou begun hoarding gold for thy elder years?",
    options: [
      { text: "Not yet", points: 0 },
      { text: "Just starting", points: 3 },
      { text: "Consistent contributions", points: 7 },
      { text: "Maxing out accounts", points: 10 },
    ],
  },
  {
    key: "investing",
    label: "Investing",
    question: "How diversified are your investments?",
    dm: "How spread out is thy treasure across different holdings?",
    options: [
      { text: "I don't invest / all in one place", points: 0 },
      { text: "One type only", points: 3 },
      { text: "Some diversification", points: 7 },
      { text: "Well diversified", points: 10 },
    ],
  },
  {
    key: "insurance",
    label: "Insurance",
    question: "Do you have adequate insurance (health, life, home/renters)?",
    dm: "Hath thou warded thyself against calamity?",
    options: [
      { text: "No, I'm uninsured", points: 0 },
      { text: "Minimal coverage", points: 3 },
      { text: "Adequate protection", points: 7 },
      { text: "Fully covered", points: 10 },
    ],
  },
  {
    key: "financial_goals",
    label: "Financial Goals",
    question: "Do you have written financial goals?",
    dm: "Hast thou inscribed thy financial quests on parchment?",
    options: [
      { text: "No goals", points: 0 },
      { text: "Vague ideas", points: 3 },
      { text: "Some written down", points: 7 },
      { text: "Detailed plan with milestones", points: 10 },
    ],
  },
  {
    key: "estate_planning",
    label: "Estate Planning",
    question: "Do you have a will or estate plan in place?",
    dm: "Hast thou prepared thy kingdom for when thou art gone?",
    options: [
      { text: "Nothing", points: 0 },
      { text: "I've thought about it", points: 3 },
      { text: "Basic will", points: 7 },
      { text: "Full estate plan", points: 10 },
    ],
  },
  {
    key: "net_worth",
    label: "Net Worth",
    question: "Is your net worth growing year over year?",
    dm: "Is thy treasure growing year by year?",
    options: [
      { text: "Shrinking / don't know", points: 0 },
      { text: "Staying flat", points: 3 },
      { text: "Growing slowly", points: 7 },
      { text: "Growing strongly", points: 10 },
    ],
  },
];

interface DragonTier {
  min: number;
  image: string;
  emoji: string;
  name: string;
  tagline: string;
}

const TIERS: DragonTier[] = [
  {
    min: 90,
    image: "/dragons/platinum-dragon.png",
    emoji: "🐉",
    name: "Platinum Dragon",
    tagline: "Your financial kingdom is legendary. Few adventurers reach this tier.",
  },
  {
    min: 80,
    image: "/dragons/gold-dragon.png",
    emoji: "🐉",
    name: "Gold Dragon",
    tagline: "A mighty hoard indeed. Your foundations are strong.",
  },
  {
    min: 70,
    image: "/dragons/silver-dragon.png",
    emoji: "🐉",
    name: "Silver Dragon",
    tagline: "You're on the right path. A few quests remain.",
  },
  {
    min: 60,
    image: "/dragons/bronze-dragon.png",
    emoji: "🐉",
    name: "Bronze Dragon",
    tagline: "Your journey has begun, but many trials await.",
  },
  {
    min: 0,
    image: "/dragons/copper-hatchling.png",
    emoji: "🥚",
    name: "Copper Hatchling",
    tagline: "Every dragon starts small. Time to seek wisdom from a seasoned DM.",
  },
];

interface CategoryTips {
  high: string;
  mid: string;
  low: string;
}

const TIPS: Record<string, CategoryTips> = {
  emergency_fund: {
    high: "A solid fund shields thee from life's ambushes. Well played, adventurer.",
    mid: "Thine emergency fund grows. Aim for 3 to 6 months of expenses to weather any storm.",
    low: "Start small: save one month of expenses first. Even a few hundred gold pieces begins the quest.",
  },
  budgeting: {
    high: "Thou knowest where every gold piece roams. A true master of the ledger.",
    mid: "Sharpen thy tracking: commit to a monthly budget and watch where coins slip away.",
    low: "First step: track every expense for one week. Awareness is the first victory.",
  },
  debt_burden: {
    high: "Debt doth not weigh thee down. Thy treasure works for thee, not against thee.",
    mid: "Battle thy debt: target the highest interest foe first while keeping minimums paid.",
    low: "Name thy debts, smallest first. Slaying one small debt builds momentum and morale.",
  },
  credit_awareness: {
    high: "Thou knowest thy credit number well. Knowledge is power over thy score.",
    mid: "Check thy credit report free each year. Know thy number before seeking new quests.",
    low: "Do not fear the scroll: pull a free credit report and learn thy starting number.",
  },
  retirement: {
    high: "Thy elder years are fortified. Future thee bows in gratitude.",
    mid: "Increase thy retirement contributions by 1%. Small boosts compound into mountains.",
    low: "Begin the hoard: open a retirement account and set any automatic contribution, however small.",
  },
  investing: {
    high: "Thy treasure is spread wide across many holdings. Wise and resilient.",
    mid: "Diversify further: consider low cost index funds so no single coin decides thy fate.",
    low: "Start simple: a low cost index fund spreads thy risk across hundreds of companies.",
  },
  insurance: {
    high: "Thou art warded against calamity. Thy party can quest without fear.",
    mid: "Gaps remain in thy wards: review health, life, and home/renters coverage this season.",
    low: "Seek thy first ward: a life insurance quote plus renters and health coverage close the biggest gaps.",
  },
  financial_goals: {
    high: "Thy quests are inscribed on parchment with milestones. Few plan this well.",
    mid: "Write down thy top three goals with one milestone each. Parchment makes goals real.",
    low: "Inscribe one financial goal tonight and give it a deadline. A quest without a map is just wandering.",
  },
  estate_planning: {
    high: "Thy kingdom is prepared for thy passing. A rare and noble deed.",
    mid: "Draft a basic will. It names thy heirs and spares thy party the courts' labyrinth.",
    low: "First step: name beneficiaries on thy accounts and jot down thy wishes. Even a simple will helps.",
  },
  net_worth: {
    high: "Thy treasure grows strong year by year. A dragon's hoard in the making.",
    mid: "Push thy net worth upward: add a little more to savings or debt payoff each moon.",
    low: "Take stock: list thy assets and debts to learn thy true net worth. It is the first map of thy hoard.",
  },
};

export function tierForScore(score: number): DragonTier {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

export function computeScore(scores: Record<string, number>): number {
  const total = Object.values(scores).reduce((sum, v) => sum + (Number(v) || 0), 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

interface WealthReportProps {
  scores: Record<string, number>;
  onCTA: () => void;
}

export default function WealthReport({ scores, onCTA }: WealthReportProps) {
  const total = computeScore(scores);
  const tier = tierForScore(total);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 animate-slide-in">
      {/* Dragon hero */}
      <div className="relative w-full max-w-sm">
        <div
          className="absolute inset-0 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(192,128,32,0.35) 0%, transparent 70%)" }}
        />
        <img
          src={tier.image}
          alt={tier.name}
          className="relative w-full h-auto rounded-2xl shadow-2xl shadow-black/50 border border-[#406080]/30"
        />
      </div>

      {/* Score + tier */}
      <div className="text-center animate-slide-in">
        <div className="text-6xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 30px rgba(192,128,32,0.4)" }}>
          {total}
          <span className="text-2xl text-[#808080]">/100</span>
        </div>
        <h2 className="mt-2 text-3xl font-fantasy text-[#e0e0e0]">
          {tier.emoji} {tier.name}
        </h2>
        <p className="mt-2 text-[#a0a0a0] font-fantasy max-w-sm mx-auto leading-relaxed">
          {tier.tagline}
        </p>
      </div>

      {/* Category breakdown */}
      <div className="w-full space-y-3">
        <h3 className="text-center text-sm font-fantasy uppercase tracking-widest text-[#c08020]">
          ⚜ Quest Report ⚜
        </h3>
        {WEALTH_QUESTIONS.map((q) => {
          const pts = Math.max(0, Math.min(10, Number(scores[q.key]) || 0));
          const tips = TIPS[q.key];
          const band = pts >= 7 ? "high" : pts >= 4 ? "mid" : "low";
          const tip = tips[band];
          const barColor =
            band === "high" ? "#c08020" : band === "mid" ? "#8fb0e8" : "#a05030";
          return (
            <div
              key={q.key}
              className="rounded-lg border border-[#406080]/30 bg-[#162030]/60 p-3.5 animate-slide-in"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-fantasy text-[#e0e0e0]">{q.label}</span>
                <span className="text-xs font-fantasy text-[#c08020] whitespace-nowrap">
                  {pts}/10
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#204060]/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pts * 10}%`, backgroundColor: barColor }}
                />
              </div>
              <p className="mt-2 text-xs text-[#a0a0a0] leading-relaxed">
                {tip}
              </p>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <button
        onClick={onCTA}
        className="w-full max-w-sm px-6 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider animate-slide-in"
      >
        🎲 Consult Thy Financial DM
      </button>
      <p className="text-[#606080] text-xs text-center font-fantasy">
        A free council with no pressure on thy next financial quest.
      </p>
    </div>
  );
}
