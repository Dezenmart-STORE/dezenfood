import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import Container from "../components/common/Container";
import ProfileHeader from "../components/account/ProfileHeader";
import TabNavigation from "../components/account/overview/TabNavigation";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useGetUserProfileQuery } from "../store/api";
import { TabOption, TabType } from "../utils/types";
import { useAuth } from "../context/AuthContext";
import { lazyWithReload } from "../utils/lazyWithReload";
// Heavy (@selfxyz ~2MB): load only when the verification modal opens.
const SefldVerification = lazyWithReload(() => import("../components/common/SefldVerification"), "SefldVerification");
import DeliveryAddressManager from "../components/account/DeliveryAddressManager";
import { LiaAngleLeftSolid } from "react-icons/lia";

const TabContent = lazy(() => import("../components/account/overview/TabContent"));
const EditProfile = lazy(() => import("../components/account/edit/EditProfile"));
const Settings    = lazy(() => import("../components/account/settings/Settings"));
const Safety      = lazy(() => import("../components/account/settings/Safety"));
const TwoFactorAuth = lazy(() => import("../components/account/settings/TwoFactorAuth"));
const HelpSupport = lazy(() => import("../components/account/settings/HelpSupport"));
const About       = lazy(() => import("../components/account/settings/About"));

const TAB_OPTIONS: TabOption[] = [
  { id: "1", label: "Saved Items" },
  { id: "2", label: "Rewards" },
  { id: "3", label: "Order History" },
  { id: "4", label: "Disputes" },
  { id: "5", label: "Sell / My Menu" },
];

export type AccountViewState =
  | "overview"
  | "settings"
  | "edit-profile"
  | "delivery-addresses"
  | "safety"
  | "two-factor"
  | "help"
  | "about"
  | "rate";

const Loader = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <LoadingSpinner />
  </div>
);

// ---------- Rate the App view ----------

const STARS = [1, 2, 3, 4, 5];

const RateApp = ({ onBack }: { onBack: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // In production: POST to /feedback with { rating, feedback }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 px-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Thank you!</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          Your feedback helps us build a better marketplace for everyone.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-2.5 rounded-xl bg-[#292B30] text-white text-sm font-medium hover:bg-[#333940] transition-colors"
        >
          Back to settings
        </button>
      </motion.div>
    );
  }

  const active = hovered || rating;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <div className="flex items-center gap-3 mb-6">
        <button
          aria-label="Back"
          onClick={onBack}
          className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
        >
          <LiaAngleLeftSolid className="text-white text-xl" />
        </button>
        <h2 className="text-xl font-bold text-white">Rate the App</h2>
      </div>

      <div className="bg-[#292B30] rounded-2xl p-6 flex flex-col items-center text-center mb-5">
        <p className="text-base font-semibold text-white mb-1">Enjoying DezenFoods?</p>
        <p className="text-sm text-gray-400 mb-5">Tell us what you think</p>

        {/* Stars */}
        <div className="flex gap-2 mb-3">
          {STARS.map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="text-4xl transition-transform hover:scale-110 active:scale-95"
            >
              {s <= active ? "⭐" : "☆"}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 h-4">
          {active === 1 ? "Needs a lot of work" :
           active === 2 ? "Could be better" :
           active === 3 ? "It's okay" :
           active === 4 ? "Pretty good!" :
           active === 5 ? "Love it!" : ""}
        </p>
      </div>

      {/* Feedback box - show always if low rating, show as optional if high */}
      {rating > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          {rating >= 4 ? (
            <p className="text-sm text-gray-400 mb-2">
              What do you love most? <span className="text-gray-600">(optional)</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-2">
              What can we improve?
            </p>
          )}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more..."
            rows={4}
            className="w-full bg-[#292B30] border border-[#3A3A3C] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-Red transition-colors"
          />
        </motion.div>
      )}

      {rating > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full bg-Red hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
        >
          Submit
        </button>
      )}
    </motion.div>
  );
};

// ---------- Account page ----------

const Account = () => {
  const { data: selectedUser, isLoading, error, refetch } = useGetUserProfileQuery();
  const { user: _user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>("1");
  const [viewState, setViewState] = useState<AccountViewState>("overview");
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Honour ?tab= and ?view= deep-link params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const viewParam = searchParams.get("view");
    if (tabParam && TAB_OPTIONS.some((o) => o.id === tabParam)) {
      setActiveTab(tabParam as TabType);
      setViewState("overview");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    } else if (viewParam === "settings") {
      // Returning from a legal page opened via Settings.
      setViewState("settings");
      searchParams.delete("view");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Scroll top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewState, activeTab]);

  const handleEditProfile    = useCallback(() => setViewState("edit-profile"),       []);
  const handleSettings       = useCallback(() => setViewState("settings"),            []);
  const handleOverview       = useCallback(() => setViewState("overview"),            []);
  const handleBackToSettings = useCallback(() => setViewState("settings"),            []);
  const handleVerify         = useCallback(() => setShowVerifyModal(true),            []);

  // ── Loading / error guards ─────────────────────────────────────────
  if (isLoading && !selectedUser) {
    return (
      <div className="bg-[#212428] min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if ((error || !selectedUser) && !isLoading) {
    return (
      <div className="bg-[#212428] min-h-screen flex items-center justify-center px-4">
        <div className="text-center bg-[#292B30] rounded-2xl p-8 max-w-sm w-full">
          <p className="text-white font-semibold mb-2">Couldn't load your profile</p>
          <p className="text-gray-400 text-sm mb-6">
            Check your connection and try again.
          </p>
          <button
            onClick={() => refetch()}
            className="w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedUser) return null;

  const avatar =
    typeof selectedUser.profileImage === "string" ? selectedUser.profileImage : "";
  const isVerified = selectedUser.selfVerification?.isVerified ?? false;

  const subViewWrapper = (child: React.ReactNode) => (
    <div className="bg-[#212428] min-h-screen text-white">
      <Container className="py-6">
        <Suspense fallback={<Loader />}>{child}</Suspense>
      </Container>
    </div>
  );

  // ── Sub-views ──────────────────────────────────────────────────────
  if (viewState === "settings") {
    return subViewWrapper(<Settings setViewState={setViewState} />);
  }
  if (viewState === "edit-profile") {
    return subViewWrapper(
      <EditProfile
        avatar={avatar}
        setViewState={handleOverview}
        currentProfile={{
          ...(selectedUser || {}),
          dob: (selectedUser as any)?.dob || "",
          phone: (selectedUser as any)?.phone || "",
        }}
      />
    );
  }
  if (viewState === "delivery-addresses") {
    return subViewWrapper(<DeliveryAddressManager onBack={handleBackToSettings} />);
  }
  if (viewState === "safety") {
    return subViewWrapper(<Safety onBack={handleBackToSettings} />);
  }
  if (viewState === "two-factor") {
    return subViewWrapper(<TwoFactorAuth onBack={handleBackToSettings} />);
  }
  if (viewState === "help") {
    return subViewWrapper(<HelpSupport onBack={handleBackToSettings} />);
  }
  if (viewState === "about") {
    return subViewWrapper(<About onBack={handleBackToSettings} />);
  }
  if (viewState === "rate") {
    return subViewWrapper(<RateApp onBack={handleBackToSettings} />);
  }

  // ── Overview ───────────────────────────────────────────────────────
  return (
    <div className="bg-[#212428] min-h-screen text-white">
      <Container className="py-6">
        <ProfileHeader
          avatar={avatar}
          name={selectedUser.name}
          email={selectedUser.email}
          isVerified={isVerified}
          onSettings={handleSettings}
          onEditProfile={handleEditProfile}
          onVerify={handleVerify}
        />

        {/* Vendors get a shortcut to the order queue */}
        {(selectedUser.isMerchant || (_user as { role?: string } | null)?.role === "vendor") && (
          <Link
            to="/vendor"
            className="mt-4 flex items-center justify-between rounded-2xl bg-brand/15 px-4 py-3 text-sm font-semibold text-brand hover:bg-brand/25"
          >
            <span>🧑‍🍳 Vendor dashboard - manage incoming orders</span>
            <span aria-hidden="true">→</span>
          </Link>
        )}

        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          options={TAB_OPTIONS}
        />

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <Suspense fallback={<Loader />}>
              <TabContent
                activeTab={activeTab}
                milestones={selectedUser.milestones}
                referralCode={selectedUser.referralCode}
                referralCount={selectedUser.referralCount}
                points={{
                  total: selectedUser.totalPoints,
                  available: selectedUser.availablePoints,
                }}
              />
            </Suspense>
          </AnimatePresence>
        </div>
      </Container>

      {showVerifyModal && (
        <Suspense fallback={null}>
          <SefldVerification
            isOpen={showVerifyModal}
            onClose={() => setShowVerifyModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Account;
