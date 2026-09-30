/**
 * Offline Indicator Component
 *
 * Displays connection status and offline capabilities to users.
 * Shows a banner when offline with information about available features.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiWifi, FiWifiOff, FiAlertCircle } from 'react-icons/fi';

interface OfflineIndicatorProps {
  showOnlineStatus?: boolean; // Show brief notification when coming back online
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showOnlineStatus = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (showOnlineStatus) {
        setShowOnlineNotification(true);
        setTimeout(() => setShowOnlineNotification(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineNotification(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showOnlineStatus]);

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white shadow-lg"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiWifiOff className="text-2xl" />
                  <div>
                    <p className="font-semibold">You're offline</p>
                    <p className="text-sm opacity-90">
                      You can still browse cached products and view your orders
                    </p>
                  </div>
                </div>
                <FiAlertCircle className="text-xl opacity-75" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Notification (brief) */}
      <AnimatePresence>
        {showOnlineNotification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white shadow-lg"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-center gap-3">
                <FiWifi className="text-2xl" />
                <p className="font-semibold">Back online - syncing your data...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Connection Status Badge
 *
 * Small badge for showing connection status in UI
 */
export const ConnectionStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isOnline
          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      }`}
    >
      {isOnline ? (
        <>
          <FiWifi className="text-base" />
          <span>Online</span>
        </>
      ) : (
        <>
          <FiWifiOff className="text-base" />
          <span>Offline</span>
        </>
      )}
    </motion.div>
  );
};

/**
 * Hook for detecting online/offline status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
