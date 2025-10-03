import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import feedbackCanisterService, {
  AppFeedback,
  FeedbackStats,
} from "../services/feedbackCanisterService";
export type { AppFeedback, FeedbackStats };

export const useFeedback = () => {
  const { isAuthenticated, identity } = useAuth();

  const [allFeedback, setAllFeedback] = useState<AppFeedback[]>([]);
  const [myFeedback, setMyFeedback] = useState<AppFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeFeedbackCanister = useCallback(async () => {
    if (isAuthenticated && identity) {
      try {
        await feedbackCanisterService.initializeFeedbackCanister(identity);
      } catch (err) {
        console.error("Failed to initialize feedback canister:", err);
      }
    }
  }, [isAuthenticated, identity]);

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
      setError("Could not load feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

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
      setError("Could not load your feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, identity]);

  const fetchFeedbackStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await feedbackCanisterService.getFeedbackStats(identity);
      setFeedbackStats(stats);
    } catch (err) {
      setError("Could not load feedback statistics");
    } finally {
      setLoading(false);
    }
  }, [identity]);

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
