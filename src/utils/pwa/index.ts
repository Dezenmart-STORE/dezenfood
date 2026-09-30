/**
 * PWA Utilities Export
 *
 * Central export for all PWA-related utilities and functions.
 */

// Service Worker Registration
export {
  registerServiceWorker,
  triggerSWUpdate,
  isPWAInstalled,
  isServiceWorkerSupported,
  getServiceWorkerRegistration,
  unregisterServiceWorker,
  skipWaitingAndActivate,
  type ServiceWorkerConfig,
} from './serviceWorkerRegistration';

// Offline Sync
export {
  getQueuedRequests,
  saveQueuedRequests,
  queueRequest,
  removeQueuedRequest,
  clearSyncQueue,
  processSyncQueue,
  setupOfflineSyncListener,
  hasPendingRequests,
  getPendingRequestsCount,
  type QueuedRequest,
} from './offlineSync';

// Cache Strategies
export {
  getCache,
  cacheStaticAssets,
  cacheFirst,
  networkFirst,
  staleWhileRevalidate,
  cacheAPIResponse,
  getCachedAPIResponse,
  clearOldCaches,
  clearAllCaches,
  getCacheSize,
  prefetchURLs,
} from './cacheStrategies';

// Offline API Wrapper
export {
  offlineAwareFetch,
  createOfflineApiClient,
  type OfflineApiOptions,
} from './offlineApiWrapper';
