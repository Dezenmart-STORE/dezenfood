import React, { useMemo } from "react";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Product } from "../../utils/types";
import {
  useCheckWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from "../../store/api";
import { BRAND } from "../../config/brand";
import { formatPrep, isOrderableNow } from "../../utils/food";
import { useCurrency } from "../../context/CurrencyContext";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useSnackbar } from "../../context/SnackbarContext";

interface ProductCardProps {
  product: Product;
  isNew?: boolean;
  hideFavorite?: boolean;
}

const isPngImage = (url: string): boolean => {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return (
    urlLower.endsWith(".png") ||
    urlLower.includes(".png?") ||
    urlLower.includes(".png#")
  );
};

const ProductCard = React.memo(
  ({ product, isNew = false, hideFavorite = false }: ProductCardProps) => {
    const { isAuthenticated } = useAuth();
    const { showSnackbar } = useSnackbar();
    const { _id, name, description, images, isSponsored, price, currency } = product;
    const { formatDisplayPrice } = useCurrency();

    const { data: watchlistData } = useCheckWatchlistQuery(_id, {
      skip: !isAuthenticated,
    });
    const [addToWatchlist] = useAddToWatchlistMutation();
    const [removeFromWatchlist] = useRemoveFromWatchlistMutation();

    const isFavorite = watchlistData?.isWatchlist || false;

    const displayPrice = useMemo(
      () => formatDisplayPrice(price, currency),
      [price, currency, formatDisplayPrice]
    );

    const prep = formatPrep(product.prepTimeMinutes);
    const orderable = useMemo(
      () => isOrderableNow({ availableDays: product.availableDays, orderCutoff: product.orderCutoff }),
      [product.availableDays, product.orderCutoff]
    );

    const imageUrl =
      images && images.length > 0
        ? images[0]
        : "https://placehold.co/300x300?text=No+Image";

    const handleToggleFavorite = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isAuthenticated) {
        showSnackbar("Please log in to save products to your wishlist", "info");
        return;
      }

      if (isFavorite) {
        await removeFromWatchlist(_id);
      } else {
        await addToWatchlist(_id);
      }
    };

    return (
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="h-full"
      >
        <Link
          to={`/product/${_id}`}
          className="bg-[#292B30] rounded-lg relative flex flex-col overflow-hidden h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          {/* New tag + favorite button */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-between p-2 sm:p-3">
            {isNew && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full p-1.5 sm:p-2 bg-red-500/80 text-white text-xs font-bold"
              >
                New
              </motion.div>
            )}
            {!hideFavorite && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="ml-auto bg-[#1A1B1F]/50 rounded-full p-1.5 sm:p-2 backdrop-blur-md"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                onClick={handleToggleFavorite}
              >
                {isFavorite ? (
                  <FaHeart className="text-base sm:text-xl text-Red" />
                ) : (
                  <FaRegHeart className="text-base sm:text-xl text-white" />
                )}
              </motion.button>
            )}
          </div>

          {/* Image */}
          <div
            className={`w-full pt-[100%] relative overflow-hidden ${
              isPngImage(imageUrl) ? "bg-white" : "bg-[#1A1B1F]/30"
            }`}
          >
            <motion.div
              className={`absolute inset-0 flex items-center justify-center`} //${isPngImage(imageUrl) ? "p-3" : ""}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img
                src={imageUrl}
                alt={`${name} - ${product.category || "Food"} | ${BRAND.name}`}
                className="max-w-full max-h-full object-contain"
                width="300"
                height="300"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </div>

          {/* Info */}
          <div className="flex flex-col w-full p-3 sm:p-4 flex-grow">
            {isSponsored && (
              <div className="mb-1">
                <span className="text-Green text-xs font-medium bg-Green/10 px-2 py-0.5 rounded-md border border-Green/20">
                  Sponsored
                </span>
              </div>
            )}

            <h4 className="text-white text-sm sm:text-base md:text-lg font-bold truncate">
              {name}
            </h4>
            <p className="text-white/80 text-xs md:text-sm py-0.5 sm:py-1 line-clamp-1">
              {description}
            </p>

            {(prep || product.dietaryTags?.length || !orderable) && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {prep && (
                  <span className="text-[10px] text-gray-300 bg-[#3A3C41] px-1.5 py-0.5 rounded">
                    ⏱ {prep}
                  </span>
                )}
                {product.dietaryTags?.slice(0, 2).map((t) => (
                  <span key={t} className="text-[10px] text-green-300 bg-green-500/10 px-1.5 py-0.5 rounded">
                    {t}
                  </span>
                ))}
                {!orderable && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Closed for today
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto pt-1 sm:pt-2">
              <span className="text-white text-base md:text-lg font-bold">
                {displayPrice}
              </span>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
