import React from "react";

interface OneSignalBlockedModalProps {
  onClose: () => void;
}

export const OneSignalBlockedModal: React.FC<OneSignalBlockedModalProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 py-8 sm:p-4">
      <div className="my-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl sm:p-8">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 sm:mb-6 sm:h-20 sm:w-20">
          <svg
            className="h-8 w-8 text-orange-600 sm:h-10 sm:w-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-center text-xl font-bold text-gray-900 sm:mb-4 sm:text-2xl">
          Push Notification Service Blocked
        </h2>

        {/* Message */}
        <p className="mb-4 text-center text-sm text-gray-600 sm:mb-6 sm:text-base">
          Push notifications are being blocked by your browser or an extension
          (such as an ad blocker). To enable push notifications, please follow
          the instructions below.
        </p>

        {/* Instructions */}
        <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
            How to Fix This Issue:
          </h3>

          <div className="space-y-2 text-xs text-gray-700 sm:space-y-3 sm:text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <p className="mb-1.5 text-xs font-medium text-gray-900 sm:mb-2 sm:text-sm">
                1. Check Your Ad Blocker
              </p>
              <p className="text-xs sm:text-sm">
                If you're using an ad blocker (like AdBlock, uBlock Origin, or
                similar), temporarily disable it for this website:
              </p>
              <ul className="ml-4 mt-1.5 list-disc space-y-1 sm:mt-2">
                <li>Look for the ad blocker icon in your browser toolbar</li>
                <li>Click it and disable blocking for this site</li>
                <li>Refresh the page after making changes</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <p className="mb-1.5 text-xs font-medium text-gray-900 sm:mb-2 sm:text-sm">
                2. Check Browser Settings
              </p>
              <p className="text-xs sm:text-sm">
                Some browsers have built-in tracking or script blocking. Check
                your browser's settings to ensure push notifications are
                allowed.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <p className="mb-1.5 text-xs font-medium text-gray-900 sm:mb-2 sm:text-sm">
                3. Check Browser Extensions
              </p>
              <p className="text-xs sm:text-sm">
                Privacy extensions (Privacy Badger, Ghostery, etc.) may block
                push notification services. Try disabling them temporarily to
                test.
              </p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mb-4 rounded-lg bg-blue-50 p-3 sm:mb-6 sm:p-4">
          <p className="text-xs text-blue-800 sm:text-sm">
            <strong>Note:</strong> Push notifications help you stay updated with
            real-time alerts for bookings, messages, and important account
            activities.
          </p>
        </div>

        {/* Brave-specific guidance */}
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 sm:mb-6 sm:p-4">
          <p className="text-xs text-orange-800 sm:text-sm">
            <strong>Important for Brave users:</strong> The Brave browser
            frequently blocks third-party push notification services and may
            prevent SRV from delivering notifications even after you allow them.
            If you rely on real-time alerts, consider using Chrome, Edge, or
            Firefox for the best experience. If you prefer to stay on Brave, try
            disabling <em>Shields</em> for this site or temporarily disabling
            any privacy extensions, then refresh the page.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            try {
              localStorage.setItem(
                "oneSignalBlockedModalDismissedAt",
                String(Date.now()),
              );
            } catch (e) {}
            onClose();
          }}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:px-6 sm:py-3 sm:text-base"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

// Helper: parent components can use this to avoid re-showing the modal for a period
export function isOneSignalBlockedModalDismissed(
  maxAgeMs = 24 * 60 * 60 * 1000,
) {
  try {
    const v = localStorage.getItem("oneSignalBlockedModalDismissedAt");
    if (!v) return false;
    const ts = Number(v);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < maxAgeMs;
  } catch (e) {
    return false;
  }
}
