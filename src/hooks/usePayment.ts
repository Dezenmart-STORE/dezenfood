import { useCallback, useEffect, useReducer, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useTokenBalances } from "./useTokenBalances";
import { useSwap } from "./useSwap";
import { useEscrow } from "./useEscrow";
import { getToken, getTokenAddress, getFeeCurrencyAddress } from "../config/tokens";
import { paymentDebug } from "../utils/paymentDebug";
import { getErrorMessage } from "../utils/errors";
import { wagmiConfig, CHAIN_IDS } from "../config/chains";
import { ESCROW_ABI } from "../abi/escrow";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
export type PaymentStep =
  | "idle"
  | "switching-network"
  | "checking-balance"
  | "insufficient-balance"
  | "swapping"
  | "approving"
  | "executing"
  | "confirming"
  | "success"
  | "error";

interface PaymentState {
  step: PaymentStep;
  /** User-facing message for the current step */
  message: string;
  /** Error details when step === "error" */
  error: string | null;
  /** Transaction hash when step === "success" */
  txHash: string | null;
  /** Extracted purchaseId from event logs */
  purchaseId: string | null;
  /** Swap hash - set as soon as swap completes, preserved through errors */
  swapHash: string | null;
  /**
   * Amount of productToken available for retry (as precise string).
   * Non-null when a swap completed but the escrow call subsequently failed,
   * allowing the user to retry just the escrow step.
   */
  swappedAmount: string | null;
}

type Action =
  | { type: "SET_STEP"; step: PaymentStep; message: string }
  | { type: "SWAP_COMPLETE"; swapHash: string; swappedAmount: string }
  | { type: "SUCCESS"; txHash: string; purchaseId?: string; swapHash?: string }
  | { type: "ERROR"; error: string }
  | { type: "RESET" };

const initialState: PaymentState = {
  step: "idle",
  message: "",
  error: null,
  txHash: null,
  purchaseId: null,
  swapHash: null,
  swappedAmount: null,
};

function reducer(state: PaymentState, action: Action): PaymentState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, message: action.message, error: null };
    case "SWAP_COMPLETE":
      // Persist swap result before attempting escrow so a subsequent error
      // still exposes swapHash + swappedAmount for retry.
      return { ...state, swapHash: action.swapHash, swappedAmount: action.swappedAmount };
    case "SUCCESS":
      return {
        ...state,
        step: "success",
        message: "Payment complete!",
        txHash: action.txHash,
        purchaseId: action.purchaseId ?? null,
        swapHash: action.swapHash ?? state.swapHash,
        error: null,
      };
    case "ERROR":
      // Spread state so swapHash/swappedAmount survive into the error screen.
      return { ...state, step: "error", error: action.error, message: action.error };
    case "RESET":
      return initialState;
  }
}

// ---------------------------------------------------------------------------
// Payment params
// ---------------------------------------------------------------------------
export interface PaymentParams {
  tradeId: string;
  quantity: number;
  /** Token symbol the product is priced in (from contract) */
  productToken: string;
  /** Human-readable total amount in productToken (product cost + logistics) */
  totalAmount: number;
  /** Token symbol the buyer wants to pay with */
  paymentToken: string;
  /** Logistics provider wallet address */
  logisticsProvider: `0x${string}`;
  /** Logistics cost in token units (as bigint-compatible string) */
  logisticsCost: string;
  /**
   * Estimated gas cost expressed in the payment token.
   * Used to check the user has enough balance to cover both payment and gas.
   * Only set when gas IS deducted from the payment token (feeCurrency supported).
   * Zero when gas comes from a fallback token or CELO.
   */
  gasEstimateInPaymentToken?: number;
  /**
   * Fallback fee currency address for CIP-64 gas payment.
   * Set by PaymentFlow when the payment token is not a Celo fee currency but
   * the user has another whitelisted token (e.g. cUSD on MiniPay) for gas.
   * When set, gas for all on-chain txs (approval + buyTrade) is deducted from
   * this token instead of requiring the user to hold CELO.
   */
  feeCurrencyFallback?: `0x${string}`;
}

const SUPPORTED_CHAIN_IDS = [CHAIN_IDS.CELO, CHAIN_IDS.CELO_SEPOLIA] as number[];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full payment flow as a state machine:
 *
 *   idle -> switching-network -> checking-balance -> [swapping] -> approving -> executing -> confirming -> success
 *                                                                                                   ↘ error
 *
 * If a swap succeeds but the escrow call fails, state.swapHash and
 * state.swappedAmount are preserved in the error state so the caller can
 * invoke retryEscrow(params) to skip directly to the approval step.
 *
 * Components simply call `startPayment(params)` and render based on `state.step`.
 */
export function usePayment() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { refetch: refetchBalances } = useTokenBalances();
  const { swap, getQuote } = useSwap();
  const escrow = useEscrow();

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  // ---------------------------------------------------------------------------
  // Internal: approval + escrow execution (steps 3–5).
  // Called by both startPayment (after optional swap) and retryEscrow.
  // ---------------------------------------------------------------------------
  const _approveAndExecute = useCallback(
    async (
      params: PaymentParams,
      /** Precise string amount of productToken to approve and send */
      effectiveAmountStr: string,
      activeChainId: number,
      priorSwapHash?: string
    ) => {
      const { readContract, writeContract, waitForTransactionReceipt } =
        await import("@wagmi/core");
      const { erc20Abi } = await import("viem");
      const { getEscrowAddress } = await import("../config/chains");

      // ── 3. Approve token spending ─────────────────────────────
      dispatch({
        type: "SET_STEP",
        step: "approving",
        message: `Approving ${params.productToken} for payment...`,
      });

      // Validate tradeId is a safe integer (contract uses uint256; MongoDB _id is not numeric)
      const tradeIdNum = Number(params.tradeId);
      if (!Number.isFinite(tradeIdNum) || tradeIdNum <= 0 || !Number.isInteger(tradeIdNum)) {
        throw new Error(`Invalid trade ID "${params.tradeId}". Expected a positive integer from the contract.`);
      }

      const productTokenInfo = getToken(params.productToken);
      const productTokenAddress = getTokenAddress(params.productToken, activeChainId);

      if (!productTokenInfo || !productTokenAddress) {
        throw new Error(`${params.productToken} configuration missing.`);
      }

      const escrowAddr = getEscrowAddress(activeChainId) as `0x${string}`;
      const requiredRaw = parseUnits(effectiveAmountStr, productTokenInfo.decimals);

      const currentAllowance = await readContract(wagmiConfig, {
        address: productTokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address!, escrowAddr],
        chainId: activeChainId,
      });

      if ((currentAllowance as bigint) < requiredRaw) {
        const approvalAmount = (requiredRaw * 105n) / 100n; // 5 % buffer

        // Gas for approval: try the product token's own fee currency first,
        // then fall back to the override (e.g. cUSD on MiniPay paying with USDT).
        const approvalFeeCurrency =
          getFeeCurrencyAddress(params.productToken, activeChainId) ??
          params.feeCurrencyFallback;

        const approveHash = await writeContract(wagmiConfig, {
          address: productTokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [escrowAddr, approvalAmount],
          gas: 150_000n,
          chainId: activeChainId,
          ...(approvalFeeCurrency ? { feeCurrency: approvalFeeCurrency } : {}),
        } as any);

        await waitForTransactionReceipt(wagmiConfig, {
          hash: approveHash,
          timeout: 30_000,
        });

        // Brief pause so Celo RPC nodes propagate the new allowance before
        // simulateContract reads it in the next step.
        await new Promise((r) => setTimeout(r, 2_000));

        paymentDebug.log("approval:confirmed", { hash: approveHash });
      } else {
        paymentDebug.log("approval:sufficient");
      }

      // ── 4. Pre-flight + buyTrade ──────────────────────────────
      dispatch({
        type: "SET_STEP",
        step: "executing",
        message: "Processing your purchase...",
      });

      const logisticsCostWei = parseUnits(
        params.logisticsCost || "0",
        productTokenInfo.decimals
      );

      const safeQuantity = Math.max(1, params.quantity || 1);
      let preflightDebug = `chain=${activeChainId},tid=${params.tradeId},qty=${safeQuantity}`;

      try {
        const { getEscrowAddress: _getEscrow } = await import("../config/chains");
        const _escrowAddr = _getEscrow(activeChainId);

        const [isProviderRegistered, tradeData] = await Promise.all([
          readContract(wagmiConfig, {
            address: _escrowAddr as `0x${string}`,
            abi: ESCROW_ABI,
            functionName: "logisticsProviders",
            args: [params.logisticsProvider],
            chainId: activeChainId,
          }),
          readContract(wagmiConfig, {
            address: _escrowAddr as `0x${string}`,
            abi: ESCROW_ABI,
            functionName: "getTrade",
            args: [BigInt(params.tradeId)],
            chainId: activeChainId,
          }),
        ]);

        const trade = tradeData as any;

        preflightDebug = `chain=${activeChainId},tid=${params.tradeId},qty=${safeQuantity},prov=${String(isProviderRegistered)},active=${String(trade?.active)},rem=${trade?.remainingQuantity?.toString() ?? "?"},total=${trade?.totalQuantity?.toString() ?? "?"},cost=${trade?.productCost?.toString() ?? "?"},seller=${trade?.seller ?? "?"}`;

        console.info("[DezenPay] pre-flight check", {
          chainId: activeChainId,
          escrowContract: _escrowAddr,
          logisticsProvider: params.logisticsProvider,
          providerRegistered: isProviderRegistered,
          tradeId: params.tradeId,
          quantityRequested: safeQuantity,
          tradeActive: trade?.active,
          remainingQuantity: trade?.remainingQuantity?.toString(),
          totalQuantity: trade?.totalQuantity?.toString(),
          productCost: trade?.productCost?.toString(),
        });

        if (
          trade?.seller &&
          address &&
          trade.seller.toLowerCase() === address.toLowerCase()
        ) {
          dispatch({
            type: "ERROR",
            error: "You can't buy your own listing. Connect a different wallet than the one that listed it.",
          });
          return;
        }

        if (!isProviderRegistered) {
          dispatch({
            type: "ERROR",
            error: "This delivery provider isn't available for payment right now. Go back and choose a different delivery option.",
          });
          return;
        }

        if (!trade?.active) {
          dispatch({
            type: "ERROR",
            error: "This listing is no longer active. It may have sold out or been removed by the seller.",
          });
          return;
        }

        if (
          trade?.remainingQuantity !== undefined &&
          BigInt(safeQuantity) > (trade.remainingQuantity as bigint)
        ) {
          dispatch({
            type: "ERROR",
            error: `Only ${trade.remainingQuantity.toString()} item(s) are available on-chain. Please contact the seller.`,
          });
          return;
        }
      } catch (checkErr) {
        // Keep the technical detail in the console for debugging; show the user
        // a clean, friendly message.
        console.error("[payment] pre-flight check failed", preflightDebug, checkErr);
        dispatch({ type: "ERROR", error: getErrorMessage(checkErr) });
        return;
      }

      // Gas for buyTrade: after a swap the user holds productToken, so try that
      // fee currency first. Without a swap, the payment token IS the product
      // token. Always fall back to the feeCurrencyFallback (e.g. cUSD for
      // MiniPay users paying with USDT or G$).
      const buyTradeFeeCurrency = priorSwapHash
        ? (getFeeCurrencyAddress(params.productToken, activeChainId) ?? params.feeCurrencyFallback)
        : (getFeeCurrencyAddress(params.paymentToken, activeChainId) ?? params.feeCurrencyFallback);

      const result = await escrow.buyTrade(
        BigInt(params.tradeId),
        BigInt(safeQuantity),
        params.logisticsProvider,
        logisticsCostWei,
        buyTradeFeeCurrency
      );

      if (!result.success) {
        if (result.pending && result.hash) {
          // Tx was submitted but receipt confirmation timed out.
          // The payment IS on-chain - treat as success so the user reaches the
          // success screen rather than a false "Payment Failed". The backend
          // order-status poller will reconcile the final state.
          dispatch({
            type: "SUCCESS",
            txHash: result.hash,
            purchaseId: result.purchaseId,
            swapHash: priorSwapHash,
          });
        } else {
          console.error("[payment] buyTrade failed", preflightDebug, result.message);
          dispatch({ type: "ERROR", error: getErrorMessage(result.message ?? "") });
        }
        return;
      }

      // ── 5. Success ────────────────────────────────────────────
      dispatch({
        type: "SET_STEP",
        step: "confirming",
        message: "Confirming on chain...",
      });

      await new Promise((r) => setTimeout(r, 500));

      dispatch({
        type: "SUCCESS",
        txHash: result.hash!,
        purchaseId: result.purchaseId,
        swapHash: priorSwapHash,
      });

      paymentDebug.log("payment:complete", {
        txHash: result.hash,
        purchaseId: result.purchaseId,
        duration: paymentDebug.getDuration(),
      });

      setTimeout(() => { if (mountedRef.current) refetchBalances(); }, 2000);
    },
    [address, escrow, refetchBalances]
  );

  // ---------------------------------------------------------------------------
  // startPayment - full flow
  // ---------------------------------------------------------------------------
  const startPayment = useCallback(
    async (params: PaymentParams) => {
      paymentDebug.startSession("usePayment");

      if (!address) {
        dispatch({ type: "ERROR", error: "Please connect your wallet first." });
        return;
      }

      try {
        const { getChainId, readContract } = await import("@wagmi/core");
        const { erc20Abi } = await import("viem");

        // ── 0. Ensure wallet is on a Celo network ────────────────
        const cachedChainId = getChainId(wagmiConfig);
        if (!SUPPORTED_CHAIN_IDS.includes(cachedChainId)) {
          dispatch({
            type: "SET_STEP",
            step: "switching-network",
            message: "Switching to Celo network...",
          });
        }

        try {
          await switchChainAsync({ chainId: CHAIN_IDS.CELO });
        } catch {
          const postChainId = getChainId(wagmiConfig);
          if (!SUPPORTED_CHAIN_IDS.includes(postChainId)) {
            dispatch({
              type: "ERROR",
              error: "Please switch your wallet to the Celo network and try again.",
            });
            return;
          }
        }

        await new Promise((r) => setTimeout(r, 300));

        const activeChainId = getChainId(wagmiConfig);
        if (!SUPPORTED_CHAIN_IDS.includes(activeChainId)) {
          dispatch({
            type: "ERROR",
            error: "Your wallet is still on the wrong network. Please switch to Celo and try again.",
          });
          return;
        }

        // ── 1. Check balance ──────────────────────────────────────
        dispatch({
          type: "SET_STEP",
          step: "checking-balance",
          message: "Checking your balance...",
        });

        const needsSwap = params.paymentToken !== params.productToken;
        const payTokenSymbol = params.paymentToken;
        const payTokenInfo = getToken(payTokenSymbol);

        if (!payTokenInfo) {
          throw new Error(`Token ${payTokenSymbol} not recognized.`);
        }

        const payTokenAddress = getTokenAddress(payTokenSymbol, activeChainId);
        if (!payTokenAddress) {
          throw new Error(`${payTokenSymbol} is not available on this network.`);
        }

        const feeCurrency = getFeeCurrencyAddress(payTokenSymbol, activeChainId);
        const gasBuffer = params.gasEstimateInPaymentToken ?? 0;
        const requiredPaymentBalance = params.totalAmount + gasBuffer;

        // Read balance directly from chain - bypasses React state staleness
        const rawPayBalance = await readContract(wagmiConfig, {
          address: payTokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
          chainId: activeChainId,
        });
        const payBalance = parseFloat(formatUnits(rawPayBalance as bigint, payTokenInfo.decimals));

        // Fire background refetch for UI display (do not await)
        refetchBalances();

        // ── 2. Swap if paying with different token ────────────────
        // Track swap hash in a local variable - do NOT read from state after
        // dispatch because React batches updates and state.swapHash will still
        // be null within the same async execution frame.
        let completedSwapHash: string | undefined;

        if (needsSwap) {
          // Get quote first so we can calculate how much input is actually needed.
          // exactInput swaps return slightly less output than input (pool fees ~0.05-0.5%).
          // If the quoted output < totalAmount we must increase the input so the
          // contract's transferFrom can pull the full required amount.
          const quote = await getQuote(
            payTokenSymbol,
            params.productToken,
            params.totalAmount
          );

          if (!quote) {
            dispatch({
              type: "ERROR",
              error: `We can't swap ${payTokenSymbol} to ${params.productToken} right now. Add ${params.productToken} to your wallet and pay with it directly.`,
            });
            return;
          }

          const quotedOut = parseFloat(quote.amountOut);
          // Scale up input so output covers the required amount, plus a 0.1% buffer.
          const swapInputAmount =
            quotedOut > 0 && quotedOut < params.totalAmount
              ? params.totalAmount * (params.totalAmount / quotedOut) * 1.001
              : params.totalAmount;

          paymentDebug.log("swap:needed", {
            from: payTokenSymbol,
            to: params.productToken,
            required: params.totalAmount,
            quotedOut,
            swapInputAmount,
            gasBuffer,
          });

          const requiredSwapBalance = swapInputAmount + gasBuffer;
          if (payBalance < requiredSwapBalance) {
            dispatch({
              type: "ERROR",
              error: `You need at least ${requiredSwapBalance.toFixed(2)} ${payTokenSymbol}${gasBuffer > 0 ? ` (including ~${gasBuffer.toFixed(4)} for network fees)` : ""} to complete this purchase.`,
            });
            return;
          }

          dispatch({
            type: "SET_STEP",
            step: "swapping",
            message: `Converting ${swapInputAmount.toFixed(2)} ${payTokenSymbol} to ~${quotedOut.toFixed(2)} ${params.productToken}...`,
          });

          // Use direct fee currency if available, otherwise use the fallback
          // (e.g. cUSD on MiniPay when paying with USDT). Without this, the
          // swap step would silently require CELO even though the UI promised
          // gas would come from the fallback token.
          const swapResult = await swap(
            payTokenSymbol,
            params.productToken,
            swapInputAmount,
            0.01,
            feeCurrency ?? params.feeCurrencyFallback
          );

          if (!swapResult.success) {
            dispatch({ type: "ERROR", error: swapResult.error ?? "Swap failed." });
            return;
          }

          completedSwapHash = swapResult.hash;

          // Persist swap result immediately - if the escrow call below fails,
          // the error state will still carry swapHash + swappedAmount so the
          // user can retry escrow without re-doing the swap.
          dispatch({
            type: "SWAP_COMPLETE",
            swapHash: completedSwapHash!,
            // Use the original required amount (not the scaled input) - this is
            // what the escrow contract expects and avoids float precision issues.
            swappedAmount: params.totalAmount.toString(),
          });

          // Wait for swap to settle on-chain before reading balance
          await new Promise((r) => setTimeout(r, 3000));
          if (mountedRef.current) refetchBalances();
        } else {
          if (payBalance < requiredPaymentBalance) {
            dispatch({
              type: "ERROR",
              error: `You need at least ${requiredPaymentBalance.toFixed(2)} ${params.productToken}${gasBuffer > 0 ? ` (including ~${gasBuffer.toFixed(4)} for network fees)` : ""}. Check your balance.`,
            });
            return;
          }
        }

        // effectiveAmountStr: use the raw totalAmount string - never parseFloat
        // round-trips which lose precision for 18-decimal tokens.
        const effectiveAmountStr = params.totalAmount.toString();

        await _approveAndExecute(params, effectiveAmountStr, activeChainId, completedSwapHash);
      } catch (err) {
        paymentDebug.error("payment:unexpected", err);
        dispatch({ type: "ERROR", error: getErrorMessage(err) });
      }
    },
    [address, switchChainAsync, refetchBalances, swap, getQuote, _approveAndExecute]
  );

  // ---------------------------------------------------------------------------
  // retryEscrow - skip straight to approval when swap already completed
  // ---------------------------------------------------------------------------
  const retryEscrow = useCallback(
    async (params: PaymentParams) => {
      if (!state.swapHash || !state.swappedAmount) return;

      const savedSwapHash = state.swapHash;
      const savedAmount = state.swappedAmount;

      paymentDebug.startSession("usePayment:retryEscrow");

      if (!address) {
        dispatch({ type: "ERROR", error: "Please connect your wallet first." });
        return;
      }

      try {
        const { getChainId } = await import("@wagmi/core");

        const cachedChainId = getChainId(wagmiConfig);
        if (!SUPPORTED_CHAIN_IDS.includes(cachedChainId)) {
          dispatch({
            type: "SET_STEP",
            step: "switching-network",
            message: "Switching to Celo network...",
          });
          try {
            await switchChainAsync({ chainId: CHAIN_IDS.CELO });
          } catch {
            /* handled below */
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        const activeChainId = getChainId(wagmiConfig);
        if (!SUPPORTED_CHAIN_IDS.includes(activeChainId)) {
          dispatch({
            type: "ERROR",
            error: "Please switch your wallet to the Celo network and try again.",
          });
          return;
        }

        await _approveAndExecute(params, savedAmount, activeChainId, savedSwapHash);
      } catch (err) {
        paymentDebug.error("retryEscrow:unexpected", err);
        dispatch({ type: "ERROR", error: getErrorMessage(err) });
      }
    },
    [address, state.swapHash, state.swappedAmount, switchChainAsync, _approveAndExecute]
  );

  return {
    state,
    startPayment,
    retryEscrow,
    reset,
    /** is the payment flow active? */
    isActive: state.step !== "idle" && state.step !== "success" && state.step !== "error",
  };
}
