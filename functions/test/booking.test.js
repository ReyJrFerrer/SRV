/**
 * Integration tests for functions/src/booking.js — 17 action cases
 * routed through the `bookingAction` callable.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Each action is tested with:
 *   - Happy path: correct status transition + side effects (notifications, etc.)
 *   - Auth errors: missing/unauthorized caller
 *   - Validation errors: missing/invalid args
 *   - State-machine errors: invalid status transitions
 *
 * Side-effect assertions verify that notification docs are created in
 * Firestore and that reputation changes are persisted (full integration
 * with notification.js and reputation.js).
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {
  seedPendingBooking,
  seedActiveBooking,
  seedInProgressBooking,
  seedCompletedBooking,
  seedDisputedBooking,
  seedDeclinedBooking,
  seedCancelledBooking,
  futureDate,
  seedService,
  seedUser,
  seedServicePackage,
  seedReputation,
  uniqueId,
} = require("./helpers/seed");

const myFunctions = require("../src/booking");
const wrapped = test.wrap(myFunctions.bookingAction);

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

describe("bookingAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // 1. createBooking
  // ==========================================================================
  describe("createBooking", () => {
    it("creates a Requested booking and notifies the provider", async () => {
      const {clientId, providerId, serviceId, packageId} = await seedBaseReady();
      const res = await wrapped(
        makeRequest(
          {
            action: "createBooking",
            data: {
              serviceId,
              providerId,
              price: 500,
              location: {lat: 14.5, lng: 121, address: "Test"},
              requestedDate: futureDate(1),
              scheduledDate: futureDate(2),
              paymentMethod: "CashOnHand",
              servicePackageIds: [packageId],
              notes: "Please be on time",
            },
          },
          makeAuth(clientId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.data.status, "Requested");
      assert.equal(res.data.clientId, clientId);
      assert.equal(res.data.providerId, providerId);
      assert.equal(res.data.price, 500);
      assert.equal(res.data.notes, "Please be on time");

      const notif = await db.collection("notifications")
        .where("userId", "==", providerId)
        .where("notificationType", "==", "new_booking_request")
        .get();
      assert.equal(notif.size, 1, "Expected one notification for the provider");
    });

    it("rejects unauthenticated callers", async () => {
      const {serviceId, providerId, packageId} = await seedBaseReady();
      await assert.rejects(
        wrapped(
          makeRequest({
            action: "createBooking",
            data: {
              serviceId,
              providerId,
              price: 500,
              location: {lat: 14.5, lng: 121, address: "Test"},
              requestedDate: futureDate(1),
              scheduledDate: futureDate(2),
              paymentMethod: "CashOnHand",
              servicePackageIds: [packageId],
            },
          }),
        ),
        /User must be authenticated/i,
      );
    });

    it("rejects when client reputation is at or below 5", async () => {
      const {clientId, providerId, serviceId, packageId} = await seedBaseReady();
      await seedReputation(clientId, {trustScore: 5});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createBooking",
              data: {
                serviceId,
                providerId,
                price: 500,
                location: {lat: 14.5, lng: 121, address: "Test"},
                requestedDate: futureDate(1),
                scheduledDate: futureDate(2),
                paymentMethod: "CashOnHand",
                servicePackageIds: [packageId],
              },
            },
            makeAuth(clientId),
          ),
        ),
        /PRECONDITION_FAILED|reputation/i,
      );
    });

    it("rejects an unknown service ID", async () => {
      const {clientId, providerId, packageId} = await seedBaseReady();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createBooking",
              data: {
                serviceId: "nonexistent-service",
                providerId,
                price: 500,
                location: {lat: 14.5, lng: 121, address: "Test"},
                requestedDate: futureDate(1),
                scheduledDate: futureDate(2),
                paymentMethod: "CashOnHand",
                servicePackageIds: [packageId],
              },
            },
            makeAuth(clientId),
          ),
        ),
        /NOT_FOUND|not.found/i,
      );
    });
  });

  // ==========================================================================
  // 2. acceptBooking
  // ==========================================================================
  describe("acceptBooking", () => {
    it("transitions Requested -> Accepted and notifies the client", async () => {
      const {bookingId, clientId, providerId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {
            action: "acceptBooking",
            data: {bookingId, scheduledDate: futureDate(2)},
          },
          makeAuth(providerId),
        ),
      );

      assert.equal(res.data.status, "Accepted");
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.status, "Accepted");

      const notif = await db.collection("notifications")
        .where("userId", "==", clientId)
        .where("notificationType", "==", "booking_accepted")
        .get();
      assert.equal(notif.size, 1, "Expected one client notification");
    });

    it("rejects when caller is not the provider", async () => {
      const {bookingId, clientId} = await seedPendingBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptBooking", data: {bookingId, scheduledDate: futureDate(2)}},
            makeAuth(clientId),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });

    it("rejects invalid transition from a terminal state", async () => {
      const {bookingId, providerId} = await seedCancelledBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "acceptBooking", data: {bookingId, scheduledDate: futureDate(2)}},
            makeAuth(providerId),
          ),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });
  });

  // ==========================================================================
  // 3. declineBooking
  // ==========================================================================
  describe("declineBooking", () => {
    it("transitions Requested -> Declined (terminal) and notifies the client", async () => {
      const {bookingId, clientId, providerId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "declineBooking", data: {bookingId}},
          makeAuth(providerId),
        ),
      );

      assert.equal(res.data.status, "Declined");
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.status, "Declined");

      const notif = await db.collection("notifications")
        .where("userId", "==", clientId)
        .where("notificationType", "==", "booking_declined")
        .get();
      assert.equal(notif.size, 1);
    });

    it("rejects invalid transition from InProgress", async () => {
      const {bookingId, providerId} = await seedInProgressBooking();
      await assert.rejects(
        wrapped(
          makeRequest({action: "declineBooking", data: {bookingId}}, makeAuth(providerId)),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });
  });

  // ==========================================================================
  // 4. startNavigation
  // ==========================================================================
  describe("startNavigation", () => {
    it("marks navigation started and notifies the client (status-neutral)", async () => {
      const {bookingId, clientId, providerId} = await seedActiveBooking();
      const res = await wrapped(
        makeRequest(
          {action: "startNavigation", data: {bookingId}},
          makeAuth(providerId),
        ),
      );

      assert.equal(res.success, true);
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.navigationStartedNotified, true);
      // status should remain Accepted
      assert.equal(fresh.status, "Accepted");

      const notif = await db.collection("notifications")
        .where("userId", "==", clientId)
        .where("notificationType", "==", "start_navigation")
        .get();
      assert.equal(notif.size, 1);
    });

    it("is idempotent — second call does not create another notification", async () => {
      const {bookingId, providerId} = await seedActiveBooking();
      await wrapped(
        makeRequest({action: "startNavigation", data: {bookingId}}, makeAuth(providerId)),
      );
      await wrapped(
        makeRequest({action: "startNavigation", data: {bookingId}}, makeAuth(providerId)),
      );
      const notifs = await db.collection("notifications")
        .where("notificationType", "==", "start_navigation")
        .get();
      assert.equal(notifs.size, 1);
    });

    it("rejects when caller is not the provider", async () => {
      const {bookingId, clientId} = await seedActiveBooking();
      await assert.rejects(
        wrapped(
          makeRequest({action: "startNavigation", data: {bookingId}}, makeAuth(clientId)),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 5. startBooking
  // ==========================================================================
  describe("startBooking", () => {
    it("transitions Accepted -> InProgress and notifies the client", async () => {
      const {bookingId, clientId, providerId} = await seedActiveBooking();
      const res = await wrapped(
        makeRequest(
          {action: "startBooking", data: {bookingId}},
          makeAuth(providerId),
        ),
      );

      assert.equal(res.data.status, "InProgress");
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(typeof fresh.startedDate, "string");

      const notif = await db.collection("notifications")
        .where("userId", "==", clientId)
        .where("notificationType", "==", "start_service")
        .get();
      assert.equal(notif.size, 1);
    });

    it("rejects invalid transition from Requested", async () => {
      const {bookingId, providerId} = await seedPendingBooking();
      await assert.rejects(
        wrapped(
          makeRequest({action: "startBooking", data: {bookingId}}, makeAuth(providerId)),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });
  });

  // ==========================================================================
  // 6. completeBooking
  // ==========================================================================
  describe("completeBooking", () => {
    it("transitions InProgress -> Completed and sends 3 notifications", async () => {
      const {bookingId, providerId} = await seedInProgressBooking();
      const res = await wrapped(
        makeRequest(
          {action: "completeBooking", data: {bookingId}},
          makeAuth(providerId),
        ),
      );

      assert.equal(res.data.status, "Completed");
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(typeof fresh.completedDate, "string");

      // 3 notifications: BOOKING_COMPLETED + REVIEW_REMINDER (to client),
      // REVIEW_REQUEST (to provider).
      const allNotifs = await db.collection("notifications").get();
      const types = allNotifs.docs.map((d) => d.data().notificationType);
      assert.ok(types.includes("booking_completed"), "Expected booking_completed notif");
      assert.ok(types.includes("review_reminder"), "Expected review_reminder notif");
      assert.ok(types.includes("review_request"), "Expected review_request notif");
    });

    it("rejects when caller is the client", async () => {
      const {bookingId, clientId} = await seedInProgressBooking();
      await assert.rejects(
        wrapped(
          makeRequest({action: "completeBooking", data: {bookingId}}, makeAuth(clientId)),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 7. cancelBooking
  // ==========================================================================
  describe("cancelBooking", () => {
    it("transitions to Cancelled, deducts reputation, creates a report", async () => {
      const {bookingId, clientId, providerId} = await seedActiveBooking();
      const beforeRep = await fetchDoc("reputations", clientId);
      const initialScore = beforeRep.trustScore;

      const res = await wrapped(
        makeRequest(
          {
            action: "cancelBooking",
            data: {bookingId, cancelReason: "Changed my mind"},
          },
          makeAuth(clientId),
        ),
      );

      assert.equal(res.data.status, "Cancelled");
      assert.equal(res.data.cancelReason, "Changed my mind");
      assert.equal(res.data.cancelledBy, "Client");

      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.status, "Cancelled");

      // Reputation should be deducted (5 points) per CANCELLATION_PENALTY
      const afterRep = await fetchDoc("reputations", clientId);
      assert.equal(afterRep.trustScore, initialScore - 5);

      // Report doc should be created
      const reports = await db.collection("reports").get();
      assert.equal(reports.size, 1);
      assert.equal(reports.docs[0].data().userId, clientId);

      // Notification should be sent to the provider (the other party)
      const notif = await db.collection("notifications")
        .where("userId", "==", providerId)
        .where("notificationType", "==", "booking_cancelled")
        .get();
      assert.equal(notif.size, 1);
    });

    it("rejects cancellation without a reason", async () => {
      const {bookingId, clientId} = await seedActiveBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelBooking", data: {bookingId}},
            makeAuth(clientId),
          ),
        ),
        /INVALID_ARGUMENT|reason/i,
      );
    });

    it("rejects cancellation from a terminal state", async () => {
      const {bookingId, clientId} = await seedCompletedBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelBooking", data: {bookingId, cancelReason: "Too late"}},
            makeAuth(clientId),
          ),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });

    it("rejects when caller is neither client nor provider", async () => {
      const {bookingId} = await seedActiveBooking();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "cancelBooking", data: {bookingId, cancelReason: "Hijack"}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 8. getBooking
  // ==========================================================================
  describe("getBooking", () => {
    it("returns the booking to the client", async () => {
      const {bookingId, clientId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getBooking", data: {bookingId}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.data.id, bookingId);
    });

    it("returns the booking to the provider", async () => {
      const {bookingId, providerId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getBooking", data: {bookingId}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.data.id, bookingId);
    });

    it("returns the booking to an admin", async () => {
      const {bookingId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getBooking", data: {bookingId}},
          makeAuth("admin-1", true),
        ),
      );
      assert.equal(res.data.id, bookingId);
    });

    it("rejects a third party", async () => {
      const {bookingId} = await seedPendingBooking();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getBooking", data: {bookingId}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 9. getClientBookings
  // ==========================================================================
  describe("getClientBookings", () => {
    it("returns bookings belonging to the authenticated client", async () => {
      const {bookingId, clientId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getClientBookings", data: {}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].id, bookingId);
    });

    it("rejects querying another client's bookings without admin", async () => {
      await seedPendingBooking();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getClientBookings", data: {clientId: "someone-else"}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 10. getProviderBookings
  // ==========================================================================
  describe("getProviderBookings", () => {
    it("returns bookings belonging to the authenticated provider", async () => {
      const {bookingId, providerId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getProviderBookings", data: {}},
          makeAuth(providerId),
        ),
      );
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].id, bookingId);
    });

    it("rejects non-admin querying another provider's bookings", async () => {
      await seedPendingBooking();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getProviderBookings", data: {providerId: "someone-else"}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 11. getBookingsByStatus
  // ==========================================================================
  describe("getBookingsByStatus", () => {
    it("returns only bookings with the given status when called by admin", async () => {
      await seedPendingBooking();
      await seedDeclinedBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getBookingsByStatus", data: {status: "Requested"}},
          makeAuth("admin-1", true),
        ),
      );
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].status, "Requested");
    });

    it("rejects non-admin callers", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getBookingsByStatus", data: {status: "Requested"}},
            makeAuth("user-1"),
          ),
        ),
        /PERMISSION_DENIED|Admin access required/i,
      );
    });
  });

  // ==========================================================================
  // 12. disputeBooking
  // ==========================================================================
  describe("disputeBooking", () => {
    it("transitions Completed -> Disputed and notifies the other party", async () => {
      const {bookingId, clientId, providerId} = await seedCompletedBooking();
      const res = await wrapped(
        makeRequest(
          {action: "disputeBooking", data: {bookingId}},
          makeAuth(clientId),
        ),
      );

      assert.equal(res.data.status, "Disputed");
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.status, "Disputed");

      const notif = await db.collection("notifications")
        .where("userId", "==", providerId)
        .get();
      assert.ok(notif.size >= 1, "Expected at least one notification to the provider");
    });

    it("rejects invalid transition from Requested", async () => {
      const {bookingId, clientId} = await seedPendingBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeBooking", data: {bookingId}},
            makeAuth(clientId),
          ),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });

    it("rejects dispute from an already-Disputed booking (terminal state)", async () => {
      const {bookingId, clientId} = await seedDisputedBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "disputeBooking", data: {bookingId}},
            makeAuth(clientId),
          ),
        ),
        /PRECONDITION_FAILED|Invalid status transition/i,
      );
    });
  });

  // ==========================================================================
  // 13. checkServiceAvailability
  // ==========================================================================
  describe("checkServiceAvailability", () => {
    it("returns available=true for an active service with no conflicts", async () => {
      const {serviceId, clientId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {
            action: "checkServiceAvailability",
            data: {serviceId, requestedDateTime: futureDate(5)},
          },
          makeAuth(clientId),
        ),
      );
      assert.equal(res.data.available, true);
    });

    it("returns available=false for an inactive service", async () => {
      const {id: providerId} = await seedUser();
      const service = await seedService({providerId, status: "Archived", isActive: false});
      const res = await wrapped(
        makeRequest(
          {
            action: "checkServiceAvailability",
            data: {serviceId: service.id, requestedDateTime: futureDate(5)},
          },
          makeAuth("any-user"),
        ),
      );
      assert.equal(res.data.available, false);
    });
  });

  // ==========================================================================
  // 14. getServiceAvailableSlots
  // ==========================================================================
  describe("getServiceAvailableSlots", () => {
    it("returns slots for a service with a weekly schedule", async () => {
      const {id: providerId} = await seedUser();
      const serviceId = `service-${uniqueId()}`;
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"][new Date().getDay()];
      await seedService({
        id: serviceId,
        providerId,
        weeklySchedule: [{
          day: dayName,
          availability: {
            isAvailable: true,
            slots: [{startTime: "09:00", endTime: "17:00"}],
          },
        }],
      });
      const res = await wrapped(
        makeRequest(
          {
            action: "getServiceAvailableSlots",
            data: {serviceId, date: new Date().toISOString()},
          },
          makeAuth("any-user"),
        ),
      );
      assert.ok(res.data.length >= 1);
      assert.equal(res.data[0].timeSlot.startTime, "09:00");
    });

    it("returns empty list when no schedule is set", async () => {
      const {serviceId} = await seedPendingBooking();
      const res = await wrapped(
        makeRequest(
          {
            action: "getServiceAvailableSlots",
            data: {serviceId, date: new Date().toISOString()},
          },
          makeAuth("any-user"),
        ),
      );
      assert.deepEqual(res.data, []);
    });
  });

  // ==========================================================================
  // 15. getClientAnalytics
  // ==========================================================================
  describe("getClientAnalytics", () => {
    it("returns analytics for the authenticated client", async () => {
      const {clientId} = await seedCompletedBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getClientAnalytics", data: {}},
          makeAuth(clientId),
        ),
      );
      assert.equal(res.data.clientId, clientId);
      assert.equal(res.data.totalBookings, 1);
      assert.equal(res.data.servicesCompleted, 1);
      assert.equal(res.data.totalSpent, 500);
    });

    it("rejects non-admin querying another client's analytics", async () => {
      await seedCompletedBooking();
      const stranger = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getClientAnalytics", data: {clientId: "other-user"}},
            makeAuth(stranger.id),
          ),
        ),
        /PERMISSION_DENIED|not authorized/i,
      );
    });
  });

  // ==========================================================================
  // 16. getProviderAnalytics
  // ==========================================================================
  describe("getProviderAnalytics", () => {
    it("returns provider analytics when called by admin", async () => {
      const {providerId} = await seedCompletedBooking();
      const res = await wrapped(
        makeRequest(
          {action: "getProviderAnalytics", data: {providerId}},
          makeAuth("admin-1", true),
        ),
      );
      assert.equal(res.data.providerId, providerId);
      assert.equal(res.data.completedJobs, 1);
    });

    it("rejects non-admin callers", async () => {
      const {providerId} = await seedCompletedBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getProviderAnalytics", data: {providerId}},
            makeAuth("user-1"),
          ),
        ),
        /PERMISSION_DENIED|ADMIN/i,
      );
    });
  });

  // ==========================================================================
  // 17. releasePayment
  // ==========================================================================
  describe("releasePayment", () => {
    it("releases payment for a Completed GCash booking and writes an audit trail", async () => {
      const {bookingId, providerId} = await seedCompletedBooking();
      const res = await wrapped(
        makeRequest(
          {
            action: "releasePayment",
            data: {
              bookingId,
              releasedAmount: 450,
              commissionRetained: 50,
            },
          },
          makeAuth("admin-1", true),
        ),
      );

      assert.equal(res.data.paymentStatus, "RELEASED");
      assert.equal(res.data.paymentReleased, true);
      const fresh = await fetchDoc("bookings", bookingId);
      assert.equal(fresh.paymentStatus, "RELEASED");
      assert.equal(fresh.releasedAmount, 450);

      const audit = await db.collection("paymentAuditTrail").get();
      assert.equal(audit.size, 1);
      assert.equal(audit.docs[0].data().action, "PAYMENT_RELEASED");

      const notif = await db.collection("notifications")
        .where("userId", "==", providerId)
        .where("notificationType", "==", "payment_received")
        .get();
      assert.equal(notif.size, 1);
    });

    it("rejects release for a non-Completed booking", async () => {
      const {bookingId} = await seedInProgressBooking();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "releasePayment",
              data: {bookingId, releasedAmount: 100, commissionRetained: 0},
            },
            makeAuth("admin-1", true),
          ),
        ),
        /PRECONDITION_FAILED|only be released for completed/i,
      );
    });

    it("rejects release for CashOnHand bookings", async () => {
      const {clientId, providerId, serviceId, packageId} = await seedBaseReady();
      const bookingId = `bk-cash-${uniqueId()}`;
      await db.collection("bookings").doc(bookingId).set({
        id: bookingId,
        clientId,
        providerId,
        serviceId,
        servicePackageIds: [packageId],
        status: "Completed",
        requestedDate: futureDate(-1),
        scheduledDate: futureDate(-1),
        startedDate: futureDate(-1),
        completedDate: new Date().toISOString(),
        price: 500,
        amountPaid: 500,
        paymentMethod: "CashOnHand",
        paymentStatus: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        location: {lat: 14.5, lng: 121, address: "Test"},
        attachments: [],
        notes: null,
        locationDetection: "manual",
      });

      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "releasePayment",
              data: {bookingId, releasedAmount: 500, commissionRetained: 0},
            },
            makeAuth("admin-1", true),
          ),
        ),
        /PRECONDITION_FAILED|Cash payments do not require release/i,
      );
    });
  });
});

// ---------------------------------------------------------------------------
/**
 * Helper used by createBooking + a few other tests. Seeds the standard
 * base entities (client, provider, service, package, both reputations)
 * needed before any booking action that requires the full chain.
 * @return {Promise<{clientId: string, providerId: string,
 *                  serviceId: string, packageId: string}>}
 */
async function seedBaseReady() {
  const client = await seedUser({name: "Test Client"});
  const provider = await seedUser({name: "Test Provider"});
  const service = await seedService({providerId: provider.id});
  const pkg = await seedServicePackage({serviceId: service.id});
  await seedReputation(client.id, {trustScore: 50});
  await seedReputation(provider.id, {trustScore: 50});
  return {
    clientId: client.id,
    providerId: provider.id,
    serviceId: service.id,
    packageId: pkg.id,
  };
}
