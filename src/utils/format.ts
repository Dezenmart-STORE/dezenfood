import { formatUnits } from "viem";

/**
 * Shorten a wallet address for display: 0x1234…5678
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a fiat currency value: $1,234.56
 */
export function formatFiat(
  amount: number | string,
  currency = "USD",
  locale = "en-US"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a raw bigint token amount to a human-readable string.
 * Example: formatTokenAmount(1000000n, 6) -> "1.00"
 */
export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  displayDecimals = 2
): string {
  const formatted = formatUnits(raw, decimals);
  const num = parseFloat(formatted);
  if (Number.isNaN(num)) return "0";

  // For very small amounts, show more precision
  if (num > 0 && num < 0.01) return `<0.01`;
  return num.toFixed(displayDecimals);
}

/**
 * Format a plain number as a currency display (no symbol).
 * Example: formatNumber(1234.5) -> "1,234.50"
 */
export function formatNumber(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Validate an Ethereum-style address.
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Copy text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/**
 * Calculate order amounts.
 * Uses integer arithmetic at 6 d.p. precision to avoid IEEE 754 drift.
 * Escrow fee is already baked into productPrice - not added here.
 */
export function calculateOrderTotal(
  productPrice: number,
  quantity: number,
  logisticsCost: number
) {
  const SCALE = 1_000_000;
  const subtotal = Math.round(productPrice * quantity * SCALE) / SCALE;
  const total = Math.round((subtotal + logisticsCost) * SCALE) / SCALE;
  return { subtotal, logisticsCost, total };
}
