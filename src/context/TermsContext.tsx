import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useAcceptTermsMutation } from "../store/api";

/**
 * Records Terms acceptance on first login.
 *
 * Acceptance is captured on the login screen itself ("By continuing, you agree
 * to our Terms of Service, Privacy Policy & Cookie Policy"), so there is no
 * blocking modal. Once a signed-in user is seen without hasAcceptedTerms, we
 * record that acceptance silently in the background.
 */
export const TermsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, isLoading: authLoading, handleUserUpdate } = useAuth();
  const [acceptUserTerms] = useAcceptTermsMutation();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    if (user.hasAcceptedTerms) {
      recordedRef.current = true;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;

    acceptUserTerms()
      .unwrap()
      .then((result) => {
        if (result?.data?.user) handleUserUpdate(result.data.user);
      })
      .catch((error) => {
        // Non-fatal - allow another attempt on the next load.
        recordedRef.current = false;
        console.error("Failed to record terms acceptance:", error);
      });
  }, [authLoading, isAuthenticated, user, acceptUserTerms, handleUserUpdate]);

  return <>{children}</>;
};
