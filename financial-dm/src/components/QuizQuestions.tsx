interface QuizQuestionsProps {
  questionIndex: number;
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  onNext: () => void;
}

interface Question {
  key: string;
  label: string;
  question: string;
  dm: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    key: "age_range",
    label: "Thy Age",
    question: "How old are you?",
    dm: "How many winters hast thou braved?",
    options: ["Under 25", "25 to 34", "35 to 44", "45 to 54", "55+"],
  },
  {
    key: "dependents",
    label: "Thy Party",
    question: "How many people depend on you financially?",
    dm: "How many souls look to thee for protection?",
    options: ["0", "1 to 2", "3+"],
  },
  {
    key: "has_insurance",
    label: "Current Shield",
    question: "Do you already have life insurance?",
    dm: "Dost thou carry a shield, or dost thou face the dragon unarmored?",
    options: ["Yes", "No"],
  },
  {
    key: "biggest_concern",
    label: "Thy Fear",
    question: "What worries you most about the future?",
    dm: "Which dragon keeps thee awake at night?",
    options: [
      "Income replacement",
      "Debt payoff",
      "Funeral costs",
      "Kids' future",
      "Other",
    ],
  },
  {
    key: "timeline",
    label: "Thy Timing",
    question: "How soon do you want coverage in place?",
    dm: "When dost thou wish to don this armor?",
    options: ["Just exploring", "Within the next month", "As soon as possible"],
  },
  {
    key: "coverage_amount",
    label: "Thy Hoard",
    question: "How much life insurance coverage are you considering?",
    dm: "What treasure should thy loved ones inherit shouldst thou fall?",
    options: [
      "Under $250,000",
      "$250,000 to $500,000",
      "$500,000 to $1,000,000",
      "$1,000,000+",
    ],
  },
  {
    key: "health",
    label: "Thy Constitution",
    question: "How would you rate your overall health?",
    dm: "How sturdy is thy body's armor against time's ravages?",
    options: ["Excellent", "Good", "Fair", "Poor"],
  },
  {
    key: "tobacco",
    label: "Thy Habits",
    question: "Do you use tobacco or nicotine products?",
    dm: "Does thy breath carry the smoke of a dragon's lair?",
    options: ["No, never", "Occasionally", "Yes, regularly"],
  },
  {
    key: "monthly_budget",
    label: "Thy Gold",
    question: "What could you comfortably spend each month on coverage?",
    dm: "How many gold coins canst thou part with each moon?",
    options: ["Under $50", "$50 to $100", "$100 to $200", "$200+"],
  },
  {
    key: "household_income",
    label: "Thy Keep",
    question: "What is your household income?",
    dm: "How full is the river of gold flowing into thy keep?",
    options: [
      "Under $50,000",
      "$50,000 to $100,000",
      "$100,000 to $200,000",
      "$200,000+",
    ],
  },
];

export default function QuizQuestions({
  questionIndex,
  answers,
  onAnswer,
  onNext,
}: QuizQuestionsProps) {
  const q = QUESTIONS[questionIndex];
  const selected = answers[q.key];

  const handleSelect = (opt: string) => {
    onAnswer(q.key, opt);
  };

  return (
    <div
      key={questionIndex}
      className="flex flex-col items-center gap-5 w-full max-w-md mx-auto px-4 animate-slide-in"
    >
      {/* Progress */}
      <div className="w-full flex flex-col gap-2 items-center">
        <div className="w-full flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < questionIndex
                  ? "bg-[#c08020]"
                  : i === questionIndex
                    ? "bg-[#c08020] animate-pulse"
                    : "bg-[#204060]/40"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-[#a0a0a0] font-fantasy tracking-wider uppercase">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </p>
      </div>

      {/* Parchment card */}
      <div
        className="w-full rounded-xl border-2 border-[#8b6914]/60 shadow-2xl shadow-black/40 p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(165deg, #f5e6c8 0%, #ead5a8 55%, #ddc38d 100%)",
          boxShadow:
            "inset 0 0 40px rgba(139,105,20,0.25), 0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex items-center justify-between text-[#8b6914] opacity-70 text-sm select-none">
          <span>❦</span>
          <span className="font-fantasy tracking-widest text-xs uppercase">
            {q.label}
          </span>
          <span>❦</span>
        </div>

        <h2 className="mt-3 text-xl sm:text-2xl font-bold text-[#3a2c1a] text-center leading-snug">
          {q.question}
        </h2>
        <p className="mt-2 text-sm italic text-[#7a5f30] text-center font-fantasy leading-relaxed">
          “{q.dm}”
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {q.options.map((opt) => {
            const isSelected = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left font-medium transition-all duration-200 ${
                  isSelected
                    ? "border-[#3a2c1a] bg-[#3a2c1a] text-[#f5e6c8] shadow-lg"
                    : "border-[#8b6914]/40 bg-[#fdf3dc]/60 text-[#4a3820] hover:border-[#8b6914]/80 hover:bg-[#fdf3dc]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onNext}
            disabled={!selected}
            className={`px-6 py-2.5 rounded-lg font-fantasy text-sm transition-all ${
              selected
                ? "bg-[#8b6914] hover:bg-[#6f5310] text-[#fdf3dc] font-bold shadow-lg shadow-[#8b6914]/30"
                : "bg-[#c9b27e]/50 text-[#8a7a58] cursor-not-allowed"
            }`}
          >
            {questionIndex === QUESTIONS.length - 1
              ? "Reveal Thy Character →"
              : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { QUESTIONS };
