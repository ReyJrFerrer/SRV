import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ProviderNotification,
  useProviderNotifications,
} from "../../hooks/useProviderNotificationsWithPush";
import BottomNavigation from "../../components/provider/BottomNavigation";
import {
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EnvelopeOpenIcon,
  InboxIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
} from "@heroicons/react/24/solid";

// Helper to get the right icon for each notification type
const NotificationIcon: React.FC<{ type: ProviderNotification["type"] }> = ({
  type,
}) => {
  switch (type) {
    case "new_booking_request":
      return <UserIcon className="h-8 w-8 text-blue-500" />;
    case "booking_confirmation":
      return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
    case "payment_completed":
      return <CurrencyDollarIcon className="h-8 w-8 text-green-600" />;
    case "service_completion_reminder":
      return <ClockIcon className="h-8 w-8 text-orange-500" />;
    case "review_request":
      return <StarIcon className="h-8 w-8 text-purple-500" />;
    case "chat_message":
      return <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />;
    case "booking_cancelled":
      return <XCircleIcon className="h-8 w-8 text-red-500" />;
    case "booking_rescheduled":
      return <ClockIcon className="h-8 w-8 text-yellow-500" />;
    case "client_no_show":
      return <UserIcon className="h-8 w-8 text-red-400" />;
    case "payment_issue":
      return <CurrencyDollarIcon className="h-8 w-8 text-red-600" />;
    default:
      return <BellAlertIcon className="h-8 w-8 text-blue-500" />;
  }
};

// Reusable component for a single notification item
const NotificationItem: React.FC<{
  notification: ProviderNotification;
  onClick: () => void;
}> = ({ notification, onClick }) => {
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-start space-x-4 p-4 transition-colors duration-200 ${
        !notification.read
          ? "bg-blue-50 hover:bg-blue-100"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className="mt-1 flex-shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-800">
          {notification.message}{" "}
          {notification.clientName && (
            <span className="font-bold">{notification.clientName}</span>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      {!notification.read && (
        <div className="h-2.5 w-2.5 self-center rounded-full bg-blue-500"></div>
      )}
    </div>
  );
};

const NotificationsPageSP = () => {
  const navigate = useNavigate();

  // Use the new provider notifications hook
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useProviderNotifications();

  // Set the document title
  useEffect(() => {
    document.title = "Notifications | SRV";
  }, []);

  const handleNotificationClick = (notification: ProviderNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "new_booking_request":
      case "booking_confirmation":
      case "service_completion_reminder":
      case "review_request":
      case "booking_cancelled":
      case "booking_rescheduled":
        navigate(
          notification.href || `/provider/booking/${notification.bookingId}`,
        );
        break;
      case "payment_completed":
        navigate(
          notification.href || `/provider/receipt/${notification.bookingId}`,
        );
        break;
      case "chat_message":
        navigate(`/provider/chat/${notification.clientName}`);
        break;
      case "client_no_show":
      case "payment_issue":
        navigate(
          notification.href || `/provider/booking/${notification.bookingId}`,
        );
        break;
      default:
        navigate(notification.href || "/provider/bookings");
        break;
    }
  };

  const { unread, read } = useMemo(() => {
    return notifications.reduce<{
      unread: ProviderNotification[];
      read: ProviderNotification[];
    }>(
      (acc, notif) => {
        if (notif.read) {
          acc.read.push(notif);
        } else {
          acc.unread.push(notif);
        }
        return acc;
      },
      { unread: [], read: [] },
    );
  }, [notifications]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <header className="sticky top-0 z-20 bg-white py-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex-1"></div>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-900 sm:text-2xl md:text-2xl">
            Notifications
          </h1>
          <div className="flex flex-1 justify-end">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:px-4"
                aria-label="Mark all as read"
              >
                <EnvelopeOpenIcon className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">Mark all as read</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-2 pb-24 sm:px-4 md:px-8">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">{String(error)}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center p-10 text-center text-gray-500">
            <InboxIcon className="mb-4 h-16 w-16 text-gray-300" />
            <h3 className="text-lg font-semibold">No Notifications Yet</h3>
            <p className="text-sm">
              We'll let you know when something important happens.
            </p>
          </div>
        ) : (
          <div className="mx-auto mt-4 max-w-4xl">
            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
              {unread.length > 0 && (
                <section>
                  <h2 className="border-b bg-blue-500 px-4 py-2 text-sm font-semibold text-white">
                    New
                  </h2>
                  <div className="divide-y divide-gray-200">
                    {unread.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {unread.length > 0 && read.length > 0 && <div className="my-4" />}
              {read.length > 0 && (
                <section>
                  <h2 className="bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800">
                    Earlier
                  </h2>
                  <div className="divide-y divide-gray-200">
                    {read.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 z-30 w-full">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default NotificationsPageSP;
