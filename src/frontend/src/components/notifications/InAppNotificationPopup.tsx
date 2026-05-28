import React, { useMemo } from "react";
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
  CurrencyDollarIcon,
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
  gradientFrom: string;
  iconBg: string;
}

function getNotificationStyle(type: string): NotificationStyle {
  switch (type) {
    // Client notification types
    case "booking_accepted":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
        gradientFrom: "from-green-500",
        iconBg: "bg-green-100",
      };
    case "booking_declined":
    case "booking_cancelled":
      return {
        icon: <XCircleIcon className="h-5 w-5 text-red-600" />,
        gradientFrom: "from-red-500",
        iconBg: "bg-red-100",
      };
    case "booking_completed":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-blue-600" />,
        gradientFrom: "from-blue-500",
        iconBg: "bg-blue-100",
      };
    case "payment_received":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-700" />,
        gradientFrom: "from-green-600",
        iconBg: "bg-green-200",
      };
    case "payment_failed":
      return {
        icon: <XCircleIcon className="h-5 w-5 text-red-700" />,
        gradientFrom: "from-red-600",
        iconBg: "bg-red-200",
      };
    case "provider_message":
      return {
        icon: <EnvelopeOpenIcon className="h-5 w-5 text-purple-600" />,
        gradientFrom: "from-purple-500",
        iconBg: "bg-purple-100",
      };
    case "system_announcement":
      return {
        icon: <ServerStackIcon className="h-5 w-5 text-gray-700" />,
        gradientFrom: "from-gray-500",
        iconBg: "bg-gray-200",
      };
    case "service_rescheduled":
      return {
        icon: <ClockIcon className="h-5 w-5 text-yellow-700" />,
        gradientFrom: "from-yellow-500",
        iconBg: "bg-yellow-200",
      };
    case "service_reminder":
      return {
        icon: <StarIcon className="h-5 w-5 text-blue-500" />,
        gradientFrom: "from-blue-500",
        iconBg: "bg-blue-100",
      };
    case "promo_offer":
      return {
        icon: <StarIcon className="h-5 w-5 text-pink-500" />,
        gradientFrom: "from-pink-500",
        iconBg: "bg-pink-100",
      };
    case "provider_on_the_way":
      return {
        icon: <BellAlertIcon className="h-5 w-5 text-teal-600" />,
        gradientFrom: "from-teal-500",
        iconBg: "bg-teal-100",
      };
    case "review_reminder":
      return {
        icon: <StarIcon className="h-5 w-5 text-yellow-500" />,
        gradientFrom: "from-yellow-500",
        iconBg: "bg-yellow-100",
      };

    // Provider notification types
    case "new_booking_request":
      return {
        icon: <UserIcon className="h-5 w-5 text-blue-600" />,
        gradientFrom: "from-blue-500",
        iconBg: "bg-blue-100",
      };
    case "booking_confirmation":
      return {
        icon: <CheckCircleIcon className="h-5 w-5 text-green-600" />,
        gradientFrom: "from-green-500",
        iconBg: "bg-green-100",
      };
    case "payment_completed":
      return {
        icon: <CurrencyDollarIcon className="h-5 w-5 text-green-700" />,
        gradientFrom: "from-green-600",
        iconBg: "bg-green-200",
      };
    case "service_completion_reminder":
      return {
        icon: <ClockIcon className="h-5 w-5 text-orange-600" />,
        gradientFrom: "from-orange-500",
        iconBg: "bg-orange-100",
      };
    case "review_request":
      return {
        icon: <StarIcon className="h-5 w-5 text-purple-600" />,
        gradientFrom: "from-purple-500",
        iconBg: "bg-purple-100",
      };
    case "chat_message":
      return {
        icon: <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />,
        gradientFrom: "from-blue-500",
        iconBg: "bg-blue-100",
      };
    case "booking_rescheduled":
      return {
        icon: <ClockIcon className="h-5 w-5 text-yellow-600" />,
        gradientFrom: "from-yellow-500",
        iconBg: "bg-yellow-100",
      };
    case "client_no_show":
      return {
        icon: <UserIcon className="h-5 w-5 text-red-500" />,
        gradientFrom: "from-red-500",
        iconBg: "bg-red-100",
      };
    case "payment_issue":
      return {
        icon: <CurrencyDollarIcon className="h-5 w-5 text-red-700" />,
        gradientFrom: "from-red-600",
        iconBg: "bg-red-200",
      };

    default:
      return {
        icon: <BellAlertIcon className="h-5 w-5 text-blue-600" />,
        gradientFrom: "from-blue-500",
        iconBg: "bg-blue-100",
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
      className={`notification-item pointer-events-auto absolute left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-full sm:max-w-md`}
      style={{ top: `${topOffset}px` }}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`${
          notification.exiting ? "notification-exit" : "notification-enter"
        } cursor-pointer overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-2xl shadow-black/10 backdrop-blur-xl`}
        onClick={handleClick}
      >
        <div className="flex items-start gap-3 p-4">
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
            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-gray-600">
              {notification.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/50 hover:text-gray-600"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Gradient timer bar */}
        {!notification.exiting && (
          <div className="h-1 w-full bg-gray-200/50">
            <div
              className={`notification-timer h-full bg-gradient-to-r ${style.gradientFrom} to-transparent`}
              style={{
                animationDuration: `${notification.duration ?? 5000}ms`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InAppNotificationPopup;
