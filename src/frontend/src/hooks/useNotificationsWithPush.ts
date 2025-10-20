import { useState, useEffect, useCallback, useRef } from "react";
import { useBookingManagement } from "./bookingManagement";
import { useAuth } from "../context/AuthContext";
import { usePWA } from "./usePWA";
import notificationCanisterService, {
  updateNotificationActor,
} from "../services/notificationCanisterService";

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
    | "provider_on_the_way"
    | "booking_not_selected"
    | "booking_missed_timeslot";
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

// Canister Helper Functions (replacing localStorage)
const getReadIds = async (): Promise<string[]> => {
  try {
    // Get all user notifications from canister and filter for read ones
    const notifications =
      await notificationCanisterService.getUserNotifications();
    return notifications.filter((n) => n.read).map((n) => n.id);
  } catch (error) {
    console.error("Error reading from canister", error);
    // Fallback to localStorage
    try {
      const item = window.localStorage.getItem(READ_NOTIFICATIONS_KEY);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }
};

const setReadIds = async (ids: string[]) => {
  try {
    // Mark notifications as read in canister
    for (const id of ids) {
      await notificationCanisterService.markAsRead(id);
    }
  } catch (error) {
    console.error("Error marking as read in canister", error);
    // Fallback to localStorage
    try {
      window.localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
    } catch (fallbackError) {
      console.error("Error writing to localStorage", fallbackError);
    }
  }
};

const getPushSentIds = async (): Promise<string[]> => {
  try {
    // Get notifications that are marked as push-sent from the canister
    const notifications =
      await notificationCanisterService.getNotificationsForPush();
    // For now, we'll check metadata for pushSent status
    return notifications
      .filter((n) => n.metadata?.pushSent === true)
      .map((n) => n.id);
  } catch (error) {
    console.error("Error reading push sent notifications from canister", error);
    // Fallback to localStorage
    try {
      const item = window.localStorage.getItem(PUSH_SENT_NOTIFICATIONS_KEY);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }
};

const setPushSentIds = async (ids: string[]) => {
  try {
    // Mark notifications as push-sent in canister
    for (const id of ids) {
      await notificationCanisterService.markAsPushSent(id);
    }
  } catch (error) {
    console.error("Error marking as push sent in canister", error);
    // Fallback to localStorage
    try {
      window.localStorage.setItem(
        PUSH_SENT_NOTIFICATIONS_KEY,
        JSON.stringify(ids),
      );
    } catch (fallbackError) {
      console.error(
        "Error writing push sent notifications to localStorage",
        fallbackError,
      );
    }
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
  const [unreadCount, setUnreadCount] = useState(notificationStore.count);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get user ID
  const getUserId = (): string => {
    return identity?.getPrincipal().toString() || "anonymous";
  };

  // Update notification actor when identity changes
  useEffect(() => {
    updateNotificationActor(identity);
  }, [identity]);

  // Subscribe to real-time notifications from Firebase
  useEffect(() => {
    const userId = getUserId();
    if (userId === "anonymous") {
      setLoading(false);
      return;
    }

    // Set up real-time listener for notifications
    const unsubscribe =
      notificationCanisterService.subscribeToUserNotifications(
        userId,
        (canisterNotifications) => {
          // Convert canister notifications to frontend format
          const notificationsFromCanister: Notification[] =
            canisterNotifications.map((notif) => ({
              id: notif.id,
              message: notif.message,
              type: notif.type as any,
              timestamp: notif.timestamp,
              read: notif.read,
              href: notif.href,
              providerName: notif.providerName,
              clientName: notif.clientName,
              bookingId: notif.bookingId,
            }));

          // For backward compatibility, combine with booking-based notifications
          // But only generate for bookings without canister notifications
          const existingNotificationBookingIds = new Set(
            canisterNotifications
              .filter((n) => n.bookingId)
              .map((n) => n.bookingId!),
          );

          // Generate additional notifications only for uncovered bookings
          const additionalNotifications: Notification[] = [];
          const uncoveredBookings = bookings.filter(
            (b) => !existingNotificationBookingIds.has(b.id),
          );

          if (uncoveredBookings.length > 0) {
            // Generate review reminders for completed but unreviewed bookings
            const reviewReminderNotifications: Notification[] =
              uncoveredBookings
                .filter((b) => b.status === "Completed")
                .map((booking) => ({
                  id: `frontend-review-${booking.id}-${Date.now()}`,
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

            additionalNotifications.push(...reviewReminderNotifications);
          }

          // Combine and sort all notifications
          const allNotifications = [
            ...notificationsFromCanister,
            ...additionalNotifications,
          ].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );

          setNotifications(allNotifications);
          const newUnreadCount = allNotifications.filter((n) => !n.read).length;
          notificationStore.setCount(newUnreadCount);
          setLoading(false);
        },
        { userType: "client" },
      );

    // Store the unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [identity, bookings]);

  // Subscribe to the notification store to keep the unread count in sync
  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setUnreadCount(notificationStore.count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Marks a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Try to mark as read in canister first
      await notificationCanisterService.markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // If it's a frontend-generated notification (not in canister), just update locally
      if (
        notificationId.startsWith("frontend-review-") ||
        notificationId.startsWith("frontend-booking-status-")
      ) {
        console.log("Frontend-generated notification, updating locally only");
      } else {
        // For other errors, try localStorage fallback
        const readIds = await getReadIds();
        if (!readIds.includes(notificationId)) {
          await setReadIds([...readIds, notificationId]);
        }
      }
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
  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      // For unread, we need to get current read IDs and remove this one
      const readIds = await getReadIds();
      const newReadIds = readIds.filter((id) => id !== notificationId);
      await setReadIds(newReadIds);

      // Also remove from push-sent list to allow re-push notification
      const pushSentIds = await getPushSentIds();
      const newPushSentIds = pushSentIds.filter((id) => id !== notificationId);
      await setPushSentIds(newPushSentIds);
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }

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
  const markAllAsRead = useCallback(async () => {
    try {
      // Use canister's markAllAsRead method
      await notificationCanisterService.markAllAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Fallback to individual marking
      const currentIds = notifications.map((n) => n.id);
      const readIds = await getReadIds();
      const newReadIds = Array.from(new Set([...readIds, ...currentIds]));
      await setReadIds(newReadIds);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notificationStore.setCount(0);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading: loading || bookingLoading,
    error: bookingError,
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
