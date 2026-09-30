import { Link, useParams } from "react-router-dom";
import Container from "../components/common/Container";
import ProductCard from "../components/product/ProductCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useGetVendorByIdQuery, useGetVendorProductsQuery } from "../store/api";
import { getCategoryByName } from "../utils/categories";
import { useSEO } from "../hooks/useSEO";
import { BRAND } from "../config/brand";
import { SEO_CONFIG } from "../utils/seo/seoConfig";

/** Public vendor profile: who they are, when they're open, everything they sell. */
export default function VendorStore() {
  const { vendorId = "" } = useParams();
  const { data: vendor, isLoading, isError } = useGetVendorByIdQuery(vendorId, { skip: !vendorId });
  const { data: products = [], isLoading: productsLoading } = useGetVendorProductsQuery(vendorId, { skip: !vendorId });

  useSEO({
    title: vendor ? `${vendor.businessName} - ${vendor.lga}, ${vendor.state}` : "Vendor",
    description: vendor?.description?.slice(0, 160) ?? `Order from a trusted ${BRAND.name} vendor.`,
    type: "website",
    canonicalUrl: `${SEO_CONFIG.siteUrl}/vendors/${vendorId}`,
    structuredData: vendor
      ? [{
          "@context": "https://schema.org",
          "@type": "FoodEstablishment",
          name: vendor.businessName,
          description: vendor.description,
          address: { "@type": "PostalAddress", addressLocality: vendor.lga, addressRegion: vendor.state, addressCountry: "NG" },
          ...(vendor.rating && vendor.reviewCount
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: vendor.rating, reviewCount: vendor.reviewCount } }
            : {}),
        }]
      : undefined,
  });

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center bg-Dark"><LoadingSpinner size="lg" /></div>;
  if (isError || !vendor) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-lg font-bold text-white">Vendor not found</h1>
        <Link to="/product" className="mt-4 inline-block text-brand hover:underline">Browse food</Link>
      </Container>
    );
  }

  const hours = vendor.openingHours;
  return (
    <div className="bg-Dark min-h-screen">
      <div className="h-32 bg-gradient-to-r from-brand to-brand-hover sm:h-44" style={vendor.coverImage ? { backgroundImage: `url(${vendor.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
      <Container className="-mt-10">
        <div className="rounded-2xl bg-[#292B30] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            {vendor.logo ? (
              <img src={vendor.logo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#3A3C41] text-2xl">🍽️</div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-white">{vendor.businessName}</h1>
              <p className="text-sm text-gray-400">{vendor.lga}, {vendor.state}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {vendor.rating ? <span className="text-amber-400">★ {vendor.rating.toFixed(1)}{vendor.reviewCount ? ` (${vendor.reviewCount})` : ""}</span> : null}
                <span className={`rounded-full px-2 py-0.5 ${vendor.isOpen ? "bg-green-900/40 text-green-300" : "bg-gray-700 text-gray-300"}`}>
                  {vendor.isOpen ? "Open" : "Closed right now"}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-300">{vendor.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vendor.categories.map((c) => (
              <span key={c} className="rounded-full bg-[#3A3C41] px-2.5 py-1 text-xs text-gray-200">{getCategoryByName(c)?.emoji} {c}</span>
            ))}
          </div>
          {hours && (
            <p className="mt-3 text-xs text-gray-400">
              Hours: {hours.open} - {hours.close} · {hours.days.length === 7 ? "Every day" : hours.days.join(", ")}
            </p>
          )}
        </div>

        <h2 className="mb-3 mt-8 text-lg font-semibold text-white">Menu</h2>
        {productsLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : products.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">This vendor hasn't listed anything yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {products.filter((p) => p.isActive !== false).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </Container>
    </div>
  );
}
