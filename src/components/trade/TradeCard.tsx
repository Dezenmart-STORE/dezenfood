import type { TradeState } from "./TradeStatus";
import { truncateAddress } from "../../utils/format";
import { useCurrency } from "../../context/CurrencyContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TradeData {
  id: string;
  tradeId?: string;
  productName: string;
  productImage?: string;
  amount: number;
  tokenSymbol: string;
  quantity: number;
  status: TradeState;
  counterparty: string;
  role: "buyer" | "seller";
  createdAt: string;
  purchaseId?: string;
}

interface Props {
  trade: TradeData;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_BADGE: Record<
  TradeState,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending_payment: {
    label: "Pending",
    bg: "bg-yellow-900/30",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  paid: {
    label: "Paid",
    bg: "bg-blue-900/30",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
  preparing: {
    label: "Preparing",
    bg: "bg-orange-900/30",
    text: "text-orange-400",
    dot: "bg-orange-500",
  },
  ready: {
    label: "Ready",
    bg: "bg-orange-900/30",
    text: "text-orange-400",
    dot: "bg-orange-500",
  },
  out_for_delivery: {
    label: "On the way",
    bg: "bg-indigo-900/30",
    text: "text-indigo-400",
    dot: "bg-indigo-500",
  },
  shipped: {
    label: "Shipped",
    bg: "bg-indigo-900/30",
    text: "text-indigo-400",
    dot: "bg-indigo-500",
  },
  delivered: {
    label: "Delivered",
    bg: "bg-purple-900/30",
    text: "text-purple-400",
    dot: "bg-purple-500",
  },
  completed: {
    label: "Complete",
    bg: "bg-green-900/30",
    text: "text-green-400",
    dot: "bg-green-500",
  },
  disputed: {
    label: "Disputed",
    bg: "bg-amber-900/30",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-[#292B30]",
    text: "text-gray-500",
    dot: "bg-gray-600",
  },
};

/**
 * Single trade card - dark themed, responsive.
 */
export default function TradeCard({ trade, onClick }: Props) {
  const { formatAmount } = useCurrency();
  const badge = STATUS_BADGE[trade.status];

  const date = new Date(trade.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className="flex w-full gap-3 rounded-2xl border border-[#292B30] bg-[#292B30] p-4 text-left shadow-sm transition-all hover:border-[#373A3F] hover:bg-[#373A3F] active:scale-[0.99]"
    >
      {/* Product image or placeholder */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1a1c20] sm:h-16 sm:w-16">
        {trade.productImage ? (
          <img
            src={trade.productImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      {/* Trade details */}
      <div className="min-w-0 flex-1">
        {/* Name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {trade.productName}
          </p>
          <span
            className={`ml-1 flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Amount */}
        <p className="mt-0.5 text-sm font-bold text-white">
          {trade.amount.toFixed(2)}{" "}
          <span className="text-gray-400">{trade.tokenSymbol}</span>
          <span className="ml-1.5 text-xs font-normal text-gray-600">
            {formatAmount(trade.amount, trade.tokenSymbol)}
          </span>
        </p>

        {/* Metadata row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span>Qty: {trade.quantity}</span>
          <span>
            {trade.role === "buyer" ? "Seller" : "Buyer"}:{" "}
            <span className="font-mono">{truncateAddress(trade.counterparty, 3)}</span>
          </span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Chevron */}
      <svg
        className="mt-2 h-4 w-4 flex-shrink-0 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
