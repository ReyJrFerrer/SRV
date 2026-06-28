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

// ============================================================================
// Service test seeders
// ============================================================================

/**
 * Build a category object with defaults.
 * @param {Object} overrides
 * @return {Object}
 */
function buildCategory(overrides = {}) {
  const id = overrides.id || `cat-${uniqueId()}`;
  return {
    id,
    name: overrides.name || "Test Category",
    description: "Test category for testing",
    slug: overrides.slug || `test-category-${uniqueId()}`,
    parentId: null,
    imageUrl: "/images/test.jpg",
    ...overrides,
  };
}

/**
 * Seed a category doc.
 * @param {Object} overrides
 * @return {Promise<{id: string}>}
 */
async function seedCategory(overrides = {}) {
  const data = buildCategory(overrides);
  const id = data.id;
  const docData = {...data};
  await db.collection("categories").doc(id).set(docData);
  return {id};
}

/**
 * Seed an archived service with deletion scheduled in the future.
 * @param {Object} overrides
 * @return {Promise<{id: string, providerId: string}>}
 */
async function seedArchivedService(overrides = {}) {
  const providerId = overrides.providerId || `user-${uniqueId()}`;
  const serviceId = overrides.id || `service-archived-${uniqueId()}`;
  const now = new Date();
  const serviceData = {
    ...buildService({providerId, ...overrides}),
    id: serviceId,
    status: "Archived",
    previousStatus: "Available",
    archivedAt: now.toISOString(),
    deletionScheduledAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  delete serviceData.id;
  await db.collection("services").doc(serviceId).set(serviceData);
  return {id: serviceId, providerId};
}

/**
 * Build a valid service location with latitude/longitude format.
 * @param {Object} overrides
 * @return {Object}
 */
function buildServiceLocation(overrides = {}) {
  return {
    latitude: 14.5,
    longitude: 121.0,
    address: "Test Address",
    ...overrides,
  };
}

/**
 * Build a review object with sensible defaults.
 * @param {Object} opts
 * @return {Object}
 */
function buildReview(opts = {}) {
  const now = new Date().toISOString();
  return {
    id: opts.id || `rev-${uniqueId()}`,
    bookingId: opts.bookingId || `bk-${uniqueId()}`,
    clientId: opts.clientId || `user-${uniqueId()}`,
    providerId: opts.providerId || `user-${uniqueId()}`,
    serviceId: opts.serviceId || `service-${uniqueId()}`,
    rating: opts.rating || 5,
    comment: opts.comment || "Great service!",
    status: opts.status || "Visible",
    qualityScore: opts.qualityScore || 0.8,
    createdAt: opts.createdAt || now,
    updatedAt: opts.updatedAt || now,
  };
}

/**
 * Seed a review doc in the `reviews` collection.
 * @param {Object} opts
 * @return {Promise<{id: string}>}
 */
async function seedReview(opts = {}) {
  const data = buildReview(opts);
  const id = data.id;
  const docData = {...data};
  await db.collection("reviews").doc(id).set(docData);
  return {id};
}

/**
 * Build a provider review object with sensible defaults.
 * @param {Object} opts
 * @return {Object}
 */
function buildProviderReview(opts = {}) {
  const now = new Date().toISOString();
  return {
    id: opts.id || `pr-${uniqueId()}`,
    bookingId: opts.bookingId || `bk-${uniqueId()}`,
    clientId: opts.clientId || `user-${uniqueId()}`,
    providerId: opts.providerId || `user-${uniqueId()}`,
    serviceId: opts.serviceId || `service-${uniqueId()}`,
    rating: opts.rating || 5,
    comment: opts.comment || "Great client!",
    status: opts.status || "Visible",
    qualityScore: opts.qualityScore || 0.8,
    reviewType: "ProviderToClient",
    createdAt: opts.createdAt || now,
    updatedAt: opts.updatedAt || now,
  };
}

/**
 * Seed a provider review doc in the `providerReviews` collection.
 * @param {Object} opts
 * @return {Promise<{id: string}>}
 */
async function seedProviderReview(opts = {}) {
  const data = buildProviderReview(opts);
  const id = data.id;
  const docData = {...data};
  await db.collection("providerReviews").doc(id).set(docData);
  return {id};
}

// ============================================================================
// Online project test seeders
// ============================================================================
//
// Scenario-based seeders for online project tests. Each seeder builds a
// complete chain (client + provider + online service + package + reputation)
// and writes the online_projects doc + any subcollection docs in the right
// state, so the calling action has all the data it needs.

/**
 * Build an online service object with the 4 new online-service fields.
 * Mirrors `docs/OnlineService.md` §4.1. Default `serviceMode: "Online"`
 * because most tests target online services.
 * @param {Object} overrides
 * @return {Object}
 */
function buildOnlineService(overrides = {}) {
  return {
    ...buildService(overrides),
    serviceMode: "Online",
    negotiable: false,
    allowsMilestones: false,
    onlineDeliveryFormat: "async",
    ...overrides,
  };
}

/**
 * Build an OnlineProject document with sensible defaults.
 * Field set mirrors `docs/OnlineService.md` §6.2.
 * @param {Object} opts
 * @return {Object}
 */
function buildOnlineProject(opts) {
  const now = new Date().toISOString();
  const base = {
    id: opts.id,
    clientId: opts.clientId,
    providerId: opts.providerId,
    serviceId: opts.serviceId,
    serviceName: opts.serviceName || "Test Online Service",
    serviceCategory: opts.serviceCategory || {
      id: "digital-creative-services",
      name: "Digital & Creative",
      slug: "digital-creative-services",
    },
    packageId: opts.packageId,
    packageType: opts.packageType || "Fixed",
    packageSnapshot: opts.packageSnapshot || {
      title: "Test Package",
      description: "Default test package",
      price: opts.price || 500,
      type: opts.packageType || "Fixed",
      typeFields: {},
    },
    title: opts.title || "Test Online Project",
    description: opts.description || "A test project for online project testing",
    price: opts.price || 500,
    deadline: opts.deadline || futureDate(14),
    milestones: opts.milestones || [],
    briefId: opts.briefId || null,
    status: opts.status,
    revisionsRemaining: opts.revisionsRemaining !== undefined ? opts.revisionsRemaining : 3,
    workStarted: opts.workStarted !== undefined ? opts.workStarted : false,
    conversationId: opts.conversationId || null,
    amountPaid: opts.amountPaid || 0,
    paymentStatus: opts.paymentStatus || "PENDING",
    paymentMethod: opts.paymentMethod || "SRVWallet",
    paymentId: opts.paymentId || null,
    createdAt: opts.createdAt || now,
    updatedAt: opts.updatedAt || now,
  };
  if (opts.acceptedAt) base.acceptedAt = opts.acceptedAt;
  if (opts.completedAt) base.completedAt = opts.completedAt;
  if (opts.cancelledAt) base.cancelledAt = opts.cancelledAt;
  if (opts.declinedAt) base.declinedAt = opts.declinedAt;
  if (opts.disputedAt) base.disputedAt = opts.disputedAt;
  return base;
}

/**
 * Build a Milestone-type ServicePackage with milestones[].
 * Field set mirrors `docs/OnlineService.md` §5.2.
 * @param {Object} overrides
 * @return {Object}
 */
function buildMilestonePackage(overrides = {}) {
  return {
    ...buildServicePackage({
      type: "Milestone",
      ...overrides,
    }),
    milestones: overrides.milestones || [
      {title: "Design", description: "Initial design", dueDateOffsetDays: 7, percentage: 30},
      {title: "Build", description: "Implementation", dueDateOffsetDays: 14, percentage: 50},
      {title: "Deploy", description: "Launch", dueDateOffsetDays: 21, percentage: 20},
    ],
  };
}

/**
 * Build a Session-type ServicePackage with session params.
 * Field set mirrors `docs/OnlineService.md` §5.3.
 * @param {Object} overrides
 * @return {Object}
 */
function buildSessionPackage(overrides = {}) {
  return {
    ...buildServicePackage({
      type: "Session",
      ...overrides,
    }),
    sessionCount: overrides.sessionCount || 5,
    sessionDurationMinutes: overrides.sessionDurationMinutes || 60,
    sessionType: overrides.sessionType || "live",
  };
}

/**
 * Build a milestone object for use inside an OnlineProject.milestones[].
 * @param {Object} opts
 * @return {Object}
 */
function buildOnlineProjectMilestone(opts) {
  return {
    id: opts.id || `ms-${uniqueId()}`,
    title: opts.title || "Test Milestone",
    description: opts.description || "A test milestone",
    dueDate: opts.dueDate || futureDate(7),
    percentage: opts.percentage || 100,
    status: opts.status || "Pending",
    submittedAt: opts.submittedAt || null,
    approvedAt: opts.approvedAt || null,
  };
}

/**
 * Seed a service doc with the online-service fields.
 * @param {Object} overrides
 * @return {Promise<{id: string}>}
 */
async function seedOnlineService(overrides = {}) {
  const id = overrides.id || `service-online-${uniqueId()}`;
  const data = {...buildOnlineService(overrides), id};
  delete data.id;
  await db.collection("services").doc(id).set(data);
  return {id};
}

/**
 * Seed an online project doc.
 * @param {Object} opts
 * @return {Promise<{id: string, projectId: string}>}
 */
async function seedOnlineProject(opts = {}) {
  const projectId = opts.projectId || opts.id || `op-${uniqueId()}`;
  const data = {...buildOnlineProject({...opts, id: projectId})};
  delete data.id;
  await db.collection("online_projects").doc(projectId).set(data);
  return {id: projectId, projectId};
}

/**
 * Seed an online project in Pending status.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectPending(opts = {}) {
  const base = await seedBaseEntities(opts);
  const pkg = await seedServicePackage({
    serviceId: base.serviceId,
    ...opts.package,
  });
  const project = await seedOnlineProject({
    ...opts,
    projectId: opts.projectId,
    clientId: base.clientId,
    providerId: base.providerId,
    serviceId: base.serviceId,
    packageId: pkg.id,
    status: "Pending",
  });
  return {projectId: project.projectId, ...base, packageId: pkg.id};
}

/**
 * Seed an online project in Negotiating status (one Pending offer exists).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectNegotiating(opts = {}) {
  const base = await seedOnlineProjectPending(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Negotiating"});
  await seedNegotiationOffer({
    projectId: base.projectId,
    clientId: base.clientId,
    providerId: base.providerId,
    status: "Pending",
  });
  return base;
}

/**
 * Seed an online project in Active status with `workStarted` false.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectActive(opts = {}) {
  const base = await seedOnlineProjectPending(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Active", acceptedAt: new Date().toISOString()});
  return base;
}

/**
 * Seed an online project in InReview status (workStarted=true, deliverable exists).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectInReview(opts = {}) {
  const base = await seedOnlineProjectActive(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "InReview", workStarted: true});
  await seedDeliverable({
    projectId: base.projectId,
    providerId: base.providerId,
  });
  return base;
}

/**
 * Seed an online project in RevisionsRequested status.
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectRevisionsRequested(opts = {}) {
  const base = await seedOnlineProjectInReview(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "RevisionsRequested"});
  return base;
}

/**
 * Seed an online project in Completed status (terminal, but Disputed is reachable).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectCompleted(opts = {}) {
  const base = await seedOnlineProjectInReview(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Completed", completedAt: new Date().toISOString()});
  return base;
}

/**
 * Seed an online project in Declined status (terminal).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectDeclined(opts = {}) {
  const base = await seedOnlineProjectPending(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Declined", declinedAt: new Date().toISOString()});
  return base;
}

/**
 * Seed an online project in Cancelled status (terminal).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectCancelled(opts = {}) {
  const base = await seedOnlineProjectActive(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Cancelled", cancelledAt: new Date().toISOString()});
  return base;
}

/**
 * Seed an online project in Disputed status (terminal).
 * @param {Object} opts
 * @return {Promise<Object>}
 */
async function seedOnlineProjectDisputed(opts = {}) {
  const base = await seedOnlineProjectCompleted(opts);
  await db.collection("online_projects").doc(base.projectId)
    .update({status: "Disputed", disputedAt: new Date().toISOString()});
  return base;
}

/**
 * Seed a ProjectBrief subcollection doc.
 * Field set mirrors `docs/OnlineService.md` §6.3.
 * @param {Object} opts
 * @return {Promise<{id: string}>}
 */
async function seedBrief(opts = {}) {
  const id = opts.id || `brief-${uniqueId()}`;
  const now = new Date().toISOString();
  const data = {
    projectId: opts.projectId,
    clientId: opts.clientId,
    scope: opts.scope || "Build a website",
    requirements: opts.requirements || "Use React, deploy to Vercel",
    attachments: opts.attachments || [],
    suggestedPrice: opts.suggestedPrice || null,
    suggestedDeadline: opts.suggestedDeadline || null,
    suggestedRevisions: opts.suggestedRevisions || null,
    additionalNotes: opts.additionalNotes || null,
    createdAt: opts.createdAt || now,
    updatedAt: opts.updatedAt || now,
    ...opts.overrides,
  };
  await db.collection("online_projects").doc(opts.projectId)
    .collection("briefs").doc(id).set(data);
  return {id};
}

/**
 * Seed a NegotiationOffer subcollection doc.
 * Field set mirrors `docs/OnlineService.md` §6.4.
 * @param {Object} opts
 * @return {Promise<{id: string}>}
 */
async function seedNegotiationOffer(opts = {}) {
  const id = opts.id || `offer-${uniqueId()}`;
  const now = new Date().toISOString();
  const data = {
    projectId: opts.projectId,
    authorId: opts.authorId || opts.clientId,
    authorRole: opts.authorRole || "client",
    price: opts.price || 500,
    deadline: opts.deadline || futureDate(14),
    scope: opts.scope || "Build a website",
    revisionRounds: opts.revisionRounds !== undefined ? opts.revisionRounds : 3,
    message: opts.message || null,
    status: opts.status || "Pending",
    createdAt: opts.createdAt || now,
    respondedAt: opts.respondedAt || null,
  };
  await db.collection("online_projects").doc(opts.projectId)
    .collection("negotiations").doc(id).set(data);
  return {id};
}

/**
 * Seed a DeliverableSubmission subcollection doc.
 * Field set mirrors `docs/OnlineService.md` §6.5.
 * @param {Object} opts
 * @return {Promise<{id: string}>}
 */
async function seedDeliverable(opts = {}) {
  const id = opts.id || `deliverable-${uniqueId()}`;
  const now = new Date().toISOString();
  const data = {
    projectId: opts.projectId,
    milestoneId: opts.milestoneId || null,
    attachments: opts.attachments || [],
    notes: opts.notes || null,
    submittedAt: opts.submittedAt || now,
    reviewedAt: opts.reviewedAt || null,
    reviewStatus: opts.reviewStatus || "Pending",
    reviewNotes: opts.reviewNotes || null,
  };
  await db.collection("online_projects").doc(opts.projectId)
    .collection("deliverables").doc(id).set(data);
  return {id};
}

module.exports = {
  uniqueId,
  futureDate,
  buildUser,
  buildService,
  buildServicePackage,
  buildBooking,
  buildCategory,
  buildServiceLocation,
  buildReview,
  buildProviderReview,
  buildOnlineService,
  buildOnlineProject,
  buildMilestonePackage,
  buildSessionPackage,
  buildOnlineProjectMilestone,
  seedUser,
  seedService,
  seedServicePackage,
  seedReputation,
  seedBaseEntities,
  seedCategory,
  seedArchivedService,
  seedPendingBooking,
  seedActiveBooking,
  seedInProgressBooking,
  seedCompletedBooking,
  seedDisputedBooking,
  seedDeclinedBooking,
  seedCancelledBooking,
  seedReview,
  seedProviderReview,
  seedOnlineService,
  seedOnlineProject,
  seedOnlineProjectPending,
  seedOnlineProjectNegotiating,
  seedOnlineProjectActive,
  seedOnlineProjectInReview,
  seedOnlineProjectRevisionsRequested,
  seedOnlineProjectCompleted,
  seedOnlineProjectDeclined,
  seedOnlineProjectCancelled,
  seedOnlineProjectDisputed,
  seedBrief,
  seedNegotiationOffer,
  seedDeliverable,
};
