// ── MiniPay ───────────────────────────────────────────────────────
export { useMiniPay, detectMiniPay } from "./useMiniPay";
export type { MiniPayHook } from "./useMiniPay";

// ── Web3 / payment hooks ──────────────────────────────────────────
export { useEscrow } from "./useEscrow";
export type { EscrowResult } from "./useEscrow";

export { useApproval } from "./useApproval";

export { useTokenBalances } from "./useTokenBalances";
export type { TokenBalanceEntry } from "./useTokenBalances";

export { useSwap } from "./useSwap";
export type { SwapQuote, SwapResult } from "./useSwap";

export { usePayment } from "./usePayment";
export type { PaymentStep, PaymentParams } from "./usePayment";

export { usePrices } from "./usePrices";

export { useChainGuard } from "./useChainGuard";
export type { ChainGuard } from "./useChainGuard";

// ── App hooks ─────────────────────────────────────────────────────
export { useAppDispatch, useAppSelector } from "./redux";
export { useIntersectionObserver } from "./useIntersectionObserver";
export { usePushNotifications } from "./usePushNotifications";
export { useSEO } from "./useSEO";
