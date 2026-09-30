import { motion } from "framer-motion";
import { RiSettings3Fill, RiVerifiedBadgeFill, RiEdit2Fill, RiShieldCheckLine, RiArrowRightSLine } from "react-icons/ri";

interface ProfileHeaderProps {
  avatar: string;
  name: string;
  email: string;
  isVerified: boolean;
  onSettings: () => void;
  onEditProfile: () => void;
  onVerify: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  avatar,
  name,
  email,
  isVerified,
  onSettings,
  onEditProfile,
  onVerify,
}) => {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">My Account</h1>
        <button
          aria-label="Settings"
          onClick={onSettings}
          className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
        >
          <RiSettings3Fill className="text-gray-400 text-xl" />
        </button>
      </div>

      {/* Profile card - avatar + info + edit icon */}
      <motion.div
        className="bg-[#292B30] rounded-2xl p-4 flex items-center gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src={avatar || "https://placehold.co/80x80/292B30/ffffff?text=?"}
          alt={name}
          className="w-16 h-16 rounded-full object-cover border-2 border-brand flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="font-bold text-white text-base truncate">{name}</h2>
            {isVerified && (
              <RiVerifiedBadgeFill
                className="text-green-400 text-base flex-shrink-0"
                title="Verified account"
              />
            )}
          </div>
          <p className="text-gray-400 text-sm truncate mt-0.5">{email}</p>
        </div>

        {/* Edit icon - replaces the full-width button */}
        <button
          onClick={onEditProfile}
          aria-label="Edit profile"
          className="p-2.5 rounded-full bg-[#3A3C41] hover:bg-[#484B52] active:scale-95 transition-all flex-shrink-0"
        >
          <RiEdit2Fill className="text-gray-300 text-base" />
        </button>
      </motion.div>

      {/* Verify notice - compact contextual banner, only shown when unverified */}
      {!isVerified && (
        <motion.button
          onClick={onVerify}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-2 w-full flex items-center gap-3 bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3 text-left hover:bg-amber-900/30 active:scale-[0.99] transition-all"
        >
          <span className="p-1.5 bg-amber-800/30 rounded-lg flex-shrink-0">
            <RiShieldCheckLine className="text-amber-400 text-base" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-xs font-semibold">Verify your account</p>
            <p className="text-amber-500/80 text-xs mt-0.5 truncate">
              Unlock full access and build trust with sellers
            </p>
          </div>
          <RiArrowRightSLine className="text-amber-500 text-lg flex-shrink-0" />
        </motion.button>
      )}
    </div>
  );
};

export default ProfileHeader;
