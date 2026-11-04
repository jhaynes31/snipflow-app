"use client";

/**
 * Pip and the neighbors, drawn in the Shire's cozy palette: cream, speckled
 * brown, pumpkin orange, a teal scarf with dots, oversized round glasses.
 * Inline SVG so they work everywhere without image files.
 */
export function PipAvatar({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg className={`fr-avatar ${className ?? ""}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Pip the owl">
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="#8a6a4f" />
      <ellipse cx="50" cy="66" rx="20" ry="24" fill="#f3e7d3" />
      <g fill="#b89170"><circle cx="43" cy="62" r="1.8" /><circle cx="52" cy="70" r="1.8" /><circle cx="47" cy="78" r="1.8" /><circle cx="57" cy="60" r="1.5" /><circle cx="40" cy="74" r="1.4" /></g>
      <ellipse cx="24" cy="64" rx="8" ry="22" fill="#6e4f39" transform="rotate(12 24 64)" />
      <ellipse cx="76" cy="64" rx="8" ry="22" fill="#6e4f39" transform="rotate(-12 76 64)" />
      <circle cx="50" cy="38" r="26" fill="#9c7a5c" />
      <path d="M28 20 L36 34 L24 36 Z" fill="#8a6a4f" /><path d="M72 20 L64 34 L76 36 Z" fill="#8a6a4f" />
      <circle cx="39" cy="40" r="12" fill="#f8f1e4" /><circle cx="61" cy="40" r="12" fill="#f8f1e4" />
      <circle cx="39" cy="41" r="7.5" fill="#d9772e" /><circle cx="61" cy="41" r="7.5" fill="#d9772e" />
      <circle cx="39" cy="41" r="4.5" fill="#1f1812" /><circle cx="61" cy="41" r="4.5" fill="#1f1812" />
      <circle cx="41" cy="39" r="1.6" fill="#fff" /><circle cx="63" cy="39" r="1.6" fill="#fff" />
      <g fill="none" stroke="#3b2c22" strokeWidth="2.4"><circle cx="39" cy="41" r="13.5" /><circle cx="61" cy="41" r="13.5" /><path d="M52.5 41 h-5" /><path d="M25.5 40 l-6 -3" /><path d="M74.5 40 l6 -3" /></g>
      <path d="M50 48 L46 55 L54 55 Z" fill="#e2a24b" />
      <path d="M26 58 Q50 70 74 58 Q74 66 50 72 Q26 66 26 58 Z" fill="#5fa8a3" />
      <path d="M62 66 Q70 76 64 86 Q58 78 60 68 Z" fill="#5fa8a3" />
      <g fill="#f3e7d3"><circle cx="36" cy="63" r="1.4" /><circle cx="48" cy="67" r="1.4" /><circle cx="60" cy="63" r="1.4" /><circle cx="64" cy="76" r="1.2" /></g>
      <path d="M42 92 l-4 5 M46 92 l0 6 M54 92 l0 6 M58 92 l4 5" stroke="#e2a24b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function JuniperAvatar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Juniper the fox">
      <path d="M22 30 L30 58 L10 52 Z" fill="#e2762e" /><path d="M78 30 L70 58 L90 52 Z" fill="#e2762e" />
      <circle cx="50" cy="56" r="30" fill="#ef8a3c" />
      <path d="M50 60 Q35 72 30 86 Q50 80 70 86 Q65 72 50 60 Z" fill="#fbe9d2" />
      <circle cx="40" cy="52" r="3.5" fill="#1f1812" /><circle cx="60" cy="52" r="3.5" fill="#1f1812" />
      <circle cx="50" cy="63" r="3.2" fill="#2b2016" />
      <path d="M26 70 Q50 82 74 70 Q72 78 50 84 Q28 78 26 70 Z" fill="#b8a6c9" />
    </svg>
  );
}

export function BrambleAvatar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Bramble the hedgehog">
      <path d="M20 60 L14 40 L28 48 L30 28 L42 44 L50 22 L58 44 L70 28 L72 48 L86 40 L80 60 Z" fill="#6e4f39" />
      <ellipse cx="50" cy="66" rx="32" ry="22" fill="#8a6a4f" />
      <ellipse cx="46" cy="72" rx="20" ry="13" fill="#f3e7d3" />
      <circle cx="40" cy="66" r="3" fill="#1f1812" /><circle cx="54" cy="66" r="3" fill="#1f1812" />
      <circle cx="47" cy="76" r="3.5" fill="#2b2016" />
      <path d="M58 58 l8 -3" stroke="#3b2c22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
