import { motion } from 'framer-motion';
import { HiOutlineBell, HiOutlineCheckCircle } from 'react-icons/hi';

interface EmptyNotificationsProps {
  variant?: 'all' | 'unread';
  onViewAll?: () => void;
}

const EmptyNotifications = ({ variant = 'all', onViewAll }: EmptyNotificationsProps) => {
  const isUnread = variant === 'unread';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-16 h-16 bg-[#292B30] rounded-full flex items-center justify-center mb-4"
      >
        {isUnread ? (
          <HiOutlineCheckCircle className="text-3xl text-green-400" />
        ) : (
          <HiOutlineBell className="text-3xl text-gray-400" />
        )}
      </motion.div>

      <h3 className="text-lg font-medium text-white mb-2">
        {isUnread ? "You're all caught up" : 'No notifications yet'}
      </h3>

      <p className="text-sm text-gray-400 text-center max-w-xs">
        {isUnread
          ? 'All your notifications have been read.'
          : "When you get notifications, they'll show up here."}
      </p>

      {isUnread && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-4 text-sm text-Red hover:text-red-400 transition-colors"
        >
          View all notifications
        </button>
      )}
    </motion.div>
  );
};

export default EmptyNotifications;
