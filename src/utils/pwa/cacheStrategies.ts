/**
 * Cache Strategies for Offline Support
 *
 * Utilities for managing cache and implementing custom caching strategies
 * for different types of resources.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `dezenfoods-static-${CACHE_VERSION}`,
  dynamic: `dezenfoods-dynamic-${CACHE_VERSION}`,
  api: `dezenfoods-api-${CACHE_VERSION}`,
  images: `dezenfoods-images-${CACHE_VERSION}`,
};

/**
 * Get cache by type
 */
export const getCache = async (type: keyof typeof CACHE_NAMES): Promise<Cache> => {
  return await caches.open(CACHE_NAMES[type]);
};

/**
 * Cache static assets (app shell)
 */
export const cacheStaticAssets = async (urls: string[]): Promise<void> => {
  const cache = await getCache('static');
  await cache.addAll(urls);
  console.log('[Cache] Static assets cached', urls);
};

/**
 * Cache First Strategy
 * Try cache first, fallback to network if not found
 */
export const cacheFirst = async (request: Request): Promise<Response> => {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[Cache] Serving from cache:', request.url);
    return cached;
  }

  console.log('[Cache] Fetching from network:', request.url);
  const response = await fetch(request);

  // Cache successful responses
  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
};

/**
 * Network First Strategy
 * Try network first, fallback to cache if offline
 */
export const networkFirst = async (
  request: Request,
  timeout = 5000
): Promise<Response> => {
  const cache = await caches.open(CACHE_NAMES.dynamic);

  try {
    // Race between network request and timeout
    const response = await Promise.race([
      fetch(request),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      ),
    ]);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[Cache] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
};

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately, update cache in background
 */
export const staleWhileRevalidate = async (request: Request): Promise<Response> => {
  const cache = await caches.open(CACHE_NAMES.dynamic);
  const cached = await cache.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached data immediately if available
  return cached || fetchPromise;
};

/**
 * Cache API responses with expiration
 */
export const cacheAPIResponse = async (
  url: string,
  response: Response,
  maxAge = 3600 // 1 hour in seconds
): Promise<void> => {
  const cache = await getCache('api');

  // Clone response and add timestamp header
  const clonedResponse = response.clone();
  const blob = await clonedResponse.blob();
  const headers = new Headers(clonedResponse.headers);
  headers.set('sw-cache-timestamp', Date.now().toString());
  headers.set('sw-cache-maxage', maxAge.toString());

  const cachedResponse = new Response(blob, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers,
  });

  await cache.put(url, cachedResponse);
};

/**
 * Get cached API response if not expired
 */
export const getCachedAPIResponse = async (url: string): Promise<Response | null> => {
  const cache = await getCache('api');
  const cached = await cache.match(url);

  if (!cached) {
    return null;
  }

  // Check expiration
  const timestamp = cached.headers.get('sw-cache-timestamp');
  const maxAge = cached.headers.get('sw-cache-maxage');

  if (timestamp && maxAge) {
    const age = (Date.now() - parseInt(timestamp)) / 1000;
    if (age > parseInt(maxAge)) {
      console.log('[Cache] Cached API response expired:', url);
      await cache.delete(url);
      return null;
    }
  }

  return cached;
};

/**
 * Clear old caches
 */
export const clearOldCaches = async (): Promise<void> => {
  const cacheNames = await caches.keys();
  const currentCaches = Object.values(CACHE_NAMES);

  await Promise.all(
    cacheNames
      .filter(name => !currentCaches.includes(name))
      .map(name => {
        console.log('[Cache] Deleting old cache:', name);
        return caches.delete(name);
      })
  );
};

/**
 * Clear all caches
 */
export const clearAllCaches = async (): Promise<void> => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[Cache] All caches cleared');
};

/**
 * Get cache size (approximate)
 */
export const getCacheSize = async (): Promise<number> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
};

/**
 * Prefetch important URLs
 */
export const prefetchURLs = async (urls: string[]): Promise<void> => {
  const cache = await getCache('dynamic');

  await Promise.allSettled(
    urls.map(async url => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log('[Cache] Prefetched:', url);
        }
      } catch (error) {
        console.warn('[Cache] Failed to prefetch:', url, error);
      }
    })
  );
};
