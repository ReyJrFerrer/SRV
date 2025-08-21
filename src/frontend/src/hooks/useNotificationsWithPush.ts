import { useState, useEffect, useCallback, useRef } from "react";
import { useBookingManagement } from "./bookingManagement";
import { useAuth } from "../context/AuthContext";
import { usePWA } from "./usePWA";
import notificationIntegrationService from "../services/notificationIntegrationService";

// Re-export the original types
export interface Notification {
  id: string;
  message: string;
  type:
    | "booking_accepted"
    | "booking_declined"
    | "review_reminder"
    | "generic"
    | "new_booking_request"
    | "booking_confirmation"
    | "payment_completed"
    | "service_completion_reminder"
    | "review_request"
    | "chat_message"
    | "booking_cancelled"
    | "booking_completed"
    | "payment_received"
    | "payment_failed"
    | "provider_message"
    | "system_announcement"
    | "service_rescheduled"
    | "service_reminder"
    | "promo_offer"
    | "provider_on_the_way";
  timestamp: string;
  read: boolean;
  href: string;
  providerName?: string;
  clientName?: string;
  bookingId?: string;
}

// In-memory store for unread count
const notificationStore = {
  count: 0,
  listeners: new Set<() => void>(),
  setCount(count: number) {
    if (this.count !== count) {
      this.count = count;
      this.listeners.forEach((listener) => listener());
    }
  },
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
};

// localStorage Helper Functions
const READ_NOTIFICATIONS_KEY = "readNotificationIds";

const getReadIds = (): string[] => {
  try {
    const item = window.localStorage.getItem(READ_NOTIFICATIONS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error("Error reading from localStorage", error);
    return [];
  }
};

const setReadIds = (ids: string[]) => {
  try {
    window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Error writing to localStorage", error);
  }
};

// Enhanced hook with push notification integration
export const useNotificationsWithPush = () => {
  const {
    bookings,
    loading: bookingLoading,
    error: bookingError,
  } = useBookingManagement();

  const { identity } = useAuth();
  const { pwaState } = usePWA();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(notificationStore.count);
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());

  // Get user ID
  const getUserId = (): string => {
    return identity?.getPrincipal().toString() || "anonymous";
  };

  // Initialize notification integration service
  useEffect(() => {
    const initializeIntegration = async () => {
      if (identity && pwaState.pushSubscribed) {
        await notificationIntegrationService.initialize(
          getUserId(),
          pwaState.pushSubscribed,
        );
      }
    };
    initializeIntegration();
  }, [identity, pwaState.pushSubscribed]);

  // Update push status when it changes
  useEffect(() => {
    notificationIntegrationService.updatePushStatus(pwaState.pushSubscribed);
  }, [pwaState.pushSubscribed]);

  // Subscribe to the notification store to keep the unread count in sync
  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setUnreadCount(notificationStore.count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Generate notifications based on the current list of bookings
  const fetchNotifications = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // Generate notifications for accepted or declined bookings
      const bookingStatusNotifications: Notification[] = bookings
        .filter((b) => b.status === "Accepted" || b.status === "Declined")
        .map((booking) => ({
          id: booking.id,
          message: `Your booking for "${booking.serviceName}" has been ${booking.status.toLowerCase()} by`,
          type:
            booking.status === "Accepted"
              ? "booking_accepted"
              : "booking_declined",
          timestamp: new Date().toISOString(),
          read: false,
          href: `/client/booking/${booking.id}`,
          providerName: booking.providerProfile?.name || "a provider",
          bookingId: booking.id,
        }));

      // Generate review reminders for completed but unreviewed bookings
      const reviewReminderNotifications: Notification[] = bookings
        .filter((b) => b.status === "Completed")
        .map((booking) => ({
          id: `review-${booking.id}`,
          message: `Please review your recent "${booking.serviceName}" service`,
          type: "review_reminder",
          timestamp: new Date(
            booking.completedDate || Date.now(),
          ).toISOString(),
          read: false,
          href: `/client/review/${booking.id}`,
          providerName: booking.providerProfile?.name,
          bookingId: booking.id,
        }));

      const readIds = getReadIds();
      const allNotifications = [
        ...bookingStatusNotifications,
        ...reviewReminderNotifications,
      ]
        .map((notif) => ({
          ...notif,
          read: readIds.includes(notif.id),
        }))
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

      // Check for new notifications and send push notifications
      const currentNotificationIds = new Set(allNotifications.map((n) => n.id));
      const newNotifications = allNotifications.filter(
        (notification) =>
          !previousNotificationIdsRef.current.has(notification.id) &&
          !notification.read,
      );

      // Send push notifications for new unread notifications
      if (newNotifications.length > 0) {
        console.log(
          `Sending ${newNotifications.length} new client push notifications`,
        );
        notificationIntegrationService
          .sendClientNotificationsBatch(newNotifications)
          .then((successCount) => {
            console.log(
              `Successfully sent ${successCount}/${newNotifications.length} client push notifications`,
            );
          })
          .catch((error) => {
            console.error("Error sending client push notifications:", error);
          });
      }

      previousNotificationIdsRef.current = currentNotificationIds;
      setNotifications(allNotifications);
      const newUnreadCount = allNotifications.filter((n) => !n.read).length;
      notificationStore.setCount(newUnreadCount);
      setLoading(false);
    } catch (error) {
      console.error("Error generating client notifications:", error);
      setError("Failed to load notifications");
      setLoading(false);
    }
  }, [bookings]);

  // Re-fetch notifications whenever the bookings data changes
  useEffect(() => {
    if (!bookingLoading) {
      fetchNotifications();
    }
  }, [bookingLoading, fetchNotifications]);

  // Marks a single notification as read
  const markAsRead = useCallback((notificationId: string) => {
    const readIds = getReadIds();
    if (!readIds.includes(notificationId)) {
      const newReadIds = [...readIds, notificationId];
      setReadIds(newReadIds);
    }

    setNotifications((prev) => {
      const newNotifications = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      );
      const newUnreadCount = newNotifications.filter((n) => !n.read).length;
      notificationStore.setCount(newUnreadCount);
      return newNotifications;
    });
  }, []);

  // Marks all currently loaded notifications as read
  const markAllAsRead = useCallback(() => {
    const currentIds = notifications.map((n) => n.id);
    const readIds = getReadIds();
    const newReadIds = Array.from(new Set([...readIds, ...currentIds]));
    setReadIds(newReadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notificationStore.setCount(0);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading: loading || bookingLoading,
    error: error || bookingError,
    markAsRead,
    markAllAsRead,
    // Additional properties for push notification status
    pushEnabled: pwaState.pushSubscribed,
    pushSupported: pwaState.pushNotificationSupported,
  };
};

// Keep the original hook for backward compatibility
export const useNotifications = useNotificationsWithPush;
