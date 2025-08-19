// PWA Service - Manages Service Worker registration and PWA functionality
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
    this.initializeServiceWorker();
    this.setupInstallPrompt();
  }

  /**
   * Initialize Service Worker
   */
  private async initializeServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        console.log("Registering service worker...");
        const registration = await navigator.serviceWorker.register("/sw.js");
        this.swRegistration = registration;

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New service worker installed, show update available
                this.notifyUpdateAvailable();
              }
            });
          }
        });

        console.log("Service Worker registered successfully:", registration);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    } else {
      console.warn("Service Workers are not supported in this browser");
    }
  }

  /**
   * Setup PWA install prompt
   */
  private setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("PWA install prompt available");
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      this.deferredPrompt = e as unknown as PWAInstallPrompt;
    });

    window.addEventListener("appinstalled", () => {
      console.log("PWA was installed");
      this.deferredPrompt = null;
    });
  }

  /**
   * Show PWA install prompt
   */
  async showInstallPrompt(): Promise<
    "accepted" | "dismissed" | "not-available"
  > {
    if (!this.deferredPrompt) {
      return "not-available";
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      return choiceResult.outcome;
    } catch (error) {
      console.error("Error showing install prompt:", error);
      return "dismissed";
    }
  }

  /**
   * Check if PWA is installable
   */
  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Check if running as PWA
   */
  isPWA(): boolean {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://")
    );
  }

  /**
   * Request push notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications");
    }

    if (!("PushManager" in window)) {
      throw new Error("This browser does not support push notifications");
    }

    if (!this.swRegistration) {
      throw new Error("Service Worker not registered");
    }

    const permission = await Notification.requestPermission();
    console.log("Notification permission:", permission);
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(
    vapidPublicKey: string,
  ): Promise<PushSubscriptionData> {
    if (!this.swRegistration) {
      throw new Error("Service Worker not registered");
    }

    if (Notification.permission !== "granted") {
      throw new Error("Notification permission not granted");
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          vapidPublicKey,
        ) as BufferSource,
      });

      this.pushSubscription = subscription;

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")!),
          auth: this.arrayBufferToBase64(subscription.getKey("auth")!),
        },
      };
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
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
      console.error("Error getting push subscription:", error);
    }

    return null;
  }

  /**
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    return (
      "Notification" in window &&
      "PushManager" in window &&
      "serviceWorker" in navigator
    );
  }

  /**
   * Get notification permission status
   */
  getNotificationPermission(): NotificationPermission {
    return Notification.permission;
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
   * Utility: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
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
