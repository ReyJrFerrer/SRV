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
      // Initialize FCM and get token
      const token = await fcmService.initialize();

      if (token) {
        // Register token with backend
        const registered = await fcmService.registerToken(token);
        this.pushEnabled = registered;
        return registered;
      }

      return false;
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
      return false;
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