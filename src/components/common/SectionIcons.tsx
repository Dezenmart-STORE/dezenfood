// Premium SVG Icons for Section Headers
import React from "react";

interface IconProps {
  className?: string;
}

export const FreshArrivalsIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sparkle/New starburst icon */}
    <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.1" />
    <path
      d="M32 8L35.5 21.5L49 25L35.5 28.5L32 42L28.5 28.5L15 25L28.5 21.5L32 8Z"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      opacity="0.3"
      strokeLinejoin="round"
    />
    <path
      d="M45 15L47 20L52 22L47 24L45 29L43 24L38 22L43 20L45 15Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M19 45L21 50L26 52L21 54L19 59L17 54L12 52L17 50L19 45Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      opacity="0.4"
    />
    <circle cx="32" cy="25" r="3" fill="currentColor" opacity="0.5" />
    <path
      d="M26 32L32 26M38 32L32 26M32 26V38"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="24"
      y="36"
      width="16"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
    />
    <line x1="28" y1="42" x2="36" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ValuePriceIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Price tag with coin */}
    <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.1" />

    {/* Tag shape */}
    <path
      d="M12 12L32 12L52 32L32 52L12 32L12 12Z"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      opacity="0.15"
      strokeLinejoin="round"
    />

    {/* Tag hole */}
    <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2" fill="none" />

    {/* Coin in center */}
    <circle cx="36" cy="32" r="12" stroke="currentColor" strokeWidth="2.5" fill="none" />
    <circle cx="36" cy="32" r="12" fill="currentColor" opacity="0.2" />

    {/* Dollar/Currency symbol */}
    <path
      d="M36 26V38M33 28H38C38.5 28 39 28.5 39 29C39 29.5 38.5 30 38 30H34C33 30 32 31 32 32V33C32 34 33 35 34 35H38C39 35 40 36 40 37C40 38 39 39 38 39H33"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Sparkle accents */}
    <path d="M48 20L49 22L51 23L49 24L48 26L47 24L45 23L47 22L48 20Z" fill="currentColor" opacity="0.5" />
    <path d="M22 44L23 46L25 47L23 48L22 50L21 48L19 47L21 46L22 44Z" fill="currentColor" opacity="0.5" />
  </svg>
);

export const TopSellersIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Trophy/Star hybrid for top sellers */}
    <circle cx="32" cy="32" r="28" fill="currentColor" opacity="0.1" />

    {/* Star shape */}
    <path
      d="M32 10L36 24L51 24L39 33L43 47L32 38L21 47L25 33L13 24L28 24L32 10Z"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      opacity="0.2"
      strokeLinejoin="round"
    />

    {/* Trophy base */}
    <path
      d="M24 40H40L38 48H26L24 40Z"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      opacity="0.15"
      strokeLinejoin="round"
    />
    <rect x="28" y="48" width="8" height="4" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
    <line x1="20" y1="52" x2="44" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

    {/* Inner star accent */}
    <path
      d="M32 18L34 26L42 26L36 31L38 39L32 34L26 39L28 31L22 26L30 26L32 18Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />

    {/* Badge ribbons */}
    <path d="M18 20L22 16L22 28L18 24V20Z" fill="currentColor" opacity="0.3" />
    <path d="M46 20L42 16L42 28L46 24V20Z" fill="currentColor" opacity="0.3" />
  </svg>
);

export const SectionIcons = {
  FreshArrivals: FreshArrivalsIcon,
  ValuePrice: ValuePriceIcon,
  TopSellers: TopSellersIcon,
};
