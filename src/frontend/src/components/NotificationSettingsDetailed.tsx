import { useState } from "react";
import { usePWA } from "../hooks/usePWA";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

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
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            ) : pwaState.pushPermission === "denied" ? (
              <XCircleIcon className="h-6 w-6 text-red-600" />
            ) : (
              <BellIcon className="h-6 w-6 text-gray-600" />
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
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
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
