import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { InAppNotificationItem } from "../../context/InAppNotificationContext";
import {
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EnvelopeOpenIcon,
  ServerStackIcon,
  UserIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface InAppNotificationPopupProps {
  notification: InAppNotificationItem;
  index: number;
  onDismiss: () => void;
}

interface NotificationStyle {
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
}

function getNotificationStyle(type: string): NotificationStyle {
  switch (type) {
    case "booking_accepted":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
        iconBg: "bg-green-100",
        accentColor: "#22c55e",
      };
    case "booking_declined":
    case "booking_cancelled":
      return {
        icon: <XCircleIcon className="h-5 w-5 text-red-600" />,
        iconBg: "bg-red-100",
        accentColor: "#ef4444",
      };
    case "booking_completed":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-100",
        accentColor: "#3b82f6",
      };
    case "payment_received":
    case "payment_completed":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-700" />,
        iconBg: "bg-green-200",
        accentColor: "#16a34a",
      };
    case "payment_failed":
    case "payment_issue":
      return {
        icon: <XCircleIcon className="h-5 w-5 text-red-700" />,
        iconBg: "bg-red-200",
        accentColor: "#dc2626",
      };
    case "provider_message":
      return {
        icon: <EnvelopeOpenIcon className="h-5 w-5 text-purple-600" />,
        iconBg: "bg-purple-100",
        accentColor: "#a855f7",
      };
    case "system_announcement":
      return {
        icon: <ServerStackIcon className="h-5 w-5 text-gray-700" />,
        iconBg: "bg-gray-200",
        accentColor: "#6b7280",
      };
    case "service_rescheduled":
    case "booking_rescheduled":
      return {
        icon: <ClockIcon className="h-5 w-5 text-yellow-700" />,
        iconBg: "bg-yellow-200",
        accentColor: "#eab308",
      };
    case "service_reminder":
      return {
        icon: <StarIcon className="h-5 w-5 text-blue-500" />,
        iconBg: "bg-blue-100",
        accentColor: "#3b82f6",
      };
    case "promo_offer":
      return {
        icon: <StarIcon className="h-5 w-5 text-pink-500" />,
        iconBg: "bg-pink-100",
        accentColor: "#ec4899",
      };
    case "provider_on_the_way":
      return {
        icon: <BellAlertIcon className="h-5 w-5 text-teal-600" />,
        iconBg: "bg-teal-100",
        accentColor: "#14b8a6",
      };
    case "review_reminder":
      return {
        icon: <StarIcon className="h-5 w-5 text-yellow-500" />,
        iconBg: "bg-yellow-100",
        accentColor: "#eab308",
      };
    case "new_booking_request":
      return {
        icon: <UserIcon className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-100",
        accentColor: "#3b82f6",
      };
    case "booking_confirmation":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
        iconBg: "bg-green-100",
        accentColor: "#22c55e",
      };
    case "service_completion_reminder":
      return {
        icon: <ClockIcon className="h-5 w-5 text-orange-600" />,
        iconBg: "bg-orange-100",
        accentColor: "#f97316",
      };
    case "review_request":
      return {
        icon: <StarIcon className="h-5 w-5 text-purple-600" />,
        iconBg: "bg-purple-100",
        accentColor: "#a855f7",
      };
    case "chat_message":
      return {
        icon: <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-100",
        accentColor: "#3b82f6",
      };
    case "client_no_show":
      return {
        icon: <UserIcon className="h-5 w-5 text-red-500" />,
        iconBg: "bg-red-100",
        accentColor: "#ef4444",
      };
    default:
      return {
        icon: <BellAlertIcon className="h-5 w-5 text-blue-600" />,
        iconBg: "bg-blue-100",
        accentColor: "#3b82f6",
      };
  }
}

const InAppNotificationPopup: React.FC<InAppNotificationPopupProps> = ({
  notification,
  index,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const style = useMemo(
    () => getNotificationStyle(notification.type),
    [notification.type],
  );

  const handleClick = () => {
    if (notification.href) {
      navigate(notification.href);
    }
    onDismiss();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss();
  };

  const topOffset = index * 92 + 16;

  return (
    <div
      className="notification-item pointer-events-auto absolute left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-full sm:max-w-md"
      style={{ top: `${topOffset}px` }}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`${
          notification.exiting ? "notification-exit" : "notification-enter"
        } relative cursor-pointer overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-[0_10px_40px_-6px_rgba(0,0,0,0.25)] backdrop-blur-xl`}
        onClick={handleClick}
      >
        {/* Background timer gradient — fills the card and shrinks over time */}
        {!notification.exiting && (
          <div
            className="notification-timer pointer-events-none absolute inset-y-0 left-0"
            style={{
              background: `linear-gradient(to right, ${style.accentColor}60, ${style.accentColor}30 60%, transparent)`,
              animation: `notification-shrink ${notification.duration ?? 5000}ms linear forwards`,
            }}
          />
        )}

        {/* Content sits above the background */}
        <div className="relative z-10 flex items-start gap-3 p-4">
          {/* Icon */}
          <span
            className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
          >
            {style.icon}
          </span>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {notification.title}
            </h4>
            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-gray-700">
              {notification.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InAppNotificationPopup;
