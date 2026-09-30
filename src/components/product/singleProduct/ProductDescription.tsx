import { useState } from "react";
import { Product } from "../../../utils/types";

const ProductDescription = ({ product }: { product: Product }) => {
  const [expanded, setExpanded] = useState(false);

  const description = product?.description || "";
  const safeDescription = typeof description === "string" ? description : "";
  const CHARACTER_LIMIT = 300;
  const visibleDescription = expanded
    ? safeDescription
    : safeDescription.slice(0, CHARACTER_LIMIT);

  const shouldShowButton = safeDescription.length > CHARACTER_LIMIT;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div
        className={`text-xs sm:text-sm leading-relaxed text-gray-300 break-words overflow-hidden ${
          !expanded ? "max-h-[500px]" : ""
        }`}
      >
        <p className="whitespace-pre-wrap">
          {visibleDescription}
          {!expanded && shouldShowButton && "..."}
        </p>
      </div>

      {shouldShowButton && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs sm:text-sm text-Red hover:text-red-400 font-medium transition-colors duration-200 inline-flex items-center gap-1"
        >
          {expanded ? (
            <>
              <span>Show less</span>
              <svg
                className="w-3 h-3 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </>
          ) : (
            <>
              <span>Read more</span>
              <svg
                className="w-3 h-3 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductDescription;
