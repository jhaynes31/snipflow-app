/** A medieval treasure chest, closed or open, drawn to match the tavern palette. */
export default function TreasureChest({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden="true" style={{ filter: open ? "drop-shadow(0 0 22px rgba(224,180,90,0.7))" : "drop-shadow(0 0 10px rgba(192,128,32,0.35))" }}>
      <defs>
        <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="1" stopColor="#4a2e14" />
        </linearGradient>
        <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a06a34" />
          <stop offset="1" stopColor="#5e3a1a" />
        </linearGradient>
        <linearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d080" />
          <stop offset="0.5" stopColor="#c08020" />
          <stop offset="1" stopColor="#8a5a10" />
        </linearGradient>
        <radialGradient id="chestGlow" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd060" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* glow and coins when open */}
      {open && (
        <g>
          <ellipse cx="100" cy="92" rx="70" ry="34" fill="url(#chestGlow)" />
          <g fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1">
            <ellipse cx="74" cy="90" rx="12" ry="5" />
            <ellipse cx="100" cy="84" rx="14" ry="6" />
            <ellipse cx="128" cy="90" rx="12" ry="5" />
            <ellipse cx="88" cy="96" rx="12" ry="5" />
            <ellipse cx="114" cy="97" rx="12" ry="5" />
            <circle cx="60" cy="74" r="5" />
            <circle cx="142" cy="72" r="5" />
            <circle cx="100" cy="66" r="6" />
          </g>
        </g>
      )}

      {/* lid */}
      <g transform={open ? "rotate(-62 34 92)" : undefined} style={{ transition: "transform 400ms ease-out" }}>
        <path d="M34 92 V70 a66 40 0 0 1 132 0 V92 Z" fill="url(#chestLid)" stroke="#2a1a08" strokeWidth="3" />
        <path d="M34 92 V70 a66 40 0 0 1 132 0 V92" fill="none" stroke="#c08020" strokeWidth="1" opacity="0.5" />
        <rect x="58" y="44" width="10" height="48" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
        <rect x="132" y="44" width="10" height="48" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
        <rect x="90" y="78" width="20" height="16" rx="3" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
      </g>

      {/* body */}
      <rect x="34" y="92" width="132" height="66" rx="6" fill="url(#chestWood)" stroke="#2a1a08" strokeWidth="3" />
      <rect x="58" y="92" width="10" height="66" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
      <rect x="132" y="92" width="10" height="66" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
      <line x1="34" y1="125" x2="166" y2="125" stroke="#2a1a08" strokeWidth="2" opacity="0.6" />
      {/* lock plate */}
      <rect x="88" y="94" width="24" height="22" rx="4" fill="url(#chestGold)" stroke="#6a4a10" strokeWidth="1.5" />
      <circle cx="100" cy="103" r="3" fill="#2a1a08" />
      <rect x="98.5" y="103" width="3" height="7" fill="#2a1a08" />
      {/* feet */}
      <rect x="40" y="156" width="14" height="8" rx="2" fill="#3a2410" />
      <rect x="146" y="156" width="14" height="8" rx="2" fill="#3a2410" />
    </svg>
  );
}
