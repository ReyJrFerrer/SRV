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
  attachments?: string[]; // Media URLs for report screenshots/attachments
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
    try {
      const submitFeedbackFn = httpsCallable(functions, "submitFeedback");

      const result = await submitFeedbackFn({
        data: { rating, comment },
      });

      const responseData = result.data as {
        success: boolean;
        data: AppFeedback;
      };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to submit feedback: ${error}`);
    }
  },

  /**
   * Get all feedback (admin function)
   */
  async getAllFeedback(): Promise<AppFeedback[]> {
    try {
      const getAllFeedbackFn = httpsCallable(functions, "getAllFeedback");

      const result = await getAllFeedbackFn({
        data: {},
      });

      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get my feedback
   */
  async getMyFeedback(): Promise<AppFeedback[]> {
    try {
      const getMyFeedbackFn = httpsCallable(functions, "getMyFeedback");

      const result = await getMyFeedbackFn({
        data: {},
      });

      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const getFeedbackStatsFn = httpsCallable(functions, "getFeedbackStats");

      const result = await getFeedbackStatsFn({
        data: {},
      });

      const responseData = result.data as {
        success: boolean;
        data: FeedbackStats;
      };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get feedback stats: ${error}`);
    }
  },

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<AppFeedback> {

    try {
      const getFeedbackByIdFn = httpsCallable(functions, "getFeedbackById");

      const result = await getFeedbackByIdFn({
        data: { feedbackId },
      });
      const responseData = result.data as {
        success: boolean;
        data: AppFeedback;
      };
 
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get feedback by ID: ${error}`);
    }
  },

  /**
   * Get recent feedback (limited number)
   */
  async getRecentFeedback(limit: number): Promise<AppFeedback[]> {
    try {
      const getRecentFeedbackFn = httpsCallable(functions, "getRecentFeedback");

      const result = await getRecentFeedbackFn({
        data: { limit },
      });

      const responseData = result.data as {
        success: boolean;
        data: AppFeedback[];
      };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  // ========== REPORT FUNCTIONS ==========

  /**
   * Submit report
   */
  async submitReport(
    description: string,
    attachments: string[] = [],
  ): Promise<AppReport> {
    try {
      const submitReportFn = httpsCallable(functions, "submitReport");

      // Send the description and attachments - backend will handle JSON parsing if needed
      const result = await submitReportFn({
        data: { description, attachments },
      });

      const responseData = result.data as { success: boolean; data: AppReport };
      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to submit report: ${error}`);
    }
  },

  /**
   * Get all reports (admin function)
   */
  async getAllReports(): Promise<AppReport[]> {
    try {
      const getAllReportsFn = httpsCallable(functions, "getAllReports");

      const result = await getAllReportsFn({
        data: { data: {} },
      });

      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };
      return responseData.data || [];
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get my reports
   */
  async getMyReports(): Promise<AppReport[]> {
    try {
      const getMyReportsFn = httpsCallable(functions, "getMyReports");

      const result = await getMyReportsFn({
        data: {},
      });

      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };

      return responseData.data || [];
    } catch (error) {
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
    try {
      const updateReportStatusFn = httpsCallable(
        functions,
        "updateReportStatus",
      );

      const result = await updateReportStatusFn({
        data: { reportId, newStatus },
      });

      const responseData = result.data as { success: boolean; data: AppReport };

      return responseData.data;
    } catch (error) {

      throw new Error(`Failed to update report status: ${error}`);
    }
  },

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<ReportStats> {
    try {
      const getReportStatsFn = httpsCallable(functions, "getReportStats");

      const result = await getReportStatsFn({
        data: {},
      });

      const responseData = result.data as {
        success: boolean;
        data: ReportStats;
      };

      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get report stats: ${error}`);
    }
  },

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<AppReport> {

    try {
      const getReportByIdFn = httpsCallable(functions, "getReportById");

      const result = await getReportByIdFn({
        data: { data: { reportId } },
      });


      const responseData = result.data as { success: boolean; data: AppReport };

      return responseData.data;
    } catch (error) {
      throw new Error(`Failed to get report by ID: ${error}`);
    }
  },

  /**
   * Get recent reports (limited number)
   */
  async getRecentReports(limit: number): Promise<AppReport[]> {
    try {
      const getRecentReportsFn = httpsCallable(functions, "getRecentReports");

      const result = await getRecentReportsFn({
        data: { limit },
      });

      const responseData = result.data as {
        success: boolean;
        data: AppReport[];
      };
      return responseData.data || [];
    } catch (error) {
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
      return []; // Return empty array on error
    }
  },
};

// Firebase functions don't require actor management or reset functionality

export default feedbackCanisterService;
