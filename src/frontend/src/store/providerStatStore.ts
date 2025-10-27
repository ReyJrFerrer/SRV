import { create } from "zustand";
import { Principal } from "@dfinity/principal";
import {
  Booking,
  bookingCanisterService,
} from "../services/bookingCanisterService";
import {
  Review,
  reviewCanisterService,
} from "../services/reviewCanisterService";
import {
  FrontendProfile,
  authCanisterService,
} from "../services/authCanisterService";
import walletCanisterService from "../services/walletCanisterService";

// Analytics interfaces
export interface ProviderBookingAnalytics {
  totalBookings: number;
  pendingRequests: number;
  acceptedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;
  totalRevenue: number;
  expectedRevenue: number;
  averageBookingValue: number;
  acceptanceRate: number;
  completionRate: number;
  averageResponseTime: number;
  customerSatisfactionScore?: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
}

export interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recentReviews: number;
  topRatedCount: number;
  qualityScore: number;
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  averageRatingThisMonth: number;
  visibleReviews: number;
  hiddenReviews: number;
  flaggedReviews: number;
}

// Wallet data interface
export interface WalletData {
  balance: number;
  heldBalance: number;
  availableBalance: number;
}

interface ProviderStatState {
  // Data
  bookings: Booking[];
  reviews: Review[];
  providerProfile: FrontendProfile | null;
  bookingAnalytics: ProviderBookingAnalytics | null;
  reviewAnalytics: ReviewAnalytics | null;
  walletData: WalletData | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  lastFetchTime: number | null;

  // Error state
  error: string | null;

  // Actions
  fetchProviderStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  fetchWalletBalance: () => Promise<void>;
  clearStats: () => void;
  setError: (error: string | null) => void;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Helper function to calculate booking analytics
const calculateBookingAnalytics = (
  bookings: Booking[],
): ProviderBookingAnalytics => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalBookings = bookings.length;
  const pendingRequests = bookings.filter(
    (b) => b.status === "Requested",
  ).length;
  const acceptedBookings = bookings.filter((b) => b.status === "Accepted").length;
  const completedBookings = bookings.filter(
    (b) => b.status === "Completed",
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => b.status === "Cancelled",
  ).length;
  const disputedBookings = bookings.filter((b) => b.status === "Disputed").length;

  const totalRevenue = bookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const expectedRevenue = bookings
    .filter((b) => b.status === "Accepted" || b.status === "InProgress")
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const averageBookingValue =
    completedBookings > 0 ? totalRevenue / completedBookings : 0;

  const acceptanceRate =
    totalBookings > 0 ? (acceptedBookings / totalBookings) * 100 : 0;

  const completionRate =
    acceptedBookings > 0 ? (completedBookings / acceptedBookings) * 100 : 0;

  const bookingsThisWeek = bookings.filter((b) => {
    const createdDate = new Date(b.createdAt);
    return createdDate >= weekStart;
  }).length;

  const bookingsThisMonth = bookings.filter((b) => {
    const createdDate = new Date(b.createdAt);
    return createdDate >= monthStart;
  }).length;

  const revenueThisWeek = bookings
    .filter((b) => {
      const createdDate = new Date(b.createdAt);
      return createdDate >= weekStart && b.status === "Completed";
    })
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const revenueThisMonth = bookings
    .filter((b) => {
      const createdDate = new Date(b.createdAt);
      return createdDate >= monthStart && b.status === "Completed";
    })
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return {
    totalBookings,
    pendingRequests,
    acceptedBookings,
    completedBookings,
    cancelledBookings,
    disputedBookings,
    totalRevenue,
    expectedRevenue,
    averageBookingValue,
    acceptanceRate,
    completionRate,
    averageResponseTime: 0, // This would need historical data
    bookingsThisWeek,
    bookingsThisMonth,
    revenueThisWeek,
    revenueThisMonth,
  };
};

// Helper function to calculate review analytics
const calculateReviewAnalytics = (reviews: Review[]): ReviewAnalytics => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  const ratingDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingDistribution[review.rating]++;
    }
  });

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentReviews = reviews.filter(
    (r) => new Date(r.createdAt) >= sevenDaysAgo,
  ).length;

  const topRatedCount = reviews.filter((r) => r.rating >= 4).length;

  const qualityScore =
    totalReviews > 0
      ? Math.round(
          ((averageRating / 5) * 0.6 + (topRatedCount / totalReviews) * 0.4) *
            100,
        )
      : 0;

  const reviewsThisWeek = reviews.filter(
    (r) => new Date(r.createdAt) >= weekStart,
  ).length;

  const reviewsThisMonth = reviews.filter(
    (r) => new Date(r.createdAt) >= monthStart,
  ).length;

  const monthlyReviews = reviews.filter(
    (r) => new Date(r.createdAt) >= monthStart,
  );
  const averageRatingThisMonth =
    monthlyReviews.length > 0
      ? monthlyReviews.reduce((sum, r) => sum + r.rating, 0) /
        monthlyReviews.length
      : 0;

  const visibleReviews = reviews.filter((r) => r.status === "Visible").length;
  const hiddenReviews = reviews.filter((r) => r.status === "Hidden").length;
  const flaggedReviews = reviews.filter((r) => r.status === "Flagged").length;

  return {
    totalReviews,
    averageRating,
    ratingDistribution,
    recentReviews,
    topRatedCount,
    qualityScore,
    reviewsThisWeek,
    reviewsThisMonth,
    averageRatingThisMonth,
    visibleReviews,
    hiddenReviews,
    flaggedReviews,
  };
};

export const useProviderStatStore = create<ProviderStatState>((set, get) => ({
  // Initial state
  bookings: [],
  reviews: [],
  providerProfile: null,
  bookingAnalytics: null,
  reviewAnalytics: null,
  walletData: null,
  isLoading: false,
  isInitialized: false,
  lastFetchTime: null,
  error: null,

  // Fetch wallet balance
  fetchWalletBalance: async () => {
    const state = get();
    
    if (!state.providerProfile) {
      console.log("No provider profile found, skipping wallet fetch");
      return;
    }

    try {
      const walletDetails = await walletCanisterService.getWalletDetails(
        state.providerProfile.id,
      );

      set({
        walletData: {
          balance: walletDetails.balance,
          heldBalance: walletDetails.heldBalance,
          availableBalance: walletDetails.availableBalance,
        },
      });

      console.log("Wallet balance fetched successfully");
    } catch (error: any) {
      console.error("Error fetching wallet balance:", error);
      // Don't set error state for wallet fetch failures, just log it
    }
  },

  // Fetch provider stats (with caching)
  fetchProviderStats: async () => {
    const state = get();

    // Check if we have cached data that's still valid
    if (
      state.isInitialized &&
      state.lastFetchTime &&
      Date.now() - state.lastFetchTime < CACHE_DURATION
    ) {
      console.log("Using cached provider stats data");
      return;
    }

    // Prevent multiple simultaneous fetches
    if (state.isLoading) {
      console.log("Fetch already in progress, skipping...");
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Get provider profile first
      const profile = await authCanisterService.getMyProfile();

      if (!profile || profile.role !== "ServiceProvider") {
        throw new Error("User is not a service provider");
      }

      const providerId = profile.id;
      const providerPrincipal = Principal.fromText(providerId);

      // Fetch bookings, reviews, and wallet data in parallel
      const [bookings, reviews, walletDetails] = await Promise.all([
        bookingCanisterService.getProviderBookings(providerPrincipal),
        reviewCanisterService.getProviderReviews(providerId),
        walletCanisterService.getWalletDetails(providerId).catch((err) => {
          console.error("Failed to fetch wallet details:", err);
          return { balance: 0, heldBalance: 0, availableBalance: 0 };
        }),
      ]);

      // Calculate analytics
      const bookingAnalytics = calculateBookingAnalytics(bookings);
      const reviewAnalytics = calculateReviewAnalytics(reviews);

      set({
        bookings,
        reviews,
        providerProfile: profile,
        bookingAnalytics,
        reviewAnalytics,
        walletData: {
          balance: walletDetails.balance,
          heldBalance: walletDetails.heldBalance,
          availableBalance: walletDetails.availableBalance,
        },
        isLoading: false,
        isInitialized: true,
        lastFetchTime: Date.now(),
        error: null,
      });

      console.log("Provider stats fetched successfully");
    } catch (error: any) {
      console.error("Error fetching provider stats:", error);
      set({
        error: error?.message || "Failed to fetch provider stats",
        isLoading: false,
      });
    }
  },

  // Force refresh (bypass cache)
  refreshStats: async () => {
    set({ lastFetchTime: null });
    await get().fetchProviderStats();
  },

  // Clear stats
  clearStats: () => {
    set({
      bookings: [],
      reviews: [],
      providerProfile: null,
      bookingAnalytics: null,
      reviewAnalytics: null,
      walletData: null,
      isLoading: false,
      isInitialized: false,
      lastFetchTime: null,
      error: null,
    });
  },

  // Set error
  setError: (error: string | null) => {
    set({ error });
  },
}));

// Helper functions for chart data (exported separately to avoid hook dependencies)
export const getMonthlyRevenue = (bookings: Booking[]): { name: string; value: number }[] => {
  const monthlyData: Record<string, number> = {};
  const now = new Date();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    monthlyData[monthKey] = 0;
  }

  // Aggregate revenue by month
  bookings
    .filter((b) => b.status === "Completed")
    .forEach((booking) => {
      const bookingDate = new Date(booking.createdAt);
      const monthKey = bookingDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += booking.price || 0;
      }
    });

  return Object.entries(monthlyData).map(([name, value]) => ({ name, value }));
};

export const getBookingCountByDay = (bookings: Booking[]): { name: string; value: number }[] => {
  const dailyData: Record<string, number> = {};
  const now = new Date();
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dayKey = date.toLocaleDateString("en-US", { weekday: "short" });
    dailyData[dayKey] = 0;
  }

  // Aggregate bookings by day
  bookings.forEach((booking) => {
    const bookingDate = new Date(booking.createdAt);
    const daysDiff = Math.floor((now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 0 && daysDiff < 7) {
      const dayKey = bookingDate.toLocaleDateString("en-US", { weekday: "short" });
      if (dailyData.hasOwnProperty(dayKey)) {
        dailyData[dayKey]++;
      }
    }
  });

  return Object.entries(dailyData).map(([name, value]) => ({ name, value }));
};
