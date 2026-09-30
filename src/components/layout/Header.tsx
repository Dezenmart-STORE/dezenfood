import { BRAND } from "../../config/brand";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import { HiOutlineBell, HiOutlineShoppingBag } from "react-icons/hi";
import { useAppSelector } from "../../hooks/redux";
import { selectCartCount } from "../../store/slices/cartSlice";
import { BiLogIn, BiWallet } from "react-icons/bi";
import { LogoSVG } from "../../pages";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Container from "../common/Container";
import {
  useGetUnreadNotificationCountQuery,
  useGetConversationsQuery,
  useGetUserProfileQuery,
  useGetSelfVerificationStatusQuery,
} from "../../store/api";
import NotificationBadge from "../notifications/NotificationBadge";
import TokenSelector from "./TokenSelector";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import CurrencyToggle from "../common/CurrencyToggle";
import WalletConnectButton from "../wallet/ConnectButton";
import { useCurrency } from "../../context/CurrencyContext";
import type { StableToken } from "../../config/tokens";
import { useAccount, useDisconnect } from "wagmi";
import { FiInfo } from "react-icons/fi";
import { HiAcademicCap } from "react-icons/hi2";
import { Suspense } from "react";
import { lazyWithReload } from "../../utils/lazyWithReload";
// Heavy (@selfxyz ~2MB): load only when the verification modal opens.
const SefldVerification = lazyWithReload(() => import("../common/SefldVerification"), "SefldVerification");
import WalkthroughTrigger from "../walkthrough/WalkthroughTrigger";
import { useWalkthrough } from "../../context/WalkthroughContext";

const NavList = [
  { title: "Home", path: "/" },
  { title: "Food", path: "/product" },
  { title: "Community", path: "/community" },
] as const;

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: selectedUser } = useGetUserProfileQuery(undefined, {
    skip: !isAuthenticated, // Skip when not logged in
  });
  const { isConnected } = useAccount();
  const { disconnect: disconnectWallet } = useDisconnect();
  const { selectedToken, setSelectedToken, tokens } = useCurrency();
  const { resetWalkthrough } = useWalkthrough();
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Google's avatar CDN (lh3.googleusercontent.com) rate-limits by referrer and
  // starts returning 429 once a page requests the same avatar repeatedly. The
  // request is sent with referrerPolicy="no-referrer" to avoid that, and this
  // flag latches a failure so a rejected avatar isn't re-requested on every
  // re-render, which is what turned one 429 into a flood of them.
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true); // Track if user is at top of page
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // RTK Query hooks with polling - only when authenticated
  const { data: unreadCountData } = useGetUnreadNotificationCountQuery(
    undefined,
    {
      pollingInterval: 30000, // Poll every 30 seconds
      skip: !isAuthenticated, // Skip when not logged in
    }
  );
  const unreadCount = unreadCountData?.count || 0;
  const cartCount = useAppSelector(selectCartCount);

  const { data: conversations = [] } = useGetConversationsQuery(undefined, {
    pollingInterval: 30000,
    skip: !isAuthenticated, // Skip when not logged in
  });

  useGetSelfVerificationStatusQuery(undefined, {
    skip: !selectedUser?._id || !isAuthenticated, // Skip when not logged in
  });

  // Calculate unread messages from conversations
  const totalUnreadMessages = conversations.reduce(
    (total, conv) => total + (conv.unreadCount || 0),
    0
  );

  // Click outside handler for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = useCallback(async () => {
    try {
      setShowUserMenu(false);

      // Disconnect wallet if connected
      if (isConnected) {
        await disconnectWallet();
      }

      logout();
      startTransition(() => {
        navigate("/", { replace: true });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      logout();
      startTransition(() => {
        navigate("/", { replace: true });
      });
    }
  }, [disconnectWallet, logout, navigate, isConnected]);

  const handleUserMenuToggle = useCallback(() => {
    setShowUserMenu((prev) => !prev);
  }, []);

  const handleProfileNavigation = useCallback(() => {
    setShowUserMenu(false);
    startTransition(() => {
      navigate("/account");
    });
  }, [navigate]);

  // Track scroll position to detect if at top
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      setIsAtTop(scrollY === 0);
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-hide header functionality (only when NOT at top)
  const resetHideTimer = useCallback(() => {
    // Clear existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Show header on interaction
    setIsHeaderVisible(true);

    // Only set hide timer if user is NOT at the top of the page
    if (!isAtTop) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsHeaderVisible(false);
      }, 3000);
    }
  }, [isAtTop]);

  // Track user interactions
  useEffect(() => {
    const handleUserActivity = () => {
      resetHideTimer();
    };

    // Listen to various user interaction events
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);
    window.addEventListener("touchmove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    // Initial timer
    resetHideTimer();

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      window.removeEventListener("touchmove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [resetHideTimer]);

  // Determine if header should be visible: always show at top, otherwise use auto-hide
  const shouldShowHeader = isAtTop || isHeaderVisible;

  return (
    <motion.header
      className="w-full py-2 md:py-3 bg-[#212428] shadow-md fixed top-0 left-0 right-0 z-50"
      initial={{ y: 0 }}
      animate={{ y: shouldShowHeader ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Container className="flex items-center justify-between py-0">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center group transition-transform hover:scale-105"
          aria-label={`${BRAND.name} Home`}
        >
          <div className="w-8 h-8 md:w-9 md:h-9 relative overflow-hidden flex-shrink-0">
            <img
              src={LogoSVG}
              className="w-full h-full transition-transform group-hover:scale-110 object-contain"
              alt={`${BRAND.name} logo`}
            />
          </div>
          <span className="ml-2 text-white font-medium hidden lg:inline transition-opacity group-hover:opacity-90">
            {BRAND.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-7 xl:gap-10">
          {NavList.map(({ title, path }) => (
            <NavLink
              key={path}
              to={path}
              className="relative font-semibold text-sm lg:text-md group"
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    className={`relative z-10 ${
                      isActive
                        ? "text-Red"
                        : "text-[#545456] group-hover:text-white"
                    }`}
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {title}
                  </motion.span>

                  {/* Animated underline */}
                  <motion.div
                    className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-Red rounded-full"
                    initial={false}
                    animate={{
                      scaleX: isActive ? 1 : 0,
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />

                  {/* Hover underline */}
                  {!isActive && (
                    <motion.div
                      className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-white/40 rounded-full"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3">
          {/* Currency Toggle - always visible */}
          <CurrencyToggle />

          {/* Token Selector - sm only and lg+; hidden at md (desktop nav takes space) */}
          {isConnected && (
            <div className="hidden sm:block md:hidden lg:block">
              <TokenSelector />
            </div>
          )}

          {/* Tutorial/Help Button - sm only and lg+; hidden at md */}
          <div className="hidden sm:block md:hidden lg:block">
            <WalkthroughTrigger variant="icon" />
          </div>

          {/* Wallet button - only for signed-in users. Logged out shows just
              Sign In; logged in shows Connect (disconnected) or the wallet
              (connected). ConnectButton handles those two states internally. */}
          {isAuthenticated && <WalletConnectButton />}

          {/* Cart - visible to everyone; it lives in localStorage until checkout */}
          <motion.button
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? "s" : ""}` : ""}`}
            className="relative rounded-full p-1 transition-colors hover:bg-[#292B30] sm:p-1.5"
            onClick={() => startTransition(() => navigate("/cart"))}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <HiOutlineShoppingBag className="text-lg text-white sm:text-xl" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </motion.button>

          {isAuthenticated ? (
            <>
              <motion.button
                aria-label={`Notifications ${
                  unreadCount > 0 ? ", " + unreadCount + " unread" : ""
                }`}
                className="relative rounded-full p-1 transition-colors hover:bg-[#292B30] sm:p-1.5"
                onClick={() =>
                  startTransition(() => navigate("/notifications"))
                }
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={
                    unreadCount > 0 ? { rotate: [0, -15, 15, -15, 0] } : {}
                  }
                  transition={{
                    duration: 0.5,
                    repeat: unreadCount > 0 ? Infinity : 0,
                    repeatDelay: 3,
                  }}
                >
                  <HiOutlineBell className="text-lg text-white sm:text-xl" />
                </motion.div>
                <NotificationBadge count={unreadCount} />
              </motion.button>

              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <motion.button
                  onClick={handleUserMenuToggle}
                  className="focus:outline-none focus:ring-2 focus:ring-Red focus:ring-opacity-50 rounded-full relative"
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  aria-label="User menu"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.img
                    src={
                      typeof user?.profileImage === "string" && !avatarFailed
                        ? user.profileImage
                        : `https://avatar.iran.liara.run/username?username=[${
                            user?.name?.split(" ")[0] || ""
                          }+${user?.name?.split(" ")[1] || ""}]`
                    }
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="w-8 h-8 rounded-full ring-2 ring-[#292B30] hover:ring-Red transition-all"
                    loading="lazy"
                    animate={{ rotate: showUserMenu ? 360 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  {!user?.selfVerification?.isVerified && (
                    <motion.div
                      className="absolute -top-1 -right-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      <div className="relative group">
                        <motion.div
                          className="w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <FiInfo className="text-black text-xs" />
                        </motion.div>
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-[200px] overflow-hidden">
                          <div className="font-semibold mb-1">
                            Account Verification Required
                          </div>
                          <div className="text-gray-300">
                            Complete passport verification to access trading,
                            withdrawals, and premium features
                          </div>
                          <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-56 bg-[#212428] rounded-md shadow-lg py-1 z-50 border border-[#292B30] overflow-hidden"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <motion.button
                        onClick={handleProfileNavigation}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        My Account
                      </motion.button>

                      {/* Show token selector on mobile (< sm) when wallet is connected */}
                      {isConnected && (
                        <div className="sm:hidden border-t border-gray-700/50 my-1 pt-3 pb-2 px-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Payment Token
                          </p>
                          <div className="w-full">
                            <TokenSelector />
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-700/50 my-1"></div>

                      <motion.button
                        onClick={() => {
                          setShowUserMenu(false);
                          resetWalkthrough();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors sm:hidden"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center gap-2">
                          <HiAcademicCap className="text-Red text-base" />
                          <span>View Tutorial</span>
                        </div>
                      </motion.button>

                      {!user?.selfVerification?.isVerified && (
                        <motion.button
                          onClick={() => setShowVerifyModal(true)}
                          className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                          role="menuitem"
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center gap-2">
                            <span>Verify Account</span>
                            <motion.div
                              animate={{ rotate: [0, 360] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <FiInfo className="text-yellow-500 text-sm cursor-help" />
                            </motion.div>
                          </div>
                        </motion.button>
                      )}
                      <motion.button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#292B30] transition-colors"
                        role="menuitem"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        Sign Out
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {/* Sole CTA when logged out: icon + label at every breakpoint. */}
              <button
                onClick={() => startTransition(() => navigate("/login"))}
                className="flex items-center gap-1.5 rounded-md bg-Red px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-opacity-90 active:scale-95"
                aria-label="Sign in"
              >
                <BiLogIn className="text-lg" />
                <span>Sign In</span>
              </button>
            </motion.div>
          )}
        </div>
      </Container>
      {showVerifyModal && (
        <Suspense fallback={null}>
          <SefldVerification
            isOpen={showVerifyModal}
            onClose={() => setShowVerifyModal(false)}
          />
        </Suspense>
      )}
    </motion.header>
  );
};

export default Header;
