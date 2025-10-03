import { useState, useEffect, useCallback, useMemo } from "react";
import {
  reviewCanisterService,
  Review,
  ReviewStatistics,
} from "../services/reviewCanisterService";
import {
  FrontendProfile,
  authCanisterService,
} from "../services/authCanisterService";

// Enhanced Review interface with profile data enrichment
export interface EnhancedReview extends Review {
  // Profile data enrichment
  clientProfile?: FrontendProfile;
  providerProfile?: FrontendProfile;
  clientName?: string;
  providerName?: string;
  clientAvatar?: string;
  providerAvatar?: string;

  // Computed fields
  isOwner?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  formattedDate?: string;
  relativeTime?: string;

  // Data loading status
  isProfileDataLoaded?: boolean;

  // Reputation score enrichment
  clientReputationScore?: number;
  clientReputationLevel?: string;
}

// Review analytics interface
export interface ReviewAnalytics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recentReviews: number;
  topRatedCount: number;
  qualityScore: number;

  // Timeframe analytics
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  averageRatingThisMonth: number;

  // Status breakdown
  visibleReviews: number;
  hiddenReviews: number;
  flaggedReviews: number;
}

// Loading states for operations
interface LoadingStates {
  reviews: boolean;
  profiles: boolean;
  statistics: boolean;
  analytics: boolean;
  operations: Map<string, boolean>;
}

export interface UseReviewManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableProfileCaching?: boolean;
  autoLoadUserReviews?: boolean; // ✅ Add this new option
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ReviewFilters {
  status?: "Visible" | "Hidden" | "Flagged";
  rating?: number;
  providerId?: string;
  serviceId?: string;
  clientId?: string;
  bookingId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UseReviewManagementReturn {
  // Data states
  reviews: EnhancedReview[];
  userProfile: FrontendProfile | null;
  profileCache: Map<string, FrontendProfile>;
  statistics: ReviewStatistics | null;
  analytics: ReviewAnalytics | null;

  // Loading states
  loading: boolean;
  loadingProfiles: boolean;
  loadingAnalytics: boolean;
  refreshing: boolean;

  // Error state
  error: string | null;

  // Core review management
  loadUserReviews: () => Promise<void>;
  refreshReviews: () => Promise<void>;
  submitReview: (
    bookingId: string,
    formData: ReviewFormData,
  ) => Promise<Review | null>;
  updateReview: (
    reviewId: string,
    formData: ReviewFormData,
  ) => Promise<Review | null>;
  deleteReview: (reviewId: string) => Promise<boolean>;

  // Review lookup functions
  getReview: (reviewId: string) => Promise<Review | null>;
  getBookingReviews: (bookingId: string) => Promise<Review[]>;
  getUserReviews: (userId?: string) => Promise<Review[]>;
  getProviderReviews: (providerId?: string) => Promise<Review[]>;
  getServiceReviews: (serviceId: string) => Promise<Review[]>;
  getRecentReviews: (limit?: number) => Promise<Review[]>;
  getTopRatedReviews: (limit?: number) => Promise<Review[]>;

  // Review analysis functions
  calculateProviderRating: (providerId?: string) => Promise<number | null>;
  calculateServiceRating: (serviceId: string) => Promise<number | null>;
  canUserReviewBooking: (bookingId: string) => Promise<boolean>;

  // Data filtering and utilities
  filterReviews: (filters: ReviewFilters) => EnhancedReview[];
  getAverageRating: (reviews: Review[]) => number;
  getRatingDistribution: (reviews: Review[]) => Record<number, number>;
  calculateAnalytics: () => ReviewAnalytics;

  // Utility functions
  formatReviewDate: (timestamp: number) => string;
  getRelativeTime: (timestamp: number) => string;
  getStatusColor: (status: "Visible" | "Hidden" | "Flagged") => string;
  enrichReviewWithProfileData: (review: Review) => Promise<EnhancedReview>;

  // State management
  getCurrentUserId: () => string | null;
  isUserAuthenticated: () => boolean;
  clearError: () => void;
  resetState: () => void;
  isOperationInProgress: (operation: string) => boolean;
  retryOperation: (operation: string) => Promise<void>;
}

export const useReviewManagement = (
  options: UseReviewManagementOptions = {},
): UseReviewManagementReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    enableProfileCaching = true,
    autoLoadUserReviews = true, // ✅ Default to true for backward compatibility
  } = options;

  // Core state management
  const [reviews, setReviews] = useState<EnhancedReview[]>([]);
  const [userProfile, setUserProfile] = useState<FrontendProfile | null>(null);
  const [profileCache, setProfileCache] = useState<
    Map<string, FrontendProfile>
  >(new Map());
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);

  // Loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    reviews: false,
    profiles: false,
    statistics: false,
    analytics: false,
    operations: new Map(),
  });

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed loading states
  const loading = useMemo(
    () => loadingStates.reviews || loadingStates.statistics,
    [loadingStates.reviews, loadingStates.statistics],
  );

  const loadingProfiles = useMemo(
    () => loadingStates.profiles,
    [loadingStates.profiles],
  );

  const loadingAnalytics = useMemo(
    () => loadingStates.analytics,
    [loadingStates.analytics],
  );

  // Authentication functions
  const getCurrentUserId = useCallback((): string | null => {
    try {
      return userProfile?.id || null;
    } catch {
      return null;
    }
  }, [userProfile]);

  const isUserAuthenticated = useCallback((): boolean => {
    return userProfile !== null;
  }, [userProfile]);

  // Error handling functions
  const handleReviewError = useCallback((error: any, operation: string) => {
    //console.error(`Error in ${operation}:`, error);
    const errorMessage = error?.message || `Failed to ${operation}`;
    setError(errorMessage);
  }, []);

  const handleAuthError = useCallback(() => {
    setError("Authentication required. Please login to continue.");
    setUserProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Loading state management
  const setLoadingState = useCallback((operation: string, loading: boolean) => {
    setLoadingStates((prev) => {
      const newOperations = new Map(prev.operations);
      if (loading) {
        newOperations.set(operation, true);
      } else {
        newOperations.delete(operation);
      }

      return {
        ...prev,
        operations: newOperations,
        [operation]: loading,
      };
    });
  }, []);

  const isOperationInProgress = useCallback(
    (operation: string): boolean => {
      return loadingStates.operations.get(operation) || false;
    },
    [loadingStates.operations],
  );

  // Profile caching functions
  const cacheProfile = useCallback(
    (userId: string, profile: FrontendProfile) => {
      if (enableProfileCaching) {
        setProfileCache((prev) => new Map(prev.set(userId, profile)));
      }
    },
    [enableProfileCaching],
  );

  const getCachedProfile = useCallback(
    (userId: string): FrontendProfile | null => {
      return enableProfileCaching ? profileCache.get(userId) || null : null;
    },
    [profileCache, enableProfileCaching],
  );

  // Enhanced profile loading
  const loadProfile = useCallback(
    async (userId: string): Promise<FrontendProfile | null> => {
      try {
        // Check cache first
        const cached = getCachedProfile(userId);
        if (cached) {
          return cached;
        }

        setLoadingState("profiles", true);

        const profile = await authCanisterService.getProfile(userId);

        if (profile) {
          cacheProfile(userId, profile);
          return profile;
        } else {
          return null;
        }
      } catch (error) {
        //console.error(`❌ Error loading profile for ${userId}:`, error);
        return null;
      } finally {
        setLoadingState("profiles", false);
      }
    },
    [getCachedProfile, setLoadingState, cacheProfile],
  );

  // Date and time formatting utilities
  const formatReviewDate = useCallback((timestamp: number): string => {
    if (!timestamp) return "Unknown date";

    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const getRelativeTime = useCallback((timestamp: number): string => {
    if (!timestamp) return "Unknown time";

    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMinutes > 0)
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;

    return "Just now";
  }, []);

  const getStatusColor = useCallback(
    (status: "Visible" | "Hidden" | "Flagged"): string => {
      switch (status) {
        case "Visible":
          return "bg-green-100 text-green-800 border-green-200";
        case "Hidden":
          return "bg-gray-100 text-gray-800 border-gray-200";
        case "Flagged":
          return "bg-red-100 text-red-800 border-red-200";
        default:
          return "bg-gray-100 text-gray-800 border-gray-200";
      }
    },
    [],
  );

  // Enhanced review enrichment with profile data
  const enrichReviewWithProfileData = useCallback(
    async (review: Review): Promise<EnhancedReview> => {
      try {
        // Load client and provider profiles in parallel
        const [clientProfile, providerProfile] = await Promise.all([
          loadProfile(review.clientId.toString()),
          loadProfile(review.providerId.toString()),
        ]);

        // Fetch client reputation score
        let clientReputationScore: number | undefined = undefined;
        let clientReputationLevel: string | undefined = undefined;
        try {
          const reputationCanisterService = (
            await import("../services/reputationCanisterService")
          ).default;
          const reputationData =
            await reputationCanisterService.getReputationScore(
              review.clientId.toString(),
            );
          if (reputationData) {
            clientReputationScore = Math.round(
              Number(reputationData.trustScore),
            );
            if (reputationData.trustLevel.hasOwnProperty("New"))
              clientReputationLevel = "New";
            else if (reputationData.trustLevel.hasOwnProperty("Low"))
              clientReputationLevel = "Low";
            else if (reputationData.trustLevel.hasOwnProperty("Medium"))
              clientReputationLevel = "Medium";
            else if (reputationData.trustLevel.hasOwnProperty("High"))
              clientReputationLevel = "High";
            else clientReputationLevel = "VeryHigh";
          }
        } catch (err) {
          // Fallback: leave undefined
        }

        // Calculate user permissions
        const currentUserId = getCurrentUserId();
        const isOwner = currentUserId === review.clientId.toString();
        const canEdit = isOwner && review.status === "Visible";
        const canDelete = isOwner;

        // Always provide a valid clientAvatar URL or fallback
        let clientAvatar = undefined;
        if (
          clientProfile?.profilePicture?.imageUrl &&
          clientProfile.profilePicture.imageUrl !== ""
        ) {
          clientAvatar = clientProfile.profilePicture.imageUrl;
        } else {
          clientAvatar = "/default-client.svg";
        }

        const enhancedReview: EnhancedReview = {
          ...review,
          clientProfile: clientProfile || undefined,
          providerProfile: providerProfile || undefined,
          clientName: clientProfile?.name || "Anonymous User",
          providerName: providerProfile?.name || "Unknown Provider",
          clientAvatar,
          clientReputationScore,
          clientReputationLevel,
          isOwner,
          canEdit,
          canDelete,
          formattedDate: formatReviewDate(review.createdAt),
          relativeTime: getRelativeTime(review.createdAt),
          isProfileDataLoaded: true,
        };

        return enhancedReview;
      } catch (error) {
        //console.error(`❌ Error enriching review ${review.id}:`, error);

        // Return review with minimal enhancement
        return {
          ...review,
          clientName: "Anonymous User",
          providerName: "Unknown Provider",
          clientAvatar: "/default-client.svg",
          formattedDate: formatReviewDate(review.createdAt),
          relativeTime: getRelativeTime(review.createdAt),
          isProfileDataLoaded: false,
        };
      }
    },
    [loadProfile, getCurrentUserId, formatReviewDate, getRelativeTime],
  );

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      setLoadingState("profiles", true);
      clearError();

      const profile = await authCanisterService.getMyProfile();
      setUserProfile(profile);
    } catch (error) {
      handleReviewError(error, "load user profile");
      handleAuthError();
    } finally {
      setLoadingState("profiles", false);
    }
  }, [setLoadingState, clearError, handleReviewError, handleAuthError]);

  // Load user reviews
  const loadUserReviews = useCallback(async () => {
    if (!isUserAuthenticated()) {
      handleAuthError();
      return;
    }

    try {
      setLoadingState("reviews", true);
      clearError();

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        throw new Error("No authenticated user found");
      }
      const rawReviews =
        await reviewCanisterService.getUserReviews(currentUserId);

      // Enrich reviews with profile data in parallel
      const enrichedReviews = await Promise.all(
        rawReviews.map((review) => enrichReviewWithProfileData(review)),
      );

      setReviews(enrichedReviews);
    } catch (error) {
      handleReviewError(error, "load user reviews");
    } finally {
      setLoadingState("reviews", false);
    }
  }, [
    isUserAuthenticated,
    handleAuthError,
    setLoadingState,
    clearError,
    getCurrentUserId,
    handleReviewError,
    enrichReviewWithProfileData,
  ]);

  // Refresh reviews
  const refreshReviews = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear profile cache to ensure fresh data
      setProfileCache(new Map());
      await loadUserReviews();
    } finally {
      setRefreshing(false);
    }
  }, [loadUserReviews]);

  // Submit a new review
  const submitReview = useCallback(
    async (
      bookingId: string,
      formData: ReviewFormData,
    ): Promise<Review | null> => {
      if (!isUserAuthenticated()) {
        setError("You must be logged in to submit a review");
        return null;
      }

      try {
        setLoadingState(`submit-${bookingId}`, true);
        clearError();

        const newReview = await reviewCanisterService.submitReview(
          bookingId,
          formData.rating,
          formData.comment,
        );

        if (newReview) {
          const enrichedReview = await enrichReviewWithProfileData(newReview);
          setReviews((prev) => [enrichedReview, ...prev]);
        }

        return newReview;
      } catch (error) {
        handleReviewError(error, `submit review for booking ${bookingId}`);
        return null;
      } finally {
        setLoadingState(`submit-${bookingId}`, false);
      }
    },
    [
      isUserAuthenticated,
      setLoadingState,
      clearError,
      handleReviewError,
      enrichReviewWithProfileData,
    ],
  );

  // Update an existing review
  const updateReview = useCallback(
    async (
      reviewId: string,
      formData: ReviewFormData,
    ): Promise<Review | null> => {
      try {
        setLoadingState(`update-${reviewId}`, true);
        clearError();

        const updatedReview = await reviewCanisterService.updateReview(
          reviewId,
          formData.rating,
          formData.comment,
        );

        if (updatedReview) {
          const enrichedReview =
            await enrichReviewWithProfileData(updatedReview);
          setReviews((prev) =>
            prev.map((review) =>
              review.id === reviewId ? enrichedReview : review,
            ),
          );
        }

        return updatedReview;
      } catch (error) {
        handleReviewError(error, `update review ${reviewId}`);
        return null;
      } finally {
        setLoadingState(`update-${reviewId}`, false);
      }
    },
    [
      setLoadingState,
      clearError,
      handleReviewError,
      enrichReviewWithProfileData,
    ],
  );

  // Delete a review
  const deleteReview = useCallback(
    async (reviewId: string): Promise<boolean> => {
      try {
        setLoadingState(`delete-${reviewId}`, true);
        clearError();

        await reviewCanisterService.deleteReview(reviewId);

        // Update local state (mark as hidden rather than removing)
        setReviews((prev) =>
          prev.map((review) =>
            review.id === reviewId
              ? { ...review, status: "Hidden" as const }
              : review,
          ),
        );

        return true;
      } catch (error) {
        handleReviewError(error, `delete review ${reviewId}`);
        return false;
      } finally {
        setLoadingState(`delete-${reviewId}`, false);
      }
    },
    [setLoadingState, clearError, handleReviewError],
  );

  // Review lookup functions
  const getReview = useCallback(
    async (reviewId: string): Promise<Review | null> => {
      try {
        return await reviewCanisterService.getReview(reviewId);
      } catch (error) {
        handleReviewError(error, `get review ${reviewId}`);
        return null;
      }
    },
    [handleReviewError],
  );

  const getBookingReviews = useCallback(
    async (bookingId: string): Promise<Review[]> => {
      try {
        return await reviewCanisterService.getBookingReviews(bookingId);
      } catch (error) {
        handleReviewError(error, `get booking reviews for ${bookingId}`);
        return [];
      }
    },
    [handleReviewError],
  );

  const getUserReviews = useCallback(
    async (userId?: string): Promise<Review[]> => {
      const targetUserId = userId || getCurrentUserId();
      if (!targetUserId) return [];

      try {
        setLoadingState("reviews", true);
        const userReviews =
          await reviewCanisterService.getUserReviews(targetUserId);

        // Enrich with profile data if loading for current user
        if (!userId || userId === getCurrentUserId()) {
          const enrichedReviews = await Promise.all(
            userReviews.map((review) => enrichReviewWithProfileData(review)),
          );
          setReviews(enrichedReviews);
        }

        return userReviews;
      } catch (error) {
        handleReviewError(error, `get user reviews for ${targetUserId}`);
        return [];
      } finally {
        setLoadingState("reviews", false);
      }
    },
    [
      getCurrentUserId,
      setLoadingState,
      handleReviewError,
      enrichReviewWithProfileData,
    ],
  );

  const getProviderReviews = useCallback(
    async (providerId?: string): Promise<Review[]> => {
      const targetProviderId = providerId || getCurrentUserId();
      if (!targetProviderId) return [];

      try {
        setLoadingState("reviews", true);
        const providerReviews =
          await reviewCanisterService.getProviderReviews(targetProviderId);

        // Enrich with profile data if loading for current user
        if (!providerId || providerId === getCurrentUserId()) {
          const enrichedReviews = await Promise.all(
            providerReviews.map((review) =>
              enrichReviewWithProfileData(review),
            ),
          );
          setReviews(enrichedReviews);
        }

        return providerReviews;
      } catch (error) {
        handleReviewError(
          error,
          `get provider reviews for ${targetProviderId}`,
        );
        return [];
      } finally {
        setLoadingState("reviews", false);
      }
    },
    [
      getCurrentUserId,
      setLoadingState,
      handleReviewError,
      enrichReviewWithProfileData,
    ],
  );

  const getServiceReviews = useCallback(
    async (serviceId: string): Promise<Review[]> => {
      try {
        setLoadingState("reviews", true);
        const serviceReviews =
          await reviewCanisterService.getServiceReviews(serviceId);

        // Enrich with profile data
        const enrichedReviews = await Promise.all(
          serviceReviews.map((review) => enrichReviewWithProfileData(review)),
        );
        setReviews(enrichedReviews);

        return serviceReviews;
      } catch (error) {
        handleReviewError(error, `get service reviews for ${serviceId}`);
        return [];
      } finally {
        setLoadingState("reviews", false);
      }
    },
    [setLoadingState, handleReviewError, enrichReviewWithProfileData],
  );

  const getRecentReviews = useCallback(
    async (limit: number = 10): Promise<Review[]> => {
      try {
        setLoadingState("reviews", true);
        const recentReviews =
          await reviewCanisterService.getRecentReviews(limit);

        // Enrich with profile data
        const enrichedReviews = await Promise.all(
          recentReviews.map((review) => enrichReviewWithProfileData(review)),
        );
        setReviews(enrichedReviews);

        return recentReviews;
      } catch (error) {
        handleReviewError(error, "get recent reviews");
        return [];
      } finally {
        setLoadingState("reviews", false);
      }
    },
    [setLoadingState, handleReviewError, enrichReviewWithProfileData],
  );

  const getTopRatedReviews = useCallback(
    async (limit: number = 10): Promise<Review[]> => {
      try {
        setLoadingState("reviews", true);
        const topReviews =
          await reviewCanisterService.getTopRatedReviews(limit);

        // Enrich with profile data
        const enrichedReviews = await Promise.all(
          topReviews.map((review) => enrichReviewWithProfileData(review)),
        );
        setReviews(enrichedReviews);

        return topReviews;
      } catch (error) {
        handleReviewError(error, "get top rated reviews");
        return [];
      } finally {
        setLoadingState("reviews", false);
      }
    },
    [setLoadingState, handleReviewError, enrichReviewWithProfileData],
  );

  // Review analysis functions
  const calculateProviderRating = useCallback(
    async (providerId?: string): Promise<number | null> => {
      const targetProviderId = providerId || getCurrentUserId();
      if (!targetProviderId) return null;

      try {
        return await reviewCanisterService.calculateProviderRating(
          targetProviderId,
        );
      } catch (error) {
        handleReviewError(
          error,
          `calculate provider rating for ${targetProviderId}`,
        );
        return null;
      }
    },
    [getCurrentUserId, handleReviewError],
  );

  const calculateServiceRating = useCallback(
    async (serviceId: string): Promise<number | null> => {
      try {
        return await reviewCanisterService.calculateServiceRating(serviceId);
      } catch (error) {
        handleReviewError(error, `calculate service rating for ${serviceId}`);
        return null;
      }
    },
    [handleReviewError],
  );

  const canUserReviewBooking = useCallback(
    async (bookingId: string): Promise<boolean> => {
      const userId = getCurrentUserId();
      if (!userId) return false;

      try {
        return await reviewCanisterService.canUserReviewBooking(
          bookingId,
          userId,
        );
      } catch (error) {
        handleReviewError(
          error,
          `check review eligibility for booking ${bookingId}`,
        );
        return false;
      }
    },
    [getCurrentUserId, handleReviewError],
  );

  // Data filtering and utilities
  const filterReviews = useCallback(
    (filters: ReviewFilters): EnhancedReview[] => {
      return reviews.filter((review) => {
        if (filters.status && review.status !== filters.status) return false;
        if (filters.rating && review.rating !== filters.rating) return false;
        if (filters.providerId && review.providerId !== filters.providerId)
          return false;
        if (filters.serviceId && review.serviceId !== filters.serviceId)
          return false;
        if (filters.clientId && review.clientId !== filters.clientId)
          return false;
        if (filters.bookingId && review.bookingId !== filters.bookingId)
          return false;
        if (filters.dateFrom && review.createdAt < filters.dateFrom.getTime())
          return false;
        if (filters.dateTo && review.createdAt > filters.dateTo.getTime())
          return false;

        return true;
      });
    },
    [reviews],
  );

  const getAverageRating = useCallback((reviewList: Review[]): number => {
    if (reviewList.length === 0) return 0;
    const sum = reviewList.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviewList.length).toFixed(1));
  }, []);

  const getRatingDistribution = useCallback(
    (reviewList: Review[]): Record<number, number> => {
      const distribution: Record<number, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      reviewList.forEach((review) => {
        if (review.rating >= 1 && review.rating <= 5) {
          distribution[review.rating]++;
        }
      });

      return distribution;
    },
    [],
  );

  // Calculate analytics
  const calculateAnalytics = useCallback((): ReviewAnalytics => {
    const totalReviews = reviews.length;
    const averageRating = getAverageRating(reviews);
    const ratingDistribution = getRatingDistribution(reviews);

    // Time-based analytics
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const reviewsThisWeek = reviews.filter((review) => {
      const createdDate = new Date(review.createdAt);
      return createdDate >= weekStart;
    }).length;

    const reviewsThisMonth = reviews.filter((review) => {
      const createdDate = new Date(review.createdAt);
      return createdDate >= monthStart;
    }).length;

    const monthlyReviews = reviews.filter((review) => {
      const createdDate = new Date(review.createdAt);
      return createdDate >= monthStart;
    });

    const averageRatingThisMonth = getAverageRating(monthlyReviews);

    // Status breakdown
    const visibleReviews = reviews.filter(
      (review) => review.status === "Visible",
    ).length;
    const hiddenReviews = reviews.filter(
      (review) => review.status === "Hidden",
    ).length;
    const flaggedReviews = reviews.filter(
      (review) => review.status === "Flagged",
    ).length;

    // Quality metrics
    const recentReviews = reviews.filter((review) => {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return new Date(review.createdAt) >= sevenDaysAgo;
    }).length;

    const topRatedCount = reviews.filter((review) => review.rating >= 4).length;

    // Quality score calculation (custom algorithm)
    const qualityScore =
      totalReviews > 0
        ? Math.round(
            ((averageRating / 5) * 0.6 + (topRatedCount / totalReviews) * 0.4) *
              100,
          )
        : 0;

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
  }, [reviews, getAverageRating, getRatingDistribution]);

  // State management utilities
  const resetState = useCallback(() => {
    setReviews([]);
    setError(null);
    setStatistics(null);
    setAnalytics(null);
    setProfileCache(new Map());
  }, []);

  const retryOperation = useCallback(
    async (operation: string) => {
      clearError();

      switch (operation) {
        case "loadReviews":
          await loadUserReviews();
          break;
        case "loadProfile":
          await loadUserProfile();
          break;
        case "refreshReviews":
          await refreshReviews();
          break;
        default:
        //console.warn(`Unknown operation to retry: ${operation}`);
      }
    },
    [clearError, loadUserReviews, loadUserProfile, refreshReviews],
  );

  // Load statistics and analytics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const stats = await reviewCanisterService.getReviewStatistics();
        setStatistics(stats);
      } catch (error) {
        //console.warn("Failed to load review statistics:", error);
      }
    };

    loadStatistics();
  }, []);

  // Calculate analytics when reviews change
  useEffect(() => {
    if (reviews.length > 0) {
      setLoadingState("analytics", true);
      try {
        const newAnalytics = calculateAnalytics();
        setAnalytics(newAnalytics);
      } catch (error) {
        //console.error("Error calculating analytics:", error);
      } finally {
        setLoadingState("analytics", false);
      }
    }
  }, [reviews, calculateAnalytics, setLoadingState]);

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refreshReviews, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshReviews]);

  // Initialize data on mount
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // ✅ Fix the auto-loading effect to be conditional
  useEffect(() => {
    if (autoLoadUserReviews && isUserAuthenticated()) {
      loadUserReviews();
    }
  }, [autoLoadUserReviews, isUserAuthenticated, loadUserReviews]);

  return {
    // Data states
    reviews,
    userProfile,
    profileCache,
    statistics,
    analytics,

    // Loading states
    loading,
    loadingProfiles,
    loadingAnalytics,
    refreshing,

    // Error state
    error,

    // Core review management
    loadUserReviews,
    refreshReviews,
    submitReview,
    updateReview,
    deleteReview,

    // Review lookup functions
    getReview,
    getBookingReviews,
    getUserReviews,
    getProviderReviews,
    getServiceReviews,
    getRecentReviews,
    getTopRatedReviews,

    // Review analysis functions
    calculateProviderRating,
    calculateServiceRating,
    canUserReviewBooking,

    // Data filtering and utilities
    filterReviews,
    getAverageRating,
    getRatingDistribution,
    calculateAnalytics,

    // Utility functions
    formatReviewDate,
    getRelativeTime,
    getStatusColor,
    enrichReviewWithProfileData,

    // State management
    getCurrentUserId,
    isUserAuthenticated,
    clearError,
    resetState,
    isOperationInProgress,
    retryOperation,
  };
};

// Specialized hooks for specific use cases

// Hook for service review page
export const useServiceReviews = (serviceId: string | null) => {
  const reviewManagement = useReviewManagement({
    autoRefresh: true,
    autoLoadUserReviews: false, // ✅ Disable auto-loading of user reviews
  });

  useEffect(() => {
    if (serviceId) {
      reviewManagement.getServiceReviews(serviceId);
    }
  }, [serviceId, reviewManagement.getServiceReviews]); // ✅ Add dependency

  return reviewManagement;
};

// Hook for provider dashboard
export const useProviderReviews = (providerId?: string) => {
  const reviewManagement = useReviewManagement({
    autoRefresh: true,
    autoLoadUserReviews: false, // ✅ Disable auto-loading
  });

  useEffect(() => {
    reviewManagement.getProviderReviews(providerId);
  }, [providerId, reviewManagement.getProviderReviews]);

  return reviewManagement;
};

// Hook for booking rating
export const useBookingRating = (bookingId: string | null) => {
  const reviewManagement = useReviewManagement({
    autoLoadUserReviews: true, // ✅ Keep auto-loading for authenticated scenarios
  });
  const [canReview, setCanReview] = useState<boolean | null>(null);

  useEffect(() => {
    if (bookingId) {
      reviewManagement.canUserReviewBooking(bookingId).then(setCanReview);
    }
  }, [bookingId, reviewManagement.canUserReviewBooking]);

  return {
    ...reviewManagement,
    canReview,
  };
};
