/**
 * Offline Page
 *
 * Displayed when users navigate to uncached pages while offline.
 * Provides helpful information about offline capabilities.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiWifiOff, FiHome, FiPackage, FiRefreshCw } from 'react-icons/fi';

export const Offline: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-navigate back when connection restored
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Offline Icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          className="inline-block mb-6"
        >
          <div className="bg-yellow-100 dark:bg-yellow-900 p-6 rounded-full">
            <FiWifiOff className="text-6xl text-yellow-600 dark:text-yellow-400" />
          </div>
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {isOnline
            ? 'Connection restored! Reloading page...'
            : 'This page is not available offline. Check your internet connection and try again.'}
        </p>

        {/* Online Status Indicator */}
        {isOnline && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Back online</span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <FiRefreshCw className="text-lg" />
            Try Again
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <FiHome className="text-lg" />
            Go to Home
          </button>
        </div>

        {/* Available Offline Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
            <FiPackage />
            Available Offline
          </h2>

          <ul className="space-y-3 text-left text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Browse previously viewed products</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>View your order history</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Access cached product images</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Browse saved watchlist items</span>
            </li>
          </ul>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Your actions will be saved and synced automatically when you're back online.
            </p>
          </div>
        </div>

        {/* Connection Tips */}
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            Connection troubleshooting tips
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400 pl-4">
            <li>• Check if your WiFi or mobile data is turned on</li>
            <li>• Try switching between WiFi and mobile data</li>
            <li>• Move to an area with better signal</li>
            <li>• Restart your device if the issue persists</li>
          </ul>
        </details>
      </motion.div>
    </div>
  );
};

export default Offline;
