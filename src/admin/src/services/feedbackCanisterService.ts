// Feedback Firebase Service
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";
import { resourceLimits } from "worker_threads";

// Get Firebase Functions instance from singleton
const functions = getFirebaseFunctions();

// Frontend-compatible interfaces
export interface AppFeedback {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Array<[number, number]>; // [rating, count] pairs
  totalWithComments: number;
  latestFeedback?: AppFeedback;
}

export interface SubmitFeedbackRequest {
  rating: number;
  comment?: string;
}

// Helper function to convert Firebase timestamps to Date
const convertToDate = (timestamp: any): Date => {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "string") return new Date(timestamp);
  if (typeof timestamp === "number") return new Date(timestamp);
  return new Date();
};

// Feedback Service Functions

/**
 * Get all feedback (admin function)
 * @returns Array of all feedback
 */
export const getAllFeedback = async (): Promise<AppFeedback[]> => {
  try {
    const getAllFeedbackFn = httpsCallable(functions, "getAllFeedback");
    const result = await getAllFeedbackFn({data:{}});
    console.log(result);

    const data = result.data as { success: boolean; feedback: AppFeedback[] };
    return data.success
      ? data.feedback.map((f) => ({
          ...f,
          createdAt: convertToDate(f.createdAt),
        }))
      : [];
  } catch (error) {
    console.error("Failed to get all feedback:", error);
    throw error;
  }
};

/**
 * Get current user's feedback
 * @returns Array of user's feedback
 */
export const getMyFeedback = async (): Promise<AppFeedback[]> => {
  try {
    const getMyFeedbackFn = httpsCallable(functions, "getMyFeedback");
    const result = await getMyFeedbackFn({data:{}});
    console.log(result);

    const data = result.data as { success: boolean; feedback: AppFeedback[] };
    return data.success
      ? data.feedback.map((f) => ({
          ...f,
          createdAt: convertToDate(f.createdAt),
        }))
      : [];
  } catch (error) {
    console.error("Failed to get user feedback:", error);
    throw error;
  }
};

/**
 * Get feedback statistics
 * @returns Feedback statistics
 */
export const getFeedbackStats = async (): Promise<FeedbackStats> => {
  try {
    const getFeedbackStatsFn = httpsCallable(functions, "getFeedbackStats");
    const result = await getFeedbackStatsFn({data:{}});
    console.log(result);

    const data = result.data as { success: boolean; stats: FeedbackStats };
    if (data.success && data.stats) {
      return {
        ...data.stats,
        latestFeedback: data.stats.latestFeedback
          ? {
              ...data.stats.latestFeedback,
              createdAt: convertToDate(data.stats.latestFeedback.createdAt),
            }
          : undefined,
      };
    }
    throw new Error("Failed to get feedback stats");
  } catch (error) {
    console.error("Failed to get feedback stats:", error);
    throw error;
  }
};

/**
 * Get recent feedback with a limit
 * @param limit Maximum number of feedback items to return
 * @returns Array of recent feedback
 */
export const getRecentFeedback = async (
  limit: number,
): Promise<AppFeedback[]> => {
  try {
    const getRecentFeedbackFn = httpsCallable(functions, "getRecentFeedback");
    const result = await getRecentFeedbackFn({ limit });
    console.log(result);

    const data = result.data as { success: boolean; feedback: AppFeedback[] };
    return data.success
      ? data.feedback.map((f) => ({
          ...f,
          createdAt: convertToDate(f.createdAt),
        }))
      : [];
  } catch (error) {
    console.error("Failed to get recent feedback:", error);
    throw error;
  }
};

/**
 * Get feedback by ID
 * @param feedbackId The feedback ID
 * @returns The feedback item
 */
export const getFeedbackById = async (
  feedbackId: string,
): Promise<AppFeedback> => {
  try {
    const getFeedbackByIdFn = httpsCallable(functions, "getFeedbackById");
    const result = await getFeedbackByIdFn({ feedbackId });
    console.log(result);

    const data = result.data as { success: boolean; feedback: AppFeedback };
    if (data.success && data.feedback) {
      return {
        ...data.feedback,
        createdAt: convertToDate(data.feedback.createdAt),
      };
    }
    throw new Error("Feedback not found");
  } catch (error) {
    console.error("Failed to get feedback by ID:", error);
    throw error;
  }
};

export default {
  getAllFeedback,
  getMyFeedback,
  getFeedbackStats,
  getRecentFeedback,
  getFeedbackById,
};
