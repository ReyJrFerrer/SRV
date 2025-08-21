import { useState } from "react";
import { usePWA } from "../hooks/usePWA";
import { useAuth } from "../context/AuthContext";

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = "",
}) => {
  const { pwaState, enablePushNotifications } = usePWA();
  const { identity } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const getUserId = (): string => {
    return identity?.getPrincipal().toString() || "anonymous";
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const success = await enablePushNotifications(getUserId());
      if (success) {
        console.log("Push notifications enabled successfully");
        setShowModal(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!pwaState.pushNotificationSupported) {
    return null; // Don't show anything if not supported
  }

  // Show trigger when notifications are not enabled (similar to PWAInstall)
  if (pwaState.pushPermission !== "granted" || !pwaState.pushSubscribed) {
    return (
      <>
        <div
          className={`flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}
        >
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">
              Enable Push Notifications
            </h3>
            <p className="text-sm text-blue-700">
              Get notified about booking updates, messages, and important
              alerts.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={loading || pwaState.pushPermission === "denied"}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enabling..." : "Enable"}
          </button>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 mt-10 flex items-center justify-center bg-black/70"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <img
                  src="/images/srv characters (SVG)/tech guy.svg"
                  alt="SRV Notifications"
                  className="h-20 w-20 rounded-full border-4 border-white bg-blue-100 shadow-lg"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="mt-14">
                <h2 className="mb-4 text-center text-xl font-bold text-gray-900">
                  Enable Push Notifications
                </h2>
                <p className="mb-6 text-center text-sm text-gray-700">
                  Allow SRV to send you updates about bookings, messages, and
                  important alerts. You can change this later in settings.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleEnableNotifications}
                    disabled={loading || pwaState.pushPermission === "denied"}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Enabling..." : "Enable"}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Return null when notifications are already enabled (similar to PWAInstall behavior)
  return null;
};

export default NotificationSettings;
