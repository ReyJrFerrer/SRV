import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../hooks/useAdmin";
import ProviderStats from "../components/ProviderStats";
import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";

// Reputation Score Component
const ReputationScore: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "#2563eb";
    if (value >= 60) return "#60a5fa";
    if (value >= 40) return "#facc15";
    return "#fef08a";
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg className="absolute h-full w-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="text-center">
        <span className="text-5xl font-bold text-gray-800">{score}</span>
      </div>
    </div>
  );
};

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
  const navigate = useNavigate();
  const location = useLocation();
  const {
    loading,
    users: backendUsers,
    refreshUsers,
    getUserLockStatus,
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

      return {
        id: profile.id.toString(),
        name: profile.name,
        phone: profile.phone,
        createdAt: new Date(Number(profile.createdAt) / 1000000),
        updatedAt: new Date(Number(profile.updatedAt) / 1000000),
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
        lastActivity: new Date(Number(profile.updatedAt) / 1000000),
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
      return {
        id: profile.id.toString(),
        name: profile.name,
        phone: profile.phone,
        createdAt: new Date(Number(profile.createdAt) / 1000000),
        updatedAt: new Date(Number(profile.updatedAt) / 1000000),
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

  const handleUpdateCommission = (newAmount: number) => {
    setOutstandingCommission(newAmount);
    setShowCommissionConfirmation(true);
  };

  const handleReputationChange = (newScore: number) => {
    setPendingReputationScore(newScore);
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
    const foundProfile = backendUsers.find((p) => p.id.toString() === id);

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
          id: foundProfile.id.toString(),
          name: foundProfile.name,
          phone: foundProfile.phone,
          createdAt: new Date(Number(foundProfile.createdAt) / 1000000),
          updatedAt: new Date(Number(foundProfile.updatedAt) / 1000000),
          profilePicture:
            foundProfile.profilePicture &&
            foundProfile.profilePicture.length > 0
              ? {
                  imageUrl: foundProfile.profilePicture[0]!.imageUrl,
                  thumbnailUrl: foundProfile.profilePicture[0]!.thumbnailUrl,
                }
              : undefined,
          biography:
            foundProfile.biography && foundProfile.biography.length > 0
              ? foundProfile.biography[0]
              : undefined,
          totalEarnings: 0,
          pendingCommission: 0,
          settledCommission: 0,
          completedJobs: 0,
          averageRating: 0,
          totalReviews: 0,
          completionRate: 0,
          lastActivity: new Date(Number(foundProfile.updatedAt) / 1000000),
          reputationScore: 50,
          reputationLevel: "New",
          reputationRing: 1,
          isLocked: getUserLockStatus(foundProfile.id.toString()),
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
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  {fromTicket && ticketId ? (
                    <Link
                      to={`/ticket/${ticketId}`}
                      className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to Ticket
                    </Link>
                  ) : (
                    <Link
                      to="/users"
                      className="mr-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to Users
                    </Link>
                  )}
                </div>
                <div className="mt-4 flex items-center">
                  <div className="h-16 w-16 flex-shrink-0">
                    {user.profilePicture ? (
                      <img
                        className="h-16 w-16 rounded-full object-cover shadow-lg ring-4 ring-white"
                        src={
                          user.profilePicture.thumbnailUrl ||
                          user.profilePicture.imageUrl
                        }
                        alt={user.name}
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-lg">
                        <span className="text-xl font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-6">
                    <div className="flex items-center space-x-3">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {user.name}
                      </h1>
                      {user.isLocked && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Account Locked
                        </span>
                      )}
                    </div>
                    {user.biography && (
                      <p className="mt-2 max-w-2xl text-sm text-gray-500">
                        {user.biography}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Member since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Last activity</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(user.lastActivity)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <Link
                    to={`/user/${user.id}/services`}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    View Services
                  </Link>
                  <button
                    onClick={() => navigate(`/user/${user.id}/bookings`)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    View Bookings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

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
            {/* Contact Information */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Phone Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 font-mono text-sm text-gray-900">
                    {user.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Registration Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(user.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Services Posted
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.servicesCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    SRV Wallet Balance
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ₱{user.walletBalance.toFixed(2)}
                  </dd>
                </div>
              </div>
            </div>

            {/* Reputation Summary */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reputation Summary
                </h3>
                <button
                  onClick={handleSaveReputation}
                  className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Reputation
                </button>
              </div>
              <div className="flex flex-col items-center space-y-6">
                {/* Circular Reputation Score */}
                <ReputationScore score={pendingReputationScore} />

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() =>
                      handleReputationChange(
                        Math.max(0, pendingReputationScore - 10),
                      )
                    }
                    className="inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                    10
                  </button>

                  <button
                    onClick={() => handleReputationChange(50)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset
                  </button>

                  <button
                    onClick={() =>
                      handleReputationChange(
                        Math.min(100, pendingReputationScore + 10),
                      )
                    }
                    className="inline-flex items-center rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    10
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

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
                onClick={() => setShowReputationConfirmation(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmReputationUpdate}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Update Reputation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Update Confirmation Modal */}
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
                onClick={() => setShowCommissionConfirmation(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              {/* <button
                onClick={confirmCommissionUpdate}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Update Commission
              </button> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
