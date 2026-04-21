// Notification Service - OneSignal Push Notifications Integration
import { httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  limit as firestoreLimit,
  getFirestore,
} from "firebase/firestore";
import { getFirebaseFunctions, getFirebaseApp } from "./firebaseApp";

// Initialize Firebase services
const functions = getFirebaseFunctions();
const db = getFirestore(getFirebaseApp());

// Frontend-compatible interfaces
export interface FrontendNotification {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
  href: string;
  providerName?: string;
  clientName?: string;
  bookingId?: string;
  title: string;
  userType: "client" | "provider";
  metadata?: any;
}

export interface NotificationStats {
  total: number;
  unread: number;
  pushSent: number;
  read: number;
}

export interface NotificationFilter {
  userType?: "client" | "provider";
  notificationType?: string;
  status?: "unread" | "read" | "push_sent" | "push_sent_and_read";
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Convert Firestore notification to frontend format
 */
const convertToFrontendNotification = (
  notificationData: any,
): FrontendNotification => {
  return {
    id: notificationData.id,
    message: notificationData.message,
    type: notificationData.notificationType,
    title: notificationData.title,
    timestamp: notificationData.createdAt || new Date().toISOString(),
    read:
      notificationData.status === "read" ||
      notificationData.status === "push_sent_and_read",
    href: notificationData.href, // Will be null for non-clickable notifications
    userType: notificationData.userType as "client" | "provider",
    providerName: notificationData.metadata?.senderName,
    clientName: notificationData.metadata?.senderName,
    bookingId: notificationData.relatedEntityId,
    metadata: notificationData.metadata,
  };
};

/**
 * Debounce helper function
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Shared listeners to prevent Firebase Web SDK 'Unexpected state' crashes
const sharedNotificationListeners = new Map<
  string,
  {
    unsubscribe: Unsubscribe;
    callbacks: Set<(notifications: FrontendNotification[]) => void>;
    lastData: FrontendNotification[] | null;
  }
>();

// Notification Service Functions using Firebase
export const notificationCanisterService = {
  /**
   * Get notifications for current user with real-time listener
   */
  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: FrontendNotification[]) => void,
    filter?: NotificationFilter,
  ): Unsubscribe {
    try {
      const filterKey = filter ? JSON.stringify(filter) : "";
      const listenerId = `user-notifs-${userId}-${filterKey}`;

      let listener = sharedNotificationListeners.get(listenerId);

      if (listener) {
        listener.callbacks.add(callback);
        if (listener.lastData) {
          callback(listener.lastData);
        }
        return () => {
          const l = sharedNotificationListeners.get(listenerId);
          if (l) {
            l.callbacks.delete(callback);
            if (l.callbacks.size === 0) {
              setTimeout(() => {
                const currentL = sharedNotificationListeners.get(listenerId);
                if (currentL && currentL.callbacks.size === 0) {
                  currentL.unsubscribe();
                  sharedNotificationListeners.delete(listenerId);
                }
              }, 1000);
            }
          }
        };
      }

      // Debounce the notification to all callbacks to prevent rapid re-renders
      const notifyAll = debounce((notifications: FrontendNotification[]) => {
        const currentListener = sharedNotificationListeners.get(listenerId);
        if (currentListener) {
          currentListener.lastData = notifications;
          currentListener.callbacks.forEach((cb) => cb(notifications));
        }
      }, 250);

      let q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );

      // Apply filters
      if (filter) {
        if (filter.userType) {
          q = query(q, where("userType", "==", filter.userType));
        }
        if (filter.notificationType) {
          q = query(
            q,
            where("notificationType", "==", filter.notificationType),
          );
        }
        if (filter.status) {
          q = query(q, where("status", "==", filter.status));
        }
        if (filter.limit) {
          q = query(q, firestoreLimit(filter.limit));
        }
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map((doc) => {
            const data = doc.data();
            return convertToFrontendNotification({
              id: doc.id,
              ...data,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate().toISOString()
                  : new Date().toISOString(),
            });
          });
          notifyAll(notifications);
        },
        () => {
          notifyAll([]);
        },
      );

      listener = {
        unsubscribe,
        callbacks: new Set([callback]),
        lastData: null,
      };

      sharedNotificationListeners.set(listenerId, listener);

      return () => {
        const l = sharedNotificationListeners.get(listenerId);
        if (l) {
          l.callbacks.delete(callback);
          if (l.callbacks.size === 0) {
            // Delay unsubscription to prevent Firestore 'Unexpected state' on rapid mount/unmount
            setTimeout(() => {
              const currentL = sharedNotificationListeners.get(listenerId);
              if (currentL && currentL.callbacks.size === 0) {
                currentL.unsubscribe();
                sharedNotificationListeners.delete(listenerId);
              }
            }, 1000);
          }
        }
      };
    } catch (error) {
      return () => {};
    }
  },

  /**
   * Get notifications for current user (one-time fetch)
   */
  async getUserNotifications(
    userId?: string,
    filter?: NotificationFilter,
  ): Promise<FrontendNotification[]> {
    try {
      const getUserNotificationsFunc = httpsCallable(
        functions,
        "getUserNotifications",
      );

      const result = await getUserNotificationsFunc({
        userId,
        filter,
      });

      const response = result.data as any;

      if (response.success && response.notifications) {
        return response.notifications.map(convertToFrontendNotification);
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to fetch notifications: ${error}`);
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const markAsReadFunc = httpsCallable(functions, "markNotificationAsRead");

      const result = await markAsReadFunc({
        notificationId,
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error}`);
    }
  },

  /**
   * Mark notification as push sent
   */
  async markAsPushSent(notificationId: string): Promise<void> {
    try {
      const markAsPushSentFunc = httpsCallable(
        functions,
        "markNotificationAsPushSent",
      );

      const result = await markAsPushSentFunc({
        notificationId,
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to mark notification as push sent");
      }
    } catch (error) {
      throw new Error(`Failed to mark notification as push sent: ${error}`);
    }
  },

  /**
   * Get notifications eligible for push
   */
  async getNotificationsForPush(
    userId?: string,
  ): Promise<FrontendNotification[]> {
    try {
      const getForPushFunc = httpsCallable(
        functions,
        "getNotificationsForPush",
      );

      const result = await getForPushFunc({
        userId,
      });

      const response = result.data as any;

      if (response.success && response.notifications) {
        return response.notifications.map(convertToFrontendNotification);
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to fetch notifications for push: ${error}`);
    }
  },

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    try {
      const getStatsFunc = httpsCallable(functions, "getNotificationStats");

      const result = await getStatsFunc({
        userId,
      });

      const response = result.data as any;

      if (response.success && response.stats) {
        return response.stats;
      }

      return { total: 0, unread: 0, pushSent: 0, read: 0 };
    } catch (error) {
      throw new Error(`Failed to get notification stats: ${error}`);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    try {
      const markAllAsReadFunc = httpsCallable(
        functions,
        "markAllNotificationsAsRead",
      );

      const result = await markAllAsReadFunc({});

      const response = result.data as any;

      if (response.success) {
        return response.count || 0;
      }

      return 0;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error}`);
    }
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const deleteNotificationFunc = httpsCallable(
        functions,
        "deleteNotification",
      );

      const result = await deleteNotificationFunc({
        notificationId,
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to delete notification");
      }
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error}`);
    }
  },

  /**
   * Check if user can receive notifications (rate limiting check)
   */
  async canReceiveNotification(
    userId: string,
    notificationType: string,
  ): Promise<boolean> {
    try {
      const canReceiveFunc = httpsCallable(functions, "canReceiveNotification");

      const result = await canReceiveFunc({
        userId,
        notificationType,
      });

      const response = result.data as any;

      return response.canReceive || false;
    } catch (error) {
      return false;
    }
  },

  /**
   * Create a notification
   */
  async createNotification(
    targetUserId: string,
    userType: "client" | "provider",
    notificationType: string,
    title: string,
    message: string,
    relatedEntityId?: string,
    metadata?: any,
  ): Promise<string> {
    try {
      // First check if we can receive notifications to avoid rate limiting
      const canReceive = await this.canReceiveNotification(
        targetUserId,
        notificationType,
      );

      if (!canReceive) {
        throw new Error("Notification rate limit exceeded");
      }

      const createNotificationFunc = httpsCallable(
        functions,
        "createNotification",
      );

      const result = await createNotificationFunc({
        targetUserId,
        userType,
        notificationType,
        title,
        message,
        relatedEntityId,
        metadata,
      });

      const response = result.data as any;

      if (response.success && response.notificationId) {
        return response.notificationId;
      }

      throw new Error("Failed to create notification");
    } catch (error) {
      // Don't rethrow rate limit errors as they're expected
      if (error instanceof Error && error.message.includes("rate limit")) {
        return "rate-limited";
      }

      throw new Error(`Failed to create notification: ${error}`);
    }
  },
};

export default notificationCanisterService;
