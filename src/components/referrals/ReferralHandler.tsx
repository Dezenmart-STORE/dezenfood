import { useEffect, useState } from "react";
import { useApplyReferralCodeMutation } from "../../store/api";
import { useAuth } from "../../context/AuthContext";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
} from "../../utils/referralUtils";

const ReferralHandler: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [applyReferralCode] = useApplyReferralCodeMutation();
  const [isProcessed, setIsProcessed] = useState(false);

  useEffect(() => {
    const handleStoredReferralCode = async () => {
      if (!isAuthenticated || isProcessed) return;

      const storedCode = getPendingReferralCode();
      if (!storedCode) return;

      try {
        await applyReferralCode(storedCode).unwrap();
      } catch (error) {
        console.error("Failed to apply referral code:", error);
      } finally {
        clearPendingReferralCode();
        setIsProcessed(true);
      }
    };

    handleStoredReferralCode();
  }, [isAuthenticated, applyReferralCode, isProcessed]);

  return null;
};

export default ReferralHandler;
