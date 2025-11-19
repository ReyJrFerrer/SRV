import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAdmin } from "../hooks/useAdmin";
import ProviderStats from "../components/userManagement/ProviderStats";
import { adminServiceCanister } from "../services/adminServiceCanister";
import {
  UserDetailsHeader,
  UserInformationCard,
  ReputationSummaryCard,
  UserDetailsModals,
} from "../components";
import {
  convertProfileToUserData,
  formatDate,
  type UserData,
} from "../utils/userDetailsUtils";
import {
  SUSPENSION_DURATION,
  DEFAULT_SUSPENSION_DAYS,
} from "../utils/serviceStatusConstants";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const {
    loading: adminLoading,
    users: backendUsers,
    refreshUsers,
    getUserLockStatus,
    updateUserLockStatus,
  } = useAdmin();

  // Check if accessed from a ticket
  const urlParams = new URLSearchParams(location.search);
  const fromTicket = urlParams.get("from") === "ticket";
  const ticketId = urlParams.get("ticketId");
  const [user, setUser] = useState<UserData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [modals, setModals] = useState({
    reputation: false,
    lock: false,
    editPhone: false,
  });
  const [pendingReputationScore, setPendingReputationScore] = useState(50);
  const [suspension, setSuspension] = useState({
    duration: SUSPENSION_DURATION.SEVEN_DAYS as
      | typeof SUSPENSION_DURATION.SEVEN_DAYS
      | typeof SUSPENSION_DURATION.THIRTY_DAYS
      | typeof SUSPENSION_DURATION.CUSTOM
      | typeof SUSPENSION_DURATION.INDEFINITE,
    customDays: DEFAULT_SUSPENSION_DAYS,
  });
  const [actionLoading, setActionLoading] = useState({
    reputation: false,
    account: false,
    phone: false,
  });
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleUpdateCommission = (newAmount: number) => {
    // Update local balance when refreshed from ProviderStats
    if (user) {
      setUser({ ...user, walletBalance: newAmount });
    }
  };

  const handleReputationChange = (newScore: number) => {
    setPendingReputationScore(newScore);
  };

  const handleEditPhoneClick = () => {
    if (!user) return;
    setPhoneInput(user.phone || "");
    setPhoneError(null);
    setModals((prev) => ({ ...prev, editPhone: true }));
  };

  const closeEditPhoneModal = () => {
    setModals((prev) => ({ ...prev, editPhone: false }));
    setPhoneError(null);
  };

  const handleUpdatePhoneNumber = async () => {
    if (!user) return;
    const normalizedPhone = phoneInput.replace(/\s+/g, "");
    if (!normalizedPhone || !/^\+?\d{7,15}$/.test(normalizedPhone)) {
      toast.error("Enter a valid phone number.");
      return;
    }

    setActionLoading((prev) => ({ ...prev, phone: true }));
    setPhoneError(null);
    try {
      await adminServiceCanister.updateUserPhoneNumber(
        user.id,
        normalizedPhone,
      );
      setUser((prev) => (prev ? { ...prev, phone: normalizedPhone } : prev));
      toast.success("Phone number updated successfully");
      setModals((prev) => ({ ...prev, editPhone: false }));
      setPhoneError(null);
    } catch (error: any) {
      const errorCode =
        error?.code || error?.details?.code || error?.details?.details?.code;
      if (
        errorCode === "already-exists" ||
        errorCode === "functions/already-exists"
      ) {
        setPhoneError("This phone number is already registered.");
      } else {
        toast.error("Failed to update phone number. Please try again.");
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, phone: false }));
    }
  };

  // Account management functions
  const handleLockConfirmation = () => {
    setModals((prev) => ({ ...prev, lock: true }));
  };

  const handleActivateAccount = async () => {
    if (!user) return;

    setActionLoading((prev) => ({ ...prev, account: true }));
    try {
      await adminServiceCanister.lockUserAccount(user.id, false);
      updateUserLockStatus(user.id, false);
      setUser((prev) => (prev ? { ...prev, isLocked: false } : null));
      toast.success("Account activated successfully");
    } catch (error) {
      console.error("Failed to activate account:", error);
      toast.error("Failed to activate account. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, account: false }));
    }
  };

  const confirmLockAccount = async () => {
    if (!user) return;

    let suspensionDurationDays: number | null;
    if (suspension.duration === SUSPENSION_DURATION.INDEFINITE) {
      suspensionDurationDays = null;
    } else if (suspension.duration === SUSPENSION_DURATION.CUSTOM) {
      if (
        suspension.customDays <= 0 ||
        !Number.isInteger(suspension.customDays)
      ) {
        toast.error(
          "Please enter a valid number of days (must be a positive integer).",
        );
        return;
      }
      suspensionDurationDays = suspension.customDays;
    } else {
      suspensionDurationDays = parseInt(suspension.duration);
    }

    setActionLoading((prev) => ({ ...prev, account: true }));
    try {
      await adminServiceCanister.lockUserAccount(
        user.id,
        true,
        suspensionDurationDays,
      );
      updateUserLockStatus(user.id, true);
      setUser((prev) => (prev ? { ...prev, isLocked: true } : null));
      setModals((prev) => ({ ...prev, lock: false }));
      setSuspension({
        duration: SUSPENSION_DURATION.SEVEN_DAYS,
        customDays: DEFAULT_SUSPENSION_DAYS,
      });
      toast.success("Account locked successfully");
    } catch (error) {
      console.error("Failed to lock account:", error);
      toast.error("Failed to lock account. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, account: false }));
    }
  };

  const handleSaveReputation = () => {
    setModals((prev) => ({ ...prev, reputation: true }));
  };

  const confirmReputationUpdate = async () => {
    if (!user) return;

    setActionLoading((prev) => ({ ...prev, reputation: true }));
    try {
      await adminServiceCanister.updateUserReputation(
        user.id,
        pendingReputationScore,
      );
      await loadUser();
      toast.success("Reputation updated successfully!");
    } catch (error) {
      console.error("Failed to update reputation:", error);
      toast.error("Failed to update reputation. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, reputation: false }));
      setModals((prev) => ({ ...prev, reputation: false }));
    }
  };

  // Load user data function
  const loadUser = useCallback(async () => {
    if (!id) {
      setLoadingUser(false);
      return;
    }
    if (backendUsers.length === 0) {
      try {
        await refreshUsers();
        return;
      } catch (error) {
        setUser(null);
        setLoadingUser(false);
        return;
      }
    }

    // Find the user in backend users
    const foundProfile = backendUsers.find((p) => p?.id?.toString() === id);

    if (foundProfile) {
      try {
        const userData = await convertProfileToUserData(
          foundProfile,
          getUserLockStatus,
        );
        setUser(userData);
        setPendingReputationScore(userData.reputationScore);
      } catch (error) {
        console.error("Error converting user data:", error);
        if (foundProfile) {
          const basicUserData = await convertProfileToUserData(
            foundProfile,
            getUserLockStatus,
          );
          setUser(basicUserData);
          setPendingReputationScore(basicUserData.reputationScore);
        }
      }
    } else {
      setUser(null);
    }

    setLoadingUser(false);
  }, [id, backendUsers, refreshUsers, getUserLockStatus]);

  // Load user data on component mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500">
                Loading user details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <ExclamationTriangleIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              User not found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              The user you're looking for doesn't exist or has been removed.
            </p>
            <div className="mt-6">
              {fromTicket && ticketId ? (
                <Link
                  to={`/ticket/${ticketId}`}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Back to Ticket
                </Link>
              ) : (
                <Link
                  to="/users"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Back to Users
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserDetailsHeader
        user={user}
        fromTicket={fromTicket}
        ticketId={ticketId}
        formatDate={formatDate}
        onLockClick={handleLockConfirmation}
        onActivateClick={handleActivateAccount}
        lockingAccount={actionLoading.account}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* User Stats */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              Performance Overview
            </h2>
            <ProviderStats
              providerId={user.id}
              loading={adminLoading.users}
              onUpdateCommission={handleUpdateCommission}
              outstandingCommission={user.walletBalance}
              userData={{
                totalEarnings: user.totalEarnings,
                pendingCommission: user.pendingCommission,
                settledCommission: user.settledCommission,
                completedJobs: user.completedJobs,
                averageRating: user.averageRating,
                totalReviews: user.totalReviews,
                completionRate: user.completionRate,
                totalRevenue: user.totalEarnings,
              }}
            />
          </div>

          {/* Provider Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UserInformationCard
              user={user}
              formatDate={formatDate}
              onEditPhoneNumber={handleEditPhoneClick}
            />

            <ReputationSummaryCard
              pendingReputationScore={pendingReputationScore}
              onReputationChange={handleReputationChange}
              onSaveReputation={handleSaveReputation}
              updatingReputation={actionLoading.reputation}
            />
          </div>
        </div>
      </main>

      <UserDetailsModals
        showReputationConfirmation={modals.reputation}
        showLockConfirmation={modals.lock}
        pendingReputationScore={pendingReputationScore}
        suspensionDuration={suspension.duration}
        customDays={suspension.customDays}
        updatingReputation={actionLoading.reputation}
        lockingAccount={actionLoading.account}
        onReputationConfirm={confirmReputationUpdate}
        onReputationCancel={() =>
          setModals((prev) => ({ ...prev, reputation: false }))
        }
        onLockConfirm={confirmLockAccount}
        onLockCancel={() => {
          setModals((prev) => ({ ...prev, lock: false }));
          setSuspension({
            duration: SUSPENSION_DURATION.SEVEN_DAYS,
            customDays: DEFAULT_SUSPENSION_DAYS,
          });
        }}
        onSuspensionDurationChange={(duration) =>
          setSuspension((prev) => ({ ...prev, duration }))
        }
        onCustomDaysChange={(customDays) =>
          setSuspension((prev) => ({ ...prev, customDays }))
        }
      />
      {modals.editPhone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Phone Number
              </h3>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Enter phone number"
              />
              {phoneError && (
                <p className="mt-2 text-sm text-red-600">{phoneError}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4">
              <button
                onClick={closeEditPhoneModal}
                disabled={actionLoading.phone}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePhoneNumber}
                disabled={actionLoading.phone}
                className="flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading.phone ? (
                  <>
                    <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" />
                    Saving...
                  </>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
