/// <reference types="jest" />
/**
 * Unit tests for onlineProjectCanisterService.
 *
 * Coverage matrix (matches the 18 callable actions + 3 subscriptions + 1
 * rule-only direct write documented in `docs/OnlineService.md` §6.7):
 *
 *   1.  createOnlineProject             (callable)
 *   2.  acceptProject                   (callable)
 *   3.  declineProject                  (callable)
 *   4.  negotiateProject                (callable)
 *   5.  acceptCounterOffer              (callable)
 *   6.  rejectCounterOffer              (callable)
 *   7.  submitDeliverable               (callable)
 *   8.  approveDeliverable              (callable)
 *   9.  requestRevision                 (callable)
 *   10. cancelProject                   (callable)
 *   11. disputeProject                  (callable)
 *   12. recordPayment                   (callable)
 *   13. markMilestoneApproved           (callable)
 *   14. updateMilestoneMetadata         (direct Firestore write, rule-only)
 *   15. getOnlineProject                (callable)
 *   16. listClientOnlineProjects        (callable)
 *   17. listProviderOnlineProjects      (callable)
 *   18. getProjectAnalytics             (callable)
 *   S1. subscribeToBrief                (Firestore subscription)
 *   S2. subscribeToNegotiations         (Firestore subscription)
 *   S3. subscribeToDeliverables         (Firestore subscription)
 *
 * Mocking strategy
 * ----------------
 *  - `firebase/functions` `httpsCallable` is replaced with a jest.fn that
 *    returns a wrapper jest.fn so we can assert the payload shape.
 *  - `firebase/firestore` `collection`, `doc`, `query`, `orderBy`, and
 *    `updateDoc` are stubbed with identity-like mocks so we can verify
 *    path and payload construction. `onSnapshot` is wired to a controllable
 *    trigger that the test can fire synchronously.
 *  - `./firebaseApp` getters are mocked to return stable sentinel objects
 *    so we can assert they were passed through unchanged.
 */

// ---------------------------------------------------------------------------
// Firebase mocks — must be declared before importing the service under test.
// ---------------------------------------------------------------------------

const FUNCTIONS_INSTANCE = Symbol("functions");
const FIRESTORE_INSTANCE = Symbol("firestore");

jest.mock("../firebaseApp", () => ({
  getFirebaseFunctions: jest.fn(() => FUNCTIONS_INSTANCE),
  getFirebaseFirestore: jest.fn(() => FIRESTORE_INSTANCE),
}));

const httpsCallableMock = jest.fn();
jest.mock("firebase/functions", () => ({
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

const collectionMock = jest.fn();
const docMock = jest.fn();
const queryMock = jest.fn();
const orderByMock = jest.fn();
const updateDocMock = jest.fn();
const onSnapshotMock = jest.fn();

const collectionImpl = (_db: unknown, ...path: string[]) => ({
  __type: "collection",
  path,
});
const docImpl = (_db: unknown, ...path: string[]) => ({__type: "doc", path});
const queryImpl = (ref: unknown) => ({__type: "query", ref});
const orderByImpl = (field: string, direction?: string) => ({
  __type: "orderBy",
  field,
  direction,
});

jest.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));

import {onlineProjectCanisterService} from "../onlineProjectCanisterService";
import {getFirebaseFunctions, getFirebaseFirestore} from "../firebaseApp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CallableFn = jest.Mock<Promise<{data: unknown}>, [unknown]>;

const setupCallable = (returnData: unknown) => {
  const fn = jest.fn().mockResolvedValue({data: returnData}) as CallableFn;
  httpsCallableMock.mockReturnValue(fn);
  return fn;
};

const fireSnapshot = (
  success: (snap: unknown) => void,
  snap: unknown,
): void => {
  success(snap);
};

const makeSnap = (docs: Array<{id: string; data: () => Record<string, unknown>}>) => {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({id: d.id, data: d.data})),
    forEach: (cb: (doc: {id: string; data: () => Record<string, unknown>}) => void) =>
      docs.forEach(cb),
  };
};

beforeEach(() => {
  httpsCallableMock.mockReset();
  collectionMock.mockReset();
  docMock.mockReset();
  queryMock.mockReset();
  orderByMock.mockReset();
  updateDocMock.mockReset();
  onSnapshotMock.mockReset();
  collectionMock.mockImplementation(collectionImpl);
  docMock.mockImplementation(docImpl);
  queryMock.mockImplementation(queryImpl);
  orderByMock.mockImplementation(orderByImpl);
});

// ---------------------------------------------------------------------------
// Module-level invariants
// ---------------------------------------------------------------------------

describe("onlineProjectCanisterService — module shape", () => {
  it("always invokes the single 'onlineProjectAction' callable", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.acceptProject("p-1");
    expect(httpsCallableMock).toHaveBeenCalledWith(FUNCTIONS_INSTANCE, "onlineProjectAction");
    expect(httpsCallableMock).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("forwards the action and data payload unchanged", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.declineProject("p-1", "out of scope");
    expect(fn).toHaveBeenCalledWith({
      action: "declineProject",
      data: {projectId: "p-1", reason: "out of scope"},
    });
  });

  it("returns result.data from the underlying callable", async () => {
    setupCallable({success: true, project: {id: "p-1"}});
    const res = await onlineProjectCanisterService.getOnlineProject("p-1");
    expect(res).toEqual({success: true, project: {id: "p-1"}});
  });

  it("propagates rejections from the underlying callable", async () => {
    const err = new Error("UNauthenticated");
    httpsCallableMock.mockReturnValue(jest.fn().mockRejectedValue(err));
    await expect(onlineProjectCanisterService.acceptProject("p-1")).rejects.toBe(err);
  });
});

// ---------------------------------------------------------------------------
// 1. createOnlineProject
// ---------------------------------------------------------------------------

describe("createOnlineProject", () => {
  it("forwards the full CreateOnlineProjectInput as the data payload", async () => {
    const fn = setupCallable({success: true});
    const input = {
      serviceId: "svc-1",
      packageId: "pkg-1",
      title: "Build me a logo",
      description: "Vector logo, 3 concepts",
      deadline: "2026-08-01",
      brief: {
        scope: "Logo design",
        requirements: "3 concepts, vector",
        attachments: [
          {
            mediaId: "m-1",
            fileName: "ref.png",
            fileUrl: "https://x",
            fileSize: 1024,
            contentType: "image/png",
          },
        ],
        suggestedPrice: 5000,
        suggestedDeadline: "2026-08-01",
        suggestedRevisions: 2,
        additionalNotes: "Open to suggestions",
      },
    };
    const res = await onlineProjectCanisterService.createOnlineProject(input);
    expect(fn).toHaveBeenCalledWith({action: "createOnlineProject", data: input});
    expect(res.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. acceptProject
// ---------------------------------------------------------------------------

describe("acceptProject", () => {
  it("sends {action, projectId}", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.acceptProject("p-99");
    expect(fn).toHaveBeenCalledWith({
      action: "acceptProject",
      data: {projectId: "p-99"},
    });
  });
});

// ---------------------------------------------------------------------------
// 3. declineProject
// ---------------------------------------------------------------------------

describe("declineProject", () => {
  it("sends projectId + reason when provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.declineProject("p-1", "out of scope");
    expect(fn).toHaveBeenCalledWith({
      action: "declineProject",
      data: {projectId: "p-1", reason: "out of scope"},
    });
  });

  it("sends projectId only when reason is omitted", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.declineProject("p-1");
    expect(fn).toHaveBeenCalledWith({
      action: "declineProject",
      data: {projectId: "p-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 4. negotiateProject
// ---------------------------------------------------------------------------

describe("negotiateProject", () => {
  it("spreads NegotiateOfferInput alongside projectId", async () => {
    const fn = setupCallable({success: true});
    const offer = {
      price: 4500,
      deadline: "2026-08-15",
      scope: "Logo only, 2 revisions",
      revisionRounds: 2,
      message: "Counter",
    };
    await onlineProjectCanisterService.negotiateProject("p-1", offer);
    expect(fn).toHaveBeenCalledWith({
      action: "negotiateProject",
      data: {projectId: "p-1", ...offer},
    });
  });

  it("omits the optional message key when not provided in the offer", async () => {
    const fn = setupCallable({success: true});
    const offer = {
      price: 4500,
      deadline: "2026-08-15",
      scope: "Logo",
      revisionRounds: 1,
    };
    await onlineProjectCanisterService.negotiateProject("p-1", offer);
    const sent = fn.mock.calls[0][0] as {action: string; data: Record<string, unknown>};
    expect(sent).toMatchObject({
      action: "negotiateProject",
      data: {projectId: "p-1", price: 4500, scope: "Logo", revisionRounds: 1},
    });
    expect(sent.data).not.toHaveProperty("message");
  });
});

// ---------------------------------------------------------------------------
// 5. acceptCounterOffer
// ---------------------------------------------------------------------------

describe("acceptCounterOffer", () => {
  it("sends {action, projectId}", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.acceptCounterOffer("p-1");
    expect(fn).toHaveBeenCalledWith({
      action: "acceptCounterOffer",
      data: {projectId: "p-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 6. rejectCounterOffer
// ---------------------------------------------------------------------------

describe("rejectCounterOffer", () => {
  it("sends {action, projectId}", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.rejectCounterOffer("p-1");
    expect(fn).toHaveBeenCalledWith({
      action: "rejectCounterOffer",
      data: {projectId: "p-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 7. submitDeliverable
// ---------------------------------------------------------------------------

describe("submitDeliverable", () => {
  it("spreads SubmitDeliverableInput alongside projectId", async () => {
    const fn = setupCallable({success: true});
    const input = {
      milestoneId: "ms-1",
      attachments: [
        {
          mediaId: "m-1",
          fileName: "logo.svg",
          fileUrl: "https://x",
          fileSize: 2048,
          contentType: "image/svg+xml",
        },
      ],
      notes: "First draft",
    };
    await onlineProjectCanisterService.submitDeliverable("p-1", input);
    expect(fn).toHaveBeenCalledWith({
      action: "submitDeliverable",
      data: {projectId: "p-1", ...input},
    });
  });

  it("omits milestoneId and notes when not provided", async () => {
    const fn = setupCallable({success: true});
    const input = {
      attachments: [
        {
          mediaId: "m-1",
          fileName: "logo.svg",
          fileUrl: "https://x",
          fileSize: 2048,
          contentType: "image/svg+xml",
        },
      ],
    };
    await onlineProjectCanisterService.submitDeliverable("p-1", input);
    const sent = fn.mock.calls[0][0] as {data: Record<string, unknown>};
    expect(sent.data).not.toHaveProperty("milestoneId");
    expect(sent.data).not.toHaveProperty("notes");
  });
});

// ---------------------------------------------------------------------------
// 8. approveDeliverable
// ---------------------------------------------------------------------------

describe("approveDeliverable", () => {
  it("sends {action, projectId, deliverableId}", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.approveDeliverable("p-1", "d-1");
    expect(fn).toHaveBeenCalledWith({
      action: "approveDeliverable",
      data: {projectId: "p-1", deliverableId: "d-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 9. requestRevision
// ---------------------------------------------------------------------------

describe("requestRevision", () => {
  it("sends projectId, deliverableId, and optional notes", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.requestRevision("p-1", "d-1", "Make it pop");
    expect(fn).toHaveBeenCalledWith({
      action: "requestRevision",
      data: {projectId: "p-1", deliverableId: "d-1", notes: "Make it pop"},
    });
  });

  it("sends notes as undefined when not provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.requestRevision("p-1", "d-1");
    const sent = fn.mock.calls[0][0] as {data: Record<string, unknown>};
    expect(sent.data).toMatchObject({projectId: "p-1", deliverableId: "d-1", notes: undefined});
  });
});

// ---------------------------------------------------------------------------
// 10. cancelProject
// ---------------------------------------------------------------------------

describe("cancelProject", () => {
  it("sends projectId and reason when provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.cancelProject("p-1", "client changed mind");
    expect(fn).toHaveBeenCalledWith({
      action: "cancelProject",
      data: {projectId: "p-1", reason: "client changed mind"},
    });
  });

  it("sends reason as undefined when not provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.cancelProject("p-1");
    const sent = fn.mock.calls[0][0] as {data: Record<string, unknown>};
    expect(sent.data).toMatchObject({projectId: "p-1", reason: undefined});
  });
});

// ---------------------------------------------------------------------------
// 11. disputeProject
// ---------------------------------------------------------------------------

describe("disputeProject", () => {
  it("sends projectId and reason when provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.disputeProject("p-1", "no delivery");
    expect(fn).toHaveBeenCalledWith({
      action: "disputeProject",
      data: {projectId: "p-1", reason: "no delivery"},
    });
  });

  it("sends reason as undefined when not provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.disputeProject("p-1");
    const sent = fn.mock.calls[0][0] as {data: Record<string, unknown>};
    expect(sent.data).toMatchObject({projectId: "p-1", reason: undefined});
  });
});

// ---------------------------------------------------------------------------
// 12. recordPayment
// ---------------------------------------------------------------------------

describe("recordPayment", () => {
  it("spreads RecordPaymentInput alongside projectId", async () => {
    const fn = setupCallable({success: true});
    const input = {amount: 5000, paymentMethod: "SRVWallet" as const, paymentId: "pi-1"};
    await onlineProjectCanisterService.recordPayment("p-1", input);
    expect(fn).toHaveBeenCalledWith({
      action: "recordPayment",
      data: {projectId: "p-1", ...input},
    });
  });

  it("omits paymentId when not provided", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.recordPayment("p-1", {
      amount: 5000,
      paymentMethod: "GCash",
    });
    const sent = fn.mock.calls[0][0] as {data: Record<string, unknown>};
    expect(sent.data).not.toHaveProperty("paymentId");
  });
});

// ---------------------------------------------------------------------------
// 13. markMilestoneApproved
// ---------------------------------------------------------------------------

describe("markMilestoneApproved", () => {
  it("sends {action, projectId, milestoneId}", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.markMilestoneApproved("p-1", "ms-1");
    expect(fn).toHaveBeenCalledWith({
      action: "markMilestoneApproved",
      data: {projectId: "p-1", milestoneId: "ms-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 14. updateMilestoneMetadata — RULE-ONLY direct Firestore write
// ---------------------------------------------------------------------------

describe("updateMilestoneMetadata", () => {
  it("writes title, description, and dueDate under milestones.{id}.*", async () => {
    await onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {
      title: "New title",
      description: "New desc",
      dueDate: "2026-09-01",
    });
    expect(docMock).toHaveBeenCalledWith(FIRESTORE_INSTANCE, "online_projects", "p-1");
    expect(updateDocMock).toHaveBeenCalledWith(
      {__type: "doc", path: ["online_projects", "p-1"]},
      {
        "milestones.ms-1.title": "New title",
        "milestones.ms-1.description": "New desc",
        "milestones.ms-1.dueDate": "2026-09-01",
      },
    );
  });

  it("only includes fields that are not undefined", async () => {
    await onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {
      title: "Only title",
    });
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      "milestones.ms-1.title": "Only title",
    });
    const sent = updateDocMock.mock.calls[0][1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("milestones.ms-1.description");
    expect(sent).not.toHaveProperty("milestones.ms-1.dueDate");
  });

  it("sends an empty payload when every field is undefined", async () => {
    await onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {});
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {});
  });

  it("does NOT call the onlineProjectAction callable (rule-only write)", async () => {
    await onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {
      title: "x",
    });
    expect(httpsCallableMock).not.toHaveBeenCalled();
  });

  it("propagates rejections from updateDoc", async () => {
    updateDocMock.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    await expect(
      onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {title: "x"}),
    ).rejects.toThrow("PERMISSION_DENIED");
  });
});

// ---------------------------------------------------------------------------
// 15. getOnlineProject
// ---------------------------------------------------------------------------

describe("getOnlineProject", () => {
  it("sends {action, projectId}", async () => {
    const fn = setupCallable({success: true, project: {id: "p-1"}});
    await onlineProjectCanisterService.getOnlineProject("p-1");
    expect(fn).toHaveBeenCalledWith({
      action: "getOnlineProject",
      data: {projectId: "p-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// 16. listClientOnlineProjects
// ---------------------------------------------------------------------------

describe("listClientOnlineProjects", () => {
  it("sends an empty object when called with no args", async () => {
    const fn = setupCallable({success: true, projects: [], count: 0});
    await onlineProjectCanisterService.listClientOnlineProjects();
    expect(fn).toHaveBeenCalledWith({
      action: "listClientOnlineProjects",
      data: {},
    });
  });

  it("forwards limit and status filters", async () => {
    const fn = setupCallable({success: true, projects: [], count: 0});
    await onlineProjectCanisterService.listClientOnlineProjects({
      limit: 10,
      status: "Active",
    });
    expect(fn).toHaveBeenCalledWith({
      action: "listClientOnlineProjects",
      data: {limit: 10, status: "Active"},
    });
  });

  it("forwards admin-on-behalf overrides", async () => {
    const fn = setupCallable({success: true, projects: [], count: 0});
    await onlineProjectCanisterService.listClientOnlineProjects({
      clientId: "client-99",
      adminOnBehalf: true,
    });
    expect(fn).toHaveBeenCalledWith({
      action: "listClientOnlineProjects",
      data: {clientId: "client-99", adminOnBehalf: true},
    });
  });
});

// ---------------------------------------------------------------------------
// 17. listProviderOnlineProjects
// ---------------------------------------------------------------------------

describe("listProviderOnlineProjects", () => {
  it("sends an empty object when called with no args", async () => {
    const fn = setupCallable({success: true, projects: [], count: 0});
    await onlineProjectCanisterService.listProviderOnlineProjects();
    expect(fn).toHaveBeenCalledWith({
      action: "listProviderOnlineProjects",
      data: {},
    });
  });

  it("forwards providerId and adminOnBehalf", async () => {
    const fn = setupCallable({success: true, projects: [], count: 0});
    await onlineProjectCanisterService.listProviderOnlineProjects({
      providerId: "prov-99",
      adminOnBehalf: true,
    });
    expect(fn).toHaveBeenCalledWith({
      action: "listProviderOnlineProjects",
      data: {providerId: "prov-99", adminOnBehalf: true},
    });
  });
});

// ---------------------------------------------------------------------------
// 18. getProjectAnalytics
// ---------------------------------------------------------------------------

describe("getProjectAnalytics", () => {
  it("sends undefined providerId when called with no args", async () => {
    const fn = setupCallable({success: true, analytics: {}});
    await onlineProjectCanisterService.getProjectAnalytics();
    expect(fn).toHaveBeenCalledWith({
      action: "getProjectAnalytics",
      data: {providerId: undefined},
    });
  });

  it("forwards providerId when provided", async () => {
    const fn = setupCallable({success: true, analytics: {}});
    await onlineProjectCanisterService.getProjectAnalytics("prov-1");
    expect(fn).toHaveBeenCalledWith({
      action: "getProjectAnalytics",
      data: {providerId: "prov-1"},
    });
  });
});

// ---------------------------------------------------------------------------
// S1. subscribeToBrief
// ---------------------------------------------------------------------------

describe("subscribeToBrief", () => {
  it("attaches to online_projects/{id}/briefs with no orderBy", () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = jest.fn();
    const onError = jest.fn();
    const ret = onlineProjectCanisterService.subscribeToBrief("p-1", onChange, onError);
    expect(collectionMock).toHaveBeenCalledWith(
      FIRESTORE_INSTANCE,
      "online_projects",
      "p-1",
      "briefs",
    );
    expect(orderByMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    const [ref, success] = onSnapshotMock.mock.calls[0];
    expect(ref).toEqual({__type: "collection", path: ["online_projects", "p-1", "briefs"]});
    expect(typeof success).toBe("function");
    expect(ret).toBe(unsubscribe);
    void onError;
  });

  it("emits null when the snapshot is empty", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToBrief("p-1", onChange);
    fireSnapshot(captured!, makeSnap([]));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("emits the first brief doc with its id merged in", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToBrief("p-1", onChange);
    fireSnapshot(
      captured!,
      makeSnap([
        {id: "brief-1", data: () => ({scope: "logo", requirements: "vector"})},
        {id: "brief-2", data: () => ({scope: "ignored", requirements: "ignored"})},
      ]),
    );
    expect(onChange).toHaveBeenCalledWith({
      id: "brief-1",
      scope: "logo",
      requirements: "vector",
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwards errors via the optional onError callback", () => {
    let captured: ((snap: unknown) => void) | undefined;
    let capturedError: ((err: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation(
      (
        _ref: unknown,
        success: (snap: unknown) => void,
        errorCb: (err: unknown) => void,
      ) => {
        captured = success;
        capturedError = errorCb;
        return jest.fn();
      },
    );
    const onChange = jest.fn();
    const onError = jest.fn();
    onlineProjectCanisterService.subscribeToBrief("p-1", onChange, onError);
    capturedError!(new Error("boom"));
    expect(onError).toHaveBeenCalledWith(new Error("boom"));
    // success path should still be wired and not yet invoked
    expect(onChange).not.toHaveBeenCalled();
    void captured;
  });
});

// ---------------------------------------------------------------------------
// S2. subscribeToNegotiations
// ---------------------------------------------------------------------------

describe("subscribeToNegotiations", () => {
  it("queries online_projects/{id}/negotiations ordered by createdAt desc", () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = jest.fn();
    const ret = onlineProjectCanisterService.subscribeToNegotiations("p-1", onChange);
    expect(collectionMock).toHaveBeenCalledWith(
      FIRESTORE_INSTANCE,
      "online_projects",
      "p-1",
      "negotiations",
    );
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    expect(ret).toBe(unsubscribe);
  });

  it("emits an empty array when the snapshot is empty", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToNegotiations("p-1", onChange);
    fireSnapshot(captured!, makeSnap([]));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("emits each offer with its id merged in", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToNegotiations("p-1", onChange);
    fireSnapshot(
      captured!,
      makeSnap([
        {
          id: "off-1",
          data: () => ({price: 100, status: "Pending", authorRole: "client"}),
        },
        {
          id: "off-2",
          data: () => ({price: 200, status: "Accepted", authorRole: "provider"}),
        },
      ]),
    );
    expect(onChange).toHaveBeenCalledWith([
      {id: "off-1", price: 100, status: "Pending", authorRole: "client"},
      {id: "off-2", price: 200, status: "Accepted", authorRole: "provider"},
    ]);
  });

  it("wires the optional onError callback", () => {
    let capturedError: ((err: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation(
      (
        _ref: unknown,
        _success: (snap: unknown) => void,
        errorCb: (err: unknown) => void,
      ) => {
        capturedError = errorCb;
        return jest.fn();
      },
    );
    const onError = jest.fn();
    onlineProjectCanisterService.subscribeToNegotiations("p-1", jest.fn(), onError);
    capturedError!(new Error("denied"));
    expect(onError).toHaveBeenCalledWith(new Error("denied"));
  });
});

// ---------------------------------------------------------------------------
// S3. subscribeToDeliverables
// ---------------------------------------------------------------------------

describe("subscribeToDeliverables", () => {
  it("queries online_projects/{id}/deliverables ordered by submittedAt desc", () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);
    const onChange = jest.fn();
    const ret = onlineProjectCanisterService.subscribeToDeliverables("p-1", onChange);
    expect(collectionMock).toHaveBeenCalledWith(
      FIRESTORE_INSTANCE,
      "online_projects",
      "p-1",
      "deliverables",
    );
    expect(orderByMock).toHaveBeenCalledWith("submittedAt", "desc");
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    expect(ret).toBe(unsubscribe);
  });

  it("emits an empty array when the snapshot is empty", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToDeliverables("p-1", onChange);
    fireSnapshot(captured!, makeSnap([]));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("emits each deliverable with its id merged in", () => {
    let captured: ((snap: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation((_ref: unknown, success: (snap: unknown) => void) => {
      captured = success;
      return jest.fn();
    });
    const onChange = jest.fn();
    onlineProjectCanisterService.subscribeToDeliverables("p-1", onChange);
    fireSnapshot(
      captured!,
      makeSnap([
        {
          id: "del-1",
          data: () => ({reviewStatus: "Pending", submittedAt: "2026-07-01T00:00:00Z"}),
        },
      ]),
    );
    expect(onChange).toHaveBeenCalledWith([
      {
        id: "del-1",
        reviewStatus: "Pending",
        submittedAt: "2026-07-01T00:00:00Z",
      },
    ]);
  });

  it("wires the optional onError callback", () => {
    let capturedError: ((err: unknown) => void) | undefined;
    onSnapshotMock.mockImplementation(
      (
        _ref: unknown,
        _success: (snap: unknown) => void,
        errorCb: (err: unknown) => void,
      ) => {
        capturedError = errorCb;
        return jest.fn();
      },
    );
    const onError = jest.fn();
    onlineProjectCanisterService.subscribeToDeliverables("p-1", jest.fn(), onError);
    capturedError!(new Error("snap error"));
    expect(onError).toHaveBeenCalledWith(new Error("snap error"));
  });
});

// ---------------------------------------------------------------------------
// Module glue — the Firebase app getters are reused across every method.
// ---------------------------------------------------------------------------

describe("firebase app wiring", () => {
  it("uses the functions instance returned by getFirebaseFunctions", async () => {
    const fn = setupCallable({success: true});
    await onlineProjectCanisterService.acceptProject("p-1");
    expect(httpsCallableMock).toHaveBeenCalledWith(
      expect.anything(),
      "onlineProjectAction",
    );
    // The first arg is whatever getFirebaseFunctions returned.
    expect(getFirebaseFunctions).toHaveBeenCalled();
    void fn;
  });

  it("uses the firestore instance returned by getFirebaseFirestore for direct writes", async () => {
    await onlineProjectCanisterService.updateMilestoneMetadata("p-1", "ms-1", {
      title: "t",
    });
    expect(docMock).toHaveBeenCalledWith(
      expect.anything(),
      "online_projects",
      "p-1",
    );
    expect(getFirebaseFirestore).toHaveBeenCalled();
  });
});
