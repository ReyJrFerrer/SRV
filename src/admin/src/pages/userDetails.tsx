import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAdmin } from "../hooks/useAdmin";
import ProviderStats from "../components/ProviderStats";
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
  });

  const handleUpdateCommission = (newAmount: number) => {
    // Update local balance when refreshed from ProviderStats
    if (user) {
      setUser({ ...user, walletBalance: newAmount });
    }
  };

  const handleReputationChange = (newScore: number) => {
    setPendingReputationScore(newScore);
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
      if (suspension.customDays <= 0 || !Number.isInteger(suspension.customDays)) {
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
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
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
            <UserInformationCard user={user} formatDate={formatDate} />

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
        onReputationCancel={() => setModals((prev) => ({ ...prev, reputation: false }))}
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
    </div>
  );
};
