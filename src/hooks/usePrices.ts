import { useCallback } from "react";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_IDS: Record<string, string> = {
  USDT: "tether",
  cUSD: "celo-dollar",
  cEUR: "celo-euro",
  cREAL: "celo-real-creal",
  "G$": "gooddollar",
  CELO: "celo",
};

/** Fallback token→USD rates used before live data arrives. */
const PEGGED_RATES: Record<string, number> = {
  USDT: 1,
  cUSD: 1,
  cEUR: 1.08,
  cREAL: 0.18,
  cKES: 0.0065,
  cNGN: 0.00063,
  cGBP: 1.27,
  cJPY: 0.0067,
  cCHF: 1.13,
  cZAR: 0.055,
  cAUD: 0.66,
  cCAD: 0.74,
  cCOP: 0.00024,
  eXOF: 0.0016,
  PUSO: 0.018,
  cGHS: 0.062,
  "G$": 0.00015,
  CELO: 0.5,
  USD: 1,
};

/** Token → corresponding fiat currency ISO code. */
export const TOKEN_FIAT_MAP: Record<string, string> = {
  // New Mento tickers
  USDm: "USD",
  EURm: "EUR",
  BRLm: "BRL",
  KESm: "KES",
  PHPm: "PHP",
  COPm: "COP",
  XOFm: "XOF",
  NGNm: "NGN",
  JPYm: "JPY",
  CHFm: "CHF",
  ZARm: "ZAR",
  GBPm: "GBP",
  AUDm: "AUD",
  CADm: "CAD",
  GHSm: "GHS",
  // Legacy cX tickers (existing products/orders stored before the rebrand)
  cUSD: "USD",
  cEUR: "EUR",
  cREAL: "BRL",
  cKES: "KES",
  PUSO: "PHP",
  cCOP: "COP",
  eXOF: "XOF",
  cNGN: "NGN",
  cJPY: "JPY",
  cCHF: "CHF",
  cZAR: "ZAR",
  cGBP: "GBP",
  cAUD: "AUD",
  cCAD: "CAD",
  cGHS: "GHS",
  "G$": "USD",
  USDT: "USD",
};

const GEO_KEY = "dezen_user_geo";
const GEO_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const RATES_KEY = "dezen_rates_cache";
const RATES_EXPIRY = 60 * 60 * 1000; // 1 hour - used for cold-start warm-up only

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatesSnapshot {
  rates: Record<string, number>;
  fiatRates: Record<string, number>;
  userFiat: string;
}

// ---------------------------------------------------------------------------
// Helpers (module-level, no side effects on import)
// ---------------------------------------------------------------------------

function getCachedGeo(): string | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { currency: string; ts: number };
    if (Date.now() - data.ts < GEO_EXPIRY) return data.currency;
  } catch { /* ignore */ }
  return null;
}

async function fetchGeo(): Promise<string> {
  const cached = getCachedGeo();
  if (cached) return cached;
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { currency?: string };
    const currency = data.currency ?? "USD";
    localStorage.setItem(GEO_KEY, JSON.stringify({ currency, ts: Date.now() }));
    return currency;
  } catch {
    return "USD";
  }
}

function loadFromStorage(): (RatesSnapshot & { updatedAt: number }) | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RatesSnapshot & { updatedAt: number };
    if (Date.now() - data.updatedAt < RATES_EXPIRY) return data;
  } catch { /* ignore */ }
  return null;
}

function getStoredUpdatedAt(): number {
  return loadFromStorage()?.updatedAt ?? 0;
}

/** Fetches geo + CoinGecko, persists to localStorage, returns snapshot. */
async function fetchRatesSnapshot(): Promise<RatesSnapshot> {
  const userFiat = await fetchGeo();

  const fiatCurrencies = Array.from(new Set(Object.values(TOKEN_FIAT_MAP)));
  const vsCurrencies = [
    ...new Set([
      userFiat.toLowerCase(),
      ...fiatCurrencies.map((c) => c.toLowerCase()),
      "usd",
    ]),
  ].join(",");

  const ids = Object.values(TOKEN_IDS).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&precision=8`,
    { signal: AbortSignal.timeout(8000) }
  );

  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = (await res.json()) as Record<string, Record<string, number>>;

  const rates: Record<string, number> = { ...PEGGED_RATES };
  for (const [symbol, cgId] of Object.entries(TOKEN_IDS)) {
    if (data[cgId]?.usd) rates[symbol] = data[cgId].usd;
  }

  const fiatRates: Record<string, number> = { USD_USD: 1 };
  const tetherData = data.tether ?? {};
  for (const [fiatCode, rate] of Object.entries(tetherData)) {
    if (typeof rate === "number") {
      fiatRates[`USD_${fiatCode.toUpperCase()}`] = rate;
    }
  }

  const snapshot: RatesSnapshot & { updatedAt: number } = {
    rates,
    fiatRates,
    userFiat,
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(snapshot));
  } catch { /* storage quota - skip silently */ }

  return { rates, fiatRates, userFiat };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Token → USD exchange rates, powered by TanStack Query.
 *
 * - Cold starts: immediately returns rates from localStorage (via initialData)
 *   so the UI never shows pegged fallbacks on first render.
 * - Background poll: refetches every 2 minutes automatically.
 * - Window focus / network reconnect: triggers a fresh fetch.
 * - Manual refresh: call refreshRates() to invalidate immediately.
 */
export function usePrices() {
  const queryClient = useQueryClient();

  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchRatesSnapshot,
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
    initialData: () =>
      loadFromStorage() ?? {
        rates: { ...PEGGED_RATES },
        fiatRates: {},
        userFiat: getCachedGeo() ?? "USD",
      },
    initialDataUpdatedAt: getStoredUpdatedAt,
  });

  const { rates, fiatRates, userFiat } = data;

  const refreshRates = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
  }, [queryClient]);

  /**
   * For stablecoins NOT directly tracked by CoinGecko (i.e. not in TOKEN_IDS),
   * use the live USDT/fiat rate fetched via TOKEN_FIAT_MAP as a bridge.
   *
   * e.g. cKES → TOKEN_FIAT_MAP["cKES"] = "KES" → fiatRates["USD_KES"] ≈ 129
   *   $100 → cKES: 100 * 129 = 12,900 cKES  (pegged fallback was 100/0.0065 ≈ 15,384 - wrong)
   *
   * Returns the live bridge rate (USD per 1 fiat unit → multiplier FROM usd),
   * or undefined when the token has a direct CoinGecko rate or no fiat mapping.
   */
  const getFiatBridgeRate = (symbol: string): number | undefined => {
    if (TOKEN_IDS[symbol]) return undefined; // has direct CoinGecko rate
    const fiatCode = TOKEN_FIAT_MAP[symbol];
    if (!fiatCode) return undefined;
    const r = fiatRates[`USD_${fiatCode}`];
    return r && r > 0 ? r : undefined;
  };

  /** Convert a token amount to USD. */
  const toUSD = useCallback(
    (amount: number, symbol: string): number => {
      if (symbol === "USD" || symbol === "FIAT") return amount;
      const bridgeRate = getFiatBridgeRate(symbol);
      if (bridgeRate !== undefined) return amount / bridgeRate;
      const rate = rates[symbol];
      return rate !== undefined ? amount * rate : 0;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rates, fiatRates]
  );

  /**
   * Convert an amount from one currency to another.
   * Accepts token symbols (cUSD, USDT, CELO…), "USD", or "FIAT".
   * "FIAT" always refers to the user's local fiat currency (from geolocation).
   *
   * For stablecoins pegged to fiat (cKES, PUSO, cNGN, cGBP, etc.) live
   * fiatRates from CoinGecko are used - not the stale hardcoded PEGGED_RATES.
   */
  const convertPrice = useCallback(
    (amount: number, from: string, to: string): number => {
      if (from === to || !amount || isNaN(amount)) return amount || 0;

      // Step 1: normalise to USD
      let usdAmount: number;
      if (from === "USD") {
        usdAmount = amount;
      } else if (from === "FIAT") {
        const localRate = fiatRates[`USD_${userFiat}`] ?? 1;
        usdAmount = amount / localRate;
      } else {
        const bridgeRate = getFiatBridgeRate(from);
        if (bridgeRate !== undefined) {
          usdAmount = amount / bridgeRate; // e.g. 12900 cKES / 129 = $100
        } else {
          const rate = rates[from];
          usdAmount = rate !== undefined ? amount * rate : amount;
        }
      }

      // Step 2: USD → target currency
      if (to === "USD") return usdAmount;
      if (to === "FIAT") {
        const localRate = fiatRates[`USD_${userFiat}`] ?? 1;
        return usdAmount * localRate;
      }

      const bridgeRate = getFiatBridgeRate(to);
      if (bridgeRate !== undefined) {
        return usdAmount * bridgeRate; // e.g. $100 * 129 = 12,900 cKES
      }

      const toRate = rates[to];
      return toRate !== undefined && toRate > 0 ? usdAmount / toRate : usdAmount;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rates, fiatRates, userFiat]
  );

  /**
   * Format a price amount with its currency symbol.
   * Displayed prices are money, so always show exactly 2 decimals for a
   * consistent, professional look across fiat, stablecoins and other tokens.
   * (Transaction-precision amounts - wallet balances, gas - are formatted
   * separately with more decimals; this is for display prices only.)
   */
  const formatPrice = useCallback(
    (amount: number, currency: string): string => {
      if (isNaN(amount)) return "-";

      if (currency === "G$") {
        return `G$${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      if (currency === "FIAT") {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: userFiat,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
        } catch {
          return `${amount.toFixed(2)} ${userFiat}`;
        }
      }

      const fiatCode = TOKEN_FIAT_MAP[currency];
      if (fiatCode) {
        try {
          return new Intl.NumberFormat(navigator.language, {
            style: "currency",
            currency: fiatCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
        } catch {
          return `${amount.toFixed(2)} ${currency}`;
        }
      }

      // CELO or unknown tokens - show raw amount + symbol
      return `${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`;
    },
    [userFiat]
  );

  /**
   * Best secondary fiat currency for a given token.
   * Avoids showing the same denomination twice:
   * e.g. cUSD ("USD") + user fiat "USD" → returns "EUR" instead.
   */
  const getSecondaryFiat = useCallback(
    (tokenSymbol: string): string => {
      const tokenFiat = TOKEN_FIAT_MAP[tokenSymbol];
      if (tokenFiat === userFiat) return "USD";
      if (tokenFiat === "USD" && userFiat === "USD") return "EUR";
      return userFiat;
    },
    [userFiat]
  );

  return {
    toUSD,
    convertPrice,
    formatPrice,
    getSecondaryFiat,
    rates,
    userFiat,
    isFetching,
    updatedAt: dataUpdatedAt,
    refreshRates,
  };
}
