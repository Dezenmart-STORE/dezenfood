import { useMiniPay } from "../../hooks/useMiniPay";

/**
 * Silently auto-connects the MiniPay wallet on app load.
 *
 * Must be mounted at Layout level (not inside a conditional or a dropdown)
 * so that the connection happens immediately - before any user interaction.
 *
 * Renders nothing. No-op on non-MiniPay devices.
 */
export default function MiniPayAutoConnect() {
  useMiniPay(); // side-effect: auto-connects when window.ethereum.isMiniPay is true
  return null;
}
