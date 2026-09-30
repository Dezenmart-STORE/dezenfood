import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "../../context/AuthContext";
// import { useAuth } from "../hooks/useAuth"; // ← adjust to your auth hook path

export type RampMode = "onramp" | "offramp";

/**
 * "widget" → use the Quidax JS widget (script injection)
 * "api"    → use the custom modal with direct API calls
 */
export type RampIntegrationMode = "widget" | "api";

export interface CustomerInfo {
  email: string;
  first_name: string;
  last_name: string;
}

export interface WidgetConfig {
  /** Your Quidax public key  e.g. "pub_xxxxxxxxxxxx" */
  publicKey: string;
  /** Default amount to pre-fill (optional) */
  defaultAmount?: string;
  /** Default network (optional, e.g. "BEP20") */
  defaultNetwork?: string;
  /** Default wallet address for buy flow (optional) */
  defaultAddress?: string;
}

export interface RampContextType {
  isOpen: boolean;
  mode: RampMode;
  integrationMode: RampIntegrationMode;
  /** Resolved customer - auth user as base, overridden by anything passed to openRamp() or the provider */
  customer: CustomerInfo;
  widgetConfig: WidgetConfig | null;
  openRamp: (mode?: RampMode, customer?: Partial<CustomerInfo>) => void;
  closeRamp: () => void;
  setMode: (mode: RampMode) => void;
}

const RampContext = createContext<RampContextType | null>(null);

export const useRamp = (): RampContextType => {
  const ctx = useContext(RampContext);
  if (!ctx) throw new Error("useRamp must be used within a RampProvider");
  return ctx;
};

interface RampProviderProps {
  children: ReactNode;
  /**
   * Optional static customer override. When omitted the provider falls back
   * to the authenticated user from useAuth(), then to safe placeholder values.
   * You can also pass a partial - only the fields you supply replace the defaults.
   */
  customer?: Partial<CustomerInfo>;
  /**
   * Choose how the ramp is delivered:
   *  - "widget"  (default) → Quidax JS widget loaded via CDN script
   *  - "api"               → custom modal using direct API calls
   */
  integrationMode?: RampIntegrationMode;
  /** Required when integrationMode === "widget" */
  widgetConfig?: WidgetConfig | null;
}

/** Split a display name into first / last (best-effort) */
function splitName(name?: string | null): { first: string; last: string } {
  if (!name?.trim()) return { first: "User", last: "Name" };
  const parts = name.trim().split(/\s+/);
  return {
    first: parts[0],
    last: parts.length > 1 ? parts.slice(1).join(" ") : parts[0],
  };
}

export const RampProvider = ({
  children,
  customer: propCustomer,
  integrationMode = "widget",
  widgetConfig = null,
}: RampProviderProps) => {
  const { user: authUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<RampMode>("onramp");
  // Per-call customer override (set when openRamp is called with a customer arg)
  const [callCustomer, setCallCustomer] = useState<Partial<CustomerInfo> | null>(null);

  /**
   * Resolution order (highest → lowest priority):
   *   1. customer passed directly to openRamp()
   *   2. customer prop on <RampProvider>
   *   3. authenticated user from useAuth()
   *   4. safe placeholder values
   */
  const customer = useMemo<CustomerInfo>(() => {
    const { first, last } = splitName(authUser?.name);
    const base: CustomerInfo = {
      email: authUser?.email ?? "user@example.com",
      first_name: first,
      last_name: last,
    };
    return {
      ...base,
      ...propCustomer,   // provider-level override
      ...callCustomer,   // per-call override (highest priority)
    };
  }, [authUser, propCustomer, callCustomer]);

  const openRamp = useCallback(
    (m: RampMode = "onramp", c?: Partial<CustomerInfo>) => {
      setMode(m);
      setCallCustomer(c ?? null);
      setIsOpen(true);
    },
    []
  );

  const closeRamp = useCallback(() => {
    setIsOpen(false);
    setCallCustomer(null); // reset per-call override on close
  }, []);

  return (
    <RampContext.Provider
      value={{
        isOpen,
        mode,
        integrationMode,
        customer,
        widgetConfig,
        openRamp,
        closeRamp,
        setMode,
      }}
    >
      {children}
    </RampContext.Provider>
  );
};