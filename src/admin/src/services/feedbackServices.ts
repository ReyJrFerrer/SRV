import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { sendTicketStatusNotification } from "./notificationServices";

/**
 * Get detailed reviews for a user (received, given as client, given as provider)
 */
export const getUserDetailedReviews = async (
  userId: string,
): Promise<{
  receivedReviews: any[]; // Reviews RECEIVED (what providers wrote about this user)
  givenAsClientReviews: any[]; // Reviews GIVEN as client (what user wrote about providers/services)
  givenAsProviderReviews: any[]; // Reviews GIVEN as provider (what user wrote about clients)
}> => {
  try {
    requireAuth();

    // Get all review types in parallel (including hidden reviews for admin)
    // Note: Payload must be wrapped in { data: {...} } to match client format
    const [receivedResult, givenAsClientResult, givenAsProviderResult] =
      await Promise.allSettled([
        // Reviews RECEIVED: what providers wrote about this user (as client)
        callFirebaseFunction("getClientProviderReviews", {
          data: { clientId: userId, includeHidden: true },
        }),
        // Reviews GIVEN as CLIENT: what this user wrote about providers/services
        callFirebaseFunction("getUserReviews", {
          data: { userId: userId, includeHidden: true },
        }),
        // Reviews GIVEN as PROVIDER: what this user wrote about clients
        callFirebaseFunction("getProviderReviewsByProvider", {
          data: { providerId: userId, includeHidden: true },
        }),
      ]);

    // callFirebaseFunction already extracts data from {success: true, data: [...]}
    const receivedReviews =
      receivedResult.status === "fulfilled" &&
      Array.isArray(receivedResult.value)
        ? receivedResult.value
        : [];

    const givenAsClientReviews =
      givenAsClientResult.status === "fulfilled" &&
      Array.isArray(givenAsClientResult.value)
        ? givenAsClientResult.value
        : [];

    const givenAsProviderReviews =
      givenAsProviderResult.status === "fulfilled" &&
      Array.isArray(givenAsProviderResult.value)
        ? givenAsProviderResult.value
        : [];

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
 * Delete a review (admin only - hides the review)
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
 * Restore a review (admin only - makes hidden review visible)
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
 * Bulk update review status (admin only)
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

// Report/Feedback integration - separate export
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

// Get all feedback (admin function)
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
      console.log(`Report ${reportId} status updated to: ${newStatus}`);

      // Send notification to user if userId and ticketTitle are provided
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
