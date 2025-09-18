import pushNotificationService, {
  PushNotificationPayload,
} from "./pushNotificationService";
import { Notification } from "../hooks/useNotifications";
import { ProviderNotification } from "../hooks/useProviderNotifications";
import notificationCanisterService from "./notificationCanisterService";

/**
 * Service to integrate existing notification hooks with PWA push notifications
 */
class NotificationIntegrationService {
  private static instance: NotificationIntegrationService;
  private isInitialized = false;
  private userId: string | null = null;
  private pushEnabled = false;

  private constructor() {}

  static getInstance(): NotificationIntegrationService {
    if (!NotificationIntegrationService.instance) {
      NotificationIntegrationService.instance =
        new NotificationIntegrationService();
    }
    return NotificationIntegrationService.instance;
  }

  /**
   * Initialize the service with user context
   */
  async initialize(userId: string, isPushEnabled: boolean) {
    this.userId = userId;
    this.pushEnabled = isPushEnabled;
    this.isInitialized = true;
    // //console.log("Notification Integration Service initialized:", {
    //   userId,
    //   isPushEnabled,
    // });
  }

  /**
   * Update push notification status
   */
  updatePushStatus(enabled: boolean) {
    this.pushEnabled = enabled;
  }

  /**
   * Send push notification for a regular client notification
   */
  async sendClientNotification(notification: Notification): Promise<boolean> {
    if (!this.shouldSendPush()) {
      return false;
    }

    try {
      // Create notification in canister first
      try {
        await notificationCanisterService.createNotification(
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
          }
        );
      } catch (canisterError) {
        console.warn("Failed to create notification in canister:", canisterError);
        // Continue with push notification even if canister creation fails
      }

      const payload = this.convertClientNotificationToPush(notification);
      const success = await pushNotificationService.sendPushNotification(
        this.userId!,
        payload,
      );

      if (success) {
        // Mark as push sent in canister
        try {
          await notificationCanisterService.markAsPushSent(notification.id);
        } catch (markError) {
          console.warn("Failed to mark notification as push sent:", markError);
        }
      }

      return success;
    } catch (error) {
      console.error("Error sending client push notification:", error);
      return false;
    }
  }

  /**
   * Send push notification for a provider notification
   */
  async sendProviderNotification(
    notification: ProviderNotification,
  ): Promise<boolean> {
    if (!this.shouldSendPush()) {
      return false;
    }

    try {
      // Create notification in canister first
      try {
        await notificationCanisterService.createNotification(
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
          }
        );
      } catch (canisterError) {
        console.warn("Failed to create provider notification in canister:", canisterError);
        // Continue with push notification even if canister creation fails
      }

      const payload = this.convertProviderNotificationToPush(notification);
      const success = await pushNotificationService.sendPushNotification(
        this.userId!,
        payload,
      );

      if (success) {
        // Mark as push sent in canister
        try {
          await notificationCanisterService.markAsPushSent(notification.id);
        } catch (markError) {
          console.warn("Failed to mark provider notification as push sent:", markError);
        }
      }

      return success;
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
      // Small delay to avoid overwhelming the push service
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
      // Small delay to avoid overwhelming the push service
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return successCount;
  }

  /**
   * Convert client notification to push payload
   */
  private convertClientNotificationToPush(
    notification: Notification,
  ): PushNotificationPayload {
    const basePayload: PushNotificationPayload = {
      title: "SRV Update",
      body:
        notification.message +
        (notification.providerName ? ` ${notification.providerName}` : ""),
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: `client-${notification.type}`,
      data: {
        url: notification.href,
        href: notification.href,
        notificationId: notification.id,
        type: notification.type,
        bookingId: notification.bookingId,
        userType: "client",
      },
    };

    // Customize based on notification type
    switch (notification.type) {
      case "booking_accepted":
        basePayload.title = "✅ Booking Accepted!";
        basePayload.requireInteraction = true;
        basePayload.actions = [
          { action: "view", title: "View Booking" },
          { action: "dismiss", title: "Dismiss" },
        ];
        break;

      case "booking_declined":
        basePayload.title = "❌ Booking Declined";
        basePayload.requireInteraction = true;
        break;

      case "review_reminder":
        basePayload.title = "⭐ Review Reminder";
        basePayload.body = notification.message;
        basePayload.actions = [
          { action: "review", title: "Leave Review" },
          { action: "dismiss", title: "Later" },
        ];
        break;

      case "booking_completed":
        basePayload.title = "✅ Service Completed";
        basePayload.requireInteraction = true;
        break;

      case "provider_on_the_way":
        basePayload.title = "🚗 Provider On The Way";
        basePayload.requireInteraction = true;
        basePayload.vibrate = [200, 100, 200];
        break;

      default:
        basePayload.title = "SRV Notification";
        break;
    }

    return basePayload;
  }

  /**
   * Convert provider notification to push payload
   */
  private convertProviderNotificationToPush(
    notification: ProviderNotification,
  ): PushNotificationPayload {
    const basePayload: PushNotificationPayload = {
      title: "SRV Business Update",
      body:
        notification.message +
        (notification.clientName ? ` ${notification.clientName}` : ""),
      icon: "/logo.svg",
      badge: "/logo.svg",
      tag: `provider-${notification.type}`,
      data: {
        url: notification.href,
        href: notification.href,
        notificationId: notification.id,
        type: notification.type,
        bookingId: notification.bookingId,
        userType: "provider",
        amount: notification.amount,
      },
    };

    // Customize based on notification type
    switch (notification.type) {
      case "new_booking_request":
        basePayload.title = "🔔 New Booking Request!";
        basePayload.requireInteraction = true;
        basePayload.actions = [
          { action: "view", title: "View Details" },
          { action: "dismiss", title: "Later" },
        ];
        basePayload.vibrate = [200, 100, 200, 100, 200];
        break;

      case "booking_confirmation":
        basePayload.title = "✅ Booking Confirmed";
        basePayload.actions = [{ action: "view", title: "View Booking" }];
        break;

      case "payment_completed":
        basePayload.title = "💰 Payment Received";
        if (notification.amount) {
          basePayload.body = `Payment of ₱${notification.amount.toFixed(2)} received!`;
        }
        basePayload.requireInteraction = true;
        break;

      case "service_completion_reminder":
        basePayload.title = "⏰ Service Reminder";
        basePayload.actions = [
          { action: "complete", title: "Mark Complete" },
          { action: "view", title: "View Details" },
        ];
        break;

      case "chat_message":
        basePayload.title = "💬 New Message";
        basePayload.actions = [
          { action: "reply", title: "Reply" },
          { action: "view", title: "View Chat" },
        ];
        break;

      case "booking_cancelled":
        basePayload.title = "❌ Booking Cancelled";
        basePayload.requireInteraction = true;
        break;

      case "client_no_show":
        basePayload.title = "👻 Client No-Show";
        basePayload.requireInteraction = true;
        break;

      default:
        basePayload.title = "SRV Business Update";
        break;
    }

    return basePayload;
  }

  /**
   * Check if we should send push notifications
   */
  private shouldSendPush(): boolean {
    return (
      this.isInitialized &&
      this.userId !== null &&
      this.pushEnabled &&
      pushNotificationService.isReady()
    );
  }
}

// Export singleton instance
export const notificationIntegrationService =
  NotificationIntegrationService.getInstance();
export default notificationIntegrationService;
