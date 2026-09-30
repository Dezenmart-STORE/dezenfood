import { Link } from "react-router-dom";
import type { Product } from "../../../utils/types";
import { WEEKDAYS, formatPrep, isOrderableNow } from "../../../utils/food";

/** Food-specific facts: prep time, diet, allergens, availability, vendor. */
const FoodInfo = ({ product }: { product: Product }) => {
  const prep = formatPrep(product.prepTimeMinutes);
  const orderable = isOrderableNow(product);
  const days = product.availableDays ?? [];
  const everyDay = days.length === 0 || days.length === WEEKDAYS.length;

  const facts: { label: string; value: string }[] = [
    prep && { label: "Prep time", value: prep },
    product.portionSize && { label: "Portion", value: product.portionSize },
    product.serves ? { label: "Serves", value: `${product.serves}` } : null,
    product.minOrderQty && product.minOrderQty > 1
      ? { label: "Minimum order", value: `${product.minOrderQty}` }
      : null,
    product.spiceLevel && product.spiceLevel !== "None"
      ? { label: "Spice", value: product.spiceLevel }
      : null,
    product.leadTimeHours
      ? { label: "Order ahead", value: `${product.leadTimeHours}h notice` }
      : null,
    product.shelfLifeHours
      ? { label: "Best within", value: `${product.shelfLifeHours}h of delivery` }
      : null,
    product.orderCutoff ? { label: "Order by", value: product.orderCutoff } : null,
    !everyDay ? { label: "Available", value: days.join(", ") } : null,
    product.fulfilment?.length
      ? { label: "Fulfilment", value: product.fulfilment.map((f) => (f === "pickup" ? "Pickup" : "Delivery")).join(" / ") }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasAnything =
    facts.length > 0 || product.dietaryTags?.length || product.allergens?.length || !orderable;
  if (!hasAnything) return null;

  return (
    <section aria-label="Food details" className="space-y-3">
      {!orderable && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          The vendor isn't taking orders for this right now
          {product.orderCutoff ? ` (order by ${product.orderCutoff})` : ""}. You can still add it to your cart
          for another day.
        </p>
      )}

      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-gray-500">{f.label}</dt>
              <dd className="text-white">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!!product.dietaryTags?.length && (
        <div className="flex flex-wrap gap-1.5">
          {product.dietaryTags.map((t) => (
            <span key={t} className="text-xs text-green-300 bg-green-500/10 px-2 py-1 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      {!!product.allergens?.length && (
        <p className="text-xs text-gray-400">
          <span className="text-amber-300 font-medium">Contains: </span>
          {product.allergens.join(", ")}. Check with the vendor if you have an allergy.
        </p>
      )}

      {product.seller?._id && (
        <Link
          to={`/vendors/${product.seller._id}`}
          className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-hover"
        >
          More from {product.seller.name} →
        </Link>
      )}
    </section>
  );
};

export default FoodInfo;
