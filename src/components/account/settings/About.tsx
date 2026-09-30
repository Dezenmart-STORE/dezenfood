import { BRAND } from '../../../config/brand';
import { motion } from 'framer-motion';
import { LiaAngleLeftSolid } from 'react-icons/lia';
import { RiTwitterXLine, RiLinkedinBoxLine, RiTelegramLine, RiTiktokLine, RiExternalLinkLine } from 'react-icons/ri';
import { HiOutlineGlobe, HiOutlineMail } from 'react-icons/hi';
const logo = '/images/logo.svg';

const APP_VERSION = '1.0.0';

const LINKS = [
  {
    icon: <HiOutlineGlobe className="text-white text-base" />,
    label: 'Website',
    href: BRAND.ecosystem.market.url,
  },
  {
    icon: <RiTwitterXLine className="text-white text-base" />,
    label: 'X (Twitter)',
    href: BRAND.social.twitterUrl,
  },
  {
    icon: <RiLinkedinBoxLine className="text-white text-base" />,
    label: 'LinkedIn',
    href: BRAND.social.linkedinUrl,
  },
  {
    icon: <RiTelegramLine className="text-white text-base" />,
    label: 'Telegram community',
    href: 'https://t.me/dezenmart_commuinity',
  },
  {
    icon: <RiTiktokLine className="text-white text-base" />,
    label: 'TikTok',
    href: 'https://www.tiktok.com/@dezenmart?lang=en',
  },
  {
    icon: <HiOutlineMail className="text-white text-base" />,
    label: 'Contact us',
    href: `mailto:${BRAND.supportEmail}`,
  },
];

const LEGAL = [
  { label: 'Privacy Policy', href: `${BRAND.siteUrl}/privacy` },
  { label: 'Terms of Service', href: `${BRAND.siteUrl}/terms` },
];

const About = ({ onBack }: { onBack: () => void }) => (
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
      <h2 className="text-xl font-bold text-white">About {BRAND.name}</h2>
    </div>

    {/* Identity card */}
    <div className="bg-[#292B30] rounded-2xl p-6 mb-5 flex flex-col items-center text-center">
      <img src={logo} alt={BRAND.name} className="w-16 h-16 rounded-2xl mb-3" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <h3 className="text-base font-bold text-white">{BRAND.name}</h3>
      <p className="text-xs text-gray-500 mt-0.5">Version {APP_VERSION}</p>
      <p className="text-sm text-gray-400 mt-3 leading-relaxed max-w-xs">
        {BRAND.description}
      </p>
      <div className="mt-4 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs text-green-400 font-medium">Built on Celo</span>
      </div>
    </div>

    {/* Links */}
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-1.5">
      Connect with us
    </p>
    <div className="bg-[#292B30] rounded-xl overflow-hidden divide-y divide-[#3A3A3C] mb-4">
      {LINKS.map(({ icon, label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#3A3A3C] active:bg-[#42444A] transition-colors"
        >
          <div className="p-2 rounded-full bg-[#3A3A3C] flex-shrink-0">{icon}</div>
          <span className="text-sm font-medium text-white flex-1">{label}</span>
          <RiExternalLinkLine className="text-gray-500 w-4 h-4" />
        </a>
      ))}
    </div>

    {/* Legal */}
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-1 mb-1.5">
      Legal
    </p>
    <div className="bg-[#292B30] rounded-xl overflow-hidden divide-y divide-[#3A3A3C]">
      {LEGAL.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-4 py-3.5 hover:bg-[#3A3A3C] transition-colors"
        >
          <span className="text-sm font-medium text-white flex-1">{label}</span>
          <RiExternalLinkLine className="text-gray-500 w-4 h-4" />
        </a>
      ))}
    </div>

    <p className="text-center text-xs text-gray-600 mt-6">
      Made with ❤️ for decentralized commerce
    </p>
  </motion.div>
);

export default About;
