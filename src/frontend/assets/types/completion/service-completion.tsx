import { CompletionPhoto, VerificationStatus } from "./completion-photo";
export interface ServiceCompletion {
  photos: CompletionPhoto[];
  notes?: string;
  clientVerification?: {
    status: VerificationStatus;
    timestamp: Date;
    reason?: string;
  };
  autoCompleted?: boolean;
}
