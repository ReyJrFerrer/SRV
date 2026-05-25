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

    const result = await callFirebaseFunction("adminUserAction", {
      action: "getSystemStats",
      data: {},
    });

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

    // Call Firebase function directly
    const callable = httpsCallable(functions, "adminUserAction");
    const result = await callable({ action: "getAllUsers", data: {} });

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

    const result = await callFirebaseFunction("adminUserAction", {
      action: "getBookingsData",
      data: {},
    });

    if (!result) {
      return { bookings: [], commissionTransactions: [] };
    }

    return {
      bookings: result.bookings || [],
      commissionTransactions: result.commissionTransactions || [],
    };
  } catch (error: any) {
    console.error("[getBookingsData] Error getting bookings data:", error);
    throw new AdminServiceError({
      message: error.message || "Failed to get bookings data",
      code: "GET_BOOKINGS_DATA_ERROR",
      details: error,
    });
  }
};
