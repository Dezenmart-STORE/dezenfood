import { memo, useMemo, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";
import { BiPackage } from "react-icons/bi";
import { IoBagHandleOutline } from "react-icons/io5";
import { BsPeople } from "react-icons/bs";
import { RiUser3Line } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import { useGetConversationsQuery } from "../../store/api";
import { useAuth } from "../../context/AuthContext";
import { useAnyModalOpen } from "../../utils/modalPresence";

const navItems = [
  { icon: <AiOutlineHome size={22} />, label: "Home", path: "/" },
  { icon: <BiPackage size={22} />, label: "Food", path: "/product" },
  {
    icon: <IoBagHandleOutline size={22} />,
    label: "Cart",
    path: "/cart",
  },
  // {
  //   icon: <IoChatbubbleOutline size={22} />,
  //   label: "Chat",
  //   path: "/chat",
  //   badgeKey: "totalUnreadMessages",
  // },
  { icon: <BsPeople size={22} />, label: "Community", path: "/community" },
  { icon: <RiUser3Line size={22} />, label: "Account", path: "/account" },
];

const MobileNavigation = ({ hidden = false }: { hidden?: boolean }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);

  // Slide + fade the bottom nav out of the way whenever a modal is open, so it
  // never overlaps a bottom-sheet dialog on mobile.
  const anyModalOpen = useAnyModalOpen();
  const isHidden = hidden || anyModalOpen;

  // RTK Query hook - polling for real-time updates, only when authenticated
  const { data: conversations = [] } = useGetConversationsQuery(undefined, {
    pollingInterval: 30000,
    skip: !isAuthenticated,
  });

  const totalUnreadMessages = useMemo(
    () => conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0),
    [conversations]
  );

  // Update active index based on current path
  useEffect(() => {
    const pathname = location.pathname;

    // Check for exact match first
    let currentIndex = navItems.findIndex((item) => item.path === pathname);

    // If no exact match, check for special routes
    if (currentIndex === -1) {
      // Handle product routes: /product/:id, /products, /product
      if (pathname.startsWith('/product')) {
        currentIndex = navItems.findIndex((item) => item.path === '/product');
      }
      // Handle order routes: /orders/:id
      else if (pathname.startsWith('/orders/') || pathname.startsWith('/vendor')) {
        currentIndex = navItems.findIndex((item) => item.path === '/account');
      }
      // Payment return lands on the cart/checkout tab
      else if (pathname.startsWith('/payment')) {
        currentIndex = navItems.findIndex((item) => item.path === '/cart');
      }
      // Handle account sub-routes
      else if (pathname.startsWith('/account')) {
        currentIndex = navItems.findIndex((item) => item.path === '/account');
      }
      // Handle chat routes
      else if (pathname.startsWith('/chat')) {
        currentIndex = navItems.findIndex((item) => item.path === '/community');
      }
    }

    // Only set active index if we found a match
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    } else {
      // If no match found, set to -1 to not highlight any nav item
      setActiveIndex(-1);
    }
  }, [location.pathname]);

  return (
    <motion.nav
      aria-hidden={isHidden}
      initial={false}
      animate={{ y: isHidden ? "100%" : "0%", opacity: isHidden ? 0 : 1 }}
      transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
      style={{ pointerEvents: isHidden ? "none" : "auto" }}
      className="fixed bottom-0 left-0 right-0 bg-[#212428]/95 backdrop-blur-lg flex justify-evenly items-center px-2 py-2 md:hidden z-40 border-t border-[#292B30] shadow-2xl"
    >
      {/* Active indicator - only show if activeIndex is valid */}
      {activeIndex >= 0 && (
        <motion.div
          className="absolute top-0 h-0.5 bg-gradient-to-r from-transparent via-Red to-transparent"
          initial={false}
          animate={{
            left: `${(activeIndex / navItems.length) * 100}%`,
            width: `${100 / navItems.length}%`,
          }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 30,
          }}
        />
      )}

      {navItems.map((item, index) => {
        const isActive = index === activeIndex;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className="relative flex flex-col items-center"
            aria-label={item.label}
          >
            {({ isActive: linkActive }) => (
              <motion.div
                className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors"
                whileTap={{ scale: 0.9 }}
                animate={{
                  backgroundColor: linkActive ? "rgba(249, 115, 22, 0.12)" : "transparent",
                }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon with scale animation */}
                <motion.div
                  animate={{
                    scale: linkActive ? 1.1 : 1,
                    color: linkActive ? "#f97316" : "#545456",
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  {item.icon}

                  {/* Active dot indicator */}
                  <AnimatePresence>
                    {linkActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1 -right-1 w-2 h-2 bg-Red rounded-full"
                      />
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Label */}
                <motion.span
                  className="text-[10px] font-medium"
                  animate={{
                    color: linkActive ? "#f97316" : "#545456",
                    fontWeight: linkActive ? 600 : 500,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              </motion.div>
            )}
          </NavLink>
        );
      })}
    </motion.nav>
  );
};

export default memo(MobileNavigation);
