import { useCurrency } from "../../context/CurrencyContext";

interface Props {
  className?: string;
}

function getFiatSymbol(code: string): string {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? code
    );
  } catch {
    return code;
  }
}

export default function CurrencyToggle({ className = "" }: Props) {
  const { displayMode, toggleDisplayMode, selectedToken, fiatCurrency, isFetching, updatedAt } =
    useCurrency();

  // const fiatSymbol  = getFiatSymbol(fiatCurrency);
  const activeLabel = displayMode === "token" ? selectedToken.symbol : fiatCurrency;
  const nextLabel   = displayMode === "token" ? fiatCurrency : selectedToken.symbol;

  const ageMs = Date.now() - updatedAt;
  const dotColor =
    isFetching           ? "bg-yellow-400 animate-pulse" :
    updatedAt === 0      ? "bg-gray-500"                 :
    ageMs < 3 * 60_000  ? "bg-green-400"                :
    ageMs < 10 * 60_000 ? "bg-yellow-400"               :
                          "bg-red-400";

  return (
    <button
      onClick={toggleDisplayMode}
      title={`Switch to ${nextLabel} prices`}
      aria-label={`Showing prices in ${activeLabel}. Click to switch to ${nextLabel}`}
      className={`flex items-center gap-1.5 rounded bg-[#373A3F] px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-[#42464d] focus:outline-none focus:ring-2 focus:ring-brand focus:ring-opacity-50 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      <span className="truncate max-w-[3.5rem]">{activeLabel}</span>
      <svg className="h-3 w-3 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </button>
  );
}
