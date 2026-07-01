/**
 * `useOnlineProject` — client-side hook for a single OnlineProject.
 *
 * Subscribes (real-time) to the project document and its 3 subcollections
 * (`briefs/`, `negotiations/`, `deliverables/`) via the matching
 * `subscribe*` methods on `onlineProjectCanisterService`. Exposes the
 * client-side action surface (create / negotiate / accept counter / reject
 * counter / approve / request revision / cancel / dispute / recordPayment)
 * as bound functions that rethrow backend `HttpsError` messages verbatim.
 *
 * Mirrors the shape of `useProviderOnlineProject.tsx` so a single detail
 * page can be reused with the appropriate hook per role.
 *
 * Pattern reference: `useCachedBooking.ts` (subscribe + cache),
 * `useServiceDetail.tsx` (single-entity subscription), `useChat.tsx`
 * (multi-subscription lifecycle + mount-aware callbacks).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Unsubscribe } from "firebase/firestore";
import {
  onlineProjectCanisterService,
  OnlineProject,
  ProjectBrief,
  NegotiationOffer,
  DeliverableSubmission,
  CreateOnlineProjectInput,
  NegotiateOfferInput,
  RecordPaymentInput,
} from "../services/onlineProjectCanisterService";

export interface UseOnlineProjectResult {
  // Real-time data
  project: OnlineProject | null;
  brief: ProjectBrief | null;
  negotiations: NegotiationOffer[];
  deliverables: DeliverableSubmission[];

  // State
  loading: boolean;
  error: string | null;

  // Client actions
  createProject: (input: CreateOnlineProjectInput) => Promise<{
    success: boolean;
    project: OnlineProject;
    brief: ProjectBrief;
  }>;
  negotiate: (offer: NegotiateOfferInput) => Promise<{
    success: boolean;
    offer: NegotiationOffer;
    project: OnlineProject;
  }>;
  acceptCounterOffer: () => Promise<{
    success: boolean;
    project: OnlineProject;
  }>;
  rejectCounterOffer: () => Promise<{
    success: boolean;
    project: OnlineProject;
  }>;
  approveDeliverable: (
    deliverableId: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
  requestRevision: (
    deliverableId: string,
    notes?: string,
  ) => Promise<{ success: boolean; project: OnlineProject }>;
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

export const useOnlineProject = (
  projectId: string | undefined,
): UseOnlineProjectResult => {
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

  // Wire up 4 real-time listeners when projectId becomes available.
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

  // Bound action methods. Each is stable across renders (empty dep array
  // is fine because they only depend on `projectId`, captured in the hook
  // closure). The hook re-creates these callbacks if `projectId` changes,
  // which matches the subscription lifecycle above.
  const createProject = useCallback(
    (input: CreateOnlineProjectInput) => {
      if (!projectId) {
        return Promise.reject(new Error("No active project context"));
      }
      return onlineProjectCanisterService.createOnlineProject(input);
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

  const acceptCounterOffer = useCallback(() => {
    if (!projectId)
      return Promise.reject(new Error("No active project context"));
    return onlineProjectCanisterService.acceptCounterOffer(projectId);
  }, [projectId]);

  const rejectCounterOffer = useCallback(() => {
    if (!projectId)
      return Promise.reject(new Error("No active project context"));
    return onlineProjectCanisterService.rejectCounterOffer(projectId);
  }, [projectId]);

  const approveDeliverable = useCallback(
    (deliverableId: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.approveDeliverable(
        projectId,
        deliverableId,
      );
    },
    [projectId],
  );

  const requestRevision = useCallback(
    (deliverableId: string, notes?: string) => {
      if (!projectId)
        return Promise.reject(new Error("No active project context"));
      return onlineProjectCanisterService.requestRevision(
        projectId,
        deliverableId,
        notes,
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
    createProject,
    negotiate,
    acceptCounterOffer,
    rejectCounterOffer,
    approveDeliverable,
    requestRevision,
    cancelProject,
    disputeProject,
    recordPayment,
    refresh,
  };
};

export default useOnlineProject;
