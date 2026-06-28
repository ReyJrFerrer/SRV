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

const {test, clearCollections} = require("./mocha");

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

// `makeAuth` and `fetchDoc` helpers will be added in Phase 2 when the
// first action tests land (Tasks 23+). They are intentionally not
// stubbed in the Phase 0 skeleton to keep the file lint-clean.

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
    it("placeholder for the createOnlineProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("acceptProject", () => {
    it("placeholder for the acceptProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("declineProject", () => {
    it("placeholder for the declineProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("cancelProject", () => {
    it("placeholder for the cancelProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("disputeProject", () => {
    it("placeholder for the disputeProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("getOnlineProject", () => {
    it("placeholder for the getOnlineProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("listClientOnlineProjects", () => {
    it("placeholder for the listClientOnlineProjects action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("listProviderOnlineProjects", () => {
    it("placeholder for the listProviderOnlineProjects action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP B — ANALYTICS (1 action)
  // ==========================================================================

  describe("getProjectAnalytics", () => {
    it("placeholder for the getProjectAnalytics action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP C — NEGOTIATION (3 actions)
  // ==========================================================================

  describe("negotiateProject", () => {
    it("placeholder for the negotiateProject action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("acceptCounterOffer", () => {
    it("placeholder for the acceptCounterOffer action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("rejectCounterOffer", () => {
    it("placeholder for the rejectCounterOffer action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  // ==========================================================================
  // GROUP D — DELIVERABLES (4 actions)
  // ==========================================================================

  describe("submitDeliverable", () => {
    it("placeholder for the submitDeliverable action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("approveDeliverable", () => {
    it("placeholder for the approveDeliverable action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("requestRevision", () => {
    it("placeholder for the requestRevision action block", () => {
      assert.ok(typeof myFunctions.onlineProjectAction === "object");
    });
  });

  describe("markMilestoneApproved", () => {
    it("placeholder for the markMilestoneApproved action block", () => {
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
    it("placeholder for the recordPayment action block", () => {
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
    it("placeholder for the transition helper test block", () => {
      assert.equal(typeof myFunctions.isValidOnlineProjectTransition, "function");
    });
  });

  describe("deductReputationForLateReschedule (internal helper)", () => {
    it("placeholder for the late-reschedule helper test block", () => {
      assert.equal(typeof myFunctions.deductReputationForLateReschedule, "function");
    });
  });
});
