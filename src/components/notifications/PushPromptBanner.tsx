import { useState } from 'react';
import { HiOutlineBell, HiX } from 'react-icons/hi';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const DISMISSED_KEY = 'push_dismissed';

const PushPromptBanner = () => {
  const { isSupported, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  if (!isSupported || permission !== 'default' || dismissed) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl bg-[#292B30] border border-white/10 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-Red/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <HiOutlineBell className="w-5 h-5 text-Red" />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium text-white">Stay in the loop</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Get instant alerts for orders, messages, and trades.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={subscribe}
            className="px-3 py-1.5 rounded-lg bg-Red text-white text-xs font-medium hover:bg-red-500 transition-colors"
          >
            Enable notifications
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-gray-400 text-xs hover:text-white transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
        <HiX className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PushPromptBanner;
