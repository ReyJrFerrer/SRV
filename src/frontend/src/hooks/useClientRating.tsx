import { useCallback, useState } from "react";

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
        void bookingId;
        void input;
        // TODO: hook this to backend API / canister
        await new Promise((r) => setTimeout(r, 300));
        return true;
      } catch (err) {
        setError("Failed to submit review");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getClientReviews = useCallback(async (bookingId: string) => {
    void bookingId;
    // Return reviews for a booking (stub)
    return [] as ClientReview[];
  }, []);

  const getClientReviewsByUser = useCallback(async (clientId: string) => {
    void clientId;
    // Return reviews that providers left for this client (stub)
    return [] as ClientReview[];
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
