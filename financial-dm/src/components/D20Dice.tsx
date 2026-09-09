import { useState, useEffect, useCallback } from "react";

interface D20DiceProps {
  onComplete: () => void;
}

const FACES = [
  "⚀", "⚁", "⚂", "⚃", "⚄", "⚅",
  "⚀", "⚁", "⚂", "⚃", "⚄", "⚅",
  "⚀", "⚁", "⚂", "⚃", "⚄", "⚅",
  "⚀", "⚁",
];

export default function D20Dice({ onComplete }: D20DiceProps) {
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(0);
  const [done, setDone] = useState(false);

  const roll = useCallback(() => {
    if (rolling || done) return;
    setRolling(true);

    let count = 0;
    const maxFrames = 20;
    const interval = setInterval(() => {
      setFace(Math.floor(Math.random() * 20));
      count++;
      if (count >= maxFrames) {
        clearInterval(interval);
        setRolling(false);
        setDone(true);
        setTimeout(onComplete, 600);
      }
    }, 100);
  }, [rolling, done, onComplete]);

  useEffect(() => {
    const t = setTimeout(roll, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* D20 SVG */}
      <svg
        viewBox="0 0 120 120"
        className={`w-40 h-40 sm:w-48 sm:h-48 transition-all duration-300 ${
          rolling ? "animate-dice-roll" : done ? "animate-dice-land" : ""
        }`}
        style={{
          filter: done
            ? "drop-shadow(0 0 12px rgba(192, 128, 32, 0.6))"
            : "drop-shadow(0 0 6px rgba(192, 128, 32, 0.3))",
        }}
      >
        {/* D20 shape: simplified icosahedron as a hexagon with inner triangle */}
        <polygon
          points="60,8 112,38 112,82 60,112 8,82 8,38"
          fill="#162030"
          stroke="#c08020"
          strokeWidth="2.5"
        />
        <polygon
          points="60,8 112,38 60,68"
          fill="#1a2840"
          stroke="#c08020"
          strokeWidth="1.5"
        />
        <polygon
          points="60,8 8,38 60,68"
          fill="#1f3050"
          stroke="#c08020"
          strokeWidth="1.5"
        />
        <polygon
          points="112,38 112,82 60,68"
          fill="#152238"
          stroke="#c08020"
          strokeWidth="1.5"
        />
        <polygon
          points="8,38 8,82 60,68"
          fill="#1c2a42"
          stroke="#c08020"
          strokeWidth="1.5"
        />
        {/* Number on the "top" face */}
        <text
          x="60"
          y="46"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#c08020"
          fontSize="26"
          fontWeight="bold"
          fontFamily="serif"
          className={rolling ? "opacity-80" : "opacity-100"}
        >
          {face + 1}
        </text>
      </svg>

      <p className="text-[#e0e0e0] text-lg font-fantasy animate-pulse">
        {rolling ? "Rolling..." : done ? `You rolled a ${face + 1}!` : "Ready?"}
      </p>
    </div>
  );
}
