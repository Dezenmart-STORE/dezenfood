import {
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  valoraWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

/**
 * Display metadata (id, name, logo) for the third-party wallets we offer.
 *
 * Why this exists rather than reading it off RainbowKit's <WalletButton>:
 * WalletButton resolves its wallet from wagmi's *live* connector list and
 * throws "Connector not found" when the id isn't there
 * (WalletButtonRenderer.tsx). In "dezen" mode DynamicWagmiConnector replaces
 * that list with the single embedded-wallet connector on every render
 * (`config._internal.connectors.setState([connector])`), so every RainbowKit
 * connector disappears and rendering a WalletButton throws. Dynamic's own
 * ErrorBoundary then swallowed the throw and remounted the subtree, which is
 * what made the connect modal vanish the instant it opened.
 *
 * The wallet factories are pure metadata builders - calling one returns
 * {id, name, iconUrl, createConnector}. Reading the first three registers
 * nothing, so this is safe in both modes and independent of wagmi entirely.
 * Connecting still goes through RainbowKit, but only in "external" mode where
 * the connectors actually exist.
 */
const projectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ?? "";

export interface WalletBrand {
  id: string;
  name: string;
  /** RainbowKit gives this as a URL string or a lazy async loader. */
  iconUrl: string | (() => Promise<string>);
}

// The factories take mutually incompatible option shapes (Coinbase wants
// appName, WalletConnect wants projectId, ...). We only read metadata off the
// result, so a permissive signature is fine here and keeps them in one list.
type WalletFactory = (opts: {
  projectId: string;
  appName: string;
}) => { id: string; name: string; iconUrl: unknown };

const factories = [
  metaMaskWallet,
  coinbaseWallet,
  // WalletConnect-backed wallets need a project id to actually connect. They
  // still display without one; the connect path is what degrades.
  valoraWallet,
  trustWallet,
  walletConnectWallet,
] as unknown as WalletFactory[];

export const WALLET_BRANDS: WalletBrand[] = factories.map((make) => {
  const w = make({ projectId, appName: "DezenFoods" });
  return { id: w.id, name: w.name, iconUrl: w.iconUrl as WalletBrand["iconUrl"] };
});

/** True when RainbowKit's connectors are actually registered in wagmi. */
export const WALLETCONNECT_READY = !!projectId;
