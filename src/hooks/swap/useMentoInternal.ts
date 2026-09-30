/**
 * Internal Mento swap hook - uses lean config.
 * Not exported from the barrel - only consumed by useSwap.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Mento, TradablePair } from "@mento-protocol/mento-sdk";
import { parseUnits, formatUnits, isAddress } from "viem";
import { providers, BigNumber } from "ethers";
import { TOKENS, getToken, getTokenAddress as leanGetTokenAddress } from "../../config/tokens";
import { TARGET_CHAIN, SUPPORTED_CHAINS } from "../../config/chains";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SwapQuote {
  amountOut: string;
  exchangeRate: string;
  minAmountOut: string;
  priceImpact: string;
  route: string[];
  timestamp: number;
  isMultiHop: boolean;
  tradablePair?: TradablePair;
}

export interface SwapParams {
  fromSymbol: string;
  toSymbol: string;
  amount: number;
  slippageTolerance?: number;
  /** Celo fee currency address - gas is deducted from this token instead of CELO */
  feeCurrency?: `0x${string}`;
}

export interface SwapResult {
  success: boolean;
  hash?: string;
  amountOut?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Races `p` against a timeout.
 * The losing side's rejection is suppressed to prevent unhandled rejection warnings.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  p.catch(() => {}); // suppress unhandled rejection on the losing promise
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const QUOTE_CACHE_TTL = 10_000;
const SLIPPAGE_DEFAULT = 0.01;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const COMMON_INTERMEDIARIES = ["cUSD", "USDT", "cEUR", "cREAL", "USDC"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getAddressString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "address" in value) {
    return (value as any).address;
  }
  return undefined;
};

const findMultiHopPath = async (
  mento: Mento,
  fromSymbol: string,
  toSymbol: string,
  chainId: number
): Promise<{ intermediary: string; fromPair: TradablePair; toPair: TradablePair } | null> => {
  for (const intermediary of COMMON_INTERMEDIARIES) {
    if (intermediary === fromSymbol || intermediary === toSymbol) continue;

    const intermediaryAddress = leanGetTokenAddress(intermediary, chainId);
    if (!intermediaryAddress) continue;

    const fromAddress = leanGetTokenAddress(fromSymbol, chainId);
    const toAddress = leanGetTokenAddress(toSymbol, chainId);
    if (!fromAddress || !toAddress) continue;

    try {
      const fromPair = await mento.findPairForTokens(fromAddress, intermediaryAddress);
      const toPair = await mento.findPairForTokens(intermediaryAddress, toAddress);
      if (fromPair && toPair) return { intermediary, fromPair, toPair };
    } catch {
      continue;
    }
  }

  return null;
};

const buildRouteFromPair = (
  tradablePair: TradablePair | undefined,
  fromSymbol: string,
  toSymbol: string,
  chainId: number
): string[] => {
  if (!tradablePair) return [fromSymbol, toSymbol];

  try {
    if (tradablePair.path && Array.isArray(tradablePair.path) && tradablePair.path.length > 0) {
      const route: string[] = [fromSymbol];

      for (const pathItem of tradablePair.path) {
        if (typeof pathItem === "object" && pathItem !== null && "assets" in pathItem) {
          const assets = (pathItem as any).assets;
          if (Array.isArray(assets)) {
            for (const assetAddr of assets) {
              const token = TOKENS.find((t) => {
                const tokenAddress = t.address[chainId];
                const compareAddress = getAddressString(assetAddr);
                return tokenAddress && compareAddress &&
                  tokenAddress.toLowerCase() === compareAddress.toLowerCase();
              });
              if (token && token.symbol !== fromSymbol && token.symbol !== toSymbol && !route.includes(token.symbol)) {
                route.push(token.symbol);
              }
            }
          }
        } else {
          const token = TOKENS.find((t) => {
            const tokenAddress = t.address[chainId];
            const pathItemAddress = getAddressString(pathItem);
            return tokenAddress && pathItemAddress &&
              tokenAddress.toLowerCase() === pathItemAddress.toLowerCase();
          });
          if (token && token.symbol !== fromSymbol && token.symbol !== toSymbol && !route.includes(token.symbol)) {
            route.push(token.symbol);
          }
        }
      }

      if (!route.includes(toSymbol)) route.push(toSymbol);
      return route.length > 1 ? route : [fromSymbol, toSymbol];
    }

    if (tradablePair.assets && Array.isArray(tradablePair.assets) && tradablePair.assets.length >= 2) {
      const token0 = TOKENS.find((t) => {
        const addr = t.address[chainId];
        const a0 = getAddressString(tradablePair.assets[0]);
        return addr && a0 && addr.toLowerCase() === a0.toLowerCase();
      });
      const token1 = TOKENS.find((t) => {
        const addr = t.address[chainId];
        const a1 = getAddressString(tradablePair.assets[1]);
        return addr && a1 && addr.toLowerCase() === a1.toLowerCase();
      });
      if (token0 && token1) return [token0.symbol, token1.symbol];
    }
  } catch {
    // fallback
  }

  return [fromSymbol, toSymbol];
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useMentoInternal() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isInitialized, setIsInitialized] = useState(false);

  const mentoRef = useRef<Mento | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());
  // Promise-mutex: prevents concurrent initialization calls
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  // ── Initialize ──────────────────────────────────────────────────
  const initialize = useCallback((): Promise<boolean> => {
    // Return in-flight promise if one exists (mutex)
    if (initPromiseRef.current) return initPromiseRef.current;

    const doInit = async (): Promise<boolean> => {
      if (!address || !walletClient || !publicClient) return false;

      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          // Build an EIP-1193 adapter from wagmi's walletClient so this works
          // with any connector (MetaMask, WalletConnect, MiniPay) without
          // depending on window.ethereum being present or well-behaved.
          const eip1193 = {
            request: ({ method, params }: { method: string; params?: unknown[] }) =>
              walletClient.request({ method, params } as Parameters<typeof walletClient.request>[0]),
            on: (_: string, __: (...args: unknown[]) => void): void => {},
            removeListener: (_: string, __: (...args: unknown[]) => void): void => {},
          };
          const provider = new providers.Web3Provider(eip1193 as any, {
            chainId: TARGET_CHAIN.id,
            name: TARGET_CHAIN.name,
          });
          const signer = provider.getSigner();

          const mento = await withTimeout(Mento.create(signer), 15_000);

          // Verify pairs are fetchable
          await withTimeout(mento.getTradablePairs(), 10_000);

          mentoRef.current = mento;
          setIsInitialized(true);
          return true;
        } catch {
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY * retries));
          }
        }
      }

      return false;
    };

    initPromiseRef.current = doInit().finally(() => {
      initPromiseRef.current = null;
    });

    return initPromiseRef.current;
  }, [address, walletClient, publicClient]);

  // Auto-init - no window.ethereum dependency; walletClient is connector-agnostic
  useEffect(() => {
    if (address && walletClient && !isInitialized) {
      initialize();
    }
  }, [address, walletClient, isInitialized, initialize]);

  // ── Get quote ───────────────────────────────────────────────────
  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      if (!mentoRef.current || !isInitialized) {
        await initialize();
        throw new Error("Mento not ready yet.");
      }
      if (amount <= 0) throw new Error("Amount must be > 0");

      const fromToken = getToken(fromSymbol);
      const toToken = getToken(toSymbol);
      if (!fromToken || !toToken) throw new Error("Unsupported token pair");

      const cacheKey = `mento:${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`;
      const cached = quoteCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) return cached;

      const chainId = (await walletClient?.getChainId()) || TARGET_CHAIN.id;
      const fromAddress = leanGetTokenAddress(fromSymbol, chainId);
      const toAddress = leanGetTokenAddress(toSymbol, chainId);
      if (!fromAddress || !toAddress || !isAddress(fromAddress) || !isAddress(toAddress)) {
        throw new Error("Token addresses not found");
      }

      const amountIn = parseUnits(amount.toString(), fromToken.decimals);

      let amountOut: BigNumber;
      let route: string[];
      let tradablePair: TradablePair | undefined;
      let isMultiHop = false;

      // Try direct pair
      try {
        tradablePair = await withTimeout(
          mentoRef.current.findPairForTokens(fromAddress, toAddress),
          5_000
        );

        amountOut = await withTimeout(
          mentoRef.current.getAmountOut(
            fromAddress,
            toAddress,
            BigNumber.from(amountIn.toString()),
            tradablePair
          ),
          5_000
        ) as BigNumber;

        route = buildRouteFromPair(tradablePair, fromSymbol, toSymbol, chainId);
      } catch {
        // Try direct without pair
        try {
          amountOut = await withTimeout(
            mentoRef.current!.getAmountOut(
              fromAddress,
              toAddress,
              BigNumber.from(amountIn.toString())
            ),
            5_000
          ) as BigNumber;
          route = [fromSymbol, toSymbol];
        } catch {
          // Try multi-hop
          const multiHopPath = await findMultiHopPath(mentoRef.current!, fromSymbol, toSymbol, chainId);
          if (!multiHopPath) {
            throw new Error(`No trading path for ${fromSymbol}/${toSymbol}`);
          }

          const { intermediary, fromPair, toPair } = multiHopPath;
          const intermediaryAddress = leanGetTokenAddress(intermediary, chainId)!;

          const firstHopAmount = await mentoRef.current!.getAmountOut(
            fromAddress,
            intermediaryAddress,
            BigNumber.from(amountIn.toString()),
            fromPair
          ) as BigNumber;

          amountOut = await mentoRef.current!.getAmountOut(
            intermediaryAddress,
            toAddress,
            firstHopAmount,
            toPair
          ) as BigNumber;

          route = [fromSymbol, intermediary, toSymbol];
          isMultiHop = true;
        }
      }

      if (!amountOut || amountOut.isZero()) {
        throw new Error("Insufficient liquidity for this trade amount");
      }

      const amountOutFormatted = formatUnits(BigInt(amountOut.toString()), toToken.decimals);
      const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(6);
      const minAmountOut = amountOut.mul(Math.floor((1 - slippageTolerance) * 10000)).div(10000);
      const minAmountOutFormatted = formatUnits(BigInt(minAmountOut.toString()), toToken.decimals);
      const priceImpact = Math.abs((1 - parseFloat(exchangeRate)) * 100).toFixed(4);

      const quote: SwapQuote = {
        amountOut: amountOutFormatted,
        exchangeRate,
        minAmountOut: minAmountOutFormatted,
        priceImpact,
        route,
        timestamp: Date.now(),
        isMultiHop,
        tradablePair,
      };

      quoteCache.current.set(cacheKey, quote);
      // TTL is checked on cache hit (Date.now() - timestamp < QUOTE_CACHE_TTL); no timer needed

      return quote;
    },
    [walletClient, isInitialized, initialize]
  );

  // ── Perform swap ────────────────────────────────────────────────
  const performSwap = useCallback(
    async (params: SwapParams): Promise<SwapResult> => {
      if (!mentoRef.current || !address || !walletClient || !publicClient) {
        return { success: false };
      }

      const {
        fromSymbol,
        toSymbol,
        amount,
        slippageTolerance = SLIPPAGE_DEFAULT,
        feeCurrency,
      } = params;

      const chainId = await walletClient.getChainId();
      
      const celoChain = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? TARGET_CHAIN;

      const fromToken = getToken(fromSymbol);
      const toToken = getToken(toSymbol);
      if (!fromToken || !toToken) return { success: false };

      const fromAddress = leanGetTokenAddress(fromSymbol, chainId);
      const toAddress = leanGetTokenAddress(toSymbol, chainId);
      if (!fromAddress || !toAddress) return { success: false };

      const amountIn = BigNumber.from(
        parseUnits(amount.toString(), fromToken.decimals).toString()
      );

      // Get fresh quote
      const quote = await getSwapQuote(fromSymbol, toSymbol, amount, slippageTolerance);
      const minAmountOut = BigNumber.from(
        parseUnits(quote.minAmountOut, toToken.decimals).toString()
      );

      // Find tradable pair
      let tradablePair: TradablePair | undefined = quote.tradablePair;
      if (!tradablePair) {
        try {
          tradablePair = await mentoRef.current.findPairForTokens(fromAddress, toAddress);
        } catch {
          tradablePair = undefined;
        }
      }

      // Approve via Mento SDK
      const allowanceTxObj = await mentoRef.current.increaseTradingAllowance(
        fromAddress,
        amountIn,
        tradablePair
      );

      const allowanceHash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: allowanceTxObj.to as `0x${string}`,
        data: allowanceTxObj.data as `0x${string}`,
        value: BigInt(allowanceTxObj.value?.toString() || "0"),
        gas: allowanceTxObj.gasLimit ? BigInt(allowanceTxObj.gasLimit.toString()) : undefined,
        chain: celoChain,
        ...(feeCurrency ? { feeCurrency } : {}),
      } as any);

      const allowanceReceipt = await publicClient.waitForTransactionReceipt({
        hash: allowanceHash,
        timeout: 60_000,
      });
      if (allowanceReceipt?.status !== "success") {
        return { success: false };
      }

      // Execute swap via Mento SDK
      const swapTxObj = await mentoRef.current.swapIn(
        fromAddress,
        toAddress,
        amountIn,
        minAmountOut,
        tradablePair
      );

      const swapHash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: swapTxObj.to as `0x${string}`,
        data: swapTxObj.data as `0x${string}`,
        value: BigInt(swapTxObj.value?.toString() || "0"),
        gas: swapTxObj.gasLimit ? BigInt(swapTxObj.gasLimit.toString()) : undefined,
        chain: celoChain,
        ...(feeCurrency ? { feeCurrency } : {}),
      } as any);

      const swapReceipt = await publicClient.waitForTransactionReceipt({
        hash: swapHash,
        timeout: 60_000,
      });

      if (swapReceipt?.status !== "success") {
        return { success: false };
      }

      quoteCache.current.clear();
      return { success: true, hash: swapHash, amountOut: quote.amountOut };
    },
    [address, walletClient, publicClient, getSwapQuote]
  );

  return useMemo(
    () => ({
      isReady: isInitialized && !!mentoRef.current,
      getSwapQuote,
      performSwap,
    }),
    [isInitialized, getSwapQuote, performSwap]
  );
}
