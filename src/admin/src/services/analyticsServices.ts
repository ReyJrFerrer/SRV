import { httpsCallable } from "firebase/functions";
import { functions } from "./coreUtils";
import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";
import { AdminServiceError, FrontendSystemStats } from "./serviceTypes";

/**
 * Get system statistics
 */
export const getSystemStats = async (): Promise<FrontendSystemStats> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getSystemStats", {});

    return {
      totalCommissionRules: result.totalCommissionRules,
      activeCommissionRules: result.activeCommissionRules,
      totalUsersWithRoles: result.totalUsersWithRoles,
      adminUsers: result.adminUsers,
      totalBookings: result.totalBookings,
      settledBookings: result.settledBookings,
      totalRevenue: result.totalRevenue,
      totalCommission: result.totalCommission,
      totalTopups: result.totalTopups || 0,
    };
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to get system statistics: ${error}`,
      code: "GET_SYSTEM_STATS_ERROR",
      details: error,
    });
  }
};

/**
 * Get all users from the system
 */
export const getAllUsers = async (): Promise<any[]> => {
  try {
    requireAuth();

    // Call Firebase function directly since callFirebaseFunction expects { success: true, data: [...] }
    // but getAllUsers returns { success: true, users: [...] }
    const callable = httpsCallable(functions, "getAllUsers");
    const result = await callable({ data: {} });

    if ((result.data as any).success) {
      const users = (result.data as any).users || [];
      return users;
    } else {
      const errorMsg = (result.data as any).message || "Failed to get users";
      console.error("[getAllUsers] Error:", errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error("[getAllUsers] Error getting all users:", error);
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to get users: ${error instanceof Error ? error.message : String(error)}`,
      code: "GET_ALL_USERS_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

export const getBookingsData = async (): Promise<{
  bookings: any[];
  commissionTransactions: any[];
}> => {
  try {
    requireAuth();

    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const idToken = await user.getIdToken();
    const functionsInstance = getFirebaseFunctions();
    const projectId = functionsInstance.app.options.projectId || "devsrv-rey";
    const region = "us-central1";

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const baseUrl = isLocal
      ? `http://127.0.0.1:5001/${projectId}/${region}`
      : `https://${region}-${projectId}.cloudfunctions.net`;

    const url = `${baseUrl}/getBookingsData`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ data: {} }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    const result = await response.json();

    if (result.success) {
      return {
        bookings: result.bookings || [],
        commissionTransactions: result.commissionTransactions || [],
      };
    } else {
      throw new Error(
        result.message || result.error || "Failed to get bookings data",
      );
    }
  } catch (error: any) {
    const isNetworkError =
      error?.code === "ERR_FAILED" ||
      error?.message?.includes("CORS") ||
      error?.message === "Failed to fetch" ||
      error?.name === "TypeError" ||
      error?.name === "FirebaseError" ||
      (error?.code && error.code.includes("internal"));

    if (!isNetworkError) {
      console.error("[getBookingsData] Error getting bookings data:", error);
    }
    return { bookings: [], commissionTransactions: [] };
  }
};
