import { useEffect, useMemo, useState } from "react";
import { useModalPresence } from "../../utils/modalPresence";
import { buildSquidIframeUrl } from "./squidConfig";

interface Props {
  onClose: () => void;
  /** "bridge" = move funds from another chain to Celo (post-connect guide).
   *  "swap"   = swap tokens inside the connected wallet (wallet menu). */
  variant?: "bridge" | "swap";
}

const INTEGRATOR_ID = (import.meta.env.VITE_SQUID_INTEGRATOR_ID as string | undefined)?.trim();
export const SQUID_ENABLED = !!INTEGRATOR_ID;

/**
 * In-app cross-chain bridge, Dezen-branded, destination locked to Celo.
 *
 * We embed Squid's HOSTED widget via an iframe rather than bundling
 * @0xsquid/widget: the npm package's module volume OOM-kills the build's
 * transform phase (over the 4GB Netlify budget), and the iframe adds zero to our
 * bundle or build - it only loads when a user opens this modal.
 *
 * Requires studio.squidrouter.com in the CSP frame-src (see netlify.toml).
 */
export default function SquidBridgeModal({ onClose, variant = "bridge" }: Props) {
  useModalPresence();
  const isSwap = variant === "swap";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!SQUID_ENABLED);

  // A blocked or misconfigured embed often never fires onError - it just never
  // loads. Fall back rather than leaving a dead panel on screen.
  useEffect(() => {
    if (loaded || failed) return;
    const t = setTimeout(() => setFailed((f) => f || !loaded), 12000);
    return () => clearTimeout(t);
  }, [loaded, failed]);

  const src = useMemo(
    () => buildSquidIframeUrl(INTEGRATOR_ID ?? "", isSwap ? "swap" : "bridge"),
    [isSwap]
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#292B30] bg-[#212428] shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#292B30] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {isSwap ? "Swap tokens" : "Move funds to Celo"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isSwap
                ? "Swap inside your wallet, powered by Squid"
                : "Bridge from any chain into your wallet"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-[#292B30] hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {failed ? (
          <Fallback isSwap={isSwap} onClose={onClose} integratorId={INTEGRATOR_ID} />
        ) : (
          <div className="relative">
            {!loaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#212428]">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
                <p className="text-sm text-gray-500">Loading the exchange…</p>
              </div>
            )}
            <iframe
              title={isSwap ? "Swap tokens" : "Move funds to Celo"}
              src={src}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className="h-[640px] max-h-[75dvh] w-full border-0 bg-[#212428]"
              allow="clipboard-read; clipboard-write; accelerometer; gyroscope; payment"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Shown when the embedded exchange can't start (it reports itself offline, is
 * blocked, or never loads). Better than leaving the user staring at a dead
 * panel: explain it plainly and hand them a working way out.
 */
function Fallback({
  isSwap,
  onClose,
  integratorId,
}: {
  isSwap: boolean;
  onClose: () => void;
  integratorId?: string;
}) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-white">The exchange isn't available right now</h3>
      </div>
      <p className="text-sm text-gray-400">
        {isSwap
          ? "You can still swap using Squid directly, then come back to DezenFoods."
          : "You can still bridge using Squid directly, then come back to DezenFoods."}{" "}
        Make sure the destination network is <span className="font-semibold text-gray-300">Celo</span>.
      </p>
      {/* Surfaces the account the embed is using: an inactive, mistyped or
          domain-restricted integrator id is the usual cause of "Squid Offline". */}
      <p className="mt-3 rounded-lg bg-[#1a1c20] px-3 py-2 font-mono text-[11px] text-gray-500">
        Integrator: {integratorId ? `${integratorId.slice(0, 6)}…${integratorId.slice(-4)}` : "not set"}
      </p>
      <a
        href="https://app.squidrouter.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
      >
        Open Squid
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      <button
        onClick={onClose}
        className="mt-2 w-full rounded-xl bg-[#292B30] py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-[#333940]"
      >
        Close
      </button>
    </div>
  );
}
