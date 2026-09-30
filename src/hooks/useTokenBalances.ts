import { useMemo } from "react";
import { useAccount, useChainId, useReadContracts, useBalance } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { TOKENS, type StableToken } from "../config/tokens";

export interface TokenBalanceEntry {
  token: StableToken;
  raw: bigint;
  formatted: string;
  numeric: number;
}

interface UseTokenBalancesReturn {
  /** Balances keyed by symbol */
  balances: Map<string, TokenBalanceEntry>;
  /** Native CELO balance (for gas) */
  celoBalance: string;
  /** Native CELO balance as a number */
  celoNumeric: number;
  /** True while any balance is loading */
  isLoading: boolean;
  /** True if any RPC call failed - lets UI distinguish empty vs failed */
  isError: boolean;
  /** Re-fetch all balances - returns a Promise that resolves when complete */
  refetch: () => Promise<void>;
  /** Get a single token balance by symbol */
  getBalance: (symbol: string) => TokenBalanceEntry | undefined;
  /**
   * Check if user has enough of a token.
   * Returns null when balances are still loading or the token is not in the
   * cache (e.g. wrong chain, RPC error) - callers must distinguish this from
   * false (balance known and insufficient).
   */
  hasSufficient: (symbol: string, amount: number) => boolean | null;
}

/**
 * Fetches balances for ALL supported stablecoins via a single multicall.
 */
export function useTokenBalances(): UseTokenBalancesReturn {
  const { address } = useAccount();
  const chainId = useChainId();

  // Build multicall contracts + active-token list in one pass
  const { contracts, activeTokens } = useMemo(() => {
    if (!address) return { contracts: [], activeTokens: [] as StableToken[] };
    const active = TOKENS.filter((t) => t.address[chainId]);
    return {
      activeTokens: active,
      contracts: active.map((t) => ({
        address: t.address[chainId] as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      })),
    };
  }, [address, chainId]);

  const {
    data: results,
    isLoading: isLoadingTokens,
    isError: tokenError,
    refetch: refetchTokens,
  } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: 300_000, // 5 min
      staleTime: 240_000, // 4 min
      gcTime: 600_000, // 10 min
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  // Native CELO balance (for gas fees)
  const {
    data: celoData,
    isLoading: isLoadingCelo,
    isError: celoError,
    refetch: refetchCelo,
  } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 300_000,
      staleTime: 240_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });

  const balances = useMemo(() => {
    const map = new Map<string, TokenBalanceEntry>();
    if (!results) return map;

    activeTokens.forEach((token, i) => {
      const result = results[i];
      if (result?.status === "success" && result.result !== undefined) {
        const raw = result.result as bigint;
        const formatted = formatUnits(raw, token.decimals);
        const numeric = parseFloat(formatted);
        map.set(token.symbol, { token, raw, formatted, numeric });
      }
    });

    return map;
  }, [results, activeTokens]);

  const celoBalance = celoData
    ? formatUnits(celoData.value, celoData.decimals)
    : "0";
  const celoNumeric = parseFloat(celoBalance);

  const refetch = async (): Promise<void> => {
    await Promise.all([refetchTokens(), refetchCelo()]);
  };

  const getBalance = (symbol: string) => balances.get(symbol);

  const hasSufficient = (symbol: string, amount: number): boolean | null => {
    if (isLoadingTokens || isLoadingCelo) return null;
    const entry = balances.get(symbol);
    if (!entry) return null; // token not in map (wrong chain or RPC error)
    return entry.numeric >= amount;
  };

  return {
    balances,
    celoBalance,
    celoNumeric,
    isLoading: isLoadingTokens || isLoadingCelo,
    isError: tokenError || celoError,
    refetch,
    getBalance,
    hasSufficient,
  };
}
