import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFunctions, getFirebaseFirestore } from "./firebaseApp";

const getFunctions = () => getFirebaseFunctions();
const getDb = () => getFirebaseFirestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnlineProjectStatus =
  | "Pending"
  | "Negotiating"
  | "Active"
  | "InReview"
  | "RevisionsRequested"
  | "Completed"
  | "Declined"
  | "Cancelled"
  | "Disputed"
  | "ResolvedForClient"
  | "ResolvedForProvider";

export interface MilestoneDefinition {
  title: string;
  description: string;
  percentage: number;
  deadlineDays: number;
}

export interface OnlinePackageSettings {
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  revisionRounds?: number;
  milestones?: MilestoneDefinition[];
}

export interface OnlineServiceConfig {
  defaultDeliveryMinDays: number;
  defaultDeliveryMaxDays: number;
  defaultRevisionRounds: number;
  packageSettings: Record<string, OnlinePackageSettings>;
}

export interface DeliverableConfig {
  mode: "Simple" | "Milestone";
  minDeliveryDays: number;
  maxDeliveryDays: number;
  revisionRounds: number;
  milestones?: MilestoneDefinition[];
}

export interface OnlineProject {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  servicePackageId: string;
  status: OnlineProjectStatus;

  desiredDeadline: string;
  agreedDeadline?: string;

  originalPrice: number;
  agreedPrice?: number;
  amountPaid: number;
  paymentStatus: "Pending" | "Partial" | "Full";
  paymentNotes?: string;

  brief: string;
  referenceAttachments: string[];

  deliverableConfig: DeliverableConfig;
  currentMilestoneIndex: number;
  deliverableCount: number;

  meetingUrl?: string;

  disputeReason?: string;
  disputeInitiatedBy?: string;
  disputeInitiatedAt?: string;
  disputePreStatus?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;

  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  lastNegotiationAt: string;
  autoCancelled?: boolean;

  serviceName?: string;
  packageName?: string;
  providerName?: string;
  clientName?: string;
  serviceImage?: string;
}

export interface DeliverableFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

export interface DeliverableSubmission {
  id: string;
  milestoneIndex?: number;
  files: DeliverableFile[];
  notes?: string;
  submittedAt: string;
  status: "Submitted" | "Approved" | "RevisionsRequested";
  clientFeedback?: string;
  revisionCount: number;
}

export interface NegotiationOffer {
  id: string;
  offeredBy: "client" | "provider";
  proposedPrice?: number;
  proposedDeadline?: string;
  proposedRevisionRounds?: number;
  proposedScope?: string;
  message: string;
  createdAt: string;
  status: "Pending" | "Accepted" | "Rejected";
  clientId: string;
  providerId: string;
}

export interface PaymentRecord {
  id: string;
  projectId: string;
  recordedBy: string;
  recordedByRole: "provider" | "admin";
  amountDelta: number;
  amountBefore: number;
  amountAfter: number;
  paymentStatusBefore: "Pending" | "Partial" | "Full";
  paymentStatusAfter: "Pending" | "Partial" | "Full";
  notes?: string;
  createdAt: string;
}

export interface ClientProjectAnalytics {
  clientId: string;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  pendingProjects: number;
  totalSpent: number;
  cancelledProjects: number;
  disputedProjects: number;
  memberSince: string;
  startDate: string;
  endDate: string;
}

export interface ProviderProjectAnalytics {
  providerId: string;
  totalProjects: number;
  completedJobs: number;
  cancelledJobs: number;
  activeJobs: number;
  disputedProjects: number;
  completionRate: number;
  totalEarnings: number;
  packageBreakdown: Array<[string, number]>;
  startDate: string | null;
  endDate: string | null;
}

export interface CreateOnlineProjectData {
  serviceId: string;
  servicePackageId: string;
  brief: string;
  desiredDeadline: string;
  referenceAttachments?: string[];
  idempotencyKey: string;
}

export interface NegotiateProjectData {
  projectId: string;
  proposedPrice?: number;
  proposedDeadline?: string;
  proposedRevisionRounds?: number;
  proposedScope?: string;
  message: string;
}

export interface SubmitDeliverableData {
  projectId: string;
  files: DeliverableFile[];
  notes?: string;
  milestoneIndex?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callAction<T = any>(
  action: string,
  data: Record<string, any>,
): Promise<T> {
  const fn = httpsCallable(getFunctions(), "onlineProjectAction");
  const result = await fn({ action, data });
  return result.data as T;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const onlineProjectCanisterService = {
  // ---- Create ----

  async createOnlineProject(
    data: CreateOnlineProjectData,
  ): Promise<{ projectId: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string };
      }>("createOnlineProject", data);
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Lifecycle actions ----

  async acceptProject(projectId: string): Promise<OnlineProject | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("acceptProject", { projectId });
      return res.success ? (res.data as any) : null;
    } catch (error) {
      throw error;
    }
  },

  async declineProject(projectId: string): Promise<OnlineProject | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("declineProject", { projectId });
      return res.success ? (res.data as any) : null;
    } catch (error) {
      throw error;
    }
  },

  async negotiateProject(
    data: NegotiateProjectData,
  ): Promise<{ projectId: string; status: string; offerId: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string; offerId: string };
      }>("negotiateProject", data);
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async acceptCounterOffer(
    projectId: string,
  ): Promise<OnlineProject | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("acceptCounterOffer", { projectId });
      return res.success ? (res.data as any) : null;
    } catch (error) {
      throw error;
    }
  },

  async cancelProject(projectId: string): Promise<OnlineProject | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("cancelProject", { projectId });
      return res.success ? (res.data as any) : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Deliverables ----

  async submitDeliverable(
    data: SubmitDeliverableData,
  ): Promise<{
    projectId: string;
    deliverableId: string;
    status: string;
  } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: {
          projectId: string;
          deliverableId: string;
          status: string;
        };
      }>("submitDeliverable", data);
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async approveDeliverable(
    projectId: string,
    deliverableId: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("approveDeliverable", { projectId, deliverableId });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async requestRevisions(
    projectId: string,
    deliverableId: string,
    feedback?: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("requestRevisions", { projectId, deliverableId, feedback });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Disputes ----

  async disputeProject(
    projectId: string,
    disputeReason: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("disputeProject", { projectId, disputeReason });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async resolveDisputeForClient(
    projectId: string,
    resolutionNote?: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("resolveDisputeForClient", { projectId, resolutionNote });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async resolveDisputeForProvider(
    projectId: string,
    resolutionNote?: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("resolveDisputeForProvider", { projectId, resolutionNote });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async dismissDispute(
    projectId: string,
    resolutionNote?: string,
  ): Promise<{ projectId: string; status: string } | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: { projectId: string; status: string };
      }>("dismissDispute", { projectId, resolutionNote });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Payments ----

  async recordPayment(
    projectId: string,
    amountDelta: number,
    notes?: string,
  ): Promise<PaymentRecord | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: PaymentRecord;
      }>("recordPayment", { projectId, amountDelta, notes });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Reads ----

  async getProject(projectId: string): Promise<OnlineProject | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: OnlineProject;
      }>("getProject", { projectId });
      return res.success ? res.data : null;
    } catch (error) {
      return null;
    }
  },

  async getClientProjects(
    clientId?: string,
    limit: number = 50,
  ): Promise<OnlineProject[]> {
    try {
      const res = await callAction<{
        success: boolean;
        data: OnlineProject[];
      }>("getClientProjects", { clientId, limit });
      return res.success ? res.data : [];
    } catch (error) {
      return [];
    }
  },

  async getProviderProjects(
    providerId?: string,
    limit: number = 50,
  ): Promise<OnlineProject[]> {
    try {
      const res = await callAction<{
        success: boolean;
        data: OnlineProject[];
      }>("getProviderProjects", { providerId, limit });
      return res.success ? res.data : [];
    } catch (error) {
      return [];
    }
  },

  // ---- Analytics ----

  async getClientProjectAnalytics(
    clientId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ClientProjectAnalytics | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: ClientProjectAnalytics;
      }>("getClientProjectAnalytics", { clientId, startDate, endDate });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  async getProviderProjectAnalytics(
    providerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ProviderProjectAnalytics | null> {
    try {
      const res = await callAction<{
        success: boolean;
        data: ProviderProjectAnalytics;
      }>("getProviderProjectAnalytics", { providerId, startDate, endDate });
      return res.success ? res.data : null;
    } catch (error) {
      throw error;
    }
  },

  // ---- Realtime subscriptions ----

  subscribeToProject(
    projectId: string,
    callback: (project: OnlineProject | null) => void,
  ): Unsubscribe {
    const projectRef = doc(getDb(), "online_projects", projectId);
    return onSnapshot(
      projectRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({
            id: snapshot.id,
            ...snapshot.data(),
          } as OnlineProject);
        } else {
          callback(null);
        }
      },
      () => {
        callback(null);
      },
    );
  },

  subscribeToClientProjects(
    clientId: string,
    callback: (projects: OnlineProject[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), "online_projects"),
      where("clientId", "==", clientId),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const projects = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as OnlineProject,
        );
        callback(projects);
      },
      () => {
        callback([]);
      },
    );
  },

  subscribeToProviderProjects(
    providerId: string,
    callback: (projects: OnlineProject[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), "online_projects"),
      where("providerId", "==", providerId),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const projects = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as OnlineProject,
        );
        callback(projects);
      },
      () => {
        callback([]);
      },
    );
  },

  subscribeToNegotiations(
    projectId: string,
    callback: (offers: NegotiationOffer[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), "online_projects", projectId, "negotiations"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const offers = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as NegotiationOffer,
        );
        callback(offers);
      },
      () => {
        callback([]);
      },
    );
  },

  subscribeToDeliverables(
    projectId: string,
    callback: (deliverables: DeliverableSubmission[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), "online_projects", projectId, "deliverables"),
      orderBy("submittedAt", "asc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const deliverables = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as DeliverableSubmission,
        );
        callback(deliverables);
      },
      () => {
        callback([]);
      },
    );
  },

  subscribeToPaymentHistory(
    projectId: string,
    callback: (records: PaymentRecord[]) => void,
  ): Unsubscribe {
    const q = query(
      collection(
        getDb(),
        "online_projects",
        projectId,
        "payment_history",
      ),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as PaymentRecord,
        );
        callback(records);
      },
      () => {
        callback([]);
      },
    );
  },
};
