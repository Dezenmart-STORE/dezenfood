import { motion } from "framer-motion";
import { RiFileList3Line, RiChat3Line } from "react-icons/ri";

interface ProductTabsProps {
  activeTab: "details" | "reviews";
  setActiveTab: (tab: "details" | "reviews") => void;
  reviewCount?: number;
}

const TABS = [
  { id: "details" as const, label: "Details", icon: RiFileList3Line },
  { id: "reviews" as const, label: "Reviews", icon: RiChat3Line },
];

const ProductTabs = ({
  activeTab,
  setActiveTab,
  reviewCount = 0,
}: ProductTabsProps) => (
  <div className="flex bg-[#212428] rounded-xl p-1 gap-1 mx-4 sm:mx-6 my-4">
    {TABS.map(({ id, label, icon: Icon }) => (
      <div key={id} className="relative flex-1">
        <button
          onClick={() => setActiveTab(id)}
          role="tab"
          aria-selected={activeTab === id}
          className={`relative z-10 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === id
              ? "text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Icon size={15} />
          <span>{label}</span>
          {id === "reviews" && reviewCount > 0 && (
            <span className="bg-brand text-white text-xs rounded-full px-1.5 leading-5 min-w-[20px] text-center">
              {reviewCount}
            </span>
          )}
        </button>
        {activeTab === id && (
          <motion.div
            className="absolute inset-0 bg-brand rounded-lg"
            layoutId="activeProductTab"
            initial={false}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{ zIndex: 0 }}
          />
        )}
      </div>
    ))}
  </div>
);

export default ProductTabs;
