import { http, createConfig, fallback } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet as rkCoinbaseWallet,
  trustWallet,
  valoraWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

// ---------------------------------------------------------------------------
// RPC endpoints with fallbacks for reliability
// ---------------------------------------------------------------------------
const RPC_ENDPOINTS = {
  [celo.id]: [
    "https://rpc.ankr.com/celo",
    "https://forno.celo.org",
    "https://celo-mainnet.public.blastapi.io",
  ],
  [celoSepolia.id]: ["https://forno.celo-sepolia.celo-testnet.org"],
} as const;

// ---------------------------------------------------------------------------
// Escrow contract addresses (per chain)
// ---------------------------------------------------------------------------
export const ESCROW_ADDRESSES: Record<number, string> = {
  [celo.id]: import.meta.env.VITE_ESCROW_CONTRACT_MAINNET ?? "",
  [celoSepolia.id]: import.meta.env.VITE_ESCROW_CONTRACT_TESTNET ?? "",
};

export function getEscrowAddress(chainId: number): string {
  const addr = ESCROW_ADDRESSES[chainId];
  if (!addr) throw new Error(`No escrow address for chain ${chainId}`);
  return addr;
}

// ---------------------------------------------------------------------------
// Block explorer URLs
// ---------------------------------------------------------------------------
const EXPLORER_URLS: Record<number, string> = {
  [celo.id]: "https://celo.blockscout.com",
  [celoSepolia.id]: "https://celo-sepolia.blockscout.com",
};

export function getExplorerUrl(
  chainId: number,
  hash: string,
  type: "tx" | "address" = "tx"
): string {
  const base = EXPLORER_URLS[chainId] ?? EXPLORER_URLS[celo.id];
  return `${base}/${type}/${hash}`;
}

// ---------------------------------------------------------------------------
// Target chain (production default)
// ---------------------------------------------------------------------------
export const TARGET_CHAIN = celo;
export const SUPPORTED_CHAINS = [celo, celoSepolia] as const;

// ---------------------------------------------------------------------------
// Wagmi config - single source of truth for wallet connectivity
// ---------------------------------------------------------------------------
export const appMeta = {
  name: "DezenFoods",
  url: typeof window !== "undefined" ? window.location.origin : "",
  logo: typeof window !== "undefined"
    ? `${window.location.origin}/images/logo-full.png`
    : "",
};

const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

/**
 * External wallet connectors, built by RainbowKit.
 *
 * RainbowKit owns the third-party connect experience (install/QR/mobile
 * deep-links, real wallet icons, "not installed" states) - hand-rolling that
 * list was where our own version kept breaking. RainbowKit is now the only
 * way to connect - the Dynamic embedded wallet has been removed.
 *
 * WalletConnect-backed wallets (Trust, Valora, the QR option) need a project
 * id, so they're only registered when one is configured. MetaMask and Coinbase
 * work without it via their own SDKs.
 */
const externalConnectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        rkCoinbaseWallet,
        ...(WC_PROJECT_ID ? [valoraWallet, trustWallet, walletConnectWallet] : []),
      ],
    },
  ],
  {
    appName: appMeta.name,
    appUrl: appMeta.url,
    appIcon: appMeta.logo,
    // RainbowKit throws at import time (white screen for EVERYONE, including fiat
    // buyers) when this is empty. WalletConnect-only wallets are not registered
    // without a real id (above), so a placeholder is safe: the app boots and only
    // the WalletConnect connect path degrades.
    projectId: WC_PROJECT_ID || "walletconnect-project-id-not-set",
  }
);

export const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    // Coinbase Smart Wallet - email / passkey, kept for the Web2 path.
    coinbaseWallet({
      appName: appMeta.name,
      appLogoUrl: appMeta.logo,
      preference: "smartWalletOnly",
    }),
    ...externalConnectors,
  ],
  transports: {
    [celo.id]: fallback(
      RPC_ENDPOINTS[celo.id].map((url) =>
        http(url, { batch: { wait: 100 }, retryCount: 2, retryDelay: 1000, timeout: 30_000 })
      )
    ),
    [celoSepolia.id]: fallback(
      RPC_ENDPOINTS[celoSepolia.id].map((url) =>
        http(url, { batch: { wait: 100 }, retryCount: 2, retryDelay: 1000, timeout: 30_000 })
      )
    ),
  },
  pollingInterval: 12_000,
  syncConnectedChain: true,
});

export const CHAIN_IDS = {
  CELO: celo.id,
  CELO_SEPOLIA: celoSepolia.id,
} as const;

// ---------------------------------------------------------------------------
// Default registered logistics provider
// This address is registered on-chain via registerLogisticsProvider.
// Used as fallback when an order has no logistics provider set.
// ---------------------------------------------------------------------------
export const DEFAULT_LOGISTICS_PROVIDER =
  "0x0c9db90a95a78bf6d9b2448fde00210f36ba61e4" as `0x${string}`;
