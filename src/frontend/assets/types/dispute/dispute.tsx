import { DisputeEvidence, DisputeStatus } from "./dispute-evidence";
import { DisputeResolution } from "./dispute-resolution";

export interface Dispute {
  status: DisputeStatus;
  reason: string;
  evidence: DisputeEvidence[];
  resolution?: DisputeResolution;
}
