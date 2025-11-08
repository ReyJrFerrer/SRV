import oneSignalService from "./oneSignalService";

/**
 * Thin integration layer for notification system
 * Delegates to OneSignal service for push notifications
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
   * @param userId - User ID for linking with OneSignal
   * @param isPushEnabled - Whether push notifications are enabled
   */
  async initialize(userId: string, isPushEnabled: boolean): Promise<void> {
    this.isInitialized = true;
    this.pushEnabled = isPushEnabled;

    if (isPushEnabled) {
      await this.enablePushNotifications(userId);
    }
  }

  /**
   * Enable push notifications
   */
  async enablePushNotifications(userId?: string): Promise<boolean> {
    try {
      // Check if OneSignal is ready
      if (!oneSignalService.isReady()) {
        console.error("OneSignal not initialized");
        return false;
      }

      // Subscribe to push notifications
      const playerId = await oneSignalService.subscribe();

      if (playerId) {
        // Link with backend user if userId provided
        if (userId) {
          await oneSignalService.setExternalUserId(userId);
        }

        this.pushEnabled = true;
        return true;
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
      // Unsubscribe from OneSignal
      const success = await oneSignalService.unsubscribe();

      if (success) {
        this.pushEnabled = false;
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to disable push notifications:", error);
      return false;
    }
  }

  /**
   * Update push notification status
   */
  async updatePushStatus(enabled: boolean, userId?: string): Promise<void> {
    if (enabled) {
      await this.enablePushNotifications(userId);
    } else {
      await this.disablePushNotifications();
    }
  }

  /**
   * Check if push notifications are enabled
   */
  async isPushEnabled(): Promise<boolean> {
    if (!oneSignalService.isReady()) {
      return false;
    }
    const isSubscribed = await oneSignalService.isSubscribed();
    return this.pushEnabled && isSubscribed;
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
  async getPermissionStatus(): Promise<NotificationPermission> {
    return await oneSignalService.getPermissionStatus();
  }
}

// Export singleton instance
export const notificationIntegrationService =
  NotificationIntegrationService.getInstance();
export default notificationIntegrationService;
