import { httpsCallable } from "firebase/functions";
import { functions } from "./coreUtils";
import { callFirebaseFunction, requireAuth } from "./coreUtils";
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

    const callable = httpsCallable(functions, "getBookingsData");
    const result = await callable({ data: {} });

    if ((result.data as any).success) {
      return {
        bookings: (result.data as any).bookings,
        commissionTransactions: (result.data as any).commissionTransactions,
      };
    } else {
      console.error(
        "[getBookingsData] Error response:",
        (result.data as any).message,
      );
      throw new Error(
        (result.data as any).message || "Failed to get bookings data",
      );
    }
  } catch (error: any) {
    // Suppress CORS errors in emulator - data gracefully falls back to systemStats
    const isNetworkError =
      error?.code === "ERR_FAILED" ||
      error?.message?.includes("CORS") ||
      error?.name === "FirebaseError" ||
      (error?.code && error.code.includes("internal"));

    if (!isNetworkError) {
      console.error("[getBookingsData] Error getting bookings data:", error);
    }
    return { bookings: [], commissionTransactions: [] };
  }
};
