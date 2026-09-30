import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { StableToken } from "../../../../config/tokens";

interface Props {
  listPrice: string;
  priceCurrency: "USD" | "FIAT";
  /** User's local fiat code from geolocation, e.g. "NGN". */
  fiatCode: string;
  priceUSD: number;
  fiatEquivalent: number;
  tokenEquivalent: number;
  paymentToken: string | undefined;
  tokens: StableToken[];
  onPriceChange: (v: string) => void;
  onCurrencyToggle: (c: "USD" | "FIAT") => void;
  onTokenChange: (symbol: string) => void;
  error?: string;
}

// Prices are money - show 2 decimals everywhere for a consistent look.
const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const PriceField: React.FC<Props> = ({
  listPrice,
  priceCurrency,
  fiatCode,
  priceUSD,
  fiatEquivalent,
  tokenEquivalent,
  paymentToken,
  tokens,
  onPriceChange,
  onCurrencyToggle,
  onTokenChange,
  error,
}) => {
  const [tokenOpen, setTokenOpen] = useState(false);
  const selectedToken = tokens.find((t) => t.symbol === paymentToken);

  // Only offer the fiat option when we know a non-USD local currency.
  const hasFiat = !!fiatCode && fiatCode.toUpperCase() !== "USD";
  const activeCode = priceCurrency === "USD" ? "USD" : fiatCode;

  const toggleBtn = (mode: "USD" | "FIAT", label: string) => (
    <button
      type="button"
      onClick={() => onCurrencyToggle(mode)}
      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
        priceCurrency === mode ? "bg-brand text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* List price + currency toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            List price
          </p>
          {hasFiat && (
            <div className="flex gap-0.5 bg-[#212428] rounded-lg p-0.5">
              {toggleBtn("USD", "USD")}
              {toggleBtn("FIAT", fiatCode)}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            inputMode="decimal"
            value={listPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="0.00"
            aria-label={`Price in ${activeCode}`}
            className={`w-full bg-[#3A3C41] text-white pl-3 pr-16 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-all ${
              error ? "ring-1 ring-red-500" : ""
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none">
            {activeCode}
          </span>
        </div>

        {/* Equivalents */}
        {priceUSD > 0 && (
          <div className="mt-2 space-y-2">
            {/* Secondary reference - the other currency */}
            {priceCurrency === "FIAT" ? (
              <p className="text-xs text-gray-500">≈ ${fmt(priceUSD)} USD</p>
            ) : hasFiat ? (
              <p className="text-xs text-gray-500">
                ≈ {fmt(fiatEquivalent)} {fiatCode}
              </p>
            ) : null}

            {/* Primary - what buyers actually pay, made hard to miss */}
            {tokenEquivalent > 0 && paymentToken && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-brand/40 bg-brand/10 px-3 py-2.5">
                <span className="text-xs font-medium text-gray-300">
                  Buyers pay
                </span>
                <span className="text-sm font-bold text-white">
                  ≈ {fmt(tokenEquivalent)} {paymentToken}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs" role="alert">
          {error}
        </p>
      )}

      {/* Payment token selector */}
      <div className="relative">
        <label className="block text-xs text-gray-400 mb-1.5">
          Buyers pay with <span className="text-red-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => setTokenOpen((o) => !o)}
          aria-expanded={tokenOpen}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[#3A3C41] rounded-xl border border-transparent hover:border-brand/30 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedToken?.icon ? (
              <img
                src={selectedToken.icon}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            ) : (
              <span className="text-base flex-shrink-0">💰</span>
            )}
            <div className="text-left min-w-0">
              <p className="text-white text-sm font-medium">
                {selectedToken?.symbol ?? "Select token"}
              </p>
              <p className="text-gray-400 text-xs truncate">{selectedToken?.name}</p>
            </div>
          </div>
          <FiChevronDown
            size={16}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
              tokenOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {tokenOpen && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-1 bg-[#292B30] border border-[#3A3C41] rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              role="listbox"
            >
              {tokens.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  role="option"
                  aria-selected={token.symbol === paymentToken}
                  onClick={() => {
                    onTokenChange(token.symbol);
                    setTokenOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3A3C41] transition-colors ${
                    token.symbol === paymentToken ? "bg-brand/15" : ""
                  }`}
                >
                  {token.icon ? (
                    <img
                      src={token.icon}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <span className="text-base flex-shrink-0">💰</span>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-medium">{token.symbol}</p>
                    <p className="text-gray-400 text-xs truncate">{token.name}</p>
                  </div>
                  {token.symbol === paymentToken && (
                    <FiCheck size={14} className="text-red-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PriceField;
