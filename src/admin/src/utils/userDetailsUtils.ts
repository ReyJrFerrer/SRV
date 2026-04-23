import type { Profile } from "../../declarations/auth/auth.did.d.ts";
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
  const createdAt = validateDate(
    convertToDate(Number(profile.createdAt) as bigint | number | undefined),
  );
  const updatedAt = validateDate(
    convertToDate(Number(profile.updatedAt) as bigint | number | undefined),
  );

  return {
    id: String(profile.id),
    name: String(profile.name ?? ""),
    phone: String(profile.phone ?? ""),
    createdAt,
    updatedAt,
    profilePicture: extractProfilePicture(String(profile.profilePicture ?? "")),
    biography: extractBiography(String(profile.biography ?? "")),
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
  const updatedAt = validateDate(
    convertToDate(Number(profile.updatedAt) as bigint | number | undefined),
  );
  return {
    id: String(profile.id),
    name: String(profile.name ?? ""),
    phone: String(profile.phone ?? ""),
    createdAt: validateDate(
      convertToDate(Number(profile.createdAt) as bigint | number | undefined),
    ),
    updatedAt,
    profilePicture: extractProfilePicture(String(profile.profilePicture ?? "")),
    biography: extractBiography(String(profile.biography ?? "")),
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
  const lockStatus = getUserLockStatus(String(profile.id));

  try {
    const [analytics, reviews, reputation, walletBalance, servicesData] =
      await Promise.allSettled([
        adminServiceCanister.getUserAnalytics(String(profile.id)),
        adminServiceCanister.getUserReviews(String(profile.id)),
        adminServiceCanister.getUserReputation(String(profile.id)),
        walletCanisterService.getBalanceOf(String(profile.id)),
        adminServiceCanister.getUserServicesAndBookings(String(profile.id)),
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
