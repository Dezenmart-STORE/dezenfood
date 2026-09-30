import { formatNaira } from "../utils/food";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_TOKEN, type StableToken, TOKENS, getToken } from "../config/tokens";
import { usePrices } from "../hooks/usePrices";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DisplayMode = "token" | "fiat";
type SecondaryCurrency = "TOKEN" | "FIAT";

interface CurrencyContextValue {
  /** Currently selected payment/display token */
  selectedToken: StableToken;
  setSelectedToken: (token: StableToken) => void;

  /** "token" shows prices in the selected token; "fiat" shows in local fiat */
  displayMode: DisplayMode;
  toggleDisplayMode: () => void;

  /** All available tokens */
  tokens: StableToken[];

  /**
   * Primary method for displaying a product price stored in USD.
   *
   * Token mode → converts USD → selected token, formats with symbol.
   * Fiat mode  → converts USD → user's local fiat, formats with currency symbol.
   *
   * @example formatDisplayPrice(19.99) → "19.99 USDT" | "₦32,985"
   */
  formatDisplayPrice: (amount: number, currency?: string) => string;

  /**
   * Format an amount already denominated in a specific token.
   * Used for trade amounts, order totals, and wallet balances.
   *
   * Respects displayMode: in fiat mode the amount is first converted to
   * the user's local fiat before formatting.
   *
   * @example formatAmount(5.0, "CELO") → "5.00 CELO" | "₦5,850"
   */
  formatAmount: (amount: number, symbol?: string) => string;

  /** Convert an amount from one currency to another */
  convertPrice: (price: number, from: string, to: string) => number;

  /** Format a price with its currency symbol */
  formatPrice: (price: number, currency: string) => string;

  /** Convert a token amount to USD */
  toUSD: (amount: number, symbol: string) => number;

  /** True while live exchange rates are being fetched */
  isFetching: boolean;

  /** Timestamp (ms) of the last successful rate fetch - 0 if only pegged rates loaded */
  updatedAt: number;

  /** Trigger an immediate rate refresh */
  refreshRates: () => void;

  // ── Backward-compatible props ─────────────────────────────────────────────

  /** "TOKEN" or "FIAT" - same meaning as displayMode */
  secondaryCurrency: SecondaryCurrency;

  /** Shortcut for selectedToken.symbol */
  selectedTokenSymbol: string;

  /** Best secondary fiat code for the selected token (avoids duplicate denomination) */
  fiatCurrency: string;

  /** User's local fiat code from geolocation (e.g. "NGN", "GBP") */
  userLocalCurrency: string;

  toggleSecondaryCurrency: () => void;
  setSecondaryCurrency: (currency: SecondaryCurrency) => void;
  formatTokenPrice: (price: number) => string;
  formatFiatPrice: (price: number) => string;
}

const CurrencyCtx = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "dezenmart_secondary_currency";

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const {
    toUSD,
    convertPrice,
    formatPrice,
    getSecondaryFiat,
    userFiat,
    isFetching,
    updatedAt,
    refreshRates,
  } = usePrices();

  const [selectedToken, setSelectedTokenRaw] = useState<StableToken>(() => {
    try {
      const saved = localStorage.getItem("selectedToken");
      if (saved) {
        const parsed = JSON.parse(saved) as { symbol?: string };
        return getToken(parsed.symbol ?? "") ?? DEFAULT_TOKEN;
      }
    } catch { /* ignore */ }
    return DEFAULT_TOKEN;
  });

  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "TOKEN") return "token";
      if (stored === "FIAT") return "fiat";
    } catch { /* ignore */ }
    return "fiat";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, displayMode === "token" ? "TOKEN" : "FIAT");
    } catch { /* ignore */ }
  }, [displayMode]);

  const setSelectedToken = useCallback((token: StableToken) => {
    setSelectedTokenRaw(token);
    try {
      localStorage.setItem("selectedToken", JSON.stringify({ symbol: token.symbol }));
    } catch { /* ignore */ }
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => (prev === "token" ? "fiat" : "token"));
  }, []);

  const selectedTokenSymbol = selectedToken.symbol;

  /**
   * Primary product-price display.
   * Legacy listings store USD; food listings carry currency "NGN" and skip conversion.
   */
  const formatDisplayPrice = useCallback(
    (usdAmount: number, currency?: string): string => {
      // Food listings are priced in NGN - show them as-is, no USD round trip.
      if (currency?.toUpperCase() === "NGN") return formatNaira(usdAmount);
      if (displayMode === "fiat") {
        const fiatAmount = convertPrice(usdAmount, "USD", "FIAT");
        return formatPrice(fiatAmount, "FIAT");
      }
      const tokenAmount = convertPrice(usdAmount, "USD", selectedTokenSymbol);
      return formatPrice(tokenAmount, selectedTokenSymbol);
    },
    [displayMode, selectedTokenSymbol, convertPrice, formatPrice]
  );

  /**
   * Format a token-denominated amount for display.
   * Converts to user's local fiat when in fiat mode.
   */
  const formatAmount = useCallback(
    (amount: number, symbol?: string): string => {
      const sym = symbol ?? selectedTokenSymbol;
      if (displayMode === "fiat") {
        const usdAmount = toUSD(amount, sym);
        const fiatAmount = convertPrice(usdAmount, "USD", "FIAT");
        return formatPrice(fiatAmount, "FIAT");
      }
      return `${amount.toFixed(2)} ${sym}`;
    },
    [displayMode, selectedTokenSymbol, toUSD, convertPrice, formatPrice]
  );

  // ── Backward-compat helpers ──────────────────────────────────────────────

  const secondaryCurrency: SecondaryCurrency = displayMode === "token" ? "TOKEN" : "FIAT";

  const fiatCurrency = useMemo(
    () => getSecondaryFiat(selectedTokenSymbol),
    [selectedTokenSymbol, getSecondaryFiat]
  );

  const toggleSecondaryCurrency = toggleDisplayMode;

  const setSecondaryCurrency = useCallback((currency: SecondaryCurrency) => {
    setDisplayMode(currency === "TOKEN" ? "token" : "fiat");
  }, []);

  const formatTokenPrice = useCallback(
    (price: number) => formatPrice(price, selectedTokenSymbol),
    [formatPrice, selectedTokenSymbol]
  );

  const formatFiatPrice = useCallback(
    (priceInToken: number) => {
      const converted = convertPrice(priceInToken, selectedTokenSymbol, fiatCurrency);
      return formatPrice(converted, fiatCurrency);
    },
    [convertPrice, formatPrice, selectedTokenSymbol, fiatCurrency]
  );

  return (
    <CurrencyCtx.Provider
      value={{
        selectedToken,
        setSelectedToken,
        displayMode,
        toggleDisplayMode,
        tokens: TOKENS,
        formatDisplayPrice,
        formatAmount,
        convertPrice,
        formatPrice,
        toUSD,
        isFetching,
        updatedAt,
        refreshRates,
        // Backward-compat
        secondaryCurrency,
        selectedTokenSymbol,
        fiatCurrency,
        userLocalCurrency: userFiat,
        toggleSecondaryCurrency,
        setSecondaryCurrency,
        formatTokenPrice,
        formatFiatPrice,
      }}
    >
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
