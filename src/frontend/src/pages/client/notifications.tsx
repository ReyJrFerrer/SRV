import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  Notification,
} from "../../hooks/useNotificationsWithPush"; // Using push-enabled version
import BottomNavigation from "../../components/client/BottomNavigation"; // Adjust path as needed
import Appear from "../../components/common/pageFlowImprovements/Appear";
import {
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EnvelopeOpenIcon,
  InboxIcon,
} from "@heroicons/react/24/solid";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";

// Helper to get the right icon for each notification type, with colored backgrounds
const NotificationIcon: React.FC<{ type: Notification["type"] }> = ({
  type,
}) => {
  let icon, bg;
  switch (type) {
    case "booking_accepted":
      icon = <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      bg = "bg-green-100";
      break;
    case "booking_declined":
      icon = <XCircleIcon className="h-6 w-6 text-red-600" />;
      bg = "bg-red-100";
      break;
    case "booking_cancelled":
      icon = <XCircleIcon className="h-6 w-6 text-orange-500" />;
      bg = "bg-orange-100";
      break;
    case "booking_completed":
      icon = <CheckCircleIcon className="h-6 w-6 text-blue-600" />;
      bg = "bg-blue-100";
      break;
    case "payment_received":
      icon = <CheckCircleIcon className="h-6 w-6 text-green-700" />;
      bg = "bg-green-200";
      break;
    case "payment_failed":
      icon = <XCircleIcon className="h-6 w-6 text-red-700" />;
      bg = "bg-red-200";
      break;
    case "provider_message":
      icon = <EnvelopeOpenIcon className="h-6 w-6 text-purple-600" />;
      bg = "bg-purple-100";
      break;
    case "system_announcement":
      icon = <BellAlertIcon className="h-6 w-6 text-gray-700" />;
      bg = "bg-gray-200";
      break;
    case "service_rescheduled":
      icon = <BellAlertIcon className="h-6 w-6 text-yellow-700" />;
      bg = "bg-yellow-200";
      break;
    case "service_reminder":
      icon = <StarIcon className="h-6 w-6 text-blue-500" />;
      bg = "bg-blue-100";
      break;
    case "promo_offer":
      icon = <StarIcon className="h-6 w-6 text-pink-500" />;
      bg = "bg-pink-100";
      break;
    case "provider_on_the_way":
      icon = <BellAlertIcon className="h-6 w-6 text-teal-600" />;
      bg = "bg-teal-100";
      break;
    case "review_reminder":
      icon = <StarIcon className="h-6 w-6 text-yellow-500" />;
      bg = "bg-yellow-100";
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
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  onMarkAsRead: () => void;
}> = ({ notification, onClick, onDelete, onMarkAsRead }) => {
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
    const providerName = notification.providerName
      ? ` by ${notification.providerName}`
      : "";

    switch (notification.type) {
      case "booking_accepted":
        return `Your booking has been accepted${providerName}. Service is confirmed and scheduled.`;
      case "booking_declined":
        return `Your booking was declined${providerName}. Please try booking with another provider.`;
      case "booking_cancelled":
        return `Your booking has been cancelled${providerName}. You can book again anytime.`;
      case "booking_completed":
        return `Service completed${providerName}. Thank you for using our platform!`;
      case "payment_received":
        return `Payment received successfully${providerName}. Your transaction is complete.`;
      case "payment_failed":
        return `Payment failed${providerName}. Please check your payment method and try again.`;
      case "chat_message":
        return `New message${providerName}. Tap to view and respond.`;
      case "system_announcement":
        return `System announcement: ${notification.message || "Important update from SRV team."}`;
      case "service_rescheduled":
        return `Service rescheduled${providerName}. Your appointment has been moved to a new time.`;
      case "promo_offer":
        return `Special offer available! ${notification.message || "Check out our latest promotions."}`;
      case "provider_on_the_way":
        return `Provider is on the way${providerName}. They should arrive shortly.`;
      case "review_reminder":
        return `Please review your experience${providerName}. Your feedback helps improve our service.`;
      default:
        return notification.message || "New notification from SRV";
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex items-start gap-4 rounded-xl border border-transparent p-4 shadow-sm transition-all duration-200 ${
        notification.href
          ? "cursor-pointer hover:border-blue-200"
          : "cursor-default"
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
          notification.type !== "system_announcement" &&
          notification.type !== "promo_offer" &&
          notification.message !== getEnhancedMessage() && (
            <p className="mt-1 text-xs italic text-gray-600">
              {notification.message}
            </p>
          )}
        <p className="mt-1 text-xs text-gray-500">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        {!notification.read && (
          <div className="h-2.5 w-2.5 self-center rounded-full bg-blue-500"></div>
        )}
        <div className="relative">
          <NotificationMenu
            id={notification.id}
            onDelete={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMarkAsRead={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            isRead={notification.read}
          />
        </div>
      </div>
    </div>
  );
};

import { createPortal } from "react-dom";

// Menu that renders into a portal so it can overlap containers (not be clipped).
// Uses a global custom event to ensure only one menu is open at a time.
const NotificationMenu: React.FC<{
  id: string;
  onDelete: (e: React.MouseEvent) => void;
  onMarkAsRead: (e: React.MouseEvent) => void;
  isRead: boolean;
}> = ({ id, onDelete, onMarkAsRead, isRead }) => {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  // Close other menus when another menu opens
  React.useEffect(() => {
    const onOtherOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      if (!detail) return;
      if (detail.id !== id) {
        setOpen(false);
      }
    };
    window.addEventListener(
      "notification-menu-open",
      onOtherOpen as EventListener,
    );
    return () =>
      window.removeEventListener(
        "notification-menu-open",
        onOtherOpen as EventListener,
      );
  }, [id]);

  // compute and store button coordinates when opening so the portal can be positioned
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = buttonRef.current;
    if (!btn) {
      setOpen((s) => !s);
      window.dispatchEvent(
        new CustomEvent("notification-menu-open", { detail: { id } }),
      );
      return;
    }
    const rect = btn.getBoundingClientRect();
    // position menu below the button and right-aligned
    setCoords({ top: rect.bottom + 8, left: rect.right - 160 });
    setOpen((s) => {
      const next = !s;
      if (next) {
        window.dispatchEvent(
          new CustomEvent("notification-menu-open", { detail: { id } }),
        );
      }
      return next;
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(e);
    setOpen(false);
  };
  const menu = (
    <div
      style={
        coords
          ? { position: "fixed", top: coords.top, left: coords.left }
          : undefined
      }
      className="z-50 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {!isRead && (
          <button
            onClick={(e) => {
              onMarkAsRead(e);
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Mark as read
          </button>
        )}
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notification options"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
};

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    unreadCount,
  } = useNotifications();
  const navigate = useNavigate();

  // Set the document title
  useEffect(() => {
    document.title = "Notifications | SRV";
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Only navigate if href exists (null href means non-clickable)
    if (notification.href) {
      navigate(notification.href);
    }
  };

  const { unread, read } = useMemo(() => {
    return notifications.reduce<{
      unread: Notification[];
      read: Notification[];
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
                className="flex items-center whitespace-nowrap rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-200 hover:text-blue-900"
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
          <div className="p-8 text-center text-gray-500">
            Loading notifications…
          </div>
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
                    {unread.map((notif, idx) => (
                      <Appear
                        key={notif.id}
                        delayMs={idx * 25}
                        variant="fade-up"
                      >
                        <NotificationItem
                          notification={notif}
                          onClick={() => handleNotificationClick(notif)}
                          onDelete={() => deleteNotification(notif.id)}
                          onMarkAsRead={() => markAsRead(notif.id)}
                        />
                      </Appear>
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
                    {read.map((notif, idx) => (
                      <Appear
                        key={notif.id}
                        delayMs={idx * 25}
                        variant="fade-up"
                      >
                        <NotificationItem
                          notification={notif}
                          onClick={() => handleNotificationClick(notif)}
                          onDelete={() => deleteNotification(notif.id)}
                          onMarkAsRead={() => markAsRead(notif.id)}
                        />
                      </Appear>
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

export default NotificationsPage;
