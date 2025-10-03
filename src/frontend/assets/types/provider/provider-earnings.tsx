import { BaseEntity } from "../common/base-entity";

export type PayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type PayoutMethod =
  | "BANK_TRANSFER"
  | "GCASH"
  | "PAYMAYA"
  | "PAYPAL"
  | "CHECK";

export interface ProviderEarnings extends BaseEntity {
  providerId: string;
  totalLifetimeEarnings: number;
  availableBalance: number;
  pendingBalance: number; // Money from completed jobs not yet available for withdrawal
  currency: string;
  recentTransactions: ProviderTransaction[];
  payoutMethods: ProviderPayoutMethod[];
}

export interface ProviderTransaction extends BaseEntity {
  providerId: string;
  type: "EARNING" | "PAYOUT" | "REFUND" | "ADJUSTMENT" | "FEE";
  amount: number;
  currency: string;
  description: string;
  orderId?: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | "CANCELLED";
  reference?: string;
  fee?: number;
}

export interface ProviderPayout extends BaseEntity {
  providerId: string;
  amount: number;
  currency: string;
  method: PayoutMethod;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
  estimatedArrival?: Date;
  reference?: string; // External reference number
  accountLast4?: string;
  fee: number;
  notes?: string;
}

export interface ProviderPayoutMethod extends BaseEntity {
  providerId: string;
  type: PayoutMethod;
  isDefault: boolean;
  nickname?: string;
  accountLast4: string;
  accountHolderName: string;
  details: {
    [key: string]: string; // Different fields depending on method type
  };
  verificationStatus: "VERIFIED" | "PENDING" | "FAILED";
}

export interface ProviderPerformanceMetrics extends BaseEntity {
  providerId: string;
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ALL_TIME";
  startDate?: Date;
  endDate?: Date;
  totalEarnings: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  completionRate: number; // percentage
  averageRating: number;
  onTimeRate: number; // percentage
  responseRate: number; // percentage
  repeatedClients: number;
  averageEarningsPerJob: number;
}
