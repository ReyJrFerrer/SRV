import { useEffect, useRef } from "react";
import { useInAppNotification } from "../../context/InAppNotificationContext";
import { useNotificationsWithPush } from "../../hooks/useNotificationsWithPush";
import { useProviderNotificationsWithPush } from "../../hooks/useProviderNotificationsWithPush";

// Module-level deduplication set shared across all bridge instances
const shownPopupIds = new Set<string>();

function getDefaultTitle(type: string): string {
  switch (type) {
    case "booking_accepted":
      return "Booking Accepted";
    case "booking_declined":
      return "Booking Declined";
    case "booking_cancelled":
      return "Booking Cancelled";
    case "booking_completed":
      return "Booking Completed";
    case "payment_received":
      return "Payment Received";
    case "payment_failed":
      return "Payment Failed";
    case "provider_message":
      return "New Message";
    case "system_announcement":
      return "Announcement";
    case "service_rescheduled":
      return "Rescheduled";
    case "service_reminder":
      return "Reminder";
    case "promo_offer":
      return "Special Offer";
    case "provider_on_the_way":
      return "Provider On The Way";
    case "review_reminder":
      return "Leave a Review";
    case "new_booking_request":
      return "New Booking Request";
    case "booking_confirmation":
      return "Booking Confirmed";
    case "payment_completed":
      return "Payment Completed";
    case "service_completion_reminder":
      return "Service Reminder";
    case "review_request":
      return "Review Request";
    case "chat_message":
      return "New Message";
    case "booking_rescheduled":
      return "Booking Rescheduled";
    case "client_no_show":
      return "Client No Show";
    case "payment_issue":
      return "Payment Issue";
    default:
      return "Notification";
  }
}

function useNotificationBridge(
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    title?: string;
    href: string;
    read: boolean;
    timestamp: string;
  }>,
) {
  const { showNotification } = useInAppNotification();
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    notifications.forEach((notif) => {
      // Skip if already shown, already read, or too old (arrived before mount)
      if (shownPopupIds.has(notif.id) || notif.read) return;

      const notifTime = new Date(notif.timestamp).getTime();
      if (notifTime < mountTimeRef.current) return;

      shownPopupIds.add(notif.id);
      showNotification({
        type: notif.type,
        title: notif.title || getDefaultTitle(notif.type),
        message: notif.message,
        href: notif.href,
      });
    });
  }, [notifications, showNotification]);
}

export function ClientNotificationBridge() {
  const { notifications } = useNotificationsWithPush();
  useNotificationBridge(notifications);
  return null;
}

export function ProviderNotificationBridge() {
  const { notifications } = useProviderNotificationsWithPush();
  useNotificationBridge(notifications);
  return null;
}
