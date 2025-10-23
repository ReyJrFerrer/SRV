// Review Service (Firebase Cloud Functions)
import { httpsCallable } from "firebase/functions";
import { initializeFirebase } from "./firebaseApp";

// Initialize Firebase
const { functions } = initializeFirebase();

// Firebase authentication will be handled automatically by httpsCallable functions

// Frontend-compatible Review interface
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: string; // ISO string from Firebase
  updatedAt: string; // ISO string from Firebase
  status: "Visible" | "Hidden" | "Flagged" | "Deleted";
  qualityScore?: number;
}

// Statistics interface
export interface ReviewStatistics {
  totalReviews: number;
  activeReviews: number;
  hiddenReviews: number;
  flaggedReviews: number;
  deletedReviews: number;
}

// Provider rating response interface
export interface ProviderRatingResponse {
  averageRating: number;
  reviewCount: number;
  providerId: string;
}

// Service rating response interface
export interface ServiceRatingResponse {
  averageRating: number;
  reviewCount: number;
  serviceId: string;
}

// User rating response interface
export interface UserRatingResponse {
  averageRating: number;
  reviewCount: number;
  userId: string;
}

// Firebase review data is already in the correct format, no conversion needed

// Review Service Functions
export const reviewCanisterService = {
  /**
   * Submit a review for a booking
   */
  async submitReview(
    bookingId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    console.log("🚀 [reviewCanisterService] submitReview called with:", {
      bookingId,
      rating,
      comment,
    });
    try {
      const submitReviewFn = httpsCallable(functions, "submitReview");

      const result = await submitReviewFn({
        data: { bookingId, rating, comment },
      });

      console.log(
        "✅ [reviewCanisterService] submitReview raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review };
      console.log(
        "✅ [reviewCanisterService] submitReview extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error submitting review:",
        error,
      );
      throw new Error(`Failed to submit review: ${error}`);
    }
  },

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<Review> {
    console.log("🚀 [reviewCanisterService] getReview called with:", {
      reviewId,
    });
    try {
      const getReviewFn = httpsCallable(functions, "getReview");

      const result = await getReviewFn({
        data: { reviewId },
      });

      console.log("✅ [reviewCanisterService] getReview raw result:", result);
      const responseData = result.data as { success: boolean; data: Review };
      console.log(
        "✅ [reviewCanisterService] getReview extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error("❌ [reviewCanisterService] Error getting review:", error);
      throw new Error(`Failed to get review: ${error}`);
    }
  },

  /**
   * Get reviews for a booking
   */
  async getBookingReviews(bookingId: string): Promise<Review[]> {
    console.log("🚀 [reviewCanisterService] getBookingReviews called with:", {
      bookingId,
    });
    try {
      const getBookingReviewsFn = httpsCallable(functions, "getBookingReviews");

      const result = await getBookingReviewsFn({
        data: { bookingId },
      });

      console.log(
        "✅ [reviewCanisterService] getBookingReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getBookingReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting booking reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get reviews by a user
   */
  async getUserReviews(userId?: string): Promise<Review[]> {
    console.log("🚀 [reviewCanisterService] getUserReviews called with:", {
      userId,
    });
    try {
      const getUserReviewsFn = httpsCallable(functions, "getUserReviews");

      const result = await getUserReviewsFn({
        data: { userId },
      });

      console.log(
        "✅ [reviewCanisterService] getUserReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getUserReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting user reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    console.log("🚀 [reviewCanisterService] updateReview called with:", {
      reviewId,
      rating,
      comment,
    });
    try {
      const updateReviewFn = httpsCallable(functions, "updateReview");

      const result = await updateReviewFn({
        data: { reviewId, rating, comment },
      });

      console.log(
        "✅ [reviewCanisterService] updateReview raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review };
      console.log(
        "✅ [reviewCanisterService] updateReview extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error("❌ [reviewCanisterService] Error updating review:", error);
      throw new Error(`Failed to update review: ${error}`);
    }
  },

  /**
   * Delete a review (actually hides it)
   */
  async deleteReview(reviewId: string): Promise<void> {
    console.log("🚀 [reviewCanisterService] deleteReview called with:", {
      reviewId,
    });
    try {
      const deleteReviewFn = httpsCallable(functions, "deleteReview");

      const result = await deleteReviewFn({
        data: { reviewId },
      });

      console.log(
        "✅ [reviewCanisterService] deleteReview raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; message: string };
      console.log(
        "✅ [reviewCanisterService] deleteReview extracted data:",
        responseData,
      );
    } catch (error) {
      console.error("❌ [reviewCanisterService] Error deleting review:", error);
      throw new Error(`Failed to delete review: ${error}`);
    }
  },

  /**
   * Calculate average rating for a provider
   */
  async calculateProviderRating(
    providerId: string,
  ): Promise<ProviderRatingResponse> {
    console.log(
      "🚀 [reviewCanisterService] calculateProviderRating called with:",
      {
        providerId,
      },
    );
    try {
      const calculateProviderRatingFn = httpsCallable(
        functions,
        "calculateProviderRating",
      );

      const result = await calculateProviderRatingFn({
        data: { providerId },
      });

      console.log(
        "✅ [reviewCanisterService] calculateProviderRating raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: ProviderRatingResponse;
      };
      console.log(
        "✅ [reviewCanisterService] calculateProviderRating extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error calculating provider rating:",
        error,
      );
      throw new Error(`Failed to calculate provider rating: ${error}`);
    }
  },

  /**
   * Calculate average rating for a service
   */
  async calculateServiceRating(
    serviceId: string,
  ): Promise<ServiceRatingResponse> {
    console.log(
      "🚀 [reviewCanisterService] calculateServiceRating called with:",
      {
        serviceId,
      },
    );
    try {
      const calculateServiceRatingFn = httpsCallable(
        functions,
        "calculateServiceRating",
      );

      const result = await calculateServiceRatingFn({
        data: { serviceId },
      });

      console.log(
        "✅ [reviewCanisterService] calculateServiceRating raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: ServiceRatingResponse;
      };
      console.log(
        "✅ [reviewCanisterService] calculateServiceRating extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error calculating service rating:",
        error,
      );
      throw new Error(`Failed to calculate service rating: ${error}`);
    }
  },

  /**
   * Calculate user average rating
   */
  async calculateUserAverageRating(
    userId?: string,
  ): Promise<UserRatingResponse> {
    console.log(
      "🚀 [reviewCanisterService] calculateUserAverageRating called with:",
      {
        userId,
      },
    );
    try {
      const calculateUserAverageRatingFn = httpsCallable(
        functions,
        "calculateUserAverageRating",
      );

      const result = await calculateUserAverageRatingFn({
        data: { userId },
      });

      console.log(
        "✅ [reviewCanisterService] calculateUserAverageRating raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: UserRatingResponse;
      };
      console.log(
        "✅ [reviewCanisterService] calculateUserAverageRating extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error calculating user average rating:",
        error,
      );
      throw new Error(`Failed to calculate user average rating: ${error}`);
    }
  },

  /**
   * Get all reviews (admin function)
   */
  async getAllReviews(
    limit?: number,
    offset?: number,
    status?: string,
  ): Promise<Review[]> {
    console.log("🚀 [reviewCanisterService] getAllReviews called with:", {
      limit,
      offset,
      status,
    });
    try {
      const getAllReviewsFn = httpsCallable(functions, "getAllReviews");

      const result = await getAllReviewsFn({
        data: { limit, offset, status },
      });

      console.log(
        "✅ [reviewCanisterService] getAllReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getAllReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting all reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get review statistics (admin function)
   */
  async getReviewStatistics(): Promise<ReviewStatistics> {
    console.log("🚀 [reviewCanisterService] getReviewStatistics called");
    try {
      const getReviewStatisticsFn = httpsCallable(
        functions,
        "getReviewStatistics",
      );

      const result = await getReviewStatisticsFn({});

      console.log(
        "✅ [reviewCanisterService] getReviewStatistics raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: ReviewStatistics;
      };
      console.log(
        "✅ [reviewCanisterService] getReviewStatistics extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting review statistics:",
        error,
      );
      throw new Error(`Failed to get review statistics: ${error}`);
    }
  },

  /**
   * Flag a review for moderation (admin function)
   */
  async flagReview(reviewId: string, reason?: string): Promise<void> {
    console.log("🚀 [reviewCanisterService] flagReview called with:", {
      reviewId,
      reason,
    });
    try {
      const flagReviewFn = httpsCallable(functions, "flagReview");

      const result = await flagReviewFn({
        data: { reviewId, reason },
      });

      console.log("✅ [reviewCanisterService] flagReview raw result:", result);
      const responseData = result.data as { success: boolean; message: string };
      console.log(
        "✅ [reviewCanisterService] flagReview extracted data:",
        responseData,
      );
    } catch (error) {
      console.error("❌ [reviewCanisterService] Error flagging review:", error);
      throw new Error(`Failed to flag review: ${error}`);
    }
  },

  /**
   * Get reviews for a specific provider
   */
  async getProviderReviews(
    providerId: string,
    limit?: number,
    offset?: number,
  ): Promise<Review[]> {
    console.log("🚀 [reviewCanisterService] getProviderReviews called with:", {
      providerId,
      limit,
      offset,
    });
    try {
      const getProviderReviewsFn = httpsCallable(
        functions,
        "getProviderReviews",
      );

      const result = await getProviderReviewsFn({
        data: { providerId, limit, offset },
      });

      console.log(
        "✅ [reviewCanisterService] getProviderReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getProviderReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting provider reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get reviews for a specific service
   */
  async getServiceReviews(
    serviceId: string,
    limit?: number,
    offset?: number,
  ): Promise<Review[]> {
    console.log("🚀 [reviewCanisterService] getServiceReviews called with:", {
      serviceId,
      limit,
      offset,
    });
    try {
      const getServiceReviewsFn = httpsCallable(functions, "getServiceReviews");

      const result = await getServiceReviewsFn({
        data: { serviceId, limit, offset },
      });

      console.log(
        "✅ [reviewCanisterService] getServiceReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getServiceReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting service reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Check if user can review a booking
   */
  async canUserReviewBooking(
    bookingId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Get existing reviews for this booking by this user
      const bookingReviews = await this.getBookingReviews(bookingId);
      const userReview = bookingReviews.find(
        (review) => review.clientId === userId,
      );

      // User can review if they haven't already reviewed this booking
      return !userReview;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error checking if user can review booking:",
        error,
      );
      return false;
    }
  },

  /**
   * Get recent reviews
   */
  async getRecentReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews(limit * 2); // Get more to filter visible ones
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      // Sort by creation date (most recent first)
      visibleReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return visibleReviews.slice(0, limit);
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting recent reviews:",
        error,
      );
      return []; // Return empty array on error
    }
  },

  /**
   * Get top rated reviews
   */
  async getTopRatedReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews(limit * 2); // Get more to filter visible ones
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      // Sort by rating (highest first) and then by quality score
      visibleReviews.sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        // If ratings are equal, sort by quality score
        const scoreA = a.qualityScore || 0;
        const scoreB = b.qualityScore || 0;
        return scoreB - scoreA;
      });

      return visibleReviews.slice(0, limit);
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting top rated reviews:",
        error,
      );
      return []; // Return empty array on error
    }
  },

  /**
   * Initialize static reviews manually (admin function)
   * This is a placeholder for compatibility - Firebase doesn't need static initialization
   */
  async initializeStaticReviewsManually(): Promise<string> {
    console.log(
      "🚀 [reviewCanisterService] initializeStaticReviewsManually called",
    );
    try {
      // Firebase doesn't need static initialization like Motoko canisters
      return "Firebase reviews are dynamically managed, no static initialization needed";
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error initializing static reviews:",
        error,
      );
      throw new Error(`Failed to initialize static reviews: ${error}`);
    }
  },

  /**
   * Submit a provider review for a client
   * This allows providers to rate clients after service completion
   */
  async submitProviderReview(
    bookingId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    console.log(
      "🚀 [reviewCanisterService] submitProviderReview called with:",
      {
        bookingId,
        rating,
        comment,
      },
    );
    try {
      const submitProviderReviewFn = httpsCallable(
        functions,
        "submitProviderReview",
      );

      const result = await submitProviderReviewFn({
        data: { bookingId, rating, comment },
      });

      console.log(
        "✅ [reviewCanisterService] submitProviderReview raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review };
      console.log(
        "✅ [reviewCanisterService] submitProviderReview extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error submitting provider review:",
        error,
      );
      throw new Error(`Failed to submit provider review: ${error}`);
    }
  },

  /**
   * Get provider reviews for a specific client
   * Shows what providers have said about a client
   */
  async getClientProviderReviews(
    clientId: string,
    limit?: number,
    offset?: number,
  ): Promise<Review[]> {
    console.log(
      "🚀 [reviewCanisterService] getClientProviderReviews called with:",
      {
        clientId,
        limit,
        offset,
      },
    );
    try {
      const getClientProviderReviewsFn = httpsCallable(
        functions,
        "getClientProviderReviews",
      );

      const result = await getClientProviderReviewsFn({
        data: { clientId, limit, offset },
      });

      console.log(
        "✅ [reviewCanisterService] getClientProviderReviews raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: Review[] };
      console.log(
        "✅ [reviewCanisterService] getClientProviderReviews extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [reviewCanisterService] Error getting client provider reviews:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },
};

// Firebase functions don't require actor management or reset functionality

export default reviewCanisterService;
