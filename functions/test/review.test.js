/**
 * Integration tests for functions/src/review.js — 24 action cases
 * routed through the `reviewAction` callable.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Each action is tested with:
 *   - Happy path: correct response + side effects
 *   - Auth errors: missing/unauthorized caller
 *   - Validation errors: missing/invalid args
 *   - State-machine errors: invalid transitions, duplicates, etc.
 *
 * Side-effect assertions verify that service ratings, review docs,
 * report docs, and booking flags are updated in Firestore.
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {
  seedReview,
  seedProviderReview,
  seedUser,
  seedBaseEntities,
  uniqueId,
} = require("./helpers/seed");

const myFunctions = require("../src/review");
const wrapped = test.wrap(myFunctions.reviewAction);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a callable request with auth and a payload.
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
 * Build auth context for a given uid, with optional admin flag.
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
 * Fetch a doc by ID. Asserts it exists.
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
 * Create a completed booking and return all IDs, plus make the
 * completedDate configurable for testing the review window.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedCompleteBookingForReview(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-review-${uniqueId()}`;
  const daysAgo = opts.daysAgo || 0;
  const completedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const booking = {
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Completed",
    requestedDate: new Date(Date.now() - (daysAgo + 2) * 24 * 60 * 60 * 1000).toISOString(),
    scheduledDate: new Date(Date.now() - (daysAgo + 1) * 24 * 60 * 60 * 1000).toISOString(),
    startedDate: new Date(Date.now() - (daysAgo + 1) * 24 * 60 * 60 * 1000).toISOString(),
    completedDate,
    price: 500,
    amountPaid: 500,
    paymentMethod: "GCash",
    paymentId: `pay-${uniqueId()}`,
    createdAt: new Date(Date.now() - (daysAgo + 2) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - (daysAgo + 2) * 24 * 60 * 60 * 1000).toISOString(),
  };
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

describe("reviewAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // 1. submitReview
  // ==========================================================================
  describe("submitReview", () => {
    it("submits a review for a completed booking and updates the service rating", async () => {
      const {clientId, serviceId, bookingId} = await seedCompleteBookingForReview();
      const res = await wrapped(
        makeRequest(
          {
            action: "submitReview",
            data: {bookingId, rating: 4, comment: "Great service!"},
          },
          makeAuth(clientId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.rating, 4);
      assert.equal(res.data.comment, "Great service!");
      assert.equal(res.data.status, "Visible");
      assert.equal(res.data.clientId, clientId);

      const reviewDoc = await fetchDoc("reviews", res.data.id);
      assert.equal(reviewDoc.rating, 4);

      const serviceDoc = await fetchDoc("services", serviceId);
      assert.equal(serviceDoc.reviewCount, 1);
      assert.equal(serviceDoc.averageRating, 4);
    });

    it("rejects unauthenticated callers", async () => {
      const {bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "submitReview",
            data: {bookingId, rating: 4, comment: "Great!"},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("rejects missing bookingId", async () => {
      const {clientId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {rating: 4, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Booking ID is required/i,
      );
    });

    it("rejects invalid rating (below min)", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 0, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Invalid rating/i,
      );
    });

    it("rejects invalid rating (above max)", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 6, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Invalid rating/i,
      );
    });

    it("rejects comment exceeding max length", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 4, comment: "x".repeat(501)},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|too long/i,
      );
    });

    it("rejects non-existent booking", async () => {
      const {clientId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId: "nonexistent", rating: 4, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects when caller is not the booking client", async () => {
      const {bookingId} = await seedCompleteBookingForReview();
      const other = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 4, comment: "Great!"},
            },
            makeAuth(other.id),
          ),
        ),
        /PERMISSION_DENIED|Not authorized/i,
      );
    });

    it("rejects when booking is not completed", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview();
      await db.collection("bookings").doc(bookingId).update({status: "Accepted", completedDate: null});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 4, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|not completed/i,
      );
    });

    it("rejects when review window has expired", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview({daysAgo: 31});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 4, comment: "Great!"},
            },
            makeAuth(clientId),
          ),
        ),
        /DEADLINE_EXCEEDED|expired/i,
      );
    });

    it("rejects duplicate review", async () => {
      const {clientId, bookingId} = await seedCompleteBookingForReview();
      await wrapped(
        makeRequest(
          {
            action: "submitReview",
            data: {bookingId, rating: 4, comment: "First review"},
          },
          makeAuth(clientId),
        ),
      );
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitReview",
              data: {bookingId, rating: 5, comment: "Second review"},
            },
            makeAuth(clientId),
          ),
        ),
        /ALREADY_EXISTS|already exists/i,
      );
    });
  });

  // ==========================================================================
  // 2. getReview
  // ==========================================================================
  describe("getReview", () => {
    it("returns a visible review by ID", async () => {
      const review = await seedReview();
      const res = await wrapped(
        makeRequest({
          action: "getReview",
          data: {reviewId: review.id},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.id, review.id);
      assert.equal(res.data.rating, 5);
    });

    it("rejects missing reviewId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getReview",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Review ID is required/i,
      );
    });

    it("rejects non-existent review", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getReview",
            data: {reviewId: "nonexistent"},
          }),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects a hidden review", async () => {
      const review = await seedReview({status: "Hidden"});
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getReview",
            data: {reviewId: review.id},
          }),
        ),
        /PERMISSION_DENIED|hidden/i,
      );
    });
  });

  // ==========================================================================
  // 3. getBookingReviews
  // ==========================================================================
  describe("getBookingReviews", () => {
    it("returns visible reviews for a booking", async () => {
      await seedReview({bookingId: "bk-1", comment: "First"});
      await seedReview({bookingId: "bk-1", comment: "Second"});
      const res = await wrapped(
        makeRequest({
          action: "getBookingReviews",
          data: {bookingId: "bk-1"},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects missing bookingId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getBookingReviews",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Booking ID is required/i,
      );
    });

    it("returns empty array when booking has no reviews", async () => {
      const res = await wrapped(
        makeRequest({
          action: "getBookingReviews",
          data: {bookingId: "bk-empty"},
        }),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });

    it("excludes hidden reviews from results", async () => {
      await seedReview({bookingId: "bk-2", comment: "Visible"});
      await seedReview({bookingId: "bk-2", comment: "Hidden", status: "Hidden"});
      const res = await wrapped(
        makeRequest({
          action: "getBookingReviews",
          data: {bookingId: "bk-2"},
        }),
      );

      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].comment, "Visible");
    });
  });

  // ==========================================================================
  // 4. getUserReviews
  // ==========================================================================
  describe("getUserReviews", () => {
    it("returns own visible reviews", async () => {
      const {id: userId} = await seedUser();
      await seedReview({clientId: userId, comment: "Mine"});
      await seedReview({clientId: userId, comment: "Mine 2"});
      const res = await wrapped(
        makeRequest(
          {
            action: "getUserReviews",
            data: {userId},
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getUserReviews",
            data: {userId: "someone"},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("defaults to own uid when userId is omitted", async () => {
      const {id: userId} = await seedUser();
      await seedReview({clientId: userId, comment: "Mine"});
      const res = await wrapped(
        makeRequest(
          {
            action: "getUserReviews",
            data: {},
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.data.length, 1);
    });

    it("admin with includeHidden returns all reviews including hidden", async () => {
      const {id: userId} = await seedUser();
      await seedReview({clientId: userId, comment: "Visible"});
      await seedReview({clientId: userId, comment: "Hidden", status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getUserReviews",
            data: {userId, includeHidden: true},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });
  });

  // ==========================================================================
  // 5. updateReview
  // ==========================================================================
  describe("updateReview", () => {
    it("updates rating and comment and recalculates service rating", async () => {
      const {clientId, serviceId} = await seedBaseEntities();
      const review = await seedReview({clientId, serviceId, rating: 3, comment: "OK"});
      await db.collection("services").doc(serviceId).update({averageRating: 3, reviewCount: 1});

      const res = await wrapped(
        makeRequest(
          {
            action: "updateReview",
            data: {reviewId: review.id, rating: 5, comment: "Excellent!"},
          },
          makeAuth(clientId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.rating, 5);
      assert.equal(res.data.comment, "Excellent!");

      const serviceDoc = await fetchDoc("services", serviceId);
      assert.equal(serviceDoc.averageRating, 5);
    });

    it("rejects unauthenticated callers", async () => {
      const review = await seedReview();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "updateReview",
            data: {reviewId: review.id, rating: 4, comment: "Updated"},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("rejects missing reviewId", async () => {
      const {clientId} = await seedBaseEntities();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReview",
              data: {rating: 4, comment: "Updated"},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Review ID is required/i,
      );
    });

    it("rejects invalid rating", async () => {
      const {clientId} = await seedBaseEntities();
      const review = await seedReview({clientId});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReview",
              data: {reviewId: review.id, rating: 0, comment: "Bad"},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Invalid rating/i,
      );
    });

    it("rejects non-existent review", async () => {
      const {clientId} = await seedBaseEntities();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReview",
              data: {reviewId: "nonexistent", rating: 4, comment: "Updated"},
            },
            makeAuth(clientId),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects when caller is not the owner", async () => {
      const review = await seedReview();
      const other = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReview",
              data: {reviewId: review.id, rating: 4, comment: "Hacked"},
            },
            makeAuth(other.id),
          ),
        ),
        /PERMISSION_DENIED|Not authorized/i,
      );
    });

    it("rejects updating a hidden review", async () => {
      const {clientId} = await seedBaseEntities();
      const review = await seedReview({clientId, status: "Hidden"});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReview",
              data: {reviewId: review.id, rating: 5, comment: "Try"},
            },
            makeAuth(clientId),
          ),
        ),
        /FAILED_PRECONDITION|Cannot update/i,
      );
    });

    it("does not change service rating when rating is unchanged", async () => {
      const {clientId, serviceId} = await seedBaseEntities();
      const review = await seedReview({clientId, serviceId, rating: 4, comment: "Good"});
      await db.collection("services").doc(serviceId).update({averageRating: 4, reviewCount: 1});

      await wrapped(
        makeRequest(
          {
            action: "updateReview",
            data: {reviewId: review.id, rating: 4, comment: "Still good"},
          },
          makeAuth(clientId),
        ),
      );

      const serviceDoc = await fetchDoc("services", serviceId);
      assert.equal(serviceDoc.averageRating, 4);
    });
  });

  // ==========================================================================
  // 6. deleteReview
  // ==========================================================================
  describe("deleteReview", () => {
    it("hides a review and updates the service rating", async () => {
      const {clientId, serviceId} = await seedBaseEntities();
      const review = await seedReview({clientId, serviceId, rating: 4});
      await db.collection("services").doc(serviceId).update({averageRating: 4, reviewCount: 1});

      const res = await wrapped(
        makeRequest(
          {
            action: "deleteReview",
            data: {reviewId: review.id},
          },
          makeAuth(clientId),
        ),
      );

      assert.equal(res.success, true);

      const reviewDoc = await fetchDoc("reviews", review.id);
      assert.equal(reviewDoc.status, "Hidden");

      const serviceDoc = await fetchDoc("services", serviceId);
      assert.equal(serviceDoc.reviewCount, 0);
    });

    it("hides a provider review", async () => {
      const {providerId} = await seedBaseEntities();
      const pr = await seedProviderReview({providerId});
      const res = await wrapped(
        makeRequest(
          {
            action: "deleteReview",
            data: {reviewId: pr.id},
          },
          makeAuth(providerId),
        ),
      );

      assert.equal(res.success, true);
      const prDoc = await fetchDoc("providerReviews", pr.id);
      assert.equal(prDoc.status, "Hidden");
    });

    it("rejects unauthenticated callers", async () => {
      const review = await seedReview();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "deleteReview",
            data: {reviewId: review.id},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("rejects missing reviewId", async () => {
      const {clientId} = await seedBaseEntities();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "deleteReview",
              data: {},
            },
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|Review ID is required/i,
      );
    });

    it("rejects non-existent review", async () => {
      const {clientId} = await seedBaseEntities();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "deleteReview",
              data: {reviewId: "nonexistent"},
            },
            makeAuth(clientId),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects when caller is neither owner nor admin", async () => {
      const review = await seedReview();
      const other = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "deleteReview",
              data: {reviewId: review.id},
            },
            makeAuth(other.id),
          ),
        ),
        /PERMISSION_DENIED|Not authorized/i,
      );
    });

    it("admin can delete any review", async () => {
      const {clientId, serviceId} = await seedBaseEntities();
      const review = await seedReview({clientId, serviceId, rating: 4});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "deleteReview",
            data: {reviewId: review.id},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      const reviewDoc = await fetchDoc("reviews", review.id);
      assert.equal(reviewDoc.status, "Hidden");
    });

    it("rejects deleting an already hidden review", async () => {
      const {clientId} = await seedBaseEntities();
      const review = await seedReview({clientId, status: "Hidden"});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "deleteReview",
              data: {reviewId: review.id},
            },
            makeAuth(clientId),
          ),
        ),
        /ALREADY_EXISTS|already hidden/i,
      );
    });
  });

  // ==========================================================================
  // 7. restoreReview
  // ==========================================================================
  describe("restoreReview", () => {
    it("restores a hidden review and recalculates service rating", async () => {
      const {clientId, serviceId} = await seedBaseEntities();
      const review = await seedReview({clientId, serviceId, rating: 4, status: "Hidden"});
      const admin = await seedUser();
      await db.collection("services").doc(serviceId).update({averageRating: 0, reviewCount: 0});

      const res = await wrapped(
        makeRequest(
          {
            action: "restoreReview",
            data: {reviewId: review.id},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      const reviewDoc = await fetchDoc("reviews", review.id);
      assert.equal(reviewDoc.status, "Visible");

      const serviceDoc = await fetchDoc("services", serviceId);
      assert.equal(serviceDoc.reviewCount, 1);
      assert.equal(serviceDoc.averageRating, 4);
    });

    it("restores a hidden provider review", async () => {
      const {providerId} = await seedBaseEntities();
      const pr = await seedProviderReview({providerId, status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "restoreReview",
            data: {reviewId: pr.id},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      const prDoc = await fetchDoc("providerReviews", pr.id);
      assert.equal(prDoc.status, "Visible");
    });

    it("rejects non-admin callers", async () => {
      const review = await seedReview({status: "Hidden"});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "restoreReview",
              data: {reviewId: review.id},
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("rejects missing reviewId", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "restoreReview",
              data: {},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Review ID is required/i,
      );
    });

    it("rejects non-existent review", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "restoreReview",
              data: {reviewId: "nonexistent"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects restoring a review that is not hidden", async () => {
      const review = await seedReview({status: "Visible"});
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "restoreReview",
              data: {reviewId: review.id},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /FAILED_PRECONDITION|not hidden/i,
      );
    });
  });

  // ==========================================================================
  // 8. bulkUpdateReviewStatus
  // ==========================================================================
  describe("bulkUpdateReviewStatus", () => {
    it("updates status for multiple reviews", async () => {
      const r1 = await seedReview();
      const r2 = await seedReview();
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "bulkUpdateReviewStatus",
            data: {reviewIds: [r1.id, r2.id], status: "Hidden"},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.updated.length, 2);
      assert.deepEqual(res.errors, []);

      const doc1 = await fetchDoc("reviews", r1.id);
      assert.equal(doc1.status, "Hidden");
    });

    it("rejects non-admin callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "bulkUpdateReviewStatus",
              data: {reviewIds: ["r1"], status: "Hidden"},
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("rejects missing reviewIds", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "bulkUpdateReviewStatus",
              data: {status: "Hidden"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Review IDs array is required/i,
      );
    });

    it("rejects empty reviewIds array", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "bulkUpdateReviewStatus",
              data: {reviewIds: [], status: "Hidden"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Review IDs array is required/i,
      );
    });

    it("rejects invalid status value", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "bulkUpdateReviewStatus",
              data: {reviewIds: ["r1"], status: "Bogus"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Status must be/i,
      );
    });

    it("reports errors for non-existent review IDs", async () => {
      const r1 = await seedReview();
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "bulkUpdateReviewStatus",
            data: {reviewIds: [r1.id, "nonexistent"], status: "Visible"},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.updated.length, 1);
      assert.equal(res.errors.length, 1);
      assert.equal(res.errors[0].reviewId, "nonexistent");
    });
  });

  // ==========================================================================
  // 9. calculateProviderRating
  // ==========================================================================
  describe("calculateProviderRating", () => {
    it("returns average rating for a provider", async () => {
      const {providerId} = await seedBaseEntities();
      await seedReview({providerId, rating: 5});
      await seedReview({providerId, rating: 3});
      const res = await wrapped(
        makeRequest({
          action: "calculateProviderRating",
          data: {providerId},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.reviewCount, 2);
      assert.equal(res.data.averageRating, 4);
    });

    it("rejects missing providerId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "calculateProviderRating",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Provider ID is required/i,
      );
    });

    it("throws not-found when provider has no reviews", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "calculateProviderRating",
            data: {providerId: "noreviews"},
          }),
        ),
        /NOT_FOUND|No reviews found/i,
      );
    });

    it("excludes hidden reviews", async () => {
      const {providerId} = await seedBaseEntities();
      await seedReview({providerId, rating: 5});
      await seedReview({providerId, rating: 1, status: "Hidden"});
      const res = await wrapped(
        makeRequest({
          action: "calculateProviderRating",
          data: {providerId},
        }),
      );

      assert.equal(res.data.reviewCount, 1);
      assert.equal(res.data.averageRating, 5);
    });
  });

  // ==========================================================================
  // 10. calculateServiceRating
  // ==========================================================================
  describe("calculateServiceRating", () => {
    it("returns average rating for a service", async () => {
      const {serviceId} = await seedBaseEntities();
      await seedReview({serviceId, rating: 5});
      await seedReview({serviceId, rating: 4});
      const res = await wrapped(
        makeRequest({
          action: "calculateServiceRating",
          data: {serviceId},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.reviewCount, 2);
      assert.equal(res.data.averageRating, 4.5);
    });

    it("rejects missing serviceId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "calculateServiceRating",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("throws not-found when service has no reviews", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "calculateServiceRating",
            data: {serviceId: "noreviews"},
          }),
        ),
        /NOT_FOUND|No reviews found/i,
      );
    });

    it("excludes hidden reviews", async () => {
      const {serviceId} = await seedBaseEntities();
      await seedReview({serviceId, rating: 5});
      await seedReview({serviceId, rating: 1, status: "Hidden"});
      const res = await wrapped(
        makeRequest({
          action: "calculateServiceRating",
          data: {serviceId},
        }),
      );

      assert.equal(res.data.reviewCount, 1);
      assert.equal(res.data.averageRating, 5);
    });
  });

  // ==========================================================================
  // 11. calculateUserAverageRating
  // ==========================================================================
  describe("calculateUserAverageRating", () => {
    it("returns own average rating", async () => {
      const {id: userId} = await seedUser();
      await seedReview({clientId: userId, rating: 5});
      await seedReview({clientId: userId, rating: 3});
      const res = await wrapped(
        makeRequest(
          {
            action: "calculateUserAverageRating",
            data: {},
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.reviewCount, 2);
      assert.equal(res.data.averageRating, 4);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "calculateUserAverageRating",
            data: {},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("admin can view another user's rating", async () => {
      const {id: userId} = await seedUser();
      await seedReview({clientId: userId, rating: 4});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "calculateUserAverageRating",
            data: {userId},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.averageRating, 4);
    });

    it("rejects non-admin viewing another user's rating", async () => {
      const {id: userId} = await seedUser();
      const other = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "calculateUserAverageRating",
              data: {userId},
            },
            makeAuth(other.id),
          ),
        ),
        /PERMISSION_DENIED|Not authorized/i,
      );
    });

    it("throws not-found when user has no visible reviews", async () => {
      const {id: userId} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "calculateUserAverageRating",
              data: {},
            },
            makeAuth(userId),
          ),
        ),
        /NOT_FOUND|No reviews found/i,
      );
    });
  });

  // ==========================================================================
  // 12. getAllReviews
  // ==========================================================================
  describe("getAllReviews", () => {
    it("returns paginated reviews for admin", async () => {
      await seedReview({comment: "R1"});
      await seedReview({comment: "R2"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getAllReviews",
            data: {limit: 10, offset: 0},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects non-admin callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "getAllReviews",
              data: {},
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("filters by status when provided", async () => {
      await seedReview({comment: "Visible 1"});
      await seedReview({comment: "Visible 2"});
      await seedReview({comment: "Hidden One", status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getAllReviews",
            data: {status: "Visible"},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });

    it("respects pagination limits", async () => {
      await seedReview({comment: "R1"});
      await seedReview({comment: "R2"});
      await seedReview({comment: "R3"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getAllReviews",
            data: {limit: 2, offset: 0},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });
  });

  // ==========================================================================
  // 13. getReviewStatistics
  // ==========================================================================
  describe("getReviewStatistics", () => {
    it("returns statistics with correct counts", async () => {
      await seedReview({comment: "Visible"});
      await seedReview({comment: "Hidden", status: "Hidden"});
      await seedReview({comment: "Flagged", status: "Flagged"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getReviewStatistics",
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.activeReviews, 1);
      assert.equal(res.data.hiddenReviews, 1);
      assert.equal(res.data.flaggedReviews, 1);
      assert.equal(res.data.totalReviews, 3);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getReviewStatistics",
          }),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("rejects non-admin callers", async () => {
      const {id: uid} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "getReviewStatistics",
            },
            makeAuth(uid),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });
  });

  // ==========================================================================
  // 14. flagReview
  // ==========================================================================
  describe("flagReview", () => {
    it("flags a review for moderation (admin)", async () => {
      const review = await seedReview({comment: "Bad review"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "flagReview",
            data: {reviewId: review.id, reason: "Inappropriate content"},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      const reviewDoc = await fetchDoc("reviews", review.id);
      assert.equal(reviewDoc.status, "Flagged");
      assert.equal(reviewDoc.flagReason, "Inappropriate content");
    });

    it("rejects non-admin callers", async () => {
      const review = await seedReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "flagReview",
              data: {reviewId: review.id},
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("rejects missing reviewId", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "flagReview",
              data: {},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Review ID is required/i,
      );
    });

    it("rejects non-existent review", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "flagReview",
              data: {reviewId: "nonexistent"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });
  });

  // ==========================================================================
  // 15. flagReviewForAdmin
  // ==========================================================================
  describe("flagReviewForAdmin", () => {
    it("creates a report in the reports collection", async () => {
      const {id: userId} = await seedUser({name: "Test Provider"});
      const res = await wrapped(
        makeRequest(
          {
            action: "flagReviewForAdmin",
            data: {reviewId: "rev-1", reason: "Spam", reviewData: {bookingId: "bk-1"}},
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.reportType, "review_flag");
      assert.equal(res.data.status, "open");

      const reportDoc = await fetchDoc("reports", res.data.id);
      assert.equal(reportDoc.status, "open");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "flagReviewForAdmin",
            data: {reviewId: "rev-1", reason: "Spam"},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("rejects missing reviewId or reason", async () => {
      const {id: userId} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "flagReviewForAdmin",
              data: {reviewId: "rev-1"},
            },
            makeAuth(userId),
          ),
        ),
        /INVALID_ARGUMENT|Review ID and reason/i,
      );
    });

    it("rejects when user profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "flagReviewForAdmin",
              data: {reviewId: "rev-1", reason: "Spam"},
            },
            makeAuth("ghost-user"),
          ),
        ),
        /NOT_FOUND|User profile not found/i,
      );
    });
  });

  // ==========================================================================
  // 16. getReviewFlagReports
  // ==========================================================================
  describe("getReviewFlagReports", () => {
    it("returns review flag reports for admin", async () => {
      const {id: userId} = await seedUser();
      await db.collection("reports").add({
        userId,
        reportType: "review_flag",
        status: "open",
        createdAt: new Date().toISOString(),
      });
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getReviewFlagReports",
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 1);
    });

    it("rejects non-admin callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "getReviewFlagReports",
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });
  });

  // ==========================================================================
  // 17. getMyReviewFlagReports
  // ==========================================================================
  describe("getMyReviewFlagReports", () => {
    it("returns own flag reports", async () => {
      const {id: userId} = await seedUser();
      await db.collection("reports").add({
        userId,
        reportType: "review_flag",
        status: "open",
        createdAt: new Date().toISOString(),
      });
      const res = await wrapped(
        makeRequest(
          {
            action: "getMyReviewFlagReports",
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 1);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getMyReviewFlagReports",
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("returns only own reports (not other users')", async () => {
      const {id: userId} = await seedUser();
      const {id: otherId} = await seedUser();
      await db.collection("reports").add({
        userId: otherId,
        reportType: "review_flag",
        status: "open",
        createdAt: new Date().toISOString(),
      });
      const res = await wrapped(
        makeRequest(
          {
            action: "getMyReviewFlagReports",
          },
          makeAuth(userId),
        ),
      );

      assert.equal(res.data.length, 0);
    });
  });

  // ==========================================================================
  // 18. updateReviewFlagReportStatus
  // ==========================================================================
  describe("updateReviewFlagReportStatus", () => {
    it("updates the status of a report (admin)", async () => {
      const {id: userId} = await seedUser();
      const reportRef = await db.collection("reports").add({
        userId,
        reportType: "review_flag",
        status: "open",
        createdAt: new Date().toISOString(),
      });
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "updateReviewFlagReportStatus",
            data: {reportId: reportRef.id, status: "resolved"},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.status, "resolved");

      const reportDoc = await fetchDoc("reports", reportRef.id);
      assert.equal(reportDoc.status, "resolved");
    });

    it("rejects non-admin callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReviewFlagReportStatus",
              data: {reportId: "r1", status: "resolved"},
            },
            makeAuth("nonadmin"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });

    it("rejects missing reportId or status", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReviewFlagReportStatus",
              data: {reportId: "r1"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /INVALID_ARGUMENT|Report ID and status are required/i,
      );
    });

    it("rejects non-existent report", async () => {
      const admin = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "updateReviewFlagReportStatus",
              data: {reportId: "nonexistent", status: "resolved"},
            },
            makeAuth(admin.id, true),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });
  });

  // ==========================================================================
  // 19. getProviderReviews
  // ==========================================================================
  describe("getProviderReviews", () => {
    it("returns visible reviews for a provider", async () => {
      const {providerId} = await seedBaseEntities();
      await seedReview({providerId, comment: "Review 1"});
      await seedReview({providerId, comment: "Review 2"});
      const res = await wrapped(
        makeRequest({
          action: "getProviderReviews",
          data: {providerId, limit: 20, offset: 0},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("returns empty array when providerId is empty", async () => {
      const res = await wrapped(
        makeRequest({
          action: "getProviderReviews",
          data: {},
        }),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });

    it("returns empty array when provider has no reviews", async () => {
      const res = await wrapped(
        makeRequest({
          action: "getProviderReviews",
          data: {providerId: "noreviews"},
        }),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });

    it("excludes hidden reviews", async () => {
      const {providerId} = await seedBaseEntities();
      await seedReview({providerId, comment: "Visible"});
      await seedReview({providerId, comment: "Hidden", status: "Hidden"});
      const res = await wrapped(
        makeRequest({
          action: "getProviderReviews",
          data: {providerId},
        }),
      );

      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].comment, "Visible");
    });
  });

  // ==========================================================================
  // 20. getServiceReviews
  // ==========================================================================
  describe("getServiceReviews", () => {
    it("returns visible reviews for a service", async () => {
      const {serviceId} = await seedBaseEntities();
      await seedReview({serviceId, comment: "Review 1"});
      await seedReview({serviceId, comment: "Review 2"});
      const res = await wrapped(
        makeRequest({
          action: "getServiceReviews",
          data: {serviceId, limit: 20, offset: 0},
        }),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects missing serviceId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "getServiceReviews",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("admin with includeHidden includes hidden reviews", async () => {
      const {serviceId} = await seedBaseEntities();
      await seedReview({serviceId, comment: "Visible"});
      await seedReview({serviceId, comment: "Hidden", status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getServiceReviews",
            data: {serviceId, includeHidden: true},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });

    it("returns empty array when service has no reviews", async () => {
      const res = await wrapped(
        makeRequest({
          action: "getServiceReviews",
          data: {serviceId: "noreviews"},
        }),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });

    it("non-admin cannot see hidden reviews even with includeHidden", async () => {
      const {serviceId} = await seedBaseEntities();
      await seedReview({serviceId, comment: "Visible"});
      await seedReview({serviceId, comment: "Hidden", status: "Hidden"});
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getServiceReviews",
            data: {serviceId, includeHidden: true},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.data.length, 1);
    });
  });

  // ==========================================================================
  // 21. submitProviderReview
  // ==========================================================================
  describe("submitProviderReview", () => {
    it("submits a provider review for a completed booking", async () => {
      const {providerId, bookingId} = await seedCompleteBookingForReview();
      const res = await wrapped(
        makeRequest(
          {
            action: "submitProviderReview",
            data: {bookingId, rating: 5, comment: "Great client!"},
          },
          makeAuth(providerId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.rating, 5);
      assert.equal(res.data.reviewType, "ProviderToClient");

      const bookingDoc = await fetchDoc("bookings", bookingId);
      assert.equal(bookingDoc.providerReviewSubmitted, true);

      const prSnap = await db.collection("providerReviews")
        .where("bookingId", "==", bookingId)
        .get();
      assert.equal(prSnap.size, 1);
    });

    it("rejects unauthenticated callers", async () => {
      const {bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "submitProviderReview",
            data: {bookingId, rating: 5, comment: "Great!"},
          }),
        ),
        /UNAUTHENTICATED|must be authenticated/i,
      );
    });

    it("rejects missing bookingId", async () => {
      const {providerId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {rating: 5, comment: "Great!"},
            },
            makeAuth(providerId),
          ),
        ),
        /INVALID_ARGUMENT|Booking ID is required/i,
      );
    });

    it("rejects invalid rating", async () => {
      const {providerId, bookingId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {bookingId, rating: 0, comment: "Great!"},
            },
            makeAuth(providerId),
          ),
        ),
        /INVALID_ARGUMENT|Invalid rating/i,
      );
    });

    it("rejects non-existent booking", async () => {
      const {providerId} = await seedCompleteBookingForReview();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {bookingId: "nonexistent", rating: 5, comment: "Great!"},
            },
            makeAuth(providerId),
          ),
        ),
        /NOT_FOUND|not found/i,
      );
    });

    it("rejects when caller is not the provider", async () => {
      const {bookingId} = await seedCompleteBookingForReview();
      const other = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {bookingId, rating: 5, comment: "Great!"},
            },
            makeAuth(other.id),
          ),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects when booking is not completed", async () => {
      const {providerId, bookingId} = await seedCompleteBookingForReview();
      await db.collection("bookings").doc(bookingId).update({status: "Accepted", completedDate: null});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {bookingId, rating: 5, comment: "Great!"},
            },
            makeAuth(providerId),
          ),
        ),
        /FAILED_PRECONDITION|Can only review completed bookings/i,
      );
    });

    it("rejects duplicate provider review", async () => {
      const {providerId, bookingId} = await seedCompleteBookingForReview();
      await wrapped(
        makeRequest(
          {
            action: "submitProviderReview",
            data: {bookingId, rating: 5, comment: "First"},
          },
          makeAuth(providerId),
        ),
      );
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "submitProviderReview",
              data: {bookingId, rating: 4, comment: "Second"},
            },
            makeAuth(providerId),
          ),
        ),
        /ALREADY_EXISTS|already reviewed/i,
      );
    });
  });

  // ==========================================================================
  // 22. getClientProviderReviews
  // ==========================================================================
  describe("getClientProviderReviews", () => {
    it("returns visible provider reviews for a client", async () => {
      const {clientId} = await seedBaseEntities();
      await seedProviderReview({clientId, comment: "PR1"});
      await seedProviderReview({clientId, comment: "PR2"});
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getClientProviderReviews",
            data: {clientId, limit: 20, offset: 0},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects missing clientId", async () => {
      const {id: uid} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "getClientProviderReviews",
              data: {},
            },
            makeAuth(uid),
          ),
        ),
        /INVALID_ARGUMENT|Client ID is required/i,
      );
    });

    it("admin with includeHidden includes hidden", async () => {
      const {clientId} = await seedBaseEntities();
      await seedProviderReview({clientId, comment: "Visible"});
      await seedProviderReview({clientId, comment: "Hidden", status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getClientProviderReviews",
            data: {clientId, includeHidden: true},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });

    it("returns empty array when client has no provider reviews", async () => {
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getClientProviderReviews",
            data: {clientId: "noreviews"},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });
  });

  // ==========================================================================
  // 23. getProviderReviewsByProvider
  // ==========================================================================
  describe("getProviderReviewsByProvider", () => {
    it("returns visible provider reviews by provider ID", async () => {
      const {providerId} = await seedBaseEntities();
      await seedProviderReview({providerId, comment: "PR1"});
      await seedProviderReview({providerId, comment: "PR2"});
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getProviderReviewsByProvider",
            data: {providerId, limit: 20, offset: 0},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.length, 2);
    });

    it("rejects missing providerId", async () => {
      const {id: uid} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "getProviderReviewsByProvider",
              data: {},
            },
            makeAuth(uid),
          ),
        ),
        /INVALID_ARGUMENT|Provider ID is required/i,
      );
    });

    it("admin with includeHidden includes hidden", async () => {
      const {providerId} = await seedBaseEntities();
      await seedProviderReview({providerId, comment: "Visible"});
      await seedProviderReview({providerId, comment: "Hidden", status: "Hidden"});
      const admin = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getProviderReviewsByProvider",
            data: {providerId, includeHidden: true},
          },
          makeAuth(admin.id, true),
        ),
      );

      assert.equal(res.data.length, 2);
    });

    it("returns empty array when provider has no provider reviews", async () => {
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getProviderReviewsByProvider",
            data: {providerId: "noreviews"},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.data, []);
    });

    it("excludes hidden reviews by default", async () => {
      const {providerId} = await seedBaseEntities();
      await seedProviderReview({providerId, comment: "Visible"});
      await seedProviderReview({providerId, comment: "Hidden", status: "Hidden"});
      const {id: uid} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "getProviderReviewsByProvider",
            data: {providerId},
          },
          makeAuth(uid),
        ),
      );

      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].comment, "Visible");
    });
  });

  // ==========================================================================
  // 24. Unknown action
  // ==========================================================================
  describe("unknown action", () => {
    it("rejects an unknown action name", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "bogusAction",
            data: {},
          }),
        ),
        /INVALID_ARGUMENT|Unknown action/i,
      );
    });
  });
});
