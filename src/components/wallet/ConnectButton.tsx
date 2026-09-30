import { useState, useRef, useEffect, Suspense } from "react";
import { lazyWithReload } from "../../utils/lazyWithReload";
import {
  useAccount,
  useBalance,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { truncateAddress, copyToClipboard } from "../../utils/format";
import { TARGET_CHAIN, getExplorerUrl } from "../../config/chains";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { useCurrency } from "../../context/CurrencyContext";
import ConnectModal from "./ConnectModal";

// Swap/bridge is an iframe widget, loaded only when opened.
const SQUID_ENABLED = !!(import.meta.env.VITE_SQUID_INTEGRATOR_ID as string | undefined)?.trim();
const SquidBridgeModal = lazyWithReload(() => import("./SquidBridgeModal"), "SquidBridgeModal");

/**
 * Wallet connect/disconnect button with inline dropdown.
 */
export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: celoBalance } = useBalance({ address });
  const { getBalance, refetch: refetchBalances, isLoading: balancesLoading } = useTokenBalances();
  const { selectedToken, formatAmount } = useCurrency();
  // Authoritative: reported by the Dynamic bridge from the connector itself, so
  // it stays correct even if the stored wallet address is stale or wrong.

  // Reopen the wallet picker after the reload that switches us into the
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCorrectChain = chainId === TARGET_CHAIN.id;
  const balance = getBalance(selectedToken.symbol);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Not connected ────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <>
        {/* xs: icon-only wallet button */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center rounded-md bg-brand p-1.5 text-white transition-all hover:bg-brand-hover active:scale-95 sm:hidden"
          aria-label="Connect Wallet"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </button>

        {/* sm+: "Connect" with icon */}
        <button
          onClick={() => setShowModal(true)}
          className="hidden items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 text-sm font-semibold text-white transition-all hover:bg-brand-hover active:scale-95 sm:flex"
          aria-label="Connect Wallet"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span>Connect</span>
        </button>

        {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // ── Connected ────────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-[#373A3F] bg-[#292B30] px-2 py-1.5 text-sm font-medium text-white transition-all hover:bg-[#373A3F] active:scale-[0.98]"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        {/* Status dot */}
        <span
          className={`h-2 w-2 flex-shrink-0 rounded-full ${
            isCorrectChain ? "bg-green-400" : "bg-amber-400"
          }`}
        />
        {/* Balance - lg+ only (hides at the tight md breakpoint) */}
        {balance && (
          <span className="hidden text-xs text-gray-300 lg:inline">
            {balance.numeric.toFixed(2)} {selectedToken.symbol}
          </span>
        )}
        {/* Truncated address */}
        <span className="font-mono text-xs text-gray-200">
          {truncateAddress(address!, 4)}
        </span>
        {/* Chevron */}
        <svg
          className={`h-3.5 w-3.5 flex-shrink-0 text-gray-500 transition-transform ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {showDropdown && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#292B30] bg-[#212428] p-3 shadow-2xl shadow-black/60 sm:w-72">
          {/* Wrong network */}
          {!isCorrectChain && (
            <button
              onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
              className="mb-3 flex w-full items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-900/30 p-3 text-left text-sm transition-colors hover:bg-amber-900/50"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-300">Wrong network</p>
                <p className="text-xs text-amber-400">Tap to switch to {TARGET_CHAIN.name}</p>
              </div>
            </button>
          )}

          {/* Balance section */}
          <div className="mb-2 rounded-lg bg-[#292B30] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Balance
              </p>
              <button
                onClick={() => refetchBalances()}
                disabled={balancesLoading}
                className="rounded p-0.5 text-gray-600 transition-colors hover:text-gray-300 disabled:opacity-50"
                aria-label="Refresh balance"
                title="Refresh balance"
              >
                <svg
                  className={`h-3 w-3 ${balancesLoading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            {balance ? (
              <div className="mt-1">
                <p className="text-base font-bold text-white">
                  {balance.numeric.toFixed(2)}{" "}
                  <span className="text-gray-400">{selectedToken.symbol}</span>
                </p>
                <p className="text-xs text-gray-500">{formatAmount(balance.numeric)}</p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Loading…</p>
            )}
            {celoBalance && (
              <p className="mt-1.5 text-xs text-gray-600">
                Gas: {parseFloat(celoBalance.formatted).toFixed(4)} CELO
              </p>
            )}
          </div>

          {/* Address + copy */}
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-[#292B30]"
          >
            <span className="font-mono text-sm text-gray-400">
              {truncateAddress(address!, 6)}
            </span>
            <span className={`text-xs font-medium transition-colors ${copied ? "text-green-400" : "text-gray-600 hover:text-gray-400"}`}>
              {copied ? "Copied!" : "Copy"}
            </span>
          </button>

          {/* Swap tokens, powered by Squid */}
          {SQUID_ENABLED && (
            <button
              onClick={() => {
                setShowSwap(true);
                setShowDropdown(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-[#292B30] hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Swap tokens
            </button>
          )}

          {/* View on explorer */}
          <a
            href={getExplorerUrl(chainId, address!, "address")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-[#292B30] hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </a>

          <div className="my-1.5 border-t border-[#292B30]" />

          {/* Disconnect */}
          <button
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-900/20 hover:text-red-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      )}

      {showSwap && (
        <Suspense fallback={null}>
          <SquidBridgeModal variant="swap" onClose={() => setShowSwap(false)} />
        </Suspense>
      )}
    </div>
  );
}
