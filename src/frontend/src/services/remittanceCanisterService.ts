// Remittance Canister Service
import { Principal } from "@dfinity/principal";
import { createActor, canisterId } from "../../../declarations/remittance";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as mediaCanisterId } from "../../../declarations/media";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import { canisterId as serviceCanisterId } from "../../../declarations/service";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as RemittanceService,
  RemittanceOrder as CanisterRemittanceOrder,
  RemittanceOrderStatus as CanisterRemittanceOrderStatus,
  PaymentMethod as CanisterPaymentMethod,
  Time,
} from "../../../declarations/remittance/remittance.did";

/**
 * Creates a remittance actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated RemittanceService actor
 */
const createRemittanceActor = (
  identity?: Identity | null,
): RemittanceService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
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
 * This should be called when the user's authentication state changes
 */
export const updateRemittanceActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    remittanceActor = createRemittanceActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current remittance actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getRemittanceActor = (requireAuth: boolean = true): RemittanceService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!remittanceActor) {
    remittanceActor = createRemittanceActor(currentIdentity);
  }

  return remittanceActor;
};

// Type mappings for frontend compatibility
export type RemittanceOrderStatus =
  | "AwaitingPayment"
  | "PaymentSubmitted"
  | "PaymentValidated"
  | "Cancelled"
  | "Settled";

export type PaymentMethod = "CashOnHand";

export interface RemittanceOrder {
  id: string;
  status: RemittanceOrderStatus;
  updatedAt: Date;
  serviceType: string;
  paymentProofMediaIds: string[];
  serviceProviderId: Principal;
  createdAt: Date;
  paymentMethod: PaymentMethod;
  commissionVersion: number;
  serviceId?: string;
  commissionAmount: number; // Convert from bigint (centavos) to number for display
  validatedAt?: Date;
  validatedBy?: Principal;
  commissionRuleId: string;
  amountPhpCentavos: number; // Convert from bigint (centavos) to number for display
  paymentSubmittedAt?: Date;
  bookingId?: string;
  settledAt?: Date;
}

export interface CommissionRule {
  id: string;
  updatedAt: Date;
  effectiveTo?: Date;
  paymentMethods: PaymentMethod[];
  maxCommission?: number;
  createdAt: Date;
  serviceTypes: string[];
  version: number;
  effectiveFrom: Date;
  priority: number;
  isActive: boolean;
  formula: CommissionFormula;
  minCommission?: number;
}

export interface CommissionQuote {
  net: number; // Convert from bigint (centavos) to number
  ruleVersion: number;
  commission: number; // Convert from bigint (centavos) to number
  effectiveRate: number;
  ruleId: string;
}

export interface SettlementInstruction {
  instructions: string;
  referenceNumber: string;
  commissionAmount: number; // Convert from bigint (centavos) to number
  corporateGcashAccount: string;
  expiresAt: Date;
}

export interface ProviderDashboard {
  outstandingBalance: number; // Convert from bigint (centavos) to number
  ordersPendingValidation: RemittanceOrder[];
  nextDeadline?: Date;
  totalOrdersCompleted: number;
  ordersAwaitingPayment: RemittanceOrder[];
  totalCommissionPaid: number; // Convert from bigint (centavos) to number
  pendingOrders: number;
  overdueOrders: number;
}

export interface ProviderAnalytics {
  totalCommissionPaid: number; // Convert from bigint (centavos) to number
  pendingOrders: number;
  settledOrders: number;
  totalOrders: number;
  averageOrderValue: number; // Convert from bigint (centavos) to number
  totalServiceAmount: number; // Convert from bigint (centavos) to number
}

export type CommissionFormula =
  | { type: "Flat"; amount: number }
  | { type: "Tiered"; tiers: Array<[number, number]> }
  | { type: "Hybrid"; rateBps: number; base: number }
  | { type: "Percentage"; rate: number };

// Conversion utilities
const convertTimeToDate = (time: Time): Date =>
  new Date(Number(time) / 1000000); // Convert nanoseconds to milliseconds

const convertDateToTime = (date: Date): Time =>
  BigInt(date.getTime() * 1000000); // Convert milliseconds to nanoseconds

const convertCentavosToPhp = (centavos: bigint): number =>
  Number(centavos) / 100;

const convertPhpToCentavos = (php: number): bigint =>
  BigInt(Math.round(php * 100));

const convertRemittanceOrderStatus = (
  status: CanisterRemittanceOrderStatus,
): RemittanceOrderStatus => {
  if ("AwaitingPayment" in status) return "AwaitingPayment";
  if ("PaymentSubmitted" in status) return "PaymentSubmitted";
  if ("PaymentValidated" in status) return "PaymentValidated";
  if ("Cancelled" in status) return "Cancelled";
  if ("Settled" in status) return "Settled";
  throw new Error("Unknown remittance order status");
};

const convertPaymentMethod = (method: CanisterPaymentMethod): PaymentMethod => {
  if ("CashOnHand" in method) return "CashOnHand";
  throw new Error("Unknown payment method");
};

const convertRemittanceOrder = (
  order: CanisterRemittanceOrder,
): RemittanceOrder => ({
  id: order.id,
  status: convertRemittanceOrderStatus(order.status),
  updatedAt: convertTimeToDate(order.updated_at),
  serviceType: order.service_type,
  paymentProofMediaIds: order.payment_proof_media_ids,
  serviceProviderId: order.service_provider_id,
  createdAt: convertTimeToDate(order.created_at),
  paymentMethod: convertPaymentMethod(order.payment_method),
  commissionVersion: order.commission_version,
  serviceId: order.service_id[0],
  commissionAmount: convertCentavosToPhp(order.commission_amount),
  validatedAt: order.validated_at[0]
    ? convertTimeToDate(order.validated_at[0])
    : undefined,
  validatedBy: order.validated_by[0],
  commissionRuleId: order.commission_rule_id,
  amountPhpCentavos: convertCentavosToPhp(order.amount_php_centavos),
  paymentSubmittedAt: order.payment_submitted_at[0]
    ? convertTimeToDate(order.payment_submitted_at[0])
    : undefined,
  bookingId: order.booking_id[0],
  settledAt: order.settled_at[0]
    ? convertTimeToDate(order.settled_at[0])
    : undefined,
});

// Service Provider Functions

/**
 * Gets the provider dashboard for the authenticated service provider
 * @param providerId The service provider's Principal
 * @returns Provider dashboard with current status and orders
 */
export const getProviderDashboard = async (
  providerId: Principal,
): Promise<ProviderDashboard> => {
  try {
    const actor = getRemittanceActor(true);
    const dashboard = await actor.getProviderDashboard(providerId);

    return {
      outstandingBalance: convertCentavosToPhp(dashboard.outstanding_balance),
      ordersPendingValidation: dashboard.orders_pending_validation.map(
        convertRemittanceOrder,
      ),
      nextDeadline: dashboard.next_deadline[0]
        ? convertTimeToDate(dashboard.next_deadline[0])
        : undefined,
      totalOrdersCompleted: Number(dashboard.total_orders_completed),
      ordersAwaitingPayment: dashboard.orders_awaiting_payment.map(
        convertRemittanceOrder,
      ),
      totalCommissionPaid: convertCentavosToPhp(
        dashboard.total_commission_paid,
      ),
      pendingOrders: Number(dashboard.pending_orders),
      overdueOrders: Number(dashboard.overdue_orders),
    };
  } catch (error) {
    //console.error("Failed to get provider dashboard:", error);
    throw new Error(
      `Failed to get provider dashboard: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

export const setCanisterReferences = async (): Promise<string | null> => {
  try {
    const actor = getRemittanceActor(true);
    const result = await actor.setCanisterReferences(
      [Principal.fromText(authCanisterId)],
      [Principal.fromText(mediaCanisterId)],
      [Principal.fromText(bookingCanisterId)],
      [Principal.fromText(serviceCanisterId)],
      [],
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
};

/**
 * Gets analytics for the authenticated service provider
 * @param providerId The service provider's Principal
 * @param fromDate Optional start date for analytics period
 * @param toDate Optional end date for analytics period
 * @returns Provider analytics data
 */
export const getProviderAnalytics = async (
  providerId: Principal,
  fromDate?: Date,
  toDate?: Date,
): Promise<ProviderAnalytics> => {
  try {
    const actor = getRemittanceActor(true);
    const analytics = await actor.getProviderAnalytics(
      providerId,
      fromDate ? [convertDateToTime(fromDate)] : [],
      toDate ? [convertDateToTime(toDate)] : [],
    );

    return {
      totalCommissionPaid: convertCentavosToPhp(
        analytics.total_commission_paid,
      ),
      pendingOrders: Number(analytics.pending_orders),
      settledOrders: Number(analytics.settled_orders),
      totalOrders: Number(analytics.total_orders),
      averageOrderValue: convertCentavosToPhp(analytics.average_order_value),
      totalServiceAmount: convertCentavosToPhp(analytics.total_service_amount),
    };
  } catch (error) {
    //console.error("Failed to get provider analytics:", error);
    throw new Error(
      `Failed to get provider analytics: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Gets all orders for the authenticated service provider
 * @param providerId The service provider's Principal
 * @returns Array of remittance orders
 */
export const getProviderOrders = async (
  providerId: Principal,
): Promise<RemittanceOrder[]> => {
  try {
    const actor = getRemittanceActor(true);
    const orders = await actor.getProviderOrders(providerId);
    return orders.map(convertRemittanceOrder);
  } catch (error) {
    //console.error("Failed to get provider orders:", error);
    throw new Error(
      `Failed to get provider orders: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Uploads remittance payment proof files and returns media IDs
 * @param files Array of files to upload as payment proof
 * @returns Array of media IDs
 */
export const uploadRemittancePaymentProofs = async (
  files: File[],
): Promise<string[]> => {
  try {
    const actor = getRemittanceActor(true);

    // Convert files to the format expected by the canister
    const fileData = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        contentType: file.type,
        fileData: new Uint8Array(await file.arrayBuffer()),
      })),
    );

    const result = await actor.uploadRemittancePaymentProofs(fileData);

    if ("err" in result) {
      throw new Error(result.err);
    }

    return result.ok;
  } catch (error) {
    //console.error("Failed to upload remittance payment proofs:", error);
    throw new Error(
      `Failed to upload remittance payment proofs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Uploads payment proof files and submits them for a remittance order in one transaction
 * @param orderId The remittance order ID
 * @param amountPaid Amount paid in PHP (will be converted to centavos)
 * @param files Array of files to upload as payment proof
 * @returns Updated remittance order
 */
export const uploadAndSubmitPaymentProof = async (
  orderId: string,
  amountPaid: number,
  files: File[],
): Promise<RemittanceOrder> => {
  try {
    const actor = getRemittanceActor(true);

    // Convert amount from PHP to centavos
    const amountCentavos = Math.round(amountPaid * 100);

    // Convert files to the format expected by the canister
    const fileData = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        contentType: file.type,
        fileData: new Uint8Array(await file.arrayBuffer()),
      })),
    );

    const result = await actor.uploadAndSubmitPaymentProof(
      orderId,
      BigInt(amountCentavos),
      fileData,
    );

    if ("err" in result) {
      throw new Error(result.err);
    }

    return convertRemittanceOrder(result.ok);
  } catch (error) {
    //console.error("Failed to upload and submit payment proof:", error);
    throw new Error(
      `Failed to upload and submit payment proof: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Submits payment proof for a remittance order
 * @param orderId The remittance order ID
 * @param mediaIds Array of media IDs as payment proof
 * @returns Updated remittance order
 */
export const submitPaymentProof = async (
  orderId: string,
  mediaIds: string[],
): Promise<RemittanceOrder> => {
  try {
    const actor = getRemittanceActor(true);
    const result = await actor.submitPaymentProof(orderId, mediaIds);

    if ("err" in result) {
      throw new Error(result.err);
    }

    return convertRemittanceOrder(result.ok);
  } catch (error) {
    //console.error("Failed to submit payment proof:", error);
    throw new Error(
      `Failed to submit payment proof: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Gets a specific remittance order by ID
 * @param orderId The remittance order ID
 * @returns Remittance order or null if not found
 */
export const getOrder = async (
  orderId: string,
): Promise<RemittanceOrder | null> => {
  try {
    const actor = getRemittanceActor(true);
    const result = await actor.getOrder(orderId);
    return result[0] ? convertRemittanceOrder(result[0]) : null;
  } catch (error) {
    //console.error("Failed to get order:", error);
    throw new Error(
      `Failed to get order: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Gets a commission quote for a service
 * @param amount Service amount in PHP (will be converted to centavos)
 * @param serviceType Type of service
 * @param serviceDate Date when service will be performed
 * @returns Commission quote details
 */
export const quoteCommission = async (
  amount: number,
  serviceType: string,
  serviceDate: Date,
): Promise<CommissionQuote> => {
  try {
    const actor = getRemittanceActor(true);

    // Convert payment method to canister format (default to CashOnHand)
    const canisterPaymentMethod: CanisterPaymentMethod = { CashOnHand: null };

    const result = await actor.quoteCommission(
      convertPhpToCentavos(amount),
      serviceType,
      canisterPaymentMethod,
      convertDateToTime(serviceDate),
    );

    if ("err" in result) {
      throw new Error(result.err);
    }

    return {
      net: convertCentavosToPhp(result.ok.net),
      ruleVersion: result.ok.rule_version,
      commission: convertCentavosToPhp(result.ok.commission),
      effectiveRate: result.ok.effective_rate,
      ruleId: result.ok.rule_id,
    };
  } catch (error) {
    //console.error("Failed to quote commission:", error);
    throw new Error(
      `Failed to quote commission: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

/**
 * Generates settlement instructions for a remittance order
 * @param orderId The remittance order ID
 * @returns Settlement instructions with payment details
 */
export const generateSettlementInstruction = async (
  orderId: string,
): Promise<SettlementInstruction> => {
  try {
    const actor = getRemittanceActor(true);
    const result = await actor.generateSettlementInstruction(orderId);

    if ("err" in result) {
      throw new Error(result.err);
    }

    return {
      instructions: result.ok.instructions,
      referenceNumber: result.ok.reference_number,
      commissionAmount: convertCentavosToPhp(result.ok.commission_amount),
      corporateGcashAccount: result.ok.corporate_gcash_account,
      expiresAt: convertTimeToDate(result.ok.expires_at),
    };
  } catch (error) {
    //console.error("Failed to generate settlement instruction:", error);
    throw new Error(
      `Failed to generate settlement instruction: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Reset functions for authentication state changes
export const resetRemittanceActor = () => {
  remittanceActor = null;
};

export const refreshRemittanceActor = async () => {
  resetRemittanceActor();
  return await getRemittanceActor();
};
