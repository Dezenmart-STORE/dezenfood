import { useCallback, useMemo } from "react";
import {
  useAccount,
  useChainId,
} from "wagmi";
import { decodeEventLog, type Log } from "viem";
import {
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  getChainId,
} from "@wagmi/core";
import { getEscrowContract, ESCROW_ABI } from "../abi/escrow";
import { wagmiConfig } from "../config/chains";
import { parseError, logError } from "../utils/errors";
import { paymentDebug } from "../utils/paymentDebug";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EscrowResult {
  success: boolean;
  /**
   * True when the tx was submitted (hash known) but the receipt wait timed
   * out. The payment may still confirm - callers should treat this as success
   * and let the backend reconcile order status.
   */
  pending?: boolean;
  hash?: `0x${string}`;
  purchaseId?: string;
  error?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPurchaseId(
  logs: readonly Log[] | undefined,
  eventName?: string
): string | undefined {
  if (!eventName || !logs) return undefined;
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: ESCROW_ABI,
        data: (log as Log).data,
        topics: (log as Log).topics,
      });
      if (decoded.eventName === eventName && decoded.args) {
        const a = decoded.args as unknown as Record<string, unknown>;
        const id = (a.purchaseId ?? a.tradeId)?.toString();
        if (id) return id;
      }
    } catch {
      /* not our event */
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * All escrow smart-contract operations in one hook.
 *
 * Uses @wagmi/core's writeContract directly (not useWriteContract) to avoid
 * React lifecycle / stale-closure issues in long async payment sequences.
 * Each method validates wallet state, simulates for gas, executes, waits for
 * receipt, and extracts event data.
 */
export function useEscrow() {
  const { address, isConnected } = useAccount();
  // useChainId kept for components that consume it via the hook return value
  useChainId();

  // ── shared executor ──────────────────────────────────────────────
  const execute = useCallback(
    async (
      functionName: string,
      args: readonly unknown[],
      eventName?: string,
      feeCurrency?: `0x${string}`
    ): Promise<EscrowResult> => {
      if (!isConnected || !address) {
        return { success: false, message: "Please connect your wallet first." };
      }

      // Read chain at call time (not from hook closure which may be stale).
      const liveChainId = getChainId(wagmiConfig);
      const contract = getEscrowContract(liveChainId);

      paymentDebug.log(`escrow:${functionName}:start`, {
        args: args.map(String),
        feeCurrency: feeCurrency ?? "none",
      });

      try {
        // ── Gas estimation via simulation ────────────────────────
        let gas = 800_000n;
        try {
          const { request } = await simulateContract(wagmiConfig, {
            ...contract,
            functionName,
            args,
            account: address,
            chainId: liveChainId,
          });
          if (request.gas) gas = (request.gas * 120n) / 100n;
        } catch (simErr) {
          const simMsg = ((simErr as any)?.message ?? "").toLowerCase();
          const isRevert =
            simMsg.includes("revert") ||
            simMsg.includes("execution reverted") ||
            simMsg.includes("contract function") ||
            simMsg.includes("reason:");
          if (isRevert) throw simErr;
          // Network/RPC issue - proceed with default gas.
        }

        // ── Execute via @wagmi/core (no React lifecycle dependency) ──
        // Using the core action instead of useWriteContract hook prevents
        // stale-closure and mutation-state issues in long async payment flows.
        const hash = await writeContract(wagmiConfig, {
          ...contract,
          functionName,
          args,
          gas,
          chainId: liveChainId,
          ...(feeCurrency ? { feeCurrency } : {}),
        } as any);

        if (!hash) {
          return { success: false, message: "Transaction failed to submit." };
        }

        paymentDebug.log(`escrow:${functionName}:submitted`, { hash });

        // ── Wait for receipt ─────────────────────────────────────
        // 90-second timeout: long enough for slow networks, short enough
        // that UX doesn't stall. If it expires we return pending=true so
        // the caller can treat the submission as success and let the backend
        // reconcile rather than showing a false "Payment Failed" screen.
        let receipt;
        try {
          receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            timeout: 90_000,
            pollingInterval: 2_000,
            onReplaced: (replacement: { reason: string; transaction: { hash: `0x${string}` } }) => {
              paymentDebug.log(`escrow:${functionName}:tx-replaced`, {
                reason: replacement.reason,
                newHash: replacement.transaction.hash,
              });
            },
          });
        } catch {
          paymentDebug.log(`escrow:${functionName}:confirmation-timeout`, { hash });
          return {
            success: false,
            pending: true,
            hash,
            message:
              "Your payment was submitted but the network is taking longer than usual. " +
              "It should confirm shortly.",
          };
        }

        if (receipt.status === "reverted") {
          return {
            success: false,
            error: "Transaction reverted",
            message:
              "The transaction was rejected by the contract. Check your balance and try again.",
          };
        }

        const purchaseId = extractPurchaseId(receipt.logs, eventName);
        paymentDebug.log(`escrow:${functionName}:success`, { hash, purchaseId });

        return {
          success: true,
          hash,
          purchaseId,
          message: "Transaction confirmed.",
        };
      } catch (err) {
        const parsed = parseError(err);
        logError(err, `escrow:${functionName}`);
        paymentDebug.error(`escrow:${functionName}`, err);

        return {
          success: false,
          error: parsed.title,
          message: parsed.suggestion
            ? `${parsed.message} ${parsed.suggestion}`
            : parsed.message,
        };
      }
    },
    // address + isConnected are the only React-derived deps we need.
    // writeContract is imported from @wagmi/core - not a hook, not a dep.
    [isConnected, address]
  );

  // ── public methods ───────────────────────────────────────────────

  const createTrade = useCallback(
    (
      seller: `0x${string}`,
      productCost: bigint,
      totalQuantity: bigint,
      tokenAddress: `0x${string}`
    ) =>
      execute(
        "createTrade",
        [seller, productCost, totalQuantity, tokenAddress],
        "TradeCreated"
      ),
    [execute]
  );

  const buyTrade = useCallback(
    (
      tradeId: bigint,
      quantity: bigint,
      logisticsProvider: `0x${string}`,
      logisticsCost: bigint,
      feeCurrency?: `0x${string}`
    ) =>
      execute(
        "buyTrade",
        [tradeId, quantity, logisticsProvider, logisticsCost],
        "PurchaseCreated",
        feeCurrency
      ),
    [execute]
  );

  const confirmDelivery = useCallback(
    (purchaseId: bigint) =>
      execute(
        "confirmDeliveryAndPurchase",
        [purchaseId],
        "PurchaseCompletedAndConfirmed"
      ),
    [execute]
  );

  const raiseDispute = useCallback(
    (purchaseId: bigint) =>
      execute("raiseDispute", [purchaseId], "DisputeRaised"),
    [execute]
  );

  const cancelPurchase = useCallback(
    (purchaseId: bigint) => execute("cancelPurchase", [purchaseId]),
    [execute]
  );

  // Memoize the return object so callers' useCallback deps stay stable
  // across renders (the individual methods are already stable via useCallback).
  return useMemo(
    () => ({
      createTrade,
      buyTrade,
      confirmDelivery,
      raiseDispute,
      cancelPurchase,
    }),
    [createTrade, buyTrade, confirmDelivery, raiseDispute, cancelPurchase]
  );
}
