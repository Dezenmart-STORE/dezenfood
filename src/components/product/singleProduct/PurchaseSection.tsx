import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  startTransition,
  createContext,
  useContext,
} from "react";
import { FaWallet, FaSpinner, FaShoppingBasket } from "react-icons/fa";
import {
  HiCurrencyDollar,
  HiSignal,
  HiExclamationTriangle,
  HiCheckCircle,
} from "react-icons/hi2";
import { Product, ProductVariant } from "../../../utils/types";
import { useCreateOrderMutation } from "../../../store/api";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/redux";
import { addToCart, conflictsWithCart } from "../../../store/slices/cartSlice";
import { FEATURES } from "../../../config/brand";
import { formatNaira } from "../../../utils/food";
import { useSnackbar } from "../../../context/SnackbarContext";
import { useAuth } from "../../../context/AuthContext";
import { useAccount, useChainId } from "wagmi";
import { useCurrency } from "../../../context/CurrencyContext";
import { useSwap } from "../../../hooks/useSwap";
import { useTokenBalances } from "../../../hooks/useTokenBalances";
import ConnectModal from "../../wallet/ConnectModal";
import type { StableToken } from "../../../config/tokens";

import QuantitySelector from "./QuantitySelector";
import DeliveryAddressSelector from "./DeliveryAddressSelector";
import LogisticsProviderSelector from "./LogisticsProviderSelector";
import type { DeliveryAddress, AvailableProvider, CreateOrderParams } from "../../../utils/types";
import { getErrorMessage } from "../../../utils/errors";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormattedProduct extends Product {
  celoPrice: number;
  fiatPrice: number;
  tokenPrice: number;
  formattedTokenPrice: string;
  formattedUsdtPrice: string;
  formattedCeloPrice: string;
  formattedFiatPrice: string;
}

interface PurchaseSectionProps {
  product?: FormattedProduct;
  selectedVariant?: ProductVariant;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BALANCE_PRECISION = 6;
const MIN_STOCK_THRESHOLD = 10;

// ── Internal state hook ───────────────────────────────────────────────────────
const usePurchaseState = () => {
  const [state, setState] = useState({
    quantity: 1,
    selectedAddress: null as DeliveryAddress | null,
    selectedLogistics: null as AvailableProvider | null,
    isProcessing: false,
    purchaseError: null as string | null,
    showWalletModal: false,
    mounted: false,
  });

  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return [state, updateState] as const;
};

// ── Calculated totals hook ────────────────────────────────────────────────────
const useCalculatedTotals = ({
  product,
  selectedLogistics,
  quantity,
  convertPrice,
  walletSelectedToken,
}: {
  product?: FormattedProduct;
  selectedLogistics: AvailableProvider | null;
  quantity: number;
  convertPrice: (amount: number, from: string, to: string) => number;
  walletSelectedToken: StableToken;
}) => {
  return useMemo(() => {
    if (!product) {
      return {
        grandTotalUsd: 0,
        totalInSelected: 0,
        totalInPayment: 0,
        subtotal: 0,
        logisticsCost: 0,
      };
    }

    const subtotal = product.price * quantity;
    const logisticsCost = selectedLogistics?.cost || 0;
    const grandTotalUsd = subtotal + logisticsCost;

    // NGN-priced (food) listings are paid over fiat rails; token amounts for the
    // optional crypto rail are computed by the backend at payment time.
    const isFiat = product.currency?.toUpperCase() === "NGN";
    const totalInSelected = isFiat ? 0 : convertPrice(grandTotalUsd, "USDT", walletSelectedToken.symbol);
    const totalInPayment = isFiat || !product.paymentToken ? 0 : convertPrice(grandTotalUsd, "USDT", product.paymentToken);

    return { grandTotalUsd, totalInSelected, totalInPayment, subtotal, logisticsCost };
  }, [product, selectedLogistics, quantity, convertPrice, walletSelectedToken]);
};

// ── Context ───────────────────────────────────────────────────────────────────
type PurchaseState = ReturnType<typeof usePurchaseState>[0];
type UpdateState = ReturnType<typeof usePurchaseState>[1];
type ComputedTotals = ReturnType<typeof useCalculatedTotals>;

interface PurchaseContextValue {
  product: FormattedProduct | undefined;
  selectedVariant: ProductVariant | undefined;
  state: PurchaseState;
  updateState: UpdateState;
  availableQty: number;
  stockStatus: { isOutOfStock: boolean; isLowStock: boolean };
  computedTotals: ComputedTotals;
  hasSufficientBalance: boolean;
  /** True when there is genuinely no way to pay: selected token has no swap
   *  route to the payment token AND the payment-token balance is too low. */
  isUnpayable: boolean;
  /** True when the selected token can be swapped to the payment token. */
  swapAvailable: boolean;
  /** User-facing reason the purchase is blocked, or null. */
  blockReason: string | null;
  isLoading: boolean;
  walletSelectedToken: StableToken;
  isConnected: boolean;
  address: `0x${string}` | undefined;
  isAuthenticated: boolean;
  isLoadingBalance: boolean;
  celoBalance: string | undefined;
  formatPrice: (price: number, currency: string) => string;
  formatBalance: (balance: string | undefined) => string;
  getBalance: (symbol: string) => { numeric: number; formatted: string } | undefined;
  handleButtonClick: () => Promise<void>;
  /** Food listings priced in NGN */
  isFiat: boolean;
  acceptsCrypto: boolean;
  acceptsFiat: boolean;
  minQuantity: number;
  handleAddToCart: () => void;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

const usePurchaseContext = (): PurchaseContextValue => {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("Must be used within PurchaseSectionProvider");
  return ctx;
};

// ── Mini display components ───────────────────────────────────────────────────
const ErrorDisplay = memo(({ error }: { error: string | null }) => {
  if (!error) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
      <HiExclamationTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
});

const StockStatus = memo(({ availableQty }: { availableQty: number }) => {
  const isOutOfStock = availableQty <= 0;
  const isLowStock = availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD;
  return (
    <div className="text-xs">
      {isOutOfStock ? (
        <span className="text-red-500 font-medium flex items-center gap-1">
          <HiExclamationTriangle className="w-3 h-3" /> Out of stock
        </span>
      ) : isLowStock ? (
        <span className="text-yellow-500 flex items-center gap-1">
          <HiSignal className="w-3 h-3" /> Only {availableQty} left
        </span>
      ) : (
        <span className="text-green-500 flex items-center gap-1">
          <HiCheckCircle className="w-3 h-3" /> {availableQty} available
        </span>
      )}
    </div>
  );
});

// Soft, non-blocking hint: what the buyer will pay and a gentle nudge if they
// may be short. The authoritative balance/swap/gas checks run on the order page
// at payment time, so this never blocks creating the order.
const PaymentHint = memo(
  ({
    isConnected,
    payToken,
    selectedSymbol,
    payAmountLabel,
    hasSufficientBalance,
    isUnpayable,
    swapAvailable,
  }: {
    isConnected: boolean;
    payToken: string;
    selectedSymbol: string;
    payAmountLabel: string;
    hasSufficientBalance: boolean;
    isUnpayable: boolean;
    swapAvailable: boolean;
  }) => {
    const needsSwap = isConnected && selectedSymbol !== payToken;
    // When blocked, the Footer shows the definitive red reason; here we just
    // show the amount so the two don't duplicate.
    return (
      <div className="bg-[#292B30] border border-gray-700/50 rounded-lg p-3 text-xs space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">You'll pay at checkout</span>
          <span className="text-white font-medium">{payAmountLabel}</span>
        </div>
        {!isUnpayable && needsSwap && swapAvailable && (
          <p className="text-gray-500">
            Your {selectedSymbol} will be swapped to {payToken} when you pay.
          </p>
        )}
        {!isUnpayable && isConnected && !hasSufficientBalance && (
          <p className="flex items-start gap-1.5 text-yellow-400/90">
            <HiSignal className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              You may need more funds. Add {payToken}
              {needsSwap && swapAvailable ? ` or enough ${selectedSymbol} to swap` : ""} before paying.
            </span>
          </p>
        )}
      </div>
    );
  }
);

const PriceBreakdown = memo(
  ({
    totals,
    formatPrice,
    isFiat,
  }: {
    totals: ComputedTotals;
    formatPrice: (p: number, c: string) => string;
    isFiat: boolean;
  }) => {
    const fmt = (n: number) => (isFiat ? formatNaira(n) : formatPrice(n, "USDT"));
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Subtotal:</span>
          <span>{fmt(totals.subtotal)}</span>
        </div>
        {totals.logisticsCost > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>Delivery:</span>
            <span>{fmt(totals.logisticsCost)}</span>
          </div>
        )}
        <div className="flex justify-between text-white font-semibold pt-2 border-t border-gray-700">
          <span>Total:</span>
          <span>{fmt(totals.grandTotalUsd)}</span>
        </div>
        <p className="text-[11px] text-gray-500">
          Final total is confirmed at checkout. Service fees may apply.
        </p>
      </div>
    );
  }
);

// ── Provider - all logic lives here ──────────────────────────────────────────
export const PurchaseSectionProvider: React.FC<
  PurchaseSectionProps & { children: React.ReactNode }
> = ({ product, selectedVariant, children }) => {
  const navigate = useNavigate();
  const [createOrder] = useCreateOrderMutation();
  const {
    convertPrice,
    formatPrice,
    selectedToken: walletSelectedToken,
  } = useCurrency();
  const { isConnected, address } = useAccount();
  useChainId(); // keep for chain awareness
  const { getQuote } = useSwap();
  const {
    isLoading: isLoadingBalance,
    refetch: refreshTokenBalance,
    getBalance,
    celoBalance,
  } = useTokenBalances();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((s) => s.cart);
  const { showSnackbar } = useSnackbar();

  const [state, updateState] = usePurchaseState();

  const isFiat = product?.currency?.toUpperCase() === "NGN";
  // Missing acceptedPayments = legacy (crypto-only) listing.
  const rails = product?.acceptedPayments ?? ["crypto"];
  const acceptsCrypto = FEATURES.crypto && rails.includes("crypto");
  const acceptsFiat = FEATURES.fiat && rails.some((r) => r !== "crypto");
  const minQuantity = Math.max(1, product?.minOrderQty ?? 1);

  useEffect(() => { updateState({ mounted: true }); }, [updateState]);

  useEffect(() => {
    startTransition(() => { updateState({ quantity: 1, purchaseError: null }); });
  }, [selectedVariant, updateState]);

  const availableQty = useMemo(() => {
    if (selectedVariant) return selectedVariant.quantity;
    return Number(product?.stock) || 0;
  }, [selectedVariant, product?.stock]);

  const stockStatus = useMemo(() => ({
    isOutOfStock: availableQty <= 0,
    isLowStock: availableQty > 0 && availableQty < MIN_STOCK_THRESHOLD,
  }), [availableQty]);

  const computedTotals = useCalculatedTotals({
    product,
    selectedLogistics: state.selectedLogistics,
    quantity: state.quantity,
    convertPrice,
    walletSelectedToken,
  });

  const hasSufficientBalance = useMemo(() => {
    if (!isConnected || !state.mounted) return false;
    const required =
      walletSelectedToken.symbol === product?.paymentToken
        ? computedTotals.totalInPayment
        : computedTotals.totalInSelected;
    const current = getBalance(walletSelectedToken.symbol);
    if (!current) return false;
    return current.numeric >= required;
  }, [isConnected, walletSelectedToken, product, computedTotals, state.mounted, getBalance]);

  // Read-only probe: can the selected token be swapped to the payment token?
  // "checking" is treated as available (optimistic) so we never block on a
  // pending check. Only a confirmed "none" can contribute to a block.
  const [swapRoute, setSwapRoute] = useState<"unknown" | "checking" | "available" | "none">("unknown");
  useEffect(() => {
    if (!isConnected || !product?.paymentToken) { setSwapRoute("unknown"); return; }
    if (walletSelectedToken.symbol === product.paymentToken) { setSwapRoute("available"); return; }
    let cancelled = false;
    setSwapRoute("checking");
    getQuote(walletSelectedToken.symbol, product.paymentToken, 0.1)
      .then((q) => { if (!cancelled) setSwapRoute(q ? "available" : "none"); })
      .catch(() => { if (!cancelled) setSwapRoute("none"); });
    return () => { cancelled = true; };
  }, [isConnected, product, walletSelectedToken.symbol, getQuote]);

  const swapAvailable = swapRoute === "available" || swapRoute === "checking";

  // Can the buyer pay directly in the payment token they already hold?
  const canPayInPaymentToken = useMemo(() => {
    if (!product?.paymentToken) return false;
    const bal = getBalance(product.paymentToken)?.numeric ?? 0;
    return bal >= computedTotals.totalInPayment;
  }, [product, getBalance, computedTotals.totalInPayment]);

  // Block only when there is genuinely no path to pay: a different token with no
  // swap route AND not enough of the payment token to pay directly.
  const isUnpayable = Boolean(
    isConnected &&
      product &&
      walletSelectedToken.symbol !== product.paymentToken &&
      swapRoute === "none" &&
      !canPayInPaymentToken
  );

  const blockReason = isUnpayable && product
    ? `This item is paid in ${product.paymentToken} and your ${walletSelectedToken.symbol} can't be converted to it. Add ${product.paymentToken} to your wallet to continue.`
    : null;

  const executeOrder = useCallback(async () => {
    if (!product) return;
    if (!state.selectedAddress) {
      updateState({ purchaseError: "Please select a delivery address." });
      return;
    }
    updateState({ isProcessing: true, purchaseError: null });
    try {
      const addr = state.selectedAddress;
      // The quoteId carries the chosen logistics provider; the delivery address
      // is sent inline (a saved id isn't required).
      const orderData: CreateOrderParams = {
        product: product._id,
        quantity: state.quantity,
        quoteId: state.selectedLogistics?.quoteId ?? "",
        deliveryAddress: {
          label: addr.label,
          fullName: addr.fullName,
          phone: addr.phone,
          country: addr.country,
          state: addr.state,
          lga: addr.lga,
          street: addr.street,
          zipCode: addr.zipCode,
          isDefault: addr.isDefault,
        },
      };
      const order = await createOrder(orderData).unwrap();
      if (!order?._id) throw new Error("Order creation failed");
      refreshTokenBalance();
      startTransition(() => { navigate(`/orders/${order._id}?status=pending`); });
    } catch (err) {
      updateState({
        purchaseError: getErrorMessage(err) || "We couldn't place your order. Please try again.",
      });
    } finally {
      updateState({ isProcessing: false });
    }
  }, [product, state.selectedAddress, state.selectedLogistics, state.quantity, createOrder, refreshTokenBalance, navigate, updateState]);

  // Buy just creates the order. Payment (and any token swap it needs) happens
  // on the order page, so we only gate on affordability in the one truly
  // unpayable case (no swap route and no payment-token fallback); otherwise the
  // PaymentHint gives a soft nudge and the order page does the real check.
  const handleButtonClick = useCallback(async () => {
    updateState({ purchaseError: null });
    if (!isAuthenticated) return startTransition(() => navigate("/login"));
    if (!product) { updateState({ purchaseError: "This product's details didn't load. Refresh the page and try again." }); return; }
    // A wallet is only needed when crypto is the only way to pay.
    if (!acceptsFiat && !isConnected) { updateState({ showWalletModal: true }); return; }
    if (!isFiat && isUnpayable) { updateState({ purchaseError: blockReason }); return; }
    if (state.quantity < minQuantity) {
      updateState({ purchaseError: `Minimum order for this item is ${minQuantity}.` });
      return;
    }
    await executeOrder();
  }, [isAuthenticated, product, isConnected, isUnpayable, blockReason, executeOrder, navigate, updateState, acceptsFiat, isFiat, minQuantity, state.quantity]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (!product.seller?._id) return;
    const variantEntries = selectedVariant
      ? Object.entries(selectedVariant).filter(([k]) => k !== "quantity")
      : [];
    const variantIndex = selectedVariant
      ? product.type?.findIndex((v) => v === selectedVariant || JSON.stringify(v) === JSON.stringify(selectedVariant))
      : undefined;
    const variantLabel = variantEntries.length
      ? variantEntries.map(([, v]) => String(v)).join(" / ")
      : undefined;
    const payload = {
      product,
      quantity: Math.max(state.quantity, minQuantity),
      variantIndex: variantIndex != null && variantIndex >= 0 ? variantIndex : undefined,
      variantLabel,
      maxQuantity: Math.min(99, availableQty),
    };
    if (conflictsWithCart({ vendor: cart.vendor, items: cart.items }, product)) {
      const ok = window.confirm(
        `Your cart has items from ${cart.vendor?.name}. Orders are from one vendor at a time - replace your cart with this item?`
      );
      if (!ok) return;
      dispatch(addToCart({ ...payload, replace: true }));
    } else {
      dispatch(addToCart(payload));
    }
    showSnackbar("Added to cart", "success");
  }, [product, selectedVariant, state.quantity, minQuantity, availableQty, cart.vendor, cart.items, dispatch, showSnackbar]);

  const formatBalance = useCallback(
    (balance: string | undefined) => {
      if (!balance || !state.mounted) return "Loading...";
      return parseFloat(balance).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: BALANCE_PRECISION,
      });
    },
    [state.mounted]
  );

  const ctxValue: PurchaseContextValue = {
    product,
    selectedVariant,
    state,
    updateState,
    availableQty,
    stockStatus,
    computedTotals,
    hasSufficientBalance,
    isUnpayable,
    swapAvailable,
    blockReason,
    isLoading: state.isProcessing,
    walletSelectedToken,
    isConnected,
    address,
    isAuthenticated,
    isLoadingBalance,
    celoBalance,
    formatPrice,
    formatBalance,
    getBalance,
    handleButtonClick,
    isFiat,
    acceptsCrypto,
    acceptsFiat,
    minQuantity,
    handleAddToCart,
  };

  if (!state.mounted) {
    return (
      <div className="bg-[#212428] p-4 md:p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-12 bg-gray-700 rounded" />
          <div className="h-16 bg-gray-700 rounded" />
          <div className="h-8 bg-gray-700 rounded" />
          <div className="h-12 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return <PurchaseContext.Provider value={ctxValue}>{children}</PurchaseContext.Provider>;
};

// ── Body - scrollable content ──────────────────────────────────────────────────
export const PurchaseSectionBody: React.FC = () => {
  const {
    state,
    updateState,
    availableQty,
    stockStatus,
    computedTotals,
    hasSufficientBalance,
    isUnpayable,
    swapAvailable,
    walletSelectedToken,
    isConnected,
    address,
    isLoadingBalance,
    celoBalance,
    formatPrice,
    formatBalance,
    getBalance,
    product,
    isFiat,
    acceptsCrypto,
    minQuantity,
  } = usePurchaseContext();

  return (
    <div className="bg-[#212428] px-4 py-4 md:px-6 space-y-4 border-t border-gray-700/30">
      {/* Quantity + stock */}
      <div className="flex justify-between items-center">
        <QuantitySelector
          min={minQuantity}
          max={Math.min(99, availableQty)}
          availableQuantity={availableQty}
          onChange={(qty) => updateState({ quantity: qty })}
        />
        <StockStatus availableQty={availableQty} />
      </div>

      {/* Price breakdown */}
      {product && <PriceBreakdown totals={computedTotals} formatPrice={formatPrice} isFiat={isFiat} />}

      {/* Delivery address */}
      <DeliveryAddressSelector
        selectedAddress={state.selectedAddress}
        onAddressSelect={(addr) => updateState({ selectedAddress: addr, selectedLogistics: null })}
      />

      {/* Logistics */}
      {state.selectedAddress && product && (
        <LogisticsProviderSelector
          product={product}
          deliveryAddress={state.selectedAddress}
          quantity={state.quantity}
          selectedProvider={state.selectedLogistics}
          onProviderSelect={(p) => updateState({ selectedLogistics: p })}
        />
      )}

      {/* Soft payment hint (blocking reason is shown by the footer) */}
      {product && !isFiat && !!product.paymentToken && (
        <PaymentHint
          isConnected={isConnected}
          payToken={product.paymentToken}
          selectedSymbol={walletSelectedToken.symbol}
          payAmountLabel={formatPrice(computedTotals.totalInPayment, product.paymentToken)}
          hasSufficientBalance={hasSufficientBalance}
          isUnpayable={isUnpayable}
          swapAvailable={swapAvailable}
        />
      )}

      {/* Wallet info - shown when connected */}
      {isConnected && acceptsCrypto && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-gray-400">
              <HiCurrencyDollar className="text-brand w-3 h-3" />
              <span>{walletSelectedToken.symbol} balance:</span>
            </div>
            <div className="text-white font-mono font-medium flex items-center gap-2">
              {isLoadingBalance ? (
                <>
                  <FaSpinner className="animate-spin w-3 h-3 text-brand" />
                  <span className="text-gray-400">Updating...</span>
                </>
              ) : (
                formatBalance(getBalance(walletSelectedToken.symbol)?.formatted)
              )}
            </div>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>Gas (CELO):</span>
            <span className="font-mono">{celoBalance ? parseFloat(celoBalance).toFixed(4) : "0.0000"}</span>
          </div>
          {address && (
            <div className="text-gray-500 text-center pt-1 border-t border-gray-700/50 font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Footer - always-visible buy button + modals ───────────────────────────────
export const PurchaseSectionFooter: React.FC = () => {
  const {
    state,
    updateState,
    stockStatus,
    isLoading,
    isAuthenticated,
    isConnected,
    isUnpayable,
    blockReason,
    handleButtonClick,
    handleAddToCart,
    isFiat,
    acceptsFiat,
  } = usePurchaseContext();
  const needsWallet = !acceptsFiat;

  return (
    <>
      <div className="bg-[#212428] px-4 pb-4 pt-3 md:px-6 md:pb-6 xl:flex-shrink-0 border-t border-gray-700/40">
        {/* Blocking reason (persistent) or a transient action error, by the button */}
        {blockReason ? (
          <div className="mb-3">
            <ErrorDisplay error={blockReason} />
          </div>
        ) : state.purchaseError ? (
          <div className="mb-3">
            <ErrorDisplay error={state.purchaseError} />
          </div>
        ) : null}
        <button
          onClick={handleButtonClick}
          disabled={isLoading || stockStatus.isOutOfStock || (!isFiat && isUnpayable)}
          className="bg-gradient-to-r from-brand to-brand-hover hover:opacity-90 disabled:from-gray-600 disabled:to-gray-600 text-white py-3.5 px-6 rounded-xl w-full flex justify-center items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-lg hover:shadow-xl"
          aria-label={
            !isAuthenticated
              ? "Login to buy this product"
              : needsWallet && !isConnected
              ? "Connect wallet to purchase"
              : "Place order"
          }
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin w-4 h-4" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              {needsWallet && <FaWallet className="w-4 h-4" />}
              <span>
                {!isAuthenticated
                  ? "Login to Order"
                  : needsWallet && !isConnected
                  ? "Connect Wallet"
                  : stockStatus.isOutOfStock
                  ? "Sold out"
                  : "Order Now"}
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={stockStatus.isOutOfStock}
          className="mt-2 w-full flex justify-center items-center gap-2 rounded-xl border border-brand/60 text-brand hover:bg-brand/10 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FaShoppingBasket className="w-4 h-4" />
          Add to Cart
        </button>
      </div>

      {/* Connect Wallet modal */}
      {state.showWalletModal && (
        <ConnectModal onClose={() => updateState({ showWalletModal: false })} />
      )}
    </>
  );
};

// ── Default export - convenience wrapper (non-xl / simple usage) ──────────────
const PurchaseSection: React.FC<PurchaseSectionProps> = memo(({ product, selectedVariant }) => (
  <PurchaseSectionProvider product={product} selectedVariant={selectedVariant}>
    <PurchaseSectionBody />
    <PurchaseSectionFooter />
  </PurchaseSectionProvider>
));

PurchaseSection.displayName = "PurchaseSection";
export default PurchaseSection;
