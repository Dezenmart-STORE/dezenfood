import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { usePayment, type PaymentParams, type PaymentStep } from "../../hooks/usePayment";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { useGasEstimate } from "../../hooks/useGasEstimate";
import { useCurrency } from "../../context/CurrencyContext";
import { getExplorerUrl } from "../../config/chains";
import { useChainId } from "wagmi";
import TokenSelect from "./TokenSelect";
import type { StableToken } from "../../config/tokens";
import { getFeeCurrencyAddress, getFallbackFeeCurrency } from "../../config/tokens";
import ConnectModal from "../wallet/ConnectModal";
import { detectMiniPay } from "../../hooks/useMiniPay";

// ---------------------------------------------------------------------------
// Step config - maps state machine steps to UI
// ---------------------------------------------------------------------------
const STEP_CONFIG: Record<
  PaymentStep,
  { label: string; progress: number }
> = {
  idle: { label: "Ready", progress: 0 },
  "switching-network": { label: "Switching to Celo", progress: 5 },
  "checking-balance": { label: "Checking balance", progress: 15 },
  "insufficient-balance": { label: "Insufficient balance", progress: 15 },
  swapping: { label: "Converting tokens", progress: 30 },
  approving: { label: "Approving payment", progress: 50 },
  executing: { label: "Processing purchase", progress: 70 },
  confirming: { label: "Confirming on-chain", progress: 90 },
  success: { label: "Complete!", progress: 100 },
  error: { label: "Failed", progress: 0 },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  tradeId: string;
  quantity: number;
  productToken: string;
  totalAmount: number;
  logisticsProvider: `0x${string}`;
  logisticsCost: string;
  onSuccess?: (txHash: string, purchaseId?: string) => void;
  onClose?: () => void;
  productName?: string;
  productImage?: string;
}

/**
 * Complete payment flow component - dark themed, responsive.
 */
export default function PaymentFlow({
  tradeId,
  quantity,
  productToken,
  totalAmount,
  logisticsProvider,
  logisticsCost,
  onSuccess,
  onClose,
  productName,
  productImage,
}: Props) {
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // MetaMask re-signs txs as EIP-1559 and strips the feeCurrency field,
  // so CIP-64 gas deduction from ERC-20 tokens silently doesn't work.
  // MiniPay also connects via the MetaMask injected target but DOES support
  // CIP-64, so we must exclude it from the MetaMask restriction.
  const isMiniPay = detectMiniPay();
  const isMetaMask = !isMiniPay && (connector?.name?.toLowerCase().includes("metamask") ?? false);
  const { state, startPayment, retryEscrow, reset, isActive } = usePayment();
  const { getBalance, refetch: refetchBalances, celoNumeric } = useTokenBalances();
  const { selectedToken, setSelectedToken, formatAmount, convertPrice } = useCurrency();

  const [paymentToken, setPaymentToken] = useState(selectedToken.symbol);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [savedParams, setSavedParams] = useState<PaymentParams | null>(null);
  const successCalledRef = useRef(false);

  const balance = getBalance(paymentToken);
  const needsSwap = paymentToken !== productToken;
  const stepConfig = STEP_CONFIG[state.step];

  // Estimate gas fee
  const { gasCelo } = useGasEstimate(needsSwap);
  const { gasCelo: gasCeloPostSwap } = useGasEstimate(false);

  // ── Fee currency resolution ────────────────────────────────────────────────
  //
  // Priority:
  //   1. Payment token's own fee currency (e.g. paying with cUSD → cUSD pays gas)
  //   2. Fallback fee currency (e.g. MiniPay user paying with USDT, holds cUSD)
  //   3. CELO (user must hold native CELO for gas - MetaMask always ends up here)
  //
  // MetaMask re-signs all txs as EIP-1559 and strips `feeCurrency`, so CIP-64
  // gas deduction silently fails. MiniPay connects via the same injected target
  // but DOES support CIP-64 natively, so it must be excluded from the block.

  const directFeeCurrencyAddr = getFeeCurrencyAddress(paymentToken, chainId);

  // Build a balance snapshot for the fallback lookup (only fee-currency tokens)
  const feeCurrencyBalances: Partial<Record<string, number>> = {
    USDm: getBalance("USDm")?.numeric ?? 0,
    EURm: getBalance("EURm")?.numeric ?? 0,
    BRLm: getBalance("BRLm")?.numeric ?? 0,
    KESm: getBalance("KESm")?.numeric ?? 0,
    XOFm: getBalance("XOFm")?.numeric ?? 0,
    COPm: getBalance("COPm")?.numeric ?? 0,
    PHPm: getBalance("PHPm")?.numeric ?? 0,
    GHSm: getBalance("GHSm")?.numeric ?? 0,
    NGNm: getBalance("NGNm")?.numeric ?? 0,
    GBPm: getBalance("GBPm")?.numeric ?? 0,
    ZARm: getBalance("ZARm")?.numeric ?? 0,
    CADm: getBalance("CADm")?.numeric ?? 0,
    AUDm: getBalance("AUDm")?.numeric ?? 0,
    CHFm: getBalance("CHFm")?.numeric ?? 0,
    JPYm: getBalance("JPYm")?.numeric ?? 0,
    USDT: getBalance("USDT")?.numeric ?? 0,
  };

  // For MiniPay only: if the selected token can't pay gas, find a fallback.
  // MetaMask always uses CELO regardless, so we never set a fallback for it.
  const fallback =
    isMiniPay && !directFeeCurrencyAddr
      ? getFallbackFeeCurrency(paymentToken, chainId, feeCurrencyBalances)
      : undefined;

  // Resolved fee currency for this payment session
  const resolvedFeeCurrencyAddr = directFeeCurrencyAddr ?? (isMetaMask ? undefined : fallback?.address);
  // Human-readable token name gas will actually be deducted from
  const feeTokenSymbol: string = directFeeCurrencyAddr
    ? paymentToken
    : (fallback?.symbol ?? "CELO");

  // feeCurrency is Celo's CIP-64: paying gas in an ERC20 instead of CELO.
  // MetaMask does not support it. (The Dezen embedded wallet was also excluded
  // here because it signed legacy transactions while CIP-64 is 1559-based; that
  // wallet has been removed, so only the MetaMask exclusion remains.)
  const walletSupportsFeeCurrency = !isMetaMask;

  const supportsFeeCurrency = !!resolvedFeeCurrencyAddr && walletSupportsFeeCurrency;

  // Product token fee currency (for post-swap steps)
  const supportsProductFeeCurrency =
    !!getFeeCurrencyAddress(productToken, chainId) && walletSupportsFeeCurrency;

  // Gas expressed in the token that will actually pay it
  const gasInFeeToken = convertPrice(gasCelo, "CELO", feeTokenSymbol === "CELO" ? "CELO" : feeTokenSymbol);
  // Used for payment token balance check when gas and payment share the same token
  const gasInPaymentToken = feeTokenSymbol === paymentToken ? gasInFeeToken : 0;

  // Does the user have enough of the fee token to cover gas?
  const feeTokenBalance =
    feeTokenSymbol === paymentToken
      ? (balance?.numeric ?? 0)
      : feeTokenSymbol === "CELO"
        ? celoNumeric
        : (getBalance(feeTokenSymbol)?.numeric ?? 0);
  const hasSufficientFeeToken = feeTokenBalance >= gasCelo * 1.1; // 10% buffer

  const hasSufficientCelo = celoNumeric >= gasCelo;
  // Gas is covered when: fee currency resolves to a token the user holds, OR they have CELO
  const gasIsCovered = (supportsFeeCurrency && hasSufficientFeeToken) || hasSufficientCelo;

  // Total the user needs in their payment token.
  // Only add gas to the payment token total when gas comes from the same token.
  const totalWithGas =
    supportsFeeCurrency && feeTokenSymbol === paymentToken
      ? totalAmount + gasInPaymentToken
      : totalAmount;

  // Extra product token buffer added to the swap output so post-swap gas
  // (approval + buyTrade feeCurrency) doesn't eat into the escrow amount.
  const gasInProductToken =
    needsSwap && supportsProductFeeCurrency
      ? convertPrice(gasCeloPostSwap, "CELO", productToken)
      : 0;

  const hasEnoughBalance = balance
    ? balance.numeric >= totalWithGas && gasIsCovered
    : false;

  // Notify parent on success - only once
  useEffect(() => {
    if (state.step === "success" && state.txHash && !successCalledRef.current) {
      successCalledRef.current = true;

      // Invalidate all wagmi contract read queries so ConnectButton,
      // WalletQuickAction, and any other balance display updates immediately.
      queryClient.invalidateQueries({ queryKey: ["readContracts"] });
      refetchBalances();

      if (onSuccess) onSuccess(state.txHash, state.purchaseId ?? undefined);
    }
  }, [state.step, state.txHash, state.purchaseId, onSuccess, queryClient, refetchBalances]);

  const handleTokenChange = (token: StableToken) => {
    setPaymentToken(token.symbol);
    setSelectedToken(token);
  };

  const handlePay = () => {
    if (!isConnected) {
      setShowConnectModal(true);
      return;
    }

    const params: PaymentParams = {
      tradeId,
      quantity,
      productToken,
      totalAmount,
      paymentToken,
      logisticsProvider,
      logisticsCost,
      // Pass gas buffer only when gas is deducted from the payment token itself.
      // When gas comes from a fallback token (cUSD on MiniPay) or CELO, the
      // payment token balance check doesn't include gas.
      gasEstimateInPaymentToken:
        supportsFeeCurrency && feeTokenSymbol === paymentToken ? gasInPaymentToken : 0,
      // Propagate the fallback fee currency so _approveAndExecute can use it
      // for on-chain approval and buyTrade transactions.
      feeCurrencyFallback: isMetaMask ? undefined : fallback?.address,
    };

    setSavedParams(params);
    startPayment(params);
  };

  // ── Idle: show payment form ──────────────────────────────────────
  if (state.step === "idle") {
    return (
      <div className="space-y-4">
        {/* Product summary */}
        <div className="flex items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3">
          {productImage && (
            <img
              src={productImage}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {productName ?? "Purchase"}
            </p>
            <p className="text-lg font-bold text-white">
              {totalAmount.toFixed(2)}{" "}
              <span className="text-base font-semibold text-gray-400">{productToken}</span>
            </p>
            <p className="text-xs text-gray-500">{formatAmount(totalAmount, productToken)}</p>
          </div>
        </div>

        {/* Token selector */}
        <TokenSelect
          value={paymentToken}
          onChange={handleTokenChange}
          label="Pay with"
        />

        {/* Payment breakdown */}
        <div className="rounded-xl border border-[#292B30] bg-[#292B30] px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Order total</span>
            <span className="text-sm font-semibold text-gray-200">
              {totalAmount.toFixed(2)} {productToken}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Network fee (est.)</span>
            {supportsFeeCurrency ? (
              <span className="text-sm font-semibold text-green-400">
                ~{gasInFeeToken.toFixed(4)} {feeTokenSymbol}
                {feeTokenSymbol !== paymentToken && (
                  <span className="ml-1 text-xs font-normal text-gray-500">balance</span>
                )}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-200">
                ~{gasCelo.toFixed(4)} CELO
              </span>
            )}
          </div>
          <div className="border-t border-[#373A3F] pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">You pay</span>
            <span className="text-sm font-bold text-white">
              {totalWithGas.toFixed(4)} {paymentToken}
              {supportsFeeCurrency && feeTokenSymbol !== paymentToken && (
                <span className="ml-1 text-xs font-normal text-gray-500">
                  + ~{gasInFeeToken.toFixed(4)} {feeTokenSymbol} gas
                </span>
              )}
              {!supportsFeeCurrency && (
                <span className="ml-1 text-xs font-normal text-gray-500">
                  + ~{gasCelo.toFixed(4)} CELO gas
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Gas fee coverage notice */}
        {supportsFeeCurrency ? (
          <div className="flex items-start gap-2 rounded-xl border border-green-900/40 bg-green-900/20 p-3 text-sm text-green-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {feeTokenSymbol === paymentToken
                ? `Network fees are paid in ${paymentToken} - no CELO needed.`
                : `Network fees are covered by your ${feeTokenSymbol} balance - no CELO needed.`}
            </span>
          </div>
        ) : !hasSufficientCelo ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 text-sm text-amber-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {paymentToken} doesn't cover network fees. You need ~{gasCelo.toFixed(4)} CELO in your wallet (you have {celoNumeric.toFixed(4)}).
            </span>
          </div>
        ) : null}

        {/* Balance indicator */}
        {balance && (
          <div className="flex items-center justify-between rounded-lg border border-[#292B30] bg-[#292B30] px-3 py-2.5">
            <span className="text-xs text-gray-500">Your balance</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-bold ${
                  hasEnoughBalance ? "text-green-400" : "text-red-400"
                }`}
              >
                {balance.numeric.toFixed(2)} {paymentToken}
              </span>
              {!hasEnoughBalance && (
                <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Insufficient payment token balance */}
        {balance && balance.numeric < totalWithGas && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 text-sm text-amber-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              You need ~{totalWithGas.toFixed(4)} {paymentToken}. Try a different token.
            </span>
          </div>
        )}

        {/* Insufficient fee token balance (only when fee token ≠ payment token) */}
        {supportsFeeCurrency && feeTokenSymbol !== paymentToken && !hasSufficientFeeToken && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 text-sm text-amber-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              You need a small {feeTokenSymbol} balance (~{gasInFeeToken.toFixed(4)}) for network fees.
            </span>
          </div>
        )}

        {/* Swap notice */}
        {needsSwap && (
          <div className="flex items-start gap-2 rounded-xl border border-blue-900/40 bg-blue-900/20 p-3 text-sm text-blue-300">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>
              Your {paymentToken} will be automatically converted to {productToken} at the best available rate.
            </span>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={balance ? !hasEnoughBalance : false}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white transition-all hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!isConnected
            ? "Connect Wallet to Pay"
            : `Pay ${totalAmount.toFixed(2)} ${productToken}`}
        </button>

        {showConnectModal && (
          <ConnectModal onClose={() => setShowConnectModal(false)} />
        )}
      </div>
    );
  }

  // ── Active: show progress ────────────────────────────────────────
  if (isActive) {
    return (
      <div className="flex flex-col items-center py-8">
        {/* Progress ring */}
        <div className="relative mb-6">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#292B30" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#dc2626"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${stepConfig.progress * 2.64} 264`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
          </div>
        </div>

        <p className="text-lg font-bold text-white">{stepConfig.label}</p>
        <p className="mt-2 max-w-xs text-center text-sm text-gray-400">
          {state.message}
        </p>

        {/* Step dots */}
        <div className="mt-6 flex gap-2">
          {["checking-balance", "approving", "executing", "confirming"].map((s, i) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                stepConfig.progress >= (i + 1) * 25 ? "bg-red-500" : "bg-[#292B30]"
              }`}
            />
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-600">
          Please confirm in your wallet when prompted
        </p>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────
  if (state.step === "success") {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40 border border-green-800/50">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
        <p className="mt-2 text-sm text-gray-400">
          Your purchase has been secured in escrow.
        </p>

        {/* Transaction details */}
        <div className="mt-6 w-full space-y-2 rounded-xl border border-[#292B30] bg-[#292B30] p-4">
          {state.txHash && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Transaction</span>
              <a
                href={getExplorerUrl(chainId, state.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-red-400 hover:text-red-300"
              >
                View on Explorer →
              </a>
            </div>
          )}
          {state.purchaseId && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Order ID</span>
              <span className="text-xs font-mono font-medium text-gray-300">
                #{state.purchaseId}
              </span>
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-[#292B30] py-3 text-sm font-bold text-white transition-colors hover:bg-[#373A3F]"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  const swapCompletedBeforeFailure = !!state.swapHash && !!state.swappedAmount;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-800/50 bg-red-900/30">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-white">Payment Failed</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-400">
        {state.error}
      </p>

      {/* When the conversion succeeded but the escrow failed, guide the user
          to retry just the purchase step - they already hold the tokens. */}
      {swapCompletedBeforeFailure && (
        <div className="mt-4 w-full rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 text-sm text-amber-300">
          Your tokens were successfully converted to {productToken} and are in
          your wallet. Click <strong>Complete Purchase</strong> to finish - no
          new conversion needed.
        </div>
      )}

      <div className="mt-6 flex w-full gap-3">
        {swapCompletedBeforeFailure && savedParams ? (
          <button
            onClick={() => retryEscrow(savedParams)}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Complete Purchase
          </button>
        ) : (
          <button
            onClick={reset}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Try Again
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-[#373A3F]"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
