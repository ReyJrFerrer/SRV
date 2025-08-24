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
const PUSH_SENT_NOTIFICATIONS_KEY = "pushSentNotificationIds";

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

const getPushSentIds = (): string[] => {
  try {
    const item = window.localStorage.getItem(PUSH_SENT_NOTIFICATIONS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error(
      "Error reading push sent notifications from localStorage",
      error,
    );
    return [];
  }
};

const setPushSentIds = (ids: string[]) => {
  try {
    window.localStorage.setItem(
      PUSH_SENT_NOTIFICATIONS_KEY,
      JSON.stringify(ids),
    );
  } catch (error) {
    console.error(
      "Error writing push sent notifications to localStorage",
      error,
    );
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
      const pushSentIds = getPushSentIds();
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

      // Filter notifications that should receive push notifications:
      // 1. Must be unread
      // 2. Must not have been push-notified before
      // 3. Must be a new notification (not in previous list)
      const currentNotificationIds = new Set(allNotifications.map((n) => n.id));
      const notificationsEligibleForPush = allNotifications.filter(
        (notification) =>
          !notification.read && // Must be unread
          !pushSentIds.includes(notification.id) && // Must not have been push-notified before
          !previousNotificationIdsRef.current.has(notification.id), // Must be new
      );

      // Send push notifications for eligible notifications
      if (notificationsEligibleForPush.length > 0) {
        console.log(
          `Sending ${notificationsEligibleForPush.length} new client push notifications`,
        );
        notificationIntegrationService
          .sendClientNotificationsBatch(notificationsEligibleForPush)
          .then((successCount) => {
            console.log(
              `Successfully sent ${successCount}/${notificationsEligibleForPush.length} client push notifications`,
            );

            // Mark these notifications as push-sent
            if (successCount > 0) {
              const newlyPushSentIds = notificationsEligibleForPush
                .slice(0, successCount)
                .map((n) => n.id);
              const updatedPushSentIds = [...pushSentIds, ...newlyPushSentIds];
              setPushSentIds(updatedPushSentIds);
            }
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

  // Marks a single notification as unread (for future use)
  const markAsUnread = useCallback((notificationId: string) => {
    const readIds = getReadIds();
    const newReadIds = readIds.filter((id) => id !== notificationId);
    setReadIds(newReadIds);

    // Also remove from push-sent list to allow re-push notification
    const pushSentIds = getPushSentIds();
    const newPushSentIds = pushSentIds.filter((id) => id !== notificationId);
    setPushSentIds(newPushSentIds);

    setNotifications((prev) => {
      const newNotifications = prev.map((n) =>
        n.id === notificationId ? { ...n, read: false } : n,
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
    markAsUnread,
    markAllAsRead,
    // Additional properties for push notification status
    pushEnabled: pwaState.pushSubscribed,
    pushSupported: pwaState.pushNotificationSupported,
  };
};

// Keep the original hook for backward compatibility
export const useNotifications = useNotificationsWithPush;
