// Admin Service Firebase Interface
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";
// Keep some Motoko types for compatibility during migration
import { notificationCanisterService } from "../../../frontend/src/services/notificationCanisterService";
import reputationCanisterService from "../../../frontend/src/services/reputationCanisterService";

// Get Firebase instances from singleton
const auth = getFirebaseAuth();
const functions = getFirebaseFunctions();

// ===== HELPER FUNCTIONS =====

// Helper function to create AdminServiceError
const createAdminError = (
  message: string,
  code: string,
  details?: any,
): AdminServiceError => {
  return new AdminServiceError({
    message,
    code,
    details,
  } as AdminServiceError);
};

// Helper function for success logging
const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

// Helper function for error logging
const logError = (message: string, error?: any) => {
  console.error(`❌ ${message}`, error);
};

// Service data conversion functions (matching provider implementation)
export interface ServiceData {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  type: string;
  price: number;
  currency: string;
  duration?: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  scheduledDate?: Date;
  completedDate?: Date;
  createdDate: Date;
  clientId?: string;
  clientName?: string;
  providerId?: string;
  providerName?: string;
  rating?: number;
  reviewCount?: number;
  imageUrls: string[];
  certificateUrls: string[];
  weeklySchedule: Array<{
    dayOfWeek: number;
    availability: {
      isAvailable: boolean;
      slots: Array<{
        startTime: string;
        endTime: string;
      }>;
    };
  }>;
  packages: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    duration?: number;
  }>;
}

// Frontend-adapted types for better usability
export interface FrontendCommissionRule {
  id: string;
  serviceTypes: string[];
  paymentMethods: string[];
  formula: {
    type: "Flat" | "Percentage" | "Tiered" | "Hybrid";
    value: number;
    base?: number; // for Hybrid
    tiers?: Array<{ threshold: number; rate: number }>; // for Tiered
  };
  minCommission?: number;
  maxCommission?: number;
  priority: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface FrontendCommissionRuleDraft {
  id?: string;
  serviceTypes: string[];
  paymentMethods: string[];
  formula: {
    type: "Flat" | "Percentage" | "Tiered" | "Hybrid";
    value: number;
    base?: number;
    tiers?: Array<{ threshold: number; rate: number }>;
  };
  minCommission?: number;
  maxCommission?: number;
  priority: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface FrontendSystemSettings {
  corporateGcashAccount: string;
  settlementDeadlineHours: number;
  maxCommissionRateBps: number;
  minOrderAmount: number;
  maxOrderAmount: number;
  updatedAt: Date;
  updatedBy: string;
}

export interface FrontendUserRoleAssignment {
  userId: string;
  role: "ADMIN";
  scope?: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface FrontendMediaItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  contentType: string;
  mediaType: "ServiceImage" | "UserProfile" | "ServiceCertificate";
  fileSize: number;
  ownerId: string;
  validationStatus?: "Pending" | "Validated" | "Rejected"; // Only for ServiceCertificate
  createdAt: Date;
  updatedAt: Date;
}

export interface FrontendSystemStats {
  totalCommissionRules: number;
  activeCommissionRules: number;
  totalUsersWithRoles: number;
  adminUsers: number;
  totalBookings: number;
  settledBookings: number;
  totalRevenue: number;
  totalCommission: number;
  totalTopups: number;
}

export class AdminServiceError extends Error {
  public code: string;
  public details?: any;

  constructor(options: { message: string; code: string; details?: any }) {
    super(options.message);
    this.name = "AdminServiceError";
    this.code = options.code;
    this.details = options.details;
  }
}

/**
 * Helper function to call Firebase Cloud Functions
 * Follows the established pattern of wrapping payload in data object
 */
const callFirebaseFunction = async (functionName: string, payload: any) => {
  try {
    requireAuth(); // Ensure user is authenticated
    const callable = httpsCallable(functions, functionName);

    // Call the function with data directly (admin.js expects: data.data || data)
    const result = await callable(payload);

    if ((result.data as any).success) {
      return (result.data as any).data || (result.data as any).message;
    } else {
      throw new Error((result.data as any).message || "Function call failed");
    }
  } catch (error: any) {
    console.error(`Error calling ${functionName}:`, error);
    throw new AdminServiceError({
      message: error.message || `Failed to call ${functionName}`,
      code: error.code || "FIREBASE_FUNCTION_ERROR",
      details: error,
    } as AdminServiceError);
  }
};

/**
 * Updates the current identity (compatibility function)
 * Note: Admin service uses Firebase auth, not IC identity
 */
export const updateAdminActor = (_identity: any) => {
  // Admin service uses Firebase authentication, not IC identity
  return null; // Firebase doesn't use actors
};

/**
 * Check if user is authenticated
 */
const requireAuth = () => {
  if (!auth.currentUser) {
    throw createAdminError(
      "Authentication required: Please log in as an admin to perform this action",
      "AUTH_REQUIRED",
    );
  }
};

/**
 * Helper function to send ticket status update notification
 * Sends to both client and provider if ticket is related to a booking
 */
const sendTicketStatusNotification = async (
  userId: string,
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  ticketTitle: string,
) => {
  try {
    const statusText = newStatus
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const title = "Ticket Status Updated";
    const message = `Your ticket "${ticketTitle}" status has been updated from ${oldStatus} to ${statusText}.`;

    // Fetch the report to check if it's related to a booking and determine user type
    let relatedProviderId: string | undefined;
    let relatedClientId: string | undefined;
    let userType: "client" | "provider" = "client";

    try {
      // Use getReportById instead of getAllReports for better performance
      // The Firebase function expects: data.data.data || data, so we wrap in data
      const result = await callFirebaseFunction("getReportById", {
        data: { reportId: ticketId },
      });
      if (result) {
        const report = result as any;
        // Parse the description to check for booking-related data and source
        try {
          const parsedData = JSON.parse(report.description || "{}");

          // Determine user type based on source (always check this)
          if (
            parsedData.source === "provider_report" ||
            parsedData.source === "provider_cancellation"
          ) {
            userType = "provider";
          } else if (
            parsedData.source === "client_report" ||
            parsedData.source === "client_cancellation"
          ) {
            userType = "client";
          }

          // If ticket is related to a booking, get the related parties
          if (parsedData.bookingId) {
            relatedProviderId = parsedData.providerId;
            relatedClientId = parsedData.clientId;
          }
        } catch (e) {
          // Description might not be JSON, default to client
          console.warn("Could not parse report description:", e);
        }
      }
    } catch (e) {
      console.warn("Could not fetch report data for notification:", e);
      // Continue with default userType if we can't fetch the report
    }

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined, // No related entity ID to prevent navigation
      {
        ticketId,
        oldStatus,
        newStatus,
        ticketTitle,
      },
    );

    console.log(
      `✅ [sendTicketStatusNotification] Notification sent to user ${userId} (${userType}) for ticket ${ticketId}`,
    );

    // If ticket is related to a booking, send notification to the other party
    if (relatedProviderId && relatedClientId) {
      const otherPartyId =
        userId === relatedClientId ? relatedProviderId : relatedClientId;
      const otherPartyType = userId === relatedClientId ? "provider" : "client";

      if (otherPartyId && otherPartyId !== userId) {
        // Add a small delay to avoid rate limiting when sending multiple notifications
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          await notificationCanisterService.createNotification(
            otherPartyId,
            otherPartyType,
            "generic",
            title,
            message,
            undefined,
            {
              ticketId,
              oldStatus,
              newStatus,
              ticketTitle,
            },
          );
          console.log(
            `✅ [sendTicketStatusNotification] Notification sent to related party ${otherPartyId} (${otherPartyType}) for ticket ${ticketId}`,
          );
        } catch (otherPartyError) {
          console.error(
            `⚠️ [sendTicketStatusNotification] Failed to notify related party ${otherPartyId}:`,
            otherPartyError,
          );
          // Don't throw - the main notification was sent successfully
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ [sendTicketStatusNotification] Error sending notification:",
      error,
    );
    // Don't throw error to avoid breaking the main flow
  }
};

/**
 * Helper function to send ticket comment notification
 * Sends to both client and provider if ticket is related to a booking
 */
const sendTicketCommentNotification = async (
  userId: string,
  ticketId: string,
  ticketTitle: string,
  commentText: string,
  isInternal: boolean = false,
) => {
  try {
    const title = isInternal ? "Internal Comment Added" : "New Comment Added";
    const message = isInternal
      ? `An internal comment has been added to your ticket "${ticketTitle}".`
      : `A new comment has been added to your ticket "${ticketTitle}": "${commentText.substring(0, 100)}${commentText.length > 100 ? "..." : ""}"`;

    // Fetch the report to check if it's related to a booking and determine user type
    let relatedProviderId: string | undefined;
    let relatedClientId: string | undefined;
    let userType: "client" | "provider" = "client";

    try {
      // Use getReportById instead of getAllReports for better performance
      // The Firebase function expects: data.data.data || data, so we wrap in data
      const result = await callFirebaseFunction("getReportById", {
        data: { reportId: ticketId },
      });
      if (result) {
        const report = result as any;
        // Parse the description to check for booking-related data and source
        try {
          const parsedData = JSON.parse(report.description || "{}");

          // Determine user type based on source (always check this)
          if (
            parsedData.source === "provider_report" ||
            parsedData.source === "provider_cancellation"
          ) {
            userType = "provider";
          } else if (
            parsedData.source === "client_report" ||
            parsedData.source === "client_cancellation"
          ) {
            userType = "client";
          }

          // If ticket is related to a booking, get the related parties
          if (parsedData.bookingId) {
            relatedProviderId = parsedData.providerId;
            relatedClientId = parsedData.clientId;
          }
        } catch (e) {
          // Description might not be JSON, default to client
          console.warn("Could not parse report description:", e);
        }
      }
    } catch (e) {
      console.warn("Could not fetch report data for notification:", e);
      // Continue with default userType if we can't fetch the report
    }

    // Send notification to the ticket submitter
    await notificationCanisterService.createNotification(
      userId,
      userType,
      "generic",
      title,
      message,
      undefined, // No related entity ID to prevent navigation
      {
        ticketId,
        ticketTitle,
        commentText,
        isInternal,
      },
    );

    console.log(
      `✅ [sendTicketCommentNotification] Notification sent to user ${userId} (${userType}) for ticket ${ticketId}`,
    );

    // If ticket is related to a booking, send notification to the other party
    if (relatedProviderId && relatedClientId) {
      const otherPartyId =
        userId === relatedClientId ? relatedProviderId : relatedClientId;
      const otherPartyType = userId === relatedClientId ? "provider" : "client";

      if (otherPartyId && otherPartyId !== userId) {
        // Add a small delay to avoid rate limiting when sending multiple notifications
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          await notificationCanisterService.createNotification(
            otherPartyId,
            otherPartyType,
            "generic",
            title,
            message,
            undefined,
            {
              ticketId,
              ticketTitle,
              commentText,
              isInternal,
            },
          );
          console.log(
            `✅ [sendTicketCommentNotification] Notification sent to related party ${otherPartyId} (${otherPartyType}) for ticket ${ticketId}`,
          );
        } catch (otherPartyError) {
          console.error(
            `⚠️ [sendTicketCommentNotification] Failed to notify related party ${otherPartyId}:`,
            otherPartyError,
          );
          // Don't throw - the main notification was sent successfully
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ [sendTicketCommentNotification] Error sending notification:",
      error,
    );
    // Don't throw error to avoid breaking the main flow
  }
};

// Main service object
export const adminServiceCanister = {
  // Commission Rules Management

  /**
   * Create or update commission rules
   */
  async upsertCommissionRules(
    rules: FrontendCommissionRuleDraft[],
  ): Promise<FrontendCommissionRule[]> {
    try {
      requireAuth();

      // Convert frontend rules to proper format for Firebase
      const rulesPayload = rules.map((rule) => ({
        id: rule.id,
        serviceTypes: rule.serviceTypes,
        paymentMethods: ["CashOnHand"], // Simplified for Firebase
        formula: rule.formula,
        minCommission: rule.minCommission,
        maxCommission: rule.maxCommission,
        priority: rule.priority,
        effectiveFrom: rule.effectiveFrom.toISOString(),
        effectiveTo: rule.effectiveTo?.toISOString(),
      }));

      const result = await callFirebaseFunction("upsertCommissionRules", {
        rules: rulesPayload,
      });

      // Convert Firebase result to frontend format
      return result.map((rule: any) => ({
        id: rule.id,
        serviceTypes: rule.serviceTypes,
        paymentMethods: rule.paymentMethods,
        formula: rule.formula,
        minCommission: rule.minCommission,
        maxCommission: rule.maxCommission,
        priority: rule.priority,
        isActive: rule.isActive,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
        createdAt: new Date(rule.createdAt),
        updatedAt: new Date(rule.updatedAt),
        version: rule.version,
      }));
    } catch (error) {
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to create/update commission rules: ${error}`,
        code: "UPSERT_RULES_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get all commission rules with optional filtering
   */
  async listRules(filter?: {
    serviceType?: string;
    activeOnly?: boolean;
    paymentMethod?: string;
  }): Promise<FrontendCommissionRule[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("listRules", {
        filter: {
          serviceType: filter?.serviceType,
          activeOnly: filter?.activeOnly,
          paymentMethod: filter?.paymentMethod,
        },
      });

      // Convert Firebase result to frontend format
      return result.map((rule: any) => ({
        id: rule.id,
        serviceTypes: rule.serviceTypes,
        paymentMethods: rule.paymentMethods,
        formula: rule.formula,
        minCommission: rule.minCommission,
        maxCommission: rule.maxCommission,
        priority: rule.priority,
        isActive: rule.isActive,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
        createdAt: new Date(rule.createdAt),
        updatedAt: new Date(rule.updatedAt),
        version: rule.version,
      }));
    } catch (error) {
      throw new AdminServiceError({
        message: `Failed to list commission rules: ${error}`,
        code: "LIST_RULES_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get a specific commission rule by ID
   */
  async getRule(ruleId: string): Promise<FrontendCommissionRule | null> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getRule", { ruleId });

      if (!result) return null;

      // Convert Firebase result to frontend format
      return {
        id: result.id,
        serviceTypes: result.serviceTypes,
        paymentMethods: result.paymentMethods,
        formula: result.formula,
        minCommission: result.minCommission,
        maxCommission: result.maxCommission,
        priority: result.priority,
        isActive: result.isActive,
        effectiveFrom: new Date(result.effectiveFrom),
        effectiveTo: result.effectiveTo
          ? new Date(result.effectiveTo)
          : undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        version: result.version,
      };
    } catch (error) {
      throw new AdminServiceError({
        message: `Failed to get commission rule: ${error}`,
        code: "GET_RULE_ERROR",
        details: error,
      });
    }
  },

  /**
   * Activate a specific commission rule version
   */
  async activateRule(ruleId: string, version: number): Promise<string> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("activateRule", {
        ruleId,
        version,
      });
      return result.message || "Rule activated successfully";
    } catch (error) {
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to activate commission rule: ${error}`,
        code: "ACTIVATE_RULE_ERROR",
        details: error,
      });
    }
  },

  /**
   * Deactivate a commission rule
   */
  async deactivateRule(ruleId: string): Promise<string> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("deactivateRule", { ruleId });
      return result.message || "Rule deactivated successfully";
    } catch (error) {
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to deactivate commission rule: ${error}`,
        code: "DEACTIVATE_RULE_ERROR",
        details: error,
      });
    }
  },

  // User Role Management

  /**
   * Assign admin role to a user
   */
  async assignRole(userId: string, scope?: string): Promise<string> {
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
  },

  /**
   * Remove user role
   */
  async removeRole(userId: string): Promise<string> {
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
  },

  /**
   * Get user role assignment
   */
  async getUserRole(
    userId: string,
  ): Promise<FrontendUserRoleAssignment | null> {
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
  },

  /**
   * Check if a user has admin role
   */
  async checkAdminRole(userId: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(userId);
      return userRole !== null && userRole.role === "ADMIN";
    } catch (error) {
      return false;
    }
  },

  /**
   * List all user role assignments
   */
  async listUserRoles(): Promise<FrontendUserRoleAssignment[]> {
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
  },

  /**
   * Check if user has admin role
   */
  async hasAdminRole(userId: string): Promise<boolean> {
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
  },

  // System Settings Management

  /**
   * Update system settings
   */
  async setSettings(settings: {
    corporateGcashAccount?: string;
    settlementDeadlineHours?: number;
    maxCommissionRateBps?: number;
    minOrderAmount?: number;
    maxOrderAmount?: number;
  }): Promise<string> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("setSettings", settings);
      return result || "System settings updated successfully";
    } catch (error) {
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to update system settings: ${error}`,
        code: "SET_SETTINGS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  /**
   * Get current system settings
   */
  async getSettings(): Promise<FrontendSystemSettings> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getSettings", {});

      return {
        corporateGcashAccount: result.corporateGcashAccount,
        settlementDeadlineHours: result.settlementDeadlineHours,
        maxCommissionRateBps: result.maxCommissionRateBps,
        minOrderAmount: result.minOrderAmount,
        maxOrderAmount: result.maxOrderAmount,
        updatedAt: new Date(result.updatedAt),
        updatedBy: result.updatedBy,
      };
    } catch (error) {
      throw new AdminServiceError({
        message: `Failed to get system settings: ${error}`,
        code: "GET_SETTINGS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  // Analytics & Reporting

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<FrontendSystemStats> {
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
      } as AdminServiceError);
    }
  },

  /**
   * Get all users from the system
   */
  async getAllUsers(): Promise<any[]> {
    try {
      requireAuth();

      console.log("🔍 [getAllUsers] Calling Firebase function...");
      // Call Firebase function directly since callFirebaseFunction expects { success: true, data: [...] }
      // but getAllUsers returns { success: true, users: [...] }
      const callable = httpsCallable(functions, "getAllUsers");
      const result = await callable({ data: {} });

      console.log("🔍 [getAllUsers] Firebase function result:", result.data);

      if ((result.data as any).success) {
        const users = (result.data as any).users || [];
        console.log(
          `🔍 [getAllUsers] Successfully retrieved ${users.length} users`,
        );
        return users;
      } else {
        const errorMsg = (result.data as any).message || "Failed to get users";
        console.error("🔍 [getAllUsers] Error:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("❌ [getAllUsers] Error getting all users:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to get users: ${error instanceof Error ? error.message : String(error)}`,
        code: "GET_ALL_USERS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  async getBookingsData(): Promise<{
    bookings: any[];
    commissionTransactions: any[];
  }> {
    try {
      console.log("🔍 [getBookingsData] Starting...");
      requireAuth();
      console.log("🔍 [getBookingsData] Auth passed");

      const callable = httpsCallable(functions, "getBookingsData");
      console.log("🔍 [getBookingsData] Calling Firebase function...");
      const result = await callable({ data: {} });
      console.log(
        "🔍 [getBookingsData] Firebase function result:",
        result.data,
      );

      if ((result.data as any).success) {
        console.log("🔍 [getBookingsData] Success response received");
        return {
          bookings: (result.data as any).bookings,
          commissionTransactions: (result.data as any).commissionTransactions,
        };
      } else {
        console.error(
          "🔍 [getBookingsData] Error response:",
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
        console.error(
          "❌ [getBookingsData] Error getting bookings data:",
          error,
        );
      }
      return { bookings: [], commissionTransactions: [] };
    }
  },

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<void> {
    try {
      requireAuth();

      await callFirebaseFunction("deleteService", { serviceId });
      logSuccess(`Service ${serviceId} deleted successfully`);
    } catch (error) {
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to delete service: ${error}`,
        code: "DELETE_SERVICE_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get service packages for a specific service
   */
  /**
   * Get service packages for a specific service
   */
  async getServicePackages(serviceId: string): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getServicePackages", {
        serviceId,
      });
      return result || [];
    } catch (error) {
      logError("Error getting service packages", error);
      return [];
    }
  },

  // Get service data from Firebase
  async getServiceData(serviceId: string): Promise<ServiceData | null> {
    try {
      requireAuth();

      const service = await callFirebaseFunction("getService", { serviceId });

      if (!service) return null;

      // Convert Firebase service to ServiceData format
      const serviceData: ServiceData = {
        id: service.id,
        title: service.title,
        description: service.description,
        category: service.category?.name || "General",
        status: service.status || "Available",
        type: "offered",
        price: service.price || 0,
        currency: "PHP",
        duration: undefined,
        location: service.location,
        scheduledDate: undefined,
        completedDate: undefined,
        createdDate: service.createdAt
          ? new Date(service.createdAt)
          : new Date(),
        clientId: undefined,
        clientName: undefined,
        providerId: service.providerId,
        providerName: "Service Provider",
        rating: service.rating,
        reviewCount: service.reviewCount,
        imageUrls: service.imageUrls || [],
        certificateUrls: service.certificateUrls || [],
        weeklySchedule: service.weeklySchedule || [],
        packages: [], // Will be populated separately
      };

      // Get service packages
      try {
        const packages = await this.getServicePackages(serviceId);
        serviceData.packages = packages.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name || pkg.title,
          description: pkg.description,
          price: pkg.price || 0,
          duration: pkg.duration,
        }));
      } catch (packageError) {
        logError("Error fetching service packages", packageError);
        serviceData.packages = [];
      }

      return serviceData;
    } catch (error) {
      logError("Error fetching service data", error);
      return null;
    }
  },

  /**
   * Get all services and bookings for a specific user
   */
  async getUserServicesAndBookings(userId: string): Promise<{
    offeredServices: any[];
    clientBookings: any[];
    providerBookings: any[];
  }> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getUserServicesAndBookings", {
        userId,
      });

      return {
        offeredServices: result.services || [],
        clientBookings: result.clientBookings || [],
        providerBookings: result.providerBookings || [],
      };
    } catch (error) {
      console.error("Error getting user services and bookings:", error);
      return {
        offeredServices: [],
        clientBookings: [],
        providerBookings: [],
      };
    }
  },

  /**
   * Get service count for a specific user
   */
  async getUserServiceCount(userId: string): Promise<number> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getUserServiceCount", {
        userId,
      });
      return typeof result === "number" ? result : Number(result || 0);
    } catch (error) {
      console.error("Error getting user service count:", error);
      return 0;
    }
  },

  // User Management Functions

  /**
   * Lock or unlock a user account with optional time-based suspension
   * @param userId - User ID to lock/unlock
   * @param locked - Whether to lock the account
   * @param suspensionDurationDays - Duration in days (7, 30, custom number, or null for indefinite)
   */
  async lockUserAccount(
    userId: string,
    locked: boolean,
    suspensionDurationDays?: number | null,
  ): Promise<string> {
    try {
      requireAuth();

      console.log("lockUserAccount called with:", {
        userId,
        locked,
        suspensionDurationDays,
      });
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
  },

  /**
   * Get all user lock statuses from Firestore
   */
  async getAllUserLockStatuses(): Promise<Record<string, boolean>> {
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
  },

  /**
   * Update user reputation score
   */
  async updateUserReputation(
    userId: string,
    reputationScore: number,
  ): Promise<string> {
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
  },

  /**
   * Get user analytics (real data from backend)
   */
  async getUserAnalytics(userId: string): Promise<{
    totalEarnings: number;
    completedJobs: number;
    cancelledJobs: number;
    totalJobs: number;
    completionRate: number;
  }> {
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
      logError("Error fetching user analytics", error);
      return {
        totalEarnings: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        totalJobs: 0,
        completionRate: 0,
      };
    }
  },

  /**
   * Get user reviews and rating
   */
  async getUserReviews(userId: string): Promise<{
    averageRating: number;
    totalReviews: number;
  }> {
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
      logError("Error fetching user reviews", error);
      return {
        averageRating: 0,
        totalReviews: 0,
      };
    }
  },

  /**
   * Get user reputation score (real data from backend)
   */
  async getUserReputation(userId: string): Promise<{
    reputationScore: number;
    trustLevel: string;
    completedBookings: number;
  }> {
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
      logError("Error fetching user reputation", error);
      // Return default reputation on error
      return {
        reputationScore: 50, // Default score
        trustLevel: "New",
        completedBookings: 0,
      };
    }
  },

  /**
   * Get user bookings (for admin booking history view)
   */
  async getUserBookings(userId: string): Promise<
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
  > {
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
              const providerResult = await callFirebaseFunction("getProfile", {
                userId: booking.providerId,
              });
              if (providerResult?.name) {
                providerName = providerResult.name;
              }
            } catch (error) {
              console.error("Error fetching provider name:", error);
            }
          }

          // Get service name from Firebase
          if (booking.serviceId) {
            try {
              const serviceResult = await callFirebaseFunction("getService", {
                serviceId: booking.serviceId,
              });
              if (serviceResult?.title) {
                serviceName = serviceResult.title;
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
      logError("Error fetching user bookings", error);
      throw new AdminServiceError({
        message: `Failed to fetch user bookings: ${error}`,
        code: "BOOKINGS_FETCH_ERROR",
      } as AdminServiceError);
    }
  },

  // Get services with certificates for validation
  async getServicesWithCertificates(): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction(
        "getServicesWithCertificates",
        {},
      );

      return result || [];
    } catch (error) {
      logError("Error fetching services with certificates", error);
      throw new Error(`Failed to fetch services with certificates: ${error}`);
    }
  },

  // Certificate validation functions
  async getPendingCertificateValidations(): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction(
        "getPendingCertificateValidations",
        {},
      );

      return result || [];
    } catch (error) {
      logError("Error fetching certificate validations", error);
      throw new Error(`Failed to fetch certificate validations: ${error}`);
    }
  },

  async validateCertificate(
    validationId: string,
    approved: boolean,
    reason?: string,
  ): Promise<string> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("validateCertificate", {
        certificateId: validationId,
        approved,
        reason: reason || null,
      });

      return result.message || "Certificate validation updated successfully";
    } catch (error) {
      logError("Error validating certificate", error);
      throw new Error(`Failed to validate certificate: ${error}`);
    }
  },

  // Update certificate validation status
  async updateCertificateValidationStatus(
    certificateId: string,
    status: "Validated" | "Rejected" | "Pending",
    reason?: string,
  ): Promise<any> {
    try {
      requireAuth();

      // Validate certificateId is provided
      if (!certificateId || certificateId.trim() === "") {
        throw new AdminServiceError({
          message: "Certificate ID (mediaId) is required",
          code: "INVALID_CERTIFICATE_ID",
        } as AdminServiceError);
      }

      // Pass payload directly - backend handles both data.data || data formats
      const payload = {
        certificateId: certificateId.trim(),
        status,
        reason: reason || undefined,
      };

      console.log("Calling updateCertificateValidationStatus with payload:", payload);

      const result = await callFirebaseFunction(
        "updateCertificateValidationStatus",
        payload,
      );
      return result || `Certificate ${status.toLowerCase()} successfully`;
    } catch (error) {
      logError("Error updating certificate validation status", error);
      throw new AdminServiceError({
        message: `Failed to update certificate validation status: ${error}`,
        code: "CERTIFICATE_STATUS_UPDATE_ERROR",
      } as AdminServiceError);
    }
  },

  // Get validated certificates
  async getValidatedCertificates(): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getValidatedCertificates", {});
      return result || [];
    } catch (error) {
      logError("Error fetching validated certificates", error);
      return [];
    }
  },

  // Get rejected certificates
  async getRejectedCertificates(): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getRejectedCertificates", {});
      return result || [];
    } catch (error) {
      logError("Error fetching rejected certificates", error);
      return [];
    }
  },

  /**
   * Get conversations for a specific user (admin function)
   */
  async getUserConversations(userId: string): Promise<any[]> {
    try {
      requireAuth();

      // Use the chat function but with admin override
      // callFirebaseFunction already extracts the data property from {success: true, data: [...]}
      const result = await callFirebaseFunction("getMyConversations", {
        userId, // Pass userId for admin override in backend
      });

      // The result is already the data array (or message if no data)
      // If result is an array, return it; otherwise return empty array
      return Array.isArray(result) ? result : [];
    } catch (error) {
      logError("Error fetching user conversations", error);
      return [];
    }
  },

  /**
   * Get messages for a specific conversation (admin function)
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      requireAuth();

      const result = await callFirebaseFunction("getConversationMessages", {
        conversationId,
        limit,
        offset,
      });

      // The result is already the data object { messages, hasMore, nextPageToken }
      // Extract and adapt messages array
      const messages = result?.messages || [];

      // Adapt messages to extract content from encrypted format
      return messages.map((msg: any) => ({
        ...msg,
        content:
          typeof msg.content === "string"
            ? msg.content
            : msg.content?.encryptedText || "",
      }));
    } catch (error) {
      logError("Error fetching conversation messages", error);
      return [];
    }
  },

  /**
   * Get detailed reviews for a user (received, given as client, given as provider)
   */
  async getUserDetailedReviews(userId: string): Promise<{
    receivedReviews: any[]; // Reviews RECEIVED (what providers wrote about this user)
    givenAsClientReviews: any[]; // Reviews GIVEN as client (what user wrote about providers/services)
    givenAsProviderReviews: any[]; // Reviews GIVEN as provider (what user wrote about clients)
  }> {
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
      logError("Error fetching user detailed reviews", error);
      return {
        receivedReviews: [],
        givenAsClientReviews: [],
        givenAsProviderReviews: [],
      };
    }
  },

  /**
   * Delete a review (admin only - hides the review)
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      requireAuth();
      await callFirebaseFunction("deleteReview", {
        data: { reviewId },
      });
    } catch (error) {
      logError("Error deleting review", error);
      throw error;
    }
  },

  /**
   * Restore a review (admin only - makes hidden review visible)
   */
  async restoreReview(reviewId: string): Promise<void> {
    try {
      requireAuth();
      await callFirebaseFunction("restoreReview", {
        data: { reviewId },
      });
    } catch (error) {
      logError("Error restoring review", error);
      throw error;
    }
  },

  /**
   * Bulk update review status (admin only)
   */
  async bulkUpdateReviewStatus(
    reviewIds: string[],
    status: "Visible" | "Hidden",
  ): Promise<{
    updated: string[];
    errors: Array<{ reviewId: string; error: string }>;
  }> {
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
      logError("Error bulk updating reviews", error);
      throw error;
    }
  },
};

// Export individual functions for direct use
export const {
  upsertCommissionRules,
  listRules,
  getRule,
  activateRule,
  deactivateRule,
  assignRole,
  removeRole,
  getUserRole,
  checkAdminRole,
  listUserRoles,
  hasAdminRole,
  getSettings,
  getSystemStats,
  getAllUsers,
  getBookingsData,
  getUserServicesAndBookings,
  getUserServiceCount,
  lockUserAccount,
  getAllUserLockStatuses,
  updateUserReputation,
  updateCertificateValidationStatus,
  getValidatedCertificates,
  getRejectedCertificates,
} = adminServiceCanister;

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
    logError("Error fetching reports from Firebase", error);
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
    logError("Error fetching feedback stats from Firebase", error);
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
    logError("Error fetching feedback from Firebase", error);
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
      logSuccess(`Report ${reportId} status updated to: ${newStatus}`);

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
      logError(`Failed to update report status`);
      return false;
    }
  } catch (error) {
    logError("Error updating report status", error);
    return false;
  }
};

// Send ticket comment notification
export const sendTicketCommentNotificationToUser = async (
  userId: string,
  ticketId: string,
  ticketTitle: string,
  commentText: string,
  isInternal: boolean = false,
): Promise<boolean> => {
  try {
    requireAuth();

    await sendTicketCommentNotification(
      userId,
      ticketId,
      ticketTitle,
      commentText,
      isInternal,
    );

    return true;
  } catch (error) {
    logError("Error sending ticket comment notification", error);
    return false;
  }
};
