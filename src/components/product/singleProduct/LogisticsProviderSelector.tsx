import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FaTruck, FaCheck, FaStar, FaSearch } from "react-icons/fa";
import { HiExclamationTriangle } from "react-icons/hi2";
import { useGetLogisticsQuotesQuery } from "../../../store/api";
import type {
  AvailableProvider,
  DeliveryAddress,
  Product,
  ProviderQuote,
} from "../../../utils/types";
import { LEGACY_ORIGIN, DEFAULT_WEIGHT_PER_UNIT } from "../../../config/logistics";
import { useCurrency } from "../../../context/CurrencyContext";
import LoadingSpinner from "../../common/LoadingSpinner";

interface Props {
  product: Product;
  deliveryAddress: DeliveryAddress;
  quantity: number;
  selectedProvider: AvailableProvider | null;
  onProviderSelect: (provider: AvailableProvider) => void;
  /** Fee currency. Food quotes are NGN; legacy quotes are USD. */
  currency?: string;
}

const SEARCH_THRESHOLD = 4; // only show the search box beyond this many providers

const daysLabel = (min?: number, max?: number): string | undefined => {
  if (min == null && max == null) return undefined;
  if (min != null && max != null)
    return min === max ? `${min} day${min === 1 ? "" : "s"}` : `${min}-${max} days`;
  const d = (min ?? max) as number;
  return `${d} day${d === 1 ? "" : "s"}`;
};

// Map a quote onto the AvailableProvider shape the purchase flow consumes
// (it reads _id + quoteId to place the order).
const toProvider = (q: ProviderQuote): AvailableProvider => ({
  _id: q.providerId,
  name: q.provider.name,
  walletAddress: q.provider.walletAddress,
  rating: q.provider.rating ?? 0,
  cost: q.deliveryFee,
  estimatedDays: daysLabel(q.estimatedDaysMin, q.estimatedDaysMax),
  quoteId: q.quoteId,
});

const LogisticsProviderSelector: React.FC<Props> = ({
  product,
  deliveryAddress,
  quantity,
  selectedProvider,
  onProviderSelect,
  currency,
}) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  // Delivery fees come from the quote endpoint in USD, so format them exactly
  // like the product price (selected token or local fiat).
  const { formatDisplayPrice } = useCurrency();

  // Origin + weight (fall back to legacy defaults for older products).
  const fromState = product.state || LEGACY_ORIGIN.state;
  const fromLga = product.lga || LEGACY_ORIGIN.lga;
  const weight = (product.weight || DEFAULT_WEIGHT_PER_UNIT) * Math.max(1, quantity);

  const hasAddressId = !!deliveryAddress._id;

  // One POST returns every provider that can deliver this route + weight, each
  // with its own quoteId + fee. Keyed by deliveryAddressId, so changing the
  // address re-fires the request (and the endpoint isn't cached - see the api).
  const {
    data: quotes = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetLogisticsQuotesQuery(
    {
      deliveryAddressId: deliveryAddress._id ?? "",
      fromState,
      fromLga,
      toState: deliveryAddress.state,
      toLga: deliveryAddress.lga,
      weight,
    },
    { skip: !hasAddressId, refetchOnMountOrArgChange: true }
  );

  // Alphabetical by provider name.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? quotes.filter((x) => x.provider.name.toLowerCase().includes(q))
      : quotes;
    return [...filtered].sort((a, b) => a.provider.name.localeCompare(b.provider.name));
  }, [quotes, search]);

  // Keep the selected provider's fee + quoteId in sync as fresh quotes arrive.
  useEffect(() => {
    if (!selectedProvider) return;
    const match = quotes.find((q) => q.providerId === selectedProvider._id);
    if (
      match &&
      (match.quoteId !== selectedProvider.quoteId ||
        match.deliveryFee !== selectedProvider.cost)
    ) {
      onProviderSelect(toProvider(match));
    }
  }, [quotes, selectedProvider, onProviderSelect]);

  const handleSelect = useCallback(
    (q: ProviderQuote) => {
      onProviderSelect(toProvider(q));
      setExpanded(false);
    },
    [onProviderSelect]
  );

  // Collapse to the chosen provider once picked, so a long list isn't always open.
  const collapsed =
    !!selectedProvider && !expanded && !isLoading && !isError && quotes.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaTruck className="text-brand" />
          Delivery Service
        </h3>
        {collapsed ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-brand hover:opacity-80 text-sm transition-colors"
          >
            Change
          </button>
        ) : !isLoading && !isError && quotes.length > 0 ? (
          <span className="text-xs text-gray-400">
            {quotes.length} option{quotes.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {collapsed && selectedProvider ? (
        <ProviderRow
          name={selectedProvider.name ?? ""}
          rating={selectedProvider.rating ?? 0}
          estimatedDays={selectedProvider.estimatedDays}
          costLabel={selectedProvider.cost != null ? formatDisplayPrice(selectedProvider.cost, currency) : undefined}
          selected
          onSelect={() => setExpanded(true)}
        />
      ) : (
        <>
          {/* Route + weight transparency */}
          <p className="text-xs text-gray-500">
            Pricing for <span className="text-gray-300">{weight}kg</span> to{" "}
            <span className="text-gray-300">
              {deliveryAddress.lga}, {deliveryAddress.state}
            </span>
          </p>

          {/* Search control */}
          {!isLoading && !isError && quotes.length > SEARCH_THRESHOLD && (
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search providers"
                className="w-full bg-[#1a1c20] text-white pl-9 pr-3 py-2 rounded-xl border border-[#3A3A3C] focus:border-red-500 focus:outline-none text-sm placeholder-gray-600 transition-colors"
              />
            </div>
          )}

          {/* Body */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-red-400">
                  <HiExclamationTriangle className="w-5 h-5" />
                  <span className="text-sm">Couldn't load delivery options</span>
                </div>
                <button
                  onClick={() => refetch()}
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : quotes.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2 text-yellow-400">
                <HiExclamationTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">No delivery service available</p>
                  <p className="text-xs mt-1">
                    We don't have a provider delivering to {deliveryAddress.lga},{" "}
                    {deliveryAddress.state} yet. Try another delivery address.
                  </p>
                </div>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-6">
              No providers match "{search}".
            </p>
          ) : (
            <div
              className={`space-y-2 max-h-[20rem] overflow-y-auto pr-0.5 ${
                isFetching ? "opacity-60" : ""
              }`}
            >
              {visible.map((q) => (
                <ProviderRow
                  key={q.quoteId || q.providerId}
                  name={q.provider.name}
                  rating={q.provider.rating}
                  estimatedDays={daysLabel(q.estimatedDaysMin, q.estimatedDaysMax)}
                  costLabel={q.deliveryFee != null ? formatDisplayPrice(q.deliveryFee, currency) : undefined}
                  selected={selectedProvider?._id === q.providerId}
                  onSelect={() => handleSelect(q)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Provider row: a single quoted delivery option ──
interface RowProps {
  name: string;
  rating: number;
  estimatedDays?: string;
  /** Fee already formatted in the user's display currency, or undefined. */
  costLabel?: string;
  selected: boolean;
  onSelect: () => void;
}

const ProviderRow: React.FC<RowProps> = ({
  name,
  rating,
  estimatedDays,
  costLabel,
  selected,
  onSelect,
}) => (
  <motion.button
    type="button"
    onClick={onSelect}
    whileTap={{ scale: 0.98 }}
    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
      selected
        ? "border-brand bg-brand/10"
        : "border-transparent bg-[#292B30] hover:border-gray-600"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="font-semibold text-white text-sm">{name}</span>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          {estimatedDays && <span className="text-gray-300">{estimatedDays}</span>}
          <span className="flex items-center gap-1">
            <FaStar className="w-2.5 h-2.5 text-yellow-500" />
            {rating ? rating.toFixed(1) : "New"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          {costLabel ? (
            <div className="text-brand font-semibold text-sm">{costLabel}</div>
          ) : (
            <div className="text-gray-500 text-xs">Price n/a</div>
          )}
        </div>
        {selected && <FaCheck className="text-brand w-4 h-4" />}
      </div>
    </div>
  </motion.button>
);

export default LogisticsProviderSelector;
