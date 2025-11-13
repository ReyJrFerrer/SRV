import { httpsCallable } from "firebase/functions";
import { functions } from "./coreUtils";
import { callFirebaseFunction, requireAuth } from "./coreUtils";
import { AdminServiceError, FrontendUserRoleAssignment } from "./serviceTypes";
import reputationCanisterService from "../../../frontend/src/services/reputationCanisterService";

// User Role Management

/**
 * Assign admin role to a user
 */
export const assignRole = async (
  userId: string,
  scope?: string,
): Promise<string> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("assignRole", {
      userId,
      role: "ADMIN",
      scope,
    });
    return result.message || "Role assigned successfully";
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to assign admin role: ${error}`,
      code: "ASSIGN_ROLE_ERROR",
      details: error,
    });
  }
};

/**
 * Remove user role
 */
export const removeRole = async (userId: string): Promise<string> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("removeRole", { userId });
    return result.message || "Role removed successfully";
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to remove user role: ${error}`,
      code: "REMOVE_ROLE_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

/**
 * Get user role assignment
 */
export const getUserRole = async (
  userId: string,
): Promise<FrontendUserRoleAssignment | null> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getUserRole", { userId });

    if (!result) return null;

    return {
      userId: result.userId,
      role: "ADMIN",
      scope: result.scope,
      assignedBy: result.assignedBy,
      assignedAt: new Date(result.assignedAt),
    };
  } catch (error) {
    throw new AdminServiceError({
      message: `Failed to get user role: ${error}`,
      code: "GET_USER_ROLE_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

/**
 * Check if a user has admin role
 */
export const checkAdminRole = async (userId: string): Promise<boolean> => {
  try {
    const userRole = await getUserRole(userId);
    return userRole !== null && userRole.role === "ADMIN";
  } catch (error) {
    return false;
  }
};

/**
 * List all user role assignments
 */
export const listUserRoles = async (): Promise<
  FrontendUserRoleAssignment[]
> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("listUserRoles", {});

    if (!result || !Array.isArray(result)) return [];

    return result.map((assignment: any) => ({
      // Handle both userId field and id field (id is the document ID)
      userId: assignment.userId || assignment.id,
      role: "ADMIN" as const,
      scope: assignment.scope,
      assignedBy: assignment.assignedBy,
      assignedAt: new Date(assignment.assignedAt),
    }));
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to list user roles: ${error}`,
      code: "LIST_USER_ROLES_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

/**
 * Check if user has admin role
 */
export const hasAdminRole = async (userId: string): Promise<boolean> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("hasRole", {
      userId,
      role: "ADMIN",
    });
    return result === true;
  } catch (error) {
    return false;
  }
};

// User Management Functions

/**
 * Lock or unlock a user account with optional time-based suspension
 * @param userId - User ID to lock/unlock
 * @param locked - Whether to lock the account
 * @param suspensionDurationDays - Duration in days (7, 30, custom number, or null for indefinite)
 */
export const lockUserAccount = async (
  userId: string,
  locked: boolean,
  suspensionDurationDays?: number | null,
): Promise<string> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("lockUserAccount", {
      userId,
      locked,
      suspensionDurationDays: locked
        ? suspensionDurationDays !== undefined
          ? suspensionDurationDays
          : null
        : undefined,
    });
    return result || "User account updated successfully";
  } catch (error) {
    console.error("Error locking/unlocking user account:", error);
    throw new AdminServiceError({
      message: `Failed to lock/unlock user account: ${error}`,
      code: "LOCK_USER_ACCOUNT_ERROR",
      details: error,
    });
  }
};

/**
 * Get all user lock statuses from Firestore
 */
export const getAllUserLockStatuses = async (): Promise<
  Record<string, boolean>
> => {
  try {
    requireAuth();

    const callable = httpsCallable(functions, "getAllUserLockStatuses");
    const result = await callable({ data: {} });

    if ((result.data as any).success) {
      return (result.data as any).lockStatuses || {};
    } else {
      throw new Error(
        (result.data as any).message || "Failed to get user lock statuses",
      );
    }
  } catch (error) {
    console.error("Error getting user lock statuses:", error);
    throw new AdminServiceError({
      message: `Failed to get user lock statuses: ${error}`,
      code: "GET_USER_LOCK_STATUSES_ERROR",
      details: error,
    });
  }
};

/**
 * Update user reputation score
 */
export const updateUserReputation = async (
  userId: string,
  reputationScore: number,
): Promise<string> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("updateUserReputation", {
      userId,
      reputationScore,
    });
    return result || "User reputation updated successfully";
  } catch (error) {
    if (error instanceof AdminServiceError) throw error;
    throw new AdminServiceError({
      message: `Failed to update user reputation: ${error}`,
      code: "UPDATE_USER_REPUTATION_ERROR",
      details: error,
    });
  }
};

/**
 * Get user analytics (real data from backend)
 */
export const getUserAnalytics = async (
  userId: string,
): Promise<{
  totalEarnings: number;
  completedJobs: number;
  cancelledJobs: number;
  totalJobs: number;
  completionRate: number;
}> => {
  try {
    requireAuth();

    const result = await callFirebaseFunction("getProviderAnalytics", {
      providerId: userId,
      startDate: null,
      endDate: null,
    });

    return {
      totalEarnings: result.totalEarnings || 0,
      completedJobs: result.completedJobs || 0,
      cancelledJobs: result.cancelledJobs || 0,
      totalJobs: result.totalJobs || 0,
      completionRate: result.completionRate || 0,
    };
  } catch (error) {
    console.error("Error fetching user analytics", error);
    return {
      totalEarnings: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      totalJobs: 0,
      completionRate: 0,
    };
  }
};

/**
 * Get user reviews and rating
 */
export const getUserReviews = async (
  userId: string,
): Promise<{
  averageRating: number;
  totalReviews: number;
}> => {
  try {
    requireAuth();

    // Try to get reviews as both client and provider
    const [clientReviews, providerReviews] = await Promise.allSettled([
      callFirebaseFunction("getUserReviews", { userId }),
      callFirebaseFunction("getProviderReviews", { providerId: userId }),
    ]);

    // Combine reviews from both sources
    const allReviews = [];

    if (
      clientReviews.status === "fulfilled" &&
      Array.isArray(clientReviews.value)
    ) {
      allReviews.push(...clientReviews.value);
    }

    if (
      providerReviews.status === "fulfilled" &&
      Array.isArray(providerReviews.value)
    ) {
      allReviews.push(...providerReviews.value);
    }

    const totalReviews = allReviews.length;

    // Calculate average rating from all reviews
    let averageRating = 0;
    if (totalReviews > 0) {
      const validReviews = allReviews.filter(
        (review) =>
          review && typeof review.rating === "number" && review.rating > 0,
      );
      if (validReviews.length > 0) {
        const sum = validReviews.reduce(
          (acc, review) => acc + review.rating,
          0,
        );
        averageRating = sum / validReviews.length;
      }
    }

    return {
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews,
    };
  } catch (error) {
    console.error("Error fetching user reviews", error);
    return {
      averageRating: 0,
      totalReviews: 0,
    };
  }
};

/**
 * Get user reputation score (real data from backend)
 */
export const getUserReputation = async (
  userId: string,
): Promise<{
  reputationScore: number;
  trustLevel: string;
  completedBookings: number;
}> => {
  try {
    // Call IC canister directly using frontend service (same as clients/providers)
    const reputationData =
      await reputationCanisterService.getReputationScore(userId);

    if (reputationData) {
      // Convert the reputation data to match expected format
      const trustLevel = reputationData.trustLevel?.hasOwnProperty("New")
        ? "New"
        : reputationData.trustLevel?.hasOwnProperty("Low")
          ? "Low"
          : reputationData.trustLevel?.hasOwnProperty("Medium")
            ? "Medium"
            : reputationData.trustLevel?.hasOwnProperty("High")
              ? "High"
              : "VeryHigh";

      return {
        reputationScore: Math.round(Number(reputationData.trustScore)),
        trustLevel: trustLevel,
        completedBookings: Number(reputationData.completedBookings || 0),
      };
    } else {
      // Fallback to default values if data is invalid
      console.warn(
        `Invalid reputation data for user ${userId}:`,
        reputationData,
      );
      return {
        reputationScore: 50, // Default score
        trustLevel: "New",
        completedBookings: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching user reputation", error);
    // Return default reputation on error
    return {
      reputationScore: 50, // Default score
      trustLevel: "New",
      completedBookings: 0,
    };
  }
};

/**
 * Get user bookings (for admin booking history view)
 */
export const getUserBookings = async (
  userId: string,
): Promise<
  Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    providerId: string;
    providerName: string;
    status: string;
    price: number;
    createdAt: string;
    scheduledDate: string;
    completedAt?: string;
    rating?: number;
    review?: string;
    location?: string;
  }>
> => {
  try {
    requireAuth();

    // Get bookings from Firebase (both client and provider bookings)
    const [clientBookingsResult, providerBookingsResult] = await Promise.all([
      callFirebaseFunction("getClientBookings", { clientId: userId }),
      callFirebaseFunction("getProviderBookings", { providerId: userId }),
    ]);

    const clientBookings = clientBookingsResult || [];
    const providerBookings = providerBookingsResult || [];

    // Combine both arrays
    const allBookings = [...clientBookings, ...providerBookings];

    // Enrich bookings with provider and service names
    const enrichedBookings = await Promise.all(
      allBookings.map(async (booking) => {
        let providerName = "Unknown Provider";
        let serviceName = "Unknown Service";

        // Get provider name from Firebase
        if (booking.providerId) {
          try {
            const callable = httpsCallable(functions, "getProfile");
            const providerResponse = await callable({
              userId: booking.providerId,
            });
            if (
              (providerResponse.data as any).success &&
              (providerResponse.data as any).profile?.name
            ) {
              providerName = (providerResponse.data as any).profile.name;
            }
          } catch (error) {
            console.error("Error fetching provider name:", error);
          }
        }

        // Get service name from Firebase
        if (booking.serviceId) {
          try {
            const callable = httpsCallable(functions, "getService");
            const serviceResponse = await callable({
              serviceId: booking.serviceId,
            });
            if (
              (serviceResponse.data as any).success &&
              (serviceResponse.data as any).service?.title
            ) {
              serviceName = (serviceResponse.data as any).service.title;
            }
          } catch (error) {
            console.error("Error fetching service name:", error);
          }
        }

        return {
          id: booking.id || "",
          serviceId: booking.serviceId || "",
          serviceName: serviceName,
          providerId: booking.providerId || "",
          providerName: providerName,
          status: booking.status || "Unknown",
          price: Number(booking.price || 0),
          createdAt: booking.createdAt || new Date().toISOString(),
          scheduledDate:
            booking.scheduledDate ||
            booking.createdAt ||
            new Date().toISOString(),
          completedAt: booking.completedDate || undefined,
          rating: booking.rating ? Number(booking.rating) : undefined,
          review: booking.review || undefined,
          location: booking.location || undefined,
        };
      }),
    );

    return enrichedBookings;
  } catch (error) {
    console.error("Error fetching user bookings", error);
    throw new AdminServiceError({
      message: `Failed to fetch user bookings: ${error}`,
      code: "BOOKINGS_FETCH_ERROR",
    } as AdminServiceError);
  }
};
