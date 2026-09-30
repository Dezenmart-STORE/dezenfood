import { motion } from 'framer-motion';
import { LiaAngleLeftSolid } from 'react-icons/lia';
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineChatAlt2,
  HiOutlineExclamationCircle,
  HiOutlineFlag,
} from 'react-icons/hi';

interface Tip {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const TIPS: Tip[] = [
  {
    icon: <HiOutlineLockClosed className="w-5 h-5 text-green-400" />,
    title: 'Never share your private key',
    body: 'DezenFoods will never ask for your seed phrase or private key. Anyone who does is attempting to steal your funds.',
  },
  {
    icon: <HiOutlineShieldCheck className="w-5 h-5 text-blue-400" />,
    title: 'All trades are escrow-protected',
    body: 'Funds are locked in a smart contract until you confirm delivery. Never agree to trade outside the platform - you lose escrow protection.',
  },
  {
    icon: <HiOutlineEye className="w-5 h-5 text-yellow-400" />,
    title: 'Verify sellers before buying',
    body: "Check the seller's rating, completed trades, and reviews. Be extra cautious with sellers who have few transactions.",
  },
  {
    icon: <HiOutlineChatAlt2 className="w-5 h-5 text-purple-400" />,
    title: 'Keep conversations in-app',
    body: "Only communicate through DezenFoods's chat. Sellers who push you to WhatsApp or Telegram to agree on price may be trying to bypass protections.",
  },
  {
    icon: <HiOutlineExclamationCircle className="w-5 h-5 text-orange-400" />,
    title: 'Inspect products on delivery',
    body: 'Confirm delivery only after you have physically received and checked the item. Once you confirm, funds are released to the seller.',
  },
  {
    icon: <HiOutlineFlag className="w-5 h-5 text-red-400" />,
    title: 'Raise a dispute if needed',
    body: 'If something goes wrong, open a dispute within the order before confirming delivery. Our team reviews all disputes fairly.',
  },
];

const Safety = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-xl font-bold text-white">Safety</h2>
    </div>

    {/* Intro */}
    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5">
      <p className="text-sm text-green-400 font-medium">Your trades are escrow-protected</p>
      <p className="text-xs text-green-400/70 mt-0.5">
        Funds are held by a smart contract - not us - until you confirm receipt.
      </p>
    </div>

    {/* Tips */}
    <div className="space-y-3">
      {TIPS.map((tip) => (
        <div key={tip.title} className="bg-[#292B30] rounded-xl px-4 py-4 flex gap-3">
          <div className="p-2 rounded-full bg-[#3A3A3C] flex-shrink-0 self-start">{tip.icon}</div>
          <div>
            <p className="text-sm font-medium text-white">{tip.title}</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{tip.body}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Report link */}
    <a
      href="mailto:support@dezenmart.com"
      className="mt-5 flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3.5 hover:bg-red-500/20 transition-colors"
    >
      <HiOutlineFlag className="text-red-400 w-4 h-4" />
      <span className="text-sm font-medium text-red-400">Report a safety issue</span>
    </a>
  </motion.div>
);

export default Safety;
