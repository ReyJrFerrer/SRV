import { useState, useEffect, useCallback } from "react";
import notificationService from "../services/notificationService";

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
    isOffline: !navigator.onLine,
    pushNotificationSupported:
      "Notification" in window && "serviceWorker" in navigator,
    pushPermission:
      "Notification" in window ? Notification.permission : "denied",
    pushSubscribed: false,
    updateAvailable: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Initialize PWA state
  useEffect(() => {
    const initializePWA = async () => {
      try {
        console.log("[usePWA] Initializing PWA state");

        const isPWA =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone ||
          document.referrer.includes("android-app://");

        const pushNotificationSupported =
          "Notification" in window && "serviceWorker" in navigator;

        const pushPermission =
          "Notification" in window
            ? Notification.permission
            : ("denied" as NotificationPermission);

        // Get notification service state
        const notifState = notificationService.getState();
        const pushSubscribed = notifState.fcmReady;

        setPwaState((prev) => ({
          ...prev,
          isPWA,
          pushNotificationSupported,
          pushPermission,
          pushSubscribed,
        }));

        // Auto-initialize notification service (this won't trigger FCM unless permission is granted)
        await notificationService.initialize(false);

        setLoading(false);
      } catch (err) {
        console.error("[usePWA] Error initializing PWA:", err);
        setError(
          `Failed to initialize PWA: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        setLoading(false);
      }
    };

    initializePWA();
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("[usePWA] Install prompt available");
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      console.log("[usePWA] App was installed");
      setDeferredPrompt(null);
      setPwaState((prev) => ({ ...prev, isInstallable: false, isPWA: true }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () =>
      setPwaState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () =>
      setPwaState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Listen for visibility changes to refresh permission status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && "Notification" in window) {
        const currentPermission = Notification.permission;
        const notifState = notificationService.getState();
        const isSubscribed = notifState.fcmReady;

        setPwaState((prev) => ({
          ...prev,
          pushPermission: currentPermission,
          pushSubscribed: isSubscribed,
        }));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const refreshPWAState = useCallback(async (): Promise<void> => {
    try {
      console.log("[usePWA] Refreshing PWA state");

      const currentPermission =
        "Notification" in window
          ? Notification.permission
          : ("denied" as NotificationPermission);
      const notifState = notificationService.getState();
      const isSubscribed = notifState.fcmReady;
      const isPWA =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone;

      setPwaState((prev) => ({
        ...prev,
        pushPermission: currentPermission,
        pushSubscribed: isSubscribed,
        isPWA,
        isInstallable: deferredPrompt !== null,
      }));
    } catch (err) {
      console.error("[usePWA] Error refreshing PWA state:", err);
      setError(
        `Failed to refresh PWA state: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }, [deferredPrompt]);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "not-available"
  > => {
    if (!deferredPrompt) {
      console.log("[usePWA] Install prompt not available");
      return "not-available";
    }

    try {
      console.log("[usePWA] Showing install prompt");
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("[usePWA] Install prompt result:", outcome);

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setPwaState((prev) => ({ ...prev, isInstallable: false }));
      }

      return outcome;
    } catch (err) {
      console.error("[usePWA] Error showing install prompt:", err);
      setError("Failed to show install prompt");
      return "dismissed";
    }
  }, [deferredPrompt]);

  const enablePushNotifications = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setError(null);
        console.log("[usePWA] Enabling push notifications for user:", userId);

        if (!pwaState.pushNotificationSupported) {
          const errorMsg =
            "Push notifications are not supported in this browser";
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        // Check if already subscribed to avoid unnecessary calls
        const notifState = notificationService.getState();
        if (pwaState.pushSubscribed && notifState.fcmReady) {
          console.log("[usePWA] Already subscribed to push notifications");
          return true;
        }

        console.log("[usePWA] Calling requestPermissionAndEnable...");
        const result = await notificationService.requestPermissionAndEnable();

        if (result.success) {
          console.log("[usePWA] Push notifications enabled, updating state");
          setPwaState((prev) => ({
            ...prev,
            pushSubscribed: true,
            pushPermission: Notification.permission,
          }));
          return true;
        } else {
          const errorMsg =
            result.error ||
            "Failed to enable push notifications. Please try again.";
          console.error("[usePWA]", errorMsg);
          setError(errorMsg);
          return false;
        }
      } catch (err) {
        console.error("[usePWA] Failed to enable push notifications:", err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to enable push notifications";
        setError(errorMsg);

        // Update state to reflect failure
        setPwaState((prev) => ({
          ...prev,
          pushSubscribed: false,
          pushPermission: Notification.permission,
        }));

        return false;
      }
    },
    [pwaState.pushNotificationSupported, pwaState.pushSubscribed],
  );

  const disablePushNotifications = useCallback(
    async (_userId: string): Promise<boolean> => {
      try {
        setError(null);
        console.log("[usePWA] Disabling push notifications");

        const success = await notificationService.disableNotifications();

        if (success) {
          setPwaState((prev) => ({
            ...prev,
            pushSubscribed: false,
          }));
        }

        return success;
      } catch (err) {
        console.error("[usePWA] Failed to disable push notifications:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to disable push notifications",
        );
        return false;
      }
    },
    [],
  );

  return {
    pwaState,
    loading,
    error,
    offlineReady: false,
    promptInstall,
    enablePushNotifications,
    disablePushNotifications,
    refreshPWAState,
  };
};
