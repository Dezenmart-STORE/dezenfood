import { useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoSVG } from ".";
import Login from "./Login";
import { storeReferralCode } from "../utils/referralUtils";
// import { useReferralData } from "../utils/hooks/useReferralData";
import { useAuth } from "../context/AuthContext";
import { useSEO } from "../hooks/useSEO";
import { PAGE_SEO } from "../utils/seo/seoConfig";

const ReferralLanding = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  //   const { applyCode } = useReferralData();

  // SEO Configuration for Referral page
  useSEO({
    title: PAGE_SEO.referral.title,
    description: PAGE_SEO.referral.description,
    keywords: PAGE_SEO.referral.keywords,
  });

  useEffect(() => {
    const referralCode = searchParams.get("code");

    if (referralCode) {
      storeReferralCode(referralCode);
    }
  }, [searchParams]);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return <Login isFromReferral={true} />;
};

export default ReferralLanding;
