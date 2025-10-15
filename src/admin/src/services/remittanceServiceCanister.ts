// Remittance Service Firebase Interface for Admin Functions
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";

// Frontend-adapted types for better usability
export interface ServiceProviderData {
  id: string;
  name: string;
  phone: string;
  totalEarnings: number; // in PHP (converted from centavos)
  pendingCommission: number; // in PHP (converted from centavos)
  settledCommission: number; // in PHP (converted from centavos)
  outstandingBalance: number; // in PHP (converted from centavos)
  pendingOrders: number;
  overdueOrders: number;
  totalOrdersCompleted: number;
  averageOrderValue: number; // in PHP
  nextDeadline?: Date;
  lastActivity: Date;
}

export interface FrontendRemittanceOrder {
  id: string;
  serviceProviderId: string;
  serviceProviderName?: string; // Will be fetched from auth canister
  amount: number; // in PHP (converted from centavos)
  serviceType: string;
  serviceId?: string;
  bookingId?: string;
  paymentMethod: "CashOnHand";
  status:
    | "AwaitingPayment"
    | "PaymentSubmitted"
    | "PaymentValidated"
    | "Cancelled"
    | "Settled";
  commissionRuleId: string;
  commissionVersion: number;
  commissionAmount: number; // in PHP (converted from centavos)
  paymentProofMediaIds: string[];
  validatedBy?: string;
  validatedAt?: Date;
  createdAt: Date;
  paymentSubmittedAt?: Date;
  settledAt?: Date;
  updatedAt: Date;
}

export interface FrontendProviderAnalytics {
  providerId: string;
  totalOrders: number;
  settledOrders: number;
  pendingOrders: number;
  totalCommissionPaid: number; // in PHP
  totalServiceAmount: number; // in PHP
  averageOrderValue: number; // in PHP
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface FrontendProviderDashboard {
  providerId: string;
  outstandingBalance: number; // in PHP
  pendingOrders: number;
  overdueOrders: number;
  nextDeadline?: Date;
  ordersAwaitingPayment: FrontendRemittanceOrder[];
  ordersPendingValidation: FrontendRemittanceOrder[];
  totalCommissionPaid: number; // in PHP
  totalOrdersCompleted: number;
}

export interface FrontendSettlementInstruction {
  corporateGcashAccount: string;
  commissionAmount: number; // in PHP
  referenceNumber: string;
  instructions: string;
  expiresAt: Date;
}

export interface RemittanceOrdersPage {
  items: FrontendRemittanceOrder[];
  nextCursor?: string;
  totalCount?: number;
}

export class RemittanceServiceError extends Error {
  public code: string;
  public details?: any;

  constructor(options: { message: string; code: string; details?: any }) {
    super(options.message);
    this.name = "RemittanceServiceError";
    this.code = options.code;
    this.details = options.details;
  }
}

// Get Firebase instances
const auth = getFirebaseAuth();

// Helper function to check authentication
const checkAuth = (requireAuth: boolean = true) => {
  if (requireAuth && !auth.currentUser) {
    throw new RemittanceServiceError({
      message:
        "Authentication required: Please log in as an admin to perform this action",
      code: "AUTH_REQUIRED",
    });
  }
};

// Note: Type conversion utilities removed as they're not needed for Firebase implementation

// Main service object
export const remittanceServiceCanister = {
  // Service Provider Management

  /**
   * Get all service providers with their commission data
   * TODO: Implement actual Firebase Function when available
   */
  async getAllServiceProviders(): Promise<ServiceProviderData[]> {
    try {
      checkAuth();

      const functions = getFirebaseFunctions();
      const getAllServiceProviders = httpsCallable(
        functions,
        "getAllServiceProviders",
      );
      const result = await getAllServiceProviders({});

      if ((result.data as any).success) {
        return (result.data as any).providers || [];
      } else {
        throw new Error("Failed to fetch service providers");
      }
    } catch (error) {
      console.error("Error getting all service providers:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get all service providers: ${error}`,
        code: "GET_ALL_PROVIDERS_ERROR",
        details: error,
      });
    }
  },

  // Service Provider Commission Data

  /**
   * Get comprehensive service provider dashboard data
   * TODO: Implement actual Firebase Function when available
   */
  async getProviderDashboard(
    providerId: string,
  ): Promise<FrontendProviderDashboard> {
    try {
      checkAuth();

      // Placeholder implementation - return empty dashboard for now
      console.warn("getProviderDashboard: Using placeholder implementation");

      return {
        providerId,
        outstandingBalance: 0,
        pendingOrders: 0,
        overdueOrders: 0,
        nextDeadline: undefined,
        ordersAwaitingPayment: [],
        ordersPendingValidation: [],
        totalCommissionPaid: 0,
        totalOrdersCompleted: 0,
      };
    } catch (error) {
      console.error("Error getting provider dashboard:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get provider dashboard: ${error}`,
        code: "GET_PROVIDER_DASHBOARD_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get provider analytics for a date range
   * TODO: Implement actual Firebase Function when available
   */
  async getProviderAnalytics(
    providerId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<FrontendProviderAnalytics> {
    try {
      checkAuth();

      // Placeholder implementation - return empty analytics for now
      console.warn("getProviderAnalytics: Using placeholder implementation");

      return {
        providerId,
        totalOrders: 0,
        settledOrders: 0,
        pendingOrders: 0,
        totalCommissionPaid: 0,
        totalServiceAmount: 0,
        averageOrderValue: 0,
        dateRange: {
          from: fromDate || new Date(0),
          to: toDate || new Date(),
        },
      };
    } catch (error) {
      console.error("Error getting provider analytics:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get provider analytics: ${error}`,
        code: "GET_PROVIDER_ANALYTICS_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get all service providers with their commission data (aggregated from multiple sources)
   * TODO: Implement actual Firebase Function when available
   */
  async getAllServiceProvidersWithCommissionData(): Promise<
    ServiceProviderData[]
  > {
    try {
      checkAuth();

      // Placeholder implementation - return empty array for now
      console.warn(
        "getAllServiceProvidersWithCommissionData: Using placeholder implementation",
      );

      return [];
    } catch (error) {
      console.error(
        "Error getting service providers with commission data:",
        error,
      );
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get service providers with commission data: ${error}`,
        code: "GET_PROVIDERS_DATA_ERROR",
        details: error,
      });
    }
  },

  // Order Management

  /**
   * Get a specific remittance order by ID
   * TODO: Implement actual Firebase Function when available
   */
  async getOrder(_orderId: string): Promise<FrontendRemittanceOrder | null> {
    try {
      checkAuth();

      // Placeholder implementation - return null for now
      console.warn("getOrder: Using placeholder implementation");

      return null;
    } catch (error) {
      console.error("Error getting order:", error);
      throw new RemittanceServiceError({
        message: `Failed to get order: ${error}`,
        code: "GET_ORDER_ERROR",
        details: error,
      });
    }
  },

  /**
   * Query orders with filtering and pagination
   */
  async queryOrders(
    filter?: {
      status?: any[];
      serviceProviderId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
    page?: {
      cursor?: string;
      size?: number;
    },
  ): Promise<RemittanceOrdersPage> {
    try {
      checkAuth();

      const functions = getFirebaseFunctions();
      const queryRemittanceOrders = httpsCallable(
        functions,
        "queryRemittanceOrders",
      );

      const result = await queryRemittanceOrders({
        filter: filter
          ? {
              status: filter.status,
              serviceProviderId: filter.serviceProviderId,
              fromDate: filter.fromDate?.toISOString(),
              toDate: filter.toDate?.toISOString(),
            }
          : undefined,
        page: page
          ? {
              cursor: page.cursor,
              size: page.size,
            }
          : undefined,
      });

      return (result.data as any).page;
    } catch (error) {
      console.error("Error querying orders:", error);
      throw new RemittanceServiceError({
        message: `Failed to query orders: ${error}`,
        code: "QUERY_ORDERS_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get orders by status
   * TODO: Implement actual Firebase Function when available
   */
  async getOrdersByStatus(_status: any): Promise<FrontendRemittanceOrder[]> {
    try {
      checkAuth();

      // Placeholder implementation - return empty array for now
      console.warn("getOrdersByStatus: Using placeholder implementation");

      return [];
    } catch (error) {
      console.error("Error getting orders by status:", error);
      throw new RemittanceServiceError({
        message: `Failed to get orders by status: ${error}`,
        code: "GET_ORDERS_BY_STATUS_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get all pending payment validations (PaymentSubmitted orders)
   * TODO: Implement actual Firebase Function when available
   */
  async getPendingValidations(): Promise<FrontendRemittanceOrder[]> {
    try {
      checkAuth();

      // Placeholder implementation - return empty array for now
      console.warn("getPendingValidations: Using placeholder implementation");

      return [];
    } catch (error) {
      console.error("Error getting pending validations:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get pending validations: ${error}`,
        code: "GET_PENDING_VALIDATIONS_ERROR",
        details: error,
      });
    }
  },

  // Payment Validation (Admin Functions)

  /**
   * Validate payment by admin (approve or reject)
   * TODO: Implement actual Firebase Function when available
   */
  async validatePaymentByAdmin(
    _orderId: string,
    approved: boolean,
    _reason?: string,
    _adminId?: string,
  ): Promise<string> {
    try {
      checkAuth();

      // Placeholder implementation - return success message for now
      console.warn("validatePaymentByAdmin: Using placeholder implementation");

      return `Payment ${approved ? "approved" : "rejected"} successfully`;
    } catch (error) {
      console.error("Error validating payment:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to validate payment: ${error}`,
        code: "VALIDATE_PAYMENT_ERROR",
        details: error,
      });
    }
  },

  // Settlement Instructions

  /**
   * Generate settlement instruction for a specific order
   * TODO: Implement actual Firebase Function when available
   */
  async generateSettlementInstruction(
    _orderId: string,
  ): Promise<FrontendSettlementInstruction> {
    try {
      checkAuth();

      // Placeholder implementation - return empty instruction for now
      console.warn(
        "generateSettlementInstruction: Using placeholder implementation",
      );

      return {
        corporateGcashAccount: "",
        commissionAmount: 0,
        referenceNumber: "",
        instructions: "",
        expiresAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating settlement instruction:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to generate settlement instruction: ${error}`,
        code: "GENERATE_SETTLEMENT_ERROR",
        details: error,
      });
    }
  },

  // Historical Data and Analytics

  /**
   * Get historical data for all service providers within a date range
   * TODO: Implement actual Firebase Function when available
   */
  async getHistoricalProviderData(
    _fromDate?: Date,
    _toDate?: Date,
  ): Promise<FrontendProviderAnalytics[]> {
    try {
      checkAuth();

      // Placeholder implementation - return empty array for now
      console.warn(
        "getHistoricalProviderData: Using placeholder implementation",
      );

      return [];
    } catch (error) {
      console.error("Error getting historical provider data:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get historical provider data: ${error}`,
        code: "GET_HISTORICAL_DATA_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get system-wide remittance statistics
   * TODO: Implement actual Firebase Function when available
   */
  async getSystemRemittanceStats(
    _fromDate?: Date,
    _toDate?: Date,
  ): Promise<{
    totalOrders: number;
    totalSettledOrders: number;
    totalPendingOrders: number;
    totalCommissionPaid: number;
    totalServiceAmount: number;
    totalOverdueOrders: number;
    averageOrderValue: number;
    averageCommissionRate: number;
  }> {
    try {
      checkAuth();

      // Placeholder implementation - return empty stats for now
      console.warn(
        "getSystemRemittanceStats: Using placeholder implementation",
      );

      return {
        totalOrders: 0,
        totalSettledOrders: 0,
        totalPendingOrders: 0,
        totalCommissionPaid: 0,
        totalServiceAmount: 0,
        totalOverdueOrders: 0,
        averageOrderValue: 0,
        averageCommissionRate: 0,
      };
    } catch (error) {
      console.error("Error getting system remittance stats:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to get system remittance stats: ${error}`,
        code: "GET_SYSTEM_STATS_ERROR",
        details: error,
      });
    }
  },

  // Order Management

  /**
   * Cancel an order (admin function)
   * TODO: Implement actual Firebase Function when available
   */
  async cancelOrder(orderId: string): Promise<FrontendRemittanceOrder> {
    try {
      checkAuth();

      // Placeholder implementation - return empty order for now
      console.warn("cancelOrder: Using placeholder implementation");

      return {
        id: orderId,
        serviceProviderId: "",
        amount: 0,
        serviceType: "",
        serviceId: undefined,
        bookingId: undefined,
        paymentMethod: "CashOnHand",
        status: "Cancelled",
        commissionRuleId: "",
        commissionVersion: 0,
        commissionAmount: 0,
        paymentProofMediaIds: [],
        validatedBy: undefined,
        validatedAt: undefined,
        createdAt: new Date(),
        paymentSubmittedAt: undefined,
        settledAt: undefined,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error canceling order:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to cancel order: ${error}`,
        code: "CANCEL_ORDER_ERROR",
        details: error,
      });
    }
  },

  /**
   * Set canister references (not needed for Firebase implementation)
   * TODO: Remove this method or implement Firebase equivalent if needed
   */
  async setCanisterReferences(): Promise<string | null> {
    try {
      checkAuth();

      // Placeholder implementation - return success for now
      console.warn(
        "setCanisterReferences: Using placeholder implementation (not needed for Firebase)",
      );

      return "Canister references set successfully";
    } catch (error) {
      console.error("Failed to set canister references:", error);
      throw new Error(
        `Failed to set canister references: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
