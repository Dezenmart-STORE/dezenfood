import { useMemo } from "react";
import { useGasPrice } from "wagmi";
import { CHAIN_IDS } from "../config/chains";

// ---------------------------------------------------------------------------
// Gas unit estimates - conservative upper bounds for Celo transactions
// ---------------------------------------------------------------------------

/** token approval + escrow buyTrade */
const GAS_UNITS_NO_SWAP = 550_000n;

/** swap approval + swap execution + escrow approval + escrow buyTrade */
const GAS_UNITS_WITH_SWAP = 900_000n;

const GWEI = 1_000_000_000n;

/** 10 Gwei - conservative Celo fallback (actual is usually 5–10 Gwei) */
const FALLBACK_GAS_PRICE = 10n * GWEI;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Estimates the total network fee for a payment flow on Celo in CELO units.
 *
 * Use `convertPrice(gasCelo, "CELO", paymentToken)` in the component to
 * express the fee in the user's payment token.
 *
 * @param includeSwap - true when the user needs a token swap before payment
 */
export function useGasEstimate(includeSwap: boolean): { gasCelo: number } {
  const { data: gasPriceWei } = useGasPrice({ chainId: CHAIN_IDS.CELO });

  return useMemo(() => {
    const price = gasPriceWei ?? FALLBACK_GAS_PRICE;
    const units = includeSwap ? GAS_UNITS_WITH_SWAP : GAS_UNITS_NO_SWAP;
    const gasCostWei = units * price;
    const gasCelo = Number(gasCostWei) / 1e18;
    return { gasCelo };
  }, [gasPriceWei, includeSwap]);
}
