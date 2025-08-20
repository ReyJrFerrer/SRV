import { useState, useEffect, useCallback } from "react";
import { useProviderBookingManagement } from "./useProviderBookingManagement";

// --- Type Definition for a Provider Notification ---
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

// --- In-memory store for provider unread count ---
// This simple store allows multiple components to share the unread count without a full state management library.
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

// --- localStorage Helper Functions for Provider ---
const PROVIDER_READ_NOTIFICATIONS_KEY = "providerReadNotificationIds";

const getProviderReadIds = (): string[] => {
  try {
    const item = window.localStorage.getItem(PROVIDER_READ_NOTIFICATIONS_KEY);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error(
      "Error reading provider notifications from localStorage",
      error,
    );
    return [];
  }
};

const setProviderReadIds = (ids: string[]) => {
  try {
    window.localStorage.setItem(
      PROVIDER_READ_NOTIFICATIONS_KEY,
      JSON.stringify(ids),
    );
  } catch (error) {
    console.error(
      "Error writing provider notifications to localStorage",
      error,
    );
  }
};

// --- The Custom Provider Hook ---
export const useProviderNotifications = () => {
  const {
    bookings,
    loading: bookingLoading,
    error: bookingError,
  } = useProviderBookingManagement();

  const [notifications, setNotifications] = useState<ProviderNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(
    providerNotificationStore.count,
  );

  // Subscribes to the provider notification store to keep the unread count in sync
  useEffect(() => {
    const unsubscribe = providerNotificationStore.subscribe(() => {
      setUnreadCount(providerNotificationStore.count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Generates provider-specific notifications based on the current list of bookings
  const fetchProviderNotifications = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // 1. New booking requests
      const newBookingRequests = bookings
        .filter((booking) => booking.status === "Requested")
        .map((booking) => ({
          id: `new-booking-${booking.id}`,
          message: `New booking request for ${booking.serviceDetails?.title} from`,
          type: "new_booking_request" as const,
          timestamp: booking.createdAt,
          read: false,
          href: `/provider/booking/${booking.id}`,
          clientName: booking.clientName,
          bookingId: booking.id,
        }));

      // 2. Booking confirmations (when provider accepts)
      const bookingConfirmations = bookings
        .filter((booking) => booking.status === "Accepted")
        .map((booking) => ({
          id: `confirmation-${booking.id}`,
          message: `Booking confirmed for ${booking.serviceDetails?.title} with`,
          type: "booking_confirmation" as const,
          timestamp: booking.updatedAt,
          read: false,
          href: `/provider/booking/${booking.id}`,
          clientName: booking.clientName,
          bookingId: booking.id,
        }));

      // 3. Payment completed notifications
      const paymentCompletions = bookings
        .filter((booking) => booking.status === "Completed")
        .map((booking) => ({
          id: `payment-${booking.id}`,
          message: `Payment of ₱${booking.price.toFixed(2)} received for service completed with`,
          type: "payment_completed" as const,
          timestamp: booking.completedDate || booking.updatedAt,
          read: false,
          href: `/provider/receipt/${booking.id}`,
          clientName: booking.clientName,
          bookingId: booking.id,
          amount: booking.price,
        }));

      // 4. Service completion reminders (for InProgress bookings)
      const serviceReminders = bookings
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

      // 5. Review requests (for completed but unreviewed bookings)
      const reviewRequests = bookings
        .filter((booking) => booking.status === "Completed")
        .map((booking) => ({
          id: `review-request-${booking.id}`,
          message: `Please ask for a review from`,
          type: "review_request" as const,
          timestamp: booking.completedDate || booking.updatedAt,
          read: false,
          href: `/provider/booking/${booking.id}`,
          clientName: booking.clientName,
          bookingId: booking.id,
        }));

      // 6. Booking cancellations
      const bookingCancellations = bookings
        .filter((booking) => booking.status === "Cancelled")
        .map((booking) => ({
          id: `cancelled-${booking.id}`,
          message: `Booking for ${booking.serviceDetails?.title} was cancelled by`,
          type: "booking_cancelled" as const,
          timestamp: booking.updatedAt,
          read: false,
          href: `/provider/booking/${booking.id}`,
          clientName: booking.clientName,
          bookingId: booking.id,
        }));

      // Combine all notifications
      const allNotifications = [
        ...newBookingRequests,
        ...bookingConfirmations,
        ...paymentCompletions,
        ...serviceReminders,
        ...reviewRequests,
        ...bookingCancellations,
      ];

      // Apply read status from localStorage
      const readIds = getProviderReadIds();
      const notificationsWithReadStatus = allNotifications
        .map((notif) => ({
          ...notif,
          read: readIds.includes(notif.id),
        }))
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

      setNotifications(notificationsWithReadStatus);
      const newUnreadCount = notificationsWithReadStatus.filter(
        (n) => !n.read,
      ).length;
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
  const markAsRead = useCallback((notificationId: string) => {
    const readIds = getProviderReadIds();
    if (!readIds.includes(notificationId)) {
      const newReadIds = [...readIds, notificationId];
      setProviderReadIds(newReadIds);
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

  // Marks all currently loaded notifications as read
  const markAllAsRead = useCallback(() => {
    const currentIds = notifications.map((n) => n.id);
    const readIds = getProviderReadIds();
    const newReadIds = Array.from(new Set([...readIds, ...currentIds]));
    setProviderReadIds(newReadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    providerNotificationStore.setCount(0);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading: loading || bookingLoading,
    error: error || bookingError,
    markAsRead,
    markAllAsRead,
  };
};
