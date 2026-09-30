import { BRAND } from "../config/brand";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GoVerified, GoUnverified } from "react-icons/go";
import { MdOutlineRestaurantMenu, MdOutlineDeliveryDining } from "react-icons/md";
import Container from "../components/common/Container";
import ProductList from "../components/product/ProductList";
import ProductShelf from "../components/product/ProductShelf";
import BannerCarousel from "../components/common/BannerCarousel";
import FeaturedHero from "../components/product/FeaturedHero";
import CategoryPreview from "../components/common/CategoryPreview";
import { SectionIcons } from "../components/common/SectionIcons";
import { CATEGORIES } from "../utils/categories";
import { useAuth } from "../context/AuthContext";
import WalletQuickAction from "../components/wallet/WalletQuickAction";
import { FEATURES } from "../config/brand";
import { formatNaira } from "../utils/food";
import { useGetSponsoredProductsQuery } from "../store/api";
import { useSEO } from "../hooks/useSEO";
import {
  PAGE_SEO,
  generateWebSiteSchema,
  generateOrganizationSchema,
} from "../utils/seo/seoConfig";

// ─── Banners ─────────────────────────────────────────────────────────────────

const BANNERS = [
  {
    title: "Hungry? Order from",
    subtitle: "trusted local vendors",
    emoji: "🍲",
    backgroundColor: "#f97316",
    textColor: "white",
    isUppercase: false,
    ctaText: "Order now",
    ctaPath: "/product",
  },
  {
    title: "Your money is held in",
    subtitle: "escrow until your food arrives",
    emoji: "🛡️",
    backgroundColor: "#1e3a5f",
    textColor: "white",
    isUppercase: false,
    ctaText: "See how it works",
    ctaPath: "/community",
  },
  {
    title: "Cook or sell food?",
    subtitle: "Start selling on DezenFoods",
    emoji: "👩‍🍳",
    backgroundColor: "#166534",
    textColor: "white",
    isUppercase: false,
    ctaText: "Become a vendor",
    ctaPath: "/vendor/apply",
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTimeGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// Skeleton matching FeaturedHero grid layout
const FeaturedSkeleton = () => (
  <div className="mt-10">
    <div className="text-center mb-8">
      <div className="h-8 bg-[#292B30] rounded w-48 mx-auto animate-pulse" />
      <div className="h-4 bg-[#292B30] rounded w-64 mx-auto mt-2 animate-pulse" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#1a1c20] rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-square bg-[#292B30]" />
          <div className="p-4 space-y-2">
            <div className="h-5 bg-[#292B30] rounded w-3/4" />
            <div className="h-3 bg-[#292B30] rounded w-1/2" />
            <div className="h-8 bg-[#292B30] rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────

const Home = () => {
  const { user, isAuthenticated } = useAuth();

  const { data: sponsoredProducts = [], isLoading: sponsoredLoading } =
    useGetSponsoredProductsQuery();

  useSEO({
    title: PAGE_SEO.home.title,
    description: PAGE_SEO.home.description,
    keywords: PAGE_SEO.home.keywords,
    type: "website",
    structuredData: [generateOrganizationSchema(), generateWebSiteSchema()],
  });

  // First name only - keeps the greeting casual
  const firstName = useMemo(() => {
    if (!isAuthenticated || typeof user?.name !== "string") return null;
    return user.name.trim().split(" ")[0] || null;
  }, [isAuthenticated, user?.name]);

  // "Budget picks": food is priced in NGN, so the threshold is a plain Naira amount.
  const valuePriceThreshold = 3000;
  const valuePriceTitle = `Under ${formatNaira(valuePriceThreshold)}`;

  const greeting = `${getTimeGreeting()}${firstName ? `, ${firstName}` : ""}`;

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="py-6 md:py-10">

        {/* ── Greeting ─────────────────────────────────────── */}
        <div className="mb-4">
          <h4 className="text-xl text-white font-medium flex items-center gap-2">
            {greeting}
            {isAuthenticated && (
              user?.selfVerification?.isVerified ? (
                <GoVerified
                  className="text-green-500 text-xl flex-shrink-0"
                  title="Account Verified"
                />
              ) : (
                <GoUnverified
                  className="text-yellow-500 text-xl flex-shrink-0"
                  title="Account not verified - verify on your account page"
                />
              )
            )}
          </h4>
          <p className="text-[#C6C6C8] text-sm mt-0.5">
            What are you craving today?
          </p>
        </div>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <div className="flex justify-evenly md:justify-start mt-6 gap-4 md:gap-10">
          <Link
            to="/product"
            className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 active:scale-95"
          >
            <span className="bg-[#292B30] rounded-full p-4 md:p-6 flex items-center justify-center transition-colors group-hover:bg-[#33363b]">
              <MdOutlineRestaurantMenu aria-hidden="true" className="w-5 h-5 md:w-6 md:h-6 text-brand" />
            </span>
            <span className="text-[#AEAEB2] text-sm md:text-base group-hover:text-white transition-colors">
              Browse Food
            </span>
          </Link>

          <Link
            to="/account?tab=3"
            className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 active:scale-95"
          >
            <span className="bg-[#292B30] rounded-full p-4 md:p-6 flex items-center justify-center transition-colors group-hover:bg-[#33363b]">
              <MdOutlineDeliveryDining aria-hidden="true" className="w-5 h-5 md:w-6 md:h-6 text-brand" />
            </span>
            <span className="text-[#AEAEB2] text-sm md:text-base group-hover:text-white transition-colors">
              Track Order
            </span>
          </Link>

          {FEATURES.crypto && <WalletQuickAction />}
        </div>

        {/* ── Banner Carousel ───────────────────────────────── */}
        <BannerCarousel banners={[...BANNERS]} autoRotate rotationInterval={5000} />

        {/* ── Sponsored / Featured Products ────────────────── */}
        {sponsoredLoading ? (
          <FeaturedSkeleton />
        ) : sponsoredProducts.length > 0 ? (
          <FeaturedHero
            title="Today's Picks"
            subtitle="Hand-picked from our vendors"
            products={sponsoredProducts}
            maxItems={4}
          />
        ) : null}

        {/* ── Fresh Arrivals shelf ──────────────────────────── */}
        <ProductShelf
          title="New on the Menu"
          subtitle="New on the menu this week"
          path="/product"
          icon={SectionIcons.FreshArrivals}
          iconColor="text-green-400"
          filterBy="new"
          sortBy="createdAt"
          sortOrder="desc"
          maxItems={20}
        />

        {/* ── Shop by Category ─────────────────────────────── */}
        <CategoryPreview />

        {/* ── Top-Rated Sellers shelf ───────────────────────── */}
        <ProductShelf
          title="From Top-Rated Vendors"
          subtitle="Order with confidence from vendors buyers love"
          path="/product"
          icon={SectionIcons.TopSellers}
          iconColor="text-yellow-400"
          filterBy="topSellers"
          maxItems={20}
        />

        {/* ── Per-category shelves ──────────────────────────── */}
        {CATEGORIES.map((cat) => (
          <ProductShelf
            key={cat.name}
            title={cat.name}
            path={`/product/category/${encodeURIComponent(cat.name.toLowerCase())}`}
            icon={cat.Icon}
            iconColor={cat.color}
            category={cat.name}
            maxItems={16}
          />
        ))}

        {/* ── Value Picks shelf ─────────────────────────────── */}
        <ProductShelf
          title={valuePriceTitle}
          subtitle="Tasty and easy on the pocket"
          path="/product"
          icon={SectionIcons.ValuePrice}
          iconColor="text-emerald-400"
          maxPrice={valuePriceThreshold}
          sortBy="price"
          sortOrder="asc"
          maxItems={20}
        />

        {/* ── All Products - infinite scroll grid ──────────── */}
        <ProductList
          title="All Food & Groceries"
          subtitle={`Browse everything on ${BRAND.name}`}
          className="mt-8 md:mt-10"
          isCategoryView={false}
          showViewAll={false}
        />

      </Container>

    </div>
  );
};

export default Home;
