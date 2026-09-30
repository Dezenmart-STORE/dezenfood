import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IoChevronBackOutline, IoRefreshOutline } from 'react-icons/io5';
import {
  useGetUserNotificationsQuery,
  useMarkNotificationsAsReadMutation,
} from '../store/api/notificationsApi';
import NotificationItem from '../components/notifications/NotificationItem';
import EmptyNotifications from '../components/notifications/EmptyNotifications';
import NotificationSkeleton from '../components/notifications/NotificationSkeleton';
import PushPromptBanner from '../components/notifications/PushPromptBanner';
import Container from '../components/common/Container';
import { groupByDate } from '../utils/notifications';
import type { Notification } from '../utils/types';

type Tab = 'all' | 'unread';

const NotificationPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const { data: notifications = [], isLoading, refetch } = useGetUserNotificationsQuery(
    undefined,
    { pollingInterval: 60_000, refetchOnFocus: true }
  );
  const [markAsReadMutation] = useMarkNotificationsAsReadMutation();

  const unreadNotifications = notifications.filter((n: Notification) => !n.read);
  const hasUnread = unreadNotifications.length > 0;

  const displayed: Notification[] = activeTab === 'unread' ? unreadNotifications : notifications;
  const groups = groupByDate(displayed);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation({ notificationIds: [id] }).unwrap();
    } catch {
      // Silently ignore - optimistic update already applied
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!hasUnread) return;
    try {
      await markAsReadMutation({ notificationIds: unreadNotifications.map((n) => n._id) }).unwrap();
    } catch {
      // Silently ignore
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-[#212428] min-h-screen"
      >
        {/* Header */}
        <div className="p-4 my-12 relative flex items-center justify-center">
          <button
            onClick={handleBack}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white"
            aria-label="Go back"
          >
            <IoChevronBackOutline className="h-6 w-6" />
          </button>

          <h1 className="text-xl font-bold text-white text-[28px]">Notifications</h1>

          <button
            onClick={refetch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            aria-label="Refresh notifications"
          >
            <IoRefreshOutline className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs + Mark all read */}
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="flex gap-1 bg-[#292B30] rounded-lg p-1">
            {(['all', 'unread'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-[#212428] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'unread' && hasUnread && (
                  <span className="ml-1.5 bg-Red text-white text-[10px] rounded-full px-1.5 py-0.5">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-Red hover:text-red-400 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Push permission banner */}
        <div className="mt-3">
          <PushPromptBanner />
        </div>

        {/* Content */}
        {isLoading ? (
          <NotificationSkeleton />
        ) : displayed.length === 0 ? (
          <EmptyNotifications
            variant={activeTab}
            onViewAll={activeTab === 'unread' ? () => setActiveTab('all') : undefined}
          />
        ) : (
          <div>
            {groups.map(({ label, items }) => (
              <div key={label}>
                {/* Date group label */}
                <div className="px-4 py-2 sticky top-0 bg-[#212428]/90 backdrop-blur-sm z-10">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {label}
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {items.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </Container>
  );
};

export default NotificationPage;
