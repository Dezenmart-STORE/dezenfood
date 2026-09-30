import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useGetUserOrdersQuery } from "../store/api";
import TradeCard from "../components/trade/TradeCard";
import ConnectModal from "../components/wallet/ConnectModal";
import type { TradeData } from "../components/trade/TradeCard";

type Tab = "active" | "completed";

const ViewTrade = () => {
  const navigate = useNavigate();
  const { isConnected, isConnecting } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data: buyerOrders, isLoading: buyerLoading } =
    useGetUserOrdersQuery(
      { type: "buyer" },
      { skip: !isConnected, pollingInterval: 30_000 }
    );

  const { data: sellerOrders, isLoading: sellerLoading } =
    useGetUserOrdersQuery(
      { type: "seller" },
      { skip: !isConnected, pollingInterval: 30_000 }
    );

  const isLoading = buyerLoading || sellerLoading;

  const allOrders = useMemo(() => {
    const orders = [...(buyerOrders || []), ...(sellerOrders || [])];
    return orders.filter((o) => o && o.product);
  }, [buyerOrders, sellerOrders]);

  const activeTrades = useMemo(
    () =>
      allOrders
        .filter((o) => o.status !== "completed" && o.status !== "rejected")
        .map(mapOrderToTradeData),
    [allOrders]
  );

  const completedTrades = useMemo(
    () =>
      allOrders
        .filter((o) => o.status === "completed" || o.status === "rejected")
        .map(mapOrderToTradeData),
    [allOrders]
  );

  const currentTrades = activeTab === "active" ? activeTrades : completedTrades;

  const handleTradeClick = useCallback(
    (tradeId: string) => {
      navigate(`/orders/${tradeId}`);
    },
    [navigate]
  );

  // ── Not connected ──────────────────────────────────────────────
  if (!isConnected && !isConnecting) {
    return (
      <div className="min-h-screen bg-[#1a1c20] px-4">
        <div className="mx-auto max-w-lg py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#292B30]">
            <svg className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="mt-2 text-sm text-gray-400">
            Connect your wallet to view your trades and orders.
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="mt-6 rounded-xl bg-brand px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98]"
          >
            Connect Wallet
          </button>

          {showConnectModal && (
            <ConnectModal onClose={() => setShowConnectModal(false)} />
          )}
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#212428] px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {/* Page heading */}
        <h1 className="mb-6 text-2xl font-bold text-white">My Trades</h1>

        {/* Tab navigation */}
        <div className="mb-6 flex rounded-xl bg-[#292B30] p-1">
          <TabButton
            label="Active"
            count={activeTrades.length}
            isActive={activeTab === "active"}
            onClick={() => setActiveTab("active")}
          />
          <TabButton
            label="Completed"
            count={completedTrades.length}
            isActive={activeTab === "completed"}
            onClick={() => setActiveTab("completed")}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[#292B30]"
              />
            ))}
          </div>
        ) : currentTrades.length > 0 ? (
          <div className="space-y-3">
            {currentTrades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onClick={() => handleTradeClick(trade.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#292B30] bg-[#292B30] py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1c20]">
              <svg className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">
              {activeTab === "active" ? "No Active Trades" : "No Completed Trades"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "active"
                ? "Once you start a trade, it will appear here."
                : "Your completed trades will show up here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
        isActive
          ? "bg-brand text-white shadow-sm"
          : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            isActive ? "bg-white/20 text-white" : "bg-[#1a1c20] text-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function mapOrderToTradeData(order: any): TradeData {
  return {
    id: order.orderId,
    productName: order.product?.name ?? "Unknown Product",
    productImage: order.product?.images?.[0],
    amount: order.amount ?? 0,
    tokenSymbol: order.product?.paymentToken ?? "USDm",
    quantity: order.quantity ?? 1,
    status: mapStatus(order.status),
    role: order.role ?? "buyer",
    counterparty: order.counterpartyName ?? order.seller?.name ?? "",
    createdAt: order.createdAt,
    tradeId: order.tradeId,
  };
}

function mapStatus(status: string): TradeData["status"] {
  const statusMap: Record<string, TradeData["status"]> = {
    pending: "pending_payment",
    accepted: "paid",
    paid: "paid",
    shipped: "shipped",
    delivered: "delivered",
    completed: "completed",
    disputed: "disputed",
    cancelled: "cancelled",
    rejected: "cancelled",
    refunded: "cancelled",
    delivery_confirmed: "completed",
  };
  return statusMap[status] ?? "pending_payment";
}

export default ViewTrade;
