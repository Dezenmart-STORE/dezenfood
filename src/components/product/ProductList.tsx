import { useEffect, useRef, useState, useMemo, useCallback, useTransition } from "react";
import { twMerge } from "tailwind-merge";
import ProductCard from "./ProductCard";
import Title from "../common/Title";
import { Link } from "react-router-dom";
import {
  useGetProductsQuery,
  useGetSponsoredProductsQuery,
  useGetProductsByCategoryQuery,
  useGetProductsBySellerQuery,
} from "../../store/api";
import { Product } from "../../utils/types";
import LoadingSpinner from "../common/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";
import EmptyState from "../account/overview/EmptyState";

interface Props {
  title: string;
  path?: string;
  className?: string;
  isCategoryView: boolean;
  isUserProducts?: boolean;
  category?: string;
  isFeatured?: boolean;
  maxItems?: number;
  showViewAll?: boolean;
  subtitle?: string;
  sortBy?: "createdAt" | "updatedAt" | "price" | "stock";
  sortOrder?: "asc" | "desc";
  filterBy?: "new" | "topSellers" | "inStock" | "priceRange";
  maxPrice?: number;
  minPrice?: number;
  layout?: "default" | "compact" | "horizontal-scroll";
  showSellerBadge?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

const ITEMS_PER_PAGE = 20;

const ProductList = ({
  title,
  path,
  className,
  isCategoryView,
  category,
  isFeatured = false,
  maxItems,
  showViewAll = true,
  isUserProducts = false,
  subtitle,
  sortBy,
  sortOrder = "desc",
  filterBy,
  maxPrice,
  minPrice,
  layout = "default",
  showSellerBadge = false,
  icon: Icon,
  iconColor = "text-Red",
}: Props) => {
  const { user } = useAuth();

  // Determine which query to use based on props
  const shouldFetchAll =
    !isFeatured && !isUserProducts && (!category || category === "All");
  const shouldFetchCategory = !!category && category !== "All";
  const shouldFetchSponsored = isFeatured || !!category || isUserProducts;
  const shouldFetchUser = isUserProducts && !!user?._id;

  // RTK Query hooks - conditional fetching
  const {
    data: allProducts = [],
    isLoading: loadingAll,
  } = useGetProductsQuery(undefined, {
    skip: !shouldFetchAll,
  });

  const {
    data: sponsoredProducts = [],
    isLoading: loadingSponsored,
  } = useGetSponsoredProductsQuery(undefined, {
    skip: !shouldFetchSponsored,
  });

  const {
    data: categoryProducts = [],
    isLoading: loadingCategory,
  } = useGetProductsByCategoryQuery(category!, {
    skip: !shouldFetchCategory,
  });

  const {
    data: userProducts = [],
    isLoading: loadingUser,
  } = useGetProductsBySellerQuery(user?._id!, {
    skip: !shouldFetchUser,
  });

  // State for pagination
  const [displayedCount, setDisplayedCount] = useState(maxItems || ITEMS_PER_PAGE);

  const [isLoadingMore, startLoadMore] = useTransition();

  // Sentinel ref - always rendered so the observer is always attached
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Mirror reactive values into refs so the observer callback (set up once)
  // always reads the latest values without needing to reconnect.
  const stateRef = useRef({ hasMore: false, isLoading: false, totalProducts: 0 });
  const isLoadingMoreRef = useRef(false);
  isLoadingMoreRef.current = isLoadingMore;

  // Helper function to check if product belongs to current user
  const isUserProduct = (product: Product): boolean => {
    if (!user || !product) return false;
    if (typeof product.seller === "object" && product.seller) {
      return product.seller._id === user._id;
    }
    return product.seller === user._id;
  };

  // Compute final product lists
  const { regularProducts, sponsoredList } = useMemo(() => {
    let sponsored: Product[] = [];
    let regular: Product[] = [];

    if (isFeatured) {
      // Featured view: only show sponsored products
      regular = sponsoredProducts || [];
      // Filter out user's own products if not in user products view
      if (!isUserProducts && user) {
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (category === "All") {
      // All products view
      sponsored = sponsoredProducts || [];
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (allProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from public view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (category && category !== "All") {
      // Specific category view
      sponsored = (sponsoredProducts || []).filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (categoryProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from public category view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    } else if (isUserProducts) {
      // User products view - ONLY show user's own products
      sponsored = (sponsoredProducts || []).filter((product) => {
        if (!product || !user) return false;
        if (typeof product.seller === "object" && product.seller) {
          return product.seller._id === user._id;
        }
        return product.seller === user._id;
      });
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (userProducts || []).filter((p) => !sponsoredIds.has(p._id));
    } else {
      // Default: all products
      sponsored = sponsoredProducts || [];
      const sponsoredIds = new Set(sponsored.map((p) => p._id));
      regular = (allProducts || []).filter((p) => !sponsoredIds.has(p._id));

      // Filter out user's own products from default view
      if (!isUserProducts && user) {
        sponsored = sponsored.filter((p) => !isUserProduct(p));
        regular = regular.filter((p) => !isUserProduct(p));
      }
    }

    return {
      regularProducts: regular,
      sponsoredList: sponsored,
    };
  }, [
    allProducts,
    sponsoredProducts,
    categoryProducts,
    userProducts,
    category,
    isFeatured,
    isUserProducts,
    user,
  ]);

  // Helper to check if product is new
  const isNewProduct = useCallback((createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - createdDate.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays < 7;
  }, []);

  // Client-side sorting function
  const sortProducts = useCallback(
    (products: Product[]) => {
      if (!sortBy) return products;

      return [...products].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "createdAt":
            comparison =
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            break;
          case "updatedAt":
            comparison =
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            break;
          case "price":
            comparison = a.price - b.price;
            break;
          case "stock":
            comparison = Number(b.stock) - Number(a.stock);
            break;
        }

        return sortOrder === "asc" ? -comparison : comparison;
      });
    },
    [sortBy, sortOrder]
  );

  // Client-side filtering function
  const filterProducts = useCallback(
    (products: Product[]) => {
      let filtered = products;

      // Apply filterBy
      if (filterBy) {
        switch (filterBy) {
          case "new":
            // Products created in last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter((p) => new Date(p.createdAt) > weekAgo);
            break;

          case "topSellers":
            // Products from sellers with rating >= 4.5
            filtered = filtered.filter((p) => {
              if (typeof p.seller === "object" && p.seller) {
                return p.seller.rating >= 4.5;
              }
              return false;
            });
            break;

          case "inStock":
            // Products with stock > 0
            filtered = filtered.filter((p) => Number(p.stock) > 0);
            break;

          case "priceRange":
            // Price range filtering
            filtered = filtered.filter((p) => {
              const meetsMin = minPrice ? p.price >= minPrice : true;
              const meetsMax = maxPrice ? p.price <= maxPrice : true;
              return meetsMin && meetsMax;
            });
            break;
        }
      }

      // Apply price range even without filterBy
      if (!filterBy && (minPrice || maxPrice)) {
        filtered = filtered.filter((p) => {
          const meetsMin = minPrice ? p.price >= minPrice : true;
          const meetsMax = maxPrice ? p.price <= maxPrice : true;
          return meetsMin && meetsMax;
        });
      }

      return filtered;
    },
    [filterBy, minPrice, maxPrice]
  );

  // Apply sorting and filtering to products
  const processedProducts = useMemo(() => {
    let processed = regularProducts;
    processed = filterProducts(processed);
    processed = sortProducts(processed);
    return processed;
  }, [regularProducts, filterProducts, sortProducts]);

  // Loading states
  const isInitialLoading = loadingAll || loadingSponsored || loadingCategory || loadingUser;
  const totalProducts = processedProducts.length;
  const hasMore = displayedCount < totalProducts;

  // Keep the ref mirror in sync every render (synchronous assignment - safe for refs)
  stateRef.current = { hasMore, isLoading: isInitialLoading, totalProducts };

  // Reset displayed count when the view changes
  useEffect(() => {
    setDisplayedCount(maxItems || ITEMS_PER_PAGE);
  }, [category, isFeatured, isUserProducts, maxItems]);

  // Wire up the IntersectionObserver once.
  // The sentinel div is always rendered so this effect never needs to re-run.
  // All dynamic values are read through stateRef / isLoadingMoreRef, which stay
  // current on every render without recreating the observer.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { hasMore, isLoading, totalProducts } = stateRef.current;
        if (!entry.isIntersecting || !hasMore || isLoading || isLoadingMoreRef.current) return;

        startLoadMore(() => {
          setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, totalProducts));
        });
      },
      { rootMargin: "600px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get products to display
  const productsToDisplay = processedProducts.slice(0, displayedCount);

  // Early return if no products and not in category view
  if (
    !isCategoryView &&
    !isInitialLoading &&
    productsToDisplay.length === 0 &&
    sponsoredList.length === 0
  ) {
    return null;
  }

  const newClass = twMerge("", className);
  const totalDisplayed = productsToDisplay.length + sponsoredList.length;

  return (
    <section className={newClass}>
      {/* Header */}
      {!isCategoryView && (
        <div className="flex items-center justify-between px-4 md:px-0 mb-2">
          <div>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={`${iconColor} transition-transform hover:scale-110`}>
                  <Icon className="w-6 h-6 md:w-8 md:h-8 drop-shadow-[0_0_8px_currentColor]" />
                </div>
              )}
              <Title text={title} className="text-white text-lg md:text-2xl mb-0" />
            </div>
            {subtitle && (
              <p className="text-gray-400 text-xs md:text-sm mt-1">{subtitle}</p>
            )}
          </div>
          {path && showViewAll && (
            <Link
              to={path}
              className="text-sm md:text-base text-white hover:text-Red transition-colors"
            >
              View all
            </Link>
          )}
        </div>
      )}

      <div className="mt-4 md:mt-8">
        {/* Loading state */}
        {isInitialLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : totalDisplayed === 0 ? (
          isUserProducts ? (
            <EmptyState
              message="You haven't created any products yet."
              buttonText="Create Product"
              buttonPath="/account?tab=5&action=create"
            />
          ) : (
            <div className="text-gray-400 text-center py-8">
              No products found{category && category !== "All" ? ` in ${category}` : ""}.
            </div>
          )
        ) : (
          <>
            {/* Sponsored products section */}
            {(isCategoryView || isUserProducts) && sponsoredList.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-Green text-sm bg-Green/10 px-2 py-1 rounded border border-Green/20">
                    Sponsored
                  </span>
                  {!isUserProducts && category && category !== "All" && `Featured in ${category}`}
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                  {sponsoredList.map((product) => (
                    <ProductCard
                      key={`sponsored-${product._id}`}
                      product={product}
                      isNew={isNewProduct(product.createdAt)}
                      hideFavorite={isUserProducts}
                    />
                  ))}
                </div>

                {/* Divider */}
                {productsToDisplay.length > 0 && (
                  <>
                    <div className="border-t border-gray-700 my-8"></div>
                    <h3 className="text-white text-lg font-semibold mb-4">
                      {category && category !== "All" ? `All ${category} Products` : "All Products"}
                    </h3>
                  </>
                )}
              </div>
            )}

            {/* Main products grid */}
            {productsToDisplay.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5">
                {productsToDisplay.map((product, index) => (
                  <ProductCard
                    key={`${product._id}-${index}`}
                    product={product}
                    isNew={isNewProduct(product.createdAt)}
                    hideFavorite={isUserProducts}
                  />
                ))}
              </div>
            )}

            {/* Skeleton cards while next batch is rendering */}
            {isLoadingMore && hasMore && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 mt-3">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div key={i} className="bg-[#292B30] rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-[#1a1c20]" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-[#1a1c20] rounded w-3/4" />
                      <div className="h-3 bg-[#1a1c20] rounded w-1/2" />
                      <div className="h-5 bg-[#1a1c20] rounded w-1/3 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* End of results */}
            {!hasMore && totalDisplayed > ITEMS_PER_PAGE && (
              <div className="text-center py-8 text-gray-400">
                <div className="inline-flex items-center gap-2">
                  <div className="h-px bg-gray-600 w-8" />
                  <span className="text-sm">
                    You've seen all {totalDisplayed} product{totalDisplayed !== 1 ? "s" : ""}
                  </span>
                  <div className="h-px bg-gray-600 w-8" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/*
        Sentinel lives outside the conditional so it is in the DOM from the very
        first render - even while products are still loading. This guarantees the
        IntersectionObserver (set up once in useEffect([])) always has a real node
        to observe and will fire as soon as the user scrolls near the bottom.
      */}
      <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
    </section>
  );
};

export default ProductList;
