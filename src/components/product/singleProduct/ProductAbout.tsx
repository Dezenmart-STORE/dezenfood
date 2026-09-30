import { FaStore } from "react-icons/fa";
import { Product } from "../../../utils/types";
import { useNavigate } from "react-router";

const ProductAbout = ({ product }: { product: Product }) => {
  const navigate = useNavigate();

  const sellerName =
    typeof product.seller === "object" ? product.seller.name : product.seller;
  const inStock = product.stock != null && Number(product.stock) > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-400">
        <FaStore className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Sold by{" "}
          <span className="text-white font-medium">{sellerName}</span>
        </span>
      </div>

      <span
        className={`text-sm font-medium ${
          inStock ? "text-green-500" : "text-red-500"
        }`}
      >
        {inStock ? `${Number(product.stock)} in stock` : "Out of stock"}
      </span>

      <div>
        <button
          onClick={() =>
            navigate(
              `/product/category/${encodeURIComponent(product.category.toLowerCase())}`
            )
          }
          className="text-xs bg-[#1a1b1f] text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded transition-colors"
        >
          {product.category}
        </button>
      </div>
    </div>
  );
};

export default ProductAbout;
