import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { CHAIN_IDS, TARGET_CHAIN } from "../config/chains";

const CELO_IDS = new Set<number>([CHAIN_IDS.CELO, CHAIN_IDS.CELO_SEPOLIA]);

export interface ChainGuard {
  /** True when wallet is on Celo mainnet or Celo Sepolia */
  isOnCelo: boolean;
  isConnected: boolean;
  isSwitching: boolean;
  /** Prompt the wallet to switch to Celo mainnet */
  switchToCelo: () => Promise<void>;
}

/**
 * Manages Celo chain enforcement.
 *
 * - Auto-switches the wallet to Celo the first time it connects on a
 *   different network (e.g. Ethereum). The user sees a system prompt from
 *   their wallet app - no extra UI required for that one attempt.
 * - If they reject the auto-switch (or switch away later), `isOnCelo`
 *   becomes false so the WrongNetworkBanner can show and they can manually
 *   switch via `switchToCelo()`.
 *
 * Mount this hook once in an always-visible component (WrongNetworkBanner).
 */
export function useChainGuard(): ChainGuard {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [isSwitching, setIsSwitching] = useState(false);

  // Track whether we have already attempted auto-switch for this session
  const hasAttemptedSwitch = useRef(false);

  const isOnCelo = CELO_IDS.has(chainId);

  // Auto-switch once: triggered when the wallet first connects on wrong chain
  useEffect(() => {
    if (!isConnected) {
      // Reset when wallet disconnects so we auto-switch again on next connect
      hasAttemptedSwitch.current = false;
      return;
    }

    if (isOnCelo || hasAttemptedSwitch.current) return;

    // First connection on a non-Celo chain - attempt auto-switch
    hasAttemptedSwitch.current = true;
    setIsSwitching(true);
    switchChainAsync({ chainId: CHAIN_IDS.CELO })
      .catch(() => {
        // User rejected or wallet doesn't support programmatic switching.
        // WrongNetworkBanner will handle the manual fallback.
      })
      .finally(() => setIsSwitching(false));
  }, [isConnected, isOnCelo, switchChainAsync]);

  const switchToCelo = useCallback(async () => {
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: CHAIN_IDS.CELO });
    } catch {
      // User rejected - nothing to do; banner stays visible
    } finally {
      setIsSwitching(false);
    }
  }, [switchChainAsync]);

  return {
    isOnCelo,
    isConnected,
    isSwitching,
    switchToCelo,
  };
}

/** Convenience re-export of the Celo mainnet name */
export const CELO_CHAIN_NAME = TARGET_CHAIN.name;
