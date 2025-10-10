import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAllFeedback,
  getMyFeedback,
  getFeedbackStats,
  getRecentFeedback,
  AppFeedback,
  FeedbackStats,
} from "../services/feedbackCanisterService";
export type { AppFeedback, FeedbackStats };

export const useFeedback = () => {
  const { isAuthenticated, firebaseUser } = useAuth();

  const [allFeedback, setAllFeedback] = useState<AppFeedback[]>([]);
  const [myFeedback, setMyFeedback] = useState<AppFeedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllFeedback = useCallback(async () => {
    if (!isAuthenticated || !firebaseUser) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedback = await getAllFeedback();
      setAllFeedback(feedback);
    } catch (err) {
      setError("Could not load feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, firebaseUser]);

  const fetchMyFeedback = useCallback(async () => {
    if (!isAuthenticated || !firebaseUser) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const feedback = await getMyFeedback();
      setMyFeedback(feedback);
    } catch (err) {
      setError("Could not load your feedback");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, firebaseUser]);

  const fetchFeedbackStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const stats = await getFeedbackStats();
      setFeedbackStats(stats);
    } catch (err) {
      setError("Could not load feedback statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentFeedback = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const feedback = await getRecentFeedback(limit);
      setAllFeedback(feedback);
    } catch (err) {
      setError("Could not load recent feedback");
    } finally {
      setLoading(false);
    }
  }, []);

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
