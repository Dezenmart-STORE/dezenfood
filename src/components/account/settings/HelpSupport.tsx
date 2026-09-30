import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiaAngleLeftSolid } from 'react-icons/lia';
import { HiChevronDown, HiOutlineMail } from 'react-icons/hi';
// import { RiTelegramLine } from 'react-icons/ri'; // Telegram community disabled

interface FAQ {
  q: string;
  a: string;
}

const FAQS: { category: string; items: FAQ[] }[] = [
  {
    category: 'Orders & Delivery',
    items: [
      {
        q: 'How do I track my order?',
        a: "Go to Account > Order History and tap on any order to see its current status and logistics updates. You'll also receive notifications for every status change.",
      },
      {
        q: 'What does each order status mean?',
        a: "Awaiting payment means we haven't received your payment yet. Paid means your money is held in escrow. Preparing means the vendor is making your order. On the way means a rider has it. Delivered means it arrived, and Completed means you confirmed receipt and the vendor was paid.",
      },
      {
        q: 'Can I cancel an order?',
        a: "You can cancel before the vendor accepts your order and you'll be refunded. Once the vendor is preparing it, cancelling needs the vendor's agreement or a dispute.",
      },
    ],
  },
  {
    category: 'Payments & Escrow',
    items: [
      {
        q: 'How does escrow work?',
        a: 'Your payment is held safely (with Pandascrow, or in a smart contract if you pay with crypto). It is only released to the vendor after you confirm delivery. Card and bank payments through Korapay are held by DezenFoods until you confirm.',
      },
      {
        q: 'How can I pay?',
        a: 'Pay by card or bank transfer (Korapay), through Pandascrow escrow, or with crypto stablecoins where the vendor accepts them. You choose at checkout.',
      },
      {
        q: 'What happens if my payment fails?',
        a: 'If a payment fails you have not been charged. If money left your account but the order still shows awaiting payment, wait a few minutes; we confirm with the payment provider automatically. Still stuck? Contact support with your order number.',
      },
    ],
  },
  {
    category: 'Disputes',
    items: [
      {
        q: 'How do I raise a dispute?',
        a: 'Open the order and tap "Report a problem." Describe the issue clearly and attach any evidence. Do not confirm delivery before the dispute is resolved.',
      },
      {
        q: 'How long do disputes take?',
        a: "Our team aims to review disputes within 3-5 business days. Complex cases may take longer. You'll receive email and in-app notifications as the case progresses.",
      },
    ],
  },
  {
    category: 'Account & Security',
    items: [
      {
        q: 'How do I verify my identity?',
        a: 'Go to your profile and tap the verification badge. We use Self ID - a privacy-preserving zkSNARK proof - so your real identity stays private while you gain a verified badge.',
      },
      {
        q: 'What if my account is compromised?',
        a: "Log out immediately from Account > Settings > Log Out. Contact us at support@dezenmart.com and we'll lock the account while you regain access.",
      },
    ],
  },
];

const FAQItem = ({ q, a }: FAQ) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#3A3A3C] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-start justify-between w-full px-4 py-3.5 text-left gap-3"
      >
        <span className="text-sm font-medium text-white leading-snug">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 mt-0.5">
          <HiChevronDown className="text-gray-400 w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HelpSupport = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-xl font-bold text-white">Help & Support</h2>
    </div>

    {/* FAQ */}
    <div className="space-y-4 mb-6">
      {FAQS.map((group) => (
        <div key={group.category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-1.5">
            {group.category}
          </p>
          <div className="bg-[#292B30] rounded-xl overflow-hidden">
            {group.items.map((item) => (
              <FAQItem key={item.q} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Contact */}
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-2">
      Still need help?
    </p>
    <div className="space-y-2">
      <a
        href="mailto:support@dezenmart.com"
        className="flex items-center gap-3 bg-[#292B30] rounded-xl px-4 py-4 hover:bg-[#333940] transition-colors"
      >
        <div className="p-2 rounded-full bg-[#3A3A3C]">
          <HiOutlineMail className="text-white text-base" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Email support</p>
          <p className="text-xs text-gray-400">support@dezenmart.com</p>
        </div>
      </a>

      {/* Telegram community removed - we only use X and LinkedIn.
      <a
        href="https://t.me/dezenmart_commuinity"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-[#292B30] rounded-xl px-4 py-4 hover:bg-[#333940] transition-colors"
      >
        <div className="p-2 rounded-full bg-[#3A3A3C]">
          <RiTelegramLine className="text-blue-400 text-base" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Community (Telegram)</p>
          <p className="text-xs text-gray-400">Ask the community for quick help</p>
        </div>
      </a>
      */}
    </div>
  </motion.div>
);

export default HelpSupport;
