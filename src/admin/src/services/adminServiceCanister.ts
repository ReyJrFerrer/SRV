// Admin Service Canister Interface
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/admin";
import { canisterId as remittanceCanisterId } from "../../../declarations/remittance";
import { canisterId as mediaCanisterId } from "../../../declarations/media";
import type {
  _SERVICE as AdminService,
  CommissionRule,
  CommissionRuleDraft,
  CommissionRuleFilter,
  UserRoleAssignment,
  RemittanceOrder,
  MediaItem,
} from "../../../declarations/admin/admin.did";
import { Identity } from "@dfinity/agent";

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

export interface FrontendRemittanceOrder {
  id: string;
  status:
    | "AwaitingPayment"
    | "PaymentSubmitted"
    | "PaymentValidated"
    | "Cancelled"
    | "Settled";
  serviceType: string;
  serviceProviderId: string;
  amount: number; // in PHP (converted from centavos)
  commissionAmount: number; // in PHP (converted from centavos)
  paymentMethod: string;
  bookingId?: string;
  serviceId?: string;
  commissionRuleId: string;
  commissionVersion: number;
  paymentProofMediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
  paymentSubmittedAt?: Date;
  validatedAt?: Date;
  validatedBy?: string;
  settledAt?: Date;
}

export interface FrontendMediaItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  contentType: string;
  mediaType:
    | "ServiceImage"
    | "RemittancePaymentProof"
    | "UserProfile"
    | "ServiceCertificate";
  fileSize: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrontendSystemStats {
  totalCommissionRules: number;
  activeCommissionRules: number;
  totalUsersWithRoles: number;
  adminUsers: number;
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
 * Creates an admin actor with the provided identity
 */
const createAdminActor = (identity?: Identity | null): AdminService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as AdminService;
};

// Singleton actor instance with identity tracking
let adminActor: AdminService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the admin actor with a new identity
 */
export const updateAdminActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    adminActor = createAdminActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current admin actor
 */
const getAdminActor = (requireAuth: boolean = false): AdminService => {
  if (requireAuth && !currentIdentity) {
    throw new AdminServiceError({
      message:
        "Authentication required: Please log in as an admin to perform this action",
      code: "AUTH_REQUIRED",
    });
  }

  if (!adminActor) {
    adminActor = createAdminActor(currentIdentity);
  }

  return adminActor;
};

// Type conversion utilities
const convertTimeToDate = (time: bigint): Date => {
  return new Date(Number(time) / 1000000); // Convert nanoseconds to milliseconds
};

const convertDateToTime = (date: Date): bigint => {
  return BigInt(date.getTime() * 1000000); // Convert milliseconds to nanoseconds
};

const convertCommissionFormula = (
  backendFormula: any,
): FrontendCommissionRule["formula"] => {
  if ("Flat" in backendFormula) {
    return { type: "Flat", value: Number(backendFormula.Flat) };
  } else if ("Percentage" in backendFormula) {
    return { type: "Percentage", value: Number(backendFormula.Percentage) };
  } else if ("Hybrid" in backendFormula) {
    return {
      type: "Hybrid",
      value: Number(backendFormula.Hybrid.rate_bps),
      base: Number(backendFormula.Hybrid.base),
    };
  } else if ("Tiered" in backendFormula) {
    return {
      type: "Tiered",
      value: 0, // Not used for tiered
      tiers: backendFormula.Tiered.map(
        ([threshold, rate]: [bigint, bigint]) => ({
          threshold: Number(threshold),
          rate: Number(rate),
        }),
      ),
    };
  }
  throw new Error("Unknown commission formula type");
};

const convertToBackendFormula = (
  frontendFormula: FrontendCommissionRuleDraft["formula"],
): any => {
  switch (frontendFormula.type) {
    case "Flat":
      return { Flat: BigInt(frontendFormula.value) };
    case "Percentage":
      return { Percentage: BigInt(frontendFormula.value) };
    case "Hybrid":
      return {
        Hybrid: {
          base: BigInt(frontendFormula.base || 0),
          rate_bps: BigInt(frontendFormula.value),
        },
      };
    case "Tiered":
      return {
        Tiered: (frontendFormula.tiers || []).map((tier) => [
          BigInt(tier.threshold),
          BigInt(tier.rate),
        ]),
      };
    default:
      throw new Error("Unknown commission formula type");
  }
};

const convertCommissionRule = (
  rule: CommissionRule,
): FrontendCommissionRule => ({
  id: rule.id,
  serviceTypes: rule.service_types,
  paymentMethods: rule.payment_methods.map((pm) =>
    "CashOnHand" in pm ? "CashOnHand" : "Unknown",
  ),
  formula: convertCommissionFormula(rule.formula),
  minCommission: rule.min_commission[0]
    ? Number(rule.min_commission[0])
    : undefined,
  maxCommission: rule.max_commission[0]
    ? Number(rule.max_commission[0])
    : undefined,
  priority: Number(rule.priority),
  isActive: rule.is_active,
  effectiveFrom: convertTimeToDate(rule.effective_from),
  effectiveTo: rule.effective_to[0]
    ? convertTimeToDate(rule.effective_to[0])
    : undefined,
  createdAt: convertTimeToDate(rule.created_at),
  updatedAt: convertTimeToDate(rule.updated_at),
  version: rule.version,
});

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
    status: getStatusString(order.status),
    serviceType: order.service_type,
    serviceProviderId: order.service_provider_id.toString(),
    amount: Number(order.amount_php_centavos) / 100, // Convert centavos to PHP
    commissionAmount: Number(order.commission_amount) / 100, // Convert centavos to PHP
    paymentMethod:
      "CashOnHand" in order.payment_method ? "CashOnHand" : "Unknown",
    bookingId: order.booking_id[0],
    serviceId: order.service_id[0],
    commissionRuleId: order.commission_rule_id,
    commissionVersion: order.commission_version,
    paymentProofMediaIds: order.payment_proof_media_ids,
    createdAt: convertTimeToDate(order.created_at),
    updatedAt: convertTimeToDate(order.updated_at),
    paymentSubmittedAt: order.payment_submitted_at[0]
      ? convertTimeToDate(order.payment_submitted_at[0])
      : undefined,
    validatedAt: order.validated_at[0]
      ? convertTimeToDate(order.validated_at[0])
      : undefined,
    validatedBy: order.validated_by[0]
      ? order.validated_by[0].toString()
      : undefined,
    settledAt: order.settled_at[0]
      ? convertTimeToDate(order.settled_at[0])
      : undefined,
  };
};

const convertMediaItem = (item: MediaItem): FrontendMediaItem => {
  const getMediaTypeString = (
    mediaType: any,
  ): FrontendMediaItem["mediaType"] => {
    if ("ServiceImage" in mediaType) return "ServiceImage";
    if ("RemittancePaymentProof" in mediaType) return "RemittancePaymentProof";
    if ("UserProfile" in mediaType) return "UserProfile";
    if ("ServiceCertificate" in mediaType) return "ServiceCertificate";
    return "UserProfile";
  };

  return {
    id: item.id,
    fileName: item.fileName,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl[0],
    contentType: item.contentType,
    mediaType: getMediaTypeString(item.mediaType),
    fileSize: Number(item.fileSize),
    ownerId: item.ownerId.toString(),
    createdAt: convertTimeToDate(item.createdAt),
    updatedAt: convertTimeToDate(item.updatedAt),
  };
};

// Error handling utility
const handleResult = <T>(result: any, errorPrefix: string): T => {
  if ("ok" in result) {
    return result.ok as T;
  } else if ("err" in result) {
    throw new AdminServiceError({
      message: `${errorPrefix}: ${result.err}`,
      code: "CANISTER_ERROR",
      details: result.err,
    });
  } else {
    throw new AdminServiceError({
      message: `${errorPrefix}: Unexpected result format`,
      code: "UNKNOWN_ERROR",
      details: result,
    });
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
      const actor = getAdminActor();

      // Convert frontend rules to backend format
      const backendRules: CommissionRuleDraft[] = rules.map((rule) => ({
        id: rule.id ? [rule.id] : [],
        service_types: rule.serviceTypes,
        payment_methods: [{ CashOnHand: null }], // Only CashOnHand for now
        formula: convertToBackendFormula(rule.formula),
        min_commission: rule.minCommission ? [BigInt(rule.minCommission)] : [],
        max_commission: rule.maxCommission ? [BigInt(rule.maxCommission)] : [],
        priority: BigInt(rule.priority),
        effective_from: convertDateToTime(rule.effectiveFrom),
        effective_to: rule.effectiveTo
          ? [convertDateToTime(rule.effectiveTo)]
          : [],
      }));

      const result = await actor.upsertCommissionRules(backendRules);
      const createdRules = handleResult<CommissionRule[]>(
        result,
        "Failed to create/update commission rules",
      );

      return createdRules.map(convertCommissionRule);
    } catch (error) {
      //console.error("Error upserting commission rules:", error);
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
      const actor = getAdminActor();

      const backendFilter: CommissionRuleFilter = {
        service_type: filter?.serviceType ? [filter.serviceType] : [],
        active_only:
          filter?.activeOnly !== undefined ? [filter.activeOnly] : [],
        payment_method: [], // Will implement when more payment methods are added
      };

      const rules = await actor.listRules(backendFilter);
      return rules.map(convertCommissionRule);
    } catch (error) {
      //console.error("Error listing commission rules:", error);
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
      const actor = getAdminActor();
      const result = await actor.getRule(ruleId);

      return result[0] ? convertCommissionRule(result[0]) : null;
    } catch (error) {
      //console.error("Error getting commission rule:", error);
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
      const actor = getAdminActor();
      const result = await actor.activateRule(ruleId, version);

      return handleResult<string>(result, "Failed to activate commission rule");
    } catch (error) {
      //console.error("Error activating commission rule:", error);
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
      const actor = getAdminActor();
      const result = await actor.deactivateRule(ruleId);

      return handleResult<string>(
        result,
        "Failed to deactivate commission rule",
      );
    } catch (error) {
      //console.error("Error deactivating commission rule:", error);
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
      const actor = getAdminActor();
      const principal = Principal.fromText(userId);
      const result = await actor.assignRole(
        principal,
        { ADMIN: null },
        scope ? [scope] : [],
      );

      return handleResult<string>(result, "Failed to assign admin role");
    } catch (error) {
      //console.error("Error assigning admin role:", error);
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
      const actor = getAdminActor();
      const principal = Principal.fromText(userId);
      const result = await actor.removeRole(principal);

      return handleResult<string>(result, "Failed to remove user role");
    } catch (error) {
      //console.error("Error removing user role:", error);
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
      const actor = getAdminActor();
      const principal = Principal.fromText(userId);
      const result = await actor.getUserRole(principal);

      if (!result[0]) return null;

      const assignment = result[0];
      return {
        userId: assignment.user_id.toString(),
        role: "ADMIN",
        scope: assignment.scope[0],
        assignedBy: assignment.assigned_by.toString(),
        assignedAt: convertTimeToDate(assignment.assigned_at),
      };
    } catch (error) {
      //console.error("Error getting user role:", error);
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
      //console.error("Error checking admin role:", error);
      return false;
    }
  },

  /**
   * List all user role assignments
   */
  async listUserRoles(): Promise<FrontendUserRoleAssignment[]> {
    try {
      const actor = getAdminActor();
      const result = await actor.listUserRoles();
      const assignments = handleResult<UserRoleAssignment[]>(
        result,
        "Failed to list user roles",
      );

      return assignments.map((assignment) => ({
        userId: assignment.user_id.toString(),
        role: "ADMIN" as const,
        scope: assignment.scope[0],
        assignedBy: assignment.assigned_by.toString(),
        assignedAt: convertTimeToDate(assignment.assigned_at),
      }));
    } catch (error) {
      //console.error("Error listing user roles:", error);
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
      const actor = getAdminActor();
      const principal = Principal.fromText(userId);
      return await actor.hasRole(principal, { ADMIN: null });
    } catch (error) {
      //console.error("Error checking admin role:", error);
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
      const actor = getAdminActor();

      const backendSettings = {
        corporate_gcash_account: settings.corporateGcashAccount
          ? ([settings.corporateGcashAccount] as [string])
          : ([] as []),
        settlement_deadline_hours: settings.settlementDeadlineHours
          ? ([settings.settlementDeadlineHours] as [number])
          : ([] as []),
        max_commission_rate_bps: settings.maxCommissionRateBps
          ? ([BigInt(settings.maxCommissionRateBps)] as [bigint])
          : ([] as []),
        min_order_amount: settings.minOrderAmount
          ? ([BigInt(settings.minOrderAmount * 100)] as [bigint])
          : ([] as []), // Convert to centavos
        max_order_amount: settings.maxOrderAmount
          ? ([BigInt(settings.maxOrderAmount * 100)] as [bigint])
          : ([] as []), // Convert to centavos
      };

      const result = await actor.setSettings(backendSettings);
      return handleResult<string>(result, "Failed to update system settings");
    } catch (error) {
      //console.error("Error updating system settings:", error);
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
      const actor = getAdminActor();
      const settings = await actor.getSettings();

      return {
        corporateGcashAccount: settings.corporate_gcash_account,
        settlementDeadlineHours: settings.settlement_deadline_hours,
        maxCommissionRateBps: Number(settings.max_commission_rate_bps),
        minOrderAmount: Number(settings.min_order_amount) / 100, // Convert from centavos to PHP
        maxOrderAmount: Number(settings.max_order_amount) / 100, // Convert from centavos to PHP
        updatedAt: convertTimeToDate(settings.updated_at),
        updatedBy: settings.updated_by.toString(),
      };
    } catch (error) {
      //console.error("Error getting system settings:", error);
      throw new AdminServiceError({
        message: `Failed to get system settings: ${error}`,
        code: "GET_SETTINGS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  // Payment Validation

  /**
   * Validate a remittance payment
   */
  async validatePayment(
    orderId: string,
    approved: boolean,
    reason?: string,
  ): Promise<string> {
    try {
      const actor = getAdminActor();
      const result = await actor.validatePayment(
        orderId,
        approved,
        reason ? [reason] : [],
      );

      return handleResult<string>(result, "Failed to validate payment");
    } catch (error) {
      //console.error("Error validating payment:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to validate payment: ${error}`,
        code: "VALIDATE_PAYMENT_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  /**
   * Get pending payment validations
   */
  async getPendingValidations(): Promise<FrontendRemittanceOrder[]> {
    try {
      const actor = getAdminActor();
      const result = await actor.getPendingValidations();
      const orders = handleResult<RemittanceOrder[]>(
        result,
        "Failed to get pending validations",
      );

      return orders.map(convertRemittanceOrder);
    } catch (error) {
      //console.error("Error getting pending validations:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to get pending validations: ${error}`,
        code: "GET_PENDING_VALIDATIONS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  /**
   * Get remittance media items for validation
   */
  async getRemittanceMediaItems(
    mediaIds: string[],
  ): Promise<FrontendMediaItem[]> {
    try {
      const actor = getAdminActor();
      const result = await actor.getRemittanceMediaItems(mediaIds);
      const mediaItems = handleResult<MediaItem[]>(
        result,
        "Failed to get remittance media items",
      );

      return mediaItems.map(convertMediaItem);
    } catch (error) {
      //console.error("Error getting remittance media items:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to get remittance media items: ${error}`,
        code: "GET_MEDIA_ITEMS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  /**
   * Get remittance order with associated media items
   */
  async getRemittanceOrderWithMedia(orderId: string): Promise<{
    order: FrontendRemittanceOrder;
    mediaItems: FrontendMediaItem[];
  }> {
    try {
      const actor = getAdminActor();
      const result = await actor.getRemittanceOrderWithMedia(orderId);
      const data = handleResult<{
        order: RemittanceOrder;
        mediaItems: MediaItem[];
      }>(result, "Failed to get remittance order with media");

      return {
        order: convertRemittanceOrder(data.order),
        mediaItems: data.mediaItems.map(convertMediaItem),
      };
    } catch (error) {
      //console.error("Error getting remittance order with media:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to get remittance order with media: ${error}`,
        code: "GET_ORDER_WITH_MEDIA_ERROR",
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
      const actor = getAdminActor();
      const result = await actor.getSystemStats();
      const stats = handleResult<{
        total_commission_rules: bigint;
        active_commission_rules: bigint;
        total_users_with_roles: bigint;
        admin_users: bigint;
      }>(result, "Failed to get system statistics");

      return {
        totalCommissionRules: Number(stats.total_commission_rules),
        activeCommissionRules: Number(stats.active_commission_rules),
        totalUsersWithRoles: Number(stats.total_users_with_roles),
        adminUsers: Number(stats.admin_users),
      };
    } catch (error) {
      //console.error("Error getting system stats:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to get system statistics: ${error}`,
        code: "GET_SYSTEM_STATS_ERROR",
        details: error,
      } as AdminServiceError);
    }
  },

  // Canister Management

  /**
   * Set canister references for intercanister calls
   */
  async setCanisterReferences(): Promise<string> {
    try {
      const actor = getAdminActor();

      const remittancePrincipal: [] | [Principal] = remittanceCanisterId
        ? [Principal.fromText(remittanceCanisterId)]
        : [];
      const mediaPrincipal: [] | [Principal] = mediaCanisterId
        ? [Principal.fromText(mediaCanisterId)]
        : [];

      const result = await actor.setCanisterReferences(
        remittancePrincipal,
        mediaPrincipal,
      );
      return handleResult<string>(result, "Failed to set canister references");
    } catch (error) {
      //console.error("Error setting canister references:", error);
      if (error instanceof AdminServiceError) throw error;
      throw new AdminServiceError({
        message: `Failed to set canister references: ${error}`,
        code: "SET_CANISTER_REFS_ERROR",
        details: error,
      } as AdminServiceError);
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
  setCanisterReferences,
} = adminServiceCanister;
