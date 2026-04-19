// Review Service (Firebase Cloud Functions)
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

// Get Firebase Functions instance using proper helper
const getFunctions = () => getFirebaseFunctions();

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
    try {
      const submitReviewFn = httpsCallable(getFunctions(), "submitReview");

      const result = await submitReviewFn({ bookingId, rating, comment });

      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to submit review: ${error}`);
    }
  },

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<Review> {
    try {
      const getReviewFn = httpsCallable(getFunctions(), "getReview");

      const result = await getReviewFn({ reviewId });

      const responseData = result.data as { success: boolean; data: Review };

      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get review: ${error}`);
    }
  },

  /**
   * Get reviews for a booking
   */
  async getBookingReviews(bookingId: string): Promise<Review[]> {
    try {
      const getBookingReviewsFn = httpsCallable(
        getFunctions(),
        "getBookingReviews",
      );

      const result = await getBookingReviewsFn({ bookingId });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get reviews by a user
   */
  async getUserReviews(userId?: string): Promise<Review[]> {
    try {
      const getUserReviewsFn = httpsCallable(getFunctions(), "getUserReviews");

      const result = await getUserReviewsFn({ userId });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
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
    try {
      const updateReviewFn = httpsCallable(getFunctions(), "updateReview");

      const result = await updateReviewFn({ reviewId, rating, comment });
      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to update review: ${error}`);
    }
  },

  /**
   * Delete a review (actually hides it)
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const deleteReviewFn = httpsCallable(getFunctions(), "deleteReview");

      const result = await deleteReviewFn({ reviewId });
      result.data as { success: boolean; message: string };
    } catch (error) {
      throw new Error(`Failed to delete review: ${error}`);
    }
  },

  /**
   * Calculate average rating for a provider
   */
  async calculateProviderRating(
    providerId: string,
  ): Promise<ProviderRatingResponse> {
    try {
      const calculateProviderRatingFn = httpsCallable(
        getFunctions(),
        "calculateProviderRating",
      );

      const result = await calculateProviderRatingFn({ providerId });

      const responseData = result.data as {
        success: boolean;
        data: ProviderRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      // Check if the error is "No reviews found" and return default values
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return {
          averageRating: 0,
          reviewCount: 0,
          providerId,
        };
      }
      // Return default values for other errors too
      return {
        averageRating: 0,
        reviewCount: 0,
        providerId,
      };
    }
  },

  /**
   * Calculate average rating for a service
   */
  async calculateServiceRating(
    serviceId: string,
  ): Promise<ServiceRatingResponse> {
    try {
      const calculateServiceRatingFn = httpsCallable(
        getFunctions(),
        "calculateServiceRating",
      );

      const result = await calculateServiceRatingFn({ serviceId });

      const responseData = result.data as {
        success: boolean;
        data: ServiceRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      // Check if the error is "No reviews found" and return default values
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return {
          averageRating: 0,
          reviewCount: 0,
          serviceId,
        };
      }
      // Return default values for other errors too
      return {
        averageRating: 0,
        reviewCount: 0,
        serviceId,
      };
    }
  },

  /**
   * Calculate user average rating
   */
  async calculateUserAverageRating(
    userId?: string,
  ): Promise<UserRatingResponse> {
    try {
      const calculateUserAverageRatingFn = httpsCallable(
        getFunctions(),
        "calculateUserAverageRating",
      );

      const result = await calculateUserAverageRatingFn({ userId });

      const responseData = result.data as {
        success: boolean;
        data: UserRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      // Check if the error is "No reviews found" and return default values
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return {
          averageRating: 0,
          reviewCount: 0,
          userId: userId || "",
        };
      }
      // Return default values for other errors too
      return {
        averageRating: 0,
        reviewCount: 0,
        userId: userId || "",
      };
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
    try {
      const getAllReviewsFn = httpsCallable(getFunctions(), "getAllReviews");

      const result = await getAllReviewsFn({ limit, offset, status });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get review statistics (admin function)
   */
  async getReviewStatistics(): Promise<ReviewStatistics> {
    try {
      const getReviewStatisticsFn = httpsCallable(
        getFunctions(),
        "getReviewStatistics",
      );

      const result = await getReviewStatisticsFn({});
      const responseData = result.data as {
        success: boolean;
        data: ReviewStatistics;
      };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get review statistics: ${error}`);
    }
  },

  /**
   * Flag a review for moderation (admin function)
   */
  async flagReview(reviewId: string, reason?: string): Promise<void> {
    try {
      const flagReviewFn = httpsCallable(getFunctions(), "flagReview");

      const result = await flagReviewFn({ reviewId, reason });

      result.data as { success: boolean; message: string };
    } catch (error) {
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
    try {
      const getProviderReviewsFn = httpsCallable(
        getFunctions(),
        "getProviderReviews",
      );

      const result = await getProviderReviewsFn({ providerId, limit, offset });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
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
    try {
      const getServiceReviewsFn = httpsCallable(
        getFunctions(),
        "getServiceReviews",
      );

      const result = await getServiceReviewsFn({ serviceId, limit, offset });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
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
      return []; // Return empty array on error
    }
  },

  /**
   * Initialize static reviews manually (admin function)
   * This is a placeholder for compatibility - Firebase doesn't need static initialization
   */
  async initializeStaticReviewsManually(): Promise<string> {
    try {
      // Firebase doesn't need static initialization like Motoko canisters
      return "Firebase reviews are dynamically managed, no static initialization needed";
    } catch (error) {
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
    try {
      const submitProviderReviewFn = httpsCallable(
        getFunctions(),
        "submitProviderReview",
      );

      const result = await submitProviderReviewFn({ bookingId, rating, comment });

      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
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
    try {
      const getClientProviderReviewsFn = httpsCallable(
        getFunctions(),
        "getClientProviderReviews",
      );

      const result = await getClientProviderReviewsFn({ clientId, limit, offset });
      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },
};

// Firebase functions don't require actor management or reset functionality

export default reviewCanisterService;
