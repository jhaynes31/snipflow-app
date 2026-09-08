export default function Logo() {
  return (
    <svg
      viewBox="0 0 400 280"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[400px] h-auto"
      role="img"
      aria-label="Jen & John's Pet Services"
    >
      {/* House outline - peaked roof, open walls */}
      <polygon
        points="200,10 10,110 70,110 70,270 330,270 330,110 390,110"
        fill="none"
        stroke="#5C4A3A"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* House body fill */}
      <rect x="70" y="110" width="260" height="160" fill="#F5EFE4" stroke="none" />

      {/* Door */}
      <rect
        x="170"
        y="190"
        width="60"
        height="80"
        fill="none"
        stroke="#5C4A3A"
        strokeWidth="2"
        rx="2"
      />
      <circle cx="220" cy="235" r="3" fill="#5C4A3A" />

      {/* Roofline interior detail */}
      <line x1="70" y1="110" x2="330" y2="110" stroke="#5C4A3A" strokeWidth="2" />

      {/* Cat and Dog silhouettes sitting side by side */}

      {/* Dog silhouette (left side) */}
      <g transform="translate(120, 175)">
        {/* Body */}
        <ellipse cx="0" cy="20" rx="18" ry="14" fill="#B89173" />
        {/* Head */}
        <circle cx="-12" cy="5" r="12" fill="#B89173" />
        {/* Ears */}
        <ellipse cx="-18" cy="-8" rx="5" ry="9" fill="#B89173" transform="rotate(-15, -18, -8)" />
        <ellipse cx="-6" cy="-8" rx="5" ry="9" fill="#B89173" transform="rotate(15, -6, -8)" />
        {/* Nose */}
        <circle cx="-20" cy="7" r="2.5" fill="#5C4A3A" />
        {/* Eye */}
        <circle cx="-16" cy="3" r="1.5" fill="#5C4A3A" />
        {/* Tail */}
        <path d="M18,20 Q30,5 25,-5" fill="none" stroke="#B89173" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Cat silhouette (right side) */}
      <g transform="translate(250, 175)">
        {/* Body */}
        <ellipse cx="0" cy="20" rx="13" ry="12" fill="#B89173" />
        {/* Head */}
        <circle cx="0" cy="5" r="10" fill="#B89173" />
        {/* Ears */}
        <polygon points="-8,-2 -12,-15 -3,-5" fill="#B89173" />
        <polygon points="8,-2 12,-15 3,-5" fill="#B89173" />
        {/* Eyes */}
        <circle cx="-4" cy="3" r="1.5" fill="#5C4A3A" />
        <circle cx="4" cy="3" r="1.5" fill="#5C4A3A" />
        {/* Nose */}
        <polygon points="0,7 -2,9 2,9" fill="#5C4A3A" />
        {/* Whiskers */}
        <line x1="-10" y1="8" x2="-18" y2="6" stroke="#B89173" strokeWidth="0.8" />
        <line x1="-10" y1="9" x2="-18" y2="10" stroke="#B89173" strokeWidth="0.8" />
        <line x1="10" y1="8" x2="18" y2="6" stroke="#B89173" strokeWidth="0.8" />
        <line x1="10" y1="9" x2="18" y2="10" stroke="#B89173" strokeWidth="0.8" />
        {/* Tail */}
        <path d="M13,20 Q22,8 18,-2" fill="none" stroke="#B89173" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Business name inside roofline */}
      <text
        x="200"
        y="72"
        textAnchor="middle"
        fontFamily="'Montserrat', sans-serif"
        fontSize="12"
        fontWeight="600"
        fill="#5C4A3A"
        letterSpacing="2"
      >
        JEN &amp; JOHN'S
      </text>
      <text
        x="200"
        y="92"
        textAnchor="middle"
        fontFamily="'Montserrat', sans-serif"
        fontSize="10"
        fontWeight="500"
        fill="#5C4A3A"
        letterSpacing="3"
      >
        PET SERVICES
      </text>

      {/* Tagline along base */}
      <text
        x="200"
        y="260"
        textAnchor="middle"
        fontFamily="'Caveat', cursive"
        fontSize="14"
        fill="#B89173"
      >
        Constant care, loving presence, spotless homes.
      </text>
    </svg>
  );
}
