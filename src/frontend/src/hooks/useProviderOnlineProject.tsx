/**
 * `useProviderOnlineProject` — provider-side hook for a single OnlineProject.
 *
 * Mirrors the shape of `useOnlineProject.tsx` (same 4 real-time subscriptions
 * to the project doc and `briefs/`, `negotiations/`, `deliverables/`
 * subcollections) but exposes the provider-side action surface:
 *
 *   - acceptProject / declineProject (Pending → Active / Declined)
 *   - negotiate (provider counter-offers, see state machine §6.6)
 *   - submitDeliverable (Active → InReview)
 *   - markMilestoneApproved (Milestone package approval)
 *   - updateMilestoneMetadata (rule-only direct Firestore write)
 *   - cancelProject / disputeProject (either party)
 *   - recordPayment (provider records receipt from client's SRVWallet)
 *
 * `negotiateProject` is callable by both sides per spec §6.8 — the
 * `authorRole` on the offer doc distinguishes client vs provider offers.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Unsubscribe } from "firebase/firestore";
import {
  onlineProjectCanisterService,
  OnlineProject,
  ProjectBrief,
  NegotiationOffer,
  DeliverableSubmission,
  NegotiateOfferInput,
  SubmitDeliverableInput,
  RecordPaymentInput,
} from "../services/onlineProjectCanisterService";

export interface UseProviderOnlineProjectResult {
  // Real-time data
  project: OnlineProject | null;
  brief: ProjectBrief | null;
  negotiations: NegotiationOffer[];
  deliverables: DeliverableSubmission[];

  // State
  loading: boolean;
  error: string | null;

  // Provider actions
  acceptProject: () => Promise<{ success: boolean; project: OnlineProject }>;
  declineProject: (
    reason?: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
  negotiate: (offer: NegotiateOfferInput) => Promise<{
    success: boolean;
    offer: NegotiationOffer;
    project: OnlineProject;
  }>;
  submitDeliverable: (input: SubmitDeliverableInput) => Promise<{
    success: boolean;
    deliverable: DeliverableSubmission;
    project: OnlineProject;
  }>;
  markMilestoneApproved: (
    milestoneId: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
  updateMilestoneMetadata: (
    milestoneId: string,
    fields: { title?: string; description?: string; dueDate?: string },
  ) => Promise<void>;
  cancelProject: (
    reason?: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
  disputeProject: (
    reason?: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
  recordPayment: (
    input: RecordPaymentInput,
  ) => Promise<{ success: boolean; project: OnlineProject }>;

  // Manual refresh — pulls a fresh project doc snapshot.
  refresh: () => Promise<void>;
}

export const useProviderOnlineProject = (
  projectId: string | undefined,
): UseProviderOnlineProjectResult => {
  const [project, setProject] = useState<OnlineProject | null>(null);
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [negotiations, setNegotiations] = useState<NegotiationOffer[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(!!projectId);
  const [error, setError] = useState<string | null>(null);

  const projectUnsubRef = useRef<Unsubscribe | null>(null);
  const briefUnsubRef = useRef<Unsubscribe | null>(null);
  const negUnsubRef = useRef<Unsubscribe | null>(null);
  const delivUnsubRef = useRef<Unsubscribe | null>(null);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setBrief(null);
      setNegotiations([]);
      setDeliverables([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const handleError = (label: string, err: unknown) => {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : `Failed to load ${label}.`;
      setError(message);
      setLoading(false);
    };

    projectUnsubRef.current = onlineProjectCanisterService.subscribeToProject(
      projectId,
      (next) => {
        if (!mountedRef.current) return;
        setProject(next);
        if (next) {
          setError(null);
        }
        setLoading(false);
      },
      (err) => handleError("project", err),
    );

    briefUnsubRef.current = onlineProjectCanisterService.subscribeToBrief(
      projectId,
      (next) => {
        if (!mountedRef.current) return;
        setBrief(next);
      },
      (err) => handleError("brief", err),
    );

    negUnsubRef.current = onlineProjectCanisterService.subscribeToNegotiations(
      projectId,
      (next) => {
        if (!mountedRef.current) return;
        setNegotiations(next);
      },
      (err) => handleError("negotiations", err),
    );

    delivUnsubRef.current =
      onlineProjectCanisterService.subscribeToDeliverables(
        projectId,
        (next) => {
          if (!mountedRef.current) return;
          setDeliverables(next);
        },
        (err) => handleError("deliverables", err),
      );

    return () => {
      projectUnsubRef.current?.();
      briefUnsubRef.current?.();
      negUnsubRef.current?.();
      delivUnsubRef.current?.();
      projectUnsubRef.current = null;
      briefUnsubRef.current = null;
      negUnsubRef.current = null;
      delivUnsubRef.current = null;
    };
  }, [projectId]);

  const acceptProject = useCallback(() => {
    if (!projectId)
      return Promise.reject(new Error("No active project context"));
    return onlineProjectCanisterService.acceptProject(projectId);
  }, [projectId]);

  const declineProject = useCallback(
    (reason?: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.declineProject(projectId, reason);
    },
    [projectId],
  );

  const negotiate = useCallback(
    (offer: NegotiateOfferInput) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.negotiateProject(projectId, offer);
    },
    [projectId],
  );

  const submitDeliverable = useCallback(
    (input: SubmitDeliverableInput) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.submitDeliverable(projectId, input);
    },
    [projectId],
  );

  const markMilestoneApproved = useCallback(
    (milestoneId: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.markMilestoneApproved(
        projectId,
        milestoneId,
      );
    },
    [projectId],
  );

  const updateMilestoneMetadata = useCallback(
    (
      milestoneId: string,
      fields: { title?: string; description?: string; dueDate?: string },
    ) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.updateMilestoneMetadata(
        projectId,
        milestoneId,
        fields,
      );
    },
    [projectId],
  );

  const cancelProject = useCallback(
    (reason?: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.cancelProject(projectId, reason);
    },
    [projectId],
  );

  const disputeProject = useCallback(
    (reason?: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.disputeProject(projectId, reason);
    },
    [projectId],
  );

  const recordPayment = useCallback(
    (input: RecordPaymentInput) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.recordPayment(projectId, input);
    },
    [projectId],
  );

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const res =
        await onlineProjectCanisterService.getOnlineProject(projectId);
      if (mountedRef.current) {
        setProject(res.project);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to refresh project",
        );
      }
    }
  }, [projectId]);

  return {
    project,
    brief,
    negotiations,
    deliverables,
    loading,
    error,
    acceptProject,
    declineProject,
    negotiate,
    submitDeliverable,
    markMilestoneApproved,
    updateMilestoneMetadata,
    cancelProject,
    disputeProject,
    recordPayment,
    refresh,
  };
};

export default useProviderOnlineProject;
