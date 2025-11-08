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
   * Initialize Service Worker
   * DISABLED: Commented out to avoid conflicts with OneSignal
   * OneSignal handles its own service worker (OneSignalSDKWorker.js) with scope "/"
   * Both service workers cannot coexist at the same scope without conflicts
   *
   * If caching/offline functionality is needed, add it to OneSignalSDKWorker.js
   */
  /*
  private async initializeServiceWorker() {
    const browserInfo = browserDetectionService.getBrowserInfo();

    // //console.log("🔧 PWA: Initializing Custom Service Worker", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   supportsServiceWorker: browserInfo.supportsServiceWorker,
    //   isSecureContext: window.isSecureContext,
    // });

    if (!browserInfo.supportsServiceWorker) {
      //console.warn("⚠️ PWA: Service Workers not supported in this browser");
      return;
    }

    if (!window.isSecureContext) {
      //console.error("❌ PWA: Service Workers require HTTPS or localhost");
      return;
    }

    try {
      //console.log("📝 PWA: Registering custom service worker for caching...");
      
      // Register our custom service worker for caching and offline functionality
      // OneSignal will register its own service worker (OneSignalSDKWorker.js) separately
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // Ensure fresh updates
      });

      this.swRegistration = registration;

      // //console.log("✅ PWA: Custom Service Worker registered successfully", {
      //   scope: registration.scope,
      //   updateViaCache: registration.updateViaCache,
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      // });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          //console.log("🔄 PWA: Service Worker update found");
          newWorker.addEventListener("statechange", () => {
            // //console.log(
            //   "📊 PWA: Service Worker state changed:",
            //   newWorker.state,
            // );
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker installed, show update available
              // //console.log(
              //   "🆕 PWA: New Service Worker installed - update available",
              // );
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Handle browser-specific service worker issues
      if (browserInfo.name.toLowerCase().includes("safari")) {
        // //console.log(
        //   "🍎 PWA: Safari detected - setting up Safari-specific service worker handling",
        // );
        // Safari sometimes needs a delay before service worker is ready
        setTimeout(() => {
          if (registration.active) {
            //console.log("✅ PWA: Safari service worker is active");
          }
        }, 1000);
      }

      if (browserInfo.name.toLowerCase().includes("edge")) {
        // //console.log(
        //   "🌐 PWA: Edge detected - setting up Edge-specific service worker handling",
        // );
        // Edge might need additional time for service worker registration
      }
    } catch (error) {
      // //console.error("❌ PWA: Custom Service Worker registration failed", {
      //   error,
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      //   isSecureContext: window.isSecureContext,
      //   protocol: window.location.protocol,
      // });
    }
  }
  */

  /**
   * Setup PWA install prompt
   */
  private setupInstallPrompt() {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    //console.log("🔧 PWA: Setting up install prompt", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   installMethod: capabilities.installMethod,
    //   limitations: capabilities.limitations,
    // });

    window.addEventListener("beforeinstallprompt", (e) => {
      //console.log("✅ PWA: Install prompt available (beforeinstallprompt)", {
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      // });
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      this.deferredPrompt = e as unknown as PWAInstallPrompt;
    });

    window.addEventListener("appinstalled", () => {
      //console.log("🎉 PWA: App was installed", {
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      // });
      this.deferredPrompt = null;
    });

    // Additional event listeners for different browsers
    if (browserInfo.name.toLowerCase().includes("safari")) {
      // Safari doesn't fire beforeinstallprompt, but we can detect other indicators
      //console.log("🍎 PWA: Safari detected - manual installation required");
    }

    if (browserInfo.name.toLowerCase().includes("edge")) {
      // Edge might need additional handling
      //console.log("🌐 PWA: Edge detected - checking additional PWA indicators");
      setTimeout(() => {
        if (!this.deferredPrompt && capabilities.canInstall) {
          // //console.log(
          //   "📱 PWA: Edge PWA installation may be available through browser menu",
          // );
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

    //console.log("📱 PWA: Attempting to show install prompt", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   hasDeferredPrompt: !!this.deferredPrompt,
    //   installMethod: capabilities.installMethod,
    //   canInstall: capabilities.canInstall,
    // });

    if (!capabilities.canInstall) {
      //console.log(
      //   "❌ PWA: Installation not available",
      //   capabilities.limitations,
      // );
      return "not-available";
    }

    if (browserInfo.isStandalone) {
      //console.log("✅ PWA: App is already installed");
      return "not-available";
    }

    // Handle Safari manual installation
    if (browserInfo.name.toLowerCase().includes("safari")) {
      //console.log(
      //   "🍎 PWA: Safari detected - showing manual installation instructions",
      // );
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
      //console.log("❌ PWA: No install prompt available");

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
      //console.log("🚀 PWA: Showing browser install prompt");
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      //console.log("📊 PWA: User choice result:", choiceResult.outcome);
      this.deferredPrompt = null;

      return choiceResult.outcome;
    } catch (error) {
      //console.error("❌ PWA: Error showing install prompt:", error);
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

    //console.log("🔍 PWA: Detection results", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   isPWA,
    //   standaloneMode,
    //   displayModeStandalone,
    //   displayModeMinimalUI,
    //   displayModeFullscreen,
    //   iOSStandalone,
    //   androidInstalled,
    // });

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

    //console.log("🔔 PWA: Checking notification permission", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   currentPermission: Notification.permission,
    //   canReceivePushNotifications: capabilities.canReceivePushNotifications,
    //   limitations: capabilities.limitations,
    //   isPWA: browserInfo.isStandalone,
    //   isMobile: browserInfo.isMobile,
    // });

    if (!("Notification" in window)) {
      //console.error("❌ PWA: Notification API not supported");
      throw new Error("This browser does not support notifications");
    }

    if (!("PushManager" in window)) {
      //console.error("❌ PWA: PushManager not supported");
      throw new Error("This browser does not support push notifications");
    }

    if (!capabilities.canReceivePushNotifications) {
      //console.error(
      //   "❌ PWA: Push notifications not supported by browser",
      //   capabilities.limitations,
      // );
      throw new Error(
        `Push notifications not supported: ${capabilities.limitations.join(", ")}`,
      );
    }

    // Check if already granted (important for PWAs)
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      //console.log("✅ PWA: Notification permission already granted");
      return "granted";
    }

    // Handle browser-specific permission request
    try {
      let permission: NotificationPermission;

      // For mobile PWAs, we need to handle permission requests more carefully
      if (browserInfo.isMobile && browserInfo.isStandalone) {
        //console.log(
        //   "📱 PWA: Mobile PWA detected - using careful permission request",
        // );

        // Add a small delay to ensure PWA is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check permission again before requesting (mobile PWAs can change state)
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          //console.log("✅ PWA: Permission granted during delay check");
          return "granted";
        }

        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "denied"
        ) {
          //console.warn(
          //   "❌ PWA: Permission was denied - asking user to check settings",
          // );
          throw new Error(
            "Notifications were denied. Please enable notifications for this app in your device settings.",
          );
        }

        // Request permission with user interaction context
        permission = await this.requestPermissionWithRetry();
      } else if (browserInfo.name.toLowerCase().includes("safari")) {
        //console.log("🍎 PWA: Requesting Safari notification permission");
        permission = await Notification.requestPermission();

        if (permission === "denied") {
          //console.warn(
          //   "⚠️ PWA: Safari notification permission denied - check browser settings",
          // );
        }
      } else if (
        browserInfo.name.toLowerCase().includes("brave") ||
        browserInfo.name.toLowerCase().includes("vivaldi")
      ) {
        //console.log("🦁 PWA: Requesting Brave/Vivaldi notification permission");
        permission = await Notification.requestPermission();

        if (permission === "denied") {
          //console.warn(
          //   "⚠️ PWA: Brave/Vivaldi may block notifications by default. Check browser settings (Shields or Ad/Tracker blocker).",
          // );
        }
      } else {
        //console.log("🌐 PWA: Requesting standard notification permission");
        permission = await Notification.requestPermission();
      }

      //console.log(`📊 PWA: Notification permission result: ${permission}`, {
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      //   isPWA: browserInfo.isStandalone,
      //   isMobile: browserInfo.isMobile,
      // });

      // Additional check for mobile PWAs
      if (
        browserInfo.isMobile &&
        browserInfo.isStandalone &&
        permission === "default"
      ) {
        //console.warn(
        //   "⚠️ PWA: Mobile PWA permission still default - may need manual settings check",
        // );
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
      //console.error("❌ PWA: Failed to request notification permission", {
      //   error,
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      //   isPWA: browserInfo.isStandalone,
      //   isMobile: browserInfo.isMobile,
      // });

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
        //console.log(
        //   `🔄 PWA: Permission request attempt ${i + 1}/${maxRetries}`,
        // );
        const permission = await Notification.requestPermission();

        if (permission !== "default") {
          return permission;
        }

        // Wait a bit before retrying
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        //console.warn(
        //   `⚠️ PWA: Permission request attempt ${i + 1} failed:`,
        //   error,
        // );
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
    //console.log("🔔 PWA: Subscribing to push notifications via OneSignal");

    // Check if OneSignal is initialized
    if (!oneSignalService.isReady()) {
      //console.error("❌ PWA: OneSignal not initialized");
      throw new Error(
        "Your browser may not be compatible with push notifications at this time.",
      );
    }

    // Check browser support for notifications
    if (!this.isPushNotificationSupported()) {
      //console.error("❌ PWA: Push notifications not supported in this browser");
      throw new Error("Push notifications are not supported in this browser");
    }

    // OneSignal will handle permission requests during subscription
    // We don't need to manually check our custom service worker registration
    // because OneSignal manages its own service worker (OneSignalSDKWorker.js)
    try {
      //console.log("🔔 PWA: Delegating subscription to OneSignal...");
      const playerId = await oneSignalService.subscribe();

      if (!playerId) {
        //console.warn("❌ PWA: Player ID not immediately available");

        // Check if subscription was successful even without player ID
        const isSubscribed = await oneSignalService.isSubscribed();

        if (isSubscribed) {
          //console.log(
          //  "✅ PWA: Subscription successful, player ID will be available via event listener",
          //);
          // Return a temporary ID to indicate subscription is in progress
          return "pending";
        }

        //console.error("❌ PWA: Failed to subscribe to push notifications");
        throw new Error(
          "Failed to subscribe to push notifications. Please try again.",
        );
      }

      //console.log("✅ PWA: Successfully subscribed via OneSignal:", playerId);
      return playerId;
    } catch (error) {
      //console.error("❌ PWA: OneSignal subscription failed", error);
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
      console.error("Failed to unsubscribe from OneSignal:", error);
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
      console.error("PWA: Error getting push subscription:", error);
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
      //console.warn("⚠️ PWA: Notification API not available");
      return "denied";
    }

    return Notification.permission;
  }

  /**
   * Refresh notification permission status (useful for PWAs)
   */
  async refreshNotificationPermission(): Promise<NotificationPermission> {
    // const browserInfo = browserDetectionService.getBrowserInfo();

    //console.log("🔄 PWA: Refreshing notification permission status", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   currentPermission: this.getNotificationPermission(),
    //   isPWA: browserInfo.isStandalone,
    //   isMobile: browserInfo.isMobile,
    // });

    // For PWAs, especially on mobile, permission status can change outside the app
    const permission = this.getNotificationPermission();

    // If we have a service worker registration, check OneSignal player ID status
    if (permission === "granted" && this.swRegistration) {
      try {
        await oneSignalService.getPlayerId(); // Check if we have a valid player ID
        //console.log("📊 PWA: Checked OneSignal player ID status");
      } catch (error) {
        //console.error("❌ PWA: Error checking OneSignal player ID:", error);
      }
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
