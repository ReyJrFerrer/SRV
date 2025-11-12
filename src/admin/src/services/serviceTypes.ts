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

