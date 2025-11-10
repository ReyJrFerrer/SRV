import React from "react";
import { ProviderNotification } from "../../hooks/useProviderNotificationsWithPush";
import NotificationIcon from "../notifications/NotificationIcon";
import NotificationMenu from "../notifications/NotificationMenu";

type Props = {
  notification: ProviderNotification;
  onClick: () => void;
  onDelete: () => void;
  onMarkAsRead: () => void;
  selectable?: boolean;
  checked?: boolean;
  onToggleSelect?: () => void;
};

const NotificationItem: React.FC<Props> = ({
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
      onClick={(e) => {
        if (selectable) {
          e.stopPropagation();
          onToggleSelect?.();
          return;
        }
        onClick();
      }}
      className={`relative flex items-start space-x-4 p-4 transition-colors duration-200 ${
        notification.href ? "cursor-pointer" : "cursor-default"
      } ${
        !notification.read
          ? "bg-blue-50 hover:bg-blue-100"
          : "bg-white hover:bg-gray-50"
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
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Select notification"
          />
        </div>
      )}
      <div className="mt-1 flex-shrink-0">
        <NotificationIcon
          type={notification.type}
          metadata={notification.metadata}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-blue-900">
          {getEnhancedMessage()}
        </p>
        {notification.message &&
          notification.message !== getEnhancedMessage() && (
            <p className="mt-1 break-words text-xs italic text-gray-600">
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

export default NotificationItem;
