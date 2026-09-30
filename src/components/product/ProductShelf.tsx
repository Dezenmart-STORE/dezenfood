/**
 * ProductShelf - a horizontally-scrollable product row (Amazon/Shopee-style shelf).
 *
 * All shelves on the same page share a single RTK Query cache entry for /products,
 * so no matter how many shelves are rendered, only one network request is made.
 */
import { useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import {
  useGetProductsQuery,
  useGetSponsoredProductsQuery,
} from "../../store/api";
import { useAuth } from "../../context/AuthContext";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Product } from "../../utils/types";

interface Props {
  title: string;
  subtitle?: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  // Data source
  category?: string;
  filterBy?: "new" | "topSellers" | "inStock";
  maxPrice?: number;
  sortBy?: "createdAt" | "price";
  sortOrder?: "asc" | "desc";
  maxItems?: number;
  isFeatured?: boolean; // use sponsored products endpoint
}

// How many px to jump per arrow click (≈ 3 cards)
const SCROLL_STEP = 576;

const isRecentProduct = (createdAt: string) =>
  (Date.now() - new Date(createdAt).getTime()) / 86_400_000 < 7;

const ShelfSkeleton = () => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="w-40 sm:w-44 md:w-48 flex-shrink-0 bg-[#292B30] rounded-lg overflow-hidden animate-pulse"
      >
        <div className="w-full aspect-square bg-[#1a1c20]" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-[#1a1c20] rounded w-3/4" />
          <div className="h-3 bg-[#1a1c20] rounded w-1/2" />
          <div className="h-4 bg-[#1a1c20] rounded w-1/3 mt-1" />
        </div>
      </div>
    ))}
  </div>
);

const ProductShelf = ({
  title,
  subtitle,
  path,
  icon: Icon,
  iconColor = "text-Red",
  category,
  filterBy,
  maxPrice,
  sortBy,
  sortOrder = "desc",
  maxItems = 20,
  isFeatured = false,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // All non-featured shelves share this single cached request
  const { data: allProducts = [], isLoading: loadingAll } = useGetProductsQuery(
    undefined,
    { skip: isFeatured }
  );
  const { data: sponsoredProducts = [], isLoading: loadingSponsored } =
    useGetSponsoredProductsQuery(undefined, { skip: !isFeatured });

  const isLoading = isFeatured ? loadingSponsored : loadingAll;

  const products = useMemo(() => {
    let raw: Product[] = isFeatured ? sponsoredProducts : allProducts;

    // Remove user's own listings
    if (user) {
      raw = raw.filter((p) =>
        typeof p.seller === "object" && p.seller
          ? p.seller._id !== user._id
          : p.seller !== user._id
      );
    }

    // Category filter
    if (category) {
      raw = raw.filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Preset filters
    if (filterBy === "new") {
      const cutoff = Date.now() - 7 * 86_400_000;
      raw = raw.filter((p) => new Date(p.createdAt).getTime() > cutoff);
    } else if (filterBy === "topSellers") {
      raw = raw.filter(
        (p) =>
          typeof p.seller === "object" && (p.seller?.rating ?? 0) >= 4.5
      );
    } else if (filterBy === "inStock") {
      raw = raw.filter((p) => Number(p.stock) > 0);
    }

    // Price ceiling
    if (maxPrice != null) {
      raw = raw.filter((p) => p.price <= maxPrice);
    }

    // Sort
    if (sortBy) {
      raw = [...raw].sort((a, b) => {
        const cmp =
          sortBy === "createdAt"
            ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            : a.price - b.price;
        return sortOrder === "asc" ? -cmp : cmp;
      });
    }

    return raw.slice(0, maxItems);
  }, [
    allProducts,
    sponsoredProducts,
    isFeatured,
    category,
    filterBy,
    maxPrice,
    sortBy,
    sortOrder,
    maxItems,
    user,
  ]);

  const scroll = useCallback((dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "right" ? SCROLL_STEP : -SCROLL_STEP,
      behavior: "smooth",
    });
  }, []);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="mt-8 md:mt-10">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 md:px-0 mb-3">
        <div>
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon
                className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 drop-shadow-[0_0_8px_currentColor] ${iconColor}`}
              />
            )}
            <Title
              text={title}
              className="text-white text-base md:text-xl mb-0"
            />
          </div>
          {subtitle && (
            <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
        {path && (
          <Link
            to={path}
            className="text-sm text-white hover:text-Red transition-colors whitespace-nowrap"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scroll area with nav arrows */}
      <div className="relative group">
        {/* Left arrow - desktop hover only */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-3 z-10 bg-[#292B30] border border-gray-700/50 rounded-full p-1.5 shadow-lg hover:bg-[#343539] transition-all opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
          aria-label="Scroll left"
        >
          <IoChevronBackOutline className="text-white w-4 h-4" />
        </button>

        {isLoading ? (
          <ShelfSkeleton />
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
          >
            {products.map((product, idx) => (
              <div
                key={`${product._id}-${idx}`}
                className="w-40 sm:w-44 md:w-48 flex-shrink-0"
              >
                <ProductCard
                  product={product}
                  isNew={isRecentProduct(product.createdAt)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Right arrow - desktop hover only */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-3 z-10 bg-[#292B30] border border-gray-700/50 rounded-full p-1.5 shadow-lg hover:bg-[#343539] transition-all opacity-0 group-hover:opacity-100 hidden md:flex items-center justify-center"
          aria-label="Scroll right"
        >
          <IoChevronForwardOutline className="text-white w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default ProductShelf;
