/**
 * Category Icons - hand-crafted SVGs for each marketplace category.
 *
 * All icons:
 *  - 64 × 64 viewBox for crisp rendering at any size
 *  - Use `currentColor` so the parent's text-* class controls color
 *  - One stroke weight (2–2.5 px) for visual consistency
 *  - Readable at the smallest usage size (w-7 h-7 = 28 px)
 */

import React from "react";

interface IconProps {
  className?: string;
}

// ─── Electronics ─────────────────────────────────────────────────────────────
// Smartphone with rising signal bars → instantly "tech / connected"

export const ElectronicsIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Phone body */}
    <rect
      x="14" y="4" width="36" height="56" rx="7"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.08"
    />
    {/* Screen area */}
    <rect
      x="19" y="14" width="26" height="32" rx="2"
      fill="currentColor" fillOpacity="0.12"
    />
    {/* Top speaker slot */}
    <rect
      x="24" y="9" width="14" height="2.5" rx="1.25"
      fill="currentColor" fillOpacity="0.5"
    />
    {/* Front camera dot */}
    <circle cx="40" cy="10" r="1.75" fill="currentColor" fillOpacity="0.65" />
    {/* Signal bars - short / medium / tall */}
    <rect x="22" y="37" width="5" height="6"  rx="1" fill="currentColor" />
    <rect x="30" y="31" width="5" height="12" rx="1" fill="currentColor" />
    <rect x="38" y="25" width="5" height="18" rx="1" fill="currentColor" />
    {/* Home bar */}
    <rect
      x="26" y="53" width="12" height="2.5" rx="1.25"
      fill="currentColor" fillOpacity="0.7"
    />
  </svg>
);

// ─── Clothing ─────────────────────────────────────────────────────────────────
// Classic crew-neck T-shirt silhouette - universally understood as "apparel"

export const ClothingIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/*
      T-shirt path (clockwise from right collar edge):
        neckline curve → right shoulder → right sleeve → armhole →
        right body → bottom hem → left body → left armhole →
        left sleeve → left shoulder → close
    */}
    <path
      d="M38,12 Q32,6 26,12 L4,20 L8,32 L18,28 L18,56 L46,56 L46,28 L56,32 L60,20 Z"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.1"
      strokeLinejoin="round"
    />
    {/* Crew-neck seam - the subtle inner fold line */}
    <path
      d="M26,20 Q32,15 38,20"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" fill="none" opacity="0.45"
    />
  </svg>
);

// ─── Home & Garden ────────────────────────────────────────────────────────────
// House with cross-pane windows + arched door - classic "home" read at a glance

export const HomeGardenIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Roof */}
    <path
      d="M4,32 L32,8 L60,32"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
    />
    {/* Walls */}
    <rect
      x="10" y="30" width="44" height="28" rx="1"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.08"
    />
    {/* Left window with cross panes */}
    <rect
      x="13" y="36" width="12" height="10" rx="1.5"
      stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.15"
    />
    <line x1="19" y1="36" x2="19" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="13" y1="41" x2="25" y2="41" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    {/* Right window with cross panes */}
    <rect
      x="39" y="36" width="12" height="10" rx="1.5"
      stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.15"
    />
    <line x1="45" y1="36" x2="45" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="39" y1="41" x2="51" y2="41" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    {/* Arched door */}
    <path
      d="M27,58 L27,47 Q27,42 32,42 Q37,42 37,47 L37,58"
      stroke="currentColor" strokeWidth="2" fill="none"
    />
    {/* Chimney */}
    <rect
      x="38" y="10" width="7" height="15" rx="1.5"
      stroke="currentColor" strokeWidth="2"
      fill="currentColor" fillOpacity="0.1"
    />
  </svg>
);

// ─── Beauty & Personal Care ───────────────────────────────────────────────────
// Lipstick with angled bullet + sparkle stars → glamour / cosmetics

export const BeautyIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tube body */}
    <rect
      x="26" y="37" width="12" height="21" rx="2"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.1"
    />
    {/* Cap band (slightly wider) */}
    <rect
      x="24" y="32" width="16" height="7" rx="2"
      fill="currentColor" fillOpacity="0.45"
    />
    {/*
      Bullet: rectangular body with a diagonal angled cut at the top.
      The diagonal goes from (28,22) lower-left to (36,17) upper-right
      - the classic "just-used" lipstick silhouette.
    */}
    <path
      d="M28,32 L28,22 L36,17 L36,32 Z"
      stroke="currentColor" strokeWidth="1.5"
      fill="currentColor" fillOpacity="0.2"
      strokeLinejoin="round"
    />
    {/* Large sparkle - top right */}
    <line x1="50" y1="8"  x2="50" y2="20" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" />
    <line x1="44" y1="14" x2="56" y2="14" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" />
    <line x1="46" y1="10" x2="54" y2="18" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.5" />
    <line x1="54" y1="10" x2="46" y2="18" stroke="currentColor" strokeWidth="1"   strokeLinecap="round" opacity="0.5" />
    {/* Small sparkle - left side */}
    <line x1="13" y1="30" x2="13" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9"  y1="34" x2="17" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Accent dot */}
    <circle cx="52" cy="30" r="2" fill="currentColor" fillOpacity="0.7" />
  </svg>
);

// ─── Sports & Outdoors ────────────────────────────────────────────────────────
// Dumbbell with double weight plates - universal symbol for fitness / sports

export const SportsIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left outer plate */}
    <rect
      x="4" y="20" width="16" height="24" rx="5"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.1"
    />
    {/* Left inner plate detail */}
    <rect
      x="8" y="24" width="8" height="16" rx="2.5"
      stroke="currentColor" strokeWidth="1.5"
      fill="none" opacity="0.4"
    />
    {/* Right outer plate */}
    <rect
      x="44" y="20" width="16" height="24" rx="5"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.1"
    />
    {/* Right inner plate detail */}
    <rect
      x="48" y="24" width="8" height="16" rx="2.5"
      stroke="currentColor" strokeWidth="1.5"
      fill="none" opacity="0.4"
    />
    {/* Center grip bar */}
    <rect
      x="20" y="28" width="24" height="8" rx="3"
      fill="currentColor" fillOpacity="0.75"
    />
  </svg>
);

// ─── Art Work ─────────────────────────────────────────────────────────────────
// Paint palette with thumb hole + multi-color blobs + brush handle

export const ArtWorkIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Palette body - organic bean / kidney shape */}
    <path
      d="M14,30 Q12,14 28,10 Q44,6 52,18 Q60,30 52,42 Q46,52 36,52 Q22,54 16,44 Q10,38 14,30 Z"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.08"
    />
    {/* Thumb hole - the cutout makes the palette instantly recognizable */}
    <circle
      cx="22" cy="44" r="6"
      stroke="currentColor" strokeWidth="2"
      fill="none"
    />
    {/* Paint blobs - varying opacity suggests different colors */}
    <circle cx="30" cy="16" r="4.5" fill="currentColor" fillOpacity="0.95" />
    <circle cx="42" cy="12" r="4"   fill="currentColor" fillOpacity="0.7"  />
    <circle cx="51" cy="22" r="4"   fill="currentColor" fillOpacity="0.5"  />
    <circle cx="50" cy="36" r="4"   fill="currentColor" fillOpacity="0.75" />
    <circle cx="38" cy="48" r="3.5" fill="currentColor" fillOpacity="0.9"  />
    {/* Brush handle extending from top-right */}
    <line
      x1="54" y1="10" x2="46" y2="18"
      stroke="currentColor" strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Accessories ─────────────────────────────────────────────────────────────
// Structured handbag with arched handle + clasp - the #1 accessory icon in e-commerce

export const AccessoriesIcon: React.FC<IconProps> = ({
  className = "w-8 h-8",
}) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Bag body */}
    <rect
      x="6" y="26" width="52" height="30" rx="6"
      stroke="currentColor" strokeWidth="2.5"
      fill="currentColor" fillOpacity="0.08"
    />
    {/* Handle - U-shaped arc above the bag */}
    <path
      d="M20,26 Q20,10 32,10 Q44,10 44,26"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" fill="none"
    />
    {/* Clasp / turn-lock at top-center of bag */}
    <rect
      x="26" y="22" width="12" height="8" rx="4"
      fill="currentColor" fillOpacity="0.55"
    />
    {/* Horizontal detail stitch line */}
    <line
      x1="14" y1="44" x2="50" y2="44"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" opacity="0.35"
    />
  </svg>
);

// ─── Named map (kept for any code that still uses the bracket-accessor pattern)

export const CategoryIcons = {
  Electronics: ElectronicsIcon,
  Clothing: ClothingIcon,
  "Home & Garden": HomeGardenIcon,
  "Beauty & Personal Care": BeautyIcon,
  "Sports & Outdoors": SportsIcon,
  "Art Work": ArtWorkIcon,
  Accessories: AccessoriesIcon,
};

// ─── Food categories ─────────────────────────────────────────────────────────
// Emoji rendered inside a 64×64 SVG so it scales like the line icons above and
// is driven by the category config (add a category = add an emoji, no new art).

export const makeEmojiIcon = (emoji: string, label: string): React.FC<IconProps> => {
  const EmojiIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="32"
        y="34"
        fontSize="46"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {emoji}
      </text>
    </svg>
  );
  EmojiIcon.displayName = `EmojiIcon(${label})`;
  return EmojiIcon;
};
