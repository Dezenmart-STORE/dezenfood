import { useState, useRef, useEffect } from "react";
import { useChainId } from "wagmi";
import { TOKENS, type StableToken, getFeeCurrencyAddress } from "../../config/tokens";
import { useTokenBalances } from "../../hooks/useTokenBalances";

interface Props {
  value: string; // Current token symbol
  onChange: (token: StableToken) => void;
  label?: string;
}

/**
 * Token picker dropdown - dark themed.
 * Shows symbol, icon, and user's balance for each token.
 * Tokens with a balance are sorted to the top.
 */
export default function TokenSelect({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { getBalance } = useTokenBalances();
  const chainId = useChainId();

  const selected = TOKENS.find((t) => t.symbol === value) ?? TOKENS[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Sort: tokens with balance first, then alphabetically
  const sorted = [...TOKENS].sort((a, b) => {
    const balA = getBalance(a.symbol)?.numeric ?? 0;
    const balB = getBalance(b.symbol)?.numeric ?? 0;
    if (balA > 0 && balB === 0) return -1;
    if (balB > 0 && balA === 0) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-left transition-colors hover:border-[#373A3F] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-opacity-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected.icon && (
          <img src={selected.icon} alt="" className="h-5 w-5 flex-shrink-0 rounded-full" />
        )}
        <span className="flex-1 text-sm font-semibold text-white">
          {selected.symbol}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-[#292B30] bg-[#1a1c20] py-1 shadow-2xl shadow-black/60"
          role="listbox"
        >
          {sorted.map((token) => {
            const bal = getBalance(token.symbol);
            const isSelected = token.symbol === value;

            return (
              <button
                key={token.symbol}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(token);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "border-l-2 border-brand bg-red-900/20"
                    : "hover:bg-[#292B30]"
                }`}
              >
                {token.icon && (
                  <img src={token.icon} alt="" className="h-6 w-6 flex-shrink-0 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">{token.symbol}</p>
                    {!!getFeeCurrencyAddress(token.symbol, chainId) && (
                      <span className="rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-900/40 text-green-400 leading-none">
                        no CELO
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">{token.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {bal && bal.numeric > 0 && (
                    <span className="text-xs font-medium text-gray-400">
                      {bal.numeric.toFixed(2)}
                    </span>
                  )}
                  {isSelected && (
                    <svg className="h-4 w-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
