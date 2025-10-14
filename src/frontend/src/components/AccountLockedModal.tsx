import React from "react";
import { useAuth } from "../context/AuthContext";

interface AccountLockedModalProps {
  onClose?: () => void;
}

export const AccountLockedModal: React.FC<AccountLockedModalProps> = ({
  onClose,
}) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-10 w-10 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="mb-4 text-center text-2xl font-bold text-gray-900">
          Account Locked
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-gray-600">
          Your account has been locked by an administrator. You are unable to
          access your account at this time.
        </p>

        <p className="mb-6 text-center text-sm text-gray-500">
          If you believe this is an error, please contact support for
          assistance.
        </p>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
