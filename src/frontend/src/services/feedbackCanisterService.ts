// Feedback Service (Firebase Cloud Functions)
import { httpsCallable } from "firebase/functions";
import { initializeFirebase } from "./firebaseApp";

// Initialize Firebase
const { functions } = initializeFirebase();

// Firebase authentication will be handled automatically by httpsCallable functions

// Frontend-compatible interfaces
export interface AppFeedback {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  rating: number; // 1-5 stars
  comment?: string; // Optional written review
  createdAt: string; // ISO string from Firebase
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Array<[number, number]>; // [rating, count] pairs
  totalWithComments: number;
  latestFeedback?: AppFeedback;
}

export interface AppReport {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  description: string;
  status?: string; // Admin-managed status: "open", "in_progress", "resolved", "closed"
  createdAt: string; // ISO string from Firebase
}

export interface ReportStats {
  totalReports: number;
  latestReport?: AppReport;
}

// Firebase feedback data is already in the correct format, no conversion needed

// Feedback Service Functions
export const feedbackCanisterService = {
  /**
   * Submit feedback
   */
  async submitFeedback(rating: number, comment?: string): Promise<AppFeedback> {
    console.log("🚀 [feedbackCanisterService] submitFeedback called with:", {
      rating,
      comment,
    });
    try {
      const submitFeedbackFn = httpsCallable(functions, "submitFeedback");

      const result = await submitFeedbackFn({
        data: { rating, comment },
      });

      console.log(
        "✅ [feedbackCanisterService] submitFeedback raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback;
      };
      console.log(
        "✅ [feedbackCanisterService] submitFeedback extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error submitting feedback:",
        error,
      );
      throw new Error(`Failed to submit feedback: ${error}`);
    }
  },

  /**
   * Get all feedback (admin function)
   */
  async getAllFeedback(): Promise<AppFeedback[]> {
    console.log("🚀 [feedbackCanisterService] getAllFeedback called");
    try {
      const getAllFeedbackFn = httpsCallable(functions, "getAllFeedback");

      const result = await getAllFeedbackFn({
        data: {},
      });

      console.log(
        "✅ [feedbackCanisterService] getAllFeedback raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      console.log(
        "✅ [feedbackCanisterService] getAllFeedback extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting all feedback:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get my feedback
   */
  async getMyFeedback(): Promise<AppFeedback[]> {
    console.log("🚀 [feedbackCanisterService] getMyFeedback called");
    try {
      const getMyFeedbackFn = httpsCallable(functions, "getMyFeedback");

      const result = await getMyFeedbackFn({
        data: {},
      });

      console.log(
        "✅ [feedbackCanisterService] getMyFeedback raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      console.log(
        "✅ [feedbackCanisterService] getMyFeedback extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting my feedback:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    console.log("🚀 [feedbackCanisterService] getFeedbackStats called");
    try {
      const getFeedbackStatsFn = httpsCallable(functions, "getFeedbackStats");

      const result = await getFeedbackStatsFn({
        data: {},
      });

      console.log(
        "✅ [feedbackCanisterService] getFeedbackStats raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: FeedbackStats;
      };
      console.log(
        "✅ [feedbackCanisterService] getFeedbackStats extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting feedback stats:",
        error,
      );
      throw new Error(`Failed to get feedback stats: ${error}`);
    }
  },

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<AppFeedback> {
    console.log("🚀 [feedbackCanisterService] getFeedbackById called with:", {
      feedbackId,
    });
    try {
      const getFeedbackByIdFn = httpsCallable(functions, "getFeedbackById");

      const result = await getFeedbackByIdFn({
        data: { feedbackId },
      });

      console.log(
        "✅ [feedbackCanisterService] getFeedbackById raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback;
      };
      console.log(
        "✅ [feedbackCanisterService] getFeedbackById extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting feedback by ID:",
        error,
      );
      throw new Error(`Failed to get feedback by ID: ${error}`);
    }
  },

  /**
   * Get recent feedback (limited number)
   */
  async getRecentFeedback(limit: number): Promise<AppFeedback[]> {
    console.log("🚀 [feedbackCanisterService] getRecentFeedback called with:", {
      limit,
    });
    try {
      const getRecentFeedbackFn = httpsCallable(functions, "getRecentFeedback");

      const result = await getRecentFeedbackFn({
        data: { limit },
      });

      console.log(
        "✅ [feedbackCanisterService] getRecentFeedback raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      console.log(
        "✅ [feedbackCanisterService] getRecentFeedback extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting recent feedback:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  // ========== REPORT FUNCTIONS ==========

  /**
   * Submit report
   */
  async submitReport(description: string): Promise<AppReport> {
    console.log("🚀 [feedbackCanisterService] submitReport called with:", {
      description,
    });
    try {
      const submitReportFn = httpsCallable(functions, "submitReport");

      const result = await submitReportFn({
        data: { description },
      });

      console.log(
        "✅ [feedbackCanisterService] submitReport raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: AppReport };
      console.log(
        "✅ [feedbackCanisterService] submitReport extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error submitting report:",
        error,
      );
      throw new Error(`Failed to submit report: ${error}`);
    }
  },

  /**
   * Get all reports (admin function)
   */
  async getAllReports(): Promise<AppReport[]> {
    console.log("🚀 [feedbackCanisterService] getAllReports called");
    try {
      const getAllReportsFn = httpsCallable(functions, "getAllReports");

      const result = await getAllReportsFn({
        data: { data: {} },
      });

      console.log(
        "✅ [feedbackCanisterService] getAllReports raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };
      console.log(
        "✅ [feedbackCanisterService] getAllReports extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting all reports:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get my reports
   */
  async getMyReports(): Promise<AppReport[]> {
    console.log("🚀 [feedbackCanisterService] getMyReports called");
    try {
      const getMyReportsFn = httpsCallable(functions, "getMyReports");

      const result = await getMyReportsFn({
        data: {},
      });

      console.log(
        "✅ [feedbackCanisterService] getMyReports raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };
      console.log(
        "✅ [feedbackCanisterService] getMyReports extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting my reports:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Update report status (admin function)
   */
  async updateReportStatus(
    reportId: string,
    newStatus: string,
  ): Promise<AppReport> {
    console.log(
      "🚀 [feedbackCanisterService] updateReportStatus called with:",
      {
        reportId,
        newStatus,
      },
    );
    try {
      const updateReportStatusFn = httpsCallable(
        functions,
        "updateReportStatus",
      );

      const result = await updateReportStatusFn({
        data: { reportId, newStatus },
      });

      console.log(
        "✅ [feedbackCanisterService] updateReportStatus raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: AppReport };
      console.log(
        "✅ [feedbackCanisterService] updateReportStatus extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error updating report status:",
        error,
      );
      throw new Error(`Failed to update report status: ${error}`);
    }
  },

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<ReportStats> {
    console.log("🚀 [feedbackCanisterService] getReportStats called");
    try {
      const getReportStatsFn = httpsCallable(functions, "getReportStats");

      const result = await getReportStatsFn({
        data: {},
      });

      console.log(
        "✅ [feedbackCanisterService] getReportStats raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: ReportStats;
      };
      console.log(
        "✅ [feedbackCanisterService] getReportStats extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting report stats:",
        error,
      );
      throw new Error(`Failed to get report stats: ${error}`);
    }
  },

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<AppReport> {
    console.log("🚀 [feedbackCanisterService] getReportById called with:", {
      reportId,
    });
    try {
      const getReportByIdFn = httpsCallable(functions, "getReportById");

      const result = await getReportByIdFn({
        data: { data: { reportId } },
      });

      console.log(
        "✅ [feedbackCanisterService] getReportById raw result:",
        result,
      );
      const responseData = result.data as { success: boolean; data: AppReport };
      console.log(
        "✅ [feedbackCanisterService] getReportById extracted data:",
        responseData,
      );
      return responseData.data;
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting report by ID:",
        error,
      );
      throw new Error(`Failed to get report by ID: ${error}`);
    }
  },

  /**
   * Get recent reports (limited number)
   */
  async getRecentReports(limit: number): Promise<AppReport[]> {
    console.log("🚀 [feedbackCanisterService] getRecentReports called with:", {
      limit,
    });
    try {
      const getRecentReportsFn = httpsCallable(functions, "getRecentReports");

      const result = await getRecentReportsFn({
        data: { limit },
      });

      console.log(
        "✅ [feedbackCanisterService] getRecentReports raw result:",
        result,
      );
      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };
      console.log(
        "✅ [feedbackCanisterService] getRecentReports extracted data:",
        responseData,
      );
      return responseData.data || [];
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting recent reports:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get top rated feedback
   */
  async getTopRatedFeedback(limit: number = 10): Promise<AppFeedback[]> {
    try {
      const allFeedback = await this.getAllFeedback();
      const sortedFeedback = allFeedback.sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
        // If ratings are equal, sort by creation date (newest first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      return sortedFeedback.slice(0, limit);
    } catch (error) {
      console.error(
        "❌ [feedbackCanisterService] Error getting top rated feedback:",
        error,
      );
      return []; // Return empty array on error
    }
  },
};

// Firebase functions don't require actor management or reset functionality

export default feedbackCanisterService;
