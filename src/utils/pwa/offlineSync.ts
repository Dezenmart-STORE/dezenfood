/**
 * Offline Sync Utilities
 *
 * Handles background sync for failed requests when offline.
 * Queues requests and retries them when connection is restored.
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'pwa-sync-queue';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Get queued requests from localStorage
 */
export const getQueuedRequests = (): QueuedRequest[] => {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('[Sync] Error reading sync queue', error);
    return [];
  }
};

/**
 * Save queued requests to localStorage
 */
export const saveQueuedRequests = (queue: QueuedRequest[]) => {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Sync] Error saving sync queue', error);
  }
};

/**
 * Add request to sync queue
 */
export const queueRequest = (
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: any
): void => {
  const queue = getQueuedRequests();

  const request: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(request);
  saveQueuedRequests(queue);

  console.log('[Sync] Request queued for background sync', request.id);
};

/**
 * Remove request from queue
 */
export const removeQueuedRequest = (id: string): void => {
  const queue = getQueuedRequests();
  const filtered = queue.filter(req => req.id !== id);
  saveQueuedRequests(filtered);
};

/**
 * Clear all queued requests
 */
export const clearSyncQueue = (): void => {
  localStorage.removeItem(SYNC_QUEUE_KEY);
};

/**
 * Process queued requests when back online
 */
export const processSyncQueue = async (): Promise<{
  success: number;
  failed: number;
  total: number;
}> => {
  const queue = getQueuedRequests();

  if (queue.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  console.log(`[Sync] Processing ${queue.length} queued requests`);

  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: QueuedRequest[] = [];

  for (const request of queue) {
    try {
      // Check if request is too old (older than 24 hours)
      const isExpired = Date.now() - request.timestamp > 24 * 60 * 60 * 1000;

      if (isExpired) {
        console.log('[Sync] Request expired, removing from queue', request.id);
        failedCount++;
        continue;
      }

      // Check if max retry count exceeded
      if (request.retryCount >= MAX_RETRY_COUNT) {
        console.log('[Sync] Max retry count exceeded, removing from queue', request.id);
        failedCount++;
        continue;
      }

      // Attempt to retry the request
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      if (response.ok) {
        console.log('[Sync] Request successfully synced', request.id);
        successCount++;
      } else {
        // Increment retry count and re-queue
        request.retryCount++;
        remainingQueue.push(request);
        console.log(`[Sync] Request failed (retry ${request.retryCount}/${MAX_RETRY_COUNT})`, request.id);
      }
    } catch (error) {
      // Network error - increment retry count and re-queue
      request.retryCount++;

      if (request.retryCount < MAX_RETRY_COUNT) {
        remainingQueue.push(request);
        console.log(`[Sync] Request error (retry ${request.retryCount}/${MAX_RETRY_COUNT})`, request.id, error);
      } else {
        failedCount++;
        console.log('[Sync] Request failed permanently', request.id, error);
      }
    }
  }

  // Save remaining requests back to queue
  saveQueuedRequests(remainingQueue);

  const result = {
    success: successCount,
    failed: failedCount,
    total: queue.length,
  };

  console.log('[Sync] Queue processing complete', result);
  return result;
};

/**
 * Setup online event listener to process queue
 */
export const setupOfflineSyncListener = (): (() => void) => {
  const handleOnline = async () => {
    console.log('[Sync] Connection restored, processing sync queue');

    // Small delay to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

    await processSyncQueue();
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
};

/**
 * Check if there are pending requests in queue
 */
export const hasPendingRequests = (): boolean => {
  const queue = getQueuedRequests();
  return queue.length > 0;
};

/**
 * Get pending requests count
 */
export const getPendingRequestsCount = (): number => {
  const queue = getQueuedRequests();
  return queue.length;
};
