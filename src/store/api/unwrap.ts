/**
 * Normalise a list response into a plain array.
 *
 * The backend has been migrating endpoints to an envelope like
 * `{ status, results, data: { orders: [...] } }`, while older ones still return
 * a bare array. This tolerates both: a bare array, `data` being an array, or the
 * first array found under `data` (orders / rewards / addresses / etc.).
 */
export function unwrapList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const data = (response as { data?: unknown } | null | undefined)?.data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const arr = Object.values(data as Record<string, unknown>).find(Array.isArray);
    if (arr) return arr as T[];
  }
  return [];
}
