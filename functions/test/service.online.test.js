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

const {test, clearCollections} = require("./mocha");
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
