import { useState } from "react";
import { usePWA } from "../hooks/usePWA";
import { useAuth } from "../context/AuthContext";

interface NotificationSettingsDetailedProps {
  className?: string;
}

export const NotificationSettingsDetailed: React.FC<
  NotificationSettingsDetailedProps
> = ({ className = "" }) => {
  const { pwaState, enablePushNotifications, disablePushNotifications, error } =
    usePWA();
  const { identity } = useAuth();
  const [loading, setLoading] = useState(false);

  const getUserId = (): string => {
    return identity?.getPrincipal().toString() || "anonymous";
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const success = await enablePushNotifications(getUserId());
      if (success) {
        //console.log("Push notifications enabled successfully");
      }
    } catch (err) {
      console.error("Failed to enable push notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      const success = await disablePushNotifications(getUserId());
      if (success) {
        //console.log("Push notifications disabled successfully");
      }
    } finally {
      setLoading(false);
    }
  };

  const getPermissionText = () => {
    switch (pwaState.pushPermission) {
      case "granted":
        return "Notifications settings are enabled";
      case "denied":
        return "Notifications settings are disabled";
      case "default":
        return "Notifications settings are disabled";
      default:
        return "Notification status unknown";
    }
  };

  const getPermissionColor = () => {
    switch (pwaState.pushPermission) {
      case "granted":
        return "text-green-700";
      case "denied":
        return "text-red-700";
      case "default":
        return "text-gray-700";
      default:
        return "text-gray-700";
    }
  };

  const getPermissionBgColor = () => {
    switch (pwaState.pushPermission) {
      case "granted":
        return "bg-green-50 border-green-200";
      case "denied":
        return "bg-red-50 border-red-200";
      case "default":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (!pwaState.pushNotificationSupported) {
    const browserInfo = pwaState.browserInfo;
    const isMobile =
      browserInfo.name.toLowerCase().includes("safari") ||
      browserInfo.name.toLowerCase().includes("chrome") ||
      browserInfo.name.toLowerCase().includes("firefox");

    return (
      <div
        className={`rounded-lg border border-yellow-200 bg-yellow-50 p-4 ${className}`}
      >
        <h3 className="mb-2 font-semibold text-yellow-900">
          Push Notifications Unavailable
        </h3>
        <p className="text-sm text-yellow-700">
          {!pwaState.isPWA && isMobile
            ? "Please install the app as a PWA to enable push notifications. You'll still receive in-app notifications when using SRV."
            : "Your browser doesn't support push notifications. You'll still receive in-app notifications when using SRV."}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status */}
      <div className={`rounded-lg border p-4 ${getPermissionBgColor()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {pwaState.pushPermission === "granted" ? (
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : pwaState.pushPermission === "denied" ? (
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-gray-900">
              Notification Status
            </h3>
            <p className={`text-sm font-medium ${getPermissionColor()}`}>
              {getPermissionText()}
            </p>
            {pwaState.pushSubscribed && (
              <p className="mt-2 text-sm text-green-700">
                ✓ You're receiving push notifications
              </p>
            )}
            {pwaState.pushPermission === "denied" && (
              <p className="mt-2 text-sm text-gray-600">
                To enable notifications, click the lock icon in your browser's
                address bar and allow notifications.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {!pwaState.pushSubscribed ? (
          <button
            onClick={handleEnableNotifications}
            disabled={loading || pwaState.pushPermission === "denied"}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enabling..." : "Enable Push Notifications"}
          </button>
        ) : (
          <button
            onClick={handleDisableNotifications}
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Disabling..." : "Disable Push Notifications"}
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-blue-900">
          About Push Notifications
        </h4>
        <div className="space-y-1 text-xs text-blue-800">
          <p>• Receive updates even when the app is closed</p>
          <p>• Manage notification types in your profile settings</p>
          <p>• Respects your device's Do Not Disturb mode</p>
          {pwaState.pushPermission === "denied" && (
            <p className="mt-2 font-medium text-red-700">
              To re-enable, click the lock icon in your browser's address bar
              and change notification permissions
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsDetailed;
