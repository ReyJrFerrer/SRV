import { BaseEntity } from "../common/base-entity";
import { MediaItem } from "../common/media-item";
import {
  DisputeStatus,
  DisputeResolutionOutcome,
} from "../dispute/dispute-evidence";

export interface ProviderDispute extends BaseEntity {
  orderId: string;
  clientId: string;
  clientName: string;
  serviceTitle: string;
  serviceDate: Date;
  disputeStatus: DisputeStatus;
  disputeReason: string;
  disputeAmount?: number;
  clientEvidence: ProviderDisputeEvidence[];
  providerEvidence: ProviderDisputeEvidence[];
  submissionDeadline: Date;
  resolution?: ProviderDisputeResolution;
  adminNotes?: string;
}

export interface ProviderDisputeEvidence {
  id: string;
  type: "PHOTO" | "TEXT" | "RECEIPT" | "CONTRACT" | "CHAT_LOG" | "OTHER";
  content: string;
  description?: string;
  submittedBy: "PROVIDER" | "CLIENT" | "ADMIN";
  submittedAt: Date;
  media?: MediaItem[];
}

export interface ProviderDisputeResolution {
  outcome: DisputeResolutionOutcome;
  amount?: number;
  currency?: string;
  description: string;
  resolvedBy: "ADMIN" | "AGREEMENT";
  resolvedAt: Date;
  affectsProviderRating: boolean;
  providerPenalty?: number;
  clientRefund?: number;
}
