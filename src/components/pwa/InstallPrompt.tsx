/**
 * Install Prompt Component
 *
 * Prompts users to install the PWA app to their home screen.
 * Handles both A2HS (Add to Home Screen) events and custom install UI.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiSmartphone } from 'react-icons/fi';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC<{
  suppressWhile?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}> = ({ suppressWhile = false, onVisibleChange }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Tell the layout when we're visible so the mobile nav can slide out of the way.
  const visible = showPrompt && !suppressWhile && !isInstalled && !!deferredPrompt;
  useEffect(() => {
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check localStorage to see if user dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Don't show again if dismissed within last 30 days
      if (daysSinceDismissed < 30) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show the install prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
      // Remember that user dismissed it
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't render if already installed or no prompt available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
          <motion.div
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[60] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-Red to-brand-hover p-4 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                    <FiSmartphone className="text-2xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Install DezenFoods</h3>
                    <p className="text-sm opacity-90">Get the app experience</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded-full transition-colors"
                  aria-label="Dismiss"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Works offline - browse cached products</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Faster loading with smart caching</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Add to home screen for quick access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Push notifications for order updates</span>
                </li>
              </ul>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-Red hover:bg-brand-hover text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FiDownload className="text-lg" />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Not Now
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                Free - No app store required
              </p>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Mini Install Button
 *
 * Small button for header/navbar to manually trigger install
 */
export const InstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-3 py-2 bg-Red hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors"
      aria-label="Install app"
    >
      <FiDownload />
      <span className="hidden sm:inline">Install</span>
    </button>
  );
};
