import { lazy, type ComponentType } from "react";

const FLAG = "chunk_reload_";

/**
 * React.lazy that survives stale deploys.
 *
 * After a redeploy the chunk hashes change. A returning user whose cached
 * index.html (or service worker) still points at an old hash requests a file
 * that no longer exists; the SPA host answers with index.html (MIME text/html),
 * so the dynamic import throws "Failed to fetch dynamically imported module".
 *
 * When that happens we reload the page ONCE to pick up the fresh index.html and
 * chunk names. A sessionStorage guard prevents an infinite reload loop when the
 * failure is genuine (offline, a real missing module), in which case we rethrow
 * so the nearest error boundary can handle it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string
) {
  return lazy(async () => {
    const flag = FLAG + key;
    try {
      const mod = await factory();
      try { sessionStorage.removeItem(flag); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      let alreadyTried = false;
      try { alreadyTried = !!sessionStorage.getItem(flag); } catch { /* ignore */ }
      if (!alreadyTried) {
        try { sessionStorage.setItem(flag, "1"); } catch { /* ignore */ }
        window.location.reload();
        // Never resolve, so nothing renders in the instant before the reload.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
