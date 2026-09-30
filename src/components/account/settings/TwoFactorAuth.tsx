import { motion } from 'framer-motion';
import { LiaAngleLeftSolid } from 'react-icons/lia';
import { HiOutlineLockClosed, HiOutlineBell, HiOutlineShieldCheck } from 'react-icons/hi';

const BENEFITS = [
  {
    icon: <HiOutlineLockClosed className="w-5 h-5 text-blue-400" />,
    title: 'Block unauthorized logins',
    body: "Even if someone gets your Google credentials, they can't access your account without the second factor.",
  },
  {
    icon: <HiOutlineShieldCheck className="w-5 h-5 text-green-400" />,
    title: 'Protect your trades',
    body: 'High-value escrow transactions will require 2FA confirmation, adding a critical layer before funds move.',
  },
  {
    icon: <HiOutlineBell className="w-5 h-5 text-yellow-400" />,
    title: 'Login alerts',
    body: "Get notified whenever a new device signs into your account, so you can act immediately if it wasn't you.",
  },
];

const TwoFactorAuth = ({ onBack }: { onBack: () => void }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
    {/* Header */}
    <div className="flex items-center gap-3 mb-6">
      <button
        aria-label="Back"
        onClick={onBack}
        className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
      >
        <LiaAngleLeftSolid className="text-white text-xl" />
      </button>
      <h2 className="text-xl font-bold text-white">Two-Factor Authentication</h2>
    </div>

    {/* Coming soon card */}
    <div className="bg-[#292B30] rounded-2xl p-6 mb-5 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
        <HiOutlineLockClosed className="w-8 h-8 text-blue-400" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-3">
        Coming soon
      </span>
      <h3 className="text-base font-semibold text-white mb-2">We're building this</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
        Two-factor authentication is in active development. It will be available in a future update.
      </p>
    </div>

    {/* Benefits */}
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-2">
      What 2FA will protect
    </p>
    <div className="space-y-2">
      {BENEFITS.map((b) => (
        <div key={b.title} className="bg-[#292B30] rounded-xl px-4 py-4 flex gap-3">
          <div className="p-2 rounded-full bg-[#3A3A3C] flex-shrink-0 self-start">{b.icon}</div>
          <div>
            <p className="text-sm font-medium text-white">{b.title}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{b.body}</p>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

export default TwoFactorAuth;
