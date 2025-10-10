// Remittance Service Canister Interface for Admin Functions
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/remittance";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as mediaCanisterId } from "../../../declarations/media";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import { canisterId as serviceCanisterId } from "../../../declarations/service";
import { canisterId as adminCanisterId } from "../../../declarations/admin";

import type {
  _SERVICE as RemittanceService,
  RemittanceOrder,
  RemittanceOrderStatus,
  RemittanceOrderFilter,
  PageRequest,
  SettlementInstruction,
} from "../../../declarations/remittance/remittance.did";
import { Identity } from "@dfinity/agent";

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

/**
 * Creates a remittance actor with the provided identity
 */
const createRemittanceActor = (
  identity?: Identity | null,
): RemittanceService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as RemittanceService;
};

// Singleton actor instance with identity tracking
let remittanceActor: RemittanceService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the remittance actor with a new identity
 */
export const updateRemittanceActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    remittanceActor = createRemittanceActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current remittance actor
 */
const getRemittanceActor = (requireAuth: boolean = true): RemittanceService => {
  if (requireAuth && !currentIdentity) {
    throw new RemittanceServiceError({
      message:
        "Authentication required: Please log in as an admin to perform this action",
      code: "AUTH_REQUIRED",
    });
  }

  if (!remittanceActor) {
    remittanceActor = createRemittanceActor(currentIdentity);
  }

  return remittanceActor;
};

// Type conversion utilities
const convertTimeToDate = (time: bigint): Date => {
  return new Date(Number(time) / 1000000); // Convert nanoseconds to milliseconds
};

const convertCentavosToPhp = (centavos: bigint | number): number => {
  return Number(centavos) / 100;
};

const convertRemittanceOrder = (
  order: RemittanceOrder,
): FrontendRemittanceOrder => {
  const getStatusString = (status: any): FrontendRemittanceOrder["status"] => {
    if ("AwaitingPayment" in status) return "AwaitingPayment";
    if ("PaymentSubmitted" in status) return "PaymentSubmitted";
    if ("PaymentValidated" in status) return "PaymentValidated";
    if ("Cancelled" in status) return "Cancelled";
    if ("Settled" in status) return "Settled";
    return "AwaitingPayment";
  };

  return {
    id: order.id,
    serviceProviderId: order.service_provider_id.toString(),
    amount: convertCentavosToPhp(order.amount_php_centavos),
    serviceType: order.service_type,
    serviceId: order.service_id[0],
    bookingId: order.booking_id[0],
    paymentMethod: "CashOnHand",
    status: getStatusString(order.status),
    commissionRuleId: order.commission_rule_id,
    commissionVersion: order.commission_version,
    commissionAmount: convertCentavosToPhp(order.commission_amount),
    paymentProofMediaIds: order.payment_proof_media_ids,
    validatedBy: order.validated_by[0]
      ? order.validated_by[0].toString()
      : undefined,
    validatedAt: order.validated_at[0]
      ? convertTimeToDate(order.validated_at[0])
      : undefined,
    createdAt: convertTimeToDate(order.created_at),
    paymentSubmittedAt: order.payment_submitted_at[0]
      ? convertTimeToDate(order.payment_submitted_at[0])
      : undefined,
    settledAt: order.settled_at[0]
      ? convertTimeToDate(order.settled_at[0])
      : undefined,
    updatedAt: convertTimeToDate(order.updated_at),
  };
};

const convertSettlementInstruction = (
  instruction: SettlementInstruction,
): FrontendSettlementInstruction => ({
  corporateGcashAccount: instruction.corporate_gcash_account,
  commissionAmount: convertCentavosToPhp(instruction.commission_amount),
  referenceNumber: instruction.reference_number,
  instructions: instruction.instructions,
  expiresAt: convertTimeToDate(instruction.expires_at),
});

// Convert backend ServiceProviderData to frontend format
const convertServiceProviderData = (data: any): ServiceProviderData => ({
  id: data.id,
  name: data.name,
  phone: data.phone,
  totalEarnings: convertCentavosToPhp(data.total_earnings),
  pendingCommission: convertCentavosToPhp(data.pending_commission),
  settledCommission: convertCentavosToPhp(data.settled_commission),
  outstandingBalance: convertCentavosToPhp(data.outstanding_balance),
  pendingOrders: Number(data.pending_orders),
  overdueOrders: Number(data.overdue_orders),
  totalOrdersCompleted: Number(data.total_orders_completed),
  averageOrderValue: convertCentavosToPhp(data.average_order_value),
  nextDeadline: data.next_deadline[0]
    ? convertTimeToDate(data.next_deadline[0])
    : undefined,
  lastActivity: convertTimeToDate(data.last_activity),
});

// Error handling utility
const handleResult = <T>(result: any, errorPrefix: string): T => {
  if ("ok" in result) {
    return result.ok as T;
  } else if ("err" in result) {
    throw new RemittanceServiceError({
      message: `${errorPrefix}: ${result.err}`,
      code: "CANISTER_ERROR",
      details: result.err,
    });
  } else {
    throw new RemittanceServiceError({
      message: `${errorPrefix}: Unexpected result format`,
      code: "UNKNOWN_ERROR",
      details: result,
    });
  }
};

// Main service object
export const remittanceServiceCanister = {
  // Service Provider Management

  /**
   * Get all service providers with their commission data
   */
  async getAllServiceProviders(): Promise<ServiceProviderData[]> {
    try {
      const actor = getRemittanceActor();
      const result = await actor.getAllServiceProvidersWithCommissionData();

      return handleResult<any[]>(
        result,
        "Failed to get all service providers",
      ).map(convertServiceProviderData);
    } catch (error) {
      //console.error("Error getting all service providers:", error);
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
   */
  async getProviderDashboard(
    providerId: string,
  ): Promise<FrontendProviderDashboard> {
    try {
      const actor = getRemittanceActor();
      const principal = Principal.fromText(providerId);

      const dashboard = await actor.getProviderDashboard(principal);

      return {
        providerId,
        outstandingBalance: convertCentavosToPhp(dashboard.outstanding_balance),
        pendingOrders: Number(dashboard.pending_orders),
        overdueOrders: Number(dashboard.overdue_orders),
        nextDeadline: dashboard.next_deadline[0]
          ? convertTimeToDate(dashboard.next_deadline[0])
          : undefined,
        ordersAwaitingPayment: dashboard.orders_awaiting_payment.map(
          convertRemittanceOrder,
        ),
        ordersPendingValidation: dashboard.orders_pending_validation.map(
          convertRemittanceOrder,
        ),
        totalCommissionPaid: convertCentavosToPhp(
          dashboard.total_commission_paid,
        ),
        totalOrdersCompleted: Number(dashboard.total_orders_completed),
      };
    } catch (error) {
      //console.error("Error getting provider dashboard:", error);
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
   */
  async getProviderAnalytics(
    providerId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<FrontendProviderAnalytics> {
    try {
      const actor = getRemittanceActor();
      const principal = Principal.fromText(providerId);

      const fromTime: [] | [bigint] = fromDate
        ? [BigInt(fromDate.getTime() * 1000000)]
        : [];
      const toTime: [] | [bigint] = toDate
        ? [BigInt(toDate.getTime() * 1000000)]
        : [];

      const analytics = await actor.getProviderAnalytics(
        principal,
        fromTime,
        toTime,
      );

      return {
        providerId,
        totalOrders: Number(analytics.total_orders),
        settledOrders: Number(analytics.settled_orders),
        pendingOrders: Number(analytics.pending_orders),
        totalCommissionPaid: convertCentavosToPhp(
          analytics.total_commission_paid,
        ),
        totalServiceAmount: convertCentavosToPhp(
          analytics.total_service_amount,
        ),
        averageOrderValue: convertCentavosToPhp(analytics.average_order_value),
        dateRange: {
          from: fromDate || new Date(0),
          to: toDate || new Date(),
        },
      };
    } catch (error) {
      //console.error("Error getting provider analytics:", error);
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
   */
  async getAllServiceProvidersWithCommissionData(): Promise<
    ServiceProviderData[]
  > {
    try {
      const actor = getRemittanceActor();
      const result = await actor.getAllServiceProvidersWithCommissionData();

      return handleResult<any[]>(
        result,
        "Failed to get all service providers with commission data",
      ).map(convertServiceProviderData);
    } catch (error) {
      // //console.error(
      //   "Error getting service providers with commission data:",
      //   error,
      // );
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
   */
  async getOrder(orderId: string): Promise<FrontendRemittanceOrder | null> {
    try {
      const actor = getRemittanceActor();
      const order = await actor.getOrder(orderId);

      return order[0] ? convertRemittanceOrder(order[0]) : null;
    } catch (error) {
      //console.error("Error getting order:", error);
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
      status?: RemittanceOrderStatus[];
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
      const actor = getRemittanceActor();

      const remittanceFilter: RemittanceOrderFilter = {
        status: filter?.status ? [filter.status] : [],
        service_provider_id: filter?.serviceProviderId
          ? [Principal.fromText(filter.serviceProviderId)]
          : [],
        from_date: filter?.fromDate
          ? [BigInt(filter.fromDate.getTime() * 1000000)]
          : [],
        to_date: filter?.toDate
          ? [BigInt(filter.toDate.getTime() * 1000000)]
          : [],
      };

      const pageRequest: PageRequest = {
        cursor: page?.cursor ? [page.cursor] : [],
        size: page?.size ? page.size : 20,
      };

      const result = await actor.queryOrders(remittanceFilter, pageRequest);

      return {
        items: result.items.map(convertRemittanceOrder),
        nextCursor: result.next_cursor[0],
        totalCount: result.total_count[0]
          ? Number(result.total_count[0])
          : undefined,
      };
    } catch (error) {
      //console.error("Error querying orders:", error);
      throw new RemittanceServiceError({
        message: `Failed to query orders: ${error}`,
        code: "QUERY_ORDERS_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get orders by status
   */
  async getOrdersByStatus(
    status: RemittanceOrderStatus,
  ): Promise<FrontendRemittanceOrder[]> {
    try {
      const actor = getRemittanceActor();
      const orders = await actor.getOrdersByStatus(status);

      return orders.map(convertRemittanceOrder);
    } catch (error) {
      //console.error("Error getting orders by status:", error);
      throw new RemittanceServiceError({
        message: `Failed to get orders by status: ${error}`,
        code: "GET_ORDERS_BY_STATUS_ERROR",
        details: error,
      });
    }
  },

  /**
   * Get all pending payment validations (PaymentSubmitted orders)
   */
  async getPendingValidations(): Promise<FrontendRemittanceOrder[]> {
    try {
      return await this.getOrdersByStatus({
        PaymentSubmitted: null,
      } as RemittanceOrderStatus);
    } catch (error) {
      //console.error("Error getting pending validations:", error);
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
   */
  async validatePaymentByAdmin(
    orderId: string,
    approved: boolean,
    reason?: string,
    adminId?: string,
  ): Promise<string> {
    try {
      const actor = getRemittanceActor();
      const adminPrincipal = adminId
        ? Principal.fromText(adminId)
        : Principal.anonymous();

      const result = await actor.validatePaymentByAdmin(
        orderId,
        approved,
        reason ? [reason] : [],
        adminPrincipal,
      );

      return handleResult<string>(result, "Failed to validate payment");
    } catch (error) {
      //console.error("Error validating payment:", error);
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
   */
  async generateSettlementInstruction(
    orderId: string,
  ): Promise<FrontendSettlementInstruction> {
    try {
      const actor = getRemittanceActor();
      const result = await actor.generateSettlementInstruction(orderId);

      const instruction = handleResult<SettlementInstruction>(
        result,
        "Failed to generate settlement instruction",
      );
      return convertSettlementInstruction(instruction);
    } catch (error) {
      //console.error("Error generating settlement instruction:", error);
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
   */
  async getHistoricalProviderData(
    fromDate?: Date,
    toDate?: Date,
  ): Promise<FrontendProviderAnalytics[]> {
    try {
      const providersData =
        await this.getAllServiceProvidersWithCommissionData();

      const historicalData: FrontendProviderAnalytics[] = [];

      for (const provider of providersData) {
        try {
          const analytics = await this.getProviderAnalytics(
            provider.id,
            fromDate,
            toDate,
          );
          historicalData.push(analytics);
        } catch (providerError) {
          // //console.warn(
          //   `Failed to get historical data for provider ${provider.id}:`,
          //   providerError,
          // );
        }
      }

      return historicalData.sort(
        (a, b) => b.totalCommissionPaid - a.totalCommissionPaid,
      );
    } catch (error) {
      //console.error("Error getting historical provider data:", error);
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
   */
  async getSystemRemittanceStats(
    fromDate?: Date,
    toDate?: Date,
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
      // Get all orders within date range
      const ordersPage = await this.queryOrders(
        {
          fromDate,
          toDate,
        },
        {
          size: 10000, // Get a large batch for statistics
        },
      );

      const orders = ordersPage.items;

      const totalOrders = orders.length;
      const settledOrders = orders.filter((o) => o.status === "Settled");
      const pendingOrders = orders.filter(
        (o) =>
          o.status === "AwaitingPayment" ||
          o.status === "PaymentSubmitted" ||
          o.status === "PaymentValidated",
      );

      const totalCommissionPaid = settledOrders.reduce(
        (sum, o) => sum + o.commissionAmount,
        0,
      );
      const totalServiceAmount = settledOrders.reduce(
        (sum, o) => sum + o.amount,
        0,
      );

      // Calculate overdue orders (those created more than 24 hours ago and still awaiting payment)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const overdueOrders = orders.filter(
        (o) => o.status === "AwaitingPayment" && o.createdAt < oneDayAgo,
      );

      const averageOrderValue =
        settledOrders.length > 0
          ? totalServiceAmount / settledOrders.length
          : 0;
      const averageCommissionRate =
        totalServiceAmount > 0
          ? (totalCommissionPaid / totalServiceAmount) * 100
          : 0;

      return {
        totalOrders,
        totalSettledOrders: settledOrders.length,
        totalPendingOrders: pendingOrders.length,
        totalCommissionPaid,
        totalServiceAmount,
        totalOverdueOrders: overdueOrders.length,
        averageOrderValue,
        averageCommissionRate,
      };
    } catch (error) {
      //console.error("Error getting system remittance stats:", error);
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
   */
  async cancelOrder(orderId: string): Promise<FrontendRemittanceOrder> {
    try {
      const actor = getRemittanceActor();
      const result = await actor.cancelOrder(orderId);

      const order = handleResult<RemittanceOrder>(
        result,
        "Failed to cancel order",
      );
      return convertRemittanceOrder(order);
    } catch (error) {
      //console.error("Error canceling order:", error);
      if (error instanceof RemittanceServiceError) throw error;
      throw new RemittanceServiceError({
        message: `Failed to cancel order: ${error}`,
        code: "CANCEL_ORDER_ERROR",
        details: error,
      });
    }
  },

  async setCanisterReferences(): Promise<string | null> {
    try {
      const actor = getRemittanceActor(true);
      const result = await actor.setCanisterReferences(
        [Principal.fromText(authCanisterId)],
        [Principal.fromText(mediaCanisterId)],
        [Principal.fromText(bookingCanisterId)],
        [Principal.fromText(serviceCanisterId)],
        [Principal.fromText(adminCanisterId)],
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Failed to set canister references:", error);
      throw new Error(
        `Failed to set canister references: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
};
