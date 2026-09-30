import { useState } from "react";
import { useAccount } from "wagmi";
import PaymentFlow from "../payment/PaymentFlow";
import { useCurrency } from "../../context/CurrencyContext";
import { calculateOrderTotal } from "../../utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  tradeId: string;
  tokenSymbol: string;
}

interface LogisticsOption {
  provider: `0x${string}`;
  name: string;
  cost: number;
  /** Cost as bigint-compatible string (in token smallest units) */
  costRaw: string;
}

interface Props {
  mode: "buy" | "sell";
  product: Product;
  logisticsOptions: LogisticsOption[];
  onSuccess?: (txHash: string, purchaseId?: string) => void;
  onBack?: () => void;
}

/**
 * Unified checkout page - handles both buy and sell flows.
 * Dark themed, responsive, web2-friendly.
 */
export default function Checkout({
  mode,
  product,
  logisticsOptions,
  onSuccess,
  onBack,
}: Props) {
  const { isConnected } = useAccount();
  const { formatAmount, formatDisplayPrice, convertPrice } = useCurrency();

  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsOption | null>(
    logisticsOptions[0] ?? null
  );
  const [showPayment, setShowPayment] = useState(false);

  // product.price is stored in USD - convert to the payment token denomination
  // so all math (subtotal, total) and the PaymentFlow amount are correct.
  const priceInToken = convertPrice(product.price, "USD", product.tokenSymbol);

  const logisticsCost = selectedLogistics?.cost ?? 0;
  const orderTotal = calculateOrderTotal(priceInToken, quantity, logisticsCost);

  // ── Payment flow screen ──────────────────────────────────────────
  if (showPayment && selectedLogistics) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 sm:px-0">
        <button
          onClick={() => setShowPayment(false)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to order
        </button>

        <PaymentFlow
          tradeId={product.tradeId}
          quantity={quantity}
          productToken={product.tokenSymbol}
          totalAmount={orderTotal.total}
          logisticsProvider={selectedLogistics.provider}
          logisticsCost={parseFloat(selectedLogistics.costRaw) > 0 ? selectedLogistics.costRaw : "0.1"}
          onSuccess={onSuccess}
          onClose={() => setShowPayment(false)}
          productName={product.name}
          productImage={product.image}
        />
      </div>
    );
  }

  // ── Main checkout screen ─────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 sm:px-0">
      {/* Page header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-white"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-xl font-bold text-white">
          {mode === "buy" ? "Checkout" : "List for Sale"}
        </h1>
      </div>

      {/* Product card */}
      <div className="flex gap-4 rounded-2xl border border-[#292B30] bg-[#292B30] p-4">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">{product.name}</h2>
          <p className="mt-1 text-xl font-bold text-white">
            {priceInToken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            <span className="text-base font-medium text-gray-400">{product.tokenSymbol}</span>
          </p>
          <p className="text-xs text-gray-500">
            {formatDisplayPrice(product.price, (product as { currency?: string }).currency)}
          </p>
        </div>
      </div>

      {/* Quantity selector */}
      {mode === "buy" && (
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-4">
          <label className="text-sm font-medium text-gray-300">Quantity</label>
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292B30] bg-[#292B30] text-lg font-bold text-white transition-colors hover:bg-[#373A3F] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xl font-bold text-white">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292B30] bg-[#292B30] text-lg font-bold text-white transition-colors hover:bg-[#373A3F]"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Delivery options */}
      {mode === "buy" && logisticsOptions.length > 0 && (
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-4">
          <label className="text-sm font-medium text-gray-300">Delivery Option</label>
          <div className="mt-3 space-y-2">
            {logisticsOptions.map((opt) => (
              <button
                key={opt.provider}
                onClick={() => setSelectedLogistics(opt)}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                  selectedLogistics?.provider === opt.provider
                    ? "border-red-700/60 bg-red-900/20 ring-1 ring-red-800/40"
                    : "border-[#292B30] bg-[#292B30] hover:border-[#373A3F] hover:bg-[#373A3F]"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{opt.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatAmount(opt.cost, product.tokenSymbol)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {opt.cost.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-400">{product.tokenSymbol}</span>
                  </span>
                  {selectedLogistics?.provider === opt.provider && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order summary */}
      <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-4">
        <h3 className="text-sm font-semibold text-gray-300">Order Summary</h3>
        <div className="mt-3 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Subtotal ({quantity} item{quantity > 1 ? "s" : ""})
            </span>
            <span className="text-gray-300">
              {orderTotal.subtotal.toFixed(2)} {product.tokenSymbol}
            </span>
          </div>
          {logisticsCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="text-gray-300">
                {logisticsCost.toFixed(2)} {product.tokenSymbol}
              </span>
            </div>
          )}
          <div className="border-t border-[#292B30] pt-2.5">
            <div className="flex justify-between">
              <span className="font-bold text-white">Total</span>
              <div className="text-right">
                <p className="font-bold text-white">
                  {orderTotal.total.toFixed(2)}{" "}
                  <span className="font-semibold text-gray-400">{product.tokenSymbol}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatAmount(orderTotal.total, product.tokenSymbol)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow protection notice */}
      <div className="flex items-start gap-2.5 rounded-xl border border-green-900/40 bg-green-900/20 p-3.5 text-sm text-green-300">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>
          Your payment is held securely in escrow until you confirm delivery. You're fully protected.
        </span>
      </div>

      {/* CTA button */}
      <button
        onClick={() => setShowPayment(true)}
        disabled={mode === "buy" && !selectedLogistics}
        className="w-full rounded-xl bg-brand py-4 text-sm font-bold text-white transition-all hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mode === "buy"
          ? `Pay ${orderTotal.total.toFixed(2)} ${product.tokenSymbol}`
          : "List Item for Sale"}
      </button>
    </div>
  );
}
