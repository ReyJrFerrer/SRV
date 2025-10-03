import { BaseEntity } from "../common/base-entity";
import { MediaItem } from "../common/media-item";
import { Location } from "../common/location";
import { Service } from "../service/service";

export type ProviderVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type ProviderAccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "BANNED";

export interface ServiceProvider extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture?: MediaItem;
  biography: string;
  location: Location;
  verificationStatus: ProviderVerificationStatus;
  accountStatus: ProviderAccountStatus;
  averageRating: number;
  totalReviews: number;
  totalCompletedJobs: number;
  identityVerified: boolean;
  backgroundCheckPassed: boolean;
  servicesOffered: Service[];
  languages: string[];
  availability: ProviderAvailability;
  earningSummary: ProviderEarningSummary;
  credentials: ProviderCredential[];
  taxInformation?: ProviderTaxInformation;
}

export interface ProviderAvailability {
  weeklySchedule: {
    [key: string]: {
      // 'Monday', 'Tuesday', etc.
      isAvailable: boolean;
      slots: {
        startTime: string; // Format: "HH:MM"
        endTime: string; // Format: "HH:MM"
      }[];
    };
  };
  vacationDates: {
    startDate: Date;
    endDate: Date;
    reason?: string;
  }[];
  instantBookingEnabled: boolean;
  bookingNoticeHours: number; // Hours in advance a booking needs to be made
  maxBookingsPerDay: number;
}

export interface ProviderCredential {
  id: string;
  type: "LICENSE" | "CERTIFICATION" | "EDUCATION" | "AWARD" | "OTHER";
  title: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  verificationStatus: ProviderVerificationStatus;
  documentUrl?: string;
}

export interface ProviderEarningSummary {
  totalEarnings: number;
  totalEarningsThisMonth: number;
  totalEarningsLastMonth: number;
  pendingPayouts: number;
  completionRate: number; // percentage
  cancellationRate: number; // percentage
  avgRating: number;
}

export interface ProviderTaxInformation {
  taxIdNumber: string;
  businessName?: string;
  businessType?:
    | "SOLE_PROPRIETOR"
    | "LLC"
    | "CORPORATION"
    | "PARTNERSHIP"
    | "OTHER";
  taxDocumentsSubmitted: boolean;
  vatRegistered: boolean;
  vatNumber?: string;
}
