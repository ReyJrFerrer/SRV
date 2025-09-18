import { PushSubscriptionData } from "./pwaService";
import { Notification } from "../hooks/useNotifications";
import { ProviderNotification } from "../hooks/useProviderNotifications";
import notificationCanisterService from "./notificationCanisterService";

// Firebase configuration will be set later
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

// Push notification payload structure
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    href?: string;
    notificationId?: string;
    bookingId?: string;
    type?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  vibrate?: number[];
}

class PushNotificationService {
  private config: FirebaseConfig | null = null;
  private isInitialized = false;

  /**
   * Initialize the push notification service with Firebase config
   */
  async initialize(config: FirebaseConfig) {
    this.config = config;
    this.isInitialized = true;
    //console.log("Push Notification Service initialized");
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.config !== null;
  }

  /**
   * Get VAPID public key for subscription
   */
  getVapidPublicKey(): string {
    if (!this.config) {
      throw new Error("Push notification service not initialized");
    }
    return this.config.vapidKey;
  }

  /**
   * Store push subscription on your backend (ICP canister)
   */
  async storePushSubscription(
    subscription: PushSubscriptionData,
    userId: string,
  ): Promise<boolean> {
    try {
      // Convert PWA subscription format to canister format
      const canisterSubscription = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      };

      // Store push subscription in notification canister
      await notificationCanisterService.storePushSubscription(
        canisterSubscription,
      );
      return true;
    } catch (error) {
      console.error("Error storing push subscription:", error);

      // Fallback to localStorage
      try {
        const subscriptions = this.getStoredSubscriptions();
        subscriptions[userId] = {
          ...subscription,
          timestamp: Date.now(),
          active: true,
        };
        localStorage.setItem(
          "push-subscriptions",
          JSON.stringify(subscriptions),
        );
        return true;
      } catch (fallbackError) {
        console.error(
          "Error storing push subscription in localStorage:",
          fallbackError,
        );
        return false;
      }
    }
  }

  /**
   * Remove push subscription from backend
   */
  async removePushSubscription(userId: string): Promise<boolean> {
    try {
      // Remove push subscription from notification canister
      await notificationCanisterService.removePushSubscription();

      // Also remove from localStorage as cleanup
      const subscriptions = this.getStoredSubscriptions();
      delete subscriptions[userId];
      localStorage.setItem("push-subscriptions", JSON.stringify(subscriptions));

      return true;
    } catch (error) {
      console.error("Error removing push subscription:", error);

      // Fallback to localStorage cleanup only
      try {
        const subscriptions = this.getStoredSubscriptions();
        delete subscriptions[userId];
        localStorage.setItem(
          "push-subscriptions",
          JSON.stringify(subscriptions),
        );
        return true;
      } catch (fallbackError) {
        console.error(
          "Error removing push subscription from localStorage:",
          fallbackError,
        );
        return false;
      }
    }
  }

  /**
   * Send push notification (this would typically be called from your backend)
   * For demo purposes, we'll simulate sending notifications
   */
  async sendPushNotification(
    _userId: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error("Push notification service not initialized");
      }

      // In a real implementation, this would be called from your backend
      // using Firebase Admin SDK or similar service
      //console.log("Would send push notification:", { userId, payload });

      // For development/testing, we can trigger local notifications
      if ("serviceWorker" in navigator && "Notification" in window) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/logo.svg",
          badge: payload.badge || "/logo.svg",
          tag: payload.tag,
          data: payload.data,
          requireInteraction: payload.requireInteraction,
          vibrate: payload.vibrate,
        } as NotificationOptions & { actions?: any[] });
        return true;
      }

      return false;
    } catch (error) {
      //console.error("Error sending push notification:", error);
      return false;
    }
  }

  /**
   * Convert existing notification to push notification payload
   */
  notificationToPushPayload(
    notification: Notification | ProviderNotification,
  ): PushNotificationPayload {
    const basePayload: PushNotificationPayload = {
      title: "SRV Notification",
      body: notification.message,
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: `srv-${notification.type}`,
      data: {
        url: notification.href,
        href: notification.href,
        notificationId: notification.id,
        type: notification.type,
        bookingId: notification.bookingId,
      },
    };

    // Customize based on notification type
    switch (notification.type) {
      case "new_booking_request":
        basePayload.title = "New Booking Request";
        basePayload.body = `${notification.message} ${(notification as ProviderNotification).clientName}`;
        basePayload.requireInteraction = true;
        basePayload.actions = [
          { action: "view", title: "View Details" },
          { action: "dismiss", title: "Dismiss" },
        ];
        break;

      case "booking_accepted":
      case "booking_confirmation":
        basePayload.title = "Booking Confirmed";
        basePayload.body = notification.message;
        basePayload.actions = [{ action: "view", title: "View Booking" }];
        break;

      case "payment_completed":
        basePayload.title = "Payment Received";
        basePayload.body = notification.message;
        if ("amount" in notification && notification.amount) {
          basePayload.data!.amount = notification.amount;
        }
        break;

      case "service_completion_reminder":
        basePayload.title = "Service Reminder";
        basePayload.body = notification.message;
        basePayload.requireInteraction = true;
        break;

      case "chat_message":
        basePayload.title = "New Message";
        basePayload.body = notification.message;
        basePayload.actions = [
          { action: "reply", title: "Reply" },
          { action: "view", title: "View Chat" },
        ];
        break;

      case "booking_cancelled":
        basePayload.title = "Booking Cancelled";
        basePayload.body = notification.message;
        break;

      default:
        basePayload.title = "SRV Update";
        break;
    }

    return basePayload;
  }

  /**
   * Test push notification functionality
   */
  async testPushNotification(): Promise<boolean> {
    const testPayload: PushNotificationPayload = {
      title: "Test Notification",
      body: "This is a test push notification from SRV!",
      icon: "/logo.svg",
      tag: "test-notification",
      data: {
        url: "/",
        type: "test",
      },
    };

    return this.sendPushNotification("test-user", testPayload);
  }

  /**
   * Get stored subscriptions (localStorage backup)
   */
  private getStoredSubscriptions(): Record<string, any> {
    try {
      const stored = localStorage.getItem("push-subscriptions");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Handle push notification action (called from service worker)
   */
  handleNotificationAction(action: string, notification: any) {
    //console.log("Handling notification action:", action, notification);

    switch (action) {
      case "view":
        if (notification.data?.url) {
          window.location.href = notification.data.url;
        }
        break;
      case "reply":
        // Open chat interface
        if (notification.data?.bookingId) {
          window.location.href = `/chat/${notification.data.bookingId}`;
        }
        break;
      case "dismiss":
        // Just close the notification
        break;
      default:
      //console.log("Unknown notification action:", action);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
