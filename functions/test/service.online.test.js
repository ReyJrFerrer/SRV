/**
 * Integration tests for the Phase 1 service-entity changes:
 *  - 4 new Service fields: serviceMode, negotiable, allowsMilestones, onlineDeliveryFormat
 *  - ServicePackage.type: 'Fixed' | 'Milestone' | 'Session' (discriminated union)
 *
 * Per `docs/OnlineService.md` §4.2 and §5.4, these validations are
 * server-side enforced in `createService_service` and
 * `createServicePackage_service`.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Total test cases: 29 (see `docs/OnlineService-Implementation-Checklist.md`).
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {
  seedUser,
  seedCategory,
  seedService,
  buildServiceLocation,
} = require("./helpers/seed");

const myFunctions = require("../src/service");
const wrapped = test.wrap(myFunctions.serviceAction);

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
 * Build a base payload for `createService` with the minimum required fields
 * and the in-person defaults. Tests override individual fields to assert
 * online-specific paths.
 * @param {Object} overrides
 * @return {Object}
 */
function baseServicePayload(overrides = {}) {
  return {
    title: "Online Test Service",
    description: "An online service used for testing",
    categoryId: "cat-online-1",
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

describe("serviceAction — online service fields (Phase 1)", () => {
  beforeEach(async () => {
    await clearCollections();
    await seedCategory({id: "cat-online-1", name: "Online Services", slug: "online-services"});
  });

  // ==========================================================================
  // A. serviceMode + negotiable validation
  // ==========================================================================
  //
  // Per docs/OnlineService.md §4.2: InPerson services must have
  // negotiable=false, allowsMilestones=false, onlineDeliveryFormat=null.
  // Validation is server-side enforced.

  describe("createService — serviceMode and negotiable", () => {
    it("rejects serviceMode='InPerson' with negotiable=true", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({serviceMode: "InPerson", negotiable: true}),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|negotiable/i,
      );
    });

    it("rejects serviceMode='InPerson' with onlineDeliveryFormat='live'", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "InPerson",
                onlineDeliveryFormat: "live",
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|deliveryFormat/i,
      );
    });

    it("rejects serviceMode='InPerson' with allowsMilestones=true", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "InPerson",
                allowsMilestones: true,
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|milestone/i,
      );
    });

    it("accepts serviceMode='Online' with all 4 fields set", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "createService",
            data: baseServicePayload({
              serviceMode: "Online",
              negotiable: true,
              allowsMilestones: true,
              onlineDeliveryFormat: "async",
            }),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.serviceMode, "Online");
      assert.equal(res.service.negotiable, true);
      assert.equal(res.service.allowsMilestones, true);
      assert.equal(res.service.onlineDeliveryFormat, "async");
    });

    it("accepts serviceMode='Hybrid' with all 4 fields set", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "createService",
            data: baseServicePayload({
              serviceMode: "Hybrid",
              negotiable: true,
              allowsMilestones: true,
              onlineDeliveryFormat: "live",
              weeklySchedule: [
                {day: "Monday", enabled: true, startTime: "09:00", endTime: "17:00"},
              ],
            }),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.serviceMode, "Hybrid");
      assert.equal(res.service.onlineDeliveryFormat, "live");
    });

    it("rejects serviceMode='Online' with onlineDeliveryFormat omitted", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({serviceMode: "Online"}),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|deliveryFormat/i,
      );
    });

    it("rejects serviceMode='Online' with invalid onlineDeliveryFormat", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "Online",
                onlineDeliveryFormat: "bogus",
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|deliveryFormat/i,
      );
    });

    it("rejects serviceMode with an invalid value", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({serviceMode: "Teleportation"}),
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|serviceMode/i,
      );
    });
  });

  // ==========================================================================
  // A2. weeklySchedule validation (per docs/OnlineService.md §4.3)
  // ==========================================================================
  //
  // Per the spec: weeklySchedule is Required for InPerson and Hybrid services
  // (in-person leg must have a schedule), and Optional for Online services.

  describe("createService — weeklySchedule requirement", () => {
    /**
     * Build a minimal weeklySchedule with one slot.
     * @return {Object}
     */
    function sampleWeeklySchedule() {
      return [
        {day: "Monday", enabled: true, startTime: "09:00", endTime: "17:00"},
      ];
    }

    it("accepts serviceMode='InPerson' with a valid weeklySchedule", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "createService",
            data: baseServicePayload({
              serviceMode: "InPerson",
              weeklySchedule: sampleWeeklySchedule(),
            }),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.service.serviceMode, "InPerson");
    });

    it("rejects serviceMode='InPerson' with weeklySchedule=null", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "InPerson",
                weeklySchedule: null,
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|weeklySchedule|schedule.*required/i,
      );
    });

    it("rejects serviceMode='Hybrid' with weeklySchedule=null", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "Hybrid",
                negotiable: true,
                allowsMilestones: true,
                onlineDeliveryFormat: "live",
                weeklySchedule: null,
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|weeklySchedule|schedule.*required/i,
      );
    });

    it("accepts serviceMode='Online' with weeklySchedule=null (optional)", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "createService",
            data: baseServicePayload({
              serviceMode: "Online",
              onlineDeliveryFormat: "async",
              weeklySchedule: null,
            }),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
    });

    it("accepts serviceMode='Hybrid' with a valid weeklySchedule (boundary)", async () => {
      const provider = await seedUser();
      const res = await wrapped(
        makeRequest(
          {
            action: "createService",
            data: baseServicePayload({
              serviceMode: "Hybrid",
              negotiable: true,
              allowsMilestones: true,
              onlineDeliveryFormat: "live",
              weeklySchedule: sampleWeeklySchedule(),
            }),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
    });

    it("rejects missing serviceMode (defaults to InPerson) + missing weeklySchedule", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({weeklySchedule: null}),
              // serviceMode omitted -> defaults to "InPerson"
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|weeklySchedule|schedule.*required/i,
      );
    });

    it("rejects weeklySchedule=null combined with invalid serviceMode", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createService",
              data: baseServicePayload({
                serviceMode: "Teleportation",
                weeklySchedule: null,
              }),
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|serviceMode|weeklySchedule|schedule.*required/i,
      );
    });
  });

  // ==========================================================================
  // A3. 1-5 packages-per-service rule (per docs/OnlineService.md §5.4)
  // ==========================================================================
  //
  // Per the spec: "Existing 1–5 packages-per-service rule applies to all 3 types."
  // Currently the rule is not enforced. We add it as part of Gap 3.

  describe("createServicePackage — 1-5 packages-per-service rule", () => {
    /**
     * Create N packages for a service and return the package IDs.
     * @param {string} serviceId
     * @param {string} providerId
     * @param {number} count
     * @return {Promise<Array<string>>}
     */
    async function seedPackages(serviceId, providerId, count) {
      const ids = [];
      for (let i = 0; i < count; i++) {
        const res = await wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId,
                title: `Package ${i + 1}`,
                description: `Test package ${i + 1}`,
                price: 100 + i,
                type: "Fixed",
              },
            },
            makeAuth(providerId),
          ),
        );
        ids.push(res.package.id);
      }
      return ids;
    }

    it("accepts the 1st package on a service (boundary low)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: {
              serviceId: svc.id,
              title: "First Package",
              description: "The first one",
              price: 100,
              type: "Fixed",
            },
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
    });

    it("accepts the 5th package on a service (boundary high)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      // Seed 4 packages, then add the 5th.
      await seedPackages(svc.id, provider.id, 4);
      const res = await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: {
              serviceId: svc.id,
              title: "Fifth Package",
              description: "The fifth one",
              price: 500,
              type: "Fixed",
            },
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
    });

    it("rejects the 6th package on a service", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      // Seed 5 packages (the max).
      await seedPackages(svc.id, provider.id, 5);
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Sixth Package",
                description: "Should be rejected",
                price: 600,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|too many|maximum|limit|6th/i,
      );
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Pkg",
                description: "Desc",
                price: 100,
                type: "Fixed",
              },
            },
          ),
        ),
        /User must be authenticated/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                title: "Pkg",
                description: "Desc",
                price: 100,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|required/i,
      );
    });

    it("rejects when service belongs to a different provider", async () => {
      const provider = await seedUser();
      const otherProvider = await seedUser();
      const svc = await seedService({providerId: otherProvider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Pkg",
                description: "Desc",
                price: 100,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|permission|provider can create/i,
      );
    });

    it("getServicePackages returns [] for a service with 0 packages", async () => {
      const svc = await seedService();
      const res = await wrapped(
        makeRequest(
          {action: "getServicePackages", data: {serviceId: svc.id}},
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.packages.length, 0);
    });
  });

  // ==========================================================================
  // A4. Service.price = min(package.prices) invariant (per docs/OnlineService.md §5.4)
  // ==========================================================================
  //
  // Per the spec: "A service's `price` field remains the minimum across its
  // packages (unchanged)." When a new package is created with a price lower
  // than the service's current price, the service's price should be updated
  // transactionally.

  describe("createServicePackage — Service.price = min(package.prices) invariant", () => {
    it("does not change Service.price when package price > current", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, price: 500});
      await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: {
              serviceId: svc.id,
              title: "Expensive Package",
              description: "Higher than service",
              price: 800,
              type: "Fixed",
            },
          },
          makeAuth(provider.id),
        ),
      );
      const after = await db.collection("services").doc(svc.id).get();
      assert.equal(after.data().price, 500);
    });

    it("updates Service.price when package price < current (transactional)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, price: 500});
      await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: {
              serviceId: svc.id,
              title: "Cheaper Package",
              description: "Lower than service",
              price: 200,
              type: "Fixed",
            },
          },
          makeAuth(provider.id),
        ),
      );
      const after = await db.collection("services").doc(svc.id).get();
      assert.equal(after.data().price, 200);
    });

    it("does not change Service.price when package price == current (boundary)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, price: 500});
      await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: {
              serviceId: svc.id,
              title: "Same Price Package",
              description: "Equal to service",
              price: 500,
              type: "Fixed",
            },
          },
          makeAuth(provider.id),
        ),
      );
      const after = await db.collection("services").doc(svc.id).get();
      assert.equal(after.data().price, 500);
    });

    it("rejects package with price 0 (invalid)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, price: 500});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Free Package",
                description: "Should be rejected",
                price: 0,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|price.*required|price.*between/i,
      );
      // Service.price should be unchanged
      const after = await db.collection("services").doc(svc.id).get();
      assert.equal(after.data().price, 500);
    });

    it("rejects unauthenticated callers", async () => {
      const svc = await seedService();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Pkg",
                description: "Desc",
                price: 100,
                type: "Fixed",
              },
            },
          ),
        ),
        /User must be authenticated/i,
      );
    });

    it("rejects missing serviceId", async () => {
      const provider = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                title: "Pkg",
                description: "Desc",
                price: 100,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /INVALID_ARGUMENT|required/i,
      );
    });

    it("concurrent package creates: both updates apply, final price = min", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id, price: 1000});
      // Fire 2 concurrent package creates. One is at 800, the other at 300.
      // The lower of the two (300) should win, regardless of order.
      const [res1, res2] = await Promise.all([
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "P1",
                description: "D1",
                price: 800,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "P2",
                description: "D2",
                price: 300,
                type: "Fixed",
              },
            },
            makeAuth(provider.id),
          ),
        ),
      ]);
      assert.equal(res1.success, true);
      assert.equal(res2.success, true);
      const after = await db.collection("services").doc(svc.id).get();
      // The minimum of {1000, 800, 300} = 300
      assert.equal(after.data().price, 300);
    });
  });
});

describe("serviceAction — ServicePackage type (Phase 1)", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // Helper: build a base package payload
  function basePackagePayload(serviceId, overrides = {}) {
    return {
      serviceId,
      title: "Test Package",
      description: "Default test package",
      price: 500,
      type: "Fixed",
      ...overrides,
    };
  }

  // ==========================================================================
  // B. ServicePackage.type validation
  // ==========================================================================
  //
  // Per docs/OnlineService.md §5: ServicePackage becomes a 3-type
  // discriminated union. The `type` field is required and determines
  // which additional fields are valid (Fixed: none, Milestone: milestones[],
  // Session: sessionCount/sessionDurationMinutes/sessionType).

  describe("createServicePackage — type='Fixed'", () => {
    it("accepts a Fixed package with no extra fields", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest(
          {
            action: "createServicePackage",
            data: basePackagePayload(svc.id, {type: "Fixed"}),
          },
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.type, "Fixed");
    });
  });

  describe("createServicePackage — type='Milestone'", () => {
    /**
     * Build a Milestone-type payload with the given milestone definitions.
     * @param {string} serviceId
     * @param {Array} milestones
     * @return {Object}
     */
    function milestonePayload(serviceId, milestones) {
      return {
        serviceId,
        title: "Milestone Package",
        description: "A milestone-based package",
        price: 1000,
        type: "Milestone",
        milestones,
      };
    }

    const oneMs = [{title: "All", description: "x", dueDateOffsetDays: 7, percentage: 100}];
    const twoHalf = [
      {title: "Phase 1", description: "x", dueDateOffsetDays: 7, percentage: 50},
      {title: "Phase 2", description: "x", dueDateOffsetDays: 14, percentage: 50},
    ];
    const threeOk = [
      {title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 33},
      {title: "P2", description: "x", dueDateOffsetDays: 14, percentage: 33},
      {title: "P3", description: "x", dueDateOffsetDays: 21, percentage: 34},
    ];
    const twoOver = [
      {title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 50},
      {title: "P2", description: "x", dueDateOffsetDays: 14, percentage: 51},
    ];
    const twoUnder = [
      {title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 49},
      {title: "P2", description: "x", dueDateOffsetDays: 14, percentage: 50},
    ];
    const oneBad = [{title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 99}];
    const oneOverPct = [{title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 101}];

    async function expectMilestoneSuccess(serviceId, milestones) {
      const provider = await seedUser({name: `provider-${Date.now()}`});
      const svc = await seedService({providerId: provider.id});
      // ignore the serviceId passed in; the seedService has its own id
      const res = await wrapped(
        makeRequest(
          {action: "createServicePackage", data: milestonePayload(svc.id, milestones)},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true, `expected success for ${JSON.stringify(milestones)}`);
      assert.equal(res.package.type, "Milestone");
    }

    async function expectMilestoneFailure(milestones) {
      const provider = await seedUser({name: `provider-${Date.now()}`});
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: milestonePayload(svc.id, milestones)},
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|milestone|percentage/i,
      );
    }

    it("accepts a single milestone at 100%", async () => {
      await expectMilestoneSuccess("svc", oneMs);
    });

    it("accepts two milestones at 50/50", async () => {
      await expectMilestoneSuccess("svc", twoHalf);
    });

    it("accepts three milestones at 33/33/34", async () => {
      await expectMilestoneSuccess("svc", threeOk);
    });

    it("rejects two milestones at 50/51 (sum=101)", async () => {
      await expectMilestoneFailure(twoOver);
    });

    it("rejects two milestones at 49/50 (sum=99)", async () => {
      await expectMilestoneFailure(twoUnder);
    });

    it("rejects empty milestones[]", async () => {
      await expectMilestoneFailure([]);
    });

    it("rejects a single milestone with 0% (treated as sum=0)", async () => {
      // This will fail at percentage validation (0 not in 1..100) or sum check.
      await expectMilestoneFailure([{
        title: "P1", description: "x", dueDateOffsetDays: 7, percentage: 0,
      }]);
    });

    it("rejects a single milestone at 99%", async () => {
      await expectMilestoneFailure(oneBad);
    });

    it("rejects a single milestone at 101%", async () => {
      await expectMilestoneFailure(oneOverPct);
    });
  });

  describe("createServicePackage — type='Session'", () => {
    function sessionPayload(serviceId, overrides = {}) {
      return {
        serviceId,
        title: "Session Package",
        description: "A session-based package",
        price: 2000,
        type: "Session",
        sessionCount: 5,
        sessionDurationMinutes: 60,
        sessionType: "live",
        ...overrides,
      };
    }

    async function expectSessionSuccess(overrides) {
      const provider = await seedUser({name: `provider-${Date.now()}`});
      const svc = await seedService({providerId: provider.id});
      const res = await wrapped(
        makeRequest(
          {action: "createServicePackage", data: sessionPayload(svc.id, overrides)},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.type, "Session");
    }

    async function expectSessionFailure(overrides) {
      const provider = await seedUser({name: `provider-${Date.now()}`});
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createServicePackage", data: sessionPayload(svc.id, overrides)},
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|session/i,
      );
    }

    it("accepts a Session package with valid params", async () => {
      await expectSessionSuccess({});
    });

    // sessionCount boundaries: 0, 1, 50, 51
    it("rejects sessionCount=0", async () => {
      await expectSessionFailure({sessionCount: 0});
    });

    it("accepts sessionCount=1 (lower bound)", async () => {
      await expectSessionSuccess({sessionCount: 1});
    });

    it("accepts sessionCount=50 (upper bound)", async () => {
      await expectSessionSuccess({sessionCount: 50});
    });

    it("rejects sessionCount=51", async () => {
      await expectSessionFailure({sessionCount: 51});
    });

    // sessionDurationMinutes boundaries: 14, 15, 240, 241
    it("rejects sessionDurationMinutes=14", async () => {
      await expectSessionFailure({sessionDurationMinutes: 14});
    });

    it("accepts sessionDurationMinutes=15 (lower bound)", async () => {
      await expectSessionSuccess({sessionDurationMinutes: 15});
    });

    it("accepts sessionDurationMinutes=240 (upper bound)", async () => {
      await expectSessionSuccess({sessionDurationMinutes: 240});
    });

    it("rejects sessionDurationMinutes=241", async () => {
      await expectSessionFailure({sessionDurationMinutes: 241});
    });
  });

  describe("createServicePackage — type missing or invalid", () => {
    it("defaults to type='Fixed' when type is omitted (backward-compat default)", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      const payload = {
        serviceId: svc.id,
        title: "No Type Specified",
        description: "x",
        price: 100,
        // no `type` field
      };
      const res = await wrapped(
        makeRequest(
          {action: "createServicePackage", data: payload},
          makeAuth(provider.id),
        ),
      );
      assert.equal(res.success, true);
      assert.equal(res.package.type, "Fixed");
    });

    it("rejects an invalid type value", async () => {
      const provider = await seedUser();
      const svc = await seedService({providerId: provider.id});
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "createServicePackage",
              data: {
                serviceId: svc.id,
                title: "Bad Type",
                description: "x",
                price: 100,
                type: "Subscription",
              },
            },
            makeAuth(provider.id),
          ),
        ),
        /PERMISSION_DENIED|invalid-argument|type.*one of|Fixed.*Milestone.*Session/i,
      );
    });
  });
});
