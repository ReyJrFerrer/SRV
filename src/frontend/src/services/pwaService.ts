// PWA Service - Manages Service Worker registration and PWA functionality
import browserDetectionService from "./browserDetectionService";
import oneSignalService from "./oneSignalService";

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PWAService {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    // Log browser capabilities for debugging
    browserDetectionService.logBrowserCapabilities();

    // DISABLED: Custom service worker registration to avoid conflicts with OneSignal
    // OneSignal needs scope "/" for push notifications to work properly
    // We'll add caching logic to OneSignalSDKWorker.js if needed
    // this.initializeServiceWorker();

    this.setupInstallPrompt();
  }

  /**
   * Setup PWA install prompt
   */
  private setupInstallPrompt() {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      this.deferredPrompt = e as unknown as PWAInstallPrompt;
    });

    window.addEventListener("appinstalled", () => {
      this.deferredPrompt = null;
    });

    if (browserInfo.name.toLowerCase().includes("edge")) {
      setTimeout(() => {
        if (!this.deferredPrompt && capabilities.canInstall) {
        }
      }, 1000);
    }
  }

  /**
   * Show PWA install prompt
   */
  async showInstallPrompt(): Promise<
    "accepted" | "dismissed" | "not-available"
  > {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    if (!capabilities.canInstall) {
      return "not-available";
    }

    if (browserInfo.isStandalone) {
      return "not-available";
    }

    // Handle Safari manual installation
    if (browserInfo.name.toLowerCase().includes("safari")) {
      if (browserInfo.isMobile || browserInfo.isTablet) {
        alert(
          "To install this app on iOS Safari:\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm",
        );
      } else {
        alert(
          "To install this app on Safari:\n1. Click the Share button in the toolbar\n2. Select 'Add to Dock' or look for PWA installation option",
        );
      }
      return "dismissed"; // User needs to manually install
    }

    // Handle standard browsers with beforeinstallprompt
    if (!this.deferredPrompt) {
      // For Edge and other browsers that might support PWA but don't fire the event
      if (capabilities.installMethod === "manual") {
        alert(
          "To install this app:\n1. Open your browser's menu (⋮)\n2. Look for 'Install app' or 'Add to desktop'\n3. Follow the prompts",
        );
        return "dismissed";
      }

      return "not-available";
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      this.deferredPrompt = null;

      return choiceResult.outcome;
    } catch (error) {
      return "dismissed";
    }
  }

  /**
   * Check if PWA is installable
   */
  isInstallable(): boolean {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    // Don't show install option if already installed
    if (browserInfo.isStandalone) {
      return false;
    }

    // For browsers that support installation
    if (capabilities.canInstall) {
      // Chrome/Edge/Opera - check for deferred prompt
      if (capabilities.installMethod === "beforeinstallprompt") {
        return !!this.deferredPrompt;
      }

      // Safari and other manual installation browsers
      if (capabilities.installMethod === "manual") {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if running as PWA with better browser detection
   */
  isPWA(): boolean {
    const browserInfo = browserDetectionService.getBrowserInfo();

    // Multiple detection methods for better compatibility
    const standaloneMode = browserInfo.isStandalone;
    const displayModeStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const displayModeMinimalUI = window.matchMedia(
      "(display-mode: minimal-ui)",
    ).matches;
    const displayModeFullscreen = window.matchMedia(
      "(display-mode: fullscreen)",
    ).matches;

    // iOS Safari specific detection
    const iOSStandalone = (window.navigator as any).standalone === true;

    // Android specific detection
    const androidInstalled = document.referrer.includes("android-app://");

    const isPWA =
      standaloneMode ||
      displayModeStandalone ||
      displayModeMinimalUI ||
      displayModeFullscreen ||
      iOSStandalone ||
      androidInstalled;

    return isPWA;
  }

  /**
   * Request push notification permission
   * Note: For OneSignal-based push notifications, this is mainly for checking browser capabilities.
   * OneSignal handles the actual permission request during subscription.
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications");
    }

    if (!("PushManager" in window)) {
      throw new Error("This browser does not support push notifications");
    }

    if (!capabilities.canReceivePushNotifications) {
      throw new Error(
        `Push notifications not supported: ${capabilities.limitations.join(", ")}`,
      );
    }

    // Check if already granted (important for PWAs)
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      return "granted";
    }

    // Handle browser-specific permission request
    try {
      let permission: NotificationPermission;

      // For mobile PWAs, we need to handle permission requests more carefully
      if (browserInfo.isMobile && browserInfo.isStandalone) {
        // Add a small delay to ensure PWA is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check permission again before requesting (mobile PWAs can change state)
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          return "granted";
        }

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "denied"
        ) {
          throw new Error(
            "Notifications were denied. Please enable notifications for this app in your device settings.",
          );
        }

        // Request permission with user interaction context
        permission = await this.requestPermissionWithRetry();
      } else if (browserInfo.name.toLowerCase().includes("safari")) {
        permission = await Notification.requestPermission();
      } else if (
        browserInfo.name.toLowerCase().includes("brave") ||
        browserInfo.name.toLowerCase().includes("vivaldi")
      ) {
        permission = await Notification.requestPermission();
      } else {
        permission = await Notification.requestPermission();
      }

      // Additional check for mobile PWAs
      if (
        browserInfo.isMobile &&
        browserInfo.isStandalone &&
        permission === "default"
      ) {
        // Give user specific instructions for their platform
        if (browserInfo.os.toLowerCase().includes("ios")) {
          throw new Error(
            "Please go to Settings > SRV > Notifications and enable 'Allow Notifications'",
          );
        } else {
          throw new Error(
            "Please check your notification settings for this app",
          );
        }
      }

      return permission;
    } catch (error) {
      // Provide helpful error messages based on context
      if (error instanceof Error) {
        throw error; // Re-throw our custom errors
      }

      // Return current permission state if request fails
      const currentPermission = Notification.permission;
      if (currentPermission === "denied") {
        throw new Error(
          "Notifications are blocked. Please enable notifications for this app in your browser or device settings.",
        );
      }

      return currentPermission;
    }
  }

  /**
   * Request permission with retry logic for mobile PWAs
   */
  private async requestPermissionWithRetry(
    maxRetries: number = 2,
  ): Promise<NotificationPermission> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const permission = await Notification.requestPermission();

        if (permission !== "default") {
          return permission;
        }

        // Wait a bit before retrying
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications (delegates to OneSignal)
   * Note: OneSignal handles its own service worker (OneSignalSDKWorker.js)
   * and manages push subscriptions independently from our custom sw.js
   */
  async subscribeToPushNotifications(
    _vapidPublicKey: string,
  ): Promise<string | null> {
    // Check if OneSignal is initialized
    if (!oneSignalService.isReady()) {
      throw new Error(
        "Your browser may not be compatible with push notifications at this time.",
      );
    }

    // Check browser support for notifications
    if (!this.isPushNotificationSupported()) {
      throw new Error("Push notifications are not supported in this browser");
    }

    try {
      const playerId = await oneSignalService.subscribe();

      if (!playerId) {
        // Check if subscription was successful even without player ID
        const isSubscribed = await oneSignalService.isSubscribed();

        if (isSubscribed) {
          // Return a temporary ID to indicate subscription is in progress
          return "pending";
        }
        throw new Error(
          "Failed to subscribe to push notifications. Please try again.",
        );
      }
      return playerId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications (delegates to OneSignal)
   */
  async unsubscribeFromPushNotifications(): Promise<boolean> {
    try {
      return await oneSignalService.unsubscribe();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current push subscription (delegates to OneSignal)
   * Returns subscription data if user is subscribed, null otherwise
   */
  async getCurrentPushSubscription(): Promise<PushSubscriptionData | null> {
    try {
      // Check if OneSignal is ready
      if (!oneSignalService.isReady()) {
        return null;
      }

      // Check if user is actually subscribed (not just has permission)
      const isSubscribed = await oneSignalService.isSubscribed();

      if (!isSubscribed) {
        return null;
      }

      // Get player ID
      const playerId = await oneSignalService.getPlayerId();

      if (playerId) {
        return {
          endpoint: playerId,
          keys: {
            p256dh: "", // Not used by OneSignal
            auth: "", // Not used by OneSignal
          },
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    const capabilities = browserDetectionService.getPWACapabilities();

    return capabilities.canReceivePushNotifications;
  }

  /**
   * Get notification permission status with PWA-specific checks
   */
  getNotificationPermission(): NotificationPermission {
    if (!("Notification" in window)) {
      return "denied";
    }

    return Notification.permission;
  }

  /**
   * Refresh notification permission status (useful for PWAs)
   */
  async refreshNotificationPermission(): Promise<NotificationPermission> {
    // For PWAs, especially on mobile, permission status can change outside the app
    const permission = this.getNotificationPermission();

    // If we have a service worker registration, check OneSignal player ID status
    if (permission === "granted" && this.swRegistration) {
      try {
        await oneSignalService.getPlayerId(); // Check if we have a valid player ID
      } catch (error) {}
    }

    return permission;
  }

  /**
   * Show local notification (for testing or fallback)
   */
  async showLocalNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === "granted") {
      new Notification(title, {
        icon: "/logo.svg",
        badge: "/logo.svg",
        ...options,
      });
    }
  }
}

// Export singleton instance
export const pwaService = new PWAService();
export default pwaService;
