import React from "react";

interface UserDetailsModalsProps {
  showReputationConfirmation: boolean;
  showCommissionConfirmation: boolean;
  showLockConfirmation: boolean;
  pendingReputationScore: number;
  outstandingCommission: number;
  suspensionDuration: "7" | "30" | "custom" | "indefinite";
  customDays: number;
  onReputationConfirm: () => void;
  onReputationCancel: () => void;
  onCommissionCancel: () => void;
  onLockConfirm: () => void;
  onLockCancel: () => void;
  onSuspensionDurationChange: (
    duration: "7" | "30" | "custom" | "indefinite",
  ) => void;
  onCustomDaysChange: (days: number) => void;
}

export const UserDetailsModals: React.FC<UserDetailsModalsProps> = ({
  showReputationConfirmation,
  showCommissionConfirmation,
  showLockConfirmation,
  pendingReputationScore,
  outstandingCommission,
  suspensionDuration,
  customDays,
  onReputationConfirm,
  onReputationCancel,
  onCommissionCancel,
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
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={onReputationConfirm}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Update Reputation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Update Confirmation Modal - Keeping for backward compatibility but not used */}
      {showCommissionConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Commission Update
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to update the outstanding commission to{" "}
                <strong>₱{outstandingCommission.toFixed(2)}</strong>?
              </p>
            </div>
            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4">
              <button
                onClick={onCommissionCancel}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={onCommissionCancel}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
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
                    value="7"
                    checked={suspensionDuration === "7"}
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as "7" | "30" | "custom" | "indefinite",
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
                    value="30"
                    checked={suspensionDuration === "30"}
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as "7" | "30" | "custom" | "indefinite",
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
                    value="custom"
                    checked={suspensionDuration === "custom"}
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as "7" | "30" | "custom" | "indefinite",
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
                      disabled={suspensionDuration !== "custom"}
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
                    value="indefinite"
                    checked={suspensionDuration === "indefinite"}
                    onChange={(e) =>
                      onSuspensionDurationChange(
                        e.target.value as "7" | "30" | "custom" | "indefinite",
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
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={onLockConfirm}
                className="rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                Lock Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
