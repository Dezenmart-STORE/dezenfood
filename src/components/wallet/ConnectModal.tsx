import { useEffect, useRef } from "react";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { detectMiniPay } from "../../hooks/useMiniPay";

interface Props {
  onClose: () => void;
}

/**
 * Opens RainbowKit's wallet picker.
 *
 * This renders no picker of its own. Every call site in the app already says
 * `{showModal && <ConnectModal onClose={...} />}`, so rather than change all of
 * them, this keeps that shape and forwards to RainbowKit's modal on mount.
 *
 * Why RainbowKit owns this: it handles the parts that kept breaking when we
 * hand-rolled the list - detecting installed extensions, QR for mobile, wallet
 * deep-links, real brand icons, and "not installed" states. The previous
 * hand-written picker (a wagmi connector list with our own icons) and the
 * Dynamic-driven one have both been removed.
 *
 * MiniPay is the one exception, and it has to be. Inside the MiniPay browser
 * the wallet is pre-authorised, so showing any picker would be wrong - we
 * connect the injected connector silently and close.
 */
export default function ConnectModal({ onClose }: Props) {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  // The modal is opened exactly once. Without this, a re-render while
  // RainbowKit's modal is open would call openConnectModal again.
  const opened = useRef(false);

  const isMiniPay = detectMiniPay();

  // MiniPay: connect silently, never show a picker.
  useEffect(() => {
    if (!isMiniPay) return;
    if (isConnected) {
      onClose();
      return;
    }
    connect({ connector: injected({ target: "metaMask" }) }); // per Celo docs
  }, [isMiniPay, isConnected, connect, onClose]);

  // Everyone else: hand off to RainbowKit.
  //
  // onClose fires immediately, not when RainbowKit's modal closes. RainbowKit
  // owns its own lifecycle and gives no close callback, so the caller's boolean
  // is reset now; leaving it true would make the caller think a modal of its
  // own is still open and block the next attempt.
  useEffect(() => {
    if (isMiniPay || opened.current) return;
    opened.current = true;
    openConnectModal?.();
    onClose();
  }, [isMiniPay, openConnectModal, onClose]);

  if (!isMiniPay) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#292B30] bg-[#212428] px-8 py-8">
        <svg className="h-7 w-7 animate-spin text-[#FF3B30]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium text-gray-300">Connecting wallet…</p>
      </div>
    </div>
  );
}
