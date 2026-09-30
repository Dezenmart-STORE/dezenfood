/**
 * Internal Uniswap V3 swap hook - uses lean config.
 * Not exported from the barrel - only consumed by useSwap.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, erc20Abi, isAddress } from "viem";
import { ethers } from "ethers";
import { TOKENS, getToken, getTokenAddress as leanGetTokenAddress } from "../../config/tokens";
import { TARGET_CHAIN, SUPPORTED_CHAINS } from "../../config/chains";

// ---------------------------------------------------------------------------
// Contract addresses (from lean swap config, duplicated to avoid ChainId dep)
// ---------------------------------------------------------------------------
const SWAP_ROUTER_ADDRESSES: Record<number, string> = {
  42220: "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
  44787: "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
};

const QUOTER_V2_ADDRESS = "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8";

// ---------------------------------------------------------------------------
// ABIs (minimal)
// ---------------------------------------------------------------------------
const SWAP_ROUTER_ABI = [
  {
    inputs: [{ components: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ], internalType: "struct IV3SwapRouter.ExactInputSingleParams", name: "params", type: "tuple" }],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ components: [
      { internalType: "bytes", name: "path", type: "bytes" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "amountOutMinimum", type: "uint256" },
    ], internalType: "struct IV3SwapRouter.ExactInputParams", name: "params", type: "tuple" }],
    name: "exactInput",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

const QUOTER_ABI = [
  {
    inputs: [{ components: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ], internalType: "struct IQuoterV2.QuoteExactInputSingleParams", name: "params", type: "tuple" }],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      { internalType: "uint32", name: "initializedTicksCrossed", type: "uint32" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "path", type: "bytes" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
    ],
    name: "quoteExactInput",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160[]", name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { internalType: "uint32[]", name: "initializedTicksCrossedList", type: "uint32[]" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Fee tiers
enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

const FEE_TIERS = [FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.HIGH, FeeAmount.LOWEST];

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
  routeDetails?: { poolFees: number[]; path: string[] };
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
// Constants
// ---------------------------------------------------------------------------
const QUOTE_CACHE_TTL = 10_000;
const SLIPPAGE_DEFAULT = 0.01;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const DEADLINE_MINUTES = 5;
const COMMON_INTERMEDIARIES = ["cUSD", "USDT", "cEUR", "CELO"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const encodePath = (tokens: string[], fees: number[]): string => {
  let encoded = "0x";
  for (let i = 0; i < fees.length; i++) {
    encoded += tokens[i].slice(2);
    encoded += fees[i].toString(16).padStart(6, "0");
  }
  encoded += tokens[tokens.length - 1].slice(2);
  return encoded.toLowerCase();
};

const findMultiHopPath = async (
  quoter: any,
  fromAddress: string,
  toAddress: string,
  amountIn: bigint,
  fromSymbol: string,
  toSymbol: string,
  chainId: number
): Promise<{
  intermediary: string;
  intermediaryAddress: string;
  firstHopFee: number;
  secondHopFee: number;
  amountOut: any;
} | null> => {
  type RouteResult = { intermediary: string; intermediaryAddress: string; firstHopFee: number; secondHopFee: number; amountOut: any } | null;

  const candidates: Promise<RouteResult>[] = [];

  for (const intermediary of COMMON_INTERMEDIARIES) {
    if (intermediary === fromSymbol || intermediary === toSymbol) continue;
    const intermediaryAddress = leanGetTokenAddress(intermediary, chainId);
    if (!intermediaryAddress) continue;

    for (const firstFee of FEE_TIERS) {
      for (const secondFee of FEE_TIERS) {
        const path = encodePath(
          [fromAddress, intermediaryAddress, toAddress],
          [firstFee, secondFee]
        );
        candidates.push(
          quoter.callStatic
            .quoteExactInput(path, amountIn.toString())
            .then((quote: any) =>
              quote && ethers.BigNumber.from(quote.amountOut).gt(0)
                ? { intermediary, intermediaryAddress, firstHopFee: firstFee, secondHopFee: secondFee, amountOut: quote }
                : null
            )
            .catch((): null => null)
        );
      }
    }
  }

  const results = await Promise.all(candidates);
  return results.find((r): r is NonNullable<RouteResult> => r !== null) ?? null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useUniswapInternal() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isInitialized, setIsInitialized] = useState(false);

  const providerRef = useRef<ethers.providers.Web3Provider | null>(null);
  const quoteCache = useRef<Map<string, SwapQuote>>(new Map());
  // Promise-mutex: prevents concurrent initialization calls
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  // ── Initialize ──────────────────────────────────────────────────
  const initialize = useCallback((): Promise<boolean> => {
    // Return in-flight promise if one exists (mutex)
    if (initPromiseRef.current) return initPromiseRef.current;

    const doInit = async (): Promise<boolean> => {
      if (!window.ethereum || !address || !walletClient || !publicClient) return false;

      let retries = 0;
      while (retries < MAX_RETRIES) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum as any);
          const network = await provider.getNetwork();
          if (network.chainId !== TARGET_CHAIN.id) {
            throw new Error(`Please switch to ${TARGET_CHAIN.name}`);
          }

          providerRef.current = provider;
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

  // Auto-init
  useEffect(() => {
    if (address && walletClient && !isInitialized) {
      initialize();
    }
    return () => {
      providerRef.current = null;
    };
  }, [address, walletClient, isInitialized, initialize]);

  // ── Get quote ───────────────────────────────────────────────────
  const getSwapQuote = useCallback(
    async (
      fromSymbol: string,
      toSymbol: string,
      amount: number,
      slippageTolerance = SLIPPAGE_DEFAULT
    ): Promise<SwapQuote> => {
      if (!providerRef.current || !isInitialized) {
        await initialize();
        throw new Error("Uniswap not ready yet.");
      }
      if (amount <= 0) throw new Error("Amount must be > 0");

      const fromToken = getToken(fromSymbol);
      const toToken = getToken(toSymbol);
      if (!fromToken || !toToken) throw new Error("Unsupported token pair");

      const cacheKey = `uni:${fromSymbol}-${toSymbol}-${amount}-${slippageTolerance}`;
      const cached = quoteCache.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) return cached;

      const chainId = (await walletClient?.getChainId()) || TARGET_CHAIN.id;
      const fromAddress = leanGetTokenAddress(fromSymbol, chainId);
      const toAddress = leanGetTokenAddress(toSymbol, chainId);
      if (!fromAddress || !toAddress || !isAddress(fromAddress) || !isAddress(toAddress)) {
        throw new Error("Token addresses not found for current network");
      }

      const amountIn = parseUnits(amount.toString(), fromToken.decimals);
      const quoter = new ethers.Contract(QUOTER_V2_ADDRESS, QUOTER_ABI, providerRef.current);

      let bestQuote: any = null;
      let bestFee = FeeAmount.MEDIUM;

      for (const fee of FEE_TIERS) {
        try {
          const q = await quoter.callStatic.quoteExactInputSingle({
            tokenIn: fromAddress,
            tokenOut: toAddress,
            amountIn: amountIn.toString(),
            fee,
            sqrtPriceLimitX96: 0,
          });
          if (!bestQuote || ethers.BigNumber.from(q.amountOut).gt(bestQuote.amountOut)) {
            bestQuote = q;
            bestFee = fee;
          }
        } catch {
          // try next fee tier
        }
      }

      let isMultiHop = false;
      let route = [fromSymbol, toSymbol];
      let poolFees = [bestFee];
      let path = [fromAddress, toAddress];

      if (!bestQuote || ethers.BigNumber.from(bestQuote.amountOut).isZero()) {
        const multiHopResult = await findMultiHopPath(
          quoter, fromAddress, toAddress, amountIn,
          fromSymbol, toSymbol, chainId
        );
        if (!multiHopResult) {
          throw new Error(`No liquidity for ${fromSymbol}/${toSymbol}`);
        }
        bestQuote = multiHopResult.amountOut;
        isMultiHop = true;
        route = [fromSymbol, multiHopResult.intermediary, toSymbol];
        poolFees = [multiHopResult.firstHopFee, multiHopResult.secondHopFee];
        path = [fromAddress, multiHopResult.intermediaryAddress as `0x${string}`, toAddress];
      }

      const amountOutFormatted = formatUnits(
        ethers.BigNumber.from(bestQuote.amountOut).toBigInt(),
        toToken.decimals
      );
      const exchangeRate = (parseFloat(amountOutFormatted) / amount).toFixed(6);

      const minAmountOut = ethers.BigNumber.from(bestQuote.amountOut)
        .mul(Math.floor((1 - slippageTolerance) * 10000))
        .div(10000);
      const minAmountOutFormatted = formatUnits(minAmountOut.toBigInt(), toToken.decimals);

      const priceImpact = Math.abs((1 - parseFloat(exchangeRate)) / 1 * 100).toFixed(4);

      const quote: SwapQuote = {
        amountOut: amountOutFormatted,
        exchangeRate,
        minAmountOut: minAmountOutFormatted,
        priceImpact,
        route,
        timestamp: Date.now(),
        isMultiHop,
        routeDetails: { poolFees, path },
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
      if (!providerRef.current || !address || !walletClient || !publicClient) {
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

      const routerAddress = SWAP_ROUTER_ADDRESSES[chainId];
      if (!routerAddress) return { success: false };

      const amountIn = parseUnits(amount.toString(), fromToken.decimals);

      // Get fresh quote
      const quote = await getSwapQuote(fromSymbol, toSymbol, amount, slippageTolerance);
      const minAmountOut = parseUnits(quote.minAmountOut, toToken.decimals);

      // Approve exactly amountIn + 10 % buffer - never use unlimited approval.
      const approvalAmount = (amountIn * 110n) / 100n;
      const allowanceHash = await walletClient.writeContract({
        address: fromAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [routerAddress as `0x${string}`, approvalAmount],
        account: address as `0x${string}`,
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

      // Build swap calldata
      const swapRouter = new ethers.Contract(routerAddress, SWAP_ROUTER_ABI, providerRef.current);
      let data: string;

      if (quote.isMultiHop && quote.routeDetails) {
        const encodedPath = encodePath(quote.routeDetails.path, quote.routeDetails.poolFees);
        data = swapRouter.interface.encodeFunctionData("exactInput", [{
          path: encodedPath,
          recipient: address,
          amountIn: amountIn.toString(),
          amountOutMinimum: minAmountOut.toString(),
        }]);
      } else {
        data = swapRouter.interface.encodeFunctionData("exactInputSingle", [{
          tokenIn: fromAddress,
          tokenOut: toAddress,
          fee: quote.routeDetails?.poolFees[0] || FeeAmount.MEDIUM,
          recipient: address,
          amountIn: amountIn.toString(),
          amountOutMinimum: minAmountOut.toString(),
          sqrtPriceLimitX96: 0,
        }]);
      }

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: address as `0x${string}`,
        to: routerAddress as `0x${string}`,
        data: data as `0x${string}`,
        value: 0n,
      });
      const gasWithBuffer = (gasEstimate * 120n) / 100n;

      // Execute swap
      const swapHash = await walletClient.sendTransaction({
        account: address as `0x${string}`,
        to: routerAddress as `0x${string}`,
        data: data as `0x${string}`,
        value: 0n,
        gas: gasWithBuffer,
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
      isReady: isInitialized && !!providerRef.current,
      getSwapQuote,
      performSwap,
    }),
    [isInitialized, getSwapQuote, performSwap]
  );
}
