import { useState, useEffect, useCallback } from "react";
import pwaService from "../services/pwaService";
import pushNotificationService from "../services/pushNotificationService";
import browserDetectionService from "../services/browserDetectionService";

export interface PWAState {
  isInstallable: boolean;
  isPWA: boolean;
  isOffline: boolean;
  pushNotificationSupported: boolean;
  pushPermission: NotificationPermission;
  pushSubscribed: boolean;
  updateAvailable: boolean;
  browserInfo: {
    name: string;
    version: string;
    canInstall: boolean;
    canReceivePushNotifications: boolean;
    installMethod: string;
    limitations: string[];
  };
}

export const usePWA = () => {
  // Get browser info for initial state
  const browserInfo = browserDetectionService.getBrowserInfo();
  const browserCapabilities = browserDetectionService.getPWACapabilities();

  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isPWA: false,
    isOffline: false,
    pushNotificationSupported: false,
    pushPermission: "default",
    pushSubscribed: false,
    updateAvailable: false,
    browserInfo: {
      name: browserInfo.name,
      version: browserInfo.version,
      canInstall: browserCapabilities.canInstall,
      canReceivePushNotifications:
        browserCapabilities.canReceivePushNotifications,
      installMethod: browserCapabilities.installMethod,
      limitations: browserCapabilities.limitations,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize PWA state
  useEffect(() => {
    const initializePWA = async () => {
      try {
        console.log("🔧 PWA Hook: Initializing PWA state", {
          browser: `${browserInfo.name} ${browserInfo.version}`,
          capabilities: browserCapabilities,
        });

        // Check basic PWA state
        const isPWA = pwaService.isPWA();
        const isInstallable = pwaService.isInstallable();
        const pushNotificationSupported =
          pwaService.isPushNotificationSupported();
        const pushPermission = pwaService.getNotificationPermission();

        // Check if already subscribed to push notifications
        const currentSubscription =
          await pwaService.getCurrentPushSubscription();
        const pushSubscribed = currentSubscription !== null;

        console.log("📊 PWA Hook: State initialized", {
          isPWA,
          isInstallable,
          pushNotificationSupported,
          pushPermission,
          pushSubscribed,
          browserLimitations: browserCapabilities.limitations,
        });

        setPwaState((prev) => ({
          ...prev,
          isPWA,
          isInstallable,
          pushNotificationSupported,
          pushPermission,
          pushSubscribed,
        }));

        // Log any browser limitations for debugging
        if (browserCapabilities.limitations.length > 0) {
          console.warn(
            "⚠️ PWA Hook: Browser limitations detected:",
            browserCapabilities.limitations,
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ PWA Hook: Error initializing PWA:", err);
        setError(
          `Failed to initialize PWA features: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        setLoading(false);
      }
    };

    initializePWA();
  }, [browserInfo.name, browserInfo.version]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () =>
      setPwaState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () =>
      setPwaState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    setPwaState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for PWA update available
  useEffect(() => {
    const handleUpdateAvailable = () => {
      setPwaState((prev) => ({ ...prev, updateAvailable: true }));
    };

    window.addEventListener("pwa-update-available", handleUpdateAvailable);

    return () => {
      window.removeEventListener("pwa-update-available", handleUpdateAvailable);
    };
  }, []);

  // Listen for install prompt changes
  useEffect(() => {
    const checkInstallable = () => {
      setPwaState((prev) => ({
        ...prev,
        isInstallable: pwaService.isInstallable(),
      }));
    };

    // Check periodically as the state can change
    const interval = setInterval(checkInstallable, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Show PWA install prompt
   */
  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "not-available"
  > => {
    try {
      const result = await pwaService.showInstallPrompt();
      if (result === "accepted") {
        setPwaState((prev) => ({ ...prev, isInstallable: false, isPWA: true }));
      }
      return result;
    } catch (err) {
      console.error("Error showing install prompt:", err);
      setError("Failed to show install prompt");
      return "dismissed";
    }
  }, []);

  /**
   * Request push notification permission and subscribe
   */
  const enablePushNotifications = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setError(null);

        if (!pushNotificationService.isReady()) {
          // Initialize with Firebase config
          await pushNotificationService.initialize({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
            authDomain:
              import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
            projectId:
              import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
            messagingSenderId:
              import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
            appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id",
            vapidKey:
              import.meta.env.VITE_FIREBASE_VAPID_KEY ||
              import.meta.env.VITE_MOCK_VAPID_KEY ||
              "BEl62iUYgUivxIkv69yViEuiBIa40HI6DYAqSsHTLWPSLq3zCYDFmjHX6j7vbGV9T5S2z0zOOdmcW9GnvUAhTUo",
          });
        }

        // Request permission
        const permission = await pwaService.requestNotificationPermission();
        setPwaState((prev) => ({ ...prev, pushPermission: permission }));

        if (permission !== "granted") {
          throw new Error("Push notification permission denied");
        }

        // Subscribe to push notifications
        const vapidKey = pushNotificationService.getVapidPublicKey();
        const subscription =
          await pwaService.subscribeToPushNotifications(vapidKey);

        // Store subscription
        const success = await pushNotificationService.storePushSubscription(
          subscription,
          userId,
        );

        if (success) {
          setPwaState((prev) => ({ ...prev, pushSubscribed: true }));
          return true;
        } else {
          throw new Error("Failed to store push subscription");
        }
      } catch (err) {
        console.error("Error enabling push notifications:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to enable push notifications",
        );
        return false;
      }
    },
    [],
  );

  /**
   * Disable push notifications
   */
  const disablePushNotifications = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setError(null);

        // Unsubscribe from browser
        const unsubscribed =
          await pwaService.unsubscribeFromPushNotifications();

        if (unsubscribed) {
          // Remove from backend
          await pushNotificationService.removePushSubscription(userId);
          setPwaState((prev) => ({ ...prev, pushSubscribed: false }));
          return true;
        }

        return false;
      } catch (err) {
        console.error("Error disabling push notifications:", err);
        setError("Failed to disable push notifications");
        return false;
      }
    },
    [],
  );

  /**
   * Update the PWA
   */
  const updatePWA = useCallback(async () => {
    try {
      await pwaService.updateServiceWorker();
      setPwaState((prev) => ({ ...prev, updateAvailable: false }));
    } catch (err) {
      console.error("Error updating PWA:", err);
      setError("Failed to update PWA");
    }
  }, []);

  /**
   * Send a test push notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      return await pushNotificationService.testPushNotification();
    } catch (err) {
      console.error("Error sending test notification:", err);
      setError("Failed to send test notification");
      return false;
    }
  }, []);

  /**
   * Show a local notification (for fallback when push isn't available)
   */
  const showLocalNotification = useCallback(
    async (title: string, body: string, options?: NotificationOptions) => {
      try {
        await pwaService.showLocalNotification(title, { body, ...options });
      } catch (err) {
        console.error("Error showing local notification:", err);
      }
    },
    [],
  );

  /**
   * Get browser-specific installation instructions
   */
  const getInstallInstructions = useCallback((): string[] => {
    if (browserCapabilities.installMethod === "manual") {
      if (browserInfo.name.toLowerCase().includes("safari")) {
        return browserInfo.isMobile
          ? [
              "1. Tap the Share button (box with arrow) at the bottom",
              "2. Scroll down and tap 'Add to Home Screen'",
              "3. Tap 'Add' to install the app",
            ]
          : [
              "1. Click the Share button in Safari's toolbar",
              "2. Select 'Add to Dock' or look for app installation option",
            ];
      } else if (browserInfo.name.toLowerCase().includes("edge")) {
        return [
          "1. Click the three dots menu (⋯) in the top right",
          "2. Click 'Apps' > 'Install this site as an app'",
          "3. Click 'Install' to add the app to your desktop",
        ];
      }
    }
    return [
      "Look for the install icon in your browser's address bar",
      "Click it to install the app to your device",
    ];
  }, [browserInfo, browserCapabilities]);

  /**
   * Get troubleshooting tips for current browser
   */
  const getTroubleshootingTips = useCallback((): string[] => {
    const tips = [];

    if (browserInfo.name.toLowerCase().includes("safari")) {
      tips.push(
        "For push notifications, ensure iOS/Safari version is 16.4 or higher",
      );
      tips.push("Check Settings > Safari > Notifications are enabled");
    }

    if (browserInfo.name.toLowerCase().includes("brave")) {
      tips.push(
        "Enable 'Allow sites to send push notifications' in Brave settings",
      );
      tips.push("Check that Shields aren't blocking notification permissions");
    }

    if (browserInfo.name.toLowerCase().includes("edge")) {
      tips.push("Make sure you're using the new Chromium-based Edge");
      tips.push(
        "Check notification permissions in Windows Settings > Notifications",
      );
    }

    if (!browserCapabilities.canReceivePushNotifications) {
      tips.push("Your browser version doesn't support web push notifications");
      tips.push(
        "Consider updating to a newer version or using a different browser",
      );
    }

    return tips;
  }, [browserInfo, browserCapabilities]);

  return {
    pwaState,
    loading,
    error,
    promptInstall,
    enablePushNotifications,
    disablePushNotifications,
    updatePWA,
    sendTestNotification,
    showLocalNotification,
    getInstallInstructions,
    getTroubleshootingTips,
  };
};
