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
        return "Notifications are enabled";
      case "denied":
        return "Notifications are blocked. Please enable them in your browser settings.";
      case "default":
        return "Click to enable push notifications";
      default:
        return "Notification status unknown";
    }
  };

  const getPermissionColor = () => {
    switch (pwaState.pushPermission) {
      case "granted":
        return "text-green-600";
      case "denied":
        return "text-red-600";
      case "default":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  if (!pwaState.pushNotificationSupported) {
    const browserInfo = pwaState.browserInfo;
    const isMobile = browserInfo.name.toLowerCase().includes('safari') || 
                     browserInfo.name.toLowerCase().includes('chrome') ||
                     browserInfo.name.toLowerCase().includes('firefox');
    
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
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-900">
          Push Notification Status
        </h3>
        <p className={`text-sm ${getPermissionColor()}`}>
          {getPermissionText()}
        </p>
        {pwaState.pushSubscribed && (
          <p className="mt-1 text-sm text-green-600">
            ✓ Subscribed to push notifications
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {!pwaState.pushSubscribed ? (
          <button
            onClick={handleEnableNotifications}
            disabled={loading || pwaState.pushPermission === "denied"}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enabling..." : "Enable Push Notifications"}
          </button>
        ) : (
          <button
            onClick={handleDisableNotifications}
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Disabling..." : "Disable Push Notifications"}
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="space-y-1 text-xs text-gray-500">
        <p>• Push notifications work even when the app is closed</p>
        <p>• You can manage notification types in your profile settings</p>
        <p>• Notifications respect your browser's Do Not Disturb settings</p>
        {pwaState.pushPermission === "denied" && (
          <p className="text-red-500">
            • To re-enable notifications, click the lock icon in your browser's
            address bar
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsDetailed;
