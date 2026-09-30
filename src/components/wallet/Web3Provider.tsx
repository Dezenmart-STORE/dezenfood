import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig, TARGET_CHAIN } from "../../config/chains";
import { queryClient } from "../../config/queryClient";

/**
 * The whole web3 provider tree: wagmi, React Query, RainbowKit.
 *
 * Replaces the former SmartWalletProvider/DynamicRoot pair. Dynamic (the Dezen
 * embedded wallet) has been removed, so third-party wallets through RainbowKit
 * are the only way to connect.
 *
 * Note where RainbowKitProvider now sits. It used to live INSIDE DynamicRoot,
 * which was lazy-loaded and mounted only for signed-in users with the feature
 * on - so the external wallet picker quietly depended on Dynamic being present,
 * and turning Dynamic off would have taken RainbowKit down with it. It is
 * mounted unconditionally here, which is what makes the removal safe.
 *
 * There is no longer a lazy boundary or a boot-time session gate: the tree is
 * the same for every visitor, signed in or not, so nothing can remount the app
 * mid-session the way swapping trees used to.
 */
const rkTheme = darkTheme({
  accentColor: "#f97316",
  accentColorForeground: "#ffffff",
  borderRadius: "large",
  overlayBlur: "small",
});

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rkTheme}
          modalSize="compact"
          initialChain={TARGET_CHAIN}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
