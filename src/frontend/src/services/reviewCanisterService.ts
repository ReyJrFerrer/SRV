// Review Service (Firebase Cloud Functions)
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

const getFunctions = () => getFirebaseFunctions();

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  status: "Visible" | "Hidden" | "Flagged" | "Deleted";
  qualityScore?: number;
}

export interface ReviewStatistics {
  totalReviews: number;
  activeReviews: number;
  hiddenReviews: number;
  flaggedReviews: number;
  deletedReviews: number;
}

export interface ProviderRatingResponse {
  averageRating: number;
  reviewCount: number;
  providerId: string;
}

export interface ServiceRatingResponse {
  averageRating: number;
  reviewCount: number;
  serviceId: string;
}

export interface UserRatingResponse {
  averageRating: number;
  reviewCount: number;
  userId: string;
}

export const reviewCanisterService = {
  async submitReview(
    bookingId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "submitReview",
        data: { bookingId, rating, comment },
      });

      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to submit review: ${error}`);
    }
  },

  async getReview(reviewId: string): Promise<Review> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getReview",
        data: { reviewId },
      });

      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get review: ${error}`);
    }
  },

  async getBookingReviews(bookingId: string): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getBookingReviews",
        data: { bookingId },
      });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async getUserReviews(userId?: string): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getUserReviews",
        data: { userId },
      });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async updateReview(
    reviewId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "updateReview",
        data: { reviewId, rating, comment },
      });
      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to update review: ${error}`);
    }
  },

  async deleteReview(reviewId: string): Promise<void> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      await reviewActionFn({
        action: "deleteReview",
        data: { reviewId },
      });
    } catch (error) {
      throw new Error(`Failed to delete review: ${error}`);
    }
  },

  async restoreReview(reviewId: string): Promise<void> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      await reviewActionFn({
        action: "restoreReview",
        data: { reviewId },
      });
    } catch (error) {
      throw new Error(`Failed to restore review: ${error}`);
    }
  },

  async bulkUpdateReviewStatus(
    reviewIds: string[],
    status: "Visible" | "Hidden",
  ): Promise<{ success: boolean; updated: string[]; errors: { reviewId: string; error: string }[] }> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "bulkUpdateReviewStatus",
        data: { reviewIds, status },
      });

      return result.data as { success: boolean; updated: string[]; errors: { reviewId: string; error: string }[] };
    } catch (error) {
      throw new Error(`Failed to bulk update review status: ${error}`);
    }
  },

  async calculateProviderRating(
    providerId: string,
  ): Promise<ProviderRatingResponse> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "calculateProviderRating",
        data: { providerId },
      });

      const responseData = result.data as {
        success: boolean;
        data: ProviderRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return { averageRating: 0, reviewCount: 0, providerId };
      }
      return { averageRating: 0, reviewCount: 0, providerId };
    }
  },

  async calculateServiceRating(
    serviceId: string,
  ): Promise<ServiceRatingResponse> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "calculateServiceRating",
        data: { serviceId },
      });

      const responseData = result.data as {
        success: boolean;
        data: ServiceRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return { averageRating: 0, reviewCount: 0, serviceId };
      }
      return { averageRating: 0, reviewCount: 0, serviceId };
    }
  },

  async calculateUserAverageRating(
    userId?: string,
  ): Promise<UserRatingResponse> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "calculateUserAverageRating",
        data: { userId },
      });

      const responseData = result.data as {
        success: boolean;
        data: UserRatingResponse;
      };
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No reviews found")) {
        return { averageRating: 0, reviewCount: 0, userId: userId || "" };
      }
      return { averageRating: 0, reviewCount: 0, userId: userId || "" };
    }
  },

  async getAllReviews(
    limit?: number,
    offset?: number,
    status?: string,
  ): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getAllReviews",
        data: { limit, offset, status },
      });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async getReviewStatistics(): Promise<ReviewStatistics> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getReviewStatistics",
        data: {},
      });
      const responseData = result.data as {
        success: boolean;
        data: ReviewStatistics;
      };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get review statistics: ${error}`);
    }
  },

  async flagReview(reviewId: string, reason?: string): Promise<void> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      await reviewActionFn({
        action: "flagReview",
        data: { reviewId, reason },
      });
    } catch (error) {
      throw new Error(`Failed to flag review: ${error}`);
    }
  },

  async getProviderReviews(
    providerId: string,
    limit?: number,
    offset?: number,
  ): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getProviderReviews",
        data: { providerId, limit, offset },
      });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async getServiceReviews(
    serviceId: string,
    limit?: number,
    offset?: number,
    includeHidden?: boolean,
  ): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getServiceReviews",
        data: { serviceId, limit, offset, includeHidden },
      });

      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async canUserReviewBooking(
    bookingId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const bookingReviews = await this.getBookingReviews(bookingId);
      const userReview = bookingReviews.find(
        (review) => review.clientId === userId,
      );
      return !userReview;
    } catch (error) {
      return false;
    }
  },

  async getRecentReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews(limit * 2);
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      visibleReviews.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return visibleReviews.slice(0, limit);
    } catch (error) {
      return [];
    }
  },

  async getTopRatedReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews(limit * 2);
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      visibleReviews.sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        const scoreA = a.qualityScore || 0;
        const scoreB = b.qualityScore || 0;
        return scoreB - scoreA;
      });

      return visibleReviews.slice(0, limit);
    } catch (error) {
      return [];
    }
  },

  async submitProviderReview(
    bookingId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "submitProviderReview",
        data: { bookingId, rating, comment },
      });

      const responseData = result.data as { success: boolean; data: Review };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to submit provider review: ${error}`);
    }
  },

  async getClientProviderReviews(
    clientId: string,
    limit?: number,
    offset?: number,
    includeHidden?: boolean,
  ): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getClientProviderReviews",
        data: { clientId, limit, offset, includeHidden },
      });
      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },

  async getProviderReviewsByProvider(
    providerId: string,
    limit?: number,
    offset?: number,
    includeHidden?: boolean,
  ): Promise<Review[]> {
    try {
      const reviewActionFn = httpsCallable(getFunctions(), "reviewAction");

      const result = await reviewActionFn({
        action: "getProviderReviewsByProvider",
        data: { providerId, limit, offset, includeHidden },
      });
      const responseData = result.data as { success: boolean; data: Review[] };
      return responseData.data || [];
    } catch (error) {
      return [];
    }
  },
};

export default reviewCanisterService;