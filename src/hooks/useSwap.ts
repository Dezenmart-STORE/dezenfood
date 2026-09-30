import { useCallback, useMemo, useState } from "react";
import { useUniswapInternal } from "./swap/useUniswapInternal";
import { useMentoInternal } from "./swap/useMentoInternal";
import { parseError, logError } from "../utils/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SwapQuote {
  amountOut: string;
  protocol: "uniswap" | "mento";
  rate: number;
}

export interface SwapResult {
  success: boolean;
  hash?: string;
  error?: string;
}

interface UseSwapReturn {
  /** Get a quote for swapping tokenA -> tokenB */
  getQuote: (from: string, to: string, amount: number) => Promise<SwapQuote | null>;
  /** Execute swap */
  swap: (from: string, to: string, amount: number, slippage?: number, feeCurrency?: `0x${string}`) => Promise<SwapResult>;
  /** Is a swap currently executing? */
  isSwapping: boolean;
  /** Is at least one protocol ready? */
  isReady: boolean;
}

// Mento-optimised native stablecoin pairs
const MENTO_PAIRS = new Set([
  "cUSD-cEUR", "cEUR-cUSD",
  "cUSD-cREAL", "cREAL-cUSD",
  "cUSD-cKES", "cKES-cUSD",
  "cEUR-cREAL", "cREAL-cEUR",
  "cEUR-cKES", "cKES-cEUR",
  "cREAL-cKES", "cKES-cREAL",
]);

/**
 * Unified swap hook.
 * Automatically routes between Mento (Celo-native stablecoins) and
 * Uniswap V3 (everything else) with automatic fallback.
 */
export function useSwap(): UseSwapReturn {
  const uniswap = useUniswapInternal();
  const mento = useMentoInternal();
  const [isSwapping, setIsSwapping] = useState(false);

  const isReady = uniswap.isReady || mento.isReady;

  const pickProtocol = useCallback(
    (from: string, to: string) => {
      const preferMento = MENTO_PAIRS.has(`${from}-${to}`);

      if (preferMento && mento.isReady) return { protocol: mento, name: "mento" as const };
      if (uniswap.isReady) return { protocol: uniswap, name: "uniswap" as const };
      if (mento.isReady) return { protocol: mento, name: "mento" as const };
      return null;
    },
    // Only stable primitives in deps - objects captured via closure are valid for the call's duration
    [uniswap.isReady, mento.isReady]
  );

  // ── Quote ────────────────────────────────────────────────────────
  const getQuote = useCallback(
    async (from: string, to: string, amount: number): Promise<SwapQuote | null> => {
      if (from === to || amount <= 0) return null;

      const picked = pickProtocol(from, to);
      if (!picked) return null;

      try {
        const quote = await picked.protocol.getSwapQuote(from, to, amount);
        if (!quote || parseFloat(quote.amountOut) <= 0) return null;

        return {
          amountOut: quote.amountOut,
          protocol: picked.name,
          rate: parseFloat(quote.amountOut) / amount,
        };
      } catch (err) {
        logError(err, `swap:quote:${picked.name}`);

        // Try the other protocol as fallback
        const fallbackName = picked.name === "mento" ? "uniswap" : "mento";
        const fallback = picked.name === "mento" ? uniswap : mento;

        if (fallback.isReady) {
          try {
            const quote = await fallback.getSwapQuote(from, to, amount);
            if (quote && parseFloat(quote.amountOut) > 0) {
              return {
                amountOut: quote.amountOut,
                protocol: fallbackName,
                rate: parseFloat(quote.amountOut) / amount,
              };
            }
          } catch {
            // Both failed
          }
        }

        return null;
      }
    },
    [pickProtocol, uniswap, mento]
  );

  // ── Execute swap ─────────────────────────────────────────────────
  const swap = useCallback(
    async (
      from: string,
      to: string,
      amount: number,
      slippage = 0.01,
      feeCurrency?: `0x${string}`
    ): Promise<SwapResult> => {
      if (from === to) return { success: true, hash: undefined };

      const picked = pickProtocol(from, to);
      if (!picked) {
        return { success: false, error: "Swap service unavailable. Try again shortly." };
      }

      setIsSwapping(true);

      try {
        // Sanity check: get quote first
        const quote = await picked.protocol.getSwapQuote(from, to, amount);
        if (!quote || parseFloat(quote.amountOut) <= 0) {
          return { success: false, error: `No conversion path from ${from} to ${to}.` };
        }

        // Check for unreasonable slippage
        const rate = parseFloat(quote.amountOut) / amount;
        if (rate < 0.5) {
          return {
            success: false,
            error: `Exchange rate too low (${(rate * 100).toFixed(1)}%). Low liquidity.`,
          };
        }

        const result = await picked.protocol.performSwap({
          fromSymbol: from,
          toSymbol: to,
          amount,
          slippageTolerance: slippage,
          feeCurrency,
        });

        if (!result.success) {
          return { success: false, error: "Swap transaction failed." };
        }

        return { success: true, hash: result.hash };
      } catch (err) {
        const parsed = parseError(err);
        logError(err, `swap:execute:${picked.name}`);

        return {
          success: false,
          error: parsed.suggestion
            ? `${parsed.message} ${parsed.suggestion}`
            : parsed.message,
        };
      } finally {
        setIsSwapping(false);
      }
    },
    [pickProtocol]
  );

  return { getQuote, swap, isSwapping, isReady };
}
