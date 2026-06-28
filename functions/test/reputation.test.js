/**
 * Integration tests for functions/src/reputation.js — 7 action cases
 * routed through the `reputationAction` callable.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Each action is tested with:
 *   - Happy path: correct response + side effects
 *   - Auth errors: permission-denied for admin-only actions
 *   - Validation errors: missing/invalid args
 *   - State-machine errors: already-flagged guards
 *
 * Side-effect assertions verify that reputation docs and history
 * subcollections are persisted in Firestore.
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {seedUser, seedReputation, seedBaseEntities, uniqueId} = require("./helpers/seed");

const myFunctions = require("../src/reputation");
const {
  BASE_SCORE,
  CANCELLATION_PENALTY,
  determineTrustLevel,
} = require("../src/utils/reputationMath");
const wrapped = test.wrap(myFunctions.reputationAction);

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
 * Helper: fetch a doc by ID. Asserts it exists.
 * @param {string} collection
 * @param {string} docId
 * @return {Promise<Object>}
 */
async function fetchDoc(collection, docId) {
  const snap = await db.collection(collection).doc(docId).get();
  assert.equal(snap.exists, true, `Expected doc ${collection}/${docId} to exist`);
  return snap.data();
}

/**
 * Create a completed booking and seed all required entities.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedCompletedBookingWithEntities(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-rep-${uniqueId()}`;
  const completedDate = new Date().toISOString();
  const booking = {
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Completed",
    requestedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    startedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    completedDate,
    price: 500,
    amountPaid: 500,
    paymentMethod: "GCash",
    paymentId: `pay-${uniqueId()}`,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: completedDate,
  };
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

describe("reputationAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // 1. initializeReputation
  // ==========================================================================
  describe("initializeReputation", () => {
    it("creates a reputation doc with BASE_SCORE for a new user", async () => {
      const userId = `user-${uniqueId()}`;
      const res = await wrapped(
        makeRequest({action: "initializeReputation", data: {userId}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, BASE_SCORE);
      assert.equal(res.data.trustLevel, "New");
      assert.equal(res.data.completedBookings, 0);
      assert.deepEqual(res.data.detectionFlags, []);

      const repDoc = await fetchDoc("reputations", userId);
      assert.equal(repDoc.trustScore, BASE_SCORE);
    });

    it("rejects when userId is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "initializeReputation", data: {}})),
        /INVALID_ARGUMENT|User ID is required/i,
      );
    });

    it("returns existing reputation without duplicating (idempotent)", async () => {
      const {id} = await seedUser();
      await seedReputation(id, {trustScore: 75, trustLevel: "High"});

      const res = await wrapped(
        makeRequest({action: "initializeReputation", data: {userId: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, 75);
      assert.equal(res.message, "Reputation already exists");

      const reps = await db.collection("reputations").get();
      assert.equal(reps.size, 1, "Should not create duplicate");
    });

    it("writes a history subcollection entry", async () => {
      const userId = `user-${uniqueId()}`;
      await wrapped(
        makeRequest({action: "initializeReputation", data: {userId}}),
      );

      const historySnap = await db.collection("reputations").doc(userId)
        .collection("history")
        .get();
      assert.equal(historySnap.size, 1, "Expected one history entry");
      assert.equal(historySnap.docs[0].data().trustScore, BASE_SCORE);
    });
  });

  // ==========================================================================
  // 2. updateUserReputation
  // ==========================================================================
  describe("updateUserReputation", () => {
    it("recalculates trust score based on user data", async () => {
      const {clientId, bookingId} = await seedCompletedBookingWithEntities();
      // Add a review for the client
      await db.collection("reviews").doc(`rev-${uniqueId()}`).set({
        id: `rev-${uniqueId()}`,
        bookingId,
        clientId,
        providerId: clientId,
        rating: 5,
        comment: "Great client",
        status: "Visible",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await wrapped(
        makeRequest({action: "updateUserReputation", data: {userId: clientId}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.data.trustScore > 0, "Trust score should be positive");
      assert.ok(res.data.completedBookings >= 1);
      assert.ok(res.data.trustLevel);
    });

    it("rejects when userId is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "updateUserReputation", data: {}})),
        /INVALID_ARGUMENT|User ID is required/i,
      );
    });

    it("handles users with no completed bookings", async () => {
      const {id} = await seedUser({name: "No Bookings"});
      const res = await wrapped(
        makeRequest({action: "updateUserReputation", data: {userId: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.completedBookings, 0);
    });

    it("preserves existing detection flags", async () => {
      const {clientId} = await seedCompletedBookingWithEntities();
      await seedReputation(clientId, {detectionFlags: ["ReviewBomb"]});

      const res = await wrapped(
        makeRequest({action: "updateUserReputation", data: {userId: clientId}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.data.detectionFlags.includes("ReviewBomb"));
    });
  });

  // ==========================================================================
  // 3. updateProviderReputation
  // ==========================================================================
  describe("updateProviderReputation", () => {
    it("recalculates provider trust score based on provider data", async () => {
      const {providerId, bookingId} = await seedCompletedBookingWithEntities();
      // Add a review for the provider
      await db.collection("reviews").doc(`rev-${uniqueId()}`).set({
        id: `rev-${uniqueId()}`,
        bookingId,
        clientId: providerId,
        providerId,
        rating: 5,
        comment: "Great provider",
        status: "Visible",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const res = await wrapped(
        makeRequest({action: "updateProviderReputation", data: {providerId}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.data.trustScore > 0);
      assert.ok(res.data.completedBookings >= 1);
    });

    it("rejects when providerId is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "updateProviderReputation", data: {}})),
        /INVALID_ARGUMENT|Provider ID is required/i,
      );
    });

    it("handles providers with no completed bookings", async () => {
      const {id} = await seedUser({name: "No Bookings Provider"});
      const res = await wrapped(
        makeRequest({action: "updateProviderReputation", data: {providerId: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.completedBookings, 0);
    });

    it("preserves existing detection flags", async () => {
      const {providerId} = await seedCompletedBookingWithEntities();
      await seedReputation(providerId, {detectionFlags: ["CompetitiveManipulation"]});

      const res = await wrapped(
        makeRequest({action: "updateProviderReputation", data: {providerId}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.data.detectionFlags.includes("CompetitiveManipulation"));
    });
  });

  // ==========================================================================
  // 4. processReviewForReputation
  // ==========================================================================
  describe("processReviewForReputation", () => {
    it("processes a review and updates user and provider reputation", async () => {
      const {clientId, providerId, bookingId} = await seedCompletedBookingWithEntities();
      const review = {
        id: `rev-${uniqueId()}`,
        bookingId,
        clientId,
        providerId,
        rating: 5,
        comment: "Excellent work!",
        status: "Visible",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await wrapped(
        makeRequest({
          action: "processReviewForReputation",
          data: {review},
        }),
      );

      assert.equal(res.success, true);

      // Both user and provider reputations should have been updated
      const userRep = await db.collection("reputations").doc(clientId).get();
      assert.equal(userRep.exists, true);

      const providerRep = await db.collection("reputations").doc(providerId).get();
      assert.equal(providerRep.exists, true);
    });

    it("rejects when review object is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "processReviewForReputation", data: {}})),
        /INVALID_ARGUMENT|Review object is required/i,
      );
    });

    it("rejects when review has no id", async () => {
      await assert.rejects(
        wrapped(makeRequest({
          action: "processReviewForReputation",
          data: {review: {rating: 5}},
        })),
        /INVALID_ARGUMENT|Review object is required/i,
      );
    });

    it("applies AI analysis flags when review is suspicious", async () => {
      const {clientId, providerId, bookingId} = await seedCompletedBookingWithEntities();
      const review = {
        id: `rev-suspicious-${uniqueId()}`,
        bookingId,
        clientId,
        providerId,
        rating: 1,
        comment: "Bad",
        status: "Visible",
        aiAnalysis: {
          analyzed: true,
          isSuspicious: true,
          confidence: 0.9,
          patterns: ["template_language"],
          threatLevel: "high",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await wrapped(
        makeRequest({
          action: "processReviewForReputation",
          data: {review},
        }),
      );

      assert.equal(res.success, true);

      const repDoc = await db.collection("reputations").doc(clientId).get();
      assert.ok(repDoc.data().detectionFlags.includes("ReviewBomb"));
    });
  });

  // ==========================================================================
  // 5. deductReputationForCancellation
  // ==========================================================================
  describe("deductReputationForCancellation", () => {
    it("deducts CANCELLATION_PENALTY from existing trust score", async () => {
      const {id} = await seedUser();
      const initialScore = 80;
      await seedReputation(id, {trustScore: initialScore});

      const res = await wrapped(
        makeRequest({action: "deductReputationForCancellation", data: {userId: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, initialScore - CANCELLATION_PENALTY);
      assert.equal(
        res.data.trustLevel,
        determineTrustLevel(initialScore - CANCELLATION_PENALTY),
      );
    });

    it("rejects when userId is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "deductReputationForCancellation", data: {}})),
        /INVALID_ARGUMENT|User ID is required/i,
      );
    });

    it("creates a reputation from BASE_SCORE when no existing doc", async () => {
      const userId = `user-${uniqueId()}`;
      const res = await wrapped(
        makeRequest({action: "deductReputationForCancellation", data: {userId}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, BASE_SCORE - CANCELLATION_PENALTY);
    });

    it("never goes below 0", async () => {
      const userId = `user-${uniqueId()}`;
      await seedReputation(userId, {trustScore: 2});

      const res = await wrapped(
        makeRequest({action: "deductReputationForCancellation", data: {userId}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, 0);
    });

    it("writes a history subcollection entry after deduction", async () => {
      const userId = `user-${uniqueId()}`;
      await seedReputation(userId, {trustScore: 70});
      await wrapped(
        makeRequest({action: "deductReputationForCancellation", data: {userId}}),
      );

      const historySnap = await db.collection("reputations").doc(userId)
        .collection("history")
        .get();
      assert.equal(historySnap.size, 1);
      assert.equal(historySnap.docs[0].data().trustScore, 70 - CANCELLATION_PENALTY);
    });
  });

  // ==========================================================================
  // 6. deductReputationForSuspiciousReview
  // ==========================================================================
  describe("deductReputationForSuspiciousReview", () => {
    it("adds ReviewBomb flag and recalculates trust score", async () => {
      const {id} = await seedUser();
      const initialScore = 80;
      await seedReputation(id, {trustScore: initialScore, detectionFlags: []});

      const res = await wrapped(
        makeRequest({action: "deductReputationForSuspiciousReview", data: {userId: id}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.data.detectionFlags.includes("ReviewBomb"));
      // Score should be lower due to the ReviewBomb penalty
      assert.ok(res.data.trustScore < initialScore);

      const repDoc = await fetchDoc("reputations", id);
      assert.ok(repDoc.detectionFlags.includes("ReviewBomb"));
    });

    it("rejects when userId is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "deductReputationForSuspiciousReview", data: {}})),
        /INVALID_ARGUMENT|User ID is required/i,
      );
    });

    it("returns error when no reputation found", async () => {
      const userId = `user-${uniqueId()}`;
      const res = await wrapped(
        makeRequest({action: "deductReputationForSuspiciousReview", data: {userId}}),
      );

      assert.equal(res.success, false);
      assert.equal(res.error, "No reputation found");
    });

    it("returns idempotent result when already flagged", async () => {
      const {id} = await seedUser();
      await seedReputation(id, {trustScore: 80, detectionFlags: ["ReviewBomb"]});

      const res = await wrapped(
        makeRequest({action: "deductReputationForSuspiciousReview", data: {userId: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.message, "Already flagged");
    });

    it("writes a history subcollection entry after flagging", async () => {
      const {id} = await seedUser();
      await seedReputation(id, {trustScore: 80});
      await wrapped(
        makeRequest({action: "deductReputationForSuspiciousReview", data: {userId: id}}),
      );

      const historySnap = await db.collection("reputations").doc(id)
        .collection("history")
        .get();
      assert.equal(historySnap.size, 1);
    });
  });

  // ==========================================================================
  // 7. updateReputation (admin only)
  // ==========================================================================
  describe("updateReputation", () => {
    it("allows admin to set a custom trust score", async () => {
      const {id} = await seedUser();
      await seedReputation(id, {trustScore: 50});

      const res = await wrapped(
        makeRequest(
          {action: "updateReputation", data: {userId: id, reputationScore: 90}},
          makeAuth(id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, 90);
      assert.equal(res.data.trustLevel, "VeryHigh");
    });

    it("rejects non-admin callers", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateReputation", data: {userId: id, reputationScore: 90}},
            makeAuth(id),
          ),
        ),
        /PERMISSION_DENIED|Only ADMIN/i,
      );
    });

    it("rejects when userId is missing", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateReputation", data: {reputationScore: 90}},
            makeAuth(id, true),
          ),
        ),
        /INVALID_ARGUMENT|User ID is required/i,
      );
    });

    it("rejects when reputationScore is missing", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateReputation", data: {userId: id}},
            makeAuth(id, true),
          ),
        ),
        /INVALID_ARGUMENT|Reputation score is required/i,
      );
    });

    it("creates a reputation entry when none exists", async () => {
      const userId = `user-${uniqueId()}`;
      const res = await wrapped(
        makeRequest(
          {action: "updateReputation", data: {userId, reputationScore: 75}},
          makeAuth(userId, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.trustScore, 75);

      const repDoc = await db.collection("reputations").doc(userId).get();
      assert.equal(repDoc.exists, true);
      assert.equal(repDoc.data().trustScore, 75);
    });
  });
});
