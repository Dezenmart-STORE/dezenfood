import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, categoryHref } from '../../utils/categories';
import { useGetProductsQuery } from '../../store/api';

/**
 * "Shop by Category" strip.
 *
 * Mobile  → horizontal scroll; w-[72px] tiles + gap-3 ≈ 4.5 visible at 375 px
 *           giving a natural scroll hint without any extra markup.
 * Desktop → flat 8-column grid (no scroll).
 *
 * Product counts are derived from the `getProducts` cache that ProductShelf
 * components on the same page already populate - zero extra network requests.
 */
const CategoryPreview = () => {
  const { data: allProducts = [] } = useGetProductsQuery();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of allProducts) {
      if (p.category) c[p.category] = (c[p.category] ?? 0) + 1;
    }
    return c;
  }, [allProducts]);

  return (
    <section className="my-8 md:my-12">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">Shop by Category</h2>
        <Link
          to="/product"
          className="text-sm text-[#AEAEB2] hover:text-white transition-colors"
        >
          See all
        </Link>
      </div>

      {/* Grid / scroll container */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 md:grid md:grid-cols-8 md:overflow-visible md:pb-0">
        {CATEGORIES.map((cat) => {
          const { Icon, name, bg, color } = cat;
          const count = counts[name];

          return (
            <motion.div
              key={name}
              className="flex-shrink-0 w-[72px] md:w-auto"
              whileTap={{ scale: 0.93 }}
            >
              <Link
                to={categoryHref(name)}
                className="flex flex-col items-center gap-2 group"
              >
                {/* Icon bubble - uses static bg/color classes from categories.ts */}
                <div
                  className={`w-[60px] h-[60px] md:w-16 md:h-16 rounded-2xl ${bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className={`w-7 h-7 md:w-8 md:h-8 ${color}`} />
                </div>

                {/* Label */}
                <div className="text-center w-full">
                  <p className="text-white text-[11px] md:text-xs font-medium leading-tight line-clamp-2">
                    {name}
                  </p>
                  {count !== undefined && count > 0 && (
                    <p className="text-[#AEAEB2] text-[10px] mt-0.5">{count}+</p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryPreview;
