// PWA Service - Manages Service Worker registration and PWA functionality
import browserDetectionService from "./browserDetectionService";

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
  private pushSubscription: PushSubscription | null = null;

  constructor() {
    // In development, disable service worker to avoid caching and HMR issues
    if (
      import.meta &&
      (import.meta as any).env &&
      (import.meta as any).env.DEV
    ) {
      this.disableServiceWorkerForDev();
      return;
    }

    // Log browser capabilities for debugging
    browserDetectionService.logBrowserCapabilities();

    this.initializeServiceWorker();
    this.setupInstallPrompt();
  }

  /**
   * Disable service worker during development to ensure HMR works reliably.
   * Unregisters existing registrations and skips any further SW setup.
   */
  private async disableServiceWorkerForDev() {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
      // Optional: clear common runtime caches created by SWs (only once per session)
      if (
        "caches" in window &&
        sessionStorage.getItem("swDevCachesCleared") !== "1"
      ) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        sessionStorage.setItem("swDevCachesCleared", "1");
      }
    } catch {
      // Best effort cleanup; ignore errors in dev
    }
  }

  /**
   * Initialize Service Worker
   */
  private async initializeServiceWorker() {
    const browserInfo = browserDetectionService.getBrowserInfo();

    // //console.log("🔧 PWA: Initializing Service Worker", {
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
      //console.log("📝 PWA: Registering service worker...");
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // Ensure fresh updates
      });

      this.swRegistration = registration;

      // //console.log("✅ PWA: Service Worker registered successfully", {
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
      // //console.error("❌ PWA: Service Worker registration failed", {
      //   error,
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      //   isSecureContext: window.isSecureContext,
      //   protocol: window.location.protocol,
      // });
    }
  }

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
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    //console.log("🔔 PWA: Requesting notification permission", {
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

    if (!this.swRegistration) {
      //console.error("❌ PWA: Service Worker not registered");
      throw new Error("Service Worker not registered");
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
      } else if (browserInfo.name.toLowerCase().includes("brave")) {
        //console.log("🦁 PWA: Requesting Brave notification permission");
        permission = await Notification.requestPermission();

        if (permission === "denied") {
          //console.warn(
          //   "⚠️ PWA: Brave blocks notifications by default. Enable in Settings > Shields & Privacy > Notifications",
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
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(
    vapidPublicKey: string,
  ): Promise<PushSubscriptionData> {
    const browserInfo = browserDetectionService.getBrowserInfo();
    const capabilities = browserDetectionService.getPWACapabilities();

    //console.log("🔔 PWA: Attempting push notification subscription", {
    //   browser: `${browserInfo.name} ${browserInfo.version}`,
    //   os: `${browserInfo.os} ${browserInfo.osVersion}`,
    //   capabilities,
    //   vapidKeyLength: vapidPublicKey.length,
    // });

    if (!this.swRegistration) {
      //console.error("❌ PWA: Service Worker not registered");
      throw new Error("Service Worker not registered");
    }

    if (Notification.permission !== "granted") {
      //console.error("❌ PWA: Notification permission not granted");
      throw new Error("Notification permission not granted");
    }

    if (!capabilities.canReceivePushNotifications) {
      //console.error(
      //   "❌ PWA: Browser does not support push notifications",
      //   capabilities.limitations,
      // );
      throw new Error(
        `Push notifications not supported: ${capabilities.limitations.join(", ")}`,
      );
    }

    try {
      // Convert VAPID key with Safari compatibility
      const applicationServerKey = this.convertVAPIDKey(vapidPublicKey);
      //console.log("🔑 PWA: VAPID key converted successfully", {
      //   originalLength: vapidPublicKey.length,
      //   convertedLength: applicationServerKey.byteLength,
      // });

      const subscriptionOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      };

      //console.log(
      //   "📱 PWA: Subscribing to push notifications...",
      //   subscriptionOptions,
      // );
      const subscription =
        await this.swRegistration.pushManager.subscribe(subscriptionOptions);

      this.pushSubscription = subscription;

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };

      //console.log("✅ PWA: Push notification subscription successful", {
      //   endpoint: subscription.endpoint.substring(0, 50) + "...",
      //   hasP256dh: !!subscriptionData.keys.p256dh,
      //   hasAuth: !!subscriptionData.keys.auth,
      // });

      return subscriptionData;
    } catch (error) {
      //console.error("❌ PWA: Push notification subscription failed", {
      //   error: error,
      //   errorMessage: error instanceof Error ? error.message : "Unknown error",
      //   browser: `${browserInfo.name} ${browserInfo.version}`,
      //   vapidKeyValid: this.isValidVAPIDKey(vapidPublicKey),
      // });

      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes("applicationServerKey")) {
          throw new Error(
            `VAPID key format error (${browserInfo.name}): ${error.message}`,
          );
        } else if (
          error.message.includes("registration failed") ||
          error.message.includes("push service")
        ) {
          throw new Error(
            `Push service error (${browserInfo.name}): Check browser settings and network connection`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (this.pushSubscription) {
      const success = await this.pushSubscription.unsubscribe();
      if (success) {
        this.pushSubscription = null;
      }
      return success;
    }
    return true;
  }

  /**
   * Get current push subscription
   */
  async getCurrentPushSubscription(): Promise<PushSubscriptionData | null> {
    if (!this.swRegistration) {
      return null;
    }

    try {
      const subscription =
        await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        return {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
          },
        };
      }
    } catch (error) {
      //console.error("Error getting push subscription:", error);
    }

    return null;
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

    // If we have a service worker registration, check if we still have a valid subscription
    if (permission === "granted" && this.swRegistration) {
      try {
        const subscription =
          await this.swRegistration.pushManager.getSubscription();
        //console.log(
        //   "📊 PWA: Current push subscription status:",
        //   !!subscription,
        // );

        if (!subscription && this.pushSubscription) {
          // We thought we had a subscription but we don't - clear our reference
          //console.warn("⚠️ PWA: Push subscription was cleared externally");
          this.pushSubscription = null;
        }
      } catch (error) {
        //console.error("❌ PWA: Error checking push subscription:", error);
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

  /**
   * Handle service worker update
   */
  private notifyUpdateAvailable() {
    // You can emit an event or show a notification about update availability
    window.dispatchEvent(new CustomEvent("pwa-update-available"));
  }

  /**
   * Update service worker
   */
  async updateServiceWorker() {
    if (this.swRegistration) {
      const newWorker = this.swRegistration.waiting;
      if (newWorker) {
        newWorker.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }
    }
  }

  /**
   * Validate VAPID key format
   */
  // private isValidVAPIDKey(vapidKey: string): boolean {
  //   try {
  //     // VAPID keys should be base64url encoded and 65 bytes when decoded
  //     const decoded = this.convertVAPIDKey(vapidKey);
  //     return decoded.byteLength === 65;
  //   } catch {
  //     return false;
  //   }
  // }

  /**
   * Convert VAPID key with improved Safari compatibility
   */
  private convertVAPIDKey(base64String: string): Uint8Array {
    const browserInfo = browserDetectionService.getBrowserInfo();

    try {
      // Clean the base64 string
      let cleanBase64 = base64String.trim();

      // Handle different base64 formats (some keys come with or without padding)
      // Convert base64url to base64 if needed
      cleanBase64 = cleanBase64.replace(/-/g, "+").replace(/_/g, "/");

      // Add padding if needed
      const padding = "=".repeat((4 - (cleanBase64.length % 4)) % 4);
      cleanBase64 = cleanBase64 + padding;

      //console.log("🔑 PWA: Converting VAPID key", {
      //   browser: browserInfo.name,
      //   originalLength: base64String.length,
      //   cleanedLength: cleanBase64.length,
      //   hasPadding: padding.length > 0,
      // });

      // For Safari, we need to be extra careful with the conversion
      let binaryString: string;

      if (browserInfo.name.toLowerCase().includes("safari")) {
        // Safari-specific conversion
        try {
          binaryString = window.atob(cleanBase64);
        } catch (safariError) {
          //console.warn(
          //   "⚠️ PWA: Safari atob failed, trying alternative method",
          //   safariError,
          // );
          // Alternative method for Safari
          binaryString = this.atobPolyfill(cleanBase64);
        }
      } else {
        binaryString = window.atob(cleanBase64);
      }

      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      //console.log("✅ PWA: VAPID key conversion successful", {
      //   outputLength: bytes.length,
      //   browser: browserInfo.name,
      // });

      return bytes;
    } catch (error) {
      // //console.error("❌ PWA: VAPID key conversion failed", {
      //   error,
      //   browser: browserInfo.name,
      //   keyLength: base64String.length,
      //   keyStart: base64String.substring(0, 10) + "...",
      // });
      throw new Error(
        `VAPID key conversion failed for ${browserInfo.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Polyfill for atob that works better in some Safari versions
   */
  private atobPolyfill(base64: string): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;

    base64 = base64.replace(/[^A-Za-z0-9+/]/g, "");

    while (i < base64.length) {
      const encoded1 = chars.indexOf(base64.charAt(i++));
      const encoded2 = chars.indexOf(base64.charAt(i++));
      const encoded3 = chars.indexOf(base64.charAt(i++));
      const encoded4 = chars.indexOf(base64.charAt(i++));

      const bitmap =
        (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }

    return result;
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary);
  }
}

// Export singleton instance
export const pwaService = new PWAService();
export default pwaService;
