import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import { UserProfile } from "../utils/types";
import { setSentryUser, clearSentryUser } from "../utils/sentry.config";
// import { useWallet } from "../utils/hooks/useWallet";

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  exp: number;
  id?: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: string) => void;
  /** Exchange a Google One Tap ID token for our session, in place. */
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  // loginWithWallet: (walletAddress: string) => Promise<void>;
  handleUserUpdate: (userData: any) => void;
  handleAuthCallback: (token: string, userData: any) => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const storage = localStorage;
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const { account } = useWallet();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = storage.getItem(TOKEN_KEY);
        const storedUser = storage.getItem(USER_KEY);

        if (token && storedUser) {
          // Verify token hasn't expired
          try {
            const decoded = jwtDecode<JwtPayload>(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
              clearAuthState();
              // console.log("Token expired, clearing auth state");
            } else {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setSentryUser({ id: parsedUser._id, name: parsedUser.name, email: parsedUser.email });
            }
          } catch (error) {
            console.error("Invalid token:", error);
            clearAuthState();
          }
        } else {
          // console.log("No token or user found in storage");
        }
      } catch (error) {
        // console.error("Error checking auth status:", error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const clearAuthState = () => {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    setUser(null);
    clearSentryUser();
  };

  const login = (provider: string) => {
    const API_URL = import.meta.env.VITE_API_URL;
    const FRONTEND_URL = window.location.origin; // Automatically gets current URL

    if (provider === "google") {
      // Always come back to the origin the request was made from
      // (dezenmart.com, the netlify preview, or localhost), not a hardcoded host.
      const origin = FRONTEND_URL;
      const redirectUrl = `${API_URL}/auth/google?origin=${encodeURIComponent(origin)}`;
      window.location.href = redirectUrl;
    }
  };

  // const loginWithWallet = async (walletAddress: any) => {
  //   try {
  //     setIsLoading(true);
  //     console.log("Wallet login attempted with:", walletAddress);

  //     // TODO: Implement actual wallet authentication API call

  //     return walletAddress;
  //   } catch (error) {
  //     console.error("Error logging in with wallet:", error);
  //     throw error;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   const attemptWalletLogin = async () => {
  //     if (account && !user && !isLoading) {
  //       try {
  //         await loginWithWallet(account);
  //       } catch (error) {
  //         console.error("Auto wallet login failed:", error);
  //       }
  //     }
  //   };

  //   attemptWalletLogin();
  // }, [account, user, isLoading]);

  const NUDGE_ACCOUNT_KEY = "nudge_last_account";

  const saveLastAccount = (userData: UserProfile) => {
    try {
      localStorage.setItem(NUDGE_ACCOUNT_KEY, JSON.stringify({
        name: userData.name,
        email: userData.email,
        picture: typeof userData.profileImage === "string" ? userData.profileImage : null,
      }));
    } catch {}
  };

  // One Tap hands us a Google ID token; the backend verifies it and returns our
  // session. No redirect/popup, so auth state updates in place.
  const loginWithGoogleCredential = async (credential: string): Promise<void> => {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await fetch(`${API_URL}/auth/google/one-tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error("Google sign-in failed");
    const json = await res.json().catch(() => ({}));
    const token: string | undefined = json?.data?.token ?? json?.token;
    if (!token) throw new Error("Google sign-in failed: no token returned");

    let profile: UserProfile | undefined = json?.data?.user ?? json?.user;
    if (!profile) {
      // Backend returned only a token - fetch the profile with it.
      storage.setItem(TOKEN_KEY, token);
      const p = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pj = await p.json().catch(() => ({}));
      profile = (pj?.data ?? pj) as UserProfile;
    }
    handleAuthCallback(token, profile);
  };

  const handleAuthCallback = (token: string, userData: UserProfile) => {
    try {
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      setSentryUser({ id: userData._id, name: userData.name, email: userData.email });
      saveLastAccount(userData);
    } catch (error) {
      console.error("Error in handleAuthCallback:", error);
      clearAuthState();
    }
  };

  const handleUserUpdate = (userData: UserProfile) => {
    try {
      storage.setItem(USER_KEY, JSON.stringify(userData));

      setUser(userData);
    } catch (error) {
      console.error("Error in handleUserUpdate:", error);
    }
  };

  const logout = () => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith("terms_status_") ||
        key.startsWith("terms_timestamp_")
      ) {
        localStorage.removeItem(key);
      }
    });
    clearAuthState();
  };

  const getToken = (): string | null => {
    return storage.getItem(TOKEN_KEY);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogleCredential,
    // loginWithWallet,
    handleAuthCallback,
    handleUserUpdate,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
