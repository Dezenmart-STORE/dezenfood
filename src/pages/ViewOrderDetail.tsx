import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChainId, useSwitchChain } from "wagmi";
import {
  useGetOrderByIdQuery,
  useGetProductByIdQuery,
  useUpdateOrderStatusMutation,
  useCreateReviewMutation,
  useGetOrderReviewQuery,
} from "../store/api";
import TradeStatus from "../components/trade/TradeStatus";
import TradeActions from "../components/trade/TradeActions";
import TransactionResult from "../components/trade/TransactionResult";
import PaymentFlow from "../components/payment/PaymentFlow";

import FiatPaymentFlow from "../components/payment/FiatPaymentFlow";
import FiatOrderActions from "../components/trade/FiatOrderActions";
import PaymentMethodSelector, {
  type MethodOption,
  type PaymentMethod,
} from "../components/payment/PaymentMethodSelector";
import type { TradeState } from "../components/trade/TradeStatus";
import { FEATURES } from "../config/brand";
import { formatNaira } from "../utils/food";
import { useGetPaymentMethodsQuery, type FiatProvider } from "../store/api/paymentsApi";
import type { OrderStatus } from "../utils/types";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { calculateOrderTotal } from "../utils/format";
import {
  CHAIN_IDS,
  DEFAULT_LOGISTICS_PROVIDER,
  getExplorerUrl,
} from "../config/chains";

// Statuses where the order is still moving, so the page keeps itself fresh
// (payment webhooks and vendor/courier updates arrive while it is open).
const LIVE_STATUSES = new Set([
  "pending", "awaiting_payment", "accepted", "paid", "preparing", "ready",
  "out_for_delivery", "shipped", "delivered",
]);

const ViewOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { formatAmount, convertPrice } = useCurrency();
  // Poll while the order is still moving (webhooks / vendor / courier updates).
  const [pollMs, setPollMs] = useState(15000);
  const { user } = useAuth();
  const currentUserId = user?._id;

  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);
  const isOnCelo =
    chainId === CHAIN_IDS.CELO || chainId === CHAIN_IDS.CELO_SEPOLIA;

  const switchToCelo = async () => {
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: CHAIN_IDS.CELO });
    } catch {
      // User rejected - banner will remain visible
    } finally {
      setIsSwitching(false);
    }
  };

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useGetOrderByIdQuery(orderId!, { skip: !orderId, pollingInterval: pollMs });
  const { data: paymentMethods = [] } = useGetPaymentMethodsQuery();

  // The order's embedded product is trimmed (no tradeId/paymentToken), which
  // the escrow payment needs - fetch the full product to fill those in.
  const productId =
    order && typeof order.product === "object" ? order.product?._id : undefined;
  const { data: fullProduct } = useGetProductByIdQuery(productId ?? "", {
    skip: !productId,
  });

  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [checklistComplete, setChecklistComplete] = useState(false);
  // Set to true the moment buyTrade succeeds so the Pay button never re-appears
  // even if the backend API update is slow or fails.
  const [paidOnChain, setPaidOnChain] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#212428]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
          <p className="mt-4 text-sm text-gray-500">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#1a1c20] px-4 py-12">
        <div className="mx-auto max-w-lg">
          <TransactionResult
            success={false}
            message="Could not load this order. It may not exist or you may not have access."
            onDone={() => navigate("/account")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  const status = mapStatus(order.status);
  // Food / fiat orders are priced in NGN with server-computed totals.
  const isNgnOrder = order.currency?.toUpperCase() === "NGN" || !!order.totals;
  const isFiatRail = !!order.paymentRail && order.paymentRail !== "crypto";
  const tokenSymbol =
    order.totals?.crypto?.token ??
    fullProduct?.paymentToken ??
    order.product?.paymentToken ??
    "USDm";

  const sellerName =
    typeof order.seller === "object" ? order.seller?.name : order.seller;
  const sellerId =
    typeof order.seller === "object" ? order.seller?._id : order.seller;

  const buyerName =
    typeof order.buyer === "object" ? order.buyer?.name : order.buyer;
  const buyerId =
    typeof order.buyer === "object" ? order.buyer?._id : order.buyer;

  // The same route serves both parties. When the viewer is the seller we show a
  // read-only "Sale Details" view: status + counterparty, none of the buyer
  // controls (pay, delivery checklist, confirm/dispute, review the seller).
  const isSeller =
    !!currentUserId && sellerId === currentUserId && buyerId !== currentUserId;

  // tradeId (the on-chain listing id) drives escrow payment; the order's trimmed
  // product omits it, so prefer the full product.
  const tradeId = fullProduct?.tradeId ?? order.product?.tradeId ?? "";
  const awaitingPayment = status === "pending_payment" && !order.purchaseId && !paidOnChain;
  const hasOnChainListing = /^\d+$/.test(tradeId);

  // Rails offered for THIS order: what the backend has enabled, intersected with
  // what the vendor accepts and the feature flags. Legacy (USD) listings that
  // carry no acceptedPayments are crypto-only.
  const vendorRails = fullProduct?.acceptedPayments ?? (isNgnOrder ? ["korapay", "pandascrow"] : ["crypto"]);
  const fiatDue = order.totals?.total ?? order.amount ?? 0;
  const paymentOptions: MethodOption[] = [
    ...(FEATURES.fiat
      ? paymentMethods
          .filter((m) => m.provider !== "crypto" && m.enabled && vendorRails.includes(m.provider) && isNgnOrder)
          .map((m) => ({
            id: m.provider as PaymentMethod,
            label: m.label,
            blurb: m.blurb ?? (m.provider === "pandascrow" ? "Escrow-protected" : "Card, bank transfer"),
            summary: formatNaira(fiatDue),
          }))
      : []),
    ...(FEATURES.crypto && vendorRails.includes("crypto") && hasOnChainListing
      ? [{
          id: "crypto" as PaymentMethod,
          label: "Pay with Crypto",
          blurb: "Wallet, escrow-protected",
          summary: order.totals?.crypto ? `${order.totals.crypto.amount.toFixed(2)} ${order.totals.crypto.token}` : undefined,
        }]
      : []),
  ];
  const canPay = awaitingPayment && paymentOptions.length > 0;
  const goBackFromCheckout = () => {
    if (paymentOptions.length > 1) setPaymentMethod(null);
    else setShowPayment(false);
  };

  const providerAddr = DEFAULT_LOGISTICS_PROVIDER;

  // Logistics cost in the payment token (to match productPriceInToken below).
  // Prefer the order's authoritative deliveryFee (USD -> token); fall back to
  // the product's legacy per-provider cost list, then a small default.
  const _providerList = fullProduct?.logisticsProviders as string[] | undefined;
  const _costList = fullProduct?.logisticsCost as string[] | undefined;
  const _providerIdx =
    _providerList?.findIndex(
      (addr: string) =>
        addr?.toLowerCase() === DEFAULT_LOGISTICS_PROVIDER.toLowerCase(),
    ) ?? -1;
  const _legacyCost =
    _providerIdx >= 0 &&
    _costList?.[_providerIdx] &&
    parseFloat(_costList[_providerIdx]) > 0
      ? parseFloat(_costList[_providerIdx])
      : _costList?.[0] && parseFloat(_costList[0]) > 0
        ? parseFloat(_costList[0])
        : 0;

  const logisticsCostNumeric =
    order.deliveryFee != null && order.deliveryFee > 0
      ? convertPrice(order.deliveryFee, "USD", tokenSymbol)
      : _legacyCost || 0.1;
  const logisticsCostRaw = String(logisticsCostNumeric);

  // order.product.price is stored in USD - convert to payment token for correct amounts.
  // Fall back to order.amount (actual on-chain token amount) if product price unavailable.
  const productPriceInToken = order.product?.price
    ? convertPrice(order.product.price, "USD", tokenSymbol)
    : (order.amount ?? 0);

  // Crypto rail: prefer the backend's authoritative token amount over anything
  // computed here (audit W3-02).
  const orderTotal = order.totals?.crypto
    ? { subtotal: order.totals.crypto.amount, total: order.totals.crypto.amount }
    : calculateOrderTotal(productPriceInToken, order.quantity ?? 1, logisticsCostNumeric);

  const fmt = (n: number) => (isNgnOrder ? formatNaira(n) : `${n.toFixed(2)} ${tokenSymbol}`);
  const shown = isNgnOrder && order.totals
    ? { subtotal: order.totals.subtotal, total: order.totals.total, delivery: order.totals.deliveryFee, serviceFee: order.totals.serviceFee }
    : { subtotal: orderTotal.subtotal, total: orderTotal.total, delivery: logisticsCostNumeric, serviceFee: 0 };

  return (
    <div className="min-h-screen bg-[#212428] px-4 py-6">
      <PollGuard status={order.status} setPollMs={setPollMs} />
      <div className="mx-auto max-w-lg space-y-4">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/account")}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
            aria-label="Go back"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">
            {isSeller ? "Sale Details" : "Order Details"}
          </h1>
        </div>

        {/* Product info card */}
        <div className="flex gap-4 rounded-2xl border border-[#292B30] bg-[#292B30] p-4">
          {order.product?.images?.[0] && (
            <img
              src={order.product.images[0]}
              alt={order.product?.name}
              className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white">
              {order.product?.name ?? "Product"}
            </h2>
            {isNgnOrder ? (
              <p className="mt-1 text-xl font-bold text-white">{formatNaira(shown.total)}</p>
            ) : (
              <>
                <p className="mt-1 text-xl font-bold text-white">
                  {(order.amount || productPriceInToken).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-base font-medium text-gray-400">{tokenSymbol}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatAmount(order.amount || productPriceInToken, tokenSymbol)}
                </p>
              </>
            )}
            {!!order.items?.length && (
              <ul className="mt-1 space-y-0.5 text-xs text-gray-400">
                {order.items.map((i, idx) => (
                  <li key={`${i.product}-${idx}`}>
                    {i.quantity} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""}{i.note ? ` - "${i.note}"` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Status stepper */}
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Order Status
          </h3>
          <TradeStatus status={status} variant={isNgnOrder ? "food" : "default"} />
        </div>

        {/* Status-contextual info panel - buyers get the full flow, sellers a
            read-only sale summary. */}
        {isSeller ? (
          <SellerStatusPanel
            status={order.status}
            shown={shown}
            fmt={fmt}
          />
        ) : (
          <StatusInfoPanel
            status={status}
            order={order}
            shown={shown}
            fmt={fmt}
            isFood={isNgnOrder}
            chainId={chainId}
            onChecklistChange={setChecklistComplete}
          />
        )}

        {/* Wrong network warning (payment pending, wrong chain) */}
        {!isSeller && canPay && paymentMethod === "crypto" && !isOnCelo && (
          <div className="rounded-2xl border border-amber-800/40 bg-amber-900/20 p-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/30">
                <svg
                  className="h-6 w-6 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-amber-300">
                Wrong Network
              </h3>
              <p className="mt-1 text-sm text-amber-500">
                Your wallet needs to be on Celo to complete this payment.
              </p>
              <button
                onClick={switchToCelo}
                disabled={isSwitching}
                className="mt-4 w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-500 active:scale-[0.98] disabled:opacity-60"
              >
                {isSwitching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Switching…
                  </span>
                ) : (
                  "Switch to Celo"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Payment section - buyer only */}
        {!isSeller && (canPay || showPayment) && (
          <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
            {
              !showPayment ? (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/30">
                    <svg
                      className="h-6 w-6 text-amber-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    Payment Pending
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Complete your payment to confirm this order.
                  </p>
                  <div className="mt-3 rounded-lg border border-[#292B30] bg-[#292B30] px-3 py-2.5">
                    <p className="text-sm font-bold text-white">
                      Total:{" "}
                      <span className="text-brand">{fmt(shown.total)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPayment(true);
                      // One rail available: go straight to it, no picker with a single choice.
                      setPaymentMethod(paymentOptions.length === 1 ? paymentOptions[0].id : null);
                    }}
                    className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98]"
                  >
                    Pay Now
                  </button>
                </div>
              ) : !paymentMethod ? (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setShowPayment(false)}
                      className="rounded-full p-1 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-300">
                      Choose Payment Method
                    </span>
                  </div>
                  <PaymentMethodSelector options={paymentOptions} onSelect={setPaymentMethod} />
                </>
              ) : (paymentMethod === "korapay" || paymentMethod === "pandascrow") ? (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={goBackFromCheckout}
                      className="rounded-full p-1 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-300">
                      Complete Payment
                    </span>
                  </div>
                  <FiatPaymentFlow
                    orderId={orderId!}
                    provider={paymentMethod as FiatProvider}
                    amount={fiatDue}
                    defaultEmail={user?.email}
                    productName={order.items?.length ? `${order.items.length} item${order.items.length > 1 ? "s" : ""} from ${sellerName ?? "vendor"}` : order.product?.name}
                    productImage={order.items?.[0]?.image ?? order.product?.images?.[0]}
                    // The order only becomes "paid" when the backend has verified
                    // it with the provider. Nothing here writes order status.
                    onPaid={() => {
                      setShowPayment(false);
                      setPaymentMethod(null);
                      void refetch();
                    }}
                    onClose={() => {
                      setShowPayment(false);
                      setPaymentMethod(null);
                    }}
                  />
                </>
              ) : isOnCelo ? (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={goBackFromCheckout}
                      className="rounded-full p-1 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-300">
                      Complete Payment
                    </span>
                  </div>
                  <PaymentFlow
                    tradeId={tradeId}
                    quantity={order.quantity || 1}
                    productToken={tokenSymbol}
                    totalAmount={orderTotal.total}
                    logisticsProvider={providerAddr}
                    logisticsCost={logisticsCostRaw}
                    onSuccess={async (txHash, purchaseId) => {
                      setPaidOnChain(true);

                      if (orderId) {
                        let attempt = 0;
                        while (attempt < 3) {
                          try {
                            await updateOrderStatus({
                              orderId,
                              details: {
                                status: "accepted",
                                ...(purchaseId ? { purchaseId } : {}),
                                txHash,
                                paymentMethod: "crypto",
                              },
                            }).unwrap();
                            break;
                          } catch {
                            attempt++;
                            if (attempt < 3) {
                              await new Promise((r) =>
                                setTimeout(r, 2000 * attempt),
                              );
                            } else {
                              await refetch();
                            }
                          }
                        }
                      }
                    }}
                    onClose={() => {
                      setShowPayment(false);
                      setPaymentMethod(null);
                    }}
                    productName={order.product?.name}
                    productImage={order.product?.images?.[0]}
                  />
                </>
              ) : null /* wrong-network banner above handles this case */
            }
          </div>
        )}

        {/* Order information */}
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Order Information
          </h3>
          <div className="space-y-3">
            <DetailRow label="Order ID" value={`#${order.orderId}`} mono />
            {order.purchaseId && (
              <DetailRow
                label="Purchase ID"
                value={`#${order.purchaseId}`}
                mono
              />
            )}
            <DetailRow
              label="Date"
              value={
                order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"
              }
            />
            {order.quantity && (
              <DetailRow label="Quantity" value={String(order.quantity)} />
            )}
            {isSeller
              ? buyerName && <DetailRow label="Buyer" value={buyerName} />
              : sellerName && <DetailRow label="Seller" value={sellerName} />}
          </div>
        </div>

        {/* Post-payment actions (buyer only). Fiat/escrow-provider orders act through the backend */}
        {!isSeller && isFiatRail && <FiatOrderActions order={order} status={status} />}

        {/* On-chain orders act through the contract - valid numeric on-chain purchaseId */}
        {!isSeller && !isFiatRail && order.purchaseId && /^\d+$/.test(order.purchaseId) && (
          <TradeActions
            purchaseId={order.purchaseId}
            status={status}
            checklistComplete={checklistComplete}
            onActionComplete={async (action) => {
              if (!orderId) return;

              const statusMap: Record<string, OrderStatus> = {
                confirm: "completed",
                dispute: "disputed",
                cancel: "rejected",
              };
              const newStatus = statusMap[action];
              if (newStatus) {
                try {
                  await updateOrderStatus({
                    orderId,
                    details: { status: newStatus },
                  }).unwrap();
                } catch {
                  // Mutation failed - invalidatesTags didn't fire, so manually
                  // refetch to keep the UI in sync with the server.
                  refetch();
                }
              }

              if (action === "cancel") navigate("/account");
            }}
          />
        )}

        {/* Review - buyer reviews the seller after completion */}
        {!isSeller && status === "completed" && sellerId && orderId && (
          <ReviewForm orderId={orderId} reviewed={sellerId} />
        )}

        {/* Contact the counterparty */}
        {(() => {
          const contactId = isSeller ? buyerId : sellerId;
          if (!contactId) return null;
          return (
            <button
              onClick={() => navigate(`/chat/${contactId}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-[#373A3F] hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {isSeller ? "Contact Buyer" : "Contact Seller"}
            </button>
          );
        })()}
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={`text-sm font-medium text-white text-right break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Seller-facing status panel (read-only sale summary) ──────────────

const SELLER_STATUS_META: Record<
  string,
  { title: string; text: string; tone: "neutral" | "green" | "amber" | "red" }
> = {
  pending: {
    title: "Awaiting buyer payment",
    text: "The buyer placed this order. Funds are held in escrow once they pay.",
    tone: "neutral",
  },
  accepted: {
    title: "Payment secured in escrow",
    text: "The buyer has paid. The logistics provider will handle pickup and delivery.",
    tone: "green",
  },
  paid: {
    title: "Payment secured in escrow",
    text: "The buyer has paid. The logistics provider will handle pickup and delivery.",
    tone: "green",
  },
  shipped: {
    title: "On the way to the buyer",
    text: "The logistics provider has shipped this order.",
    tone: "amber",
  },
  delivered: {
    title: "Delivered",
    text: "Delivered to the buyer. Funds are released once they confirm receipt.",
    tone: "amber",
  },
  delivery_confirmed: {
    title: "Sale complete",
    text: "The buyer confirmed delivery and the funds have been released to you.",
    tone: "green",
  },
  completed: {
    title: "Sale complete",
    text: "The buyer confirmed delivery and the funds have been released to you.",
    tone: "green",
  },
  disputed: {
    title: "Dispute under review",
    text: "The buyer raised a dispute on this order. Our team is reviewing it.",
    tone: "red",
  },
  rejected: {
    title: "Order cancelled",
    text: "This order was cancelled.",
    tone: "red",
  },
  refunded: {
    title: "Refunded to buyer",
    text: "This order was refunded to the buyer.",
    tone: "red",
  },
};

const SELLER_TONE: Record<string, string> = {
  neutral: "border-[#292B30] bg-[#212428]",
  green: "border-green-900/40 bg-green-900/10",
  amber: "border-amber-900/40 bg-amber-900/20",
  red: "border-red-900/40 bg-red-900/10",
};

function SellerStatusPanel({
  status,
  shown,
  fmt,
}: {
  status: string;
  shown: { subtotal: number; total: number };
  fmt: (n: number) => string;
}) {
  const s = (status || "").toLowerCase();
  const meta = SELLER_STATUS_META[s] ?? {
    title: "Order update",
    text: "We'll keep you posted as this sale progresses.",
    tone: "neutral" as const,
  };

  const released = s === "completed" || s === "delivery_confirmed";
  const inEscrow = ["accepted", "paid", "preparing", "ready", "out_for_delivery", "shipped", "delivered"].includes(s);
  const amountLabel = released
    ? "Amount released to you"
    : inEscrow
      ? "Amount in escrow"
      : "Order total";

  return (
    <div className={`rounded-2xl border p-5 ${SELLER_TONE[meta.tone]}`}>
      <h3 className="text-sm font-semibold text-white">{meta.title}</h3>
      <p className="mt-1 text-sm text-gray-400">{meta.text}</p>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#292B30] p-4">
        <span className="text-xs text-gray-500">{amountLabel}</span>
        <span className="text-sm font-bold text-white">
          {fmt(shown.total)}
        </span>
      </div>
    </div>
  );
}

// ── Status-contextual information panel ──────────────────────────────

const DELIVERY_CHECKS = [
  { id: "received", label: "I have received the package" },
  { id: "matches", label: "The item matches the listing description" },
  { id: "condition", label: "There is no damage or visible defects" },
  { id: "complete", label: "All parts and accessories are included" },
  {
    id: "acknowledge",
    label: "I understand this will release payment to the seller",
  },
];

const FOOD_CHECKS = [
  { id: "received", label: "I have received my order" },
  { id: "complete", label: "Everything I ordered is here" },
  { id: "condition", label: "The food is fresh and in good condition" },
  { id: "acknowledge", label: "I understand this will release payment to the vendor" },
];

function StatusInfoPanel({
  status,
  order,
  shown,
  fmt,
  isFood,
  chainId,
  onChecklistChange,
}: {
  status: TradeState;
  order: any;
  shown: { subtotal: number; total: number; delivery: number; serviceFee: number };
  fmt: (n: number) => string;
  isFood: boolean;
  chainId: number;
  onChecklistChange?: (complete: boolean) => void;
}) {
  const checks = isFood ? FOOD_CHECKS : DELIVERY_CHECKS;
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checks.map((c) => [c.id, false])),
  );
  const allChecked = checks.every((c) => checked[c.id]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    onChecklistChange?.(checks.every((c) => next[c.id]));
  };

  const toggleAll = () => {
    const next = Object.fromEntries(
      checks.map((c) => [c.id, !allChecked]),
    );
    setChecked(next);
    onChecklistChange?.(!allChecked);
  };

  const purchaseId = order.purchaseId as string | undefined;
  const isTxHash =
    typeof purchaseId === "string" &&
    purchaseId.startsWith("0x") &&
    purchaseId.length === 66;

  if (status === "pending_payment") {
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#292B30]">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Placed</h3>
            <p className="text-xs text-gray-500">Awaiting your payment</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Price Breakdown
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {order.product?.name ?? "Product"} × {order.quantity ?? 1}
              </span>
              <span className="text-sm text-white">
                {fmt(shown.subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Delivery</span>
              <span className="text-sm text-white">
                {fmt(shown.delivery)}
              </span>
            </div>
            {shown.serviceFee > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Service fee</span>
                <span className="text-sm text-white">{fmt(shown.serviceFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[#373A3F] pt-2.5">
              <span className="text-sm font-semibold text-white">
                Total Due
              </span>
              <span className="text-sm font-bold text-brand">
                {fmt(shown.total)}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          Your order is reserved - complete payment to confirm it.
        </p>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="rounded-2xl border border-green-900/40 bg-green-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg
              className="h-4 w-4 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Payment Confirmed
            </h3>
            <p className="text-xs text-green-500">Funds secured in escrow</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-[#292B30] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Amount in Escrow</span>
            <span className="text-sm font-bold text-white">
              {fmt(shown.total)}
            </span>
          </div>
          {purchaseId && (
            <div className="space-y-1">
              <span className="text-xs text-gray-500">Purchase ID</span>
              <p className="break-all font-mono text-xs text-gray-300">
                {purchaseId}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#373A3F] bg-[#292B30] p-3">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-xs text-gray-400">
            {isFood
              ? "Your payment is held in escrow. It's released to the vendor only after your order is delivered and you confirm you received it."
              : "Payment is held in a smart contract escrow. It's released to the seller only after your order is delivered and you confirm receipt."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "preparing" || status === "ready") {
    return (
      <div className="rounded-2xl border border-orange-800/40 bg-orange-900/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-orange-800/50 bg-orange-900/40 text-lg">
            {status === "ready" ? "🛍️" : "🍳"}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {status === "ready" ? "Your order is ready" : "The vendor is preparing your order"}
            </h3>
            <p className="text-xs text-orange-300">
              {status === "ready"
                ? "Waiting for the delivery rider to pick it up."
                : order.prepTimeMinutes
                  ? `Usually about ${order.prepTimeMinutes} minutes`
                  : "You'll be notified as soon as it's ready"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Your payment stays in escrow until you confirm you received your order.
        </p>
      </div>
    );
  }

  if (status === "shipped" || status === "out_for_delivery") {
    const fmtDate = (iso?: string) =>
      iso
        ? new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
    const shippedDate = fmtDate(order.shippedAt);
    const carrierName = order.logisticsProvider?.name;
    const carrierPhone = order.logisticsProvider?.phone;
    const shippingNotes = order.shippingNotes?.trim();
    const eta = fmtDate(order.expectedDeliveryDate);
    const hasShippingDetails =
      carrierName || carrierPhone || shippingNotes || eta;

    return (
      <div className="rounded-2xl border border-blue-800/40 bg-blue-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-blue-800/50 bg-blue-900/40">
            <svg
              className="h-4 w-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.707 10.293A1 1 0 007.7 19h8.6a1 1 0 00.993-.868L18 8M10 12h4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isFood ? "Your Order Is On the Way" : "Your Item Is On the Way"}
            </h3>
            <p className="text-xs text-blue-400">
              {shippedDate
                ? `${isFood ? "Picked up" : "Shipped"} on ${shippedDate}`
                : "Your order has been dispatched"}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-[#292B30] p-4">
          {hasShippingDetails ? (
            <>
              {carrierName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Carrier</span>
                  <span className="text-sm font-medium text-white">
                    {carrierName}
                  </span>
                </div>
              )}
              {carrierPhone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Carrier contact</span>
                  <a
                    href={`tel:${carrierPhone}`}
                    className="text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    {carrierPhone}
                  </a>
                </div>
              )}
              {shippingNotes && (
                <div className="flex items-start justify-between gap-4">
                  <span className="flex-shrink-0 text-xs text-gray-500">
                    Note
                  </span>
                  <span className="text-right text-sm text-gray-300">
                    {shippingNotes}
                  </span>
                </div>
              )}
              {eta && (
                <div className="flex items-center justify-between border-t border-[#373A3F] pt-3">
                  <span className="text-xs text-gray-500">Est. delivery</span>
                  <span className="text-sm font-medium text-white">{eta}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">
              Your order is on the way. Contact the seller if you need an
              update.
            </p>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-blue-900/40 bg-blue-900/20 p-3">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-blue-300">
            Your delivery provider marks this as delivered once it arrives.
            You'll then be able to confirm receipt to release payment from
            escrow.
          </p>
        </div>
      </div>
    );
  }

  if (status === "delivered") {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/40">
            <svg
              className="h-4 w-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isFood ? "Check Your Order" : "Inspect Your Delivery"}
            </h3>
            <p className="text-xs text-amber-400">
              Check each item before confirming
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Delivery checklist
            </p>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="space-y-3">
            {checks.map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-all ${
                    checked[item.id]
                      ? "border-green-600 bg-green-600"
                      : "border-[#373A3F] bg-[#1a1c20] hover:border-gray-500"
                  }`}
                >
                  {checked[item.id] && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm transition-colors ${
                    checked[item.id] ? "text-white" : "text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {checks.filter((c) => checked[c.id]).length} of{" "}
                {checks.length} completed
              </span>
              {allChecked && (
                <span className="text-xs font-medium text-green-400">
                  Ready to confirm
                </span>
              )}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#1a1c20]">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-300"
                style={{
                  width: `${(checks.filter((c) => checked[c.id]).length / checks.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-900/40 bg-red-900/20 p-3">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-red-300">
            Confirming delivery <strong>permanently releases payment</strong>{" "}
            from escrow to the {isFood ? "vendor" : "seller"}. This cannot be undone.
          </p>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    const explorerHref =
      isTxHash && purchaseId ? getExplorerUrl(chainId, purchaseId, "tx") : null;
    const completedDate = order.updatedAt ?? order.createdAt;

    return (
      <div className="rounded-2xl border border-green-900/40 bg-green-900/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg
              className="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Complete</h3>
            <p className="text-xs text-green-500">Successfully delivered</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#292B30] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Order Summary
          </p>
          <div className="space-y-2.5">
            <DetailRow label="Product" value={order.product?.name ?? "-"} />
            <DetailRow label="Quantity" value={String(order.quantity ?? 1)} />
            <DetailRow
              label="Total Paid"
              value={fmt(shown.total)}
            />
            {completedDate && (
              <DetailRow
                label="Completed"
                value={new Date(completedDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            )}
            {purchaseId && (
              <DetailRow label="Purchase ID" value={purchaseId} mono />
            )}
          </div>

          {explorerHref && (
            <a
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#373A3F] bg-[#1a1c20] py-2.5 text-xs font-medium text-gray-400 transition-colors hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View on Blockchain Explorer
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === "disputed") {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-800/50 bg-amber-900/40">
            <svg
              className="h-4 w-4 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Order Under Dispute
            </h3>
            <p className="text-xs text-amber-400">Under review</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          This order is currently under dispute. Our team will review the
          situation and mediate a fair resolution. Funds remain safely in escrow
          until the dispute is resolved.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Please avoid taking any action until you hear from us.
        </p>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#292B30]">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Order Cancelled
            </h3>
            <p className="text-xs text-gray-500">No further action needed</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          This order has been cancelled. If a payment was made, a refund will be
          processed to your wallet.
        </p>
      </div>
    );
  }

  return null;
}

// ── Review form (shown after order is completed) ──────────────────────

function ReviewForm({
  orderId,
  reviewed,
}: {
  orderId: string;
  reviewed: string;
}) {
  const { data: existingReview, isLoading: reviewLoading } =
    useGetOrderReviewQuery(orderId);
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (reviewLoading) return null;

  // Already reviewed - show the submitted review
  if (existingReview || done) {
    const r = existingReview;
    const displayRating = r?.rating ?? rating;
    const displayComment = r?.comment ?? comment;
    return (
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
            <svg
              className="h-4 w-4 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Review Submitted
            </h3>
            <p className="text-xs text-gray-500">Thank you for your feedback</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#292B30] p-4">
          <div className="mb-2 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`h-5 w-5 ${s <= displayRating ? "text-amber-400" : "text-gray-600"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          {displayComment && (
            <p className="text-sm text-gray-300">{displayComment}</p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (!comment.trim()) {
      setError("Please write a short comment.");
      return;
    }
    setError("");
    const result = await createReview({
      reviewed,
      order: orderId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      comment: comment.trim(),
    });
    if ("data" in result) {
      setDone(true);
    } else {
      setError("Couldn't submit your review. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
      <h3 className="mb-1 text-sm font-semibold text-white">
        Rate Your Experience
      </h3>
      <p className="mb-4 text-xs text-gray-500">
        How was the product and seller?
      </p>

      {/* Star picker */}
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform active:scale-90"
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
          >
            <svg
              className={`h-8 w-8 transition-colors ${
                s <= (hovered || rating) ? "text-amber-400" : "text-gray-600"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 self-center text-xs text-gray-400">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience with this product and seller…"
        rows={3}
        className="w-full resize-none rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Submitting…
          </span>
        ) : (
          "Submit Review"
        )}
      </button>
    </div>
  );
}

function mapStatus(status: string): TradeState {
  const map: Record<string, TradeState> = {
    pending: "pending_payment",
    awaiting_payment: "pending_payment",
    accepted: "paid",
    paid: "paid",
    preparing: "preparing",
    ready: "ready",
    out_for_delivery: "out_for_delivery",
    shipped: "shipped",
    delivered: "delivered",
    completed: "completed",
    delivery_confirmed: "completed",
    disputed: "disputed",
    cancelled: "cancelled",
    rejected: "cancelled",
    refunded: "cancelled",
    release: "completed",
  };
  return map[status?.toLowerCase()] ?? "pending_payment";
}

/** Stops polling once an order reaches a final state. */
function PollGuard({ status, setPollMs }: { status: string; setPollMs: (ms: number) => void }) {
  useEffect(() => {
    setPollMs(LIVE_STATUSES.has((status ?? "").toLowerCase()) ? 15000 : 0);
  }, [status, setPollMs]);
  return null;
}

export default ViewOrderDetail;
