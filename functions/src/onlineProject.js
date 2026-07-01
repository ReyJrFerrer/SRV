/**
 * Online Project Management Cloud Functions
 *
 * Consolidates all online-project-related operations into a single
 * entrypoint following the same action-dispatch pattern as
 * `bookingAction` and `serviceAction`. Handles two engagement models:
 *   - Product model: 15 services with deliverable + negotiation + revisions
 *   - Session model: 5 services + IT Support (Phase 2 — uses extended Booking)
 *
 * This is a Phase 1 skeleton. Each action handler is stubbed to throw
 * "not yet implemented" so the test suite can assert the dispatch and
 * 18-action surface area. Real implementations land in subsequent tasks.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore, FieldValue} = require("../firebase-admin");
const {checkUserReputationInternal} = require("./reputation");

/* eslint-disable-next-line no-unused-vars */
const db = getFirestore();

/**
 * OnlineProject status enum (matches `docs/OnlineService.md` §6.6).
 */
const ONLINE_PROJECT_STATUS = {
  PENDING: "Pending",
  NEGOTIATING: "Negotiating",
  ACTIVE: "Active",
  IN_REVIEW: "InReview",
  REVISIONS_REQUESTED: "RevisionsRequested",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

/**
 * ServicePackage type enum (matches `docs/OnlineService.md` §5).
 */
const SERVICE_PACKAGE_TYPE = {
  FIXED: "Fixed",
  MILESTONE: "Milestone",
  SESSION: "Session",
};

/**
 * Service mode enum (matches `docs/OnlineService.md` §4.1).
 */
const SERVICE_MODE = {
  IN_PERSON: "InPerson",
  ONLINE: "Online",
  HYBRID: "Hybrid",
};

/**
 * Online delivery format enum (matches `docs/OnlineService.md` §4.1).
 */
const ONLINE_DELIVERY_FORMAT = {
  LIVE: "live",
  ASYNC: "async",
  MIXED: "mixed",
};

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

/**
 * Generates a unique online project ID
 * @return {string} A unique project identifier
 */
function generateOnlineProjectId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `op-${timestamp}-${random}`;
}

// =============================================================================
// ACTION HANDLERS — STUBS
// =============================================================================
//
// Each handler will be implemented in the corresponding phase task.
// Until then, each stub throws HttpsError("internal") so the dispatcher
// returns a clean 500-equivalent and the test suite can assert the
// 18-action surface area.

/**
 * Creates a new online project in Pending status.
 * Per `docs/OnlineService.md` §6.7:
 *  - Validates service.serviceMode !== 'InPerson'
 *  - Validates packageType !== 'Session' (defer to Phase 2 Booking)
 *  - Validates client's trustScore > 5
 *  - Creates the project + a brief subcollection doc atomically
 *  - Dispatches PROJECT_CREATED notification to provider
 * @param {object} request - The callable request
 * @return {Promise<object>} The created project
 */
async function createOnlineProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to create an online project",
    );
  }

  const {
    serviceId,
    packageId,
    title,
    description,
    deadline,
    brief,
  } = payload;

  if (!serviceId || !packageId || !title || !description || !deadline || !brief) {
    throw new HttpsError(
      "invalid-argument",
      "Required parameters missing: serviceId, packageId, title, " +
        "description, deadline, brief",
    );
  }

  // Reputation gate: client must have trustScore > 5
  const clientReputation = await checkUserReputationInternal(authInfo.uid);
  if (!clientReputation.success || !clientReputation.data) {
    throw new HttpsError(
      "failed-precondition",
      "Unable to verify client reputation",
    );
  }
  if (clientReputation.data.trustScore <= 5) {
    throw new HttpsError(
      "failed-precondition",
      `Your reputation score (${clientReputation.data.trustScore}) is too ` +
        "low to create an online project",
    );
  }

  // Load service
  const serviceDoc = await db.collection("services").doc(serviceId).get();
  if (!serviceDoc.exists) {
    throw new HttpsError("not-found", "Service not found");
  }
  const service = serviceDoc.data();

  // Online services only
  if (service.serviceMode === "InPerson") {
    throw new HttpsError(
      "permission-denied",
      "Cannot create an online project on an InPerson service",
    );
  }

  // Provider cannot create project on own service
  if (service.providerId === authInfo.uid) {
    throw new HttpsError(
      "permission-denied",
      "Providers cannot create projects on their own services",
    );
  }

  // Load package
  const packageDoc = await db.collection("service_packages").doc(packageId).get();
  if (!packageDoc.exists) {
    throw new HttpsError("not-found", "Service package not found");
  }
  const pkg = packageDoc.data();

  if (pkg.serviceId !== serviceId) {
    throw new HttpsError(
      "permission-denied",
      "Package does not belong to the specified service",
    );
  }

  // Defer Session packages to Phase 2 Booking extension
  if (pkg.type === "Session") {
    throw new HttpsError(
      "permission-denied",
      "Session packages are not yet supported (deferred to Phase 2)",
    );
  }

  // Negotiable services require suggestedPrice
  if (service.negotiable === true) {
    if (brief.suggestedPrice === undefined || brief.suggestedPrice === null) {
      throw new HttpsError(
        "invalid-argument",
        "Negotiable services require brief.suggestedPrice",
      );
    }
  }

  // Build the project
  const projectId = generateOnlineProjectId();
  const projectRef = db.collection("online_projects").doc(projectId);
  const briefId = `brief-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const briefRef = projectRef.collection("briefs").doc(briefId);
  const now = new Date().toISOString();

  const newProject = {
    id: projectId,
    clientId: authInfo.uid,
    providerId: service.providerId,
    serviceId,
    serviceName: service.title,
    serviceCategory: service.category,
    packageId,
    packageType: pkg.type,
    packageSnapshot: {
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      type: pkg.type,
      typeFields: pkg.type === "Milestone" ? {milestones: pkg.milestones} : {},
    },
    title,
    description,
    price: brief.suggestedPrice || pkg.price,
    deadline,
    milestones: pkg.type === "Milestone" && pkg.milestones ?
      pkg.milestones.map((m) => ({
        id: `ms-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        title: m.title,
        description: m.description,
        dueDate: new Date(Date.now() + m.dueDateOffsetDays * 86400000).toISOString(),
        percentage: m.percentage,
        status: "Pending",
        submittedAt: null,
        approvedAt: null,
      })) : [],
    briefId,
    status: "Pending",
    revisionsRemaining: 3,
    workStarted: false,
    conversationId: null,
    amountPaid: 0,
    paymentStatus: "PENDING",
    paymentMethod: "SRVWallet",
    paymentId: null,
    createdAt: now,
    updatedAt: now,
  };

  const newBrief = {
    id: briefId,
    projectId,
    clientId: authInfo.uid,
    scope: brief.scope || "",
    requirements: brief.requirements || "",
    attachments: brief.attachments || [],
    suggestedPrice: brief.suggestedPrice || null,
    suggestedDeadline: brief.suggestedDeadline || null,
    suggestedRevisions: brief.suggestedRevisions || null,
    additionalNotes: brief.additionalNotes || null,
    createdAt: now,
    updatedAt: now,
  };

  // Atomic write of project + brief
  await db.runTransaction(async (tx) => {
    tx.set(projectRef, newProject);
    tx.set(briefRef, newBrief);
  });

  return {
    success: true,
    project: newProject,
    brief: newBrief,
  };
}

/**
 * Provider accepts a Pending project → Active.
 * Per `docs/OnlineService.md` §6.6: Pending → [Active, Negotiating, Declined]
 *                                       Negotiating → [Active, Declined, Cancelled]
 * Sets `acceptedAt` timestamp. Does NOT create conversation (client-side
 * after accept, matches the booking pattern).
 * @param {object} request - The callable request
 * @return {Promise<object>} The updated project
 */
async function acceptProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to accept a project",
    );
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError(
      "invalid-argument",
      "projectId is required",
    );
  }

  const projectRef = db.collection("online_projects").doc(projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const project = projectDoc.data();

  if (project.providerId !== authInfo.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the project provider can accept the project",
    );
  }

  // State machine: Pending or Negotiating → Active
  if (!["Pending", "Negotiating"].includes(project.status)) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot accept a project in status ${project.status} (must be Pending or Negotiating)`,
    );
  }

  const now = new Date().toISOString();
  const update = {
    status: "Active",
    acceptedAt: now,
    updatedAt: now,
  };

  await projectRef.update(update);

  return {
    success: true,
    project: {...project, ...update},
  };
}

/**
 * Provider declines a Pending project → Declined.
 * Per `docs/OnlineService.md` §6.6: Pending → [Active, Negotiating, Declined]
 *                                          Negotiating → [Active, Declined, Cancelled]
 * Sets `declinedAt` timestamp. Does NOT set `acceptedAt` (terminal).
 * @param {object} request - The callable request
 * @return {Promise<object>} The updated project
 */
async function declineProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to decline a project",
    );
  }

  const {projectId, reason} = payload;
  if (!projectId) {
    throw new HttpsError(
      "invalid-argument",
      "projectId is required",
    );
  }

  const projectRef = db.collection("online_projects").doc(projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const project = projectDoc.data();

  if (project.providerId !== authInfo.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the project provider can decline the project",
    );
  }

  if (!["Pending", "Negotiating"].includes(project.status)) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot decline a project in status ${project.status} (only Pending or Negotiating)`,
    );
  }

  const now = new Date().toISOString();
  const update = {
    status: "Declined",
    declinedAt: now,
    updatedAt: now,
  };
  if (reason) update.declineReason = reason;

  await projectRef.update(update);

  return {
    success: true,
    project: {...project, ...update},
  };
}

/**
 * Counter-offer written to negotiations subcollection; status → Negotiating.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The negotiation offer
 */
async function negotiateProject_onlineProject(_request) {
  throw new HttpsError("internal", "negotiateProject not yet implemented");
}

/**
 * Client or provider accepts the latest counter-offer → Active.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function acceptCounterOffer_onlineProject(_request) {
  throw new HttpsError("internal", "acceptCounterOffer not yet implemented");
}

/**
 * Reject a counter-offer → Declined or stay Negotiating.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function rejectCounterOffer_onlineProject(_request) {
  throw new HttpsError("internal", "rejectCounterOffer not yet implemented");
}

/**
 * Provider submits a deliverable → InReview.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The deliverable
 */
async function submitDeliverable_onlineProject(_request) {
  throw new HttpsError("internal", "submitDeliverable not yet implemented");
}

/**
 * Client approves deliverable(s); all milestones approved → Completed.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function approveDeliverable_onlineProject(_request) {
  throw new HttpsError("internal", "approveDeliverable not yet implemented");
}

/**
 * Client requests a revision → RevisionsRequested.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function requestRevision_onlineProject(_request) {
  throw new HttpsError("internal", "requestRevision not yet implemented");
}

/**
 * Either party cancels the project → Cancelled.
 * Per `docs/OnlineService.md` §6.6: cancel transitions from any
 * non-terminal status to Cancelled. Refund eligibility per §8.3:
 *  - workStarted=false (Active before any deliverable) → full refund (no payment in v1)
 *  - workStarted=true (InReview/RevisionsRequested) → no refund
 * @param {object} request - The callable request
 * @return {Promise<object>} The updated project
 */
async function cancelProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to cancel a project",
    );
  }

  const {projectId, reason} = payload;
  if (!projectId) {
    throw new HttpsError(
      "invalid-argument",
      "projectId is required",
    );
  }

  const projectRef = db.collection("online_projects").doc(projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const project = projectDoc.data();

  // Caller must be either client or provider
  if (project.clientId !== authInfo.uid &&
      project.providerId !== authInfo.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the client or provider can cancel the project",
    );
  }

  // Cannot cancel from terminal statuses
  const terminalStatuses = ["Cancelled", "Declined", "Completed", "Disputed"];
  if (terminalStatuses.includes(project.status)) {
    throw new HttpsError(
      "failed-precondition",
      `Cannot cancel a project in terminal status ${project.status}`,
    );
  }

  const now = new Date().toISOString();
  const update = {
    status: "Cancelled",
    cancelledAt: now,
    cancelledBy: authInfo.uid,
    updatedAt: now,
  };
  if (reason) update.cancelReason = reason;

  await projectRef.update(update);

  return {
    success: true,
    project: {...project, ...update},
  };
}

/**
 * Either party disputes the project → Disputed.
 * Per `docs/OnlineService.md` §6.6: Completed → Disputed is the only
 * transition into Disputed. Either client or provider can dispute a
 * Completed project.
 * @param {object} request - The callable request
 * @return {Promise<object>} The updated project
 */
async function disputeProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to dispute a project",
    );
  }

  const {projectId, reason} = payload;
  if (!projectId) {
    throw new HttpsError(
      "invalid-argument",
      "projectId is required",
    );
  }

  const projectRef = db.collection("online_projects").doc(projectId);
  const projectDoc = await projectRef.get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const project = projectDoc.data();

  if (project.clientId !== authInfo.uid &&
      project.providerId !== authInfo.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the client or provider can dispute the project",
    );
  }

  // Per spec §6.6: only Completed → Disputed
  if (project.status !== "Completed") {
    throw new HttpsError(
      "failed-precondition",
      `Cannot dispute a project in status ${project.status} (only Completed can be disputed)`,
    );
  }

  const now = new Date().toISOString();
  const update = {
    status: "Disputed",
    disputedAt: now,
    disputedBy: authInfo.uid,
    updatedAt: now,
  };
  if (reason) update.disputeReason = reason;

  await projectRef.update(update);

  return {
    success: true,
    project: {...project, ...update},
  };
}

/**
 * Updates amountPaid and paymentStatus.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function recordPayment_onlineProject(_request) {
  throw new HttpsError("internal", "recordPayment not yet implemented");
}

/**
 * Client approves a single milestone.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated milestone
 */
async function markMilestoneApproved_onlineProject(_request) {
  throw new HttpsError("internal", "markMilestoneApproved not yet implemented");
}

/**
 * Read a single online project.
 * Per `docs/OnlineService.md` §6.7: callable for non-participant reads
 * is restricted — only the client, provider, or admin can read.
 * @param {object} request - The callable request
 * @return {Promise<object>} The project document
 */
async function getOnlineProject_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to read a project",
    );
  }

  const {projectId} = payload;
  if (!projectId) {
    throw new HttpsError(
      "invalid-argument",
      "projectId is required",
    );
  }

  const projectDoc = await db.collection("online_projects").doc(projectId).get();
  if (!projectDoc.exists) {
    throw new HttpsError("not-found", "Project not found");
  }
  const project = projectDoc.data();

  if (project.clientId !== authInfo.uid &&
      project.providerId !== authInfo.uid &&
      !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only the client, provider, or admin can read this project",
    );
  }

  return {
    success: true,
    project: {id: projectDoc.id, ...project},
  };
}

/**
 * List a client's online projects, paginated, with status filter.
 * Per `docs/OnlineService.md` §6.7: returns projects where clientId == uid.
 * Admins can list on behalf of any client via adminOnBehalf flag.
 * @param {object} request - The callable request
 * @return {Promise<object>} List of projects + next cursor
 */
async function listClientOnlineProjects_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to list projects",
    );
  }

  const {limit, status, clientId: queryClientId, adminOnBehalf} = payload;
  const pageLimit = Math.min(limit || 20, 100);

  // Determine which clientId to query
  let targetClientId = authInfo.uid;
  if (adminOnBehalf === true && authInfo.isAdmin && queryClientId) {
    targetClientId = queryClientId;
  }

  let query = db.collection("online_projects")
    .where("clientId", "==", targetClientId);
  if (status) {
    query = query.where("status", "==", status);
  }
  query = query.orderBy("updatedAt", "desc").limit(pageLimit);

  const snapshot = await query.get();
  const projects = [];
  snapshot.forEach((doc) => {
    projects.push({id: doc.id, ...doc.data()});
  });

  return {
    success: true,
    projects,
    count: projects.length,
  };
}

/**
 * List a provider's online projects, paginated, with status filter.
 * Per `docs/OnlineService.md` §6.7: returns projects where providerId == uid.
 * Admins can list on behalf of any provider via adminOnBehalf flag.
 * @param {object} request - The callable request
 * @return {Promise<object>} List of projects + count
 */
async function listProviderOnlineProjects_onlineProject(request) {
  const data = request.data || {};
  const payload = data.data || data;
  const context = {auth: request.auth};
  const authInfo = getAuthInfo(context, data);

  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to list projects",
    );
  }

  const {limit, status, providerId: queryProviderId, adminOnBehalf} = payload;
  const pageLimit = Math.min(limit || 20, 100);

  let targetProviderId = authInfo.uid;
  if (adminOnBehalf === true && authInfo.isAdmin && queryProviderId) {
    targetProviderId = queryProviderId;
  }

  let query = db.collection("online_projects")
    .where("providerId", "==", targetProviderId);
  if (status) {
    query = query.where("status", "==", status);
  }
  query = query.orderBy("updatedAt", "desc").limit(pageLimit);

  const snapshot = await query.get();
  const projects = [];
  snapshot.forEach((doc) => {
    projects.push({id: doc.id, ...doc.data()});
  });

  return {
    success: true,
    projects,
    count: projects.length,
  };
}

/**
 * Provider analytics: total, by status, revenue, average completion time.
 * @param {object} _request - The callable request
 * @return {Promise<object>} Analytics summary
 */
async function getProjectAnalytics_onlineProject(_request) {
  throw new HttpsError("internal", "getProjectAnalytics not yet implemented");
}

// =============================================================================
// INTERNAL HELPERS — STUBS
// =============================================================================
//
// These will be tested directly in the same file as the dispatch tests
// once their full implementations land.

/**
 * Validates a status transition for an OnlineProject.
 * State machine per `docs/OnlineService.md` §6.6.
 * @param {string} _currentStatus - The current status
 * @param {string} _newStatus - The proposed new status
 */
function isValidOnlineProjectTransition(_currentStatus, _newStatus) {
  throw new HttpsError("internal", "isValidOnlineProjectTransition not yet implemented");
}

/**
 * Deducts reputation points for a late session reschedule.
 * Phase 2 helper; tested now for direct unit-testability.
 * @param {string} _userId - The user whose reputation to deduct
 * @param {string} _reschedulerRole - "client" or "provider"
 * @return {Promise<number>} The new trust score
 */
async function deductReputationForLateReschedule(_userId, _reschedulerRole) {
  throw new HttpsError("internal", "deductReputationForLateReschedule not yet implemented");
}

// =============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// =============================================================================

/**
 * Action names recognized by `onlineProjectAction` (17 callable dispatchers)
 * plus `updateMilestoneMetadata` which is a direct Firestore write
 * governed by a security-rule exception (not a callable). Together
 * these form the 18-action surface listed in `docs/OnlineService.md`
 * §6.7. Exported for use in tests and other modules.
 */
const ONLINE_PROJECT_ACTIONS = [
  "createOnlineProject",
  "acceptProject",
  "declineProject",
  "negotiateProject",
  "acceptCounterOffer",
  "rejectCounterOffer",
  "submitDeliverable",
  "approveDeliverable",
  "requestRevision",
  "cancelProject",
  "disputeProject",
  "recordPayment",
  "markMilestoneApproved",
  "updateMilestoneMetadata", // rule-only, not dispatched
  "getOnlineProject",
  "listClientOnlineProjects",
  "listProviderOnlineProjects",
  "getProjectAnalytics",
];

/**
 * The subset of `ONLINE_PROJECT_ACTIONS` that route through the
 * `onlineProjectAction` dispatcher. `updateMilestoneMetadata` is
 * intentionally excluded — it is enforced by a security-rule
 * exception, not a callable.
 */
const ONLINE_PROJECT_CALLABLE_ACTIONS = ONLINE_PROJECT_ACTIONS.filter(
  (a) => a !== "updateMilestoneMetadata",
);

/**
 * Single action-dispatch Cloud Function for all online-project operations.
 * 18 actions per `docs/OnlineService.md` §6.7.
 */
exports.onlineProjectAction = onCall(
  {
    memory: "256MiB",
  },
  async (request) => {
    const {action} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "createOnlineProject":
        return await createOnlineProject_onlineProject(request);
      case "acceptProject":
        return await acceptProject_onlineProject(request);
      case "declineProject":
        return await declineProject_onlineProject(request);
      case "negotiateProject":
        return await negotiateProject_onlineProject(request);
      case "acceptCounterOffer":
        return await acceptCounterOffer_onlineProject(request);
      case "rejectCounterOffer":
        return await rejectCounterOffer_onlineProject(request);
      case "submitDeliverable":
        return await submitDeliverable_onlineProject(request);
      case "approveDeliverable":
        return await approveDeliverable_onlineProject(request);
      case "requestRevision":
        return await requestRevision_onlineProject(request);
      case "cancelProject":
        return await cancelProject_onlineProject(request);
      case "disputeProject":
        return await disputeProject_onlineProject(request);
      case "recordPayment":
        return await recordPayment_onlineProject(request);
      case "markMilestoneApproved":
        return await markMilestoneApproved_onlineProject(request);
      case "getOnlineProject":
        return await getOnlineProject_onlineProject(request);
      case "listClientOnlineProjects":
        return await listClientOnlineProjects_onlineProject(request);
      case "listProviderOnlineProjects":
        return await listProviderOnlineProjects_onlineProject(request);
      case "getProjectAnalytics":
        return await getProjectAnalytics_onlineProject(request);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  },
);

exports.ONLINE_PROJECT_ACTIONS = ONLINE_PROJECT_ACTIONS;
exports.ONLINE_PROJECT_CALLABLE_ACTIONS = ONLINE_PROJECT_CALLABLE_ACTIONS;
exports.ONLINE_PROJECT_STATUS = ONLINE_PROJECT_STATUS;
exports.SERVICE_PACKAGE_TYPE = SERVICE_PACKAGE_TYPE;
exports.SERVICE_MODE = SERVICE_MODE;
exports.ONLINE_DELIVERY_FORMAT = ONLINE_DELIVERY_FORMAT;
exports.getAuthInfo = getAuthInfo;
exports.generateOnlineProjectId = generateOnlineProjectId;
exports.isValidOnlineProjectTransition = isValidOnlineProjectTransition;
exports.deductReputationForLateReschedule = deductReputationForLateReschedule;
