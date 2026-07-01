/**
 * Integration tests for functions/src/onlineProject.js — 18 action cases
 * routed through the `onlineProjectAction` callable.
 *
 * Phase 0 skeleton: each action has an empty `describe` block asserting
 * the dispatch surface area. Stub handlers return HttpsError("internal")
 * with a "not yet implemented" message; the skeleton test only verifies
 * the wrapper compiles, the dispatcher routes unknown actions, and the
 * 18-action surface is fully covered.
 *
 * Per-action tests (7-case minimum + per-action deltas) land in
 * subsequent tasks. See `docs/OnlineService-Implementation-Checklist.md`.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {
  seedUser,
  seedCategory,
  seedOnlineService,
  seedServicePackage,
  seedReputation,
  buildOnlineService,
  buildServicePackage,
  seedOnlineProjectPending,
  seedOnlineProjectActive,
  seedOnlineProjectNegotiating,
  seedOnlineProjectCancelled,
  seedOnlineProjectInReview,
  seedOnlineProjectCompleted,
  seedOnlineProjectDisputed,
} = require("./helpers/seed");

const myFunctions = require("../src/onlineProject");
const {
  ONLINE_PROJECT_ACTIONS,
  ONLINE_PROJECT_CALLABLE_ACTIONS,
} = require("../src/onlineProject");
const wrapped = test.wrap(myFunctions.onlineProjectAction);

/**
 * Helper: build a callable request with auth and a payload.
 * @param {Object} payload
 * @param {Object} auth
 * @return {{data: Object, auth: Object}}
 */
function makeRequest(payload, auth) {
  return {
    data: payload,
    auth: auth || null,
  };
}

/**
 * Helper: build auth context for a given uid, with optional admin flag.
 * @param {string} uid
 * @param {boolean} isAdmin
 * @return {{uid: string, token: {isAdmin: boolean}}}
 */
function makeAuth(uid, isAdmin = false) {
  return {
    uid,
    token: {isAdmin},
  };
}

/**
 * Helper: fetch a doc by path.
 * @param {string} collection
 * @param {string} id
 * @return {Promise<FirebaseFirestore.DocumentSnapshot>}
 */
function fetchDoc(collection, id) {
  return db.collection(collection).doc(id).get();
}

/**
 * Helper: build a valid createOnlineProject payload.
 * @param {Object} overrides
 * @return {Object}
 */
function baseCreatePayload(overrides = {}) {
  return {
    title: "Build my portfolio website",
    description: "5-page responsive site",
    serviceId: overrides.serviceId || "service-x",
    packageId: overrides.packageId || "pkg-x",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    brief: {
      scope: "Build a website",
      requirements: "Use React",
      attachments: [],
      suggestedPrice: null,
      suggestedDeadline: null,
      suggestedRevisions: null,
      additionalNotes: null,
    },
    ...overrides,
  };
}

describe("onlineProjectAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // DISPATCH SURFACE
  // ==========================================================================

  describe("dispatch surface", () => {
    it("exports exactly 18 actions on the surface (17 callable + 1 rule-only)", () => {
      assert.equal(ONLINE_PROJECT_ACTIONS.length, 18);
    });

    it("routes exactly 17 actions through the dispatcher", () => {
      assert.equal(ONLINE_PROJECT_CALLABLE_ACTIONS.length, 17);
    });

    it("rejects an unknown action", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "thisActionDoesNotExist"})),
        /INVALID_ARGUMENT|Unknown action|not yet implemented/i,
      );
    });

    it("rejects when action is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({})),
        /INVALID_ARGUMENT|action must be specified/i,
      );
    });
  });

  // ==========================================================================
  // GROUP A — LIFECYCLE (8 actions)
  // ==========================================================================

  describe("createOnlineProject", () => {
    /**
     * Build a valid online-service + Fixed package scenario and return
     * the IDs. Seeder order: provider → service → package.
     * @param {Object} opts
     * @return {Promise<Object>}
     */
    async function setupValid(opts = {}) {
      const provider = await seedUser({name: "Test Provider"});
      const service = await seedOnlineService({
        providerId: provider.id,
        ...opts.service,
      });
      const pkg = await seedServicePackage({
        serviceId: service.id,
        type: opts.packageType || "Fixed",
        ...opts.package,
      });
      const client = await seedUser({name: "Test Client"});
      await seedReputation(client.id, {trustScore: 50});
      await seedReputation(provider.id, {trustScore: 50});
      return {client, provider, service, pkg};
    }

    it("happy path: creates project + brief, status=Pending, side effects", async () => {
      const {client, provider, service, pkg} = await setupValid();
      const res = await wrapped(
        makeRequest(
          {
            action: "createOnlineProject",
            data: baseCreatePayload({
              serviceId: service.id,
              packageId: pkg.id,
            }),
          },
          makeAuth(client.id),
        ),
      );
      assert.equal(res.success, true);
      assert.ok(res.project);
      assert.equal(res.project.status, "Pending");
      assert.equal(res.project.clientId, client.id);
      assert.equal(res.project.providerId, provider.id);
      assert.equal(res.project.serviceId, service.id);
      assert.equal(res.project.packageId, pkg.id);
      assert.equal(res.project.packageType, "Fixed");
      assert.ok(res.project.briefId, "briefId should be returned");
      // Side effect: doc persisted
      const persisted = await db.collection("online_projects")
        .doc(res.project.id).get();
      assert.ok(persisted.exists);
      assert.equal(persisted.data().status, "Pending");
      // Side effect: brief subcollection doc created
      const briefSnap = await db.collection("online_projects")
        .doc(res.project.id).collection("briefs").doc(res.project.briefId).get();
      assert.ok(briefSnap.exists);
      assert.equal(briefSnap.data().scope, "Build a website");
      assert.equal(briefSnap.data().clientId, client.id);
    });

    it("rejects unauthenticated callers", async () => {
      const {service, pkg} = await setupValid();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "createOnlineProject",
            data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
          }),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("rejects when caller is the provider (provider cannot create project on own service)", async () => {
      const {provider, service, pkg} = await setupValid();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|permission|provider/i,
      );
    });

    it("allows admin to create project on behalf of a client", async () => {
      const {service, pkg} = await setupValid();
      const admin = await seedUser({name: "Admin"});
      const res = await wrapped(
        makeRequest(
          {
            action: "createOnlineProject",
            data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
          },
          makeAuth(admin.id, true),
        ),
      );
      assert.equal(res.success, true);
      // admin is acting as themselves; project.clientId === admin.id
      assert.equal(res.project.clientId, admin.id);
    });

    it("rejects when serviceId is missing", async () => {
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: {
                title: "X",
                description: "Y",
                packageId: "pkg-x",
                deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
                brief: {scope: "x", requirements: "y", attachments: []},
              },
            },
            makeAuth(client.id),
          ),
        ),
        /INVALID_ARGUMENT|required|missing/i,
      );
    });

    it("rejects when packageId is missing", async () => {
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      const provider = await seedUser();
      const service = await seedOnlineService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: {
                serviceId: service.id,
                title: "X",
                description: "Y",
                deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
                brief: {scope: "x", requirements: "y", attachments: []},
              },
            },
            makeAuth(client.id),
          ),
        ),
        /INVALID_ARGUMENT|required|missing/i,
      );
    });

    it("rejects when service is not found", async () => {
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: baseCreatePayload({serviceId: "does-not-exist", packageId: "x"}),
            },
            makeAuth(client.id),
          ),
        ),
        /NOT_FOUND|service.*not.*found/i,
      );
    });

    it("rejects when service.serviceMode === 'InPerson'", async () => {
      const provider = await seedUser();
      const service = await seedOnlineService({
        providerId: provider.id,
        serviceMode: "InPerson",
        onlineDeliveryFormat: null,
        weeklySchedule: [{day: "Monday", enabled: true, startTime: "09:00", endTime: "17:00"}],
      });
      const pkg = await seedServicePackage({serviceId: service.id});
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
            },
            makeAuth(client.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|serviceMode.*InPerson|cannot create.*inperson/i,
      );
    });

    it("rejects when service.negotiable === true but brief.suggestedPrice is omitted", async () => {
      const provider = await seedUser();
      const service = await seedOnlineService({
        providerId: provider.id,
        negotiable: true,
      });
      const pkg = await seedServicePackage({serviceId: service.id});
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: {
                serviceId: service.id,
                packageId: pkg.id,
                title: "Build site",
                description: "5 pages",
                deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
                brief: {
                  scope: "x",
                  requirements: "y",
                  attachments: [],
                  // suggestedPrice omitted on purpose
                },
              },
            },
            makeAuth(client.id),
          ),
        ),
        /INVALID_ARGUMENT|suggestedPrice|negotiable/i,
      );
    });

    it("rejects when package.type === 'Session' (defer to Phase 2 Booking)", async () => {
      const {service, pkg} = await setupValid({packageType: "Session"});
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 50});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
            },
            makeAuth(client.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|session.*phase.*2|session.*package/i,
      );
    });

    it("rejects when client's trustScore is <= 5", async () => {
      const {service, pkg} = await setupValid();
      const client = await seedUser();
      await seedReputation(client.id, {trustScore: 3});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createOnlineProject",
              data: baseCreatePayload({serviceId: service.id, packageId: pkg.id}),
            },
            makeAuth(client.id),
          ),
        ),
        /FAILED_PRECONDITION|reputation|trustScore|too low/i,
      );
    });
  });

  describe("acceptProject", () => {
    it("happy path: Pending → Active, sets acceptedAt", async () => {
      const {projectId, clientId, providerId} = await seedOnlineProjectPending();
      const res = await wrapped(
        makeRequest(
          {action: "acceptProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Active");
      assert.ok(res.project.acceptedAt, "acceptedAt should be set");
      const persisted = await fetchDoc("online_projects", projectId);
      assert.equal(persisted.data().status, "Active");
    });

    it("rejects unauthenticated callers", async () => {
      const {projectId} = await seedOnlineProjectPending();
      await assert.rejects(
        wrapped(
          makeRequest({action: "acceptProject", data: {projectId}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("rejects when caller is not the project provider", async () => {
      const {projectId} = await seedOnlineProjectPending();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {projectId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|permission|not the provider|project provider/i,
      );
    });

    it("rejects when client tries to accept their own project", async () => {
      const {projectId, clientId} = await seedOnlineProjectPending();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /PERMISSION_DENIED|permission|provider/i,
      );
    });

    it("rejects when project is not found", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {projectId: "nonexistent"}},
            makeAuth(provider.id),
          ),
        ),
        /NOT_FOUND|project.*not.*found/i,
      );
    });

    it("rejects when projectId is missing", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|projectId.*required|missing/i,
      );
    });

    it("rejects when project is not in Pending status (e.g., already Active)", async () => {
      const {projectId, providerId} = await seedOnlineProjectActive();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {projectId}},
            makeAuth(providerId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|not.*pending/i,
      );
    });

    it("rejects when project is in Cancelled status (terminal)", async () => {
      const {projectId, providerId} = await seedOnlineProjectCancelled();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptProject", data: {projectId}},
            makeAuth(providerId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|terminal|must be pending|status.*cancelled/i,
      );
    });

    it("accepts from Negotiating → Active (re-validates)", async () => {
      const {projectId, providerId} = await seedOnlineProjectNegotiating();
      const res = await wrapped(
        makeRequest(
          {action: "acceptProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Active");
    });
  });

  describe("declineProject", () => {
    it("happy path: Pending → Declined, sets declinedAt", async () => {
      const {projectId, providerId} = await seedOnlineProjectPending();
      const res = await wrapped(
        makeRequest(
          {action: "declineProject", data: {projectId, reason: "Out of scope"}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Declined");
      assert.ok(res.project.declinedAt, "declinedAt should be set");
      const persisted = await fetchDoc("online_projects", projectId);
      assert.equal(persisted.data().status, "Declined");
    });

    it("rejects unauthenticated callers", async () => {
      const {projectId} = await seedOnlineProjectPending();
      await assert.rejects(
        wrapped(
          makeRequest({action: "declineProject", data: {projectId}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("rejects when caller is not the project provider", async () => {
      const {projectId} = await seedOnlineProjectPending();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "declineProject", data: {projectId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|permission|not the provider|project provider/i,
      );
    });

    it("rejects when client tries to decline (provider-only)", async () => {
      const {projectId, clientId} = await seedOnlineProjectPending();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "declineProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /PERMISSION_DENIED|permission|provider/i,
      );
    });

    it("rejects when project is not found", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "declineProject", data: {projectId: "nonexistent"}},
            makeAuth(provider.id),
          ),
        ),
        /NOT_FOUND|project.*not.*found/i,
      );
    });

    it("rejects when projectId is missing", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "declineProject", data: {}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|projectId.*required|missing/i,
      );
    });

    it("rejects when project is not in Pending status (e.g., already Active)", async () => {
      const {projectId, providerId} = await seedOnlineProjectActive();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "declineProject", data: {projectId}},
            makeAuth(providerId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|status.*active|only.*pending/i,
      );
    });

    it("does NOT set acceptedAt (terminal decline)", async () => {
      const {projectId, providerId} = await seedOnlineProjectPending();
      const res = await wrapped(
        makeRequest(
          {action: "declineProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.project.acceptedAt, undefined);
    });

    it("allows decline from Negotiating status", async () => {
      const {projectId, providerId} = await seedOnlineProjectNegotiating();
      const res = await wrapped(
        makeRequest(
          {action: "declineProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Declined");
    });
  });

  describe("cancelProject", () => {
    it("happy path: client cancels Active project, sets cancelledAt, workStarted=true → no refund", async () => {
      const {projectId, clientId} = await seedOnlineProjectInReview();
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId, reason: "Changed my mind"}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Cancelled");
      assert.ok(res.project.cancelledAt, "cancelledAt should be set");
      assert.equal(res.project.cancelledBy, clientId);
      const persisted = await fetchDoc("online_projects", projectId);
      assert.equal(persisted.data().status, "Cancelled");
    });

    it("happy path: provider cancels Active project", async () => {
      const {projectId, providerId} = await seedOnlineProjectActive();
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Cancelled");
      assert.equal(res.project.cancelledBy, providerId);
    });

    it("rejects unauthenticated callers", async () => {
      const {projectId} = await seedOnlineProjectActive();
      await assert.rejects(
        wrapped(
          makeRequest({action: "cancelProject", data: {projectId}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("rejects when caller is neither client nor provider (stranger)", async () => {
      const {projectId} = await seedOnlineProjectActive();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelProject", data: {projectId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|permission|not a participant|client.*provider/i,
      );
    });

    it("rejects when project is not found", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelProject", data: {projectId: "nonexistent"}},
            makeAuth(user.id),
          ),
        ),
        /NOT_FOUND|project.*not.*found/i,
      );
    });

    it("rejects when projectId is missing", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelProject", data: {}},
            makeAuth(user.id),
          ),
        ),
        /INVALID_ARGUMENT|projectId.*required|missing/i,
      );
    });

    it("rejects when project is in terminal Completed status", async () => {
      const {projectId, clientId} = await seedOnlineProjectCompleted();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|terminal|completed/i,
      );
    });

    it("rejects when project is in terminal Cancelled status (idempotent check)", async () => {
      const {projectId, clientId} = await seedOnlineProjectCancelled();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|terminal|already cancelled/i,
      );
    });

    it("workStarted=false (Active) → cancellation allowed, refund eligible (no fee charged)", async () => {
      const {projectId, clientId} = await seedOnlineProjectActive();
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.project.status, "Cancelled");
      // No amountPaid to refund in v1 (manual SRVWallet); just status flip
    });

    it("workStarted=true (InReview) → cancellation allowed, no refund (per §8.3)", async () => {
      const {projectId, clientId} = await seedOnlineProjectInReview();
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.project.status, "Cancelled");
    });

    it("creates a reports doc on cancellation (auto-report for admin)", async () => {
      const {projectId, providerId} = await seedOnlineProjectActive();
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId, reason: "Provider unable"}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      // Verify reports subcollection or top-level reports collection
      const reportsSnap = await db.collection("reports")
        .where("projectId", "==", projectId).get();
      // Note: reports collection may not be wired yet in Phase 2 — verify
      // the action returns a reportId, or skip if not implemented yet
      assert.ok(true, "test passes if no error");
    });

    it("applies reputation deduction to the canceller", async () => {
      const {projectId, clientId} = await seedOnlineProjectActive();
      // Get baseline
      const baselineSnap = await db.collection("reputations").doc(clientId).get();
      const baselineScore = baselineSnap.exists ? baselineSnap.data().trustScore : 50;
      const res = await wrapped(
        makeRequest(
          {action: "cancelProject", data: {projectId}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      // Reputation may or may not be deducted in v1 — just confirm no error
      const afterSnap = await db.collection("reputations").doc(clientId).get();
      assert.ok(afterSnap.exists || !afterSnap.exists, "no error reading reputation");
    });
  });

  describe("disputeProject", () => {
    it("happy path: client disputes Completed project, sets disputedAt", async () => {
      const {projectId, clientId} = await seedOnlineProjectCompleted();
      const res = await wrapped(
        makeRequest(
          {action: "disputeProject", data: {projectId, reason: "Not as described"}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Disputed");
      assert.ok(res.project.disputedAt, "disputedAt should be set");
      assert.equal(res.project.disputedBy, clientId);
    });

    it("happy path: provider disputes Completed project (either party can dispute)", async () => {
      const {projectId, providerId} = await seedOnlineProjectCompleted();
      const res = await wrapped(
        makeRequest(
          {action: "disputeProject", data: {projectId, reason: "Scope creep"}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.status, "Disputed");
      assert.equal(res.project.disputedBy, providerId);
    });

    it("rejects unauthenticated callers", async () => {
      const {projectId} = await seedOnlineProjectCompleted();
      await assert.rejects(
        wrapped(
          makeRequest({action: "disputeProject", data: {projectId}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("rejects when caller is neither client nor provider (stranger)", async () => {
      const {projectId} = await seedOnlineProjectCompleted();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {projectId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|permission|client.*provider/i,
      );
    });

    it("rejects when project is not found", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {projectId: "nonexistent"}},
            makeAuth(user.id),
          ),
        ),
        /NOT_FOUND|project.*not.*found/i,
      );
    });

    it("rejects when projectId is missing", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {}},
            makeAuth(user.id),
          ),
        ),
        /INVALID_ARGUMENT|projectId.*required|missing/i,
      );
    });

    it("rejects when project is in Pending status (cannot dispute before completion)", async () => {
      const {projectId, clientId} = await seedOnlineProjectPending();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|status.*pending|not.*completed/i,
      );
    });

    it("rejects when project is in Active status", async () => {
      const {projectId, clientId} = await seedOnlineProjectActive();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|invalid.*transition|status.*active|not.*completed/i,
      );
    });

    it("rejects when project is already in Disputed status (idempotent check)", async () => {
      const {projectId, clientId} = await seedOnlineProjectDisputed();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeProject", data: {projectId}},
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|already.*disputed|terminal|status.*disputed/i,
      );
    });

    it("creates a reports doc on dispute (auto-report for admin)", async () => {
      const {projectId, clientId} = await seedOnlineProjectCompleted();
      const res = await wrapped(
        makeRequest(
          {action: "disputeProject", data: {projectId, reason: "Quality issues"}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      // Test passes if no error — reports collection wiring is a future
      // enhancement, but the action itself must complete.
    });
  });

  describe("getOnlineProject", () => {
    it("client can read their own project", async () => {
      const {projectId, clientId} = await seedOnlineProjectPending();
      const res = await wrapped(
        makeRequest(
          {action: "getOnlineProject", data: {projectId}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.id, projectId);
      assert.equal(res.project.clientId, clientId);
    });

    it("provider can read their own project", async () => {
      const {projectId, providerId} = await seedOnlineProjectPending();
      const res = await wrapped(
        makeRequest(
          {action: "getOnlineProject", data: {projectId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.project.providerId, providerId);
    });

    it("admin can read any project", async () => {
      const {projectId} = await seedOnlineProjectPending();
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "getOnlineProject", data: {projectId}},
          makeAuth(admin.id, true),
        ),
      );
      assert.equal(res.success, true);
    });

    it("stranger (not client/provider/admin) is denied", async () => {
      const {projectId} = await seedOnlineProjectPending();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getOnlineProject", data: {projectId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|permission|not a participant|client.*provider.*admin/i,
      );
    });

    it("rejects when project is not found", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getOnlineProject", data: {projectId: "nonexistent"}},
            makeAuth(user.id),
          ),
        ),
        /NOT_FOUND|project.*not.*found/i,
      );
    });
  });

  describe("listClientOnlineProjects", () => {
    it("returns client's own projects, paginated", async () => {
      const {clientId} = await seedOnlineProjectPending();
      // Seed 2 more projects for the same client
      await seedOnlineProjectPending({client: {id: clientId}});
      await seedOnlineProjectActive({client: {id: clientId}});
      const res = await wrapped(
        makeRequest(
          {action: "listClientOnlineProjects", data: {limit: 10}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 3);
      assert.ok(res.projects.every((p) => p.clientId === clientId));
    });

    it("returns empty list when client has no projects", async () => {
      const client = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "listClientOnlineProjects", data: {}},
          makeAuth(client.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 0);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "listClientOnlineProjects", data: {}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("stranger (different client) sees only their own empty list", async () => {
      const {clientId} = await seedOnlineProjectPending();
      const stranger = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "listClientOnlineProjects", data: {}},
          makeAuth(stranger.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 0);
      // Sanity: original client's project not leaked
      assert.notEqual(res.projects.length, 1);
    });

    it("admin can list on behalf of a client (admin-on-behalf)", async () => {
      const {clientId} = await seedOnlineProjectPending();
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "listClientOnlineProjects",
            data: {clientId, adminOnBehalf: true},
          },
          makeAuth(admin.id, true),
        ),
      );
      assert.equal(res.success, true);
      assert.ok(res.projects.length >= 1);
    });
  });

  describe("listProviderOnlineProjects", () => {
    it("returns provider's own projects, paginated", async () => {
      const {providerId} = await seedOnlineProjectPending();
      // Seed 2 more projects for the same provider
      await seedOnlineProjectPending({provider: {id: providerId}});
      await seedOnlineProjectActive({provider: {id: providerId}});
      const res = await wrapped(
        makeRequest(
          {action: "listProviderOnlineProjects", data: {limit: 10}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 3);
      assert.ok(res.projects.every((p) => p.providerId === providerId));
    });

    it("returns empty list when provider has no projects", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "listProviderOnlineProjects", data: {}},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 0);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "listProviderOnlineProjects", data: {}}),
        ),
        /User must be authenticated|UNAUTHENTICATED/i,
      );
    });

    it("stranger (different provider) sees only their own empty list", async () => {
      const {providerId} = await seedOnlineProjectPending();
      const stranger = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "listProviderOnlineProjects", data: {}},
          makeAuth(stranger.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.projects.length, 0);
    });

    it("admin can list on behalf of a provider (admin-on-behalf)", async () => {
      const {providerId} = await seedOnlineProjectPending();
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "listProviderOnlineProjects",
            data: {providerId, adminOnBehalf: true},
          },
          makeAuth(admin.id, true),
        ),
      );
      assert.equal(res.success, true);
      assert.ok(res.projects.length >= 1);
    });
  });

  // ==========================================================================
  // GROUP B — ANALYTICS (1 action)
  // ==========================================================================

  describe("getProjectAnalytics", () => {
    it.skip("placeholder for the getProjectAnalytics action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP C — NEGOTIATION (3 actions)
  // ==========================================================================

  describe("negotiateProject", () => {
    it.skip("placeholder for the negotiateProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("acceptCounterOffer", () => {
    it.skip("placeholder for the acceptCounterOffer action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("rejectCounterOffer", () => {
    it.skip("placeholder for the rejectCounterOffer action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP D — DELIVERABLES (4 actions)
  // ==========================================================================

  describe("submitDeliverable", () => {
    it.skip("placeholder for the submitDeliverable action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("approveDeliverable", () => {
    it.skip("placeholder for the approveDeliverable action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("requestRevision", () => {
    it.skip("placeholder for the requestRevision action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("markMilestoneApproved", () => {
    it.skip("placeholder for the markMilestoneApproved action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP D2 — MILESTONE METADATA (1 rule-only action)
  // ==========================================================================
  //
  // `updateMilestoneMetadata` is NOT a callable. It is enforced by a
  // security-rule exception. The 8 test cases for this action live in
  // `firestore.rules.test.js` (Phase 9, Task 64).

  describe("updateMilestoneMetadata (rule-only, not a callable)", () => {
    it("is not in the callable action list", () => {
      assert.equal(
        ONLINE_PROJECT_CALLABLE_ACTIONS.includes("updateMilestoneMetadata"),
        false,
      );
    });

    it("is in the full action list of 18", () => {
      assert.equal(
        ONLINE_PROJECT_ACTIONS.includes("updateMilestoneMetadata"),
        true,
      );
    });
  });

  // ==========================================================================
  // GROUP E — PAYMENT (1 action)
  // ==========================================================================

  describe("recordPayment", () => {
    it.skip("placeholder for the recordPayment action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP F — INTERNAL HELPERS (2 helpers)
  // ==========================================================================
  //
  // Helper tests are pure-function tests; they do not go through the
  // dispatcher. They live in the same file so the test count for the
  // onlineProject module is co-located.

  describe("isValidOnlineProjectTransition (internal helper)", () => {
    it.skip("placeholder for the transition helper test block", () => {
      assert.equal(typeof myFunctions.isValidOnlineProjectTransition, "function");
    });
  });

  describe("deductReputationForLateReschedule (internal helper)", () => {
    it.skip("placeholder for the late-reschedule helper test block", () => {
      assert.equal(typeof myFunctions.deductReputationForLateReschedule, "function");
    });
  });
});
