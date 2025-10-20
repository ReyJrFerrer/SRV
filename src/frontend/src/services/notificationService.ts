/**
 * Unified Notification Service
 *
 * This service handles BOTH foreground and background notifications:
 *
 * 1. FOREGROUND (App Open):
 *    - Uses realtime Firestore listeners
 *    - Displays browser notifications using Notification API
 *    - No FCM needed for display (but token still registered for background)
 *
 * 2. BACKGROUND (App Closed/Background):
 *    - FCM token registered with backend
 *    - Backend Cloud Functions send FCM push messages
 *    - Service worker handles background messages
 *
 * ARCHITECTURE:
 * - FCM is initialized ONCE on app load if permission granted
 * - Token is registered with backend for background push
 * - Foreground notifications use browser API + Firestore listeners
 * - Backend determines when to send FCM push (for background scenarios)
 */

import fcmService from "./fcmService";
import notificationCanisterService, {
  type FrontendNotification,
  type NotificationFilter,
} from "./notificationCanisterService";
import type { Unsubscribe } from "firebase/firestore";

export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export interface NotificationServiceState {
  permission: NotificationPermissionState;
  fcmReady: boolean;
  fcmToken: string | null;
  supportsNotifications: boolean;
  isRateLimited: boolean;
  rateLimitRemaining: number;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: Map<string, Unsubscribe> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   * This should be called once on app load
   *
   * @param autoEnableFCM - Whether to automatically enable FCM if permission is granted
   * @returns Current state of the service
   */
  async initialize(autoEnableFCM = false): Promise<NotificationServiceState> {
    console.log("[NotificationService] Initializing...");

    const state = this.getState();

    // If permission already granted and autoEnable is true, setup FCM
    if (autoEnableFCM && state.permission === "granted" && !state.fcmReady) {
      console.log(
        "[NotificationService] Auto-enabling FCM for background notifications",
      );
      await this.enableBackgroundNotifications();
    }

    console.log("[NotificationService] Initialized with state:", state);
    return state;
  }

  /**
   * Request notification permission and setup FCM for background notifications
   * This is the ONLY method users should call to enable notifications
   */
  async requestPermissionAndEnable(): Promise<{
    success: boolean;
    permission: NotificationPermissionState;
    error?: string;
  }> {
    console.log("[NotificationService] Requesting notification permission...");

    // Check support
    if (!("Notification" in window)) {
      return {
        success: false,
        permission: "unsupported",
        error: "Notifications are not supported in this browser",
      };
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      console.log("[NotificationService] Permission result:", permission);

      if (permission !== "granted") {
        return {
          success: false,
          permission: permission as NotificationPermissionState,
          error:
            "Notification permission denied. Please enable in browser settings.",
        };
      }

      // Enable background notifications (FCM)
      const fcmEnabled = await this.enableBackgroundNotifications();

      return {
        success: fcmEnabled,
        permission: "granted",
        error: fcmEnabled
          ? undefined
          : "Failed to setup background notifications. Foreground notifications will still work.",
      };
    } catch (error) {
      console.error(
        "[NotificationService] Failed to request permission:",
        error,
      );
      return {
        success: false,
        permission: this.getPermissionStatus(),
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Enable background notifications by initializing FCM
   * This is called automatically by requestPermissionAndEnable()
   * Can be called separately if permission is already granted
   */
  async enableBackgroundNotifications(): Promise<boolean> {
    console.log(
      "[NotificationService] Enabling background notifications via FCM...",
    );

    // Check if already enabled
    if (fcmService.isReady()) {
      console.log("[NotificationService] FCM already enabled");
      return true;
    }

    // Check rate limit
    const rateLimitRemaining = fcmService.getRateLimitRemaining();
    if (rateLimitRemaining > 0) {
      console.warn(
        `[NotificationService] Rate limited. Wait ${rateLimitRemaining} seconds.`,
      );
      return false;
    }

    // Check permission
    const permission = this.getPermissionStatus();
    if (permission !== "granted") {
      console.warn(
        "[NotificationService] Cannot enable FCM without notification permission",
      );
      return false;
    }

    try {
      // Initialize FCM (this handles everything: token generation, caching, etc.)
      const token = await fcmService.initialize();

      if (!token) {
        console.error(
          "[NotificationService] FCM initialization failed - no token",
        );
        return false;
      }

      // Register token with backend for push notifications
      const registered = await fcmService.registerToken(token);

      if (!registered) {
        console.warn(
          "[NotificationService] FCM token not registered with backend",
        );
        return false;
      }

      console.log("[NotificationService] ✅ Background notifications enabled");
      return true;
    } catch (error) {
      console.error(
        "[NotificationService] Failed to enable background notifications:",
        error,
      );
      return false;
    }
  }

  /**
   * Disable all notifications (foreground and background)
   */
  async disableNotifications(): Promise<boolean> {
    console.log("[NotificationService] Disabling all notifications...");

    try {
      // Stop all foreground listeners
      this.stopAllListeners();

      // Unregister and delete FCM token
      await fcmService.unregisterToken();
      await fcmService.deleteToken();

      console.log("[NotificationService] ✅ Notifications disabled");
      return true;
    } catch (error) {
      console.error(
        "[NotificationService] Failed to disable notifications:",
        error,
      );
      return false;
    }
  }

  /**
   * Start listening for new notifications (foreground only)
   * This uses Firestore realtime listeners + browser Notification API
   *
   * @param userId - Current user ID
   * @param onNotification - Callback when new notification arrives
   * @param filter - Optional filter for notifications
   * @returns Unsubscribe function
   */
  startForegroundListener(
    userId: string,
    onNotification: (notification: FrontendNotification) => void,
    filter?: NotificationFilter,
  ): Unsubscribe {
    const listenerId = `foreground-${userId}`;

    // Remove existing listener if any
    if (this.listeners.has(listenerId)) {
      this.listeners.get(listenerId)?.();
    }

    console.log(
      "[NotificationService] Starting foreground listener for user:",
      userId,
    );

    let lastNotificationTimestamp = Date.now();

    const unsubscribe =
      notificationCanisterService.subscribeToUserNotifications(
        userId,
        (notifications) => {
          // Only show notification for NEW notifications
          // Filter out notifications that existed before we started listening
          const newNotifications = notifications.filter(
            (n) => new Date(n.timestamp).getTime() > lastNotificationTimestamp,
          );

          // Display browser notification for each new notification
          newNotifications.forEach((notification) => {
            this.displayForegroundNotification(notification);
            onNotification(notification);
          });

          // Update timestamp
          if (notifications.length > 0) {
            const latestTimestamp = Math.max(
              ...notifications.map((n) => new Date(n.timestamp).getTime()),
            );
            lastNotificationTimestamp = Math.max(
              lastNotificationTimestamp,
              latestTimestamp,
            );
          }
        },
        filter,
      );

    // Store the unsubscribe function
    this.listeners.set(listenerId, unsubscribe);

    // Return unsubscribe function
    return () => {
      console.log(
        "[NotificationService] Stopping foreground listener for user:",
        userId,
      );
      unsubscribe();
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Display a foreground notification using browser Notification API
   * This is for when the app is OPEN (foreground)
   */
  private displayForegroundNotification(
    notification: FrontendNotification,
  ): void {
    // Check if permission is granted
    if (Notification.permission !== "granted") {
      console.warn(
        "[NotificationService] Cannot display notification - permission not granted",
      );
      return;
    }

    // Don't show notification if document is visible (user is looking at the app)
    // Let the UI update handle it instead
    if (!document.hidden) {
      console.log(
        "[NotificationService] Document visible, skipping notification display",
      );
      return;
    }

    try {
      const browserNotification = new Notification(
        notification.title || notification.message,
        {
          body: notification.message,
          icon: "/logo.svg",
          badge: "/logo.svg",
          tag: notification.id,
          requireInteraction: false,
          data: {
            notificationId: notification.id,
            href: notification.href,
          },
        },
      );

      // Handle click
      browserNotification.onclick = () => {
        window.focus();
        if (notification.href) {
          window.location.href = notification.href;
        }
        browserNotification.close();
      };

      console.log(
        "[NotificationService] Foreground notification displayed:",
        notification.title,
      );
    } catch (error) {
      console.error(
        "[NotificationService] Failed to display foreground notification:",
        error,
      );
    }
  }

  /**
   * Stop all active listeners
   */
  stopAllListeners(): void {
    console.log("[NotificationService] Stopping all listeners");
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  /**
   * Get current service state
   */
  getState(): NotificationServiceState {
    return {
      permission: this.getPermissionStatus(),
      fcmReady: fcmService.isReady(),
      fcmToken: fcmService.getToken(),
      supportsNotifications:
        "Notification" in window && "serviceWorker" in navigator,
      isRateLimited: fcmService.getRateLimitRemaining() > 0,
      rateLimitRemaining: fcmService.getRateLimitRemaining(),
    };
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermissionState {
    if (!("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as NotificationPermissionState;
  }

  /**
   * Get user notifications (one-time fetch)
   */
  async getUserNotifications(
    userId?: string,
    filter?: NotificationFilter,
  ): Promise<FrontendNotification[]> {
    return notificationCanisterService.getUserNotifications(userId, filter);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    return notificationCanisterService.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    return notificationCanisterService.markAllAsRead();
  }

  /**
   * Delete a notification
   * Note: Delete functionality may not be available via notificationCanisterService
   * This is a placeholder for future implementation
   */
  async deleteNotification(notificationId: string): Promise<void> {
    console.warn(
      "[NotificationService] Delete notification not yet implemented:",
      notificationId,
    );
    // TODO: Implement when backend supports it
    throw new Error("Delete notification not yet implemented");
  }

  /**
   * Test notification display (for debugging)
   */
  async testNotification(): Promise<boolean> {
    if (Notification.permission !== "granted") {
      console.error(
        "[NotificationService] Cannot test - permission not granted",
      );
      return false;
    }

    try {
      const notification = new Notification("Test Notification", {
        body: "This is a test notification from SRV",
        icon: "/logo.svg",
        badge: "/logo.svg",
        tag: "test-notification",
      });

      notification.onclick = () => {
        console.log("[NotificationService] Test notification clicked");
        notification.close();
      };

      return true;
    } catch (error) {
      console.error("[NotificationService] Test notification failed:", error);
      return false;
    }
  }

  /**
   * Clear FCM rate limit (for debugging)
   */
  clearRateLimit(): void {
    fcmService.clearRateLimit();
    console.log("[NotificationService] Rate limit cleared");
  }

  /**
   * Force FCM re-initialization (for debugging)
   */
  async forceReinitialize(): Promise<string | null> {
    console.log("[NotificationService] Force re-initializing FCM...");
    return fcmService.forceReinitialize();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
export default notificationService;
