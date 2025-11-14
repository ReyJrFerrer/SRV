import React from "react";
import { SUSPENSION_DURATION } from "../utils/serviceStatusConstants";

type SuspensionDuration =
  | typeof SUSPENSION_DURATION.SEVEN_DAYS
  | typeof SUSPENSION_DURATION.THIRTY_DAYS
  | typeof SUSPENSION_DURATION.CUSTOM
  | typeof SUSPENSION_DURATION.INDEFINITE;

interface UserDetailsModalsProps {
  showReputationConfirmation: boolean;
  showLockConfirmation: boolean;
  pendingReputationScore: number;
  suspensionDuration: SuspensionDuration;
  customDays: number;
  updatingReputation: boolean;
  lockingAccount: boolean;
  onReputationConfirm: () => void;
  onReputationCancel: () => void;
  onLockConfirm: () => void;
  onLockCancel: () => void;
  onSuspensionDurationChange: (duration: SuspensionDuration) => void;
  onCustomDaysChange: (days: number) => void;
}

export const UserDetailsModals: React.FC<UserDetailsModalsProps> = ({
  showReputationConfirmation,
  showLockConfirmation,
  pendingReputationScore,
  suspensionDuration,
  customDays,
  updatingReputation,
  lockingAccount,
  onReputationConfirm,
  onReputationCancel,
  onLockConfirm,
  onLockCancel,
  onSuspensionDurationChange,
  onCustomDaysChange,
}) => {
  return (
    <>
      {/* Reputation Update Confirmation Modal */}
      {showReputationConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Reputation Update
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to update the reputation score to{" "}
                <strong>{pendingReputationScore}</strong>?
              </p>
            </div>
            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4">
              <button
                onClick={onReputationCancel}
                disabled={updatingReputation}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onReputationConfirm}
                disabled={updatingReputation}
                className="flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingReputation ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Update Reputation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Account Confirmation Modal */}
      {showLockConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Lock Account
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="mb-4 text-sm text-gray-600">
                Are you sure you want to lock this account? Select the lock
                duration:
              </p>

              {/* Suspension Duration Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="suspension-7"
                    name="suspensionDuration"
                    value={SUSPENSION_DURATION.SEVEN_DAYS}
                    checked={
                      suspensionDuration === SUSPENSION_DURATION.SEVEN_DAYS
                    }
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as SuspensionDuration,
                      )
                    }
                    className="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="suspension-7"
                    className="ml-2 text-sm text-gray-700"
                  >
                    7 days
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="suspension-30"
                    name="suspensionDuration"
                    value={SUSPENSION_DURATION.THIRTY_DAYS}
                    checked={
                      suspensionDuration === SUSPENSION_DURATION.THIRTY_DAYS
                    }
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as SuspensionDuration,
                      )
                    }
                    className="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="suspension-30"
                    className="ml-2 text-sm text-gray-700"
                  >
                    30 days
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="suspension-custom"
                    name="suspensionDuration"
                    value={SUSPENSION_DURATION.CUSTOM}
                    checked={suspensionDuration === SUSPENSION_DURATION.CUSTOM}
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as SuspensionDuration,
                      )
                    }
                    className="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="suspension-custom"
                    className="ml-2 flex items-center gap-2 text-sm text-gray-700"
                  >
                    Custom:
                    <input
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) =>
                        onCustomDaysChange(parseInt(e.target.value) || 1)
                      }
                      disabled={
                        suspensionDuration !== SUSPENSION_DURATION.CUSTOM
                      }
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    days
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="radio"
                    id="suspension-indefinite"
                    name="suspensionDuration"
                    value={SUSPENSION_DURATION.INDEFINITE}
                    checked={
                      suspensionDuration === SUSPENSION_DURATION.INDEFINITE
                    }
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as SuspensionDuration,
                      )
                    }
                    className="h-4 w-4 border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="suspension-indefinite"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Indefinite (until manually reactivated)
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4">
              <button
                onClick={onLockCancel}
                disabled={lockingAccount}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onLockConfirm}
                disabled={lockingAccount}
                className="flex items-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lockingAccount ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Locking...
                  </>
                ) : (
                  "Lock Account"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
