import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import ProviderStats from "../components/ProviderStats";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";
import {
  UserDetailsHeader,
  UserInformationCard,
  ReputationSummaryCard,
  UserDetailsModals,
} from "../components";

interface UserData {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  profilePicture?: {
    imageUrl: string;
    thumbnailUrl: string;
  };
  biography?: string;
  totalEarnings: number;
  pendingCommission: number;
  settledCommission: number;
  completedJobs: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
  lastActivity: Date;
  reputationScore: number;
  reputationLevel: string;
  reputationRing: number;
  isLocked: boolean;
  walletBalance: number;
  servicesCount: number;
}

export const UserDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const {
    loading,
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
  const [showReputationConfirmation, setShowReputationConfirmation] =
    useState(false);
  const [showCommissionConfirmation, setShowCommissionConfirmation] =
    useState(false);
  const [outstandingCommission, setOutstandingCommission] = useState(0);
  const [pendingReputationScore, setPendingReputationScore] = useState(50);
  const [showLockConfirmation, setShowLockConfirmation] = useState(false);
  const [suspensionDuration, setSuspensionDuration] = useState<
    "7" | "30" | "custom" | "indefinite"
  >("7");
  const [customDays, setCustomDays] = useState<number>(7);

  // Convert Profile to UserData format with real data
  const convertProfileToUserData = async (
    profile: Profile,
  ): Promise<UserData> => {
    // Get lock status from the shared lock status store
    const lockStatus = getUserLockStatus(profile.id.toString());

    try {
      // Fetch real analytics data with individual error handling
      const [analytics, reviews, reputation, walletBalance, servicesData] =
        await Promise.allSettled([
          adminServiceCanister.getUserAnalytics(profile.id.toString()),
          adminServiceCanister.getUserReviews(profile.id.toString()),
          adminServiceCanister.getUserReputation(profile.id.toString()),
          walletCanisterService.getBalanceOf(profile.id.toString()),
          adminServiceCanister.getUserServicesAndBookings(
            profile.id.toString(),
          ),
        ]);

      // Extract results with fallbacks
      const analyticsData =
        analytics.status === "fulfilled"
          ? analytics.value
          : {
              totalEarnings: 0,
              completedJobs: 0,
              cancelledJobs: 0,
              totalJobs: 0,
              completionRate: 0,
            };

      const reviewsData =
        reviews.status === "fulfilled"
          ? reviews.value
          : {
              averageRating: 0,
              totalReviews: 0,
            };

      const reputationData =
        reputation.status === "fulfilled"
          ? reputation.value
          : {
              reputationScore: 50,
              trustLevel: "New",
              completedBookings: 0,
            };

      const walletBalanceData =
        walletBalance.status === "fulfilled" ? walletBalance.value : 0;

      const servicesDataResult =
        servicesData.status === "fulfilled"
          ? servicesData.value
          : {
              offeredServices: [],
              clientBookings: [],
              providerBookings: [],
            };

      // Log any failed requests for debugging
      if (analytics.status === "rejected") {
        console.warn("Analytics fetch failed:", analytics.reason);
      }
      if (reviews.status === "rejected") {
        console.warn("Reviews fetch failed:", reviews.reason);
      }
      if (reputation.status === "rejected") {
        console.warn("Reputation fetch failed:", reputation.reason);
      }
      if (walletBalance.status === "rejected") {
        console.warn("Wallet balance fetch failed:", walletBalance.reason);
      }
      if (servicesData.status === "rejected") {
        console.warn("Services data fetch failed:", servicesData.reason);
      }

      // Safely convert dates from nanoseconds to Date objects
      const createdAtValue = profile.createdAt
        ? typeof profile.createdAt === "bigint"
          ? new Date(Number(profile.createdAt) / 1000000)
          : typeof profile.createdAt === "number"
            ? new Date(profile.createdAt / 1000000)
            : new Date()
        : new Date();

      const updatedAtValue = profile.updatedAt
        ? typeof profile.updatedAt === "bigint"
          ? new Date(Number(profile.updatedAt) / 1000000)
          : typeof profile.updatedAt === "number"
            ? new Date(profile.updatedAt / 1000000)
            : new Date()
        : new Date();

      return {
        id: profile.id.toString(),
        name: profile.name,
        phone: profile.phone,
        createdAt: createdAtValue,
        updatedAt: updatedAtValue,
        profilePicture:
          profile.profilePicture &&
          profile.profilePicture.length > 0 &&
          profile.profilePicture[0]
            ? {
                imageUrl: profile.profilePicture[0].imageUrl,
                thumbnailUrl: profile.profilePicture[0].thumbnailUrl,
              }
            : undefined,
        biography:
          profile.biography && profile.biography.length > 0
            ? profile.biography[0]
            : undefined,
        totalEarnings: analyticsData.totalEarnings,
        pendingCommission: 0,
        settledCommission: 0,
        completedJobs: analyticsData.completedJobs,
        averageRating: reviewsData.averageRating,
        totalReviews: reviewsData.totalReviews,
        completionRate: analyticsData.completionRate,
        lastActivity: updatedAtValue,
        reputationScore: reputationData.reputationScore,
        reputationLevel: reputationData.trustLevel,
        reputationRing: Math.min(
          5,
          Math.floor(reputationData.completedBookings / 10) + 1,
        ),
        isLocked: lockStatus,
        walletBalance: walletBalanceData || 0,
        servicesCount: servicesDataResult.offeredServices.length,
      };
    } catch (error) {
      console.error("Error fetching real user data, using defaults:", error);
      // Fallback to default values if real data fails
      // Safely convert dates from nanoseconds to Date objects
      const createdAtValue = profile.createdAt
        ? typeof profile.createdAt === "bigint"
          ? new Date(Number(profile.createdAt) / 1000000)
          : typeof profile.createdAt === "number"
            ? new Date(profile.createdAt / 1000000)
            : new Date()
        : new Date();

      const updatedAtValue = profile.updatedAt
        ? typeof profile.updatedAt === "bigint"
          ? new Date(Number(profile.updatedAt) / 1000000)
          : typeof profile.updatedAt === "number"
            ? new Date(profile.updatedAt / 1000000)
            : new Date()
        : new Date();

      return {
        id: profile.id.toString(),
        name: profile.name,
        phone: profile.phone,
        createdAt: createdAtValue,
        updatedAt: updatedAtValue,
        profilePicture:
          profile.profilePicture &&
          profile.profilePicture.length > 0 &&
          profile.profilePicture[0]
            ? {
                imageUrl: profile.profilePicture[0].imageUrl,
                thumbnailUrl: profile.profilePicture[0].thumbnailUrl,
              }
            : undefined,
        biography:
          profile.biography && profile.biography.length > 0
            ? profile.biography[0]
            : undefined,
        // Default values if real data fails
        totalEarnings: 0,
        pendingCommission: 0,
        settledCommission: 0,
        completedJobs: 0,
        averageRating: 0,
        totalReviews: 0,
        completionRate: 0,
        lastActivity: new Date(Number(profile.updatedAt) / 1000000),
        reputationScore: 50,
        reputationLevel: "New",
        reputationRing: 1,
        isLocked: lockStatus,
        walletBalance: 0,
        servicesCount: 0,
      };
    }
  };

  const handleUpdateCommission = async (newAmount: number) => {
    // Update local balance when refreshed from ProviderStats
    if (user) {
      setUser({ ...user, walletBalance: newAmount });
    }
    setOutstandingCommission(newAmount);
  };

  const handleReputationChange = (newScore: number) => {
    setPendingReputationScore(newScore);
  };

  // Account management functions
  const handleLockConfirmation = () => {
    setShowLockConfirmation(true);
  };

  const handleActivateAccount = async () => {
    if (!user) return;

    try {
      // Call Firebase function to unlock the account
      await adminServiceCanister.lockUserAccount(user.id, false);

      // Update localStorage via useAdmin hook
      updateUserLockStatus(user.id, false);

      // Update local state
      setUser((prev) => (prev ? { ...prev, isLocked: false } : null));

      console.log("Account activated successfully");
      alert("Account activated successfully");
    } catch (error) {
      console.error("Failed to activate account:", error);
      alert("Failed to activate account. Please try again.");
    }
  };

  const confirmLockAccount = async () => {
    if (!user) return;

    // Determine suspension duration in days
    let suspensionDurationDays: number | null;
    if (suspensionDuration === "indefinite") {
      suspensionDurationDays = null;
    } else if (suspensionDuration === "custom") {
      if (customDays <= 0 || !Number.isInteger(customDays)) {
        alert(
          "Please enter a valid number of days (must be a positive integer).",
        );
        return;
      }
      suspensionDurationDays = customDays;
    } else {
      suspensionDurationDays = parseInt(suspensionDuration);
    }

    console.log("Attempting to lock account for user:", user.id);
    console.log(
      "Suspension duration:",
      suspensionDurationDays === null
        ? "indefinite"
        : `${suspensionDurationDays} days`,
    );

    try {
      // Call Firebase function to lock the account with suspension duration
      await adminServiceCanister.lockUserAccount(
        user.id,
        true,
        suspensionDurationDays,
      );

      // Update localStorage via useAdmin hook
      updateUserLockStatus(user.id, true);

      // Update local state
      setUser((prev) => (prev ? { ...prev, isLocked: true } : null));

      console.log("Account locked successfully");
      setShowLockConfirmation(false);
      // Reset suspension duration to default
      setSuspensionDuration("7");
      setCustomDays(7);
      alert("Account locked successfully");
    } catch (error) {
      console.error("Failed to lock account:", error);
      alert("Failed to lock account. Please try again.");
    }
  };

  const handleSaveReputation = () => {
    setShowReputationConfirmation(true);
  };

  const confirmReputationUpdate = async () => {
    if (!user) return;

    try {
      // Call backend to update reputation
      await adminServiceCanister.updateUserReputation(
        user.id,
        pendingReputationScore,
      );

      // Refresh user data to get the updated reputation from backend
      await loadUser();

      console.log(
        "Reputation updated successfully to:",
        pendingReputationScore,
      );
      alert("Reputation updated successfully!");
    } catch (error) {
      console.error("Failed to update reputation:", error);
      alert("Failed to update reputation. Please try again.");
    }

    setShowReputationConfirmation(false);
  };

  // Load user data function
  const loadUser = async () => {
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
        const userData = await convertProfileToUserData(foundProfile);
        setUser(userData);
        setPendingReputationScore(userData.reputationScore);
        setOutstandingCommission(userData.pendingCommission);
      } catch (error) {
        console.error("Error converting user data:", error);
        // Fallback to basic user data
        const basicUserData: UserData = {
          id: foundProfile?.id?.toString() || id || "",
          name: foundProfile?.name || "Unknown User",
          phone: foundProfile?.phone || "",
          createdAt: foundProfile?.createdAt
            ? new Date(Number(foundProfile.createdAt) / 1000000)
            : new Date(),
          updatedAt: foundProfile?.updatedAt
            ? new Date(Number(foundProfile.updatedAt) / 1000000)
            : new Date(),
          profilePicture:
            foundProfile?.profilePicture &&
            foundProfile.profilePicture.length > 0
              ? {
                  imageUrl: foundProfile.profilePicture[0]!.imageUrl,
                  thumbnailUrl: foundProfile.profilePicture[0]!.thumbnailUrl,
                }
              : undefined,
          biography:
            foundProfile?.biography && foundProfile.biography.length > 0
              ? foundProfile.biography[0]
              : undefined,
          totalEarnings: 0,
          pendingCommission: 0,
          settledCommission: 0,
          completedJobs: 0,
          averageRating: 0,
          totalReviews: 0,
          completionRate: 0,
          lastActivity: foundProfile?.updatedAt
            ? new Date(Number(foundProfile.updatedAt) / 1000000)
            : new Date(),
          reputationScore: 50,
          reputationLevel: "New",
          reputationRing: 1,
          isLocked: getUserLockStatus(foundProfile?.id?.toString() || id || ""),
          walletBalance: 0,
          servicesCount: 0,
        };
        setUser(basicUserData);
        setPendingReputationScore(50);
        setOutstandingCommission(0);
      }
    } else {
      setUser(null);
    }

    setLoadingUser(false);
  };

  // Load user data on component mount
  useEffect(() => {
    loadUser();
  }, [id, backendUsers, refreshUsers]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  };

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
              loading={loading.users}
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
            />
          </div>
        </div>
      </main>

      <UserDetailsModals
        showReputationConfirmation={showReputationConfirmation}
        showCommissionConfirmation={showCommissionConfirmation}
        showLockConfirmation={showLockConfirmation}
        pendingReputationScore={pendingReputationScore}
        outstandingCommission={outstandingCommission}
        suspensionDuration={suspensionDuration}
        customDays={customDays}
        onReputationConfirm={confirmReputationUpdate}
        onReputationCancel={() => setShowReputationConfirmation(false)}
        onCommissionCancel={() => setShowCommissionConfirmation(false)}
        onLockConfirm={confirmLockAccount}
        onLockCancel={() => {
          setShowLockConfirmation(false);
          setSuspensionDuration("7");
          setCustomDays(7);
        }}
        onSuspensionDurationChange={setSuspensionDuration}
        onCustomDaysChange={setCustomDays}
      />
    </div>
  );
};
