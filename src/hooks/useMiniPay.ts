import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the app is running inside the MiniPay browser.
 * MiniPay injects window.ethereum and sets the `isMiniPay` flag.
 */
export function detectMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window.ethereum as { isMiniPay?: boolean } | undefined)?.isMiniPay
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface MiniPayHook {
  isMiniPay:   boolean;
  address:     `0x${string}` | undefined;
  isConnected: boolean;
}

/**
 * Detects the MiniPay environment and auto-connects the injected wallet.
 *
 * Per Celo docs: MiniPay exposes its provider at window.ethereum and is
 * compatible with the MetaMask injected target.
 */
export function useMiniPay(): MiniPayHook {
  const [isMiniPay] = useState(() => detectMiniPay());

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  useEffect(() => {
    if (!isMiniPay || isConnected) return;
    connect({ connector: injected({ target: "metaMask" }) });
  }, [isMiniPay, isConnected, connect]);

  return {
    isMiniPay,
    address,
    isConnected,
  };
}
