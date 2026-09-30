import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type RampMode = "onramp" | "offramp";

export interface CustomerInfo {
  email: string;
  first_name: string;
  last_name: string;
}

export interface RampContextType {
  isOpen: boolean;
  mode: RampMode;
  customer: CustomerInfo | null;
  openRamp: (mode?: RampMode, customer?: CustomerInfo) => void;
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
  defaultCustomer?: CustomerInfo;
}

export const RampProvider = ({ children, defaultCustomer }: RampProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<RampMode>("onramp");
  const [customer, setCustomer] = useState<CustomerInfo | null>(
    defaultCustomer ?? null
  );

  const openRamp = useCallback(
    (m: RampMode = "onramp", c?: CustomerInfo) => {
      console.log("lslsl",isOpen)
      setIsOpen(true);
      setMode(m);
      if (c) setCustomer(c);
    },
    []
  );

  const closeRamp = useCallback(() => setIsOpen(false), []);

  return (
    <RampContext.Provider value={{ isOpen, mode, customer, openRamp, closeRamp, setMode }}>
      {children}
    </RampContext.Provider>
  );
};
