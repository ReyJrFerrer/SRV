import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";

/**
 * Convert date value to Date object
 */
const convertToDate = (
  value: bigint | string | number | Date | undefined | null,
): Date => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "bigint") {
    // Motoko nanoseconds - convert to milliseconds
    return new Date(Number(value) / 1_000_000);
  }

  if (typeof value === "string") {
    // Firebase ISO string
    return new Date(value);
  }

  if (typeof value === "number") {
    // Timestamp in milliseconds
    return new Date(value);
  }

  return new Date();
};

export interface UserData {
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

/**
 * Convert Profile to UserData format with real data
 * Fetches analytics, reviews, reputation, wallet balance, and services data
 */
export const convertProfileToUserData = async (
  profile: Profile,
  getUserLockStatus: (userId: string) => boolean,
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
        adminServiceCanister.getUserServicesAndBookings(profile.id.toString()),
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

    // Convert dates from Firebase to Date objects
    const createdAt = convertToDate(profile.createdAt);
    const updatedAt = convertToDate(profile.updatedAt);
    const validatedCreatedAt = isNaN(createdAt.getTime())
      ? new Date()
      : createdAt;
    const validatedUpdatedAt = isNaN(updatedAt.getTime())
      ? new Date()
      : updatedAt;

    return {
      id: profile.id.toString(),
      name: profile.name,
      phone: profile.phone,
      createdAt: validatedCreatedAt,
      updatedAt: validatedUpdatedAt,
      profilePicture:
        profile.profilePicture &&
        Array.isArray(profile.profilePicture) &&
        profile.profilePicture.length > 0 &&
        profile.profilePicture[0]?.imageUrl
          ? {
              imageUrl: profile.profilePicture[0].imageUrl,
              thumbnailUrl:
                profile.profilePicture[0].thumbnailUrl ||
                profile.profilePicture[0].imageUrl,
            }
          : undefined,
      biography:
        profile.biography && typeof profile.biography === "string"
          ? profile.biography
          : undefined,
      totalEarnings: analyticsData.totalEarnings,
      pendingCommission: 0,
      settledCommission: 0,
      completedJobs: analyticsData.completedJobs,
      averageRating: reviewsData.averageRating,
      totalReviews: reviewsData.totalReviews,
      completionRate: analyticsData.completionRate,
      lastActivity: validatedUpdatedAt,
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
    const createdAt = convertToDate(profile.createdAt);
    const updatedAt = convertToDate(profile.updatedAt);
    const validatedCreatedAt = isNaN(createdAt.getTime())
      ? new Date()
      : createdAt;
    const validatedUpdatedAt = isNaN(updatedAt.getTime())
      ? new Date()
      : updatedAt;

    return {
      id: profile.id.toString(),
      name: profile.name,
      phone: profile.phone,
      createdAt: validatedCreatedAt,
      updatedAt: validatedUpdatedAt,
      profilePicture:
        profile.profilePicture &&
        Array.isArray(profile.profilePicture) &&
        profile.profilePicture.length > 0 &&
        profile.profilePicture[0]?.imageUrl
          ? {
              imageUrl: profile.profilePicture[0].imageUrl,
              thumbnailUrl:
                profile.profilePicture[0].thumbnailUrl ||
                profile.profilePicture[0].imageUrl,
            }
          : undefined,
      biography:
        profile.biography && typeof profile.biography === "string"
          ? profile.biography
          : undefined,
      // Default values if real data fails
      totalEarnings: 0,
      pendingCommission: 0,
      settledCommission: 0,
      completedJobs: 0,
      averageRating: 0,
      totalReviews: 0,
      completionRate: 0,
      lastActivity: validatedUpdatedAt,
      reputationScore: 50,
      reputationLevel: "New",
      reputationRing: 1,
      isLocked: lockStatus,
      walletBalance: 0,
      servicesCount: 0,
    };
  }
};

/**
 * Format date for display
 */
export const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};
