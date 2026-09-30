import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import SubTabs from "./Tabs";
import LoadingSpinner from "../../../common/LoadingSpinner";

import VendorGate from "./VendorGate";

const CreateProduct = lazy(() => import("./CreateProduct"));
const ProductList = lazy(() => import("../../../product/ProductList"));

const fallback = (
  <div className="flex justify-center items-center py-16">
    <LoadingSpinner size="lg" />
  </div>
);

const ProductContainer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState<"create" | "view">("create");

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setActiveSubTab("create");
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubTabChange = useCallback((tab: "create" | "view") => {
    setActiveSubTab(tab);
  }, []);

  const handleProductCreated = useCallback(() => {
    setActiveSubTab("view");
  }, []);

  return (
    <VendorGate>
    <div className="w-full">
      <SubTabs activeSubTab={activeSubTab} onSubTabChange={handleSubTabChange} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <Suspense fallback={fallback}>
            {activeSubTab === "create" ? (
              <CreateProduct onProductCreated={handleProductCreated} />
            ) : (
              <ProductList
                title="My Products"
                className="mt-2"
                isCategoryView={false}
                showViewAll={false}
                isUserProducts
              />
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
    </VendorGate>
  );
};

export default ProductContainer;
