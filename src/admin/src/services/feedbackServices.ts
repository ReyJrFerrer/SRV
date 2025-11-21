import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { sendTicketStatusNotification } from "./notificationServices";
import { handlePromiseSettledArrayResults } from "../utils/promiseUtils";

/**
 * Get detailed reviews for a user
 */
export const getUserDetailedReviews = async (
  userId: string,
): Promise<{
  receivedReviews: any[];
  givenAsClientReviews: any[];
  givenAsProviderReviews: any[];
}> => {
  try {
    requireAuth();

    // Get all review types in parallel
    const [receivedResult, givenAsClientResult, givenAsProviderResult] =
      await Promise.allSettled([
        callFirebaseFunction("getClientProviderReviews", {
          data: { clientId: userId, includeHidden: true },
        }),

        callFirebaseFunction("getUserReviews", {
          data: { userId: userId, includeHidden: true },
        }),

        callFirebaseFunction("getProviderReviewsByProvider", {
          data: { providerId: userId, includeHidden: true },
        }),
      ]);

    const receivedReviews = handlePromiseSettledArrayResults(
      [receivedResult],
      [],
    );
    const givenAsClientReviews = handlePromiseSettledArrayResults(
      [givenAsClientResult],
      [],
    );
    const givenAsProviderReviews = handlePromiseSettledArrayResults(
      [givenAsProviderResult],
      [],
    );

    return {
      receivedReviews,
      givenAsClientReviews,
      givenAsProviderReviews,
    };
  } catch (error) {
    console.error("Error fetching user detailed reviews", error);
    return {
      receivedReviews: [],
      givenAsClientReviews: [],
      givenAsProviderReviews: [],
    };
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    requireAuth();
    await callFirebaseFunction("deleteReview", {
      data: { reviewId },
    });
  } catch (error) {
    console.error("Error deleting review", error);
    throw error;
  }
};

/**
 * Restore a review
 */
export const restoreReview = async (reviewId: string): Promise<void> => {
  try {
    requireAuth();
    await callFirebaseFunction("restoreReview", {
      data: { reviewId },
    });
  } catch (error) {
    console.error("Error restoring review", error);
    throw error;
  }
};

/**
 * Bulk update review status
 */
export const bulkUpdateReviewStatus = async (
  reviewIds: string[],
  status: "Visible" | "Hidden",
): Promise<{
  updated: string[];
  errors: Array<{ reviewId: string; error: string }>;
}> => {
  try {
    requireAuth();
    const result = await callFirebaseFunction("bulkUpdateReviewStatus", {
      data: { reviewIds, status },
    });
    return {
      updated: result.updated || [],
      errors: result.errors || [],
    };
  } catch (error) {
    console.error("Error bulk updating reviews", error);
    throw error;
  }
};

// Report/Feedback integration
export const getReportsFromFeedbackCanister = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getAllReports", {});

    if (!result || !Array.isArray(result)) return [];

    return result.map((report: any) => ({
      id: report.id,
      userId: report.userId,
      userName: report.userName || "Unknown User",
      userPhone: report.userPhone || "",
      description: report.description,
      status: report.status || "open",
      createdAt: report.createdAt || new Date().toISOString(),
      attachments: report.attachments || [],
    }));
  } catch (error) {
    console.error("Error fetching reports from Firebase", error);
    return [];
  }
};

// Get feedback statistics
export const getFeedbackStats = async (): Promise<{
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Array<[number, number]>;
  totalWithComments: number;
  latestFeedback: any | null;
}> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getFeedbackStats", {});

    if (!result) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: [],
        totalWithComments: 0,
        latestFeedback: null,
      };
    }

    return {
      totalFeedback: result.totalFeedback || 0,
      averageRating: result.averageRating || 0,
      ratingDistribution: result.ratingDistribution || [],
      totalWithComments: result.totalWithComments || 0,
      latestFeedback: result.latestFeedback || null,
    };
  } catch (error) {
    console.error("Error fetching feedback stats from Firebase", error);
    return {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: [],
      totalWithComments: 0,
      latestFeedback: null,
    };
  }
};

// Get all feedback
export const getAllFeedback = async (): Promise<any[]> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getAllFeedback", {});

    if (!result || !Array.isArray(result)) return [];

    return result.map((feedback: any) => ({
      id: feedback.id,
      userId: feedback.userId,
      userName: feedback.userName || "Unknown User",
      userPhone: feedback.userPhone || "",
      rating: feedback.rating || 0,
      comment: feedback.comment || null,
      createdAt: feedback.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching feedback from Firebase", error);
    return [];
  }
};

// Update report status in Firebase
export const updateReportStatus = async (
  reportId: string,
  newStatus: string,
  userId?: string,
  ticketTitle?: string,
  oldStatus?: string,
): Promise<boolean> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("updateReportStatus", {
      data: {
        reportId,
        newStatus: newStatus,
      },
    });

    if (result) {
      if (userId && ticketTitle && oldStatus) {
        await sendTicketStatusNotification(
          userId,
          reportId,
          oldStatus,
          newStatus,
          ticketTitle,
        );
      }

      return true;
    } else {
      console.error(`Failed to update report status`);
      return false;
    }
  } catch (error) {
    console.error("Error updating report status", error);
    return false;
  }
};
