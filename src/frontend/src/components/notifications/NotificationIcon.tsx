import React from "react";
import { ProviderNotification } from "../../hooks/useProviderNotificationsWithPush";
import {
  TicketIcon,
  UserIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  XCircleIcon,
  BellAlertIcon,
} from "@heroicons/react/24/solid";

const NotificationIcon: React.FC<{
  type: ProviderNotification["type"];
  metadata?: any;
}> = ({ type, metadata }) => {
  const isTicketNotification = metadata?.ticketId !== undefined;

  let icon: React.ReactNode = null;
  let bg = "bg-blue-100";

  if (isTicketNotification) {
    icon = <TicketIcon className="h-6 w-6 text-orange-600" />;
    bg = "bg-orange-100";
  } else
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

export default NotificationIcon;
