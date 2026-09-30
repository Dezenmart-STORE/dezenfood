import { useEffect, useSyncExternalStore } from "react";

/**
 * App-wide "is any modal open" signal, ref-counted so nested/stacked modals
 * behave. Modals register with useModalPresence(); the mobile nav reads
 * useAnyModalOpen() to get out of the way (it otherwise overlaps bottom-sheet
 * modals). Kept as a module store so there's no provider to thread.
 */
let count = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const increment = () => {
  count += 1;
  emit();
};
const decrement = () => {
  count = Math.max(0, count - 1);
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** True while at least one modal is open anywhere in the app. */
export const useAnyModalOpen = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false
  );

/**
 * Mark a modal as present while `active` is true (default true, for modals that
 * are simply mounted when shown). Automatically released on unmount.
 */
export function useModalPresence(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;
    increment();
    return decrement;
  }, [active]);
}
