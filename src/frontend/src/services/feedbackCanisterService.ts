/**
 * Feedback Firebase Service
 *
 * This service provides functions to interact with feedback-related Firebase Cloud Functions.
 * It replaces the previous canister-based service with Firebase Firestore and Cloud Functions.
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

// Get Firebase functions instance using proper helper
const getFunctions = () => getFirebaseFunctions();

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

// Feedback Firebase Service Functions
export const feedbackCanisterService = {
  /**
   * Submit feedback
   */
  async submitFeedback(
    rating: number,
    comment?: string,
  ): Promise<AppFeedback | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "submitFeedback",
        payload: { rating, comment },
      });

      const data = result.data as { success: boolean; data: AppFeedback };
      return data.success ? data.data : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all feedback (admin function)
   */
  async getAllFeedback(): Promise<AppFeedback[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getAllFeedback",
        payload: {},
      });

      const data = result.data as { success: boolean; data: AppFeedback[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get my feedback
   */
  async getMyFeedback(): Promise<AppFeedback[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getMyFeedback",
        payload: {},
      });

      const data = result.data as { success: boolean; data: AppFeedback[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getFeedbackStats",
        payload: {},
      });

      const data = result.data as { success: boolean; data: FeedbackStats };
      return data.success ? data.data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<AppFeedback | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getFeedbackById",
        payload: { feedbackId },
      });

      const data = result.data as { success: boolean; data: AppFeedback };
      return data.success ? data.data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get recent feedback (limited number)
   */
  async getRecentFeedback(limit: number): Promise<AppFeedback[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getRecentFeedback",
        payload: { limit },
      });

      const data = result.data as { success: boolean; data: AppFeedback[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
    }
  },

  // ========== REPORT FUNCTIONS ==========

  /**
   * Submit report
   */
  async submitReport(
    description: string,
    attachments: string[] = [],
  ): Promise<AppReport | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "submitReport",
        payload: { description, attachments },
      });

      const data = result.data as { success: boolean; data: AppReport };
      return data.success ? data.data : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all reports (admin function)
   */
  async getAllReports(): Promise<AppReport[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getAllReports",
        payload: {},
      });

      const data = result.data as { success: boolean; data: AppReport[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get my reports
   */
  async getMyReports(): Promise<AppReport[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getMyReports",
        payload: {},
      });

      const data = result.data as { success: boolean; data: AppReport[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Update report status (admin function)
   */
  async updateReportStatus(
    reportId: string,
    newStatus: string,
  ): Promise<AppReport | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "updateReportStatus",
        payload: { reportId, newStatus },
      });

      const data = result.data as { success: boolean; data: AppReport };
      return data.success ? data.data : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<ReportStats | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getReportStats",
        payload: {},
      });

      const data = result.data as { success: boolean; data: ReportStats };
      return data.success ? data.data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get report by ID
   */
  async getReportById(reportId: string): Promise<AppReport | null> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getReportById",
        payload: { reportId },
      });

      const data = result.data as { success: boolean; data: AppReport };
      return data.success ? data.data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get recent reports (limited number)
   */
  async getRecentReports(limit: number): Promise<AppReport[]> {
    try {
      const feedbackActionFn = httpsCallable(getFunctions(), "feedbackAction");
      const result = await feedbackActionFn({
        action: "getRecentReports",
        payload: { limit },
      });

      const data = result.data as { success: boolean; data: AppReport[] };
      return data.success ? data.data : [];
    } catch (error) {
      return [];
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
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      return sortedFeedback.slice(0, limit);
    } catch (error) {
      return [];
    }
  },
};

export default feedbackCanisterService;
