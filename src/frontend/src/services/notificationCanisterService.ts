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
} from "firebase/firestore";
import { getFirebaseFunctions, getFirebaseFirestore } from "./firebaseApp";

const functions = getFirebaseFunctions();
const db = getFirebaseFirestore();

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
    href: notificationData.href,
    userType: notificationData.userType as "client" | "provider",
    providerName: notificationData.metadata?.senderName,
    clientName: notificationData.metadata?.senderName,
    bookingId: notificationData.relatedEntityId,
    metadata: notificationData.metadata,
  };
};

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

const sharedNotificationListeners = new Map<
  string,
  {
    unsubscribe: Unsubscribe;
    callbacks: Set<(notifications: FrontendNotification[]) => void>;
    lastData: FrontendNotification[] | null;
  }
>();

export const notificationCanisterService = {
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

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.metadata.fromCache && snapshot.empty) {
          return;
        }
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
      });

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

  async getUserNotifications(
    userId?: string,
    filter?: NotificationFilter,
  ): Promise<FrontendNotification[]> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "getUserNotifications",
        data: { userId, filter },
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

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "markNotificationAsRead",
        data: { notificationId },
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to mark notification as read");
      }
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error}`);
    }
  },

  async markAsPushSent(notificationId: string): Promise<void> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "markNotificationAsPushSent",
        data: { notificationId },
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to mark notification as push sent");
      }
    } catch (error) {
      throw new Error(`Failed to mark notification as push sent: ${error}`);
    }
  },

  async getNotificationsForPush(
    userId?: string,
  ): Promise<FrontendNotification[]> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "getNotificationsForPush",
        data: { userId },
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

  async getNotificationStats(userId?: string): Promise<NotificationStats> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "getNotificationStats",
        data: { userId },
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

  async markAllAsRead(): Promise<number> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "markAllNotificationsAsRead",
        data: {},
      });

      const response = result.data as any;

      if (response.success) {
        return response.count || 0;
      }

      return 0;
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error}`);
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "deleteNotification",
        data: { notificationId },
      });

      const response = result.data as any;

      if (!response.success) {
        throw new Error("Failed to delete notification");
      }
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error}`);
    }
  },

  async canReceiveNotification(
    userId: string,
    notificationType: string,
  ): Promise<boolean> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "canReceiveNotification",
        data: { userId, notificationType },
      });

      const response = result.data as any;

      return response.canReceive || false;
    } catch (error) {
      return false;
    }
  },

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
      const canReceive = await this.canReceiveNotification(
        targetUserId,
        notificationType,
      );

      if (!canReceive) {
        throw new Error("Notification rate limit exceeded");
      }

      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      const result = await notificationActionFn({
        action: "createNotification",
        data: {
          targetUserId,
          userType,
          notificationType,
          title,
          message,
          relatedEntityId,
          metadata,
        },
      });

      const response = result.data as any;

      if (response.success && response.notificationId) {
        return response.notificationId;
      }

      throw new Error("Failed to create notification");
    } catch (error) {
      if (error instanceof Error && error.message.includes("rate limit")) {
        return "rate-limited";
      }

      throw new Error(`Failed to create notification: ${error}`);
    }
  },

  async storeOneSignalPlayerId(playerId: string): Promise<void> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      await notificationActionFn({
        action: "storeOneSignalPlayerId",
        data: { playerId },
      });
    } catch (error) {
      throw new Error(`Failed to store player ID: ${error}`);
    }
  },

  async removeOneSignalPlayerId(playerId?: string): Promise<void> {
    try {
      const notificationActionFn = httpsCallable(
        functions,
        "notificationAction",
      );

      await notificationActionFn({
        action: "removeOneSignalPlayerId",
        data: { playerId },
      });
    } catch (error) {
      throw new Error(`Failed to remove player ID: ${error}`);
    }
  },
};

export default notificationCanisterService;
