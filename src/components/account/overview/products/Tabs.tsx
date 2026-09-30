import { motion } from "framer-motion";
import { FiPlus, FiPackage } from "react-icons/fi";

interface SubTabsProps {
  activeSubTab: "create" | "view";
  onSubTabChange: (tab: "create" | "view") => void;
}

const SUB_TABS = [
  { id: "create" as const, label: "List a Product", icon: FiPlus },
  { id: "view"   as const, label: "My Products",    icon: FiPackage },
];

const SubTabs: React.FC<SubTabsProps> = ({ activeSubTab, onSubTabChange }) => (
  <div className="flex bg-[#292B30] rounded-xl p-1 gap-1 mt-4 mb-5">
    {SUB_TABS.map(({ id, label, icon: Icon }) => (
      <div key={id} className="relative flex-1">
        <button
          onClick={() => onSubTabChange(id)}
          className={`relative z-10 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSubTab === id ? "text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
        {activeSubTab === id && (
          <motion.div
            className="absolute inset-0 bg-brand rounded-lg"
            layoutId="activeSubTab"
            initial={false}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{ zIndex: 0 }}
          />
        )}
      </div>
    ))}
  </div>
);

export default SubTabs;
