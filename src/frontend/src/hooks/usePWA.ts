import { useState, useEffect, useCallback } from "react";
import pwaService from "../services/pwaService";
import pushNotificationService from "../services/pushNotificationService";

export interface PWAState {
  isInstallable: boolean;
  isPWA: boolean;
  isOffline: boolean;
  pushNotificationSupported: boolean;
  pushPermission: NotificationPermission;
  pushSubscribed: boolean;
  updateAvailable: boolean;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isPWA: false,
    isOffline: false,
    pushNotificationSupported: false,
    pushPermission: "default",
    pushSubscribed: false,
    updateAvailable: false,
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
        console.error("Error initializing PWA:", err);
        setError("Failed to initialize PWA features");
        setLoading(false);
      }
    };

    initializePWA();
  }, []);

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
          // Initialize with mock config for development/testing
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
  };
};
