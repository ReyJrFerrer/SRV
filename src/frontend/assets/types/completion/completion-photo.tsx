export type VerificationStatus =
  | "APPROVED"
  | "REJECTED"
  | "MODIFICATION_REQUESTED";

export interface CompletionPhoto {
  type: "IMAGE" | "VIDEO";
  url: string;
  timestamp?: Date;
}
