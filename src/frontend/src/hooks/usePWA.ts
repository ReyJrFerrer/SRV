import { useState, useEffect, useCallback } from "react";
import pwaService from "../services/pwaService";
import oneSignalService from "../services/oneSignalService";
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
        setPwaState((prev) => ({
          ...prev,
          isPWA,
          isInstallable,
          pushNotificationSupported,
          pushPermission,
          pushSubscribed,
        }));
        setLoading(false);
      } catch (err) {
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

  // Listen for visibility changes to refresh permission status (important for PWAs)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          const refreshedPermission =
            await pwaService.refreshNotificationPermission();
          const currentSubscription =
            await pwaService.getCurrentPushSubscription();
          const pushSubscribed = currentSubscription !== null;

          setPwaState((prev) => ({
            ...prev,
            pushPermission: refreshedPermission,
            pushSubscribed,
          }));
        } catch (err) {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /**
   * Refresh PWA state (useful for mobile PWAs where state can change externally)
   */
  const refreshPWAState = useCallback(async (): Promise<void> => {
    try {
      const refreshedPermission =
        await pwaService.refreshNotificationPermission();
      const currentSubscription = await pwaService.getCurrentPushSubscription();
      const pushSubscribed = currentSubscription !== null;
      const isInstallable = pwaService.isInstallable();
      const isPWA = pwaService.isPWA();

      setPwaState((prev) => ({
        ...prev,
        pushPermission: refreshedPermission,
        pushSubscribed,
        isInstallable,
        isPWA,
      }));
    } catch (err) {
      setError(
        `Failed to refresh PWA state: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
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
      setError("Failed to show install prompt");
      return "dismissed";
    }
  }, []);

  /**
   * Request push notification permission and subscribe
   */
  const enablePushNotifications = useCallback(
    async (_userId: string): Promise<boolean> => {
      try {
        setError(null);

        // Check browser capabilities first
        if (!pwaState.browserInfo.canReceivePushNotifications) {
          const limitationsMessage =
            pwaState.browserInfo.limitations.join("; ");
          throw new Error(
            `Push notifications not supported: ${limitationsMessage}`,
          );
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
        const playerId =
          await pwaService.subscribeToPushNotifications(vapidKey);

        if (!playerId || playerId === "pending") {
          // Check what went wrong or if it's pending
          const permission = await pwaService.getNotificationPermission();

          setPwaState((prev) => ({ ...prev, pushPermission: permission }));

          if (playerId === "pending") {
            // Update state to show as subscribed
            setPwaState((prev) => ({
              ...prev,
              pushSubscribed: true,
              pushPermission: permission,
            }));

            return true;
          }

          if (permission === "denied") {
            throw new Error(
              "Notifications are blocked. Please enable notifications for this app in your device or browser settings.",
            );
          } else if (permission === "default") {
            throw new Error(
              "Notification permission not granted. Please try again and allow notifications when prompted.",
            );
          } else {
            throw new Error(
              "Failed to get OneSignal player ID. This may happen on mobile browsers. Please ensure you tapped a button to trigger this action, then try again.",
            );
          }
        }

        // Update permission state
        const permission = await pwaService.getNotificationPermission();
        setPwaState((prev) => ({
          ...prev,
          pushSubscribed: true,
          pushPermission: permission,
        }));

        return true;
      } catch (err) {
        // Provide user-friendly error messages
        let errorMessage = "Failed to enable push notifications";
        if (err instanceof Error) {
          errorMessage = err.message;
        }

        // Add browser-specific troubleshooting tips
        if (pwaState.browserInfo.limitations.length > 0) {
          errorMessage += `\n\nTroubleshooting tips:\n${pwaState.browserInfo.limitations.join("\n")}`;
        }

        setError(errorMessage);
        return false;
      }
    },
    [pwaState.pushPermission, pwaState.browserInfo],
  );

  /**
   * Disable push notifications
   */
  const disablePushNotifications = useCallback(
    async (_userId: string): Promise<boolean> => {
      try {
        setError(null);

        // Unsubscribe from browser (FCM handles backend removal)
        const unsubscribed =
          await pwaService.unsubscribeFromPushNotifications();

        if (unsubscribed) {
          setPwaState((prev) => ({ ...prev, pushSubscribed: false }));
          return true;
        }

        return false;
      } catch (err) {
        setError("Failed to disable push notifications");
        return false;
      }
    },
    [],
  );

  /**
   * Update the PWA
   * Note: Disabled since custom service worker is not active
   */
  const updatePWA = useCallback(async () => {
    try {
      setPwaState((prev) => ({ ...prev, updateAvailable: false }));
    } catch (err) {
      setError("Failed to update PWA");
    }
  }, []);

  /**
   * Send a test push notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    try {
      // Test notification via OneSignal - display a local notification
      if (oneSignalService.isReady()) {
        await pwaService.showLocalNotification("Test Notification", {
          body: "Push notifications are working!",
          icon: "/logo.svg",
          badge: "/logo.svg",
        });
        return true;
      }
      return false;
    } catch (err) {
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
      } catch (err) {}
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
    refreshPWAState,
  };
};
