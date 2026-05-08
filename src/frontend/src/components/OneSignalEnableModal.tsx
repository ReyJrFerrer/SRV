import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BellIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { usePWA } from "../hooks/usePWA";
import { useAuth } from "../context/AuthContext";

interface OneSignalEnableModalProps {
  onClose: () => void;
}

export const OneSignalEnableModal: React.FC<OneSignalEnableModalProps> = ({
  onClose,
}) => {
  const { enablePushNotifications, error } = usePWA();
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const nativePermission =
    typeof Notification !== "undefined" ? Notification.permission : "default";

  // Disable background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const userId = firebaseUser?.uid || "anonymous";
      const success = await enablePushNotifications(userId);
      if (success) {
        try {
          localStorage.setItem(
            "oneSignalEnableModalDismissedAt",
            String(Date.now()),
          );
        } catch {}
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(
        "oneSignalEnableModalDismissedAt",
        String(Date.now()),
      );
    } catch {}
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/70 p-4 sm:p-6">
      <div className="flex w-full max-w-2xl flex-col max-h-[90dvh] rounded-xl bg-white shadow-2xl">
        <div className="overflow-y-auto p-6 sm:p-8">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mb-6 sm:h-20 sm:w-20">
            <BellIcon className="h-8 w-8 text-blue-600 sm:h-10 sm:w-10" />
          </div>

        {/* Title */}
        <h2 className="mb-3 text-center text-xl font-bold text-gray-900 sm:mb-4 sm:text-2xl">
          Stay Updated with Push Notifications
        </h2>

        {/* Message */}
        <p className="mb-4 text-center text-sm text-gray-600 sm:mb-6 sm:text-base">
          Get real-time alerts for bookings, messages, and important account
          activities — even when the app is closed.
        </p>

        {/* Benefits */}
        <div className="mb-4 space-y-2 sm:mb-6">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 sm:text-sm">
                Booking Updates
              </p>
              <p className="text-xs text-gray-600">
                Instant alerts when bookings are confirmed, rescheduled, or
                completed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 sm:text-sm">
                Messages
              </p>
              <p className="text-xs text-gray-600">
                Never miss a message from your service provider or client.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <UserCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 sm:text-sm">
                Account Activity
              </p>
              <p className="text-xs text-gray-600">
                Stay on top of payments, reviews, and account changes.
              </p>
            </div>
          </div>
        </div>

        {/* Permission denied guidance */}
        {nativePermission === "denied" && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 sm:mb-6 sm:p-4">
            <p className="text-xs text-orange-800 sm:text-sm">
              <strong>Notifications are blocked.</strong> To enable them, click
              the lock icon in your browser's address bar and allow
              notifications for this site, then refresh the page.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 sm:mb-6 sm:p-4">
            <p className="text-xs text-red-800 sm:text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleEnable}
            disabled={loading || nativePermission === "denied"}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
          >
            {loading ? "Enabling..." : "Enable Notifications"}
          </button>

          <button
            onClick={handleDismiss}
            disabled={loading}
            className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:px-6 sm:py-3 sm:text-base"
          >
            Not Now
          </button>
        </div>

        {/* Note */}
        <p className="mt-3 text-center text-xs text-gray-500 sm:mt-4">
          You can change this anytime in Settings.
        </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export function isOneSignalEnableModalDismissed(
  maxAgeMs = 3 * 24 * 60 * 60 * 1000,
) {
  try {
    const v = localStorage.getItem("oneSignalEnableModalDismissedAt");
    if (!v) return false;
    const ts = Number(v);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < maxAgeMs;
  } catch (e) {
    return false;
  }
}
