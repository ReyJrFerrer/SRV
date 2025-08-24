import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import feedbackCanisterService, {
  SubmitFeedbackRequest,
  SubmitReportRequest,
} from "../services/feedbackCanisterService";

/**
 * Custom hook to manage feedback functionality, including submitting and retrieving feedback.
 */
export const useFeedback = () => {
  const { isAuthenticated, identity } = useAuth();
  const [loading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize feedback canister
   */
  const initializeFeedbackCanister = useCallback(async () => {
    if (isAuthenticated && identity) {
      try {
        await feedbackCanisterService.initializeFeedbackCanister(identity);
      } catch (err) {
        console.error("Failed to initialize feedback canister:", err);
      }
    }
  }, [isAuthenticated, identity]);

  /**
   * Submit feedback
   */
  const submitFeedback = async (
    request: SubmitFeedbackRequest,
  ): Promise<boolean> => {
    if (!isAuthenticated || !identity) {
      setError("You must be logged in to submit feedback.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      await feedbackCanisterService.submitFeedback(request, identity);

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
  const submitReport = async (
    request: SubmitReportRequest,
  ): Promise<boolean> => {
    if (!isAuthenticated || !identity) {
      setError("You must be logged in to submit a report.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      await feedbackCanisterService.submitReport(request, identity);

      return true;
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError(err instanceof Error ? err.message : "Failed to submit report");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize feedback canister on mount
  useEffect(() => {
    initializeFeedbackCanister();
  }, [initializeFeedbackCanister]);

  return {
    // State
    loading,
    submitting,
    error,

    // Actions
    submitFeedback,
    submitReport,

    // Helpers
    clearError: () => setError(null),
  };
};
