import { formatNaira } from "../../../utils/food";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Order } from "../../../utils/types";
import { useCurrency } from "../../../context/CurrencyContext";

const DISPUTE_STATUS_STYLES: Record<string, string> = {
  "pending":      "bg-yellow-900/40 text-yellow-300",
  "under review": "bg-blue-900/40 text-blue-300",
  "resolved":     "bg-green-900/40 text-green-300",
  "rejected":     "bg-red-900/40 text-red-300",
};

interface Props {
  order: Order;
  disputeStatus: string;
  viewMode?: "list" | "grid";
}

const DisputeItem: React.FC<Props> = React.memo(({ order, disputeStatus, viewMode = "list" }) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const sellerName = useMemo(
    () =>
      (typeof order.seller === "object" ? order.seller?.name : order.seller) ||
      "Unknown Seller",
    [order.seller]
  );

  const productImage = useMemo(
    () => order.product?.images?.[0] || "https://placehold.co/200x200?text=?",
    [order.product?.images]
  );

  const date = useMemo(() => {
    const raw = order.dispute?.createdAt ?? order.createdAt;
    return new Date(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [order.dispute?.createdAt, order.createdAt]);

  const statusStyle =
    DISPUTE_STATUS_STYLES[disputeStatus.toLowerCase()] ??
    "bg-amber-900/40 text-amber-300";

  if (viewMode === "grid") {
    return (
      <button
        onClick={() => navigate(`/orders/${order._id}`)}
        className="w-full text-left bg-[#292B30] rounded-xl overflow-hidden hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors"
      >
        <img
          src={productImage}
          alt={order.product?.name ?? "Product"}
          loading="lazy"
          className="w-full aspect-square object-cover bg-[#1a1c20]"
        />
        <div className="p-2.5">
          <p className="font-semibold text-white text-xs truncate">
            {order.product?.name ?? "Unknown Product"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">by {sellerName}</p>
          <div className="flex items-center justify-between mt-1.5 gap-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle}`}>
              {disputeStatus}
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
      onClick={() => navigate(`/orders/${order._id}`)}
      className="w-full text-left bg-[#292B30] rounded-xl p-3 flex items-center gap-2 xxs:gap-3 hover:bg-[#32353A] active:bg-[#3A3D42] transition-colors"
    >
      <img
        src={productImage}
        alt={order.product?.name ?? "Product"}
        loading="lazy"
        className="w-14 h-14 xxs:w-16 xxs:h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
      />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          {order.product?.name ?? "Unknown Product"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">by {sellerName}</p>
        <p className="text-sm font-medium text-white mt-1.5">
          {order.currency?.toUpperCase() === "NGN" || order.totals
            ? formatNaira(order.totals?.total ?? order.amount ?? 0)
            : formatAmount(order.amount ?? 0, order.product?.paymentToken ?? "USDm")}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle}`}>
          {disputeStatus}
        </span>
        <span className="text-xs text-gray-500">{date}</span>
        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
});

DisputeItem.displayName = "DisputeItem";
export default DisputeItem;
