import { motion } from "framer-motion";
import { LiaAngleLeftSolid } from "react-icons/lia";
import {
  RiEdit2Fill,
  RiShieldCheckFill,
  RiLogoutBoxRLine,
  RiThumbUpLine,
  RiBuilding2Line,
  RiMapPinLine,
  RiFileList3Line,
  RiShieldUserLine,
  RiCupLine,
} from "react-icons/ri";
import { FaQuestion } from "react-icons/fa";
import { TwoFactor } from "../../../pages";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router";
import type { AccountViewState } from "../../../pages/Account";

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}

const SettingItem = ({
  icon,
  label,
  onClick,
  variant = "default",
}: SettingItemProps) => (
  <button
    className={`flex items-center gap-3 w-full px-4 py-3.5 hover:bg-[#3A3A3C] active:bg-[#42444A] transition-colors text-left first:rounded-t-xl last:rounded-b-xl ${
      variant === "danger" ? "text-red-400" : "text-white"
    }`}
    onClick={onClick}
  >
    <div
      className={`p-2 rounded-full flex-shrink-0 ${
        variant === "danger" ? "bg-red-900/30" : "bg-[#3A3A3C]"
      }`}
    >
      {icon}
    </div>
    <span className="text-sm font-medium flex-1">{label}</span>
    <svg
      className="h-4 w-4 text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  </button>
);

const Settings = ({
  setViewState,
}: {
  setViewState: (state: AccountViewState) => void;
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  type SectionItem = {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    variant?: "default" | "danger";
  };

  const sections: { title: string; items: SectionItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          icon: <RiEdit2Fill className="text-white text-base" />,
          label: "Edit Profile",
          onClick: () => setViewState("edit-profile"),
        },
        {
          icon: <RiMapPinLine className="text-white text-base" />,
          label: "Delivery Addresses",
          onClick: () => setViewState("delivery-addresses"),
        },
        // Telegram community removed - we only use X and LinkedIn.
        // {
        //   icon: <RiContactsBook2Fill className="text-white text-base" />,
        //   label: "Join Our Community",
        //   onClick: () => window.open("https://t.me/dezenmart_commuinity", "_blank"),
        // },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        {
          icon: <RiShieldCheckFill className="text-white text-base" />,
          label: "Safety",
          onClick: () => setViewState("safety"),
        },
        {
          icon: <img src={TwoFactor} alt="" className="w-4 h-4" />,
          label: "Two-Factor Authentication",
          onClick: () => setViewState("two-factor"),
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          icon: <RiFileList3Line className="text-white text-base" />,
          label: "Terms of Service",
          onClick: () => navigate("/terms", { state: { returnTo: "settings" } }),
        },
        {
          icon: <RiShieldUserLine className="text-white text-base" />,
          label: "Privacy Policy",
          onClick: () => navigate("/privacy", { state: { returnTo: "settings" } }),
        },
        {
          icon: <RiCupLine className="text-white text-base" />,
          label: "Cookie Policy",
          onClick: () => navigate("/cookies", { state: { returnTo: "settings" } }),
        },
      ],
    },
    {
      title: "More",
      items: [
        {
          icon: <FaQuestion className="text-white text-sm" />,
          label: "Help & Support",
          onClick: () => setViewState("help"),
        },
        {
          icon: <RiThumbUpLine className="text-white text-base" />,
          label: "Rate the App",
          onClick: () => setViewState("rate"),
        },
        {
          icon: <RiBuilding2Line className="text-white text-base" />,
          label: "About DezenFoods",
          onClick: () => setViewState("about"),
        },
        {
          icon: <RiLogoutBoxRLine className="text-red-400 text-base" />,
          label: "Log Out",
          variant: "danger" as const,
          onClick: () => {
            logout();
            navigate("/");
          },
        },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          aria-label="Back"
          onClick={() => setViewState("overview")}
          className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
        >
          <LiaAngleLeftSolid className="text-white text-xl" />
        </button>
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-1.5">
              {section.title}
            </p>
            <div className="bg-[#292B30] rounded-xl overflow-hidden divide-y divide-[#3A3A3C]">
              {section.items.map((item) => (
                <SettingItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  onClick={item.onClick}
                  variant={item.variant}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default Settings;
