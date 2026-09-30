import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useRamp } from "./RampContext";

// Routes where the floating button shouldn't appear (auth flows, error/offline).
const HIDDEN_PREFIXES = ["/login", "/auth", "/offline"];

/**
 * FloatingRampButton
 *
 * A fixed-position floating action button that opens the Ramp modal.
 * Drop this anywhere inside <RampProvider> - typically at the root layout.
 *
 * Props:
 *  - defaultMode: which tab opens first ("onramp" | "offramp"). Default "onramp".
 *  - position: where on screen. Default "bottom-right".
 *  - label: override the button label.
 *  - hidden: hide the button (useful when you want programmatic-only triggering).
 */
export interface FloatingRampButtonProps {
  defaultMode?: "onramp" | "offramp";
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  label?: string;
  hidden?: boolean;
}

const ArrowUpDown = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M5 7L9 3L13 7M13 11L9 15L5 11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// On mobile the bottom nav (md:hidden) sits at the bottom edge, so lift the
// button above it; on desktop there's no bottom nav, so sit at the corner.
const positionClasses = {
  "bottom-right": "bottom-24 right-4 md:bottom-6 md:right-6",
  "bottom-left": "bottom-24 left-4 md:bottom-6 md:left-6",
  "bottom-center": "bottom-24 left-1/2 -translate-x-1/2 md:bottom-6",
};

export const FloatingRampButton = ({
  defaultMode = "onramp",
  position = "bottom-right",
  label,
  hidden = false,
}: FloatingRampButtonProps) => {
  const { openRamp } = useRamp();
  const { pathname } = useLocation();

  if (hidden) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return null;

  return (
    <motion.button
      onClick={() => openRamp(defaultMode)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", damping: 14, stiffness: 200 }}
      // Compact icon-only circle on mobile (the labelled pill covered a large
      // slice of small screens); full pill from sm up.
      className={`fixed ${positionClasses[position]} z-40 flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white h-12 w-12 rounded-full sm:h-auto sm:w-auto sm:px-5 sm:py-3.5 shadow-xl shadow-orange-900/30 font-semibold text-sm transition-colors`}
      aria-label="Buy or sell crypto"
      title="Buy or sell crypto"
    >
      {/* Swap arrows + "$" so the purpose reads without a label */}
      <span className="relative flex items-center justify-center sm:hidden">
        <ArrowUpDown />
        <span className="absolute -right-1.5 -top-2 text-[11px] font-bold leading-none">$</span>
      </span>
      <span className="hidden sm:flex sm:items-center sm:gap-2">
        <ArrowUpDown />
        {label ?? (defaultMode === "onramp" ? "Buy Crypto" : "Sell Crypto")}
      </span>
    </motion.button>
  );
};
