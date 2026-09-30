import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";

interface WalkthroughContextType {
  isWalkthroughActive: boolean;
  currentStep: number;
  totalSteps: number;
  startWalkthrough: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipWalkthrough: () => void;
  completeWalkthrough: () => void;
  resetWalkthrough: () => void;
  hasCompletedWalkthrough: boolean;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(
  undefined
);

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error(
      "useWalkthrough must be used within a WalkthroughProvider"
    );
  }
  return context;
};

interface WalkthroughProviderProps {
  children: ReactNode;
}

const WALKTHROUGH_STORAGE_KEY = "dezenmart_walkthrough_completed";
// Must equal walkthroughSteps.length in components/walkthrough/Walkthrough.tsx
const TOTAL_STEPS = 5;

export const WalkthroughProvider = ({
  children,
}: WalkthroughProviderProps) => {
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedWalkthrough, setHasCompletedWalkthrough] = useState(() => {
    try {
      const completed = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
      return completed === "true";
    } catch {
      return false;
    }
  });

  // Auto-start walkthrough for new users
  useEffect(() => {
    if (!hasCompletedWalkthrough) {
      // Delay to let the app load first
      const timer = setTimeout(() => {
        setIsWalkthroughActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedWalkthrough]);

  const startWalkthrough = useCallback(() => {
    setCurrentStep(0);
    setIsWalkthroughActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < TOTAL_STEPS - 1) {
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipWalkthrough = useCallback(() => {
    try {
      localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
      setHasCompletedWalkthrough(true);
      setIsWalkthroughActive(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Failed to save walkthrough status:", error);
    }
  }, []);

  const completeWalkthrough = useCallback(() => {
    try {
      localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
      setHasCompletedWalkthrough(true);
      setIsWalkthroughActive(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Failed to save walkthrough status:", error);
    }
  }, []);

  const resetWalkthrough = useCallback(() => {
    try {
      localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
      setHasCompletedWalkthrough(false);
      setCurrentStep(0);
      setIsWalkthroughActive(true);
    } catch (error) {
      console.error("Failed to reset walkthrough:", error);
    }
  }, []);

  const value = {
    isWalkthroughActive,
    currentStep,
    totalSteps: TOTAL_STEPS,
    startWalkthrough,
    nextStep,
    previousStep,
    skipWalkthrough,
    completeWalkthrough,
    resetWalkthrough,
    hasCompletedWalkthrough,
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
};
