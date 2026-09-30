import { Link } from "react-router-dom";
import { Product } from "../../utils/types";
import { GoVerified } from "react-icons/go";
import { useCurrency } from "../../context/CurrencyContext";

interface Props {
  title: string;
  subtitle?: string;
  products: Product[];
  maxItems?: number;
}

const FeaturedHero = ({ title, subtitle, products, maxItems = 4 }: Props) => {
  const { formatDisplayPrice } = useCurrency();

  const displayProducts = products.slice(0, maxItems);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="text-center mb-8">
        <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-gray-400 text-sm md:text-base">{subtitle}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {displayProducts.map((product) => {
          const displayPrice = formatDisplayPrice(product.price, product.currency);

          return (
            <Link
              key={product._id}
              to={`/product/${product._id}`}
              className="group bg-[#1a1c20] rounded-xl overflow-hidden hover:ring-2 hover:ring-Red transition-all duration-300"
            >
              {/* Large image */}
              <div className="aspect-square overflow-hidden bg-gray-800 relative">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />

                {product.isSponsored && (
                  <div className="absolute top-3 right-3 bg-Green/90 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    Featured
                  </div>
                )}

                {Number(product.stock) < 5 && Number(product.stock) > 0 && (
                  <div className="absolute bottom-3 left-3 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full">
                    Only {product.stock} left
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-white font-semibold text-base md:text-lg mb-2 line-clamp-2 min-h-[3rem]">
                  {product.name}
                </h3>

                {typeof product.seller === "object" && product.seller && (
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={product.seller.profileImage || "/default-avatar.png"}
                      alt={product.seller.name}
                      className="w-6 h-6 rounded-full object-cover"
                      loading="lazy"
                    />
                    <span className="text-gray-400 text-xs md:text-sm truncate flex-1">
                      {product.seller.name}
                    </span>
                    {product.seller.rating >= 4.5 && (
                      <GoVerified
                        className="text-green-400 text-sm flex-shrink-0"
                        title="Verified Seller"
                      />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <span className="text-Green text-xl md:text-2xl font-bold">
                    {displayPrice}
                  </span>
                  <button className="bg-Red text-white px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-brand-hover transition-colors">
                    View
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Link
          to="/product"
          className="text-Red hover:text-red-400 inline-flex items-center gap-2 text-sm md:text-base font-medium transition-colors"
        >
          View all products
          <span>→</span>
        </Link>
      </div>
    </section>
  );
};

export default FeaturedHero;
