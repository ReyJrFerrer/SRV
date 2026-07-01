/**
 * Online Project Service (Firebase Cloud Functions)
 *
 * Frontend wrapper for the `onlineProjectAction` callable (see
 * `functions/src/onlineProject.js`). This file is the contract surface
 * for the Phase 1 Online Services rollout — the existence of every
 * method here forces the backend to expose a matching action, so this
 * file acts as a "tracer test" for the Cloud Function API.
 *
 * Pattern: matches `bookingCanisterService.ts` and `serviceCanisterService.ts`
 *  - `httpsCallable(getFunctions(), "onlineProjectAction")` with
 *    `{action: "<name>", data: {...}}` payload
 *  - Subcollection methods use `onSnapshot` and return `Unsubscribe`
 *
 * Per `docs/OnlineService.md` §6.7, the dispatcher routes 17 callable
 * actions; `updateMilestoneMetadata` is a rule-only direct Firestore
 * write (security-rule exception) and is NOT exposed here.
 */

import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFunctions, getFirebaseFirestore } from "./firebaseApp";

const getFunctions = () => getFirebaseFunctions();
const getDb = () => getFirebaseFirestore();

// ============================================================================
// TYPES — mirror docs/OnlineService.md §6.2-6.5
// ============================================================================

export type OnlineProjectStatus =
  | "Pending"
  | "Negotiating"
  | "Active"
  | "InReview"
  | "RevisionsRequested"
  | "Completed"
  | "Declined"
  | "Cancelled"
  | "Disputed";

export type ServicePackageType = "Fixed" | "Milestone" | "Session";
export type ServiceMode = "InPerson" | "Online" | "Hybrid";
export type OnlineDeliveryFormat = "live" | "async" | "mixed";
export type NegotiationOfferStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Countered"
  | "Superseded";
export type DeliverableReviewStatus =
  | "Pending"
  | "Approved"
  | "RevisionRequested";
export type MilestoneStatus = "Pending" | "Submitted" | "Approved";

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  percentage: number;
  status: MilestoneStatus;
  submittedAt?: string;
  approvedAt?: string;
}

export interface ProjectBrief {
  id: string;
  projectId: string;
  clientId: string;
  scope: string;
  requirements: string;
  attachments: Array<{
    mediaId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  suggestedPrice?: number;
  suggestedDeadline?: string;
  suggestedRevisions?: number;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationOffer {
  id: string;
  projectId: string;
  authorId: string;
  authorRole: "client" | "provider";
  price: number;
  deadline: string;
  scope: string;
  revisionRounds: number;
  message?: string;
  status: NegotiationOfferStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface DeliverableSubmission {
  id: string;
  projectId: string;
  milestoneId?: string;
  attachments: Array<{
    mediaId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  notes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewStatus: DeliverableReviewStatus;
  reviewNotes?: string;
}

export interface OnlineProject {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  packageId: string;
  packageType: ServicePackageType;
  packageSnapshot: {
    title: string;
    description: string;
    price: number;
    type: ServicePackageType;
    typeFields: object;
  };
  title: string;
  description: string;
  price: number;
  deadline: string;
  milestones: Milestone[];
  briefId: string;
  status: OnlineProjectStatus;
  revisionsRemaining: number;
  workStarted: boolean;
  conversationId?: string;
  amountPaid: number;
  paymentStatus: "PENDING" | "PAID_HELD" | "RELEASED";
  paymentMethod?: "SRVWallet" | "GCash";
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  declinedAt?: string;
  disputedAt?: string;
  cancelledBy?: string;
  disputedBy?: string;
  declineReason?: string;
  cancelReason?: string;
  disputeReason?: string;
}

export interface ProjectBriefInput {
  scope: string;
  requirements: string;
  attachments?: Array<{
    mediaId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  suggestedPrice?: number;
  suggestedDeadline?: string;
  suggestedRevisions?: number;
  additionalNotes?: string;
}

export interface CreateOnlineProjectInput {
  serviceId: string;
  packageId: string;
  title: string;
  description: string;
  deadline: string;
  brief: ProjectBriefInput;
}

export interface NegotiateOfferInput {
  price: number;
  deadline: string;
  scope: string;
  revisionRounds: number;
  message?: string;
}

export interface SubmitDeliverableInput {
  milestoneId?: string;
  attachments: Array<{
    mediaId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: "SRVWallet" | "GCash";
  paymentId?: string;
}

export interface ProjectAnalytics {
  providerId: string;
  total: number;
  byStatus: Record<OnlineProjectStatus, number>;
  revenue: number;
  averageCompletionDays: number;
}

// ============================================================================
// INTERNAL — wraps the single `onlineProjectAction` callable
// ============================================================================

/**
 * Low-level dispatcher. Throws an HttpsError-formatted Error when the
 * backend rejects. Callers should treat thrown errors as user-actionable
 * messages (e.g. "Your reputation score is too low").
 * @param {string} action
 * @param {object} data
 * @return {Promise<any>}
 */
async function call(action: string, data: object = {}): Promise<any> {
  const fn = httpsCallable(getFunctions(), "onlineProjectAction");
  const result = await fn({ action, data });
  return result.data;
}

// ============================================================================
// SERVICE OBJECT — 18 callable actions + 3 subcollection subscriptions
// ============================================================================

export const onlineProjectCanisterService = {
  // ==========================================================================
  // 1. createOnlineProject (httpsCallable)
  //    Pending → wait for provider. Validates serviceMode, packageType,
  //    negotiable, client reputation.
  // ==========================================================================
  async createOnlineProject(input: CreateOnlineProjectInput): Promise<{
    success: boolean;
    project: OnlineProject;
    brief: ProjectBrief;
  }> {
    return await call("createOnlineProject", input);
  },

  // ==========================================================================
  // 2. acceptProject (httpsCallable)
  //    Pending | Negotiating → Active. Provider-only. Sets `acceptedAt`.
  // ==========================================================================
  async acceptProject(projectId: string): Promise<{
    success: boolean;
    project: OnlineProject;
  }> {
    return await call("acceptProject", { projectId });
  },

  // ==========================================================================
  // 3. declineProject (httpsCallable)
  //    Pending | Negotiating → Declined. Provider-only. Sets `declinedAt`.
  // ==========================================================================
  async declineProject(
    projectId: string,
    reason?: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("declineProject", { projectId, reason });
  },

  // ==========================================================================
  // 4. negotiateProject (httpsCallable)
  //    Creates offer doc in `negotiations/{offerId}` subcollection.
  //    Atomic with the project's status flip via `db.runTransaction`.
  //    Only valid when `service.negotiable === true`.
  // ==========================================================================
  async negotiateProject(
    projectId: string,
    offer: NegotiateOfferInput,
  ): Promise<{
    success: boolean;
    offer: NegotiationOffer;
    project: OnlineProject;
  }> {
    return await call("negotiateProject", { projectId, ...offer });
  },

  // ==========================================================================
  // 5. acceptCounterOffer (httpsCallable)
  //    Reads latest Pending offer (inside transaction), sets agreed terms,
  //    marks offer statuses. Negotiating → Active.
  // ==========================================================================
  async acceptCounterOffer(projectId: string): Promise<{
    success: boolean;
    project: OnlineProject;
  }> {
    return await call("acceptCounterOffer", { projectId });
  },

  // ==========================================================================
  // 6. rejectCounterOffer (httpsCallable)
  //    Asymmetric: client rejecting provider's last offer → Declined.
  //    Provider rejecting client's last offer → stays Negotiating.
  // ==========================================================================
  async rejectCounterOffer(projectId: string): Promise<{
    success: boolean;
    project: OnlineProject;
  }> {
    return await call("rejectCounterOffer", { projectId });
  },

  // ==========================================================================
  // 7. submitDeliverable (httpsCallable)
  //    Active → InReview. Sets `workStarted = true`. Writes to
  //    `deliverables/{deliverableId}` subcollection.
  // ==========================================================================
  async submitDeliverable(
    projectId: string,
    input: SubmitDeliverableInput,
  ): Promise<{
    success: boolean;
    deliverable: DeliverableSubmission;
    project: OnlineProject;
  }> {
    return await call("submitDeliverable", { projectId, ...input });
  },

  // ==========================================================================
  // 8. approveDeliverable (httpsCallable)
  //    InReview → Completed (all milestones approved) or stays Active
  //    (partial). Client-only.
  // ==========================================================================
  async approveDeliverable(
    projectId: string,
    deliverableId: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("approveDeliverable", { projectId, deliverableId });
  },

  // ==========================================================================
  // 9. requestRevision (httpsCallable)
  //    InReview → RevisionsRequested. Decrements `revisionsRemaining`.
  //    Auto-escalates to Disputed when counter hits 0.
  // ==========================================================================
  async requestRevision(
    projectId: string,
    deliverableId: string,
    notes?: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("requestRevision", { projectId, deliverableId, notes });
  },

  // ==========================================================================
  // 10. cancelProject (httpsCallable)
  //     Either party from any non-terminal status → Cancelled.
  //     Refund per §8.3: no work started = full refund, work started = no refund.
  // ==========================================================================
  async cancelProject(
    projectId: string,
    reason?: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("cancelProject", { projectId, reason });
  },

  // ==========================================================================
  // 11. disputeProject (httpsCallable)
  //     Completed → Disputed. Either party.
  // ==========================================================================
  async disputeProject(
    projectId: string,
    reason?: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("disputeProject", { projectId, reason });
  },

  // ==========================================================================
  // 12. recordPayment (httpsCallable)
  //     SRVWallet-only in v1. Updates `amountPaid` + `paymentStatus`.
  // ==========================================================================
  async recordPayment(
    projectId: string,
    input: RecordPaymentInput,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("recordPayment", { projectId, ...input });
  },

  // ==========================================================================
  // 13. markMilestoneApproved (httpsCallable)
  //     Client approves a single milestone. Project stays Active until
  //     all milestones are approved.
  // ==========================================================================
  async markMilestoneApproved(
    projectId: string,
    milestoneId: string,
  ): Promise<{ success: boolean; project: OnlineProject }> {
    return await call("markMilestoneApproved", { projectId, milestoneId });
  },

  // ==========================================================================
  // 14. updateMilestoneMetadata — RULE-ONLY, NOT A CALLABLE
  //     Provider-side direct Firestore write. Enforced by security-rule
  //     exception. The frontend writes via `updateDoc` on
  //     `online_projects/{id}` (fields: `milestones[].title/description/dueDate`).
  // ==========================================================================
  async updateMilestoneMetadata(
    projectId: string,
    milestoneId: string,
    fields: { title?: string; description?: string; dueDate?: string },
  ): Promise<void> {
    const db = getDb();
    const projectRef = doc(db, "online_projects", projectId);
    // Direct write is allowed by the security rule for the provider;
    // status, percentage, and other fields are blocked at the rule layer.
    const updatePayload: Record<string, any> = {};
    if (fields.title !== undefined)
      updatePayload[`milestones.${milestoneId}.title`] = fields.title;
    if (fields.description !== undefined)
      updatePayload[`milestones.${milestoneId}.description`] =
        fields.description;
    if (fields.dueDate !== undefined)
      updatePayload[`milestones.${milestoneId}.dueDate`] = fields.dueDate;
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(projectRef, updatePayload);
  },

  // ==========================================================================
  // 15. getOnlineProject (httpsCallable)
  //     Returns project doc only — subcollections via subscribeToBrief/etc.
  // ==========================================================================
  async getOnlineProject(projectId: string): Promise<{
    success: boolean;
    project: OnlineProject;
  }> {
    return await call("getOnlineProject", { projectId });
  },

  // ==========================================================================
  // 16. listClientOnlineProjects (httpsCallable)
  // ==========================================================================
  async listClientOnlineProjects(
    opts: {
      limit?: number;
      status?: OnlineProjectStatus;
      clientId?: string; // admin override
      adminOnBehalf?: boolean;
    } = {},
  ): Promise<{ success: boolean; projects: OnlineProject[]; count: number }> {
    return await call("listClientOnlineProjects", opts);
  },

  // ==========================================================================
  // 17. listProviderOnlineProjects (httpsCallable)
  // ==========================================================================
  async listProviderOnlineProjects(
    opts: {
      limit?: number;
      status?: OnlineProjectStatus;
      providerId?: string; // admin override
      adminOnBehalf?: boolean;
    } = {},
  ): Promise<{ success: boolean; projects: OnlineProject[]; count: number }> {
    return await call("listProviderOnlineProjects", opts);
  },

  // ==========================================================================
  // 18. getProjectAnalytics (httpsCallable)
  //     Provider stats: total, by status, revenue, average completion time.
  // ==========================================================================
  async getProjectAnalytics(providerId?: string): Promise<{
    success: boolean;
    analytics: ProjectAnalytics;
  }> {
    return await call("getProjectAnalytics", { providerId });
  },

  // ==========================================================================
  // SUBCOLLECTION SUBSCRIPTIONS — direct Firestore, not callables
  // ==========================================================================

  /**
   * Subscribe to a single project's main document. Emits `null` when the
   * project doesn't exist (or is hidden from the current user — Firestore
   * rules gate this). Used by `useOnlineProject` / `useProviderOnlineProject`
   * to drive detail pages.
   * @param {string} projectId
   * @param {(project: OnlineProject | null) => void} onChange
   * @param {(error: Error) => void} onError
   * @return {Unsubscribe}
   */
  subscribeToProject(
    projectId: string,
    onChange: (project: OnlineProject | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getDb();
    const projectRef = doc(db, "online_projects", projectId);
    return onSnapshot(
      projectRef,
      (snap) => {
        if (!snap.exists()) {
          onChange(null);
          return;
        }
        onChange({ id: snap.id, ...snap.data() } as OnlineProject);
      },
      onError,
    );
  },

  /**
   * Subscribe to a project's brief subcollection. Returns the first/only
   * brief doc (one brief per project per spec §6.3).
   * @param {string} projectId
   * @param {(brief: ProjectBrief | null) => void} onChange
   * @param {(error: Error) => void} onError
   * @return {Unsubscribe}
   */
  subscribeToBrief(
    projectId: string,
    onChange: (brief: ProjectBrief | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getDb();
    const briefsRef = collection(db, "online_projects", projectId, "briefs");
    // Brief IDs are auto-generated (e.g. "brief-1719720000000-1234").
    // There is at most one brief per project; we listen to the whole
    // collection and emit the first doc.
    return onSnapshot(
      briefsRef,
      (snap) => {
        if (snap.empty) {
          onChange(null);
          return;
        }
        const first = snap.docs[0];
        onChange({ id: first.id, ...first.data() } as ProjectBrief);
      },
      onError,
    );
  },

  /**
   * Subscribe to all negotiation offers for a project, ordered by
   * `createdAt` desc. Returns all offers including Superseded.
   * @param {string} projectId
   * @param {(offers: NegotiationOffer[]) => void} onChange
   * @param {(error: Error) => void} onError
   * @return {Unsubscribe}
   */
  subscribeToNegotiations(
    projectId: string,
    onChange: (offers: NegotiationOffer[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getDb();
    const offersRef = collection(
      db,
      "online_projects",
      projectId,
      "negotiations",
    );
    const q = query(offersRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const offers: NegotiationOffer[] = [];
        snap.forEach((d) =>
          offers.push({ id: d.id, ...d.data() } as NegotiationOffer),
        );
        onChange(offers);
      },
      onError,
    );
  },

  /**
   * Subscribe to all deliverables for a project, ordered by `submittedAt` desc.
   * @param {string} projectId
   * @param {(deliverables: DeliverableSubmission[]) => void} onChange
   * @param {(error: Error) => void} onError
   * @return {Unsubscribe}
   */
  subscribeToDeliverables(
    projectId: string,
    onChange: (deliverables: DeliverableSubmission[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const db = getDb();
    const delivRef = collection(
      db,
      "online_projects",
      projectId,
      "deliverables",
    );
    const q = query(delivRef, orderBy("submittedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        const deliverables: DeliverableSubmission[] = [];
        snap.forEach((d) =>
          deliverables.push({ id: d.id, ...d.data() } as DeliverableSubmission),
        );
        onChange(deliverables);
      },
      onError,
    );
  },
};

export default onlineProjectCanisterService;
