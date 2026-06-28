/**
 * Test seed helpers for booking-related tests.
 *
 * Scenario-based seeders build a complete, valid set of records for a
 * given booking state (Requested, Accepted, InProgress, Completed,
 * Disputed) so tests can call a single function and have all the
 * dependencies the booking action expects.
 *
 * Each seeder returns the IDs of the docs it created, so tests can use
 * them as auth context (e.g. auth as clientId / providerId) and as
 * inputs to booking actions.
 */

const {db} = require("../mocha");

let counter = 0;

/**
 * Generate a unique ID. Combines timestamp + counter + random suffix
 * to avoid collisions within a single test run.
 * @return {string}
 */
function uniqueId() {
  counter += 1;
  return `${Date.now()}-${counter}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Build a base user object with sensible defaults.
 * @param {Object} overrides
 * @return {Object}
 */
function buildUser(overrides = {}) {
  const now = new Date().toISOString();
  return {
    name: "Test User",
    email: `user-${uniqueId()}@test.com`,
    phone: `0912345678${String(Math.floor(Math.random() * 10)).padStart(2, "0")}`,
    createdAt: now,
    updatedAt: now,
    oneSignalPlayerIds: [],
    ...overrides,
  };
}

/**
 * Build a base service object with sensible defaults.
 * @param {Object} overrides
 * @return {Object}
 */
function buildService(overrides = {}) {
  return {
    title: "Test Service",
    description: "A service used for testing",
    category: {id: "test", name: "Test", slug: "test"},
    price: 500,
    location: {
      lat: 14.5995,
      lng: 120.9842,
      address: "Test Address",
      city: "Manila",
      state: "Metro Manila",
      country: "PH",
      postalCode: "1000",
    },
    status: "Available",
    isActive: true,
    imageUrls: [],
    imageMedia: [],
    certificateMedia: [],
    isVerifiedService: false,
    weeklySchedule: null,
    serviceMode: "InPerson",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a service package.
 * @param {Object} overrides
 * @return {Object}
 */
function buildServicePackage(overrides = {}) {
  return {
    title: "Test Package",
    description: "Default test package",
    price: 500,
    type: "Fixed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Seed a user doc.
 * @param {Object} overrides
 * @return {Promise<{id: string}>}
 */
async function seedUser(overrides = {}) {
  const id = overrides.id || `user-${uniqueId()}`;
  const data = {...buildUser(overrides), id};
  delete data.id;
  await db.collection("users").doc(id).set(data);
  return {id};
}

/**
 * Seed a service doc.
 * @param {Object} overrides
 * @return {Promise<{id: string}>}
 */
async function seedService(overrides = {}) {
  const id = overrides.id || `service-${uniqueId()}`;
  const data = {...buildService(overrides), id};
  delete data.id;
  await db.collection("services").doc(id).set(data);
  return {id};
}

/**
 * Seed a service_package doc.
 * @param {Object} overrides
 * @return {Promise<{id: string}>}
 */
async function seedServicePackage(overrides = {}) {
  const id = overrides.id || `pkg-${uniqueId()}`;
  const data = {...buildServicePackage(overrides), id};
  delete data.id;
  await db.collection("service_packages").doc(id).set(data);
  return {id};
}

/**
 * Seed a reputation doc for a user. Without this, checkUserReputationInternal
 * will report a default BASE_SCORE (50) which is above the 5-point gate
 * but we seed it explicitly to make the test scenario deterministic.
 * @param {string} userId
 * @param {Object} overrides
 */
async function seedReputation(userId, overrides = {}) {
  const now = new Date().toISOString();
  const data = {
    userId,
    trustScore: 50,
    trustLevel: "Medium",
    completedBookings: 0,
    averageRating: null,
    detectionFlags: [],
    lastUpdated: now,
    ...overrides,
  };
  await db.collection("reputations").doc(userId).set(data);
}

/**
 * Build a booking object with the given status and timestamps.
 * @param {Object} opts
 * @return {Object}
 */
function buildBooking(opts) {
  const now = new Date().toISOString();
  const base = {
    id: opts.id,
    clientId: opts.clientId,
    providerId: opts.providerId,
    providerName: null,
    serviceId: opts.serviceId,
    servicePackageIds: opts.servicePackageIds || [],
    status: opts.status,
    requestedDate: opts.requestedDate || now,
    scheduledDate: opts.scheduledDate || now,
    startedDate: null,
    completedDate: null,
    price: opts.price || 500,
    amountPaid: opts.amountPaid || null,
    serviceTime: null,
    location: opts.location || {
      lat: 14.5995,
      lng: 120.9842,
      address: "Test Address",
      city: "Manila",
      state: "Metro Manila",
      country: "PH",
      postalCode: "1000",
    },
    evidence: null,
    attachments: [],
    notes: null,
    paymentMethod: opts.paymentMethod || "CashOnHand",
    locationDetection: "manual",
    navigationStartedNotified: false,
    paymentStatus: opts.paymentId ? "PAID_HELD" : "PENDING",
    paymentId: opts.paymentId || null,
    heldAmount: opts.paymentId ? (opts.price || 500) : null,
    releasedAmount: null,
    paymentReleased: null,
    releasedAt: null,
    payoutId: null,
    createdAt: now,
    updatedAt: now,
  };
  if (opts.startedDate) base.startedDate = opts.startedDate;
  if (opts.completedDate) base.completedDate = opts.completedDate;
  if (opts.navigationStartedNotified !== undefined) {
    base.navigationStartedNotified = opts.navigationStartedNotified;
  }
  return base;
}

/**
 * Build the common base (client + provider + service + package) that
 * every booking scenario needs. Seeder functions reuse this.
 * @param {Object} opts
 * @return {Promise<{clientId: string, providerId: string, serviceId: string, packageId: string}>}
 */
async function seedBaseEntities(opts = {}) {
  const client = await seedUser({name: "Test Client", ...opts.client});
  const provider = await seedUser({name: "Test Provider", ...opts.provider});
  const service = await seedService({providerId: provider.id, ...opts.service});
  const pkg = await seedServicePackage({serviceId: service.id, ...opts.package});
  await seedReputation(client.id, opts.clientReputation);
  await seedReputation(provider.id, opts.providerReputation);
  return {
    clientId: client.id,
    providerId: provider.id,
    serviceId: service.id,
    packageId: pkg.id,
  };
}

/**
 * Build a future-dated ISO string N days from now.
 * @param {number} days
 * @return {string}
 */
function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Seed a booking with status "Requested".
 * Returns the IDs of all created docs plus the booking ID.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedPendingBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-pending-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Requested",
    requestedDate: futureDate(1),
    scheduledDate: futureDate(2),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "Accepted".
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedActiveBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-active-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Accepted",
    requestedDate: futureDate(1),
    scheduledDate: futureDate(2),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "InProgress".
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedInProgressBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-inprogress-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "InProgress",
    requestedDate: futureDate(-1),
    scheduledDate: futureDate(-1),
    startedDate: new Date().toISOString(),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "Completed".
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedCompletedBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-completed-${uniqueId()}`;
  const completedDate = new Date().toISOString();
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Completed",
    requestedDate: futureDate(-2),
    scheduledDate: futureDate(-1),
    startedDate: futureDate(-1),
    completedDate,
    amountPaid: 500,
    paymentMethod: "GCash",
    paymentId: opts.paymentId || `pay-${uniqueId()}`,
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "Disputed".
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedDisputedBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-disputed-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Disputed",
    requestedDate: futureDate(-2),
    scheduledDate: futureDate(-1),
    startedDate: futureDate(-1),
    completedDate: futureDate(-1),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "Declined" (terminal).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedDeclinedBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-declined-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Declined",
    requestedDate: futureDate(1),
    scheduledDate: futureDate(2),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

/**
 * Seed a booking with status "Cancelled" (terminal).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedCancelledBooking(opts = {}) {
  const base = await seedBaseEntities(opts);
  const bookingId = opts.bookingId || `bk-cancelled-${uniqueId()}`;
  const booking = buildBooking({
    id: bookingId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    servicePackageIds: [base.packageId],
    status: "Cancelled",
    requestedDate: futureDate(1),
    scheduledDate: futureDate(2),
    cancelReason: "Test cancellation",
    cancelledBy: "Client",
    cancelledAt: new Date().toISOString(),
  });
  await db.collection("bookings").doc(bookingId).set(booking);
  return {bookingId, ...base};
}

module.exports = {
  uniqueId,
  futureDate,
  buildUser,
  buildService,
  buildServicePackage,
  buildBooking,
  seedUser,
  seedService,
  seedServicePackage,
  seedReputation,
  seedBaseEntities,
  seedPendingBooking,
  seedActiveBooking,
  seedInProgressBooking,
  seedCompletedBooking,
  seedDisputedBooking,
  seedDeclinedBooking,
  seedCancelledBooking,
};
