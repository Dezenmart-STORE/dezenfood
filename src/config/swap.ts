import { ChainId } from "@uniswap/sdk-core";

// ---------------------------------------------------------------------------
// Uniswap V3 contract addresses on Celo
// ---------------------------------------------------------------------------
export const UNISWAP_ADDRESSES = {
  [ChainId.CELO]: {
    SWAP_ROUTER_02: "0x5615CDAb10dc425a742d643d949a7F474C01abc4" as const,
    QUOTER_V2: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8" as const,
    FACTORY: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc" as const,
  },
  [ChainId.CELO_ALFAJORES]: {
    SWAP_ROUTER_02: "0x5615CDAb10dc425a742d643d949a7F474C01abc4" as const,
    QUOTER_V2: "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8" as const,
    FACTORY: "0xAfE208a311B21f13EF87E33A90049fC17A7acDEc" as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Fee tiers
// ---------------------------------------------------------------------------
export enum FeeTier {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

export const DEFAULT_FEE_TIER = FeeTier.MEDIUM;

export const ALL_FEE_TIERS = [
  FeeTier.LOWEST,
  FeeTier.LOW,
  FeeTier.MEDIUM,
  FeeTier.HIGH,
] as const;

// ---------------------------------------------------------------------------
// Swap settings
// ---------------------------------------------------------------------------
export const SWAP_DEFAULTS = {
  /** Maximum pool hops for route discovery */
  maxHops: 3,
  /** Transaction deadline in seconds */
  deadline: 1800, // 30 minutes
  /** Gas estimate safety multiplier */
  gasMultiplier: 1.2,
} as const;

/** Slippage presets in basis points */
export const SLIPPAGE = {
  LOW: 50, // 0.5%
  MEDIUM: 100, // 1%
  HIGH: 300, // 3%
} as const;

export type SlippagePreset = keyof typeof SLIPPAGE;
