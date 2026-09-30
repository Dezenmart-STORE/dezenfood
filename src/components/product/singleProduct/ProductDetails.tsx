import { useState, useEffect, useCallback } from "react";
import { Product, ProductVariant } from "../../../utils/types";
import ProductAbout from "./ProductAbout";
import ProductProperties from "./ProductProperties";
import ProductDescription from "./ProductDescription";
import FoodInfo from "./FoodInfo";

interface ProductDetailsProps {
  product?: Product;
  onVariantSelect?: (variant: ProductVariant) => void;
}

const ProductDetails = ({ product, onVariantSelect }: ProductDetailsProps) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );

  useEffect(() => {
    if (
      product?.type &&
      Array.isArray(product.type) &&
      product.type.length > 0
    ) {
      const first =
        product.type.find((v: ProductVariant) => v.quantity > 0) ||
        product.type[0];
      setSelectedVariant(first);
      onVariantSelect?.(first);
    } else {
      setSelectedVariant(null);
    }
  }, [product?.type, onVariantSelect]);

  const handleVariantChange = useCallback(
    (variant: ProductVariant) => {
      if (!variant || typeof variant.quantity !== "number") return;
      setSelectedVariant(variant);
      onVariantSelect?.(variant);
    },
    [onVariantSelect]
  );

  const hasVariants =
    product?.type && Array.isArray(product.type) && product.type.length > 0;

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5">
      <ProductAbout product={product!} />

      {product && <FoodInfo product={product} />}

      {hasVariants && (
        <>
          <div className="border-t border-gray-700/40" />
          <ProductProperties
            product={product!}
            onVariantSelect={handleVariantChange}
            selectedVariant={selectedVariant ?? undefined}
          />
        </>
      )}

      <div className="border-t border-gray-700/40" />
      <ProductDescription product={product!} />
    </div>
  );
};

export default ProductDetails;
