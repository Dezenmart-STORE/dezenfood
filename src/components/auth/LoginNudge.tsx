import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useGoogleOneTap, GOOGLE_ONE_TAP_ENABLED } from "../../hooks/useGoogleOneTap";

const APPEAR_DELAY_MS = 2000;

interface LoginNudgeProps {
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * Login nudge = Google One Tap only. When VITE_GOOGLE_CLIENT_ID is set we drive
 * the in-page One Tap prompt (choose account -> verify -> signed in, no reload);
 * auth-tied UI updates via useAuth. When it isn't set, nothing shows.
 */
const LoginNudge: React.FC<LoginNudgeProps> = ({ onVisibilityChange }) => {
  const { isAuthenticated, isLoading, loginWithGoogleCredential } = useAuth();
  const promptedRef = useRef(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        await loginWithGoogleCredential(credential);
        // isAuthenticated flips -> the header and other useAuth consumers update.
      } catch (err) {
        console.error("One Tap sign-in failed:", err);
      }
    },
    [loginWithGoogleCredential]
  );

  const { ready, prompt, cancel } = useGoogleOneTap({
    enabled: GOOGLE_ONE_TAP_ENABLED && !isLoading && !isAuthenticated,
    onCredential: handleCredential,
  });

  // Show the One Tap prompt once GIS is ready and the user isn't signed in.
  useEffect(() => {
    if (!GOOGLE_ONE_TAP_ENABLED || isLoading || isAuthenticated) return;
    if (!ready || promptedRef.current) return;
    const t = setTimeout(() => {
      promptedRef.current = true;
      prompt();
    }, APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [ready, isLoading, isAuthenticated, prompt]);

  // Close the prompt once signed in.
  useEffect(() => {
    if (isAuthenticated) cancel();
  }, [isAuthenticated, cancel]);

  // No custom UI - Google renders the One Tap bubble itself.
  useEffect(() => {
    onVisibilityChange?.(false);
  }, [onVisibilityChange]);

  return null;
};

export default LoginNudge;
