/**
 * Integration tests for functions/src/service.js — ~30 action cases
 * routed through the `serviceAction` callable.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Each action is tested with:
 *   - Happy path: correct result + side effects
 *   - Auth errors: missing/unauthorized caller
 *   - Validation errors: missing/invalid args
 *   - State-machine errors: invalid transitions
 *   - Empty results / not-found paths
 *
 * Total test cases: ~210
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {
  seedUser,
  seedService,
  seedServicePackage,
  seedCategory,
  seedArchivedService,
  seedBaseEntities,
  buildServiceLocation,
  uniqueId,
} = require("./helpers/seed");

const myFunctions = require("../src/service");
const wrapped = test.wrap(myFunctions.serviceAction);

function makeRequest(payload, auth) {
  return {
    data: payload,
    auth: auth || null,
  };
}

function makeAuth(uid, isAdmin = false) {
  return {
    uid,
    token: {isAdmin},
  };
}

async function fetchDoc(collection, docId) {
  const snap = await db.collection(collection).doc(docId).get();
  assert.equal(snap.exists, true, `Expected doc ${collection}/${docId} to exist`);
  return snap.data();
}

const TEST_IMAGE = {fileName: "t.jpg", contentType: "image/jpeg", fileData: "dGVzdA=="};
const TEST_CERT = {fileName: "c.pdf", contentType: "application/pdf", fileData: "dGVzdA=="};

function baseServicePayload(overrides = {}) {
  return {
    title: "Professional Plumbing Service",
    description: "Expert plumbing repair and installation services",
    categoryId: "cat-test-1",
    price: 500,
    location: buildServiceLocation(),
    weeklySchedule: null,
    instantBookingEnabled: false,
    bookingNoticeHours: 24,
    maxBookingsPerDay: 5,
    serviceImages: [],
    serviceCertificates: [],
    ...overrides,
  };
}

describe("serviceAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // A. Service CRUD
  // ==========================================================================

  describe("createService", () => {
    it("creates a service with valid data", async () => {
      const provider = await seedUser({name: "Test Provider"});
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      const payload = baseServicePayload();
      const res = await wrapped(
        makeRequest({action: "createService", data: payload}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.title, payload.title);
      assert.equal(res.service.description, payload.description);
      assert.equal(res.service.price, payload.price);
      assert.equal(res.service.status, "Available");
      assert.equal(res.service.providerId, provider.id);
      assert.equal(res.service.rating, null);
      assert.equal(res.service.reviewCount, 0);
      assert.equal(res.service.isVerifiedService, false);
      assert.ok(res.service.id);
      const saved = await fetchDoc("services", res.service.id);
      assert.equal(saved.title, payload.title);
    });

    it("rejects unauthenticated callers", async () => {
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(makeRequest({action: "createService", data: baseServicePayload()})),
        /User must be authenticated/i,
      );
    });

    it("rejects missing title", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({title: ""})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|title.*characters/i,
      );
    });

    it("rejects missing description", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({description: ""})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|description must be between/i,
      );
    });

    it("rejects invalid price (zero)", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({price: 0})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|price.*between/i,
      );
    });

    it("rejects invalid price (exceeds max)", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({price: 1000001})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|price.*between/i,
      );
    });

    it("rejects invalid location (missing address)", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createService", data: baseServicePayload({location: {latitude: 14.5, longitude: 121.0, address: ""}})},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid location/i,
      );
    });

    it("rejects nonexistent categoryId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({categoryId: "nonexistent-cat"})}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|category not found/i,
      );
    });

    it("rejects when images exceed MAX_SERVICE_IMAGES", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      const images = Array.from({length: 11}, (_, i) => ({
        fileName: `img${i}.jpg`,
        contentType: "image/jpeg",
        fileData: "dGVzdA==",
      }));
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({serviceImages: images})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Maximum.*images allowed/i,
      );
    });

    it("rejects when certificates exceed MAX_SERVICE_CERTIFICATES", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-test-1", name: "Plumbing", slug: "plumbing"});
      const certs = Array.from({length: 11}, (_, i) => ({
        fileName: `cert${i}.pdf`,
        contentType: "application/pdf",
        fileData: "dGVzdA==",
      }));
      await assert.rejects(
        wrapped(
          makeRequest({action: "createService", data: baseServicePayload({serviceCertificates: certs})}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Maximum.*certificates allowed/i,
      );
    });
  });

  describe("getService", () => {
    it("returns a service by ID", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, title: "Test Service"});
      const res = await wrapped(
        makeRequest({action: "getService", data: {serviceId: svc.id}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.title, "Test Service");
    });

    it("rejects missing serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getService", data: {}})),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getService", data: {serviceId: "nonexistent-svc"}})),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  describe("getServicesByProvider", () => {
    it("returns all services for a provider", async () => {
      const provider = await seedUser();
      await seedService({providerId: provider.id, title: "Svc A"});
      await seedService({providerId: provider.id, title: "Svc B"});
      const res = await wrapped(
        makeRequest({action: "getServicesByProvider", data: {providerId: provider.id}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.services.length, 2);
    });

    it("rejects missing providerId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServicesByProvider", data: {}})),
        /INVALID_ARGUMENT|Provider ID is required/i,
      );
    });

    it("returns empty array when provider has no services", async () => {
      const res = await wrapped(
        makeRequest({action: "getServicesByProvider", data: {providerId: "no-services-provider"}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.services, []);
    });
  });

  describe("getServicesByCategory", () => {
    it("returns services filtered by category", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-a", name: "A", slug: "a"});
      await seedService({providerId: provider.id, category: {id: "cat-a", name: "A", slug: "a"}, title: "Svc A"});
      await seedService({providerId: provider.id, category: {id: "cat-b", name: "B", slug: "b"}, title: "Svc B"});
      const res = await wrapped(
        makeRequest({action: "getServicesByCategory", data: {categoryId: "cat-a"}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.services.length, 1);
      assert.equal(res.services[0].title, "Svc A");
    });

    it("rejects missing categoryId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServicesByCategory", data: {}})),
        /INVALID_ARGUMENT|Category ID is required/i,
      );
    });

    it("rejects nonexistent categoryId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServicesByCategory", data: {categoryId: "nonexistent-cat"}})),
        /NOT_FOUND|Service category not found/i,
      );
    });

    it("returns empty array when category has no services", async () => {
      await seedCategory({id: "cat-empty", name: "Empty", slug: "empty"});
      const res = await wrapped(
        makeRequest({action: "getServicesByCategory", data: {categoryId: "cat-empty"}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.services, []);
    });
  });

  describe("getAllServices", () => {
    it("returns all non-archived, non-deleted services", async () => {
      const provider = await seedUser();
      await seedService({providerId: provider.id, title: "Svc A"});
      await seedService({providerId: provider.id, title: "Svc B"});
      const res = await wrapped(makeRequest({action: "getAllServices"}));
      assert.equal(res.success, true);
      assert.equal(res.services.length, 2);
    });

    it("excludes archived services", async () => {
      const provider = await seedUser();
      await seedService({providerId: provider.id, title: "Active"});
      await seedArchivedService({providerId: provider.id});
      const res = await wrapped(makeRequest({action: "getAllServices"}));
      assert.equal(res.success, true);
      assert.equal(res.services.length, 1);
      assert.equal(res.services[0].title, "Active");
    });

    it("returns empty array when no services exist", async () => {
      const res = await wrapped(makeRequest({action: "getAllServices"}));
      assert.equal(res.success, true);
      assert.deepEqual(res.services, []);
    });
  });

  // ==========================================================================
  // B. Service Status & Lifecycle
  // ==========================================================================

  describe("updateServiceStatus", () => {
    it("updates status to Suspended", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      const res = await wrapped(
        makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "Suspended"}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.status, "Suspended");
    });

    it("updates status to Unavailable", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      const res = await wrapped(
        makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "Unavailable"}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.status, "Unavailable");
    });

    it("allows admin to update status", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      const res = await wrapped(
        makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "Suspended"}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.status, "Suspended");
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "Suspended"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects stranger (not owner, not admin)", async () => {
      const provider = await seedUser();
      const stranger = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "Suspended"}}, makeAuth(stranger.id)),
        ),
        /PERMISSION_DENIED|service provider or admin/i,
      );
    });

    it("rejects missing serviceId or status", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServiceStatus", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID and status are required/i,
      );
    });

    it("rejects invalid status value", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServiceStatus", data: {serviceId: svc.id, status: "InvalidStatus"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Invalid status/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServiceStatus", data: {serviceId: "nonexistent-svc", status: "Suspended"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  describe("archiveService", () => {
    it("archives a service with 30-day deletion schedule", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      const res = await wrapped(
        makeRequest({action: "archiveService", data: {serviceId: svc.id}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      const saved = await fetchDoc("services", svc.id);
      assert.equal(saved.status, "Archived");
      assert.equal(saved.previousStatus, "Available");
      assert.ok(saved.archivedAt);
      assert.ok(saved.deletionScheduledAt);
    });

    it("allows admin to archive", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "archiveService", data: {serviceId: svc.id}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "archiveService", data: {serviceId: svc.id}})),
        /User must be authenticated/i,
      );
    });

    it("rejects stranger", async () => {
      const provider = await seedUser();
      const stranger = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "archiveService", data: {serviceId: svc.id}}, makeAuth(stranger.id)),
        ),
        /PERMISSION_DENIED|service provider|admin|admins|Not authorized/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "archiveService", data: {}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "archiveService", data: {serviceId: "nonexistent-svc"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  describe("restoreService", () => {
    it("restores an archived service", async () => {
      const provider = await seedUser();
      const svc = await seedArchivedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "restoreService", data: {serviceId: svc.id}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      const saved = await fetchDoc("services", svc.id);
      assert.equal(saved.status, "Available");
      assert.equal(saved.archivedAt, undefined);
      assert.equal(saved.deletionScheduledAt, undefined);
      assert.equal(saved.previousStatus, undefined);
    });

    it("allows admin to restore", async () => {
      const provider = await seedUser();
      const svc = await seedArchivedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "restoreService", data: {serviceId: svc.id}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedArchivedService();
      await assert.rejects(
        wrapped(makeRequest({action: "restoreService", data: {serviceId: svc.id}})),
        /User must be authenticated/i,
      );
    });

    it("rejects stranger", async () => {
      const provider = await seedUser();
      const stranger = await seedUser();
      const svc = await seedArchivedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "restoreService", data: {serviceId: svc.id}}, makeAuth(stranger.id)),
        ),
        /PERMISSION_DENIED|service provider|admin|admins|Not authorized/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "restoreService", data: {}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "restoreService", data: {serviceId: "nonexistent-svc"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects if service is not archived", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "restoreService", data: {serviceId: svc.id}}, makeAuth(provider.id)),
        ),
        /PRECONDITION_FAILED|Service is not archived/i,
      );
    });
  });

  describe("permanentDeleteService", () => {
    it("permanently deletes a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "permanentDeleteService", data: {serviceId: svc.id}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      const snap = await db.collection("services").doc(svc.id).get();
      assert.equal(snap.exists, false);
    });

    it("marks associated bookings as serviceDeleted", async () => {
      const base = await seedBaseEntities();
      const bookingId = `bk-${uniqueId()}`;
      await db.collection("bookings").doc(bookingId).set({
        id: bookingId,
        clientId: base.clientId,
        providerId: base.providerId,
        serviceId: base.serviceId,
        status: "Completed",
        price: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const res = await wrapped(
        makeRequest({action: "permanentDeleteService", data: {serviceId: base.serviceId}}, makeAuth(base.providerId)),
      );
      assert.equal(res.success, true);
      const booking = await fetchDoc("bookings", bookingId);
      assert.equal(booking.serviceDeleted, true);
    });

    it("allows admin to delete", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "permanentDeleteService", data: {serviceId: svc.id}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "permanentDeleteService", data: {serviceId: svc.id}})),
        /User must be authenticated/i,
      );
    });

    it("rejects stranger", async () => {
      const provider = await seedUser();
      const stranger = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "permanentDeleteService", data: {serviceId: svc.id}}, makeAuth(stranger.id)),
        ),
        /PERMISSION_DENIED|service provider|admin|admins|Not authorized/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "permanentDeleteService", data: {}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "permanentDeleteService", data: {serviceId: "nonexistent-svc"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  // ==========================================================================
  // C. Image Management
  // ==========================================================================

  describe("uploadServiceImages", () => {
    it("uploads images to a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, imageMedia: [], imageUrls: []});
      const images = [{
        fileName: "test.jpg",
        contentType: "image/jpeg",
        fileData: Buffer.from("fake-image-data").toString("base64"),
      }];
      const res = await wrapped(
        makeRequest({action: "uploadServiceImages", data: {serviceId: svc.id, serviceImages: images}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.ok(res.service.imageUrls.length >= 1);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest(
          {action: "uploadServiceImages", data: {serviceId: svc.id, serviceImages: [TEST_IMAGE]}},
        )),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceImages", data: {serviceId: svc.id, serviceImages: [TEST_IMAGE]}},
            makeAuth(wrongUser.id),
          ),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing serviceId or images", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "uploadServiceImages", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID and images are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceImages", data: {serviceId: "nonexistent-svc", serviceImages: [TEST_IMAGE]}},
            makeAuth(provider.id),
          ),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects when exceeding MAX_SERVICE_IMAGES", async () => {
      const provider = await seedUser();
      const existingMedia = Array.from({length: 10}, (_, i) => ({
        url: `https://example.com/img${i}.jpg`,
        fileName: `img${i}.jpg`,
      }));
      const imageUrls = existingMedia.map((m) => m.url);
      const svc = await seedService({
        providerId: provider.id, imageMedia: existingMedia, imageUrls,
      });
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceImages", data: {serviceId: svc.id, serviceImages: [TEST_IMAGE]}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Maximum.*images allowed/i,
      );
    });
  });

  describe("removeServiceImage", () => {
    it("removes an image from a service", async () => {
      const provider = await seedUser();
      const mediaUrl = "https://example.com/img1.jpg";
      const imageMedia = [{url: mediaUrl, fileName: "img1.jpg", mediaId: `media-${uniqueId()}`}];
      const svc = await seedService({providerId: provider.id, imageMedia, imageUrls: [mediaUrl]});
      const res = await wrapped(
        makeRequest({action: "removeServiceImage", data: {serviceId: svc.id, imageUrl: mediaUrl}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.imageUrls.length, 0);
      assert.equal(res.service.imageMedia.length, 0);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "removeServiceImage", data: {serviceId: svc.id, imageUrl: "https://example.com/img.jpg"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id, imageMedia: [], imageUrls: []});
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceImage", data: {serviceId: svc.id, imageUrl: "https://example.com/img.jpg"}}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing serviceId or imageUrl", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceImage", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceImage", data: {serviceId: "nonexistent-svc", imageUrl: "https://example.com/img.jpg"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects when image URL not found in service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, imageMedia: [], imageUrls: ["https://example.com/existing.jpg"]});
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceImage", data: {serviceId: svc.id, imageUrl: "https://example.com/nonexistent.jpg"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Image not found/i,
      );
    });
  });

  describe("reorderServiceImages", () => {
    it("reorders images in a service", async () => {
      const provider = await seedUser();
      const urls = ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"];
      const svc = await seedService({providerId: provider.id, imageUrls: urls, imageMedia: urls.map((u) => ({url: u}))});
      const reordered = ["https://example.com/3.jpg", "https://example.com/1.jpg", "https://example.com/2.jpg"];
      const res = await wrapped(
        makeRequest({action: "reorderServiceImages", data: {serviceId: svc.id, orderedImageUrls: reordered}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.service.imageUrls, reordered);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "reorderServiceImages", data: {serviceId: svc.id, orderedImageUrls: []}})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "reorderServiceImages", data: {serviceId: svc.id, orderedImageUrls: []}}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing serviceId or orderedImageUrls", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "reorderServiceImages", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "reorderServiceImages", data: {serviceId: "nonexistent-svc", orderedImageUrls: []}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects mismatched ordered URLs", async () => {
      const provider = await seedUser();
      const urls = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
      const svc = await seedService({providerId: provider.id, imageUrls: urls});
      await assert.rejects(
        wrapped(
          makeRequest({action: "reorderServiceImages", data: {serviceId: svc.id, orderedImageUrls: ["https://example.com/3.jpg"]}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Ordered URLs must match/i,
      );
    });
  });

  // ==========================================================================
  // D. Certificate Management
  // ==========================================================================

  describe("uploadServiceCertificates", () => {
    it("uploads certificates to a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, certificateMedia: [], isVerifiedService: false});
      const certs = [{
        fileName: "cert.pdf",
        contentType: "application/pdf",
        fileData: Buffer.from("fake-cert-data").toString("base64"),
      }];
      const res = await wrapped(
        makeRequest(
          {action: "uploadServiceCertificates", data: {serviceId: svc.id, serviceCertificates: certs}},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.ok(res.service.certificateMedia.length >= 1);
      assert.equal(res.service.isVerifiedService, true);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest(
          {action: "uploadServiceCertificates", data: {serviceId: svc.id, serviceCertificates: [TEST_CERT]}},
        )),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceCertificates", data: {serviceId: svc.id, serviceCertificates: [TEST_CERT]}},
            makeAuth(wrongUser.id),
          ),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing serviceId or certificates", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "uploadServiceCertificates", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID and certificates are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceCertificates", data: {serviceId: "nonexistent-svc", serviceCertificates: [TEST_CERT]}},
            makeAuth(provider.id),
          ),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects when exceeding MAX_SERVICE_CERTIFICATES", async () => {
      const provider = await seedUser();
      const existingCerts = Array.from({length: 10}, (_, i) => ({
        url: `https://example.com/cert${i}.pdf`,
        fileName: `cert${i}.pdf`,
      }));
      const svc = await seedService({providerId: provider.id, certificateMedia: existingCerts});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadServiceCertificates", data: {serviceId: svc.id, serviceCertificates: [TEST_CERT]}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Maximum.*certificates allowed/i,
      );
    });
  });

  describe("removeServiceCertificate", () => {
    it("removes a certificate from a service", async () => {
      const provider = await seedUser();
      const certUrl = "https://example.com/cert1.pdf";
      const certMedia = [{url: certUrl, fileName: "cert1.pdf", mediaId: `media-${uniqueId()}`}];
      const svc = await seedService({providerId: provider.id, certificateMedia: certMedia, isVerifiedService: true});
      const res = await wrapped(
        makeRequest({action: "removeServiceCertificate", data: {serviceId: svc.id, certificateUrl: certUrl}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.certificateMedia.length, 0);
      assert.equal(res.service.isVerifiedService, false);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "removeServiceCertificate", data: {serviceId: svc.id, certificateUrl: "https://example.com/cert.pdf"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceCertificate", data: {serviceId: svc.id, certificateUrl: "https://example.com/cert.pdf"}}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing serviceId or certificateUrl", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceCertificate", data: {serviceId: "svc-1"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceCertificate", data: {serviceId: "nonexistent-svc", certificateUrl: "https://example.com/cert.pdf"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects when certificate URL not found", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, certificateMedia: [{url: "https://example.com/existing.pdf", fileName: "existing.pdf"}]});
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeServiceCertificate", data: {serviceId: svc.id, certificateUrl: "https://example.com/nonexistent.pdf"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Certificate not found/i,
      );
    });
  });

  // ==========================================================================
  // E. Category Management
  // ==========================================================================

  describe("verifyService", () => {
    it("admin verifies a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, isVerifiedService: false});
      const res = await wrapped(
        makeRequest({action: "verifyService", data: {serviceId: svc.id, isVerified: true}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.isVerifiedService, true);
    });

    it("admin unverifies a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, isVerifiedService: true});
      const res = await wrapped(
        makeRequest({action: "verifyService", data: {serviceId: svc.id, isVerified: false}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.isVerifiedService, false);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "verifyService", data: {serviceId: svc.id, isVerified: true}})),
        /User must be authenticated/i,
      );
    });

    it("rejects non-admin callers", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "verifyService", data: {serviceId: svc.id, isVerified: true}}, makeAuth(provider.id)),
        ),
        /PERMISSION_DENIED|Only admins can verify/i,
      );
    });

    it("rejects missing serviceId or isVerified", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "verifyService", data: {serviceId: "svc-1"}}, makeAuth("admin-1", true)),
        ),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "verifyService", data: {serviceId: "nonexistent-svc", isVerified: true}}, makeAuth("admin-1", true)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  describe("addCategory", () => {
    it("admin adds a category", async () => {
      const res = await wrapped(
        makeRequest({action: "addCategory", data: {name: "New Cat", slug: "new-cat"}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.category.name, "New Cat");
      assert.equal(res.category.slug, "new-cat");
      const saved = await fetchDoc("categories", res.category.id);
      assert.equal(saved.name, "New Cat");
    });

    it("admin adds a subcategory with parent", async () => {
      const parent = await seedCategory({name: "Parent", slug: "parent"});
      const res = await wrapped(
        makeRequest({action: "addCategory", data: {name: "Child", slug: "child", parentId: parent.id}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.category.parentId, parent.id);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "addCategory", data: {name: "New", slug: "new"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects non-admin callers", async () => {
      const user = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "addCategory", data: {name: "New", slug: "new"}}, makeAuth(user.id)),
        ),
        /PERMISSION_DENIED|Only admins can add categories/i,
      );
    });

    it("rejects missing name", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "addCategory", data: {slug: "new"}}, makeAuth("admin-1", true)),
        ),
        /INVALID_ARGUMENT|Name and slug are required/i,
      );
    });

    it("rejects missing slug", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "addCategory", data: {name: "New"}}, makeAuth("admin-1", true)),
        ),
        /INVALID_ARGUMENT|Name and slug are required/i,
      );
    });

    it("rejects nonexistent parentId", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "addCategory", data: {name: "New", slug: "new", parentId: "nonexistent-parent"}}, makeAuth("admin-1", true)),
        ),
        /NOT_FOUND|Parent category not found/i,
      );
    });
  });

  describe("getAllCategories", () => {
    it("returns all categories, initializing if missing", async () => {
      const res = await wrapped(makeRequest({action: "getAllCategories"}));
      assert.equal(res.success, true);
      assert.ok(res.categories.length > 0);
    });

    it("returns existing categories without reinitializing", async () => {
      await seedCategory({id: "my-cat", name: "My Category", slug: "my-cat"});
      const res = await wrapped(makeRequest({action: "getAllCategories"}));
      const names = res.categories.map((c) => c.name);
      assert.ok(names.includes("My Category"));
    });
  });

  // ==========================================================================
  // F. Package Management
  // ==========================================================================

  describe("createServicePackage", () => {
    it("creates a package for a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkgData = {serviceId: svc.id, title: "Basic Package", description: "Basic service package", price: 300};
      const res = await wrapped(
        makeRequest(
          {action: "createServicePackage", data: pkgData},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.title, "Basic Package");
      assert.equal(res.package.description, "Basic service package");
      assert.equal(res.package.price, 300);
      assert.equal(res.package.serviceId, svc.id);
      const saved = await fetchDoc("service_packages", res.package.id);
      assert.equal(saved.title, "Basic Package");
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest(
          {action: "createServicePackage", data: {serviceId: svc.id, title: "Pkg", description: "Desc", price: 100}},
        )),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: svc.id, title: "Pkg", description: "Desc", price: 100}},
            makeAuth(wrongUser.id),
          ),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing required fields", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: svc.id}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: "nonexistent-svc", title: "Pkg", description: "Desc", price: 100}},
            makeAuth(provider.id),
          ),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects invalid title (too long)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: svc.id, title: "X".repeat(501), description: "Desc", price: 100}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Package title must be between/i,
      );
    });

    it("rejects invalid description (too long)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: svc.id, title: "Pkg", description: "X".repeat(1001), price: 100}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Package description must be between/i,
      );
    });

    it("rejects invalid price (negative)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: {serviceId: svc.id, title: "Pkg", description: "Desc", price: -1}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Package price must be between/i,
      );
    });
  });

  describe("getServicePackages", () => {
    it("returns all packages for a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await seedServicePackage({serviceId: svc.id, title: "Pkg A"});
      await seedServicePackage({serviceId: svc.id, title: "Pkg B"});
      const res = await wrapped(
        makeRequest({action: "getServicePackages", data: {serviceId: svc.id}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.packages.length, 2);
    });

    it("rejects missing serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServicePackages", data: {}})),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServicePackages", data: {serviceId: "nonexistent-svc"}})),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("returns empty array when no packages exist", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "getServicePackages", data: {serviceId: svc.id}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.packages, []);
    });
  });

  describe("getPackage", () => {
    it("returns a package by ID", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id, title: "Test Pkg"});
      const res = await wrapped(
        makeRequest({action: "getPackage", data: {packageId: pkg.id}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.title, "Test Pkg");
    });

    it("rejects missing packageId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getPackage", data: {}})),
        /INVALID_ARGUMENT|Package ID is required/i,
      );
    });

    it("rejects nonexistent packageId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getPackage", data: {packageId: "nonexistent-pkg"}})),
        /NOT_FOUND|Package not found/i,
      );
    });
  });

  describe("updateServicePackage", () => {
    it("updates package title", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id, title: "Old Title"});
      const res = await wrapped(
        makeRequest({action: "updateServicePackage", data: {packageId: pkg.id, title: "New Title"}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.title, "New Title");
    });

    it("updates package price", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id, price: 100});
      const res = await wrapped(
        makeRequest({action: "updateServicePackage", data: {packageId: pkg.id, price: 200}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.price, 200);
    });

    it("rejects unauthenticated callers", async () => {
      const pkg = await seedServicePackage();
      await assert.rejects(
        wrapped(makeRequest({action: "updateServicePackage", data: {packageId: pkg.id, title: "New"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServicePackage", data: {packageId: pkg.id, title: "New"}}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing packageId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServicePackage", data: {title: "New"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Package ID is required/i,
      );
    });

    it("rejects nonexistent packageId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServicePackage", data: {packageId: "nonexistent-pkg", title: "New"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Package not found/i,
      );
    });

    it("rejects invalid price", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateServicePackage", data: {packageId: pkg.id, price: 0}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Package price must be between/i,
      );
    });
  });

  describe("deleteServicePackage", () => {
    it("deletes a package", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id});
      const res = await wrapped(
        makeRequest({action: "deleteServicePackage", data: {packageId: pkg.id}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      const snap = await db.collection("service_packages").doc(pkg.id).get();
      assert.equal(snap.exists, false);
    });

    it("rejects unauthenticated callers", async () => {
      const pkg = await seedServicePackage();
      await assert.rejects(
        wrapped(makeRequest({action: "deleteServicePackage", data: {packageId: pkg.id}})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const pkg = await seedServicePackage({serviceId: svc.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "deleteServicePackage", data: {packageId: pkg.id}}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Only the service provider/i,
      );
    });

    it("rejects missing packageId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "deleteServicePackage", data: {}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Package ID is required/i,
      );
    });

    it("rejects nonexistent packageId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "deleteServicePackage", data: {packageId: "nonexistent-pkg"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Package not found/i,
      );
    });
  });

  // ==========================================================================
  // G. Service Update & Rating
  // ==========================================================================

  describe("updateService", () => {
    it("updates all fields of a service", async () => {
      const provider = await seedUser();
      await seedCategory({id: "cat-upd", name: "Updated", slug: "updated"});
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({
          action: "updateService",
          data: {
            serviceId: svc.id,
            title: "Updated Title",
            description: "Updated description text",
            categoryId: "cat-upd",
            price: 800,
            location: buildServiceLocation({address: "New Address"}),
            weeklySchedule: [{day: "Monday", availability: {isAvailable: true, slots: [{start: "09:00", end: "17:00"}]}}],
            instantBookingEnabled: true,
            bookingNoticeHours: 48,
            maxBookingsPerDay: 10,
          },
        }, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.title, "Updated Title");
      assert.equal(res.service.description, "Updated description text");
      assert.equal(res.service.price, 800);
      assert.equal(res.service.instantBookingEnabled, true);
    });

    it("partial update preserves other fields", async () => {
      const provider = await seedUser();
      const svc = await seedService({
        providerId: provider.id, title: "Original", price: 500,
        weeklySchedule: null, instantBookingEnabled: false,
        bookingNoticeHours: null, maxBookingsPerDay: null,
      });
      const res = await wrapped(
        makeRequest({action: "updateService", data: {serviceId: svc.id, title: "New Title"}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.title, "New Title");
      assert.equal(res.service.price, 500);
    });

    it("allows admin to update", async () => {
      const provider = await seedUser();
      const svc = await seedService({
        providerId: provider.id,
        weeklySchedule: null, instantBookingEnabled: false,
        bookingNoticeHours: null, maxBookingsPerDay: null,
      });
      const res = await wrapped(
        makeRequest({action: "updateService", data: {serviceId: svc.id, title: "Admin Update"}}, makeAuth("admin-1", true)),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.title, "Admin Update");
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "updateService", data: {serviceId: svc.id, title: "New"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects stranger", async () => {
      const provider = await seedUser();
      const stranger = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, title: "New"}}, makeAuth(stranger.id)),
        ),
        /PERMISSION_DENIED|Only the service provider or admin/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {title: "New"}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: "nonexistent-svc", title: "New"}}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects invalid title", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, title: ""}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|title.*characters/i,
      );
    });

    it("rejects invalid price", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, price: 0}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|price.*between/i,
      );
    });

    it("rejects invalid location", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateService", data: {serviceId: svc.id, location: {latitude: 14.5, longitude: 121.0, address: ""}}},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid location/i,
      );
    });

    it("rejects bookingNoticeHours exceeding 720", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, bookingNoticeHours: 721}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Booking notice hours cannot exceed/i,
      );
    });

    it("rejects maxBookingsPerDay of 0", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, maxBookingsPerDay: 0}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Max bookings per day must be between/i,
      );
    });

    it("rejects maxBookingsPerDay exceeding 50", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "updateService", data: {serviceId: svc.id, maxBookingsPerDay: 51}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|Max bookings per day must be between/i,
      );
    });
  });

  describe("updateServiceRating", () => {
    it("updates rating and review count", async () => {
      const svc = await seedService({rating: null, reviewCount: 0});
      const res = await wrapped(
        makeRequest({action: "updateServiceRating", data: {serviceId: svc.id, newRating: 4.5, newReviewCount: 10}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.rating, 4.5);
      assert.equal(res.service.reviewCount, 10);
    });

    it("rejects missing required fields", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "updateServiceRating", data: {serviceId: svc.id}})),
        /INVALID_ARGUMENT|.*are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "updateServiceRating", data: {serviceId: "nonexistent-svc", newRating: 4.5, newReviewCount: 10}})),
        /NOT_FOUND|Service not found/i,
      );
    });
  });

  // ==========================================================================
  // H. Availability Management
  // ==========================================================================

  describe("setServiceAvailability", () => {
    const availabilityPayload = (svcId, overrides = {}) => ({
      serviceId: svcId,
      weeklySchedule: [{day: "Monday", availability: {isAvailable: true, slots: [{start: "09:00", end: "17:00"}]}}],
      instantBookingEnabled: true,
      bookingNoticeHours: 24,
      maxBookingsPerDay: 5,
      ...overrides,
    });

    it("sets availability for a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest({action: "setServiceAvailability", data: availabilityPayload(svc.id)}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      assert.equal(res.availability.instantBookingEnabled, true);
      assert.equal(res.availability.bookingNoticeHours, 24);
      assert.equal(res.availability.maxBookingsPerDay, 5);
      const saved = await fetchDoc("services", svc.id);
      assert.equal(saved.instantBookingEnabled, true);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "setServiceAvailability", data: availabilityPayload(svc.id)})),
        /User must be authenticated/i,
      );
    });

    it("rejects wrong provider", async () => {
      const provider = await seedUser();
      const wrongUser = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "setServiceAvailability", data: availabilityPayload(svc.id)}, makeAuth(wrongUser.id)),
        ),
        /PERMISSION_DENIED|Not authorized/i,
      );
    });

    it("rejects missing required fields", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest({action: "setServiceAvailability", data: {serviceId: svc.id}}, makeAuth(provider.id)),
        ),
        /INVALID_ARGUMENT|All availability parameters are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest({action: "setServiceAvailability", data: availabilityPayload("nonexistent-svc")}, makeAuth(provider.id)),
        ),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("rejects bookingNoticeHours exceeding 720", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "setServiceAvailability", data: availabilityPayload(svc.id, {bookingNoticeHours: 721})},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Booking notice hours cannot exceed/i,
      );
    });

    it("rejects maxBookingsPerDay of 0", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "setServiceAvailability", data: availabilityPayload(svc.id, {maxBookingsPerDay: 0})},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Max bookings per day must be between/i,
      );
    });

    it("rejects maxBookingsPerDay exceeding 50", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "setServiceAvailability", data: availabilityPayload(svc.id, {maxBookingsPerDay: 51})},
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|Max bookings per day must be between/i,
      );
    });
  });

  describe("getServiceAvailability", () => {
    it("returns availability for a configured service", async () => {
      const provider = await seedUser();
      const schedule = [{day: "Monday", availability: {isAvailable: true, slots: [{start: "09:00", end: "17:00"}]}}];
      const svc = await seedService({
        providerId: provider.id, weeklySchedule: schedule,
        instantBookingEnabled: true, bookingNoticeHours: 24, maxBookingsPerDay: 5,
      });
      const res = await wrapped(
        makeRequest({action: "getServiceAvailability", data: {serviceId: svc.id}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.availability.instantBookingEnabled, true);
    });

    it("rejects missing serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServiceAvailability", data: {}})),
        /INVALID_ARGUMENT|Service ID is required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getServiceAvailability", data: {serviceId: "nonexistent-svc"}})),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("fails precondition when availability not configured", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "getServiceAvailability", data: {serviceId: svc.id}})),
        /PRECONDITION_FAILED|Service availability not properly configured/i,
      );
    });
  });

  describe("getAvailableTimeSlots", () => {
    const futureDateMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

    it("returns slots for a configured service on a valid date", async () => {
      const provider = await seedUser();
      const dayName = new Date(futureDateMs).toLocaleDateString("en-US", {weekday: "long"});
      const schedule = [{day: dayName, availability: {isAvailable: true, slots: [{start: "09:00", end: "17:00"}]}}];
      const svc = await seedService({
        providerId: provider.id,
        weeklySchedule: schedule,
        instantBookingEnabled: true,
        bookingNoticeHours: 24,
        maxBookingsPerDay: 5,
      });
      const res = await wrapped(
        makeRequest({action: "getAvailableTimeSlots", data: {serviceId: svc.id, date: futureDateMs}}),
      );
      assert.equal(res.success, true);
      assert.ok(res.slots.length > 0);
    });

    it("rejects missing serviceId or date", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getAvailableTimeSlots", data: {}})),
        /INVALID_ARGUMENT|Service ID and date are required/i,
      );
    });

    it("rejects nonexistent serviceId", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getAvailableTimeSlots", data: {serviceId: "nonexistent-svc", date: futureDateMs}})),
        /NOT_FOUND|Service not found/i,
      );
    });

    it("fails precondition when availability not configured", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "getAvailableTimeSlots", data: {serviceId: svc.id, date: futureDateMs}})),
        /PRECONDITION_FAILED|Service availability not properly configured/i,
      );
    });

    it("returns empty slots when day is not in schedule", async () => {
      const provider = await seedUser();
      const svc = await seedService({
        providerId: provider.id,
        weeklySchedule: [{day: "Monday", availability: {isAvailable: true, slots: [{start: "09:00", end: "17:00"}]}}],
        instantBookingEnabled: true,
        bookingNoticeHours: 24,
        maxBookingsPerDay: 5,
      });
      // Use a Sunday (day 0) to guarantee it's not in schedule
      const sunday = new Date("2026-07-05T00:00:00Z").getTime();
      const res = await wrapped(
        makeRequest({action: "getAvailableTimeSlots", data: {serviceId: svc.id, date: sunday}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.slots, []);
    });
  });

  // ==========================================================================
  // I. Search
  // ==========================================================================

  describe("searchServicesByLocation", () => {
    it("finds services within distance range", async () => {
      const provider = await seedUser();
      await seedService({providerId: provider.id, location: {latitude: 14.5, longitude: 121.0, address: "Manila"}});
      const res = await wrapped(
        makeRequest({action: "searchServicesByLocation", data: {userLocation: {latitude: 14.55, longitude: 121.02}, maxDistance: 10}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.services.length, 1);
      assert.ok(res.services[0].distance <= 10);
    });

    it("filters by category when provided", async () => {
      const provider = await seedUser();
      const sharedLoc = {latitude: 14.5, longitude: 121.0, address: "Manila"};
      await seedService({providerId: provider.id, category: {id: "cat-a", name: "A", slug: "a"}, location: sharedLoc});
      await seedService({providerId: provider.id, category: {id: "cat-b", name: "B", slug: "b"}, location: sharedLoc});
      const res = await wrapped(
        makeRequest({action: "searchServicesByLocation", data: {userLocation: {latitude: 14.5, longitude: 121.0}, categoryId: "cat-a"}}),
      );
      assert.equal(res.success, true);
      assert.equal(res.services.length, 1);
    });

    it("rejects missing userLocation", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "searchServicesByLocation", data: {maxDistance: 10}})),
        /INVALID_ARGUMENT|User location is required/i,
      );
    });

    it("returns empty array when no services within maxDistance", async () => {
      const provider = await seedUser();
      await seedService({providerId: provider.id, location: {latitude: 14.5, longitude: 121.0, address: "Manila"}});
      const res = await wrapped(
        makeRequest({action: "searchServicesByLocation", data: {userLocation: {latitude: 48.8566, longitude: 2.3522}, maxDistance: 1}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.services, []);
    });

    it("returns empty array when no services exist", async () => {
      const res = await wrapped(
        makeRequest({action: "searchServicesByLocation", data: {userLocation: {latitude: 14.5, longitude: 121.0}}}),
      );
      assert.equal(res.success, true);
      assert.deepEqual(res.services, []);
    });
  });

  // ==========================================================================
  // J. Delete alias
  // ==========================================================================

  describe("deleteService (alias for archiveService)", () => {
    it("archives a service via deleteService alias", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, status: "Available"});
      const res = await wrapped(
        makeRequest({action: "deleteService", data: {serviceId: svc.id}}, makeAuth(provider.id)),
      );
      assert.equal(res.success, true);
      const saved = await fetchDoc("services", svc.id);
      assert.equal(saved.status, "Archived");
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(makeRequest({action: "deleteService", data: {serviceId: svc.id}})),
        /User must be authenticated/i,
      );
    });
  });

  // ==========================================================================
  // K. Unknown action
  // ==========================================================================

  describe("unknown action", () => {
    it("rejects an unknown action string", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "nonexistentAction"})),
        /INVALID_ARGUMENT|Unknown action/i,
      );
    });

    it("rejects missing action", async () => {
      await assert.rejects(
        wrapped(makeRequest({})),
        /INVALID_ARGUMENT|An action must be specified/i,
      );
    });
  });
});

// ==========================================================================
// Scheduled Function: processScheduledDeletions
// ==========================================================================

describe("processScheduledDeletionsHandler", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  it("deletes archived services past their deletion date", async () => {
    const provider = await seedUser();
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const svcId = `svc-expired-${uniqueId()}`;
    await db.collection("services").doc(svcId).set({
      providerId: provider.id,
      title: "Expired Service",
      status: "Archived",
      deletionScheduledAt: pastDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const handler = myFunctions.processScheduledDeletionsHandler;
    await handler();
    const snap = await db.collection("services").doc(svcId).get();
    assert.equal(snap.exists, false, "Expired archived service should be deleted");
  });

  it("skips archived services not past deletion date", async () => {
    const provider = await seedUser();
    const svc = await seedArchivedService({providerId: provider.id});
    const handler = myFunctions.processScheduledDeletionsHandler;
    await handler();
    const snap = await db.collection("services").doc(svc.id).get();
    assert.equal(snap.exists, true, "Service not past deletion date should remain");
  });

  it("handles no archived services gracefully", async () => {
    const handler = myFunctions.processScheduledDeletionsHandler;
    await handler();
    const snap = await db.collection("services").get();
    assert.equal(snap.size, 0);
  });
});
