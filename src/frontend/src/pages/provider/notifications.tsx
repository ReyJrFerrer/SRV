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

// Helper to get the right icon for each notification type, with colored backgrounds
const NotificationIcon: React.FC<{ type: ProviderNotification["type"] }> = ({
  type,
}) => {
  let icon, bg;
  switch (type) {
    case "new_booking_request":
      icon = <UserIcon className="h-6 w-6 text-blue-600" />;
      bg = "bg-blue-100";
      break;
    case "booking_confirmation":
      icon = <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      bg = "bg-green-100";
      break;
    case "payment_completed":
      icon = <CurrencyDollarIcon className="h-6 w-6 text-green-700" />;
      bg = "bg-green-200";
      break;
    case "service_completion_reminder":
      icon = <ClockIcon className="h-6 w-6 text-orange-600" />;
      bg = "bg-orange-100";
      break;
    case "review_request":
      icon = <StarIcon className="h-6 w-6 text-purple-600" />;
      bg = "bg-purple-100";
      break;
    case "chat_message":
      icon = <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />;
      bg = "bg-blue-100";
      break;
    case "booking_cancelled":
      icon = <XCircleIcon className="h-6 w-6 text-red-600" />;
      bg = "bg-red-100";
      break;
    case "booking_rescheduled":
      icon = <ClockIcon className="h-6 w-6 text-yellow-600" />;
      bg = "bg-yellow-100";
      break;
    case "client_no_show":
      icon = <UserIcon className="h-6 w-6 text-red-500" />;
      bg = "bg-red-100";
      break;
    case "payment_issue":
      icon = <CurrencyDollarIcon className="h-6 w-6 text-red-700" />;
      bg = "bg-red-200";
      break;
    case "service_reminder":
      icon = <BellAlertIcon className="h-6 w-6 text-blue-600" />;
      bg = "bg-blue-100";
      break;
    default:
      icon = <BellAlertIcon className="h-6 w-6 text-blue-600" />;
      bg = "bg-blue-100";
  }
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${bg}`}
    >
      {icon}
    </span>
  );
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

  // Enhanced notification message formatting
  const getEnhancedMessage = () => {
    const clientName = notification.clientName
      ? ` from ${notification.clientName}`
      : "";

    switch (notification.type) {
      case "new_booking_request":
        return `New booking request${clientName}. Tap to view details and respond.`;
      case "booking_confirmation":
        return `Booking confirmed${clientName}. Service is scheduled and ready.`;
      case "payment_completed":
        return `Payment received${clientName}. Transaction completed successfully.`;
      case "service_completion_reminder":
        return `Service completion reminder${clientName}. Don't forget to mark as completed.`;
      case "review_request":
        return `Review request${clientName}. Customer wants to leave feedback.`;
      case "chat_message":
        return `New message${clientName}. Tap to view and respond.`;
      case "booking_cancelled":
        return `Booking cancelled${clientName}. Service has been cancelled.`;
      case "booking_rescheduled":
        return `Booking rescheduled${clientName}. New time has been set.`;
      case "client_no_show":
        return `Client no-show${clientName}. Customer didn't show up for appointment.`;
      case "payment_issue":
        return `Payment issue${clientName}. There's a problem with the transaction.`;
      default:
        return notification.message || "New notification";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-start space-x-4 p-4 transition-colors duration-200 ${
        notification.href ? "cursor-pointer" : "cursor-default"
      } ${
        !notification.read
          ? "bg-blue-50 hover:bg-blue-100"
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <div className="mt-1 flex-shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-blue-900">
          {getEnhancedMessage()}
        </p>
        {notification.message &&
          notification.message !== getEnhancedMessage() && (
            <p className="mt-1 text-xs text-gray-600 italic">
              {notification.message}
            </p>
          )}
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

    // Only navigate if href exists (null href means non-clickable)
    if (!notification.href) {
      return;
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "new_booking_request":
      case "booking_confirmation":
      case "service_completion_reminder":
      case "review_request":
      case "booking_cancelled":
      case "booking_rescheduled":
      case "payment_completed":
      case "client_no_show":
      case "payment_issue":
        navigate(notification.href);
        break;
      case "chat_message":
        navigate(notification.href);
        break;
      default:
        navigate(notification.href);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 pb-20">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div
          className={`w-full px-4 py-3 ${
            unreadCount <= 0
              ? "flex items-center justify-center"
              : "relative flex items-center justify-between"
          }`}
        >
          <h1
            className={`text-2xl font-extrabold tracking-tight text-black ${
              unreadCount > 0
                ? "sm:absolute sm:left-1/2 sm:-translate-x-1/2"
                : ""
            }`}
          >
            Notifications
          </h1>
          {unreadCount > 0 && (
            <>
              <div className="hidden sm:block" aria-hidden="true" />
              <button
                onClick={markAllAsRead}
                className="flex items-center rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold whitespace-nowrap text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-900"
              >
                <EnvelopeOpenIcon className="mr-1.5 h-4 w-4" />
                Mark all as read
              </button>
            </>
          )}
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
          <div className="mx-auto mt-6 max-w-2xl px-2 md:px-0">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
              {unread.length > 0 && (
                <section>
                  <h2 className="border-b bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2 text-sm font-semibold tracking-wide text-white shadow-sm">
                    New
                  </h2>
                  <div className="divide-y divide-blue-100">
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
                  <h2 className="bg-gradient-to-r from-gray-200 to-gray-100 px-4 py-2 text-sm font-semibold tracking-wide text-gray-700 shadow-sm">
                    Earlier
                  </h2>
                  <div className="divide-y divide-gray-100">
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
