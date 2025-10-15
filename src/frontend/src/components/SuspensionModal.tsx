import React from "react";
import { useNavigate } from "react-router-dom";

interface SuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuspensionModal: React.FC<SuspensionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleReturnToLanding = () => {
    onClose();
    navigate("/");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Suspended
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account has been suspended by an administrator. You are unable to access your dashboard or any account features.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              If you believe this is an error, please contact support for assistance.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleReturnToLanding}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspensionModal;
