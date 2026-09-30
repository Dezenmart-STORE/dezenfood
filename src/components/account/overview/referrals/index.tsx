import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import PointsDisplay from "./PointsDisplay";
import ReferralInvite from "./Invite";
import ReferralHistory from "./History";
import ReferralSkeleton from "./Skeleton";
import { RewardItem, Reward } from "../../../../utils/types";
import { useGetReferralInfoQuery } from "../../../../store/api/referralsApi";
import { useGetRewardsQuery, useGetRewardsSummaryQuery } from "../../../../store/api/rewardsApi";

const ReferralsTab = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const inviteRef = useRef(null);

  // RTK Query hooks
  const { data: referralInfo, isLoading: referralLoading, error: referralError } = useGetReferralInfoQuery();
  const { data: rewardSummary, isLoading: summaryLoading } = useGetRewardsSummaryQuery();
  const { data: rewards = [], isLoading: rewardsLoading, error: rewardsError } = useGetRewardsQuery();

  const loading = referralLoading || rewardsLoading || summaryLoading;
  const error = referralError || rewardsError;

  const availablePoints = rewardSummary?.availablePoints || 0;
  const totalPoints = rewardSummary?.totalPoints || 0;

  // const handleInviteFriends = useCallback(() => {
  //   setIsShareModalOpen(true);
  // }, []);

  const formatRewardsHistory = useCallback(() => {
    if (!rewards || rewards.length === 0) return [];

    return rewards.map((reward: Reward): RewardItem => {
      const getActionTypeDisplay = (actionType: string) => {
        const actionMap: { [key: string]: string } = {
          FIRST_PURCHASE: "First Purchase Bonus",
          REFERRAL_BONUS: "Referral Bonus",
          PURCHASE: "Purchase Reward",
          PRODUCT_REVIEW: "Review Reward",
          SIGNUP: "Signup Bonus",
          REFERRAL_SIGNUP: "Friend Signup",
          DAILY_LOGIN: "Daily Login",
        };

        return actionMap[actionType] || actionType;
      };

      return {
        id: reward._id,
        name: "",
        type: getActionTypeDisplay(reward.actionType),
        points: reward.points,
        date: new Date(reward.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Completed",
      };
    });
  }, [rewards]);

  // RTK Query handles data fetching automatically
  // No need for manual useEffect

  if (loading) {
    return <ReferralSkeleton />;
  }

  if (error) {
    return (
      <motion.div
        className="py-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-red-400">Failed to load referral data. Please try again later.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PointsDisplay
        activePoints={availablePoints || 0}
        usedPoints={(totalPoints || 0) - (availablePoints || 0)}
      />

      <ReferralInvite
        promoCode={referralInfo?.referralCode || ""}
        shareLink={referralInfo?.referralCode ? `${window.location.origin}/referral?code=${referralInfo.referralCode}` : ""}
        isShareModalOpen={isShareModalOpen}
        setIsShareModalOpen={setIsShareModalOpen}
        referralCount={referralInfo?.referralCount || 0}
        ref={inviteRef}
      />

      <ReferralHistory
        history={formatRewardsHistory()}
        // onInviteFriends={handleInviteFriends}
      />
    </motion.div>
  );
};

export default ReferralsTab;
