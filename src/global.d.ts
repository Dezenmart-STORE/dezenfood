export {};
declare module "*.svg" {
  import React from "react";
  export const ReactComponent: React.ElementType;
  const src: string;
  export default src;
}

declare global {
  interface Window {
    /** EIP-1193 provider injected by MetaMask, MiniPay, and other wallets. */
    ethereum:
      | (import("viem").EIP1193Provider & {
          /** Set to `true` when running inside the MiniPay browser. */
          isMiniPay?: boolean;
          /** Set to `true` when MetaMask is the injected provider. */
          isMetaMask?: boolean;
        })
      | undefined;
    connectMetaMask: () => Promise<string>;
    connectGoogle: () => Promise<string>;
    connectEmail: (
      email: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPhone: (
      phone: string,
      verificationCode?: string
    ) => Promise<{ preAuth?: boolean; type?: string; address?: string } | void>;
    connectPasskey: () => Promise<string>;
    connectGuest: () => Promise<string>;
  }
}
declare module "@wagmi/core";
