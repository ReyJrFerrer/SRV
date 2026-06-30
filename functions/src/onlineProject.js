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
const {getFirestore} = require("../firebase-admin");

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
 * @param {object} _request - The callable request
 * @return {Promise<object>} The created project
 */
async function createOnlineProject_onlineProject(_request) {
  throw new HttpsError("internal", "createOnlineProject not yet implemented");
}

/**
 * Provider accepts a Pending project → Active.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function acceptProject_onlineProject(_request) {
  throw new HttpsError("internal", "acceptProject not yet implemented");
}

/**
 * Provider declines a Pending project → Declined.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function declineProject_onlineProject(_request) {
  throw new HttpsError("internal", "declineProject not yet implemented");
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
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function cancelProject_onlineProject(_request) {
  throw new HttpsError("internal", "cancelProject not yet implemented");
}

/**
 * Either party disputes the project → Disputed.
 * @param {object} _request - The callable request
 * @return {Promise<object>} The updated project
 */
async function disputeProject_onlineProject(_request) {
  throw new HttpsError("internal", "disputeProject not yet implemented");
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
 * @param {object} _request - The callable request
 * @return {Promise<object>} The project document
 */
async function getOnlineProject_onlineProject(_request) {
  throw new HttpsError("internal", "getOnlineProject not yet implemented");
}

/**
 * List a client's online projects, paginated, with status filter.
 * @param {object} _request - The callable request
 * @return {Promise<object>} List of projects
 */
async function listClientOnlineProjects_onlineProject(_request) {
  throw new HttpsError("internal", "listClientOnlineProjects not yet implemented");
}

/**
 * List a provider's online projects, paginated, with status filter.
 * @param {object} _request - The callable request
 * @return {Promise<object>} List of projects
 */
async function listProviderOnlineProjects_onlineProject(_request) {
  throw new HttpsError("internal", "listProviderOnlineProjects not yet implemented");
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
