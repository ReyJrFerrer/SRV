import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import feedbackCanisterService, {
  AppFeedback,
  FeedbackStats,
} from "../services/feedbackCanisterService";

// Re-export types for easier importing
export type { AppFeedback, FeedbackStats };

/**
 * Custom hook to manage feedback functionality, including submitting and retrieving feedback.
 */
export const useFeedback = () => {
  const { isAuthenticated, identity } = useAuth();

  const [allFeedback, setAllFeedback] = useState<AppFeedback[]>([]);
  const [myFeedback, setMyFeedback] = useState<AppFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize feedback canister
   */
  const initializeFeedbackCanister = useCallback(async () => {
    if (isAuthenticated && identity) {
      try {
        await feedbackCanisterService.initializeFeedbackCanister(identity);
      } catch (err) {
        //console.error("Failed to initialize feedback canister:", err);
      }
    }
  }, [isAuthenticated, identity]);

  /**
   * Fetch all feedback (admin function)
   */
  const fetchAllFeedback = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedback = await feedbackCanisterService.getAllFeedback(identity);
      setAllFeedback(feedback);
    } catch (err) {
      //console.error("Failed to fetch all feedback:", err);
      setError("Could not load feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  /**
   * Fetch user's own feedback
   */
  const fetchMyFeedback = useCallback(async () => {
    if (!isAuthenticated || !identity) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedback = await feedbackCanisterService.getMyFeedback(identity);
      setMyFeedback(feedback);
    } catch (err) {
      //console.error("Failed to fetch my feedback:", err);
      setError("Could not load your feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  /**
   * Fetch feedback statistics
   */
  const fetchFeedbackStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await feedbackCanisterService.getFeedbackStats(identity);
      setFeedbackStats(stats);
    } catch (err) {
      //console.error("Failed to fetch feedback stats:", err);
      setError("Could not load feedback statistics");
    } finally {
      setLoading(false);
    }
  }, [identity]);

  /**
   * Fetch recent feedback with limit
   */
  const fetchRecentFeedback = useCallback(
    async (limit: number = 10) => {
      setLoading(true);
      setError(null);

      try {
        const feedback = await feedbackCanisterService.getRecentFeedback(
          limit,
          identity,
        );
        setAllFeedback(feedback);
      } catch (err) {
        //console.error("Failed to fetch recent feedback:", err);
        setError("Could not load recent feedback");
      } finally {
        setLoading(false);
      }
    },
    [identity],
  );

  // Initialize feedback canister on mount
  useEffect(() => {
    initializeFeedbackCanister();
  }, [initializeFeedbackCanister]);

  // Fetch feedback stats on mount (public data)
  useEffect(() => {
    fetchFeedbackStats();
  }, [fetchFeedbackStats]);

  return {
    // State
    allFeedback,
    myFeedback,
    feedbackStats,
    loading,
    error,

    fetchAllFeedback,
    fetchMyFeedback,
    fetchFeedbackStats,
    fetchRecentFeedback,

    // Helpers
    clearError: () => setError(null),
  };
};
