/**
 * Offline-Aware API Wrapper
 *
 * Wraps API calls to handle offline scenarios gracefully.
 * Queues mutations for background sync when offline.
 */

import { queueRequest } from './offlineSync';
import { getCachedAPIResponse, cacheAPIResponse } from './cacheStrategies';

export interface OfflineApiOptions {
  enableCache?: boolean;
  cacheDuration?: number; // in seconds
  queueIfOffline?: boolean; // Queue mutations when offline
  fallbackData?: any; // Fallback data when offline and no cache
}

/**
 * Wrapper for fetch that handles offline scenarios
 */
export const offlineAwareFetch = async (
  url: string,
  options: RequestInit & OfflineApiOptions = {}
): Promise<Response> => {
  const {
    enableCache = true,
    cacheDuration = 3600,
    queueIfOffline = true,
    fallbackData,
    ...fetchOptions
  } = options;

  const isOnline = navigator.onLine;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  // If offline and it's a mutation request
  if (!isOnline && isMutation && queueIfOffline) {
    console.log('[Offline] Queuing request for background sync:', url);

    queueRequest(
      url,
      method,
      fetchOptions.headers as Record<string, string>,
      fetchOptions.body
    );

    // Return a mock response indicating queued status
    return new Response(
      JSON.stringify({
        queued: true,
        message: 'Request queued for background sync',
      }),
      {
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // If offline and it's a GET request, try cache
  if (!isOnline && !isMutation && enableCache) {
    const cached = await getCachedAPIResponse(url);

    if (cached) {
      console.log('[Offline] Serving from cache:', url);
      return cached;
    }

    // No cache available, return fallback data if provided
    if (fallbackData) {
      console.log('[Offline] Using fallback data:', url);
      return new Response(JSON.stringify(fallbackData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // No cache and no fallback, throw error
    throw new Error('No network connection and no cached data available');
  }

  // Online - make normal request
  try {
    const response = await fetch(url, fetchOptions);

    // Cache successful GET requests
    if (response.ok && !isMutation && enableCache) {
      await cacheAPIResponse(url, response.clone(), cacheDuration);
    }

    return response;
  } catch (error) {
    // Network error - try cache as fallback
    if (!isMutation && enableCache) {
      const cached = await getCachedAPIResponse(url);
      if (cached) {
        console.log('[Network Error] Serving from cache:', url);
        return cached;
      }
    }

    // Queue mutations if offline
    if (isMutation && queueIfOffline) {
      console.log('[Network Error] Queuing request for background sync:', url);

      queueRequest(
        url,
        method,
        fetchOptions.headers as Record<string, string>,
        fetchOptions.body
      );

      return new Response(
        JSON.stringify({
          queued: true,
          message: 'Request queued due to network error',
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    throw error;
  }
};

/**
 * Create offline-aware API client
 */
export const createOfflineApiClient = (baseURL: string) => {
  return {
    get: async (endpoint: string, options?: OfflineApiOptions) => {
      const url = `${baseURL}${endpoint}`;
      return offlineAwareFetch(url, {
        method: 'GET',
        ...options,
      });
    },

    post: async (endpoint: string, data: any, options?: OfflineApiOptions) => {
      const url = `${baseURL}${endpoint}`;
      return offlineAwareFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        ...options,
      });
    },

    put: async (endpoint: string, data: any, options?: OfflineApiOptions) => {
      const url = `${baseURL}${endpoint}`;
      return offlineAwareFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        ...options,
      });
    },

    delete: async (endpoint: string, options?: OfflineApiOptions) => {
      const url = `${baseURL}${endpoint}`;
      return offlineAwareFetch(url, {
        method: 'DELETE',
        ...options,
      });
    },
  };
};
