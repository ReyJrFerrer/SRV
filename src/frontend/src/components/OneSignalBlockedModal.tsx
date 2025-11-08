import React from "react";

interface OneSignalBlockedModalProps {
  onClose: () => void;
}

export const OneSignalBlockedModal: React.FC<OneSignalBlockedModalProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <svg
            className="h-10 w-10 text-orange-600"
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
        <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
          Push Notification Service Blocked
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-gray-600">
          Push notifications are being blocked by your browser or an extension
          (such as an ad blocker). To enable push notifications, please follow
          the instructions below.
        </p>

        {/* Instructions */}
        <div className="mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            How to Fix This Issue:
          </h3>

          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 font-medium text-gray-900">
                1. Check Your Ad Blocker
              </p>
              <p>
                If you're using an ad blocker (like AdBlock, uBlock Origin, or
                similar), temporarily disable it for this website:
              </p>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Look for the ad blocker icon in your browser toolbar</li>
                <li>Click it and disable blocking for this site</li>
                <li>Refresh the page after making changes</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 font-medium text-gray-900">
                2. Check Browser Settings
              </p>
              <p>
                Some browsers have built-in tracking or script blocking. Check
                your browser's settings to ensure push notifications are
                allowed.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 font-medium text-gray-900">
                3. Check Browser Extensions
              </p>
              <p>
                Privacy extensions (Privacy Badger, Ghostery, etc.) may block
                push notification services. Try disabling them temporarily to
                test.
              </p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Push notifications help you stay updated
            with real-time alerts for bookings, messages, and important account
            activities.
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};
