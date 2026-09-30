import { BRAND } from "../config/brand";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import { IoChevronBackOutline, IoSearch, IoClose } from "react-icons/io5";
import ProductList from "../components/product/ProductList";
import {
  useSearchProductsQuery,
  useGetProductsByCategoryQuery,
} from "../store/api/productsApi";
import { debounce } from "../utils/helpers";
import ProductCard from "../components/product/ProductCard";
import { useSEO } from "../hooks/useSEO";
import {
  PAGE_SEO,
  SEO_CONFIG,
  generateBreadcrumbSchema,
} from "../utils/seo/seoConfig";
import {
  CATEGORIES,
  CATEGORY_NAMES,
  getCategoryByName,
  categoryHref,
  type CategoryDef,
} from "../utils/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "newest" | "price-asc" | "price-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
];

const sortConfig: Record<
  SortKey,
  {
    sortBy: "createdAt" | "price";
    sortOrder: "asc" | "desc";
  }
> = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  "price-asc": { sortBy: "price", sortOrder: "asc" },
  "price-desc": { sortBy: "price", sortOrder: "desc" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isRecentProduct = (createdAt: string) =>
  (Date.now() - new Date(createdAt).getTime()) / 86_400_000 < 7;

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProductSkeletonGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 md:gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-[#292B30] rounded-lg overflow-hidden animate-pulse">
        <div className="aspect-square bg-[#1a1c20]" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-[#1a1c20] rounded w-3/4" />
          <div className="h-3 bg-[#1a1c20] rounded w-1/2" />
          <div className="h-4 bg-[#1a1c20] rounded w-1/3 mt-1" />
        </div>
      </div>
    ))}
  </div>
);

/** Colored hero banner shown at the top of a category page */
const CategoryHero = ({
  catDef,
  count,
  onBack,
}: {
  catDef: CategoryDef;
  count: number;
  onBack: () => void;
}) => {
  const { Icon, name, bg, color, hex } = catDef;
  return (
    <div
      className="relative rounded-2xl overflow-hidden px-5 py-6 mb-6"
      style={{
        background: `linear-gradient(135deg, ${hex}25 0%, ${hex}08 60%, transparent 100%)`,
        borderColor: `${hex}25`,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <button
        onClick={onBack}
        aria-label="Go back"
        className="flex items-center gap-1.5 text-[#AEAEB2] hover:text-white transition-colors text-sm mb-4"
      >
        <IoChevronBackOutline className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
        <div>
          <h1 className="text-white text-2xl font-bold leading-tight">{name}</h1>
          {count > 0 && (
            <p className="text-[#AEAEB2] text-sm mt-0.5">{count} products</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Horizontal sort pill bar */
const SortBar = ({
  active,
  onChange,
}: {
  active: SortKey;
  onChange: (k: SortKey) => void;
}) => (
  <div className="flex items-center gap-2 mt-4 mb-2">
    <span className="text-[#AEAEB2] text-xs flex-shrink-0">Sort:</span>
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {SORT_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            active === key
              ? "bg-Red text-white"
              : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

/** Category pill strip with icons and right-side fade hint */
const CategoryPills = ({ active }: { active: string }) => (
  <div className="relative mt-6">
    {/* Right-side fade hint - signals more items to scroll to */}
    <div className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-Dark to-transparent pointer-events-none z-10" />

    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 py-1 pr-10">
        {/* "All" pill */}
        <Link
          to="/product"
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === "All"
              ? "bg-Red text-white"
              : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
          }`}
        >
          All
        </Link>

        {CATEGORIES.map((cat) => {
          const isActive = active === cat.name;
          const { Icon } = cat;
          return (
            <Link
              key={cat.name}
              to={categoryHref(cat.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-Red text-white"
                  : "bg-[#292B30] text-[#AEAEB2] hover:bg-[#343539]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : cat.color}`} />
              {cat.name}
            </Link>
          );
        })}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Product = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const navigate = useNavigate();
  const { categoryName: categoryParam } = useParams();

  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");
  const isAllCategory = activeCategory === "All";

  // Resolve category name from URL param
  useEffect(() => {
    if (categoryParam) {
      const decoded = decodeURIComponent(categoryParam);
      const matched = CATEGORY_NAMES.find(
        (c) => c.toLowerCase() === decoded.toLowerCase()
      );
      setActiveCategory(matched || decoded);
    } else {
      setActiveCategory("All");
    }
  }, [categoryParam]);

  // Category definition (icon, colors, hex) - null for "All"
  const catDef = useMemo(
    () => (isAllCategory ? null : getCategoryByName(activeCategory)),
    [isAllCategory, activeCategory]
  );

  // Fetch category products to show count in the hero - shares RTK cache with ProductList
  const { data: categoryProducts = [] } = useGetProductsByCategoryQuery(
    activeCategory,
    { skip: isAllCategory }
  );

  // SEO
  const seoConfig = useMemo(() => {
    if (searchQuery.trim()) {
      return {
        title: `Search: "${searchQuery}" | ${BRAND.name}`,
        description: `Find products matching "${searchQuery}" on ${BRAND.name}. Every order is escrow protected.`,
        keywords: [
          ...(PAGE_SEO.products.keywords || []),
          searchQuery,
          `buy ${searchQuery}`,
        ],
        noindex: true,
      };
    }

    if (isAllCategory) {
      return {
        title: PAGE_SEO.products.title,
        description: PAGE_SEO.products.description,
        keywords: PAGE_SEO.products.keywords,
        structuredData: [
          generateBreadcrumbSchema([
            { name: "Home", url: SEO_CONFIG.siteUrl },
            { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
          ]),
        ],
      };
    }

    return {
      title: `${activeCategory} - Order Online | ${BRAND.name}`,
      description: `Order ${activeCategory.toLowerCase()} from trusted vendors on ${BRAND.name}. Pay by card, bank transfer or crypto - escrow protection on every order.`,
      keywords: [
        activeCategory.toLowerCase(),
        `buy ${activeCategory.toLowerCase()} with crypto`,
        `${activeCategory.toLowerCase()} cryptocurrency`,
        ...(PAGE_SEO.products.keywords || []),
      ],
      structuredData: [
        generateBreadcrumbSchema([
          { name: "Home", url: SEO_CONFIG.siteUrl },
          { name: "Products", url: `${SEO_CONFIG.siteUrl}/product` },
          {
            name: activeCategory,
            url: `${SEO_CONFIG.siteUrl}/product/category/${encodeURIComponent(
              activeCategory.toLowerCase()
            )}`,
          },
        ]),
      ],
    };
  }, [activeCategory, isAllCategory, searchQuery]);

  useSEO(seoConfig);

  const { data: searchResults = [], isLoading: isSearching } =
    useSearchProductsQuery(debouncedQuery, {
      skip: !debouncedQuery.trim(),
    });

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedQuery(query);
      }, 300),
    []
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const { sortBy, sortOrder } = sortConfig[sortKey];

  return (
    <div className="bg-Dark min-h-screen">
      <Container>
        {isAllCategory ? (
          <>
            <h2 className="text-white font-bold text-2xl mb-6">Browse Products</h2>

            {/* Search Bar */}
            <div className="flex items-center gap-3 bg-[#292B30] rounded-xl px-4 py-3">
              <IoSearch className="text-[#AEAEB2] text-xl flex-shrink-0" />
              <input
                type="text"
                placeholder="Search meals, snacks, vendors"
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm"
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="text-[#AEAEB2] hover:text-white transition-colors"
                >
                  <IoClose className="text-xl" />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchQuery ? (
              <div className="mt-8">
                <p className="text-white text-base font-semibold mb-4">
                  {isSearching
                    ? "Searching…"
                    : searchResults.length > 0
                    ? `${searchResults.length} results for "${searchQuery}"`
                    : `No results for "${searchQuery}"`}
                </p>

                {isSearching ? (
                  <ProductSkeletonGrid />
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5 md:gap-5">
                    {searchResults.map((product, index) => (
                      <ProductCard
                        key={`search-${product._id}-${index}`}
                        product={product}
                        isNew={isRecentProduct(product.createdAt)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[#AEAEB2] text-center py-12">
                    Try different keywords or browse a category below.
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Category pills */}
                <CategoryPills active={activeCategory} />

                {/* Sort bar */}
                <SortBar active={sortKey} onChange={setSortKey} />

                {/* Sponsored + All Products */}
                <div className="mt-6 bg-[#1a1c20]/50 rounded-xl p-4 md:p-6">
                  <ProductList
                    title="Sponsored"
                    isCategoryView={false}
                    isFeatured={true}
                    maxItems={3}
                    showViewAll={false}
                  />
                </div>

                <ProductList
                  title="All Products"
                  subtitle="Browse our complete collection"
                  className="mt-8"
                  isCategoryView={true}
                  category="All"
                  showViewAll={false}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* Category hero */}
            {catDef ? (
              <CategoryHero
                catDef={catDef}
                count={categoryProducts.length}
                onBack={handleGoBack}
              />
            ) : (
              // Fallback for unknown categories (e.g. custom URL)
              <div className="flex items-center gap-3 mb-6 mt-2">
                <button
                  className="text-[#AEAEB2] hover:text-white transition-colors p-1.5 rounded-full hover:bg-[#292B30]"
                  onClick={handleGoBack}
                  aria-label="Go back"
                >
                  <IoChevronBackOutline className="h-5 w-5" />
                </button>
                <h2 className="text-white font-bold text-2xl">{activeCategory}</h2>
              </div>
            )}

            {/* Category pills */}
            <CategoryPills active={activeCategory} />

            {/* Sort bar */}
            <SortBar active={sortKey} onChange={setSortKey} />

            {/* Products */}
            <ProductList
              title={activeCategory}
              subtitle={`Explore all ${activeCategory.toLowerCase()} products`}
              className="mt-6"
              isCategoryView={true}
              category={activeCategory}
              showViewAll={false}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </>
        )}
      </Container>
    </div>
  );
};

export default Product;
