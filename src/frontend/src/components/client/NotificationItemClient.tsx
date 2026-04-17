import React from "react";
import { Notification } from "../../hooks/useNotificationsWithPush";
import NotificationIconClient from "../notifications/NotificationIconClient";
import NotificationMenu from "../notifications/NotificationMenu";

type Props = {
  notification: Notification;
  onClick: () => void;
  onDelete: () => void;
  onMarkAsRead: () => void;
  selectable?: boolean;
  checked?: boolean;
  onToggleSelect?: () => void;
};

const NotificationItemClient: React.FC<Props> = ({
  notification,
  onClick,
  onDelete,
  onMarkAsRead,
  selectable = false,
  checked = false,
  onToggleSelect,
}) => {
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
      onClick={(e) => {
        if (selectable) {
          e.stopPropagation();
          onToggleSelect?.();
          return;
        }
        onClick();
      }}
      className={`relative flex items-start gap-4 p-4 transition-all duration-200 ${
        selectable ? "" : "hover:border-blue-200"
      } ${
        !notification.read
          ? "bg-blue-50/50 hover:bg-blue-50"
          : "bg-white hover:bg-gray-50"
      } ${
        notification.href && !selectable
          ? "cursor-pointer border border-transparent"
          : "cursor-default border border-transparent"
      }`}
      aria-selected={checked}
    >
      {selectable && (
        <div className="flex items-start pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Select notification"
          />
        </div>
      )}
      <div className="mt-1 flex-shrink-0">
        <NotificationIconClient
          type={notification.type}
          metadata={notification.metadata}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">
          {getEnhancedMessage()}
        </p>
        {notification.message &&
          notification.type !== "system_announcement" &&
          notification.type !== "promo_offer" &&
          notification.message !== getEnhancedMessage() && (
            <p className="mt-1 break-words text-xs text-gray-600">
              {notification.message}
            </p>
          )}
        <p className="mt-1 text-xs text-gray-400">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        {!notification.read && !selectable && (
          <div className="h-2.5 w-2.5 self-center rounded-full bg-yellow-500"></div>
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

export default NotificationItemClient;
