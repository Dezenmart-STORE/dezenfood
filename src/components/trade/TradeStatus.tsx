/**
 * Trade status as a visual state machine (stepper).
 * Dark themed, responsive - labels hidden on very small screens.
 */

// ---------------------------------------------------------------------------
// Status definitions
// ---------------------------------------------------------------------------
export type TradeState =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "shipped"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled";

interface StepDef {
  label: string;
  shortLabel: string;
  description: string;
}

const DEFAULT_STEPS: StepDef[] = [
  { label: "Ordered", shortLabel: "Ordered", description: "Payment is being processed" },
  { label: "Paid", shortLabel: "Paid", description: "Payment confirmed in escrow" },
  { label: "Shipped", shortLabel: "Sent", description: "Seller has shipped the item" },
  { label: "Delivered", shortLabel: "Dlvrd", description: "Item delivered to you" },
  { label: "Complete", shortLabel: "Done", description: "Funds released to seller" },
];

const FOOD_STEPS: StepDef[] = [
  { label: "Ordered", shortLabel: "Ordered", description: "Waiting for your payment" },
  { label: "Paid", shortLabel: "Paid", description: "Payment held in escrow - waiting for the vendor to accept" },
  { label: "Preparing", shortLabel: "Prep", description: "The vendor is preparing your order" },
  { label: "On the way", shortLabel: "Sent", description: "Your order is out for delivery" },
  { label: "Delivered", shortLabel: "Dlvrd", description: "Delivered - please confirm you received it" },
  { label: "Complete", shortLabel: "Done", description: "Funds released to the vendor" },
];

const DEFAULT_STATE_TO_STEP: Record<TradeState, number> = {
  pending_payment: 0,
  paid: 1,
  preparing: 1,
  ready: 1,
  out_for_delivery: 2,
  shipped: 2,
  delivered: 3,
  completed: 4,
  disputed: -1,
  cancelled: -1,
};

const FOOD_STATE_TO_STEP: Record<TradeState, number> = {
  pending_payment: 0,
  paid: 1,
  preparing: 2,
  ready: 2,
  out_for_delivery: 3,
  shipped: 3,
  delivered: 4,
  completed: 5,
  disputed: -1,
  cancelled: -1,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  status: TradeState;
  className?: string;
  /** "food" adds the preparing / on-the-way steps */
  variant?: "default" | "food";
}

export default function TradeStatus({ status, className = "", variant = "default" }: Props) {
  const STEPS = variant === "food" ? FOOD_STEPS : DEFAULT_STEPS;
  const currentStep = (variant === "food" ? FOOD_STATE_TO_STEP : DEFAULT_STATE_TO_STEP)[status];

  // Disputed state
  if (status === "disputed") {
    return (
      <div className={`rounded-xl border border-amber-800/40 bg-amber-900/20 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/40">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-300">Under Review</p>
            <p className="text-sm text-amber-500">
              A dispute has been raised. Our team is reviewing this order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (status === "cancelled") {
    return (
      <div className={`rounded-xl border border-[#292B30] bg-[#292B30] p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1a1c20]">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-300">Cancelled</p>
            <p className="text-sm text-gray-500">
              This order has been cancelled. Funds have been returned.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal progress stepper
  return (
    <div className={className}>
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          // When completed, all steps are done (fully green). Otherwise normal progress.
          const isDone = status === "completed" || i < currentStep;
          const isCurrent = status !== "completed" && i === currentStep;

          return (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              {/* Connector + dot row */}
              <div className="flex w-full items-center">
                {/* Left connector */}
                {i > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? "bg-green-600" : "bg-[#292B30]"
                    }`}
                  />
                )}

                {/* Step dot */}
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all sm:h-8 sm:w-8 ${
                    isDone
                      ? "bg-green-600 text-white"
                      : isCurrent
                      ? "border-2 border-brand bg-[#212428] text-brand"
                      : "border-2 border-[#292B30] bg-[#212428] text-gray-600"
                  }`}
                >
                  {isDone ? (
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>

                {/* Right connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${
                      isDone ? "bg-green-600" : "bg-[#292B30]"
                    }`}
                  />
                )}
              </div>

              {/* Step label - short on xs, full on sm+ */}
              <p
                className={`mt-2 ${i===0?"text-left w-full": i===STEPS.length-1 ? "text-right w-full": "text-center"} text-[10px] font-medium sm:text-xs ${
                  isDone
                  ? "text-green-500"
                  : isCurrent
                  ? "text-brand"
                  : "text-gray-600"
                }`}
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      <div className="mt-4 rounded-xl border border-[#292B30] bg-[#292B30] p-3 text-center">
        <p className="text-sm text-gray-400">
          {STEPS[currentStep]?.description ?? "Processing…"}
        </p>
      </div>
    </div>
  );
}
