import { useCallback, useState } from "react";
import reviewCanisterService from "../services/reviewCanisterService";

export interface ClientReview {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface SubmitClientReviewInput {
  rating: number;
  comment?: string;
}

export function useClientRating(_bookingId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const submitClientReview = useCallback(
    async (bookingId: string, input: SubmitClientReviewInput) => {
      try {
        setLoading(true);
        setError(null);

        // Call the Firebase Cloud Function to submit provider review
        await reviewCanisterService.submitProviderReview(
          bookingId,
          input.rating,
          input.comment || "",
        );

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to submit review";
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getClientReviews = useCallback(async (bookingId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get reviews for a specific booking
      const reviews = await reviewCanisterService.getBookingReviews(bookingId);

      // Filter only provider-to-client reviews
      const providerReviews = reviews.filter((review) =>
        review.id.startsWith("provider-"),
      );

      return providerReviews as ClientReview[];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch booking reviews";
      setError(errorMessage);
      return [] as ClientReview[];
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientReviewsByUser = useCallback(async (clientId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get provider reviews for this client
      const reviews =
        await reviewCanisterService.getClientProviderReviews(clientId);

      return reviews as ClientReview[];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch client reviews";
      setError(errorMessage);
      return [] as ClientReview[];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    submitClientReview,
    getClientReviews,
    getClientReviewsByUser,
    loading,
    error,
    clearError,
  };
}

export default useClientRating;
