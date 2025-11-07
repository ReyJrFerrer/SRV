import React from "react";
import { Notification } from "../../hooks/useNotificationsWithPush";
import {
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EnvelopeOpenIcon,
  TicketIcon,
} from "@heroicons/react/24/solid";

const NotificationIconClient: React.FC<{
  type: Notification["type"];
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
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
      {icon}
    </span>
  );
};

export default NotificationIconClient;
