import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WatchlistItem } from "../../../utils/types";
import { useCurrency } from "../../../context/CurrencyContext";

interface Props {
  item: WatchlistItem;
  index: number;
  onRemove: (productId: string) => Promise<boolean>;
  viewMode?: "list" | "grid";
}

const SavedItem: React.FC<Props> = React.memo(({ item, onRemove, viewMode = "list" }) => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const productImage = useMemo(
    () => item.product?.images?.[0] || "https://placehold.co/200x200?text=?",
    [item.product?.images]
  );

  const price = useMemo(
    () => formatAmount(item.product?.price ?? 0, "USDm"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.product?.price]
  );

  if (viewMode === "grid") {
    return (
      <div className="bg-[#292B30] rounded-xl overflow-hidden relative group">
        {/* Remove button - top-right corner overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(item.product._id); }}
          aria-label="Remove from saved"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-gray-300 hover:text-red-400 hover:bg-black/70 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={() => navigate(`/product/${item.product._id}`)}
          className="w-full text-left"
        >
          <img
            src={productImage}
            alt={item.product?.name ?? "Product"}
            loading="lazy"
            className="w-full aspect-square object-cover bg-[#1a1c20]"
          />
          <div className="p-2.5">
            <p className="font-semibold text-white text-xs truncate">
              {item.product?.name ?? "Unknown Product"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {item.product?.seller ?? "Unknown Seller"}
            </p>
            <p className="text-xs font-medium text-white mt-1">{price}</p>
          </div>
        </button>
      </div>
    );
  }

  // List view (default)
  return (
    <div className="bg-[#292B30] rounded-xl p-3 flex items-center gap-2 xxs:gap-3">
      <button
        onClick={() => navigate(`/product/${item.product._id}`)}
        className="flex items-center gap-2 xxs:gap-3 flex-1 min-w-0 text-left"
      >
        <img
          src={productImage}
          alt={item.product?.name ?? "Product"}
          loading="lazy"
          className="w-14 h-14 xxs:w-16 xxs:h-16 rounded-lg object-cover flex-shrink-0 bg-[#1a1c20]"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {item.product?.name ?? "Unknown Product"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {item.product?.seller ?? "Unknown Seller"}
          </p>
          <p className="text-sm font-medium text-white mt-1.5">{price}</p>
        </div>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.product._id); }}
        aria-label="Remove from saved"
        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

SavedItem.displayName = "SavedItem";
export default SavedItem;
