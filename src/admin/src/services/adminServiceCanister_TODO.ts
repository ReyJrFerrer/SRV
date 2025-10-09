// // Admin Service Firebase Interface
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFunctions, httpsCallable } from "firebase/functions";
// // Keep some Motoko types for compatibility during migration
// import { Principal } from "@dfinity/principal";
// import { Identity } from "@dfinity/agent";

// // Firebase configuration - should match your app's config
// const firebaseConfig = {
//   // This should be loaded from environment variables or app config
//   apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
//   authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.REACT_APP_FIREBASE_APP_ID,
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const functions = getFunctions(app);

// // Helper function to convert Motoko Time (BigInt nanoseconds) to ISO string
// const convertMotokoTime = (timeValue: any): string | null => {
//   if (!timeValue) return null;

//   try {
//     // Handle BigInt timestamps (Motoko Time is in nanoseconds)
//     if (typeof timeValue === "bigint") {
//       // Convert nanoseconds to milliseconds
//       const milliseconds = Number(timeValue) / 1000000;
//       return new Date(milliseconds).toISOString();
//     }

//     // Handle number timestamps
//     if (typeof timeValue === "number") {
//       // If it's already in milliseconds
//       if (timeValue > 1000000000000) {
//         return new Date(timeValue).toISOString();
//       }
//       // If it's in nanoseconds, convert to milliseconds
//       return new Date(timeValue / 1000000).toISOString();
//     }

//     // Handle string timestamps
//     if (typeof timeValue === "string") {
//       const numValue = Number(timeValue);
//       if (!isNaN(numValue)) {
//         // If it's a numeric string, treat as nanoseconds
//         return new Date(numValue / 1000000).toISOString();
//       }
//       // If it's already a date string, return as is
//       return timeValue;
//     }

//     return null;
//   } catch (error) {
//     logError("Error converting time", { timeValue, error });
//     return null;
//   }
// };

// // ===== HELPER FUNCTIONS =====

// // Helper function to create actors with consistent error handling
// const createCanisterActor = async (
//   canisterName: string,
//   identity?: Identity | null,
// ) => {
//   const { createActor } = await import(`../../../declarations/${canisterName}`);
//   const { canisterId: canisterId } = await import(
//     `../../../declarations/${canisterName}`
//   );

//   return createActor(canisterId, {
//     agentOptions:
//       identity || currentIdentity
//         ? { identity: identity || currentIdentity }
//         : undefined,
//   });
// };

// // Helper function to create AdminServiceError
// const createAdminError = (
//   message: string,
//   code: string,
//   details?: any,
// ): AdminServiceError => {
//   return new AdminServiceError({
//     message,
//     code,
//     details,
//   } as AdminServiceError);
// };

// // Helper function for consistent error handling
// const handleError = (error: any, context: string, code: string): never => {
//   console.error(`Error in ${context}:`, error);
//   if (error instanceof AdminServiceError) throw error;
//   throw createAdminError(`Failed to ${context}: ${error}`, code, error);
// };

// // Helper function for success logging
// const logSuccess = (message: string) => {
//   console.log(`✅ ${message}`);
// };

// // Helper function for error logging
// const logError = (message: string, error?: any) => {
//   console.error(`❌ ${message}`, error);
// };

// // Service data conversion functions (matching provider implementation)
// export interface ServiceData {
//   id: string;
//   title: string;
//   description: string;
//   category: string;
//   status: string;
//   type: string;
//   price: number;
//   currency: string;
//   duration?: number;
//   location: {
//     latitude: number;
//     longitude: number;
//     address: string;
//     city: string;
//     state: string;
//     country: string;
//     postalCode: string;
//   };
//   scheduledDate?: Date;
//   completedDate?: Date;
//   createdDate: Date;
//   clientId?: string;
//   clientName?: string;
//   providerId?: string;
//   providerName?: string;
//   rating?: number;
//   reviewCount?: number;
//   imageUrls: string[];
//   certificateUrls: string[];
//   weeklySchedule: Array<{
//     dayOfWeek: number;
//     availability: {
//       isAvailable: boolean;
//       slots: Array<{
//         startTime: string;
//         endTime: string;
//       }>;
//     };
//   }>;
//   packages: Array<{
//     id: string;
//     name: string;
//     description: string;
//     price: number;
//     duration?: number;
//   }>;
// }

// // Conversion functions (matching provider implementation)
// const convertCanisterServiceStatus = (status: any): string => {
//   if ("Available" in status) return "Available";
//   if ("Suspended" in status) return "Suspended";
//   if ("Unavailable" in status) return "Unavailable";
//   return "Available";
// };

// const convertCanisterDayOfWeek = (day: any): number => {
//   if ("Monday" in day) return 1;
//   if ("Tuesday" in day) return 2;
//   if ("Wednesday" in day) return 3;
//   if ("Thursday" in day) return 4;
//   if ("Friday" in day) return 5;
//   if ("Saturday" in day) return 6;
//   if ("Sunday" in day) return 0;
//   return 0;
// };

// const convertCanisterDayAvailability = (availability: any) => ({
//   isAvailable: availability.isAvailable,
//   slots: availability.slots || [],
// });

// // Copy provider's location conversion function exactly
// const convertCanisterLocation = (location: any) => ({
//   latitude: location.latitude,
//   longitude: location.longitude,
//   address: location.address,
//   city: location.city,
//   state: location.state,
//   country: location.country,
//   postalCode: location.postalCode,
// });

// const convertCanisterService = (service: any): ServiceData => ({
//   id: service.id,
//   title: service.title,
//   description: service.description,
//   category: service.category?.name || "General",
//   status: convertCanisterServiceStatus(service.status),
//   type: "offered",
//   price: Number(service.price) / 100, // Convert from centavos to PHP
//   currency: "PHP",
//   duration: undefined,
//   location: convertCanisterLocation(service.location), // Use proper location conversion like provider
//   scheduledDate: undefined,
//   completedDate: undefined,
//   createdDate: new Date(Number(service.createdAt) / 1000000),
//   clientId: undefined,
//   clientName: undefined,
//   providerId: service.providerId?.toString(),
//   providerName: "Service Provider",
//   rating: service.rating?.[0] ? Number(service.rating[0]) : undefined,
//   reviewCount: service.reviewCount ? Number(service.reviewCount) : undefined,
//   imageUrls: service.imageUrls || [], // Match provider's approach
//   certificateUrls: service.certificateUrls || [], // Match provider's approach
//   weeklySchedule:
//     service.weeklySchedule?.[0]?.map(([day, avail]: [any, any]) => ({
//       dayOfWeek: convertCanisterDayOfWeek(day),
//       availability: convertCanisterDayAvailability(avail),
//     })) || [],
//   packages: [], // Will be populated separately
// });

// const convertCanisterServicePackage = (pkg: any) => ({
//   id: pkg.id,
//   name: pkg.title,
//   description: pkg.description,
//   price: Number(pkg.price) / 100, // Convert from centavos to PHP
//   duration: undefined,
// });

// // Frontend-adapted types for better usability
// export interface FrontendCommissionRule {
//   id: string;
//   serviceTypes: string[];
//   paymentMethods: string[];
//   formula: {
//     type: "Flat" | "Percentage" | "Tiered" | "Hybrid";
//     value: number;
//     base?: number; // for Hybrid
//     tiers?: Array<{ threshold: number; rate: number }>; // for Tiered
//   };
//   minCommission?: number;
//   maxCommission?: number;
//   priority: number;
//   isActive: boolean;
//   effectiveFrom: Date;
//   effectiveTo?: Date;
//   createdAt: Date;
//   updatedAt: Date;
//   version: number;
// }

// export interface FrontendCommissionRuleDraft {
//   id?: string;
//   serviceTypes: string[];
//   paymentMethods: string[];
//   formula: {
//     type: "Flat" | "Percentage" | "Tiered" | "Hybrid";
//     value: number;
//     base?: number;
//     tiers?: Array<{ threshold: number; rate: number }>;
//   };
//   minCommission?: number;
//   maxCommission?: number;
//   priority: number;
//   effectiveFrom: Date;
//   effectiveTo?: Date;
// }

// export interface FrontendSystemSettings {
//   corporateGcashAccount: string;
//   settlementDeadlineHours: number;
//   maxCommissionRateBps: number;
//   minOrderAmount: number;
//   maxOrderAmount: number;
//   updatedAt: Date;
//   updatedBy: string;
// }

// export interface FrontendUserRoleAssignment {
//   userId: string;
//   role: "ADMIN";
//   scope?: string;
//   assignedBy: string;
//   assignedAt: Date;
// }

// export interface FrontendRemittanceOrder {
//   id: string;
//   status:
//     | "AwaitingPayment"
//     | "PaymentSubmitted"
//     | "PaymentValidated"
//     | "Cancelled"
//     | "Settled";
//   serviceType: string;
//   serviceProviderId: string;
//   amount: number; // in PHP (converted from centavos)
//   commissionAmount: number; // in PHP (converted from centavos)
//   paymentMethod: string;
//   bookingId?: string;
//   serviceId?: string;
//   commissionRuleId: string;
//   commissionVersion: number;
//   paymentProofMediaIds: string[];
//   createdAt: Date;
//   updatedAt: Date;
//   paymentSubmittedAt?: Date;
//   validatedAt?: Date;
//   validatedBy?: string;
//   settledAt?: Date;
// }

// export interface FrontendMediaItem {
//   id: string;
//   fileName: string;
//   url: string;
//   thumbnailUrl?: string;
//   contentType: string;
//   mediaType:
//     | "ServiceImage"
//     | "RemittancePaymentProof"
//     | "UserProfile"
//     | "ServiceCertificate";
//   fileSize: number;
//   ownerId: string;
//   validationStatus?: "Pending" | "Validated" | "Rejected"; // Only for ServiceCertificate
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface FrontendSystemStats {
//   totalCommissionRules: number;
//   activeCommissionRules: number;
//   totalUsersWithRoles: number;
//   adminUsers: number;
// }

// export class AdminServiceError extends Error {
//   public code: string;
//   public details?: any;

//   constructor(options: { message: string; code: string; details?: any }) {
//     super(options.message);
//     this.name = "AdminServiceError";
//     this.code = options.code;
//     this.details = options.details;
//   }
// }

// /**
//  * Helper function to call Firebase Cloud Functions
//  */
// const callFirebaseFunction = async (functionName: string, payload: any) => {
//   try {
//     const callable = httpsCallable(functions, functionName);
//     const result = await callable(payload);

//     if ((result.data as any).success) {
//       return (result.data as any).data;
//     } else {
//       throw new Error((result.data as any).message || "Function call failed");
//     }
//   } catch (error: any) {
//     console.error(`Error calling ${functionName}:`, error);
//     throw error;
//   }
// };

// // Keep track of current identity for compatibility
// let currentIdentity: Identity | null = null;

// /**
//  * Updates the current identity (compatibility function)
//  */
// export const updateAdminActor = (identity: Identity | null) => {
//   currentIdentity = identity;
//   return null; // Firebase doesn't use actors
// };

// /**
//  * Check if user is authenticated
//  */
// const requireAuth = () => {
//   if (!auth.currentUser) {
//     throw createAdminError(
//       "Authentication required: Please log in as an admin to perform this action",
//       "AUTH_REQUIRED",
//     );
//   }
// };

// // Type conversion utilities
// const convertTimeToDate = (time: bigint): Date => {
//   return new Date(Number(time) / 1000000); // Convert nanoseconds to milliseconds
// };

// const convertDateToTime = (date: Date): bigint => {
//   return BigInt(date.getTime() * 1000000); // Convert milliseconds to nanoseconds
// };

// const convertCommissionFormula = (
//   backendFormula: any,
// ): FrontendCommissionRule["formula"] => {
//   if ("Flat" in backendFormula) {
//     return { type: "Flat", value: Number(backendFormula.Flat) };
//   } else if ("Percentage" in backendFormula) {
//     return { type: "Percentage", value: Number(backendFormula.Percentage) };
//   } else if ("Hybrid" in backendFormula) {
//     return {
//       type: "Hybrid",
//       value: Number(backendFormula.Hybrid.rate_bps),
//       base: Number(backendFormula.Hybrid.base),
//     };
//   } else if ("Tiered" in backendFormula) {
//     return {
//       type: "Tiered",
//       value: 0, // Not used for tiered
//       tiers: backendFormula.Tiered.map(
//         ([threshold, rate]: [bigint, bigint]) => ({
//           threshold: Number(threshold),
//           rate: Number(rate),
//         }),
//       ),
//     };
//   }
//   throw new Error("Unknown commission formula type");
// };

// const convertToBackendFormula = (
//   frontendFormula: FrontendCommissionRuleDraft["formula"],
// ): any => {
//   switch (frontendFormula.type) {
//     case "Flat":
//       return { Flat: BigInt(frontendFormula.value) };
//     case "Percentage":
//       return { Percentage: BigInt(frontendFormula.value) };
//     case "Hybrid":
//       return {
//         Hybrid: {
//           base: BigInt(frontendFormula.base || 0),
//           rate_bps: BigInt(frontendFormula.value),
//         },
//       };
//     case "Tiered":
//       return {
//         Tiered: (frontendFormula.tiers || []).map((tier) => [
//           BigInt(tier.threshold),
//           BigInt(tier.rate),
//         ]),
//       };
//     default:
//       throw new Error("Unknown commission formula type");
//   }
// };

// const convertCommissionRule = (
//   rule: CommissionRule,
// ): FrontendCommissionRule => ({
//   id: rule.id,
//   serviceTypes: rule.service_types,
//   paymentMethods: rule.payment_methods.map((pm) =>
//     "CashOnHand" in pm ? "CashOnHand" : "Unknown",
//   ),
//   formula: convertCommissionFormula(rule.formula),
//   minCommission: rule.min_commission[0]
//     ? Number(rule.min_commission[0])
//     : undefined,
//   maxCommission: rule.max_commission[0]
//     ? Number(rule.max_commission[0])
//     : undefined,
//   priority: Number(rule.priority),
//   isActive: rule.is_active,
//   effectiveFrom: convertTimeToDate(rule.effective_from),
//   effectiveTo: rule.effective_to[0]
//     ? convertTimeToDate(rule.effective_to[0])
//     : undefined,
//   createdAt: convertTimeToDate(rule.created_at),
//   updatedAt: convertTimeToDate(rule.updated_at),
//   version: rule.version,
// });

// const convertRemittanceOrder = (
//   order: RemittanceOrder,
// ): FrontendRemittanceOrder => {
//   const getStatusString = (status: any): FrontendRemittanceOrder["status"] => {
//     if ("AwaitingPayment" in status) return "AwaitingPayment";
//     if ("PaymentSubmitted" in status) return "PaymentSubmitted";
//     if ("PaymentValidated" in status) return "PaymentValidated";
//     if ("Cancelled" in status) return "Cancelled";
//     if ("Settled" in status) return "Settled";
//     return "AwaitingPayment";
//   };

//   return {
//     id: order.id,
//     status: getStatusString(order.status),
//     serviceType: order.service_type,
//     serviceProviderId: order.service_provider_id.toString(),
//     amount: Number(order.amount_php_centavos) / 100, // Convert centavos to PHP
//     commissionAmount: Number(order.commission_amount) / 100, // Convert centavos to PHP
//     paymentMethod:
//       "CashOnHand" in order.payment_method ? "CashOnHand" : "Unknown",
//     bookingId: order.booking_id[0],
//     serviceId: order.service_id[0],
//     commissionRuleId: order.commission_rule_id,
//     commissionVersion: order.commission_version,
//     paymentProofMediaIds: order.payment_proof_media_ids,
//     createdAt: convertTimeToDate(order.created_at),
//     updatedAt: convertTimeToDate(order.updated_at),
//     paymentSubmittedAt: order.payment_submitted_at[0]
//       ? convertTimeToDate(order.payment_submitted_at[0])
//       : undefined,
//     validatedAt: order.validated_at[0]
//       ? convertTimeToDate(order.validated_at[0])
//       : undefined,
//     validatedBy: order.validated_by[0]
//       ? order.validated_by[0].toString()
//       : undefined,
//     settledAt: order.settled_at[0]
//       ? convertTimeToDate(order.settled_at[0])
//       : undefined,
//   };
// };

// const convertMediaItem = (item: MediaItem): FrontendMediaItem => {
//   const getMediaTypeString = (
//     mediaType: any,
//   ): FrontendMediaItem["mediaType"] => {
//     if ("ServiceImage" in mediaType) return "ServiceImage";
//     if ("RemittancePaymentProof" in mediaType) return "RemittancePaymentProof";
//     if ("UserProfile" in mediaType) return "UserProfile";
//     if ("ServiceCertificate" in mediaType) return "ServiceCertificate";
//     return "UserProfile";
//   };

//   return {
//     id: item.id,
//     fileName: item.fileName,
//     url: item.url,
//     thumbnailUrl: item.thumbnailUrl[0],
//     contentType: item.contentType,
//     mediaType: getMediaTypeString(item.mediaType),
//     fileSize: Number(item.fileSize),
//     ownerId: item.ownerId.toString(),
//     createdAt: convertTimeToDate(item.createdAt),
//     updatedAt: convertTimeToDate(item.updatedAt),
//   };
// };

// // Error handling utility
// const handleResult = <T>(result: any, errorPrefix: string): T => {
//   if ("ok" in result) {
//     return result.ok as T;
//   } else if ("err" in result) {
//     throw createAdminError(
//       `${errorPrefix}: ${result.err}`,
//       "CANISTER_ERROR",
//       result.err,
//     );
//   } else {
//     throw createAdminError(
//       `${errorPrefix}: Unexpected result format`,
//       "UNKNOWN_ERROR",
//       result,
//     );
//   }
// };

// // Main service object
// export const adminServiceCanister = {
//   // Commission Rules Management

//   /**
//    * Create or update commission rules
//    */
//   async upsertCommissionRules(
//     rules: FrontendCommissionRuleDraft[],
//   ): Promise<FrontendCommissionRule[]> {
//     try {
//       requireAuth();

//       // Convert frontend rules to proper format for Firebase
//       const rulesPayload = rules.map((rule) => ({
//         id: rule.id,
//         serviceTypes: rule.serviceTypes,
//         paymentMethods: ["CashOnHand"], // Simplified for Firebase
//         formula: rule.formula,
//         minCommission: rule.minCommission,
//         maxCommission: rule.maxCommission,
//         priority: rule.priority,
//         effectiveFrom: rule.effectiveFrom.toISOString(),
//         effectiveTo: rule.effectiveTo?.toISOString(),
//       }));

//       const result = await callFirebaseFunction("upsertCommissionRules", {
//         rules: rulesPayload,
//       });

//       // Convert Firebase result to frontend format
//       return result.map((rule: any) => ({
//         id: rule.id,
//         serviceTypes: rule.serviceTypes,
//         paymentMethods: rule.paymentMethods,
//         formula: rule.formula,
//         minCommission: rule.minCommission,
//         maxCommission: rule.maxCommission,
//         priority: rule.priority,
//         isActive: rule.isActive,
//         effectiveFrom: new Date(rule.effectiveFrom),
//         effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
//         createdAt: new Date(rule.createdAt),
//         updatedAt: new Date(rule.updatedAt),
//         version: rule.version,
//       }));
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to create/update commission rules: ${error}`,
//         code: "UPSERT_RULES_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Get all commission rules with optional filtering
//    */
//   async listRules(filter?: {
//     serviceType?: string;
//     activeOnly?: boolean;
//     paymentMethod?: string;
//   }): Promise<FrontendCommissionRule[]> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("listRules", {
//         filter: {
//           serviceType: filter?.serviceType,
//           activeOnly: filter?.activeOnly,
//           paymentMethod: filter?.paymentMethod,
//         },
//       });

//       // Convert Firebase result to frontend format
//       return result.map((rule: any) => ({
//         id: rule.id,
//         serviceTypes: rule.serviceTypes,
//         paymentMethods: rule.paymentMethods,
//         formula: rule.formula,
//         minCommission: rule.minCommission,
//         maxCommission: rule.maxCommission,
//         priority: rule.priority,
//         isActive: rule.isActive,
//         effectiveFrom: new Date(rule.effectiveFrom),
//         effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : undefined,
//         createdAt: new Date(rule.createdAt),
//         updatedAt: new Date(rule.updatedAt),
//         version: rule.version,
//       }));
//     } catch (error) {
//       throw new AdminServiceError({
//         message: `Failed to list commission rules: ${error}`,
//         code: "LIST_RULES_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Get a specific commission rule by ID
//    */
//   async getRule(ruleId: string): Promise<FrontendCommissionRule | null> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("getRule", { ruleId });

//       if (!result) return null;

//       // Convert Firebase result to frontend format
//       return {
//         id: result.id,
//         serviceTypes: result.serviceTypes,
//         paymentMethods: result.paymentMethods,
//         formula: result.formula,
//         minCommission: result.minCommission,
//         maxCommission: result.maxCommission,
//         priority: result.priority,
//         isActive: result.isActive,
//         effectiveFrom: new Date(result.effectiveFrom),
//         effectiveTo: result.effectiveTo ? new Date(result.effectiveTo) : undefined,
//         createdAt: new Date(result.createdAt),
//         updatedAt: new Date(result.updatedAt),
//         version: result.version,
//       };
//     } catch (error) {
//       throw new AdminServiceError({
//         message: `Failed to get commission rule: ${error}`,
//         code: "GET_RULE_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Activate a specific commission rule version
//    */
//   async activateRule(ruleId: string, version: number): Promise<string> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("activateRule", { ruleId, version });
//       return result.message || "Rule activated successfully";
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to activate commission rule: ${error}`,
//         code: "ACTIVATE_RULE_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Deactivate a commission rule
//    */
//   async deactivateRule(ruleId: string): Promise<string> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("deactivateRule", { ruleId });
//       return result.message || "Rule deactivated successfully";
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to deactivate commission rule: ${error}`,
//         code: "DEACTIVATE_RULE_ERROR",
//         details: error,
//       });
//     }
//   },

//   // User Role Management

//   /**
//    * Assign admin role to a user
//    */
//   async assignRole(userId: string, scope?: string): Promise<string> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("assignRole", {
//         userId,
//         role: "ADMIN",
//         scope
//       });
//       return result.message || "Role assigned successfully";
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to assign admin role: ${error}`,
//         code: "ASSIGN_ROLE_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Remove user role
//    */
//   async removeRole(userId: string): Promise<string> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("removeRole", { userId });
//       return result.message || "Role removed successfully";
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to remove user role: ${error}`,
//         code: "REMOVE_ROLE_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   /**
//    * Get user role assignment
//    */
//   async getUserRole(
//     userId: string,
//   ): Promise<FrontendUserRoleAssignment | null> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("getUserRole", { userId });

//       if (!result) return null;

//       return {
//         userId: result.userId,
//         role: "ADMIN",
//         scope: result.scope,
//         assignedBy: result.assignedBy,
//         assignedAt: new Date(result.assignedAt),
//       };
//     } catch (error) {
//       throw new AdminServiceError({
//         message: `Failed to get user role: ${error}`,
//         code: "GET_USER_ROLE_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   /**
//    * Check if a user has admin role
//    */
//   async checkAdminRole(userId: string): Promise<boolean> {
//     try {
//       const userRole = await this.getUserRole(userId);
//       return userRole !== null && userRole.role === "ADMIN";
//     } catch (error) {
//       return false;
//     }
//   },

//   /**
//    * List all user role assignments
//    */
//   async listUserRoles(): Promise<FrontendUserRoleAssignment[]> {
//     try {
//       const actor = getAdminActor();
//       const result = await actor.listUserRoles();
//       const assignments = handleResult<UserRoleAssignment[]>(
//         result,
//         "Failed to list user roles",
//       );

//       return assignments.map((assignment) => ({
//         userId: assignment.user_id.toString(),
//         role: "ADMIN" as const,
//         scope: assignment.scope[0],
//         assignedBy: assignment.assigned_by.toString(),
//         assignedAt: convertTimeToDate(assignment.assigned_at),
//       }));
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to list user roles: ${error}`,
//         code: "LIST_USER_ROLES_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   /**
//    * Check if user has admin role
//    */
//   async hasAdminRole(userId: string): Promise<boolean> {
//     try {
//       const actor = getAdminActor();
//       const principal = Principal.fromText(userId);
//       return await actor.hasRole(principal, { ADMIN: null });
//     } catch (error) {
//       return false;
//     }
//   },

//   // System Settings Management

//   /**
//    * Update system settings
//    */
//   async setSettings(settings: {
//     corporateGcashAccount?: string;
//     settlementDeadlineHours?: number;
//     maxCommissionRateBps?: number;
//     minOrderAmount?: number;
//     maxOrderAmount?: number;
//   }): Promise<string> {
//     try {
//       const actor = getAdminActor();

//       const backendSettings = {
//         corporate_gcash_account: settings.corporateGcashAccount
//           ? ([settings.corporateGcashAccount] as [string])
//           : ([] as []),
//         settlement_deadline_hours: settings.settlementDeadlineHours
//           ? ([settings.settlementDeadlineHours] as [number])
//           : ([] as []),
//         max_commission_rate_bps: settings.maxCommissionRateBps
//           ? ([BigInt(settings.maxCommissionRateBps)] as [bigint])
//           : ([] as []),
//         min_order_amount: settings.minOrderAmount
//           ? ([BigInt(settings.minOrderAmount * 100)] as [bigint])
//           : ([] as []), // Convert to centavos
//         max_order_amount: settings.maxOrderAmount
//           ? ([BigInt(settings.maxOrderAmount * 100)] as [bigint])
//           : ([] as []), // Convert to centavos
//       };

//       const result = await actor.setSettings(backendSettings);
//       return handleResult<string>(result, "Failed to update system settings");
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to update system settings: ${error}`,
//         code: "SET_SETTINGS_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   /**
//    * Get current system settings
//    */
//   async getSettings(): Promise<FrontendSystemSettings> {
//     try {
//       const actor = getAdminActor();
//       const settings = await actor.getSettings();

//       return {
//         corporateGcashAccount: settings.corporate_gcash_account,
//         settlementDeadlineHours: settings.settlement_deadline_hours,
//         maxCommissionRateBps: Number(settings.max_commission_rate_bps),
//         minOrderAmount: Number(settings.min_order_amount) / 100, // Convert from centavos to PHP
//         maxOrderAmount: Number(settings.max_order_amount) / 100, // Convert from centavos to PHP
//         updatedAt: convertTimeToDate(settings.updated_at),
//         updatedBy: settings.updated_by.toString(),
//       };
//     } catch (error) {
//       throw new AdminServiceError({
//         message: `Failed to get system settings: ${error}`,
//         code: "GET_SETTINGS_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   // Payment Validation

//   // /**
//   //  * Validate a remittance payment
//   //  */
//   // async validatePayment(
//   //   orderId: string,
//   //   approved: boolean,
//   //   reason?: string,
//   // ): Promise<string> {
//   //   try {
//   //     const actor = getAdminActor();
//   //     const result = await actor.validatePayment(
//   //       orderId,
//   //       approved,
//   //       reason ? [reason] : [],
//   //     );

//   //     return handleResult<string>(result, "Failed to validate payment");
//   //   } catch (error) {
//   //     if (error instanceof AdminServiceError) throw error;
//   //     throw new AdminServiceError({
//   //       message: `Failed to validate payment: ${error}`,
//   //       code: "VALIDATE_PAYMENT_ERROR",
//   //       details: error,
//   //     } as AdminServiceError);
//   //   }
//   // },

//   /**
//    * Get pending payment validations
//    */
//   async getPendingValidations(): Promise<FrontendRemittanceOrder[]> {
//     try {
//       const actor = getAdminActor();
//       const result = await actor.getPendingValidations();
//       const orders = handleResult<RemittanceOrder[]>(
//         result,
//         "Failed to get pending validations",
//       );

//       return orders.map(convertRemittanceOrder);
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to get pending validations: ${error}`,
//         code: "GET_PENDING_VALIDATIONS_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   // /**
//   //  * Get remittance media items for validation
//   //  */
//   // async getRemittanceMediaItems(
//   //   mediaIds: string[],
//   // ): Promise<FrontendMediaItem[]> {
//   //   try {
//   //     const actor = getAdminActor();
//   //     const result = await actor.getRemittanceMediaItems(mediaIds);
//   //     const mediaItems = handleResult<MediaItem[]>(
//   //       result,
//   //       "Failed to get remittance media items",
//   //     );

//   //     return mediaItems.map(convertMediaItem);
//   //   } catch (error) {
//   //     if (error instanceof AdminServiceError) throw error;
//   //     throw new AdminServiceError({
//   //       message: `Failed to get remittance media items: ${error}`,
//   //       code: "GET_MEDIA_ITEMS_ERROR",
//   //       details: error,
//   //     } as AdminServiceError);
//   //   }
//   // },

//   // /**
//   //  * Get remittance order with associated media items
//   //  */
//   // async getRemittanceOrderWithMedia(orderId: string): Promise<{
//   //   order: FrontendRemittanceOrder;
//   //   mediaItems: FrontendMediaItem[];
//   // }> {
//   //   try {
//   //     const actor = getAdminActor();
//   //     const result = await actor.getRemittanceOrderWithMedia(orderId);
//   //     const data = handleResult<{
//   //       order: RemittanceOrder;
//   //       mediaItems: MediaItem[];
//   //     }>(result, "Failed to get remittance order with media");

//   //     return {
//   //       order: convertRemittanceOrder(data.order),
//   //       mediaItems: data.mediaItems.map(convertMediaItem),
//   //     };
//   //   } catch (error) {
//   //     if (error instanceof AdminServiceError) throw error;
//   //     throw new AdminServiceError({
//   //       message: `Failed to get remittance order with media: ${error}`,
//   //       code: "GET_ORDER_WITH_MEDIA_ERROR",
//   //       details: error,
//   //     } as AdminServiceError);
//   //   }
//   // },

//   // Analytics & Reporting

//   /**
//    * Get system statistics
//    */
//   async getSystemStats(): Promise<FrontendSystemStats> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("getSystemStats", {});

//       return {
//         totalCommissionRules: result.totalCommissionRules,
//         activeCommissionRules: result.activeCommissionRules,
//         totalUsersWithRoles: result.totalUsersWithRoles,
//         adminUsers: result.adminUsers,
//       };
//     } catch (error) {
//       if (error instanceof AdminServiceError) throw error;
//       throw new AdminServiceError({
//         message: `Failed to get system statistics: ${error}`,
//         code: "GET_SYSTEM_STATS_ERROR",
//         details: error,
//       } as AdminServiceError);
//     }
//   },

//   // Canister Management

//   // /**
//   //  * Set canister references for intercanister calls
//   //  */
//   // async setCanisterReferences(): Promise<string> {
//   //   try {
//   //     const actor = getAdminActor();

//   //     const remittancePrincipal: [] | [Principal] = remittanceCanisterId
//   //       ? [Principal.fromText(remittanceCanisterId)]
//   //       : [];
//   //     const mediaPrincipal: [] | [Principal] = mediaCanisterId
//   //       ? [Principal.fromText(mediaCanisterId)]
//   //       : [];
//   //     // Canister references for intercanister calls
//   //     const { canisterId: authCanisterId } = await import(
//   //       "../../../declarations/auth"
//   //     );
//   //     const { canisterId: serviceCanisterId } = await import(
//   //       "../../../declarations/service"
//   //     );
//   //     const { canisterId: bookingCanisterId } = await import(
//   //       "../../../declarations/booking"
//   //     );

//   //     const authPrincipal: [] | [Principal] = authCanisterId
//   //       ? [Principal.fromText(authCanisterId)]
//   //       : [];
//   //     const servicePrincipal: [] | [Principal] = serviceCanisterId
//   //       ? [Principal.fromText(serviceCanisterId)]
//   //       : [];
//   //     const bookingPrincipal: [] | [Principal] = bookingCanisterId
//   //       ? [Principal.fromText(bookingCanisterId)]
//   //       : [];

//   //     // Get review and reputation canister IDs
//   //     const { canisterId: reviewCanisterId } = await import(
//   //       "../../../declarations/review"
//   //     );
//   //     const { canisterId: reputationCanisterId } = await import(
//   //       "../../../declarations/reputation"
//   //     );
//   //     const reviewPrincipal: [] | [Principal] = reviewCanisterId
//   //       ? [Principal.fromText(reviewCanisterId)]
//   //       : [];
//   //     const reputationPrincipal: [] | [Principal] = reputationCanisterId
//   //       ? [Principal.fromText(reputationCanisterId)]
//   //       : [];

//   //     const result = await actor.setCanisterReferences(
//   //       remittancePrincipal,
//   //       mediaPrincipal,
//   //       authPrincipal,
//   //       servicePrincipal,
//   //       bookingPrincipal,
//   //       reviewPrincipal,
//   //       reputationPrincipal,
//   //     );

//   //     const resultText = handleResult<string>(
//   //       result,
//   //       "Failed to set canister references",
//   //     );
//   //     return resultText;
//   //   } catch (error) {
//   //     logError("Error setting canister references", error);
//   //     if (error instanceof AdminServiceError) throw error;
//   //     throw new AdminServiceError({
//   //       message: `Failed to set canister references: ${error}`,
//   //       code: "SET_CANISTER_REFS_ERROR",
//   //       details: error,
//   //     } as AdminServiceError);
//   //   }
//   // },

//   /**
//    * Get all users from the system
//    */
//   async getAllUsers(): Promise<any[]> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("getAllUsers", {});
//       return result || [];
//     } catch (error) {
//       console.error("Error getting all users:", error);
//       return [];
//     }
//   },

//   /**
//    * Delete a service
//    */
//   async deleteService(serviceId: string): Promise<void> {
//     try {
//       if (!currentIdentity) {
//         throw createAdminError(
//           "Authentication required to delete service",
//           "AUTH_REQUIRED",
//         );
//       }

//       const serviceActor = await createCanisterActor("service");
//       const result = await (serviceActor as any).deleteService(serviceId);

//       if ("err" in result) {
//         throw createAdminError(
//           `Failed to delete service: ${result.err}`,
//           "DELETE_SERVICE_ERROR",
//         );
//       }
//     } catch (error) {
//       handleError(error, "delete service", "DELETE_SERVICE_ERROR");
//     }
//   },

//   /**
//    * Get service packages for a specific service
//    */
//   async getServicePackages(serviceId: string): Promise<any[]> {
//     try {
//       logSuccess(`Getting service packages for serviceId: ${serviceId}`);

//       // Try admin canister first
//       const actor = getAdminActor();
//       if (typeof (actor as any).getServicePackages === "function") {
//         const result = await (actor as any).getServicePackages(serviceId);
//         const packages = handleResult<any[]>(
//           result,
//           "Failed to get service packages",
//         );
//         return packages;
//       }

//       if (!currentIdentity) {
//         throw createAdminError(
//           "Authentication required to get service packages",
//           "AUTH_REQUIRED",
//         );
//       }

//       const serviceActor = await createCanisterActor("service");
//       const result = await (serviceActor as any).getServicePackages(serviceId);

//       if ("err" in result) {
//         throw createAdminError(
//           `Failed to get service packages: ${result.err}`,
//           "GET_SERVICE_PACKAGES_ERROR",
//         );
//       }

//       return result.ok || [];
//     } catch (error) {
//       handleError(error, "get service packages", "GET_SERVICE_PACKAGES_ERROR");
//     }
//     return [];
//   },

//   // Simplified service data retrieval (using admin canister for authentication)
//   async getServiceData(serviceId: string): Promise<ServiceData | null> {
//     try {
//       // Use admin canister to get service data (properly authenticated)
//       const actor = getAdminActor();

//       // First try to get service through admin canister
//       if (typeof (actor as any).getService === "function") {
//         const result = await (actor as any).getService(serviceId);
//         const service = handleResult<any>(result, "Failed to get service");

//         if (service) {
//           const serviceData = convertCanisterService(service);

//           // Get service packages
//           try {
//             const packages = await this.getServicePackages(serviceId);
//             serviceData.packages = packages.map(convertCanisterServicePackage);
//           } catch (packageError) {
//             serviceData.packages = [];
//           }

//           return serviceData;
//         }
//       }

//       if (!currentIdentity) {
//         throw new AdminServiceError({
//           message: "Authentication required to get service data",
//           code: "AUTH_REQUIRED",
//         } as AdminServiceError);
//       }

//       const { createActor } = await import("../../../declarations/service");
//       const { canisterId: serviceCanisterId } = await import(
//         "../../../declarations/service"
//       );
//       const serviceActor = createActor(serviceCanisterId, {
//         agentOptions: {
//           identity: currentIdentity,
//         },
//       });

//       const serviceResult = await serviceActor.getService(serviceId);
//       if ("ok" in serviceResult) {
//         const serviceData = convertCanisterService(serviceResult.ok);

//         // Get service packages
//         try {
//           const packages = await this.getServicePackages(serviceId);
//           serviceData.packages = packages.map(convertCanisterServicePackage);
//         } catch (packageError) {
//           serviceData.packages = [];
//         }

//         return serviceData;
//       } else {
//         return null;
//       }
//     } catch (error) {
//       return null;
//     }
//   },

//   /**
//    * Get all services and bookings for a specific user
//    */
//   async getUserServicesAndBookings(userId: string): Promise<{
//     offeredServices: any[];
//     clientBookings: any[];
//     providerBookings: any[];
//   }> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("getUserServicesAndBookings", {
//         userId,
//       });

//       return {
//         offeredServices: result.services || [],
//         clientBookings: result.clientBookings || [],
//         providerBookings: result.providerBookings || [],
//       };
//     } catch (error) {
//       console.error("Error getting user services and bookings:", error);
//       return {
//         offeredServices: [],
//         clientBookings: [],
//         providerBookings: [],
//       };
//     }
//   },

//   /**
//    * Get service count for a specific user
//    * First tries admin canister, falls back to direct service canister call
//    */
//   async getUserServiceCount(userId: string): Promise<number> {
//     try {
//       const actor = getAdminActor();
//       const principal = Principal.fromText(userId);

//       // Check if the function exists on the admin canister
//       if (typeof (actor as any).getUserServiceCount === "function") {
//         const result = await (actor as any).getUserServiceCount(principal);
//         const count = handleResult<bigint>(
//           result,
//           "Failed to get user service count",
//         );
//         return Number(count);
//       } else {
//         const serviceActor = await createCanisterActor("service");
//         const result = await (serviceActor as any).getUserServiceCount(
//           principal,
//         );
//         if ("err" in result) {
//           throw createAdminError(
//             `Failed to get user service count: ${result.err}`,
//             "GET_USER_SERVICE_COUNT_ERROR",
//           );
//         }
//         return Number(result.ok || 0);
//       }
//     } catch (error) {
//       handleError(
//         error,
//         "get user service count",
//         "GET_USER_SERVICE_COUNT_ERROR",
//       );
//     }
//     return 0;
//   },

//   // User Management Functions

//   /**
//    * Lock or unlock a user account
//    */
//   async lockUserAccount(userId: string, locked: boolean): Promise<string> {
//     try {
//       requireAuth();

//       const result = await callFirebaseFunction("lockUserAccount", {
//         userId,
//         locked,
//       });
//       return result.message || "User account updated successfully";
//     } catch (error) {
//       console.error("Error locking/unlocking user account:", error);
//       throw new AdminServiceError({
//         message: `Failed to lock/unlock user account: ${error}`,
//         code: "LOCK_USER_ACCOUNT_ERROR",
//         details: error,
//       });
//     }
//   },

//   /**
//    * Delete a user account
//    */
//   async deleteUserAccount(userId: string): Promise<string> {
//     try {
//       const actor = getAdminActor();
//       const principal = Principal.fromText(userId);

//       // Check if the function exists on the admin canister
//       if (typeof (actor as any).deleteUserAccount === "function") {
//         const result = await (actor as any).deleteUserAccount(principal);
//         return handleResult<string>(result, "Failed to delete user account");
//       } else {
//         const authActor = await createCanisterActor("auth");
//         if (typeof (authActor as any).deleteUserAccount === "function") {
//           const result = await (authActor as any).deleteUserAccount(principal);
//           return result;
//         } else {
//           throw createAdminError(
//             "Auth canister doesn't have deleteUserAccount function",
//             "FUNCTION_NOT_FOUND",
//           );
//         }
//       }
//     } catch (error) {
//       handleError(error, "delete user account", "DELETE_USER_ACCOUNT_ERROR");
//     }
//     return "";
//   },

//   /**
//    * Update user reputation score
//    */
//   async updateUserReputation(
//     userId: string,
//     reputationScore: number,
//   ): Promise<string> {
//     try {
//       const actor = getAdminActor();
//       const principal = Principal.fromText(userId);

//       // Check if the function exists on the admin canister
//       if (typeof (actor as any).updateUserReputation === "function") {
//         const result = await (actor as any).updateUserReputation(
//           principal,
//           BigInt(reputationScore),
//         );
//         return handleResult<string>(result, "Failed to update user reputation");
//       } else {
//         const authActor = await createCanisterActor("auth");
//         if (typeof (authActor as any).updateUserReputation === "function") {
//           const result = await (authActor as any).updateUserReputation(
//             principal,
//             BigInt(reputationScore),
//           );
//           return result;
//         } else {
//           throw createAdminError(
//             "Auth canister doesn't have updateUserReputation function",
//             "FUNCTION_NOT_FOUND",
//           );
//         }
//       }
//     } catch (error) {
//       handleError(
//         error,
//         "update user reputation",
//         "UPDATE_USER_REPUTATION_ERROR",
//       );
//     }
//     return "";
//   },

//   /**
//    * Get user analytics (real data from backend)
//    */
//   async getUserAnalytics(userId: string): Promise<{
//     totalEarnings: number;
//     completedJobs: number;
//     totalJobs: number;
//     completionRate: number;
//     averageRating: number;
//     totalReviews: number;
//   }> {
//     try {
//       // Try admin canister first
//       const actor = getAdminActor();
//       if (typeof (actor as any).getUserAnalytics === "function") {
//         const result = await (actor as any).getUserAnalytics(
//           Principal.fromText(userId),
//         );
//         const analytics = handleResult<any>(
//           result,
//           "Failed to get user analytics",
//         );

//         return {
//           totalEarnings: Number(analytics.totalEarnings || 0) / 100, // Convert from cents
//           completedJobs: Number(analytics.completedJobs || 0),
//           totalJobs: Number(analytics.totalJobs || 0),
//           completionRate: Number(analytics.completionRate || 0),
//           averageRating: 0, // Will be fetched separately
//           totalReviews: 0, // Will be fetched separately
//         };
//       }

//       const { createActor } = await import("../../../declarations/booking");
//       const { canisterId: bookingId } = await import(
//         "../../../declarations/booking"
//       );
//       const bookingActor = createActor(bookingId);
//       const userPrincipal = Principal.fromText(userId);

//       const analyticsResult = await bookingActor.getProviderAnalytics(
//         userPrincipal,
//         [],
//         [],
//       );

//       if ("ok" in analyticsResult) {
//         const analytics = analyticsResult.ok;
//         return {
//           totalEarnings: Number(analytics.totalEarnings) / 100, // Convert from cents
//           completedJobs: Number(analytics.completedJobs),
//           totalJobs: Number(analytics.totalJobs),
//           completionRate: Number(analytics.completionRate),
//           averageRating: 0, // Will be fetched separately
//           totalReviews: 0, // Will be fetched separately
//         };
//       } else {
//         logError("Direct booking canister call failed", analyticsResult.err);
//         throw new Error(analyticsResult.err);
//       }
//     } catch (error) {
//       logError("Error fetching user analytics", error);
//       // Return default values if analytics fail
//       return {
//         totalEarnings: 0,
//         completedJobs: 0,
//         totalJobs: 0,
//         completionRate: 0,
//         averageRating: 0,
//         totalReviews: 0,
//       };
//     }
//   },

//   /**
//    * Get user reviews and rating
//    */
//   async getUserReviews(userId: string): Promise<{
//     averageRating: number;
//     totalReviews: number;
//   }> {
//     try {
//       // Use admin canister to get review data (properly authenticated)
//       const actor = getAdminActor();
//       if (typeof (actor as any).getUserReviews === "function") {
//         const result = await (actor as any).getUserReviews(userId);
//         const reviewData = handleResult<any>(
//           result,
//           "Failed to get review data",
//         );

//         return {
//           averageRating: Number(reviewData.averageRating || 0),
//           totalReviews: Number(reviewData.totalReviews || 0),
//         };
//       }

//       if (!currentIdentity) {
//         throw new AdminServiceError({
//           message: "Authentication required to get review data",
//           code: "AUTH_REQUIRED",
//         } as AdminServiceError);
//       }

//       const { createActor } = await import("../../../declarations/review");
//       const { canisterId: reviewId } = await import(
//         "../../../declarations/review"
//       );
//       const reviewActor = createActor(reviewId, {
//         agentOptions: {
//           identity: currentIdentity,
//         },
//       });
//       const userPrincipal = Principal.fromText(userId);

//       const [ratingResult, userReviews] = await Promise.all([
//         reviewActor.calculateUserAverageRating(userPrincipal),
//         reviewActor.getUserReviews(userPrincipal),
//       ]);

//       if ("ok" in ratingResult) {
//         const averageRating = Number(ratingResult.ok);
//         const totalReviews = userReviews.length;
//         return {
//           averageRating,
//           totalReviews,
//         };
//       } else {
//         logError("No reviews found for user", ratingResult.err);
//         return {
//           averageRating: 0,
//           totalReviews: 0,
//         };
//       }
//     } catch (error) {
//       logError("Error fetching user reviews", error);
//       return {
//         averageRating: 0,
//         totalReviews: 0,
//       };
//     }
//   },

//   /**
//    * Get user reputation score (real data from backend)
//    */
//   async getUserReputation(userId: string): Promise<{
//     reputationScore: number;
//     trustLevel: string;
//     completedBookings: number;
//   }> {
//     try {
//       // Use admin canister to get reputation data (properly authenticated)
//       const actor = getAdminActor();
//       if (typeof (actor as any).getUserReputation === "function") {
//         const result = await (actor as any).getUserReputation(userId);
//         const reputationData = handleResult<any>(
//           result,
//           "Failed to get reputation data",
//         );

//         return {
//           reputationScore: Number(reputationData.reputationScore || 50),
//           trustLevel: reputationData.trustLevel || "New",
//           completedBookings: Number(reputationData.completedBookings || 0),
//         };
//       }

//       if (!currentIdentity) {
//         throw new AdminServiceError({
//           message: "Authentication required to get reputation data",
//           code: "AUTH_REQUIRED",
//         } as AdminServiceError);
//       }

//       const { createActor } = await import("../../../declarations/reputation");
//       const { canisterId: reputationId } = await import(
//         "../../../declarations/reputation"
//       );
//       const reputationActor = createActor(reputationId, {
//         agentOptions: {
//           identity: currentIdentity,
//         },
//       });
//       const userPrincipal = Principal.fromText(userId);

//       const reputationResult =
//         await reputationActor.getReputationScore(userPrincipal);

//       if ("ok" in reputationResult) {
//         const reputation = reputationResult.ok;
//         return {
//           reputationScore: Math.round(Number(reputation.trustScore)), // trustScore is already 0-100
//           trustLevel: reputation.trustLevel.toString(),
//           completedBookings: Number(reputation.completedBookings),
//         };
//       } else {
//         logError("No reputation found for user", reputationResult.err);
//         return {
//           reputationScore: 50, // Default score
//           trustLevel: "New",
//           completedBookings: 0,
//         };
//       }
//     } catch (error) {
//       logError("Error fetching user reputation", error);
//       return {
//         reputationScore: 50, // Default score
//         trustLevel: "New",
//         completedBookings: 0,
//       };
//     }
//   },

//   /**
//    * Get user bookings (for admin booking history view)
//    */
//   async getUserBookings(userId: string): Promise<
//     Array<{
//       id: string;
//       serviceId: string;
//       serviceName: string;
//       providerId: string;
//       providerName: string;
//       status: string;
//       price: number;
//       createdAt: string;
//       scheduledDate: string;
//       completedAt?: string;
//       rating?: number;
//       review?: string;
//     }>
//   > {
//     try {
//       const actor = getAdminActor();
//       if (typeof (actor as any).getUserBookings === "function") {
//         const result = await (actor as any).getUserBookings(
//           Principal.fromText(userId),
//         );
//         const bookingsData = handleResult<any[]>(
//           result,
//           "Failed to get user bookings",
//         );

//         // Handle both array and single booking responses
//         const bookingsArray = Array.isArray(bookingsData)
//           ? bookingsData
//           : [bookingsData];

//         // Map bookings and fetch provider names and service names
//         const bookingsWithNames = await Promise.all(
//           bookingsArray.map(async (booking) => {
//             let providerName = "Unknown Provider";
//             let serviceName = "Unknown Service";

//             // Try to get provider name from the booking data first
//             if (booking.providerName?.[0]) {
//               providerName = booking.providerName[0];
//             } else if (booking.providerId) {
//               try {
//                 const { createActor } = await import(
//                   "../../../declarations/auth"
//                 );
//                 const { canisterId: authId } = await import(
//                   "../../../declarations/auth"
//                 );
//                 const authActor = createActor(authId);
//                 const profileResult = await authActor.getProfile(
//                   Principal.fromText(booking.providerId.toString()),
//                 );
//                 if ("ok" in profileResult) {
//                   providerName = profileResult.ok.name;
//                 }
//               } catch (error) {}
//             }

//             // Try to get service name from the booking data first
//             if (booking.serviceName?.[0]) {
//               serviceName = booking.serviceName[0];
//             } else if (booking.serviceId) {
//               try {
//                 const { serviceCanisterService } = await import(
//                   "../../../frontend/src/services/serviceCanisterService"
//                 );
//                 const serviceData = await serviceCanisterService.getService(
//                   booking.serviceId,
//                 );
//                 if (serviceData) {
//                   serviceName = serviceData.title;
//                 }
//               } catch (error) {}
//             }

//             return {
//               id: booking.id || booking.bookingId || "",
//               serviceId: booking.serviceId || "",
//               serviceName: serviceName,
//               providerId: booking.providerId || "",
//               providerName: providerName,
//               status: booking.status || "Unknown",
//               price: Number(booking.price || 0),
//               createdAt:
//                 convertMotokoTime(booking.createdAt) ||
//                 new Date().toISOString(),
//               scheduledDate:
//                 convertMotokoTime(booking.scheduledDate) ||
//                 convertMotokoTime(booking.createdAt) ||
//                 new Date().toISOString(),
//               completedAt: convertMotokoTime(booking.completedAt) || undefined,
//               rating: booking.rating ? Number(booking.rating) : undefined,
//               review: booking.review,
//             };
//           }),
//         );

//         return bookingsWithNames;
//       }

//       return [];
//     } catch (error) {
//       logError("Error fetching user bookings", error);
//       throw new AdminServiceError({
//         message: `Failed to fetch user bookings: ${error}`,
//         code: "BOOKINGS_FETCH_ERROR",
//       } as AdminServiceError);
//     }
//   },

//   /**
//    * Get user client analytics (real data from booking canister)
//    */
//   // async getUserClientAnalytics(userId: string): Promise<{
//   //   totalBookings: number;
//   //   servicesCompleted: number;
//   //   totalSpent: number;
//   //   memberSince: string;
//   // }> {
//   //   try {
//   //     // Use admin canister to get client analytics data (properly authenticated)
//   //     const actor = getAdminActor();
//   //     if (typeof (actor as any).getUserClientAnalytics === "function") {
//   //       const result = await (actor as any).getUserClientAnalytics(
//   //         Principal.fromText(userId),
//   //       );
//   //       const analyticsData = handleResult<any>(
//   //         result,
//   //         "Failed to get client analytics data",
//   //       );

//   //       return {
//   //         totalBookings: Number(analyticsData.totalBookings || 0),
//   //         servicesCompleted: Number(analyticsData.servicesCompleted || 0),
//   //         totalSpent: Number(analyticsData.totalSpent || 0),
//   //         memberSince: analyticsData.memberSince
//   //           ? convertTimeToDate(
//   //               BigInt(analyticsData.memberSince),
//   //             ).toLocaleDateString()
//   //           : "Unknown",
//   //       };
//   //     }

//   //     if (!currentIdentity) {
//   //       throw new AdminServiceError({
//   //         message: "Authentication required to get client analytics data",
//   //         code: "AUTH_REQUIRED",
//   //       } as AdminServiceError);
//   //     }

//   //     const { bookingCanisterService } = await import(
//   //       "../../../frontend/src/services/bookingCanisterService"
//   //     );
//   //     const userPrincipal = Principal.fromText(userId);

//   //     const analyticsResult =
//   //       await bookingCanisterService.getClientAnalyticsForAdmin(userPrincipal);

//   //     if (analyticsResult) {
//   //       return {
//   //         totalBookings: Number(analyticsResult.totalBookings),
//   //         servicesCompleted: Number(analyticsResult.servicesCompleted),
//   //         totalSpent: Number(analyticsResult.totalSpent),
//   //         memberSince: analyticsResult.memberSince,
//   //       };
//   //     } else {
//   //       logError("No client analytics found for user");
//   //       return {
//   //         totalBookings: 0,
//   //         servicesCompleted: 0,
//   //         totalSpent: 0,
//   //         memberSince: "Unknown",
//   //       };
//   //     }
//   //   } catch (error) {
//   //     logError("Error fetching user client analytics", error);
//   //     return {
//   //       totalBookings: 0,
//   //       servicesCompleted: 0,
//   //       totalSpent: 0,
//   //       memberSince: "Unknown",
//   //     };
//   //   }
//   // },

//   /**
//    * Get user commission data (real data from remittance canister)
//    */
//   async getUserCommissionData(userId: string): Promise<{
//     pendingCommission: number;
//     settledCommission: number;
//     outstandingBalance: number;
//     pendingOrders: number;
//     overdueOrders: number;
//   }> {
//     try {
//       const { createActor } = await import("../../../declarations/remittance");
//       const { canisterId: remittanceId } = await import(
//         "../../../declarations/remittance"
//       );
//       const remittanceActor = createActor(remittanceId);
//       const userPrincipal = Principal.fromText(userId);

//       const commissionData = await remittanceActor.getProviderAnalytics(
//         userPrincipal,
//         [],
//         [],
//       );

//       return {
//         pendingCommission: Number(commissionData.pending_orders) * 100, // Estimate pending commission
//         settledCommission: Number(commissionData.total_commission_paid) / 100, // Convert centavos to PHP
//         outstandingBalance:
//           Number(
//             commissionData.total_service_amount -
//               commissionData.total_commission_paid,
//           ) / 100, // Calculate outstanding
//         pendingOrders: Number(commissionData.pending_orders),
//         overdueOrders: 0, // Not available in this function
//       };
//     } catch (error) {
//       logError("Error fetching commission data", error);
//       return {
//         pendingCommission: 0,
//         settledCommission: 0,
//         outstandingBalance: 0,
//         pendingOrders: 0,
//         overdueOrders: 0,
//       };
//     }
//   },

//   /**
//    * Update user commission amount
//    */
//   async updateUserCommission(
//     userId: string,
//     commissionAmount: number,
//   ): Promise<string> {
//     try {
//       const actor = getAdminActor();
//       const principal = Principal.fromText(userId);

//       // Check if the function exists on the admin canister
//       if (typeof (actor as any).updateUserCommission === "function") {
//         const result = await (actor as any).updateUserCommission(
//           principal,
//           BigInt(commissionAmount * 100),
//         ); // Convert to centavos
//         return handleResult<string>(result, "Failed to update user commission");
//       } else {
//         const authActor = await createCanisterActor("auth");
//         if (typeof (authActor as any).updateUserCommission === "function") {
//           const result = await (authActor as any).updateUserCommission(
//             principal,
//             BigInt(commissionAmount * 100),
//           );
//           return result;
//         } else {
//           throw createAdminError(
//             "Auth canister doesn't have updateUserCommission function",
//             "FUNCTION_NOT_FOUND",
//           );
//         }
//       }
//     } catch (error) {
//       handleError(
//         error,
//         "update user commission",
//         "UPDATE_USER_COMMISSION_ERROR",
//       );
//     }
//     return "";
//   },

//   // Get services with certificates for validation
//   async getServicesWithCertificates(): Promise<any[]> {
//     try {
//       const actor = getAdminActor();
//       const result = await actor.getServicesWithCertificates();

//       if ("ok" in result) {
//         return result.ok;
//       } else {
//         throw new Error(result.err);
//       }
//     } catch (error) {
//       logError("Error fetching services with certificates", error);
//       throw new Error(`Failed to fetch services with certificates: ${error}`);
//     }
//   },

//   // Certificate validation functions
//   async getPendingCertificateValidations(): Promise<any[]> {
//     try {
//       const actor = getAdminActor();
//       const result = await actor.getPendingCertificateValidations();

//       if ("ok" in result) {
//         return result.ok;
//       } else {
//         throw new Error(result.err);
//       }
//     } catch (error) {
//       logError("Error fetching certificate validations", error);
//       throw new Error(`Failed to fetch certificate validations: ${error}`);
//     }
//   },

//   async validateCertificate(
//     validationId: string,
//     approved: boolean,
//     reason?: string,
//   ): Promise<string> {
//     try {
//       const actor = getAdminActor();
//       const result = await actor.validateCertificate(
//         validationId,
//         approved,
//         reason ? [reason] : [],
//       );

//       if ("ok" in result) {
//         return result.ok;
//       } else {
//         throw new Error(result.err);
//       }
//     } catch (error) {
//       logError("Error validating certificate", error);
//       throw new Error(`Failed to validate certificate: ${error}`);
//     }
//   },

//   // Update certificate validation status in media canister
//   async updateCertificateValidationStatus(
//     mediaId: string,
//     status: "Pending" | "Validated" | "Rejected",
//   ): Promise<any> {
//     try {
//       // Import media canister actor with authenticated identity
//       const { createActor } = await import("../../../declarations/media");
//       const { canisterId: mediaCanisterId } = await import(
//         "../../../declarations/media"
//       );
//       const mediaActor = createActor(mediaCanisterId, {
//         agentOptions: currentIdentity
//           ? { identity: currentIdentity }
//           : undefined,
//       });

//       // Convert string status to backend format
//       const backendStatus =
//         status === "Validated"
//           ? { Validated: null }
//           : status === "Rejected"
//             ? { Rejected: null }
//             : { Pending: null };

//       // Use type assertion to call the new function
//       const result = await (
//         mediaActor as any
//       ).updateCertificateValidationStatus(mediaId, backendStatus);

//       if ("ok" in result) {
//         return result.ok;
//       } else {
//         throw new Error(result.err);
//       }
//     } catch (error) {
//       logError("Error updating certificate validation status", error);
//       throw new AdminServiceError({
//         message: `Failed to update certificate validation status: ${error}`,
//         code: "CERTIFICATE_STATUS_UPDATE_ERROR",
//       } as AdminServiceError);
//     }
//   },

//   // Get validated certificates
//   async getValidatedCertificates(): Promise<any[]> {
//     try {
//       // Import media canister actor - use default for query functions
//       const { media } = await import("../../../declarations/media");

//       if (!media) {
//         throw new Error("Media canister not available");
//       }

//       // Get validated certificates from media canister
//       const validatedCerts = await (
//         media as any
//       ).getCertificatesByValidationStatus([{ Validated: null }]);

//       // Convert to frontend format with service information
//       const processedCerts = await Promise.all(
//         validatedCerts.map(async (cert: any) => {
//           try {
//             // Create service data that matches the format expected by CertificateCard
//             return {
//               id: `validated-${cert.id}-${Date.now()}`,
//               service: {
//                 serviceId: `service-${cert.ownerId}`, // Use owner as service identifier
//                 serviceTitle: "Validated Service",
//                 providerId: cert.ownerId,
//                 certificateUrls: [cert.url], // This is what useServiceCertificates needs
//               },
//               certificateIndex: 0,
//               certificateUrl: cert.url,
//               approvedAt: new Date(
//                 Number(cert.updatedAt) / 1000000,
//               ).toISOString(),
//             };
//           } catch (error) {
//             logError("Error processing validated certificate", error);
//             return null;
//           }
//         }),
//       );

//       return processedCerts.filter((cert) => cert !== null);
//     } catch (error) {
//       logError("Error fetching validated certificates", error);
//       return [];
//     }
//   },

//   // Get rejected certificates
//   async getRejectedCertificates(): Promise<any[]> {
//     try {
//       // Import media canister actor - use default for query functions
//       const { media } = await import("../../../declarations/media");

//       if (!media) {
//         throw new Error("Media canister not available");
//       }

//       // Get rejected certificates from media canister
//       const rejectedCerts = await (
//         media as any
//       ).getCertificatesByValidationStatus([{ Rejected: null }]);

//       // Convert to frontend format with service information
//       const processedCerts = await Promise.all(
//         rejectedCerts.map(async (cert: any) => {
//           try {
//             // Create service data that matches the format expected by CertificateCard
//             return {
//               id: `rejected-${cert.id}-${Date.now()}`,
//               service: {
//                 serviceId: `service-${cert.ownerId}`, // Use owner as service identifier
//                 serviceTitle: "Rejected Service",
//                 providerId: cert.ownerId,
//                 certificateUrls: [cert.url], // This is what useServiceCertificates needs
//               },
//               certificateIndex: 0,
//               certificateUrl: cert.url,
//               rejectedAt: new Date(
//                 Number(cert.updatedAt) / 1000000,
//               ).toISOString(),
//             };
//           } catch (error) {
//             logError("Error processing rejected certificate", error);
//             return null;
//           }
//         }),
//       );

//       return processedCerts.filter((cert) => cert !== null);
//     } catch (error) {
//       logError("Error fetching rejected certificates", error);
//       return [];
//     }
//   },
// };

// // Export individual functions for direct use
// export const {
//   upsertCommissionRules,
//   listRules,
//   getRule,
//   activateRule,
//   deactivateRule,
//   assignRole,
//   removeRole,
//   getUserRole,
//   checkAdminRole,
//   listUserRoles,
//   hasAdminRole,
//   getSettings,
//   getSystemStats,
//   setCanisterReferences,
//   getAllUsers,
//   getUserServicesAndBookings,
//   getUserServiceCount,
//   lockUserAccount,
//   deleteUserAccount,
//   updateUserReputation,
//   updateUserCommission,
//   updateCertificateValidationStatus,
//   getValidatedCertificates,
//   getRejectedCertificates,
// } = adminServiceCanister;

// // Report/Feedback integration - separate export
// export const getReportsFromFeedbackCanister = async (): Promise<any[]> => {
//   try {
//     const { createActor } = await import("../../../declarations/feedback");
//     const { canisterId: feedbackCanisterId } = await import(
//       "../../../declarations/feedback"
//     );

//     const feedbackActor = createActor(feedbackCanisterId, {
//       agentOptions: currentIdentity ? { identity: currentIdentity } : undefined,
//     });

//     // Get all reports from feedback canister
//     const reports = await (feedbackActor as any).getAllReports();

//     return reports.map((report: any) => ({
//       id: report.id,
//       userId: report.userId.toString(),
//       userName: report.userName,
//       userPhone: report.userPhone,
//       description: report.description,
//       status: report.status?.[0] || "open", // Extract status from optional array, default to "open"
//       createdAt: new Date(Number(report.createdAt) / 1_000_000).toISOString(), // Convert from nanoseconds
//     }));
//   } catch (error) {
//     logError("Error fetching reports from feedback canister", error);
//     return [];
//   }
// };

// // Update report status in feedback canister
// export const updateReportStatus = async (
//   reportId: string,
//   newStatus: string,
// ): Promise<boolean> => {
//   try {
//     const { createActor } = await import("../../../declarations/feedback");
//     const { canisterId: feedbackCanisterId } = await import(
//       "../../../declarations/feedback"
//     );

//     const feedbackActor = createActor(feedbackCanisterId, {
//       agentOptions: currentIdentity ? { identity: currentIdentity } : undefined,
//     });

//     const result = await (feedbackActor as any).updateReportStatus(
//       reportId,
//       newStatus,
//     );

//     if (result.ok) {
//       logSuccess(`Report ${reportId} status updated to: ${newStatus}`);
//       return true;
//     } else {
//       logError(`Failed to update report status: ${result.err}`);
//       return false;
//     }
//   } catch (error) {
//     logError("Error updating report status", error);
//     return false;
//   }
// };
