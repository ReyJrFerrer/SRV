import type { Notification } from "../hooks/useNotifications";
import type { ProviderNotification } from "../hooks/useProviderNotifications";
import notificationCanisterService from "./notificationCanisterService";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirebaseApp } from "./firebaseApp";

/**
 * Service to integrate notifications with Firebase Cloud Messaging
 * Note: FCM push notifications are now handled automatically by Firebase Cloud Functions
 * This service mainly tracks sent notifications and handles frontend-generated notifications
 */
class NotificationIntegrationService {
  private static instance: NotificationIntegrationService;
  private isInitialized = false;
  private userId: string | null = null;
  private pushEnabled = false;
  private sentNotifications = new Set<string>(); // Track already sent notifications
  private messaging: any = null;

  private constructor() {}

  static getInstance(): NotificationIntegrationService {
    if (!NotificationIntegrationService.instance) {
      NotificationIntegrationService.instance =
        new NotificationIntegrationService();
    }
    return NotificationIntegrationService.instance;
  }

  /**
   * Initialize the service with user context and FCM
   */
  async initialize(userId: string, isPushEnabled: boolean) {
    this.userId = userId;
    this.pushEnabled = isPushEnabled;
    this.isInitialized = true;
    // Clear sent notifications when user changes
    this.sentNotifications.clear();

    // Initialize FCM messaging if push is enabled
    if (isPushEnabled) {
      try {
        this.messaging = getMessaging(getFirebaseApp());

        // Request permission and get FCM token
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(this.messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });

          if (token) {
            // Store FCM token in backend
            await notificationCanisterService.storePushSubscription({
              endpoint: token, // FCM uses token as endpoint
              p256dh: "", // Not used in FCM
              auth: "", // Not used in FCM
            });

            console.log("FCM token registered successfully");
          }
        }

        // Listen for foreground messages
        onMessage(this.messaging, (payload) => {
          console.log("Received foreground message:", payload);
          // Handle foreground notification display
          if (payload.notification) {
            new Notification(payload.notification.title || "SRV Notification", {
              body: payload.notification.body,
              icon: payload.notification.icon || "/logo.svg",
              data: payload.data,
            });
          }
        });
      } catch (error) {
        console.error("Failed to initialize FCM:", error);
      }
    }
  }

  /**
   * Update push notification status
   */
  async updatePushStatus(enabled: boolean) {
    this.pushEnabled = enabled;

    if (enabled && !this.messaging) {
      // Initialize FCM if it wasn't initialized before
      await this.initialize(this.userId!, enabled);
    } else if (!enabled && this.messaging) {
      // Remove FCM token when disabled
      try {
        await notificationCanisterService.removePushSubscription();
      } catch (error) {
        console.error("Failed to remove FCM token:", error);
      }
    }
  }

  /**
   * Clear sent notifications cache (useful for debugging or when user changes)
   */
  clearSentNotificationsCache() {
    this.sentNotifications.clear();
    console.debug("Cleared sent notifications cache");
  }

  /**
   * Send push notification for a regular client notification
   * Note: With Firebase, push notifications are sent automatically by Cloud Functions
   * This method now only creates the notification in Firestore if needed
   */
  async sendClientNotification(notification: Notification): Promise<boolean> {
    if (!this.shouldSendPush()) {
      return false;
    }

    // Check if we already sent this notification
    if (this.sentNotifications.has(notification.id)) {
      console.debug(`Notification ${notification.id} already sent, skipping`);
      return false;
    }

    try {
      // Only create notification in Firestore if it's a frontend-generated notification
      // (notifications from backend already exist and FCM is sent automatically)
      if (notification.id.startsWith("frontend-")) {
        try {
          const result = await notificationCanisterService.createNotification(
            this.userId!,
            "client",
            notification.type,
            "SRV Notification",
            notification.message,
            notification.bookingId,
            {
              href: notification.href,
              providerName: notification.providerName,
              clientName: notification.clientName,
            },
          );

          // If rate limited, skip but don't fail
          if (result === "rate-limited") {
            console.info(
              "Notification creation rate limited, skipping",
            );
            return false;
          }

          // Track that we've created this notification
          this.sentNotifications.add(notification.id);
          return true;
        } catch (canisterError) {
          if (
            canisterError instanceof Error &&
            canisterError.message.includes("rate limit")
          ) {
            console.info(
              "Rate limit reached, skipping notification creation",
            );
          } else {
            console.warn(
              "Failed to create frontend notification:",
              canisterError,
            );
          }
          return false;
        }
      } else {
        // For backend notifications, just mark as push sent
        try {
          await notificationCanisterService.markAsPushSent(notification.id);
          this.sentNotifications.add(notification.id);
          return true;
        } catch (markError) {
          console.warn(
            "Failed to mark notification as push sent:",
            markError,
          );
          return false;
        }
      }
    } catch (error) {
      console.error("Error sending client push notification:", error);
      return false;
    }
  }

  /**
   * Send push notification for a provider notification
   * Note: With Firebase, push notifications are sent automatically by Cloud Functions
   * This method now only creates the notification in Firestore if needed
   */
  async sendProviderNotification(
    notification: ProviderNotification,
  ): Promise<boolean> {
    if (!this.shouldSendPush()) {
      return false;
    }

    // Check if we already sent this notification
    if (this.sentNotifications.has(notification.id)) {
      console.debug(
        `Provider notification ${notification.id} already sent, skipping`,
      );
      return false;
    }

    try {
      // Only create notification in Firestore if it's a frontend-generated notification
      if (notification.id.startsWith("frontend-")) {
        try {
          const result = await notificationCanisterService.createNotification(
            this.userId!,
            "provider",
            notification.type,
            "SRV Business Update",
            notification.message,
            notification.bookingId,
            {
              href: notification.href,
              clientName: notification.clientName,
              amount: notification.amount,
            },
          );

          // If rate limited, skip but don't fail
          if (result === "rate-limited") {
            console.info(
              "Provider notification creation rate limited, skipping",
            );
            return false;
          }

          // Track that we've created this notification
          this.sentNotifications.add(notification.id);
          return true;
        } catch (canisterError) {
          if (
            canisterError instanceof Error &&
            canisterError.message.includes("rate limit")
          ) {
            console.info(
              "Rate limit reached, skipping notification creation",
            );
          } else {
            console.warn(
              "Failed to create frontend provider notification:",
              canisterError,
            );
          }
          return false;
        }
      } else {
        // For backend notifications, just mark as push sent
        try {
          await notificationCanisterService.markAsPushSent(notification.id);
          this.sentNotifications.add(notification.id);
          return true;
        } catch (markError) {
          console.warn(
            "Failed to mark provider notification as push sent:",
            markError,
          );
          return false;
        }
      }
    } catch (error) {
      console.error("Error sending provider push notification:", error);
      return false;
    }
  }

  /**
   * Send push notifications for multiple client notifications
   */
  async sendClientNotificationsBatch(
    notifications: Notification[],
  ): Promise<number> {
    if (!this.shouldSendPush()) {
      return 0;
    }

    let successCount = 0;
    const unreadNotifications = notifications.filter((n) => !n.read);

    for (const notification of unreadNotifications) {
      const success = await this.sendClientNotification(notification);
      if (success) {
        successCount++;
      }
      // Small delay to avoid overwhelming the service
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return successCount;
  }

  /**
   * Send push notifications for multiple provider notifications
   */
  async sendProviderNotificationsBatch(
    notifications: ProviderNotification[],
  ): Promise<number> {
    if (!this.shouldSendPush()) {
      return 0;
    }

    let successCount = 0;
    const unreadNotifications = notifications.filter((n) => !n.read);

    for (const notification of unreadNotifications) {
      const success = await this.sendProviderNotification(notification);
      if (success) {
        successCount++;
      }
      // Small delay to avoid overwhelming the service
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return successCount;
  }

  /**
   * Check if we should send push notifications
   * Note: With FCM integrated into Cloud Functions, this mainly controls
   * whether frontend-generated notifications should be created
   */
  private shouldSendPush(): boolean {
    return (
      this.isInitialized &&
      this.userId !== null &&
      this.pushEnabled
    );
  }
}

// Export singleton instance
export const notificationIntegrationService =
  NotificationIntegrationService.getInstance();
export default notificationIntegrationService;
