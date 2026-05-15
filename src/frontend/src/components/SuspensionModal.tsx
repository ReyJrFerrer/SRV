import React, { useState, useEffect } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import authCanisterService from "../services/authCanisterService";

interface SuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suspensionEndDate?: Date | null;
}

const SuspensionModal: React.FC<SuspensionModalProps> = ({
  isOpen,
  onClose,
  suspensionEndDate: suspensionEndDateProp,
}) => {
  const navigate = useNavigate();
  const [suspensionEndDate, setSuspensionEndDate] = useState<
    Date | null | undefined
  >(undefined);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    if (suspensionEndDateProp !== undefined) {
      setSuspensionEndDate(suspensionEndDateProp);
      return;
    }

    authCanisterService.getMyProfile().then((profile) => {
      if (profile?.suspensionEndDate !== undefined) {
        setSuspensionEndDate(profile.suspensionEndDate);
      }
    });
  }, [isOpen, suspensionEndDateProp]);

  useEffect(() => {
    if (isOpen && suspensionEndDate instanceof Date) {
      const interval = setInterval(() => {
        const now = new Date();
        const end = new Date(suspensionEndDate);
        const diff = end.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining(
            "Suspension expired - account should be reactivated",
          );
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          );
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / 60000);
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            setTimeRemaining(
              `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`,
            );
          } else if (hours > 0) {
            setTimeRemaining(
              `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""}`,
            );
          } else if (minutes > 0) {
            setTimeRemaining(
              `${minutes} minute${minutes !== 1 ? "s" : ""}, ${seconds} second${seconds !== 1 ? "s" : ""}`,
            );
          } else {
            setTimeRemaining(`${seconds} second${seconds !== 1 ? "s" : ""}`);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, suspensionEndDate]);

  const handleReturnToLanding = () => {
    sessionStorage.setItem("hasShownSuspensionModal", "true");
    onClose();
    navigate("/");
  };

  if (!isOpen) return null;

  const isIndefinite = suspensionEndDate === null;
  const hasEndDate = suspensionEndDate instanceof Date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Suspended
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account has been suspended by an administrator. You are
              unable to access your dashboard or any account features.
            </p>

            {isIndefinite && (
              <div className="mt-3 rounded-md bg-yellow-50 p-3">
                <p className="text-sm font-medium text-yellow-800">
                  This suspension is indefinite and will remain until manually
                  reactivated by an administrator.
                </p>
              </div>
            )}

            {hasEndDate && (
              <div className="mt-3 rounded-md bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-800">
                  <strong>Suspension ends:</strong>{" "}
                  {new Date(suspensionEndDate).toLocaleString()}
                </p>
                {timeRemaining && (
                  <p className="mt-1 text-sm text-blue-700">
                    <strong>Time remaining:</strong> {timeRemaining}
                  </p>
                )}
              </div>
            )}

            <p className="mt-2 text-sm text-gray-600">
              If you believe this is an error, please contact support for
              assistance.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleReturnToLanding}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Return to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspensionModal;
