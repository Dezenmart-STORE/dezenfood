import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import "./index.css";
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { createRoot } from "react-dom/client";
import { Configuration } from "@react-md/layout";
import Layout from "./components/layout/Layout.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.tsx";
import { SnackbarProvider } from "./context/SnackbarContext.tsx";
import { Provider } from "react-redux";
import { store } from "./store/store.ts";
import ErrorBoundary from "./components/error/ErrorBoundary.tsx";
import { setupGlobalErrorHandling } from "./utils/errorHandling";
import ReferralHandler from "./components/referrals/ReferralHandler.tsx";
import { CurrencyProvider } from "./context/CurrencyContext.tsx";
import Web3Provider from "./components/wallet/Web3Provider.tsx";
import { TermsProvider } from "./context/TermsContext.tsx";
import { WalkthroughProvider } from "./context/WalkthroughContext.tsx";
import Walkthrough from "./components/walkthrough/Walkthrough.tsx";
import { initSentry, captureError } from "./utils/sentry.config.ts";
import { registerErrorReporter } from "./utils/errors.ts";
import {
  initPerformanceMonitoring,
  monitorResourceTiming,
} from "./utils/performance.ts";
import { registerServiceWorker, triggerSWUpdate } from "./utils/pwa/index.ts";
import { initDebugTools } from "./utils/debug/index.ts";
import "./utils/dev/injectAuth.ts";
import { RampProvider } from "./components/rampp/RampContext.tsx";
import { FloatingRampButton } from "./components/rampp/FloatingRampButton.tsx";
import { RampModal } from "./components/rampp/RampModal.tsx";
import { RampMinimalProvider } from "./components/ramp/USAGE_EXAMPLE.tsx";

// ── Startup: version-based stale cache cleanup ──────────────────────────────
// When a new version is deployed, clear data that may be stale or reference
// old API shapes. RTK Query cache is in-memory (cleared on reload automatically).
// We only need to clear offline-sync queued requests from the previous build.
const APP_VERSION = import.meta.env.VITE_APP_VERSION as string | undefined;
const VERSION_STORE_KEY = "_app_build_v";

if (APP_VERSION) {
  const storedVersion = localStorage.getItem(VERSION_STORE_KEY);
  if (storedVersion && storedVersion !== APP_VERSION) {
    // New deployment detected - clear potentially stale offline queue
    localStorage.removeItem("pwa-sync-queue");
    // Reset the chunk-reload cooldown so the fresh build can reload if needed
    sessionStorage.removeItem("_chunk_reload_at");
  }
  localStorage.setItem(VERSION_STORE_KEY, APP_VERSION);
}

// ── Global fallback: catch chunk errors outside the React error boundary ────
// Covers dynamic imports that happen in event handlers, effects, etc.
const CHUNK_RELOAD_KEY = "_chunk_reload_at";
const RELOAD_COOLDOWN = 30_000;

function isChunkMessage(msg: string): boolean {
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Unable to preload CSS")
  );
}

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const err = event.reason as Error | undefined;
  if (!err) return;
  const isChunk =
    err.name === "ChunkLoadError" || isChunkMessage(err.message ?? "");
  if (isChunk) {
    event.preventDefault();
    const last = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (!last || now - Number(last) > RELOAD_COOLDOWN) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
    }
  }
});

// Initialize Sentry error tracking
initSentry();
registerErrorReporter((error, context, parsed) =>
  captureError(error, { context, ...parsed })
);

// Initialize debug tools (available via browser console)
initDebugTools();

// Initialize performance monitoring
if (import.meta.env.PROD) {
  initPerformanceMonitoring();
  monitorResourceTiming();
}

// Register service worker for PWA functionality
registerServiceWorker({
  onNeedRefresh: () => {
    // Handled by pwa:update-ready event in the App component
  },
  onOfflineReady: () => {
    console.log("[PWA] App ready to work offline");
  },
});

const Login = lazy(() => import("./pages/Login.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const Product = lazy(() => import("./pages/Product.tsx"));
const SingleProduct = lazy(() => import("./pages/SingleProduct.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const ViewOrderDetail = lazy(() => import("./pages/ViewOrderDetail.tsx"));
const ComingSoon = lazy(() => import("./pages/ComingSoon.tsx"));
const Notifications = lazy(() => import("./pages/Notifications.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const ChatDetail = lazy(() => import("./pages/ChatDetail.tsx"));
const Offline = lazy(() => import("./pages/Offline.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const BuyCheckout = lazy(() => import("./pages/BuyCheckout.tsx"));
const SellCheckout = lazy(() => import("./pages/SellCheckout.tsx"));
const ViewTrade = lazy(() => import("./pages/Trade.tsx"));
const ViewTradeDetail = lazy(() => import("./pages/ViewTradeDetail.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const Cart = lazy(() => import("./pages/Cart.tsx"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback.tsx"));
const VendorApply = lazy(() => import("./pages/VendorApply.tsx"));
const VendorDashboard = lazy(() => import("./pages/VendorDashboard.tsx"));
const VendorStore = lazy(() => import("./pages/VendorStore.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));

setupGlobalErrorHandling();

// Fires app-ready once the full provider tree and layout are mounted.
// The HTML splash screen listens for this event and begins its fade-out.
const SplashDismisser = () => {
  useEffect(() => {
    window.dispatchEvent(new Event("app-ready"));
  }, []);
  return null;
};

// ── Silent update banner ────────────────────────────────────────────────────
// Shown for 3 seconds when a new SW version is ready, then the page reloads.
// This is non-blocking and non-disruptive - no action required from the user.
const UpdateBanner = () => (
  <div
    role="status"
    aria-live="polite"
    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2.5 bg-[#292B30] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm text-white select-none pointer-events-none"
  >
    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
    Updating to latest version…
  </div>
);

const RouterLayout = () => {
  return (
    <Configuration>
      <SnackbarProvider>
        <Provider store={store}>
          <Web3Provider>
              <AuthProvider>
                    <RampMinimalProvider
                      // defaultCustomer={{
                      //   email: "user@dezenmart.io",
                      //   first_name: "John",
                      //   last_name: "Doe",
                      // }}
                    >
                            {/* <FloatingRampButton
                              defaultMode="onramp"
                              position="bottom-right"
                              label="Buy / Sell Crypto"
                            /> */}
                                {/* <RampModal /> */}
                <TermsProvider>
                  <CurrencyProvider>
                    <WalkthroughProvider>
                      <Layout>
                        <SplashDismisser />
                        {/* No fallback UI. A lazy route resolving is not worth
                            taking the screen for: null keeps the current page
                            (header, nav and all) visible until the next one is
                            ready, instead of the full-screen blackout the old
                            Loadscreen caused. It was `fixed inset-0 z-[9999]`,
                            so despite this boundary sitting inside <Layout> and
                            wrapping only the outlet, it covered the entire app
                            and every navigation looked like a relaunch. */}
                        <Suspense fallback={null}>
                          <Outlet />
                        </Suspense>
                        <ReferralHandler />
                        <Walkthrough />
                      </Layout>
                    </WalkthroughProvider>
                  </CurrencyProvider>
                </TermsProvider>
                     </RampMinimalProvider>
              </AuthProvider>
          </Web3Provider>
        </Provider>
      </SnackbarProvider>
    </Configuration>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RouterLayout />,
    errorElement: (
      <ErrorBoundary>
        <NotFound />
      </ErrorBoundary>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/auth/google", element: <AuthCallback /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/account", element: <Account /> },
          { path: "/notifications", element: <Notifications /> },
          { path: "/trades/viewtrades", element: <ViewTrade /> },
          { path: "/trades/buy/:productId", element: <BuyCheckout /> },
          { path: "/trades/sell/:productId", element: <SellCheckout /> },
          { path: "/trades/viewtrades/:tradeId", element: <ViewTradeDetail /> },
          { path: "/orders/:orderId", element: <ViewOrderDetail /> },
          { path: "/payment/callback", element: <PaymentCallback /> },
          { path: "/vendor/apply", element: <VendorApply /> },
          { path: "/vendor", element: <VendorDashboard /> },
          { path: "/admin", element: <Admin /> },
          { path: "/chat", element: <Chat /> },
          { path: "/chat/:userId", element: <ChatDetail /> },
        ],
      },
      { path: "/cart", element: <Cart /> },
      { path: "/vendors/:vendorId", element: <VendorStore /> },
      { path: "/product", element: <Product /> },
      { path: "/product/category/:categoryName", element: <Product /> },
      { path: "/product/:productId", element: <SingleProduct /> },
      { path: "/trades", element: <ComingSoon /> },
      { path: "/community", element: <Community /> },
      { path: "/terms", element: <Legal type="terms_of_use" /> },
      { path: "/privacy", element: <Legal type="privacy_policy" /> },
      { path: "/cookies", element: <Legal type="cookie_policy" /> },
      { path: "/referral", element: <ReferralLanding /> },
      { path: "/offline", element: <Offline /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const App = () => {
  // true while the 3-second update banner is showing
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Listen for the SW update-ready event fired by serviceWorkerRegistration.ts
  useEffect(() => {
    const handler = () => {
      setShowUpdateBanner(true);
      // Give the user 3 seconds to notice, then silently reload
      setTimeout(() => {
        triggerSWUpdate(true);
      }, 3000);
    };
    window.addEventListener("pwa:update-ready", handler);
    return () => window.removeEventListener("pwa:update-ready", handler);
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      {showUpdateBanner && <UpdateBanner />}
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
