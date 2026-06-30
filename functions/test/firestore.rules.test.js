/**
 * Firestore security rules unit tests.
 *
 * Uses `@firebase/rules-unit-testing` to spin up a rules-test environment
 * and assert that documented read/write constraints are enforced.
 *
 * Phase 0 skeleton: tests assert the rules surface area for the
 * `online_projects` collection and the milestone-metadata documented
 * exception (provider-side direct write to `milestones[].title`,
 * `description`, `dueDate` only). All tests are RED until the rules
 * block is added in Phase 9 (Task 64).
 *
 * Run with: `npm test` (after starting the Firestore emulator).
 */

const fs = require("fs");
const path = require("path");

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");

/**
 * Load the rules file at the project root so this test stays in sync
 * with the deployed rules.
 * @return {string}
 */
function loadRules() {
  const rulesPath = path.join(__dirname, "..", "..", "firestore.rules");
  return fs.readFileSync(rulesPath, "utf-8");
}

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-srv-rules-test",
    firestore: {
      rules: loadRules(),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe("firestore.rules — online_projects milestone metadata exception", () => {
  const providerId = "provider-1";
  const otherProviderId = "provider-2";
  const clientId = "client-1";
  const adminId = "admin-1";
  const projectId = "project-1";

  /**
   * Build a fresh authenticated context for a given user and seed an
   * online_projects doc in `Active` status with one milestone in the
   * `Pending` state.
   * @param {string} uid
   * @param {boolean} isAdmin
   * @return {Promise<{projectRef: FirebaseFirestore.DocumentReference}>}
   */
  async function seedProjectAs(uid, isAdmin = false) {
    // Seed with security rules disabled so we can write freely.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const projectRef = ctx.firestore().collection("online_projects").doc(projectId);
      await projectRef.set({
        id: projectId,
        clientId,
        providerId,
        serviceId: "service-1",
        packageId: "package-1",
        packageType: "Milestone",
        status: "Active",
        milestones: [
          {
            id: "ms-1",
            title: "Design",
            description: "Initial design",
            dueDate: "2026-07-01T00:00:00.000Z",
            percentage: 50,
            status: "Pending",
          },
        ],
        revisionsRemaining: 3,
        workStarted: false,
        amountPaid: 0,
        paymentStatus: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const token = isAdmin ? {isAdmin: true} : {};
    const userFirestore = testEnv.authenticatedContext(uid, token).firestore();
    return {
      projectRef: userFirestore.collection("online_projects").doc(projectId),
    };
  }

  it("allows the provider to update milestones[0].title", async () => {
    const {projectRef} = await seedProjectAs(providerId);
    await assertSucceeds(
      projectRef.update({
        "milestones.0.title": "Updated Title",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("allows the provider to update milestones[0].description", async () => {
    const {projectRef} = await seedProjectAs(providerId);
    await assertSucceeds(
      projectRef.update({
        "milestones.0.description": "Updated description",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("allows the provider to update milestones[0].dueDate", async () => {
    const {projectRef} = await seedProjectAs(providerId);
    await assertSucceeds(
      projectRef.update({
        "milestones.0.dueDate": "2026-08-01T00:00:00.000Z",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("rejects the provider updating milestones[0].percentage", async () => {
    const {projectRef} = await seedProjectAs(providerId);
    await assertFails(
      projectRef.update({
        "milestones.0.percentage": 75,
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("rejects the provider updating milestones[0].status", async () => {
    const {projectRef} = await seedProjectAs(providerId);
    await assertFails(
      projectRef.update({
        "milestones.0.status": "Approved",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("rejects the client from updating any milestone field", async () => {
    const {projectRef} = await seedProjectAs(clientId);
    await assertFails(
      projectRef.update({
        "milestones.0.title": "Client Overwrite",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("rejects a non-owner provider from updating", async () => {
    const {projectRef} = await seedProjectAs(otherProviderId);
    await assertFails(
      projectRef.update({
        "milestones.0.title": "Wrong Provider",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });

  it("allows the admin to update any field", async () => {
    const {projectRef} = await seedProjectAs(adminId, true);
    await assertSucceeds(
      projectRef.update({
        "milestones.0.percentage": 60,
        "milestones.0.status": "Approved",
        "updatedAt": new Date().toISOString(),
      }),
    );
  });
});
