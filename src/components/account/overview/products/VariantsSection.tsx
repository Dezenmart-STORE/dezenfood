import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiX, FiChevronDown } from "react-icons/fi";

export interface ProductVariant {
  id: string;
  properties: { name: string; value: string }[];
  quantity: number;
}

interface Props {
  variants: ProductVariant[];
  totalStock: number;
  onChange: (variants: ProductVariant[]) => void;
  error?: string;
}

const VariantsSection: React.FC<Props> = ({ variants, totalStock, onChange, error }) => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [propName, setPropName] = useState("");
  const [propValue, setPropValue] = useState("");

  const totalVariantQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
  const hasAnyProps = variants.some((v) => v.properties.length > 0);

  const addProperty = useCallback(() => {
    if (!propName.trim() || !propValue.trim()) return;
    const exists = variants[activeIdx]?.properties.some(
      (p) => p.name.toLowerCase() === propName.toLowerCase()
    );
    if (exists) return;

    onChange(
      variants.map((v, i) =>
        i === activeIdx
          ? { ...v, properties: [...v.properties, { name: propName.trim(), value: propValue.trim() }] }
          : v
      )
    );
    setPropName("");
    setPropValue("");
  }, [variants, activeIdx, propName, propValue, onChange]);

  const removeProperty = (vIdx: number, pIdx: number) => {
    onChange(
      variants.map((v, i) =>
        i === vIdx
          ? { ...v, properties: v.properties.filter((_, j) => j !== pIdx) }
          : v
      )
    );
  };

  const updateQty = (vIdx: number, qty: string) => {
    const n = parseInt(qty, 10);
    onChange(
      variants.map((v, i) =>
        i === vIdx ? { ...v, quantity: isNaN(n) ? 0 : n } : v
      )
    );
  };

  const addVariant = () => {
    onChange([...variants, { id: `v-${Date.now()}`, properties: [], quantity: 0 }]);
    setActiveIdx(variants.length);
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= 1) return;
    onChange(variants.filter((_, i) => i !== idx));
    setActiveIdx((prev) => Math.max(prev >= idx ? prev - 1 : prev, 0));
  };

  const qtyColor =
    totalVariantQty === totalStock && hasAnyProps
      ? "text-green-400"
      : totalVariantQty > totalStock
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div>
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-1 text-sm"
      >
        <span className="text-gray-300 font-medium">
          Product Variants
          <span className="ml-1.5 text-gray-500 font-normal text-xs">(optional)</span>
        </span>
        <FiChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Hint */}
              {!hasAnyProps && (
                <p className="text-xs text-gray-500 bg-[#3A3C41] rounded-lg px-3 py-2">
                  Add variants for products with options like Size (S, M, L), Color (Red, Blue), or Material. Each variant needs a quantity - the total must equal your stock.
                </p>
              )}

              {/* Variant tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeIdx === i
                        ? "bg-brand text-white"
                        : "bg-[#3A3C41] text-gray-300 hover:bg-[#484B52]"
                    }`}
                  >
                    Variant {i + 1}
                    {i > 0 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeVariant(i); }}
                        className="hover:text-red-300 transition-colors"
                        role="button"
                        aria-label={`Remove variant ${i + 1}`}
                      >
                        <FiX size={11} />
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs text-gray-400 bg-[#3A3C41] hover:bg-[#484B52] transition-colors"
                >
                  <FiPlus size={12} /> Add
                </button>
              </div>

              {/* Active variant editor */}
              {variants[activeIdx] && (
                <div className="bg-[#3A3C41] rounded-xl p-3 space-y-3">
                  {/* Quantity */}
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor={`vqty-${activeIdx}`}
                      className="text-xs text-gray-400 whitespace-nowrap"
                    >
                      Qty for Variant {activeIdx + 1}
                    </label>
                    <input
                      id={`vqty-${activeIdx}`}
                      type="number"
                      min="0"
                      value={variants[activeIdx].quantity || ""}
                      onChange={(e) => updateQty(activeIdx, e.target.value)}
                      className="bg-[#292B30] text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand w-24"
                      placeholder="0"
                    />
                  </div>

                  {/* Property inputs */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={propName}
                      onChange={(e) => setPropName(e.target.value)}
                      placeholder="Property (e.g. size)"
                      className="flex-1 bg-[#292B30] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand min-w-0"
                    />
                    <input
                      type="text"
                      value={propValue}
                      onChange={(e) => setPropValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addProperty())}
                      placeholder="Value (e.g. XL)"
                      className="flex-1 bg-[#292B30] text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand min-w-0"
                    />
                    <button
                      type="button"
                      onClick={addProperty}
                      disabled={!propName.trim() || !propValue.trim()}
                      className="px-3 py-2 rounded-lg bg-[#292B30] text-white text-sm disabled:opacity-40 hover:bg-[#3a3c41] transition-colors flex-shrink-0"
                    >
                      <FiPlus size={14} />
                    </button>
                  </div>

                  {/* Properties list */}
                  {variants[activeIdx].properties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {variants[activeIdx].properties.map((p, pi) => (
                        <span
                          key={pi}
                          className="flex items-center gap-1 bg-[#292B30] text-xs text-white rounded-lg px-2.5 py-1"
                        >
                          <span className="text-gray-400">{p.name}:</span> {p.value}
                          <button
                            type="button"
                            onClick={() => removeProperty(activeIdx, pi)}
                            className="text-gray-500 hover:text-red-400 transition-colors ml-0.5"
                            aria-label={`Remove ${p.name}`}
                          >
                            <FiX size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No properties yet</p>
                  )}
                </div>
              )}

              {/* Stock summary */}
              {hasAnyProps && (
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-gray-400">
                    Variant total: <span className={qtyColor}>{totalVariantQty}</span>
                    {" / "}Stock: <span className="text-white">{totalStock || 0}</span>
                  </span>
                  {totalVariantQty === totalStock && totalStock > 0 && (
                    <span className="text-green-400">All allocated</span>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-400 text-xs" role="alert">{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VariantsSection;
