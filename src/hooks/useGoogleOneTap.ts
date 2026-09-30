import { useCallback, useEffect, useRef, useState } from "react";

// Google Identity Services (One Tap). Enabled only when a client id is set;
// otherwise the caller falls back to the redirect/popup flow.
const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const GOOGLE_ONE_TAP_ENABLED = !!CLIENT_ID;

let scriptPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    // deno-lint-ignore no-explicit-any
    if ((window as any).google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Options {
  enabled: boolean;
  /** Called with the Google ID token when the user picks an account. */
  onCredential: (credential: string) => void;
  /** Called when One Tap can't be shown (dismissed, cooldown, unsupported). */
  onUnavailable?: () => void;
}

/**
 * Loads Google Identity Services and drives the One Tap prompt (the in-page
 * "Continue as …" bubble). No page navigation; the credential is handed back
 * for exchange with our backend.
 */
export function useGoogleOneTap({ enabled, onCredential, onUnavailable }: Options) {
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const credRef = useRef(onCredential);
  const unavailRef = useRef(onUnavailable);
  credRef.current = onCredential;
  unavailRef.current = onUnavailable;

  useEffect(() => {
    if (!enabled || !CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled) return;
        // deno-lint-ignore no-explicit-any
        const g = (window as any).google;
        if (!g?.accounts?.id) {
          unavailRef.current?.();
          return;
        }
        if (!initialized.current) {
          g.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (resp: { credential?: string }) => {
              if (resp?.credential) credRef.current(resp.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          initialized.current = true;
        }
        setReady(true);
      })
      .catch(() => unavailRef.current?.());
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const prompt = useCallback(() => {
    // deno-lint-ignore no-explicit-any
    const g = (window as any).google;
    if (!g?.accounts?.id) {
      unavailRef.current?.();
      return;
    }
    // deno-lint-ignore no-explicit-any
    g.accounts.id.prompt((notification: any) => {
      try {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          unavailRef.current?.();
        }
      } catch {
        /* FedCM: these helpers may be absent; ignore */
      }
    });
  }, []);

  const cancel = useCallback(() => {
    // deno-lint-ignore no-explicit-any
    (window as any).google?.accounts?.id?.cancel?.();
  }, []);

  return { ready, prompt, cancel };
}
