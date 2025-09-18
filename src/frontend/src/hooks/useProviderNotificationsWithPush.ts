import { useState, useEffect, useCallback, useRef } from "react";
import { useProviderBookingManagement } from "./useProviderBookingManagement";
import { useAuth } from "../context/AuthContext";
import { usePWA } from "./usePWA";
import notificationIntegrationService from "../services/notificationIntegrationService";
import notificationCanisterService, {
  updateNotificationActor,
} from "../services/notificationCanisterService";

// Re-export the original types
export interface ProviderNotification {
  id: string;
  message: string;
  type:
    | "new_booking_request"
    | "booking_confirmation"
    | "payment_completed"
    | "service_completion_reminder"
    | "review_request"
    | "chat_message"
    | "booking_cancelled"
    | "booking_rescheduled"
    | "client_no_show"
    | "payment_issue";
  timestamp: string;
  read: boolean;
  href: string;
  clientName?: string;
  bookingId?: string;
  amount?: number;
}

// In-memory store for provider unread count
const providerNotificationStore = {
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

// Canister Helper Functions for Provider (replacing localStorage)
const PROVIDER_READ_NOTIFICATIONS_KEY = "providerReadNotificationIds";
const PROVIDER_PUSH_SENT_NOTIFICATIONS_KEY = "providerPushSentNotificationIds";

const getProviderReadIds = async (): Promise<string[]> => {
  try {
    // Get all provider notifications from canister and filter for read ones
    const notifications =
      await notificationCanisterService.getUserNotifications(undefined, {
        userType: "provider",
      });
    return notifications.filter((n) => n.read).map((n) => n.id);
  } catch (error) {
    console.error("Error reading provider notifications from canister", error);
    // Fallback to localStorage
    try {
      const item = window.localStorage.getItem(PROVIDER_READ_NOTIFICATIONS_KEY);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }
};

const setProviderReadIds = async (ids: string[]) => {
  try {
    // Mark notifications as read in canister
    for (const id of ids) {
      await notificationCanisterService.markAsRead(id);
    }
  } catch (error) {
    console.error(
      "Error marking provider notifications as read in canister",
      error,
    );
    // Fallback to localStorage
    try {
      window.localStorage.setItem(
        PROVIDER_READ_NOTIFICATIONS_KEY,
        JSON.stringify(ids),
      );
    } catch (fallbackError) {
      console.error(
        "Error writing provider notifications to localStorage",
        fallbackError,
      );
    }
  }
};

const getProviderPushSentIds = async (): Promise<string[]> => {
  try {
    // Get provider notifications that are marked as push-sent from the canister
    const notifications =
      await notificationCanisterService.getNotificationsForPush(undefined);
    // Filter for provider notifications and check metadata for pushSent status
    return notifications
      .filter((n) => n.userType === "provider" && n.metadata?.pushSent === true)
      .map((n) => n.id);
  } catch (error) {
    console.error(
      "Error reading provider push sent notifications from canister",
      error,
    );
    // Fallback to localStorage
    try {
      const item = window.localStorage.getItem(
        PROVIDER_PUSH_SENT_NOTIFICATIONS_KEY,
      );
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  }
};

const setProviderPushSentIds = async (ids: string[]) => {
  try {
    // Mark notifications as push-sent in canister
    for (const id of ids) {
      await notificationCanisterService.markAsPushSent(id);
    }
  } catch (error) {
    console.error(
      "Error marking provider notifications as push sent in canister",
      error,
    );
    // Fallback to localStorage
    try {
      window.localStorage.setItem(
        PROVIDER_PUSH_SENT_NOTIFICATIONS_KEY,
        JSON.stringify(ids),
      );
    } catch (fallbackError) {
      console.error(
        "Error writing provider push sent notifications to localStorage",
        fallbackError,
      );
    }
  }
};

// Enhanced provider hook with push notification integration
export const useProviderNotificationsWithPush = () => {
  const {
    bookings,
    loading: bookingLoading,
    error: bookingError,
  } = useProviderBookingManagement();

  const { identity } = useAuth();
  const { pwaState } = usePWA();

  const [notifications, setNotifications] = useState<ProviderNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(
    providerNotificationStore.count,
  );
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());

  // Get user ID
  const getUserId = (): string => {
    return identity?.getPrincipal().toString() || "anonymous";
  };

  // Update notification actor when identity changes
  useEffect(() => {
    updateNotificationActor(identity);
  }, [identity]);

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

  // Subscribe to the provider notification store
  useEffect(() => {
    const unsubscribe = providerNotificationStore.subscribe(() => {
      setUnreadCount(providerNotificationStore.count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Generate provider-specific notifications based on bookings
  const fetchProviderNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch notifications from canister first
      const canisterNotifications =
        await notificationCanisterService.getUserNotifications(
          identity?.getPrincipal().toString(),
          { userType: "provider" },
        );

      // Convert canister notifications to provider notification format
      const notificationsFromCanister: ProviderNotification[] =
        canisterNotifications.map((notif) => ({
          id: notif.id,
          message: notif.message,
          type: notif.type as any,
          timestamp: notif.timestamp,
          read: notif.read,
          href: notif.href,
          clientName: notif.clientName,
          bookingId: notif.bookingId,
          amount: notif.metadata?.amount || undefined,
        }));

      // For backward compatibility, still generate some notifications from booking data
      // But only if they don't already exist in the canister
      const existingNotificationBookingIds = new Set(
        canisterNotifications
          .filter((n) => n.bookingId)
          .map((n) => n.bookingId!),
      );

      // Generate additional notifications for bookings not covered by canister
      const additionalNotifications: ProviderNotification[] = [];

      // Only generate for bookings that don't have canister notifications
      const uncoveredBookings = bookings.filter(
        (b) => !existingNotificationBookingIds.has(b.id),
      );

      if (uncoveredBookings.length > 0) {
        // 4. Service completion reminders (for InProgress bookings)
        const serviceReminders = uncoveredBookings
          .filter((booking) => booking.status === "InProgress")
          .map((booking) => ({
            id: `reminder-${booking.id}`,
            message: `Don't forget to complete the service for`,
            type: "service_completion_reminder" as const,
            timestamp: new Date().toISOString(),
            read: false,
            href: `/provider/active-service/${booking.id}`,
            clientName: booking.clientName,
            bookingId: booking.id,
          }));

        additionalNotifications.push(...serviceReminders);
      }

      // Combine canister notifications with additional frontend-generated ones
      const allNotifications = [
        ...notificationsFromCanister,
        ...additionalNotifications,
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Handle push notifications for new notifications
      if (pwaState.pushSubscribed) {
        const currentNotificationIds = new Set(
          allNotifications.map((n) => n.id),
        );
        const newNotificationIds = Array.from(currentNotificationIds).filter(
          (id) => !previousNotificationIdsRef.current.has(id),
        );

        if (newNotificationIds.length > 0) {
          const newNotifications = allNotifications.filter(
            (n) => newNotificationIds.includes(n.id) && !n.read,
          );

          // Send push notifications for new notifications
          if (newNotifications.length > 0) {
            notificationIntegrationService
              .sendProviderNotificationsBatch(newNotifications)
              .then((successCount) => {
                console.log(`Sent ${successCount} provider push notifications`);
              })
              .catch((error) => {
                console.error(
                  "Error sending provider push notifications:",
                  error,
                );
              });
          }
        }

        // Update the previous notification IDs
        previousNotificationIdsRef.current = currentNotificationIds;
      }

      setNotifications(allNotifications);
      const newUnreadCount = allNotifications.filter((n) => !n.read).length;
      providerNotificationStore.setCount(newUnreadCount);
      setLoading(false);
    } catch (error) {
      console.error("Error generating provider notifications:", error);
      setError("Failed to load provider notifications");
      setLoading(false);
    }
  }, [bookings]);

  // Re-fetch notifications whenever the bookings data changes
  useEffect(() => {
    if (!bookingLoading) {
      fetchProviderNotifications();
    }
  }, [bookingLoading, fetchProviderNotifications]);

  // Marks a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Try to mark as read in canister first
      await notificationCanisterService.markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking provider notification as read:", error);
      // If it's a frontend-generated notification (not in canister), just update locally
      if (
        notificationId.startsWith("reminder-") ||
        notificationId.startsWith("new-booking-")
      ) {
        console.log(
          "Frontend-generated provider notification, updating locally only",
        );
      } else {
        // For other errors, try localStorage fallback
        const readIds = await getProviderReadIds();
        if (!readIds.includes(notificationId)) {
          await setProviderReadIds([...readIds, notificationId]);
        }
      }
    }

    setNotifications((prev) => {
      const newNotifications = prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      );
      const newUnreadCount = newNotifications.filter((n) => !n.read).length;
      providerNotificationStore.setCount(newUnreadCount);
      return newNotifications;
    });
  }, []);

  // Marks a single notification as unread (for future use)
  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      // For unread, we need to get current read IDs and remove this one
      const readIds = await getProviderReadIds();
      const newReadIds = readIds.filter((id) => id !== notificationId);
      await setProviderReadIds(newReadIds);

      // Also remove from push-sent list to allow re-push notification
      const pushSentIds = await getProviderPushSentIds();
      const newPushSentIds = pushSentIds.filter((id) => id !== notificationId);
      await setProviderPushSentIds(newPushSentIds);
    } catch (error) {
      console.error("Error marking provider notification as unread:", error);
    }

    setNotifications((prev) => {
      const newNotifications = prev.map((n) =>
        n.id === notificationId ? { ...n, read: false } : n,
      );
      const newUnreadCount = newNotifications.filter((n) => !n.read).length;
      providerNotificationStore.setCount(newUnreadCount);
      return newNotifications;
    });
  }, []);

  // Marks all currently loaded notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Use canister's markAllAsRead method
      await notificationCanisterService.markAllAsRead();
    } catch (error) {
      console.error("Error marking all provider notifications as read:", error);
      // Fallback to individual marking
      const currentIds = notifications.map((n) => n.id);
      const readIds = await getProviderReadIds();
      const newReadIds = Array.from(new Set([...readIds, ...currentIds]));
      await setProviderReadIds(newReadIds);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    providerNotificationStore.setCount(0);
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
export const useProviderNotifications = useProviderNotificationsWithPush;
