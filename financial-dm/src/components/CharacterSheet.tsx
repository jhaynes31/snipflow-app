import { useCallback } from "react";

interface Answers {
  age_range: string;
  dependents: string;
  has_insurance: string;
  biggest_concern: string;
  timeline: string;
  coverage_amount: string;
  health: string;
  tobacco: string;
  monthly_budget: string;
  household_income: string;
}

interface CharacterData {
  className: string;
  level: string;
  quest: string;
}

function deriveCharacter(answers: Answers): CharacterData {
  const { age_range, dependents, biggest_concern, timeline, health } = answers;
  const hasDeps = dependents !== "0";

  // Class derivation
  let className = "Seeker";
  if (hasDeps && biggest_concern === "Income replacement") className = "Protector";
  else if (hasDeps && biggest_concern === "Kids' future") className = "Guardian";
  else if (!hasDeps && timeline === "Just exploring") className = "Sage";
  else if (hasDeps && biggest_concern === "Debt payoff") className = "Defender";
  // "Other" or any other combo → Seeker

  // Level derivation, with health factored in
  let level = "Adventurer";
  if (age_range === "Under 25") {
    level =
      health === "Excellent"
        ? "Young Prodigy"
        : health === "Good"
          ? "Rising Adventurer"
          : "Young Adventurer";
  } else if (
    (age_range === "25 to 34" || age_range === "35 to 44") &&
    dependents === "1 to 2"
  ) {
    level = health === "Excellent" ? "New Parent Hero" : "New Parent";
  } else if (
    (age_range === "35 to 44" || age_range === "45 to 54") &&
    dependents === "3+"
  ) {
    level = "Party Leader";
  } else if (age_range === "55+") {
    level = "Veteran";
  } else if (!hasDeps) {
    level = "Solo Runner";
  }

  // Quest derivation
  const questMap: Record<string, string> = {
    "Income replacement": "Income Replacement",
    "Debt payoff": "Debt Conquest",
    "Funeral costs": "Final Peace",
    "Kids' future": "Future Builder",
    Other: "The Unknown Path",
  };
  const quest = questMap[biggest_concern] || "The Unknown Path";

  return { className, level, quest };
}

function generateShareSVG(char: CharacterData, answers: Answers): string {
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="540" viewBox="0 0 600 540">`,
    `<defs>`,
    `<filter id="parchment"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/><feColorMatrix type="saturate" values="0" in="noise" result="gray"/><feBlend in="SourceGraphic" in2="gray" mode="multiply" result="blend"/></filter>`,
    `</defs>`,
    `<rect width="600" height="540" fill="#1a0e0e"/>`,
    `<rect x="20" y="20" width="560" height="480" fill="#f5e6c8" rx="8" filter="url(#parchment)"/>`,
    `<rect x="20" y="20" width="560" height="480" fill="none" stroke="#8b6914" stroke-width="2" rx="8"/>`,
    `<text x="300" y="70" text-anchor="middle" font-family="serif" font-size="32" font-weight="bold" fill="#4a2810">⚔️ Character Sheet ⚔️</text>`,
    `<line x1="80" y1="90" x2="520" y2="90" stroke="#8b6914" stroke-width="1"/>`,
    `<text x="60" y="135" font-family="serif" font-size="22" font-weight="bold" fill="#6b3a1f">Class:</text>`,
    `<text x="200" y="135" font-family="serif" font-size="22" fill="#2a1506">${esc(char.className)}</text>`,
    `<text x="60" y="175" font-family="serif" font-size="22" font-weight="bold" fill="#6b3a1f">Level:</text>`,
    `<text x="200" y="175" font-family="serif" font-size="22" fill="#2a1506">${esc(char.level)}</text>`,
    `<text x="60" y="215" font-family="serif" font-size="22" font-weight="bold" fill="#6b3a1f">Quest:</text>`,
    `<text x="200" y="215" font-family="serif" font-size="22" fill="#2a1506">${esc(char.quest)}</text>`,
    `<line x1="80" y1="240" x2="520" y2="240" stroke="#8b6914" stroke-width="1"/>`,
    `<text x="60" y="278" font-family="serif" font-size="18" font-weight="bold" fill="#6b3a1f">Stats:</text>`,
    `<text x="60" y="312" font-family="serif" font-size="16" fill="#4a2810">Age: ${esc(answers.age_range)}</text>`,
    `<text x="60" y="337" font-family="serif" font-size="16" fill="#4a2810">Dependents: ${esc(answers.dependents)}</text>`,
    `<text x="60" y="362" font-family="serif" font-size="16" fill="#4a2810">Current Coverage: ${esc(answers.has_insurance)}</text>`,
    `<text x="60" y="387" font-family="serif" font-size="16" fill="#4a2810">Timeline: ${esc(answers.timeline)}</text>`,
    `<text x="60" y="412" font-family="serif" font-size="16" fill="#4a2810">Health: ${esc(answers.health)}</text>`,
    `<text x="60" y="437" font-family="serif" font-size="16" fill="#4a2810">Tobacco: ${esc(answers.tobacco)}</text>`,
    `<text x="60" y="462" font-family="serif" font-size="16" fill="#4a2810">Coverage: ${esc(answers.coverage_amount)}</text>`,
    `<text x="300" y="495" text-anchor="middle" font-family="serif" font-size="13" fill="#8b6914">The Financial DM</text>`,
    `</svg>`,
  ];
  return lines.join("");
}

function deriveGuidance(answers: Answers): string[] {
  const {
    age_range,
    dependents,
    has_insurance,
    biggest_concern,
    timeline,
    coverage_amount,
    monthly_budget,
    tobacco,
    health,
  } = answers;
  const hasDeps = dependents !== "0";
  const isYoung = age_range === "Under 25" || age_range === "25 to 34";
  const tips: string[] = [];

  // Concern-based tips
  if (biggest_concern === "Income replacement") {
    tips.push(
      hasDeps
        ? "With dependents counting on you, most advisors recommend coverage of 10 to 12x your annual income. Term life insurance locks in a fixed rate for the years your family needs it most."
        : "Income replacement isn't just for parents. Even solo adventurers should consider covering 5 to 7x their income to protect their own future earning potential."
    );
  } else if (biggest_concern === "Debt payoff") {
    tips.push(
      "A term life policy can ensure your debts don't become someone else's burden. Whether it's a mortgage, student loans, or credit cards, coverage gives you peace that they're handled."
    );
  } else if (biggest_concern === "Funeral costs") {
    tips.push(
      "Final expenses average $7,000 to $12,000. Even a small term policy can prevent your family from facing that bill during an already difficult time."
    );
  } else if (biggest_concern === "Kids' future") {
    tips.push(
      "Term life insurance can fund college, childcare, and daily expenses if you're not there. A policy that spans 20 years often covers kids through their most dependent years."
    );
  } else {
    tips.push(
      "Not sure what you need most? That's exactly what a quick conversation with a licensed agent can clarify. No pressure, just clarity."
    );
  }

  // Coverage amount tips
  if (coverage_amount) {
    if (coverage_amount === "Under $250,000") {
      tips.push(
        "You're looking at coverage under $250,000. That's a solid starting point, and the 10 to 12x income guideline can help you confirm the right target."
      );
    } else if (coverage_amount === "$250,000 to $500,000") {
      tips.push(
        "A range of $250,000 to $500,000 aligns well with the 10 to 12x income guideline many advisors use. Your exact number depends on income, debts, and dependents."
      );
    } else if (coverage_amount === "$500,000 to $1,000,000") {
      tips.push(
        "Considering $500,000 to $1,000,000 suggests you value strong protection. Compare it against the 10 to 12x income guideline to confirm the sweet spot."
      );
    } else {
      tips.push(
        "Aiming for $1,000,000 or more puts you in strong territory. A quick comparison against the 10 to 12x income guideline shows whether you're right on target."
      );
    }
  }

  // Monthly budget tip
  if (monthly_budget) {
    tips.push(
      `With a monthly budget of ${monthly_budget} for coverage, most level term policies fit comfortably within that range. A licensed agent can quote exact rates for your age and health.`
    );
  }

  // Health tips
  if (health === "Excellent" || health === "Good") {
    tips.push(
      health === "Excellent"
        ? "Excellent health qualifies you for the best rate class. Lock in that advantage now, because rates are based on age and health at application."
        : "Good health puts you in a favorable rate class. The sooner you apply, the more you save, since premiums climb with age."
    );
  } else if (health === "Fair" || health === "Poor") {
    tips.push(
      "Even with fair or poor health, most people can still qualify for term coverage. A licensed agent can match you with a carrier that is more lenient on your condition."
    );
  }

  // Tobacco perk
  if (tobacco === "No, never") {
    tips.push(
      "No tobacco use is a major win. Non smokers qualify for the best rate class, which can cut term life premiums dramatically."
    );
  }

  // Has insurance tips
  if (has_insurance === "Yes") {
    tips.push(
      "You already have coverage. Smart move. Review your policy every few years or after major life changes, like marriage, kids, or a new home. Your needs may have grown since you first signed up."
    );
  } else {
    tips.push(
      isYoung
        ? "The best time to lock in a low rate is when you're young and healthy. Premiums are based on age and health at application. Every year you wait, they tend to go up."
        : "It's never too late to get covered. While rates do increase with age, term life insurance remains one of the most affordable ways to protect the people who depend on you."
    );
  }

  // Timeline tips
  if (timeline === "As soon as possible") {
    tips.push(
      "Since you're ready now, have your basic health info handy. Most term applications are straightforward and many carriers offer decisions within days."
    );
  } else if (timeline === "Just exploring") {
    tips.push(
      "No rush. The best decision is an informed one. In the meantime, consider what a policy would need to cover: income, debts, kids' education, and final expenses. That gives you a target number."
    );
  }

  return tips;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface CharacterSheetProps {
  answers: Answers;
  onCTA: () => void;
}

export default function CharacterSheet({ answers, onCTA }: CharacterSheetProps) {
  const char = deriveCharacter(answers);
  const guidance = deriveGuidance(answers);

  const handleShare = useCallback(async () => {
    const svgStr = generateShareSVG(char, answers);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const triggerDownload = (href: string, filename: string) => {
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on the next tick so the download has started reading the blob.
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    };

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 540;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas context");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          URL.revokeObjectURL(url);
          if (!pngBlob) {
            // Some browsers refuse to rasterize an SVG image; hand over the SVG itself.
            triggerDownload(URL.createObjectURL(blob), "the-financial-dm-character-sheet.svg");
            return;
          }
          triggerDownload(URL.createObjectURL(pngBlob), "the-financial-dm-character-sheet.png");
        }, "image/png");
      } catch {
        URL.revokeObjectURL(url);
        triggerDownload(URL.createObjectURL(blob), "the-financial-dm-character-sheet.svg");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      triggerDownload(URL.createObjectURL(blob), "the-financial-dm-character-sheet.svg");
    };
    img.src = url;
  }, [char, answers]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-fantasy text-[#e0e0e0] text-center">
        Thy Character Awaits!
      </h2>

      {/* Character Sheet Card */}
      <div
        className="w-full rounded-xl overflow-hidden border-2 border-amber-700/50 shadow-2xl shadow-amber-900/20"
        style={{
          background: "linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 30%, #f0ddb8 60%, #dcc894 100%)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 text-center border-b-2 border-[#406080]/40"
          style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}
        >
          <span className="text-2xl">⚔️</span>
          <h3 className="text-xl font-fantasy text-[#c08020] mt-1">Character Sheet</h3>
        </div>

        {/* Stats */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold text-amber-900/70 uppercase tracking-wider w-16 font-fantasy">
              Class
            </span>
            <span className="text-lg font-bold text-amber-950 font-fantasy">
              {char.className}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold text-amber-900/70 uppercase tracking-wider w-16 font-fantasy">
              Level
            </span>
            <span className="text-lg font-bold text-amber-950 font-fantasy">
              {char.level}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-bold text-amber-900/70 uppercase tracking-wider w-16 font-fantasy">
              Quest
            </span>
            <span className="text-lg font-bold text-amber-950 font-fantasy">{char.quest}</span>
          </div>

          <hr className="border-amber-800/30" />

          <div className="space-y-2 text-sm text-amber-900/80">
            <p><strong>Age:</strong> {answers.age_range}</p>
            <p><strong>Dependents:</strong> {answers.dependents}</p>
            <p><strong>Current Coverage:</strong> {answers.has_insurance}</p>
            <p><strong>Timeline:</strong> {answers.timeline}</p>
            <p><strong>Health:</strong> {answers.health}</p>
            <p><strong>Tobacco:</strong> {answers.tobacco}</p>
            <p><strong>Coverage:</strong> {answers.coverage_amount}</p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 text-center border-t-2 border-[#406080]/40"
          style={{ background: "linear-gradient(0deg, #162030 0%, #0d1520 100%)" }}
        >
          <span className="text-xs text-[#a0a0a0] font-fantasy tracking-wider">
            The Financial DM
          </span>
        </div>
      </div>

      {/* Encouraging text */}
      <p className="text-[#a0a0a0] text-center text-sm italic max-w-xs">
        "Every great adventurer needs a plan. Your quest for protection begins now."
      </p>

      {/* Quest Guidance: personalized tips */}
      <div className="w-full rounded-xl border border-[#406080]/40 bg-[#111a28] overflow-hidden">
        <div
          className="px-4 py-3 text-center border-b border-[#406080]/30"
          style={{ background: "linear-gradient(180deg, #162030 0%, #0d1520 100%)" }}
        >
          <h4 className="text-sm font-fantasy text-[#c08020] tracking-wider">
            🗡️ {char.className}'s Wisdom
          </h4>
        </div>
        <div className="px-4 py-4 space-y-3">
          {guidance.map((tip, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-[#c08020] mt-0.5 shrink-0">◆</span>
              <p className="text-[#a0a0a0] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={handleShare}
          className="flex-1 px-4 py-3 rounded-lg border-2 border-[#406080]/60 text-[#e0e0e0] hover:bg-[#204060]/30 hover:border-[#c08020] transition-all font-fantasy text-sm"
        >
          🏴 Share Your Result
        </button>
        <button
          onClick={onCTA}
          className="flex-1 px-4 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold shadow-lg shadow-[#c08020]/20 transition-all font-fantasy text-sm"
        >
          🎲 Talk to Your Financial DM
        </button>
      </div>
    </div>
  );
}

export { deriveCharacter };
