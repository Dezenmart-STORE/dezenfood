

import {
  useState,
  useEffect,
  FC,
  Suspense,
  lazy,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaExchangeAlt } from "react-icons/fa";
import Container from "../components/common/Container";
import Title from "../components/common/Title";
import BannerCarousel from "../components/common/BannerCarousel";
import ComingSoonOverlay from "../components/common/ComingSoonOverlay";
import { Pen, Pen2 } from ".";
import { Product, TradeTab } from "../utils/types";
import ProductListingSkeleton from "../components/trade/ProductListingSkeleton";
import Tab from "../components/trade/Tab";
import LazyFloatingButton from "../components/common/LazyFloatingButton";
import { useAccount } from "wagmi";
import ConnectModal from "../components/wallet/ConnectModal";

const ProductCard = lazy(() => import("../components/trade/ProductCard"));
const IncomingOrderCard = lazy(
  () => import("../components/trade/IncomingOrderCard")
);

const SAMPLE_PRODUCTS: Product[] = [
  {
    _id: "68082c3efae576e05502c04b",
    name: "Test Product",
    description: "Testing product endpoint",
    price: 20000,
    category: "Item",
    seller: { _id: "680821b06eda53ead327e0ea", name: "Sample Seller", rating: 4.5, profileImage: "" },
    sellerWalletAddress: "0x1234567890123456789012345678901234567890",
    images: [],
    isSponsored: false,
    isActive: true,
    createdAt: "2025-04-22T23:54:38.445Z",
    updatedAt: "2025-04-22T23:54:38.445Z",
    type: [],
    stock: 100,
    logisticsCost: [],
    logisticsProviders: [],
    paymentToken: "USDm",
    weight: 1,
    state: "Lagos",
    lga: "Ikeja",
  },
  {
    _id: "68082f7a7d3f057ab0fafd5c",
    name: "Wood Carving",
    description: "Neat carved wood art works",
    price: 20000,
    category: "Art Work",
    seller: { _id: "680821b06eda53ead327e0ea", name: "Sample Seller", rating: 4.5, profileImage: "" },
    sellerWalletAddress: "0x1234567890123456789012345678901234567890",
    images: [
      "images-1745366906480-810449189.jpeg",
      "images-1745366906494-585992412.jpeg",
    ],
    isSponsored: false,
    isActive: true,
    createdAt: "2025-04-23T00:08:26.519Z",
    updatedAt: "2025-04-23T00:08:26.519Z",
    type: [],
    stock: 100,
    logisticsCost: [],
    logisticsProviders: [],
    paymentToken: "USDm",
    weight: 1,
    state: "Lagos",
    lga: "Ikeja",
  },
];

const SAMPLE_INCOMING_ORDERS: Product[] = [
  {
    _id: "68082f7a7d3f057ab0fafd5c",
    name: "Wood Carving",
    description: "Neat carved wood art works",
    price: 20000,
    category: "Art Work",
    seller: { _id: "680821b06eda53ead327e0ea", name: "Sample Seller", rating: 4.5, profileImage: "" },
    sellerWalletAddress: "0x1234567890123456789012345678901234567890",
    images: [
      "images-1745366906494-585992412.jpeg",
    ],
    isSponsored: false,
    isActive: true,
    createdAt: "2025-04-23T00:08:26.519Z",
    updatedAt: "2025-04-23T00:08:26.519Z",
    type: [],
    stock: 100,
    logisticsCost: [],
    logisticsProviders: [],
    paymentToken: "USDm",
    weight: 1,
    state: "Lagos",
    lga: "Ikeja",
  },
];

const BANNERS_DATA = [
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Smart Ecommerce for",
    subtitle: "creators",
    primaryImage: Pen,
    secondaryImage: Pen2,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
  {
    title: "Special Offers for",
    subtitle: "new users",
    primaryImage: Pen,
    backgroundColor: "#ff3b3b",
    textColor: "white",
    isUppercase: true,
  },
] as const;

// Loading placeholder component
const ButtonPlaceholder: FC = () => (
  <motion.div
    className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#292B30]"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 1.5 }}
  />
);

const Trade = () => {
  const [activeTab, setActiveTab] = useState<TradeTab>("buy");
  const [isLoading, setIsLoading] = useState(true);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const { isConnected, isConnecting } = useAccount();

  const products = useMemo(() => SAMPLE_PRODUCTS, []);
  const incomingOrders = useMemo(() => SAMPLE_INCOMING_ORDERS, []);
  const banners = useMemo(() => [...BANNERS_DATA], []);

  // Tab change handler
  const handleTabChange = useCallback((tab: TradeTab) => {
    setActiveTab(tab);
  }, []);

  const handleRejectOrder = useCallback((product: Product) => {
    console.log("Order rejected:", product);
  }, []);

  const handleNotifyMe = useCallback(() => {
    try {
      localStorage.setItem(
        "p2p-notify-preference",
        JSON.stringify({
          enabled: true,
          timestamp: Date.now(),
        })
      );
      console.log("User subscribed to P2P notifications");
    } catch (error) {
      console.warn("Failed to save notification preference:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    setIsComponentMounted(true);

    const comingSoonTimer = setTimeout(() => {
      if (mounted) {
        setShowComingSoon(true);
      }
    }, 800);

    const loadTimer = setTimeout(() => {
      if (mounted) {
        requestAnimationFrame(() => {
          setIsLoading(false);
        });
      }
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(loadTimer);
      clearTimeout(comingSoonTimer);
      setIsComponentMounted(false);
    };
  }, []);
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      setShowConnectionModal(true);
    }
  }, [isConnected, isConnecting]);

  if (!isConnected && !isConnecting) {
    return (
      <div className="bg-Dark min-h-screen text-white">
        <Container>
          <ConnectModal onClose={() => setShowConnectionModal(false)} />
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-Dark min-h-screen text-white relative">
      <Container className="relative pb-20 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Title text="P2P Trading" className="text-center my-8 text-3xl" />
        </motion.div>

        <BannerCarousel
          banners={banners}
          autoRotate={true}
          className="mb-8"
          rotationInterval={6000}
        />

        <div className="max-w-screen-lg mx-auto bg-[#212428] rounded-lg overflow-hidden">
          <div className="flex flex-wrap border-b border-[#292B30]">
            <Tab
              text="Buy"
              isActive={activeTab === "buy"}
              onClick={() => handleTabChange("buy")}
              count={products.length}
            />
            <Tab
              text="Sell"
              isActive={activeTab === "sell"}
              onClick={() => handleTabChange("sell")}
              count={incomingOrders.length}
            />
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <ProductListingSkeleton key="loading" />
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {activeTab === "buy" &&
                    products.map((product) => (
                      <Suspense
                        key={product._id}
                        fallback={
                          <div className="h-32 bg-[#292B30] rounded animate-pulse" />
                        }
                      >
                        <ProductCard
                          product={product}
                          actionType="buy"
                          isSellTab={false}
                        />
                      </Suspense>
                    ))}

                  {activeTab === "sell" &&
                    incomingOrders.map((order) => (
                      <Suspense
                        key={order._id}
                        fallback={
                          <div className="h-32 bg-[#292B30] rounded animate-pulse" />
                        }
                      >
                        <IncomingOrderCard
                          product={order}
                          onReject={() => handleRejectOrder(order)}
                        />
                      </Suspense>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>

      {/* Floating action button */}
      {isComponentMounted && (
        <LazyFloatingButton
          icon={<FaExchangeAlt />}
          to="/trades/viewtrades"
          label="View Trades"
          position="bottom-right"
          color="primary"
        />
      )}

      {/* Coming Soon Overlay */}
      {showComingSoon && (
        <ComingSoonOverlay
          title="P2P Trading Coming Soon"
          description="Connect directly with sellers who are online now for instant communication and faster transactions."
          features={[
            "Real-time seller availability",
            "Instant messaging with sellers",
            "Quick order processing",
            "Secure peer-to-peer transactions",
          ]}
          onNotifyMe={handleNotifyMe}
          onClose={() => setShowComingSoon(false)}
        />
      )}
    </div>
  );
};

export default Trade;
