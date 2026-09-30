import { useEffect, useState, startTransition } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGetUserProfileQuery } from "../store/api";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(false);

  // Only fetch profile after token is set
  const { data: userProfile } = useGetUserProfileQuery(undefined, {
    skip: !shouldFetch,
  });

  useEffect(() => {
    const processAuth = async () => {
      try {
        const token = searchParams.get("token");
        const userId = searchParams.get("userId");

        if (!token || !userId) {
          throw new Error("Authentication failed: Missing token or user ID");
        }

        localStorage.setItem("auth_token", token);
        // Trigger the profile fetch after token is stored
        setShouldFetch(true);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [searchParams]);

  // Handle successful profile fetch
  useEffect(() => {
    if (userProfile && shouldFetch) {
      const token = searchParams.get("token");
      if (token) {
        handleAuthCallback(token, userProfile);
        // A router push is enough. This used to need a full page load, because
        // the Dezen wallet's provider tree was only mounted for page loads that
        // already had a session. The web3 tree is now identical for every
        // visitor, so there is nothing to bring up by reloading.
        startTransition(() => {
          navigate("/", { replace: true });
        });
      }
    }
  }, [userProfile, shouldFetch, searchParams, handleAuthCallback, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-Dark">
        <div className="bg-[#292B30] p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-Red text-2xl font-bold mb-4">
            Authentication Error
          </h2>
          <p className="text-white mb-6">{error}</p>
          <button
            onClick={() => startTransition(() => navigate("/login"))}
            className="bg-Red text-white px-4 py-2 rounded hover:bg-opacity-90 transition-all w-full"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    // The one place a loader still earns its keep: arriving here from the OAuth
    // redirect there is no previous page to hold on screen. A small spinner
    // rather than the old branded full-screen animation - the splash already
    // played on this page load.
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#212428]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#292B30] border-t-red-600" />
          <p className="text-sm text-gray-500">Signing you in…</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
