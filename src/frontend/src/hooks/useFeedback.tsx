import { useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { feedbackCanisterService } from "../services/feedbackCanisterService";

/**
 * Custom hook to manage feedback functionality, including submitting and retrieving feedback.
 */
export const useFeedback = () => {
  const { isAuthenticated } = useAuth();
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit feedback
   */
  const submitFeedback = async (
    rating: number,
    comment?: string,
  ): Promise<boolean> => {
    if (!isAuthenticated) {
      setError("You must be logged in to submit feedback.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      await feedbackCanisterService.submitFeedback(rating, comment);
      return true;
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError(
        err instanceof Error ? err.message : "Failed to submit feedback",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Submit report
   */
  const submitReport = async (description: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError("You must be logged in to submit a report.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      await feedbackCanisterService.submitReport(description);
      return true;
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError(err instanceof Error ? err.message : "Failed to submit report");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Get my feedback
   */
  const getMyFeedback = useCallback(async () => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      return await feedbackCanisterService.getMyFeedback();
    } catch (err) {
      console.error("Failed to get my feedback:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get feedback",
      );
      return [];
    }
  }, [isAuthenticated]);

  /**
   * Get my reports
   */
  const getMyReports = useCallback(async () => {
    if (!isAuthenticated) {
      return [];
    }

    try {
      return await feedbackCanisterService.getMyReports();
    } catch (err) {
      console.error("Failed to get my reports:", err);
      setError(err instanceof Error ? err.message : "Failed to get reports");
      return [];
    }
  }, [isAuthenticated]);

  /**
   * Get feedback stats (admin function)
   */
  const getFeedbackStats = useCallback(async () => {
    try {
      return await feedbackCanisterService.getFeedbackStats();
    } catch (err) {
      console.error("Failed to get feedback stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get feedback stats",
      );
      return null;
    }
  }, []);

  /**
   * Get report stats (admin function)
   */
  const getReportStats = useCallback(async () => {
    try {
      return await feedbackCanisterService.getReportStats();
    } catch (err) {
      console.error("Failed to get report stats:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get report stats",
      );
      return null;
    }
  }, []);

  return {
    // State
    loading,
    submitting,
    error,

    // Actions
    submitFeedback,
    submitReport,
    getMyFeedback,
    getMyReports,
    getFeedbackStats,
    getReportStats,

    // Helpers
    clearError: () => setError(null),
  };
};
