import type { PaymentRail } from "../../utils/types";

export type PaymentMethod = PaymentRail;

export interface MethodOption {
  id: PaymentMethod;
  label: string;
  blurb: string;
  /** e.g. "₦12,500" or "12.4 USDT" */
  summary?: string;
}

interface Props {
  options: MethodOption[];
  onSelect: (method: PaymentMethod) => void;
}

const ICONS: Record<PaymentMethod, { color: string; path: string }> = {
  crypto: {
    color: "text-orange-400",
    path: "M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5S13.657 14 12 14m0-6c1.11 0 2.08.402 2.599 1M12 8V6.5M12 14v1.5m0-1.5c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  korapay: {
    color: "text-green-400",
    path: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  pandascrow: {
    color: "text-sky-400",
    path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
};

/**
 * First step of checkout: the buyer picks how to pay. Which options appear is
 * decided by the caller (backend-enabled rails intersected with what the
 * vendor accepts and the feature flags).
 */
export default function PaymentMethodSelector({ options, onSelect }: Props) {
  if (options.length === 0) {
    return (
      <p className="text-center text-sm text-amber-300">
        No payment method is available for this order right now. Please try again later or contact support.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-gray-400">How would you like to pay?</p>
      {options.map((o) => {
        const icon = ICONS[o.id];
        return (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-4 text-left transition-colors hover:border-brand/50 hover:bg-[#31343a]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#373A3F] bg-[#1a1c20]">
              <svg className={`h-5 w-5 ${icon.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{o.label}</p>
              <p className="text-xs text-gray-500">
                {o.summary ? `${o.summary} · ${o.blurb}` : o.blurb}
              </p>
            </div>
            <svg className="h-4 w-4 flex-shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
