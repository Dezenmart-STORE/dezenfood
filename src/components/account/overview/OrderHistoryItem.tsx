import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Order } from "../../../utils/types";
import { useCurrency } from "../../../context/CurrencyContext";
import { formatNaira } from "../../../utils/food";

const STATUS_STYLES: Record<string, string> = {
  pending:              "bg-blue-900/40 text-blue-300",
  awaiting_payment:     "bg-yellow-900/40 text-yellow-300",
  preparing:            "bg-orange-900/40 text-orange-300",
  ready:                "bg-orange-900/40 text-orange-300",
  out_for_delivery:     "bg-amber-900/40 text-amber-300",
  accepted:             "bg-blue-900/40 text-blue-300",
  paid:                 "bg-green-900/40 text-green-300",
  shipped:              "bg-amber-900/40 text-amber-300",
  processing:           "bg-amber-900/40 text-amber-300",
  delivered:            "bg-amber-900/40 text-amber-300",
  completed:            "bg-green-900/40 text-green-300",
  delivery_confirmed:   "bg-green-900/40 text-green-300",
  cancelled:            "bg-red-900/40 text-red-300",
  rejected:             "bg-red-900/40 text-red-300",
  disputed:             "bg-red-900/40 text-red-300",
  refunded:             "bg-yellow-900/40 text-yellow-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending:              "Pending",
  awaiting_payment:     "Awaiting payment",
  preparing:            "Preparing",
  ready:                "Ready",
  out_for_delivery:     "On the way",
  accepted:             "Accepted",
  paid:                 "Paid",
  shipped:              "Shipped",
  delivered:            "Delivered",
  completed:            "Completed",
  delivery_confirmed:   "Delivered",
  cancelled:            "Cancelled",
  rejected:             "Cancelled",
  disputed:             "Disputed",
  refunded:             "Refunded",
};

interface Props extends Order {
  index?: number;
  viewMode?: "list" | "grid";
  /** "buyer" = this is a purchase, "seller" = this is a sale. Drives the
   *  counterparty label so a sale and a purchase are told apart at a glance. */
  role?: "buyer" | "seller";
}

const OrderHistoryItem: React.FC<Props> = React.memo((item) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const viewMode = item.viewMode ?? "list";
  const isSale = item.role === "seller";

  const sellerName = useMemo(
    () =>
      (typeof item.seller === "object" ? item.seller?.name : item.seller) ||
      "Unknown Seller",
    [item.seller]
  );

  const buyerName = useMemo(
    () =>
      (typeof item.buyer === "object" ? item.buyer?.name : item.buyer) ||
      "a buyer",
    [item.buyer]
  );

  // "Sold to X" for a sale, "by <seller>" for a purchase.
  const counterparty = isSale ? `Sold to ${buyerName}` : `by ${sellerName}`;

  const productImage = useMemo(
    () => item.product?.images?.[0] || "https://placehold.co/200x200?text=?",
    [item.product?.images]
  );

  const date = useMemo(
    () =>
      new Date(item.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [item.createdAt]
  );

  const statusKey = item.status?.toLowerCase() ?? "";
  const statusStyle = STATUS_STYLES[statusKey] ?? "bg-gray-700/30 text-gray-300";
  const statusLabel = STATUS_LABELS[statusKey] ?? item.status;

  if (viewMode === "grid") {
    return (
      <button
        onClick={() => navigate(`/orders/${item._id}`)}
        className="w-full text-left bg-[#292B30] rounded-xl overflow-hidden hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors"
      >
        <img
          src={productImage}
          alt={item.product?.name ?? "Product"}
          loading="lazy"
          className="w-full aspect-square object-cover bg-[#1a1c20]"
        />
        <div className="p-2.5">
          <p className="font-semibold text-white text-xs truncate">
            {item.product?.name ?? "Unknown Product"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{counterparty}</p>
          <div className="flex items-center justify-between mt-1.5 gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle}`}>
              {statusLabel}
            </span>
            <span className="text-[10px] text-gray-500 truncate">{date}</span>
          </div>
        </div>
      </button>
    );
  }

  // List view (default)
  return (
    <button
      onClick={() => navigate(`/orders/${item._id}`)}
      className="w-full text-left bg-[#292B30] rounded-xl p-3 flex items-center gap-2 xxs:gap-3 hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors"
    >
      <img
        src={productImage}
        alt={item.product?.name ?? "Product"}
        loading="lazy"
        className="w-14 h-14 xxs:w-16 xxs:h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white text-sm truncate">
            {item.product?.name ?? "Unknown Product"}
          </p>
          <span
            className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              isSale ? "bg-green-900/40 text-green-300" : "bg-blue-900/40 text-blue-300"
            }`}
          >
            {isSale ? "Sale" : "Purchase"}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{counterparty}</p>
        <p className="text-sm font-medium text-white mt-1.5">
          {item.currency?.toUpperCase() === "NGN" || item.totals
            ? formatNaira(item.totals?.total ?? item.amount ?? 0)
            : formatAmount(item.amount ?? 0, item.product?.paymentToken ?? "USDm")}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle}`}>
          {statusLabel}
        </span>
        <span className="text-xs text-gray-500">{date}</span>
        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
});

OrderHistoryItem.displayName = "OrderHistoryItem";
export default OrderHistoryItem;
