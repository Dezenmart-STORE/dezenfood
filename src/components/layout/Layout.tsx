import Header from "./Header.tsx";
import Footer from "./Footer.tsx";
import MobileNavigation from "./MobileNavigation.tsx";
import { useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import ErrorBoundary from "../error/ErrorBoundary.tsx";
import { OfflineIndicator } from "../pwa/OfflineIndicator.tsx";
import { InstallPrompt } from "../pwa/InstallPrompt.tsx";
import { registerServiceWorker } from "../../utils/pwa/serviceWorkerRegistration";
import { setupOfflineSyncListener } from "../../utils/pwa/offlineSync";
import WrongNetworkBanner from "../wallet/WrongNetworkBanner";
import MiniPayAutoConnect from "../wallet/MiniPayAutoConnect";
import LoginNudge from "../auth/LoginNudge";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [loginNudgeVisible, setLoginNudgeVisible] = useState(false);
  const handleNudgeVisibility = useCallback((v: boolean) => setLoginNudgeVisible(v), []);
  // When a popup (install prompt) is showing, slide the mobile nav out of the way.
  const [installVisible, setInstallVisible] = useState(false);

  // Pages that should not display header/footer
  const isAuthPage = ["/login", "/auth/google"].includes(location.pathname);

  // Register service worker and setup offline sync (only once)
  useEffect(() => {
    // Register service worker
    registerServiceWorker({
      onOfflineReady: () => {
        console.log('[PWA] App is ready to work offline');
      },
      onNeedRefresh: () => {
        console.log('[PWA] New content is available');
      },
    });

    // Setup offline sync listener
    const cleanupSync = setupOfflineSyncListener();

    return () => {
      cleanupSync();
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    // Immediate scroll without animation for faster navigation
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {/* Offline Status Indicator */}
      <OfflineIndicator showOnlineStatus={true} />

      {/* PWA Install Prompt - suppressed while login nudge is visible.
          Slides in from the right; the mobile nav slides out below it. */}
      <InstallPrompt suppressWhile={loginNudgeVisible} onVisibleChange={setInstallVisible} />

      {/* Login nudge - shown only outside auth pages */}
      {!isAuthPage && <LoginNudge onVisibilityChange={handleNudgeVisibility} />}

      {!isAuthPage && <Header />}
      <ErrorBoundary>
        {/* pt-14 = 56px padding-top to account for fixed header */}
        <main className="h-full pb-16 md:pb-0 pt-14 md:pt-16">
          {/* WrongNetworkBanner: always mounted (drives auto-switch on connect),
              renders null when wallet is disconnected or already on Celo */}
          {!isAuthPage && <WrongNetworkBanner />}
          {/* MiniPayAutoConnect: always mounted, silently connects the MiniPay
              wallet on app load without requiring user interaction. No-op on
              non-MiniPay devices. */}
          {!isAuthPage && <MiniPayAutoConnect />}
          {children}
        </main>
      </ErrorBoundary>
      {!isAuthPage && (
        <>
          <MobileNavigation hidden={installVisible} />
          <Footer />
        </>
      )}
    </>
  );
};

export default Layout;
