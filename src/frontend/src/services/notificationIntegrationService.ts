import fcmService from "./fcmService";

/**
 * Thin integration layer for notification system
 * Delegates to FCM service for push notifications
 * All notification creation and business logic is handled by backend Cloud Functions
 */
class NotificationIntegrationService {
  private static instance: NotificationIntegrationService;
  private isInitialized = false;
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
   * Initialize the notification integration service
   * @param _userId - User ID (deprecated - FCM handles auth via Firebase Auth)
   * @param isPushEnabled - Whether push notifications are enabled
   */
  async initialize(_userId: string, isPushEnabled: boolean): Promise<void> {
    this.isInitialized = true;
    this.pushEnabled = isPushEnabled;

    if (isPushEnabled) {
      await this.enablePushNotifications();
    }
  }

  /**
   * Enable push notifications
   */
  async enablePushNotifications(): Promise<boolean> {
    try {
      console.log("[NotificationIntegration] Enabling push notifications...");

      // Check if already enabled
      if (this.pushEnabled && fcmService.isReady()) {
        console.log("[NotificationIntegration] Push already enabled");
        return true;
      }

      // Check for rate limiting
      const rateLimitRemaining = fcmService.getRateLimitRemaining();
      if (rateLimitRemaining > 0) {
        console.warn(
          `[NotificationIntegration] FCM is rate limited. Wait ${rateLimitRemaining} seconds before retrying.`,
        );
        throw new Error(
          `Please wait ${rateLimitRemaining} seconds before trying again. This is a temporary restriction from Firebase.`,
        );
      }

      // Check permission first
      const permission = fcmService.getPermissionStatus();
      console.log("[NotificationIntegration] Current permission:", permission);

      if (permission === "denied") {
        console.error(
          "[NotificationIntegration] Notification permission denied by user",
        );
        throw new Error(
          "Notification permission is denied. Please enable notifications in your browser settings.",
        );
      }

      // Initialize FCM and get token
      console.log("[NotificationIntegration] Requesting FCM token...");
      const token = await fcmService.initialize();

      if (!token) {
        console.error("[NotificationIntegration] Failed to get FCM token");

        // Provide helpful error message based on debug info
        const debugInfo = fcmService.getDebugInfo();
        console.log("[NotificationIntegration] Debug info:", debugInfo);

        if (debugInfo.isRateLimited) {
          throw new Error(
            `Firebase rate limit exceeded. Please wait ${debugInfo.rateLimitRemaining} seconds before trying again.`,
          );
        }

        if (permission === "default") {
          throw new Error(
            "Please grant notification permission when prompted.",
          );
        }

        throw new Error(
          "Failed to initialize push notifications. Please check your browser settings and ensure notifications are enabled.",
        );
      }

      console.log(
        "[NotificationIntegration] FCM token obtained, registering with backend...",
      );

      // Register token with backend
      const registered = await fcmService.registerToken(token);

      if (!registered) {
        console.error(
          "[NotificationIntegration] Failed to register token with backend",
        );
        throw new Error(
          "Failed to register push notification token. Please try again.",
        );
      }

      console.log(
        "[NotificationIntegration] ✅ Push notifications enabled successfully",
      );
      this.pushEnabled = true;
      return true;
    } catch (error) {
      console.error(
        "[NotificationIntegration] Failed to enable push notifications:",
        error,
      );
      this.pushEnabled = false;

      // Re-throw the error so the UI can display it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        "Failed to enable push notifications. Please try again later.",
      );
    }
  }

  /**
   * Disable push notifications
   */
  async disablePushNotifications(): Promise<boolean> {
    try {
      // Unregister token from backend
      await fcmService.unregisterToken();

      // Delete FCM token
      await fcmService.deleteToken();

      this.pushEnabled = false;
      return true;
    } catch (error) {
      console.error("Failed to disable push notifications:", error);
      return false;
    }
  }

  /**
   * Update push notification status
   */
  async updatePushStatus(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.enablePushNotifications();
    } else {
      await this.disablePushNotifications();
    }
  }

  /**
   * Check if push notifications are enabled
   */
  isPushEnabled(): boolean {
    return this.pushEnabled && fcmService.isReady();
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return fcmService.getPermissionStatus();
  }
}

// Export singleton instance
export const notificationIntegrationService =
  NotificationIntegrationService.getInstance();
export default notificationIntegrationService;
