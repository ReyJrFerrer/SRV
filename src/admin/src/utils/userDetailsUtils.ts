import type { Profile } from "../../../declarations/auth/auth.did.d.ts";
import { adminServiceCanister } from "../services/adminServiceCanister";
import { walletCanisterService } from "../../../frontend/src/services/walletCanisterService";
import {
  convertToDate,
  validateDate,
  extractProfilePicture,
  extractBiography,
} from "./profileUtils";

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

const extractUserData = (
  profile: Profile,
  lockStatus: boolean,
  analyticsData: any,
  reviewsData: any,
  reputationData: any,
  walletBalanceData: number,
  servicesDataResult: any,
): UserData => {
  const createdAt = validateDate(convertToDate(profile.createdAt));
  const updatedAt = validateDate(convertToDate(profile.updatedAt));

  return {
    id: profile.id.toString(),
    name: profile.name,
    phone: profile.phone,
    createdAt,
    updatedAt,
    profilePicture: extractProfilePicture(profile.profilePicture),
    biography: extractBiography(
      Array.isArray(profile.biography)
        ? profile.biography[0]
        : profile.biography,
    ),
    totalEarnings: analyticsData.totalEarnings,
    pendingCommission: 0,
    settledCommission: 0,
    completedJobs: analyticsData.completedJobs,
    averageRating: reviewsData.averageRating,
    totalReviews: reviewsData.totalReviews,
    completionRate: analyticsData.completionRate,
    lastActivity: updatedAt,
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
};

const getDefaultUserData = (
  profile: Profile,
  lockStatus: boolean,
): UserData => {
  const updatedAt = validateDate(convertToDate(profile.updatedAt));
  return {
    id: profile.id.toString(),
    name: profile.name,
    phone: profile.phone,
    createdAt: validateDate(convertToDate(profile.createdAt)),
    updatedAt,
    profilePicture: extractProfilePicture(profile.profilePicture),
    biography: extractBiography(
      Array.isArray(profile.biography)
        ? profile.biography[0]
        : profile.biography,
    ),
    totalEarnings: 0,
    pendingCommission: 0,
    settledCommission: 0,
    completedJobs: 0,
    averageRating: 0,
    totalReviews: 0,
    completionRate: 0,
    lastActivity: updatedAt,
    reputationScore: 50,
    reputationLevel: "New",
    reputationRing: 1,
    isLocked: lockStatus,
    walletBalance: 0,
    servicesCount: 0,
  };
};

export const convertProfileToUserData = async (
  profile: Profile,
  getUserLockStatus: (userId: string) => boolean,
): Promise<UserData> => {
  const lockStatus = getUserLockStatus(profile.id.toString());

  try {
    const [analytics, reviews, reputation, walletBalance, servicesData] =
      await Promise.allSettled([
        adminServiceCanister.getUserAnalytics(profile.id.toString()),
        adminServiceCanister.getUserReviews(profile.id.toString()),
        adminServiceCanister.getUserReputation(profile.id.toString()),
        walletCanisterService.getBalanceOf(profile.id.toString()),
        adminServiceCanister.getUserServicesAndBookings(profile.id.toString()),
      ]);

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
        : { averageRating: 0, totalReviews: 0 };

    const reputationData =
      reputation.status === "fulfilled"
        ? reputation.value
        : { reputationScore: 50, trustLevel: "New", completedBookings: 0 };

    const walletBalanceData =
      walletBalance.status === "fulfilled" ? walletBalance.value : 0;

    const servicesDataResult =
      servicesData.status === "fulfilled"
        ? servicesData.value
        : { offeredServices: [], clientBookings: [], providerBookings: [] };

    [analytics, reviews, reputation, walletBalance, servicesData].forEach(
      (result, index) => {
        if (result.status === "rejected") {
          const labels = [
            "Analytics",
            "Reviews",
            "Reputation",
            "Wallet balance",
            "Services data",
          ];
          console.warn(`${labels[index]} fetch failed:`, result.reason);
        }
      },
    );

    return extractUserData(
      profile,
      lockStatus,
      analyticsData,
      reviewsData,
      reputationData,
      walletBalanceData,
      servicesDataResult,
    );
  } catch (error) {
    return getDefaultUserData(profile, lockStatus);
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
