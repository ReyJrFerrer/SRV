// Review Canister Service
import { Principal } from "@dfinity/principal";
import {
  canisterId,
  createActor as createReviewActor,
} from "../../../declarations/review";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import { canisterId as reputationCanisterId } from "../../../declarations/reputation";
import { canisterId as serviceCanisterId } from "../../../declarations/service";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as ReviewService,
  Review as CanisterReview,
} from "../../../declarations/review/review.did";

/**
 * Creates a review actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated ReviewService actor
 */
const createReviewActorWithIdentity = (
  identity?: Identity | null,
): ReviewService => {
  return createReviewActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:   process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://id.ai",
    },
  }) as ReviewService;
};

// Singleton actor instance with identity tracking
let reviewActor: ReviewService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the review actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateReviewActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    reviewActor = createReviewActorWithIdentity(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current review actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getReviewActor = (requireAuth: boolean = false): ReviewService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!reviewActor) {
    reviewActor = createReviewActorWithIdentity(currentIdentity);
  }

  return reviewActor;
};

// Frontend-compatible Review interface
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string;
  createdAt: number; // milliseconds
  updatedAt: number; // milliseconds
  status: "Visible" | "Hidden" | "Flagged";
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

// Type conversion functions
const convertCanisterReviewToFrontend = (
  canisterReview: CanisterReview,
): Review => {
  return {
    id: canisterReview.id,
    bookingId: canisterReview.bookingId,
    clientId: canisterReview.clientId.toText(),
    providerId: canisterReview.providerId.toText(),
    serviceId: canisterReview.serviceId,
    rating: Number(canisterReview.rating),
    comment: canisterReview.comment,
    createdAt: Number(canisterReview.createdAt) / 1_000_000, // Convert nanoseconds to milliseconds
    updatedAt: Number(canisterReview.updatedAt) / 1_000_000,
    status: Object.keys(canisterReview.status)[0] as
      | "Visible"
      | "Hidden"
      | "Flagged",
    qualityScore:
      canisterReview.qualityScore.length > 0
        ? Number(canisterReview.qualityScore[0])
        : undefined,
  };
};

class ReviewCanisterService {
  private getActor(): ReviewService {
    return getReviewActor();
  }

  // Submit a review for a booking
  async submitReview(
    bookingId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    try {
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.submitReview(
        bookingId,
        BigInt(rating),
        comment,
      );

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error submitting review:", error);
      throw error;
    }
  }

  // Get review by ID
  async getReview(reviewId: string): Promise<Review> {
    try {
      const actor = this.getActor();
      const result = await actor.getReview(reviewId);

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error getting review:", error);
      throw error;
    }
  }

  // Get reviews for a booking
  async getBookingReviews(bookingId: string): Promise<Review[]> {
    try {
      const actor = this.getActor();
      const canisterReviews = await actor.getBookingReviews(bookingId);

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting booking reviews:", error);
      throw error;
    }
  }

  // Get reviews by a user
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const actor = this.getActor();
      const userPrincipal = Principal.fromText(userId);
      const canisterReviews = await actor.getUserReviews(userPrincipal);

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting user reviews:", error);
      throw error;
    }
  }

  // Update a review
  async updateReview(
    reviewId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    try {
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.updateReview(
        reviewId,
        BigInt(rating),
        comment,
      );

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating review:", error);
      throw error;
    }
  }

  // Delete a review (actually hides it)
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.deleteReview(reviewId);

      if ("err" in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error deleting review:", error);
      throw error;
    }
  }

  // Calculate average rating for a provider
  async calculateProviderRating(providerId: string): Promise<number> {
    try {
      const actor = this.getActor();
      const providerPrincipal = Principal.fromText(providerId);
      const result = await actor.calculateProviderRating(providerPrincipal);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating provider rating:", error);
      throw error;
    }
  }

  // Calculate average rating for a service
  async calculateServiceRating(serviceId: string): Promise<number> {
    try {
      const actor = this.getActor();
      const result = await actor.calculateServiceRating(serviceId);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating service rating:", error);
      throw error;
    }
  }

  // Calculate user average rating
  async calculateUserAverageRating(userId: string): Promise<number> {
    try {
      const actor = this.getActor();
      const userPrincipal = Principal.fromText(userId);
      const result = await actor.calculateUserAverageRating(userPrincipal);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating user average rating:", error);
      throw error;
    }
  }

  // Get all reviews (for admin or analytics purposes)
  async getAllReviews(): Promise<Review[]> {
    try {
      const actor = this.getActor();
      const canisterReviews = await actor.getAllReviews();

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting all reviews:", error);
      throw error;
    }
  }

  // Get review statistics
  async getReviewStatistics(): Promise<ReviewStatistics> {
    try {
      const actor = this.getActor();
      const stats = await actor.getReviewStatistics();

      return {
        totalReviews: Number(stats.totalReviews),
        activeReviews: Number(stats.activeReviews),
        hiddenReviews: Number(stats.hiddenReviews),
        flaggedReviews: Number(stats.flaggedReviews),
        deletedReviews: Number(stats.deletedReviews),
      };
    } catch (error) {
      //console.error("Error getting review statistics:", error);
      throw error;
    }
  }

  // Initialize static reviews manually (admin function)
  async initializeStaticReviewsManually(): Promise<string> {
    try {
      const actor = this.getActor();
      const result = await actor.initializeStaticReviewsManually();

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error initializing static reviews:", error);
      throw error;
    }
  }

  // Helper method to get reviews for a specific provider
  async getProviderReviews(providerId: string): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      return allReviews.filter(
        (review) =>
          review.providerId === providerId && review.status === "Visible",
      );
    } catch (error) {
      //console.error("Error getting provider reviews:", error);
      throw error;
    }
  }

  // Helper method to get reviews for a specific service
  async getServiceReviews(serviceId: string): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      return allReviews.filter(
        (review) =>
          review.serviceId === serviceId && review.status === "Visible",
      );
    } catch (error) {
      //console.error("Error getting service reviews:", error);
      throw error;
    }
  }

  // Helper method to check if user can review a booking
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
      //console.error("Error checking if user can review booking:", error);
      return false;
    }
  }

  // Helper method to get recent reviews
  async getRecentReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      // Sort by creation date (most recent first)
      visibleReviews.sort((a, b) => b.createdAt - a.createdAt);

      return visibleReviews.slice(0, limit);
    } catch (error) {
      //console.error("Error getting recent reviews:", error);
      throw error;
    }
  }

  // Helper method to get top rated reviews
  async getTopRatedReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
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
      //console.error("Error getting top rated reviews:", error);
      throw error;
    }
  }
}

// Export the class for advanced usage
export { ReviewCanisterService };

// Review Canister Service Functions (consistent with other services)
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
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.submitReview(
        bookingId,
        BigInt(rating),
        comment,
      );

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error submitting review:", error);
      throw error;
    }
  },

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<Review> {
    try {
      const actor = getReviewActor();
      const result = await actor.getReview(reviewId);

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error getting review:", error);
      throw error;
    }
  },

  /**
   * Get reviews for a booking
   */
  async getBookingReviews(bookingId: string): Promise<Review[]> {
    try {
      const actor = getReviewActor();
      const canisterReviews = await actor.getBookingReviews(bookingId);

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting booking reviews:", error);
      throw error;
    }
  },

  /**
   * Get reviews by a user
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    try {
      const actor = getReviewActor();
      const userPrincipal = Principal.fromText(userId);
      const canisterReviews = await actor.getUserReviews(userPrincipal);

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting user reviews:", error);
      throw error;
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
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.updateReview(
        reviewId,
        BigInt(rating),
        comment,
      );

      if ("ok" in result) {
        return convertCanisterReviewToFrontend(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating review:", error);
      throw error;
    }
  },

  /**
   * Delete a review (actually hides it)
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      const actor = getReviewActor(true); // Requires authentication
      const result = await actor.deleteReview(reviewId);

      if ("err" in result) {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error deleting review:", error);
      throw error;
    }
  },

  /**
   * Calculate average rating for a provider
   */
  async calculateProviderRating(providerId: string): Promise<number> {
    try {
      const actor = getReviewActor();
      const providerPrincipal = Principal.fromText(providerId);
      const result = await actor.calculateProviderRating(providerPrincipal);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating provider rating:", error);
      throw error;
    }
  },

  /**
   * Calculate average rating for a service
   */
  async calculateServiceRating(serviceId: string): Promise<number> {
    try {
      const actor = getReviewActor();
      const result = await actor.calculateServiceRating(serviceId);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating service rating:", error);
      throw error;
    }
  },

  /**
   * Calculate user average rating
   */
  async calculateUserAverageRating(userId: string): Promise<number> {
    try {
      const actor = getReviewActor();
      const userPrincipal = Principal.fromText(userId);
      const result = await actor.calculateUserAverageRating(userPrincipal);

      if ("ok" in result) {
        return Number(result.ok);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error calculating user average rating:", error);
      throw error;
    }
  },

  /**
   * Initialize static reviews manually (admin function)
   */
  async initializeStaticReviewsManually(): Promise<string> {
    try {
      const actor = getReviewActor();
      const result = await actor.initializeStaticReviewsManually();

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error initializing static reviews:", error);
      throw error;
    }
  },

  /**
   * Get all reviews
   */
  async getAllReviews(): Promise<Review[]> {
    try {
      const actor = getReviewActor();
      const canisterReviews = await actor.getAllReviews();

      return canisterReviews.map(convertCanisterReviewToFrontend);
    } catch (error) {
      //console.error("Error getting all reviews:", error);
      throw error;
    }
  },

  /**
   * Get review statistics
   */
  async getReviewStatistics(): Promise<ReviewStatistics> {
    try {
      const actor = getReviewActor();
      const stats = await actor.getReviewStatistics();

      return {
        totalReviews: Number(stats.totalReviews),
        activeReviews: Number(stats.activeReviews),
        hiddenReviews: Number(stats.hiddenReviews),
        flaggedReviews: Number(stats.flaggedReviews),
        deletedReviews: Number(stats.deletedReviews),
      };
    } catch (error) {
      //console.error("Error getting review statistics:", error);
      throw error;
    }
  },

  /**
   * Get recent reviews
   */
  async getRecentReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      const visibleReviews = allReviews.filter(
        (review) => review.status === "Visible",
      );

      // Sort by creation date (most recent first)
      visibleReviews.sort((a, b) => b.createdAt - a.createdAt);

      return visibleReviews.slice(0, limit);
    } catch (error) {
      //console.error("Error getting recent reviews:", error);
      throw error;
    }
  },

  /**
   * Get top rated reviews
   */
  async getTopRatedReviews(limit: number = 10): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
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
      //console.error("Error getting top rated reviews:", error);
      throw error;
    }
  },

  /**
   * Get reviews for a specific provider
   */
  async getProviderReviews(providerId: string): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      return allReviews.filter(
        (review) =>
          review.providerId === providerId && review.status === "Visible",
      );
    } catch (error) {
      //console.error("Error getting provider reviews:", error);
      throw error;
    }
  },

  /**
   * Get reviews for a specific service
   */
  async getServiceReviews(serviceId: string): Promise<Review[]> {
    try {
      const allReviews = await this.getAllReviews();
      return allReviews.filter(
        (review) =>
          review.serviceId === serviceId && review.status === "Visible",
      );
    } catch (error) {
      //console.error("Error getting service reviews:", error);
      throw error;
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
      //console.error("Error checking if user can review booking:", error);
      return false;
    }
  },
  // Set canister references (admin function)
  async setCanisterReferences(): Promise<string | null> {
    try {
      const actor = getReviewActor(true);
      const result = await actor.setCanisterReferences(
        Principal.fromText(bookingCanisterId),
        Principal.fromText(serviceCanisterId),
        Principal.fromText(reputationCanisterId),
        Principal.fromText(authCanisterId),
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        // //console.error("Error setting canister references:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      // //console.error("Error setting canister references:", error);
      // Reset the actor to force recreation on next call
      reviewActor = null;
      throw new Error(`Failed to set canister references: ${error}`);
    }
  },
};

// Reset functions for authentication state changes
export const resetReviewActor = () => {
  reviewActor = null;
};

export const refreshReviewActor = async () => {
  resetReviewActor();
  return await getReviewActor();
};

export default reviewCanisterService;
