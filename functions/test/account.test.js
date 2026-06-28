/**
 * Integration tests for functions/src/account.js — 11 action cases
 * routed through the `accountAction` callable.
 *
 * Run with: `npm test` (after starting Firebase emulators)
 *
 * Each action is tested with:
 *   - Happy path: correct response + side effects
 *   - Auth errors: missing/unauthorized caller
 *   - Validation errors: missing/invalid args
 *   - Doc-not-found errors: nonexistent profiles
 */

const assert = require("node:assert/strict");

const {test, db, clearCollections} = require("./mocha");
const {seedUser, uniqueId} = require("./helpers/seed");

const myFunctions = require("../src/account");
const wrapped = test.wrap(myFunctions.accountAction);

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

describe("accountAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  // ==========================================================================
  // 1. exchangeForFirebaseToken
  // ==========================================================================
  describe("exchangeForFirebaseToken", () => {
    it("creates a custom token for a new user without email", async () => {
      const principal = `principal-${uniqueId()}`;
      const res = await wrapped(
        makeRequest({action: "exchangeForFirebaseToken", data: {principal}}),
      );

      assert.equal(res.success, true);
      assert.ok(res.customToken, "Expected a custom token");
      assert.equal(res.principal, principal);
      assert.equal(res.hasProfile, false);
      assert.equal(res.needsProfile, true);
      assert.ok(res.message.includes("Please complete your profile"));
    });

    it("stores email in pending_users for new zkLogin users", async () => {
      const principal = `principal-${uniqueId()}`;
      const email = `new-${uniqueId()}@test.com`;
      const res = await wrapped(
        makeRequest({
          action: "exchangeForFirebaseToken",
          data: {principal, email},
        }),
      );

      assert.equal(res.success, true);
      const pendingDoc = await db.collection("pending_users").doc(principal).get();
      assert.equal(pendingDoc.exists, true);
      assert.equal(pendingDoc.data().email, email);
    });

    it("sets hasProfile=true for existing users", async () => {
      const {id} = await seedUser({name: "Existing User"});
      const res = await wrapped(
        makeRequest({action: "exchangeForFirebaseToken", data: {principal: id}}),
      );

      assert.equal(res.success, true);
      assert.equal(res.hasProfile, true);
      assert.equal(res.needsProfile, false);
      assert.ok(res.message.includes("Successfully authenticated"));
    });

    it("rejects when principal is missing", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "exchangeForFirebaseToken", data: {}})),
        /INVALID_ARGUMENT|Principal is required/i,
      );
    });

    it("rejects when account is locked", async () => {
      const {id} = await seedUser({locked: true});
      await assert.rejects(
        wrapped(makeRequest({action: "exchangeForFirebaseToken", data: {principal: id}})),
        /PRECONDITION_FAILED|Account has been locked/i,
      );
    });
  });

  // ==========================================================================
  // 2. validatePhoneNumber
  // ==========================================================================
  describe("validatePhoneNumber", () => {
    it("returns available for a valid unused phone", async () => {
      const {id} = await seedUser();
      const res = await wrapped(
        makeRequest(
          {action: "validatePhoneNumber", data: {phone: "09123456789"}},
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.message, "Phone number is available");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "validatePhoneNumber", data: {phone: "09123456789"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects invalid phone format", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "validatePhoneNumber", data: {phone: "123"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid phone format/i,
      );
    });

    it("rejects when phone is already taken", async () => {
      const phone = "09123456789";
      await seedUser({phone});
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "validatePhoneNumber", data: {phone}},
            makeAuth(id),
          ),
        ),
        /already-exists|already registered/i,
      );
    });
  });

  // ==========================================================================
  // 3. createProfile
  // ==========================================================================
  describe("createProfile", () => {
    it("creates a profile and initializes reputation", async () => {
      const principal = `principal-${uniqueId()}`;
      const res = await wrapped(
        makeRequest(
          {
            action: "createProfile",
            data: {
              name: "Test User",
              phone: "09123456789",
              role: "Client",
            },
          },
          makeAuth(principal),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.name, "Test User");
      assert.equal(res.profile.phone, "09123456789");
      assert.equal(res.profile.activeRole, "Client");
      assert.ok(res.profile.createdAt);

      const userDoc = await fetchDoc("users", principal);
      assert.equal(userDoc.name, "Test User");

      const repDoc = await db.collection("reputations").doc(principal).get();
      assert.equal(repDoc.exists, true);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "createProfile", data: {name: "Test", phone: "09123456789"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects invalid name length", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createProfile", data: {name: "X", phone: "09123456789"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid name length/i,
      );
    });

    it("rejects invalid phone format", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createProfile", data: {name: "Test User", phone: "123"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid phone format/i,
      );
    });

    it("rejects when phone is already taken", async () => {
      const phone = "09123456789";
      await seedUser({phone});
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createProfile", data: {name: "Test User", phone}},
            makeAuth(id),
          ),
        ),
        /already-exists|already registered/i,
      );
    });

    it("rejects when profile already exists", async () => {
      const {id} = await seedUser({name: "Existing"});
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "createProfile", data: {name: "Another", phone: "09123456789"}},
            makeAuth(id),
          ),
        ),
        /already-exists|Profile already exists/i,
      );
    });

    it("picks up email from pending_users when not provided", async () => {
      const principal = `principal-${uniqueId()}`;
      const email = `pending-${uniqueId()}@test.com`;
      await db.collection("pending_users").doc(principal).set({email});

      const res = await wrapped(
        makeRequest(
          {
            action: "createProfile",
            data: {name: "Test User", phone: "09123456789"},
          },
          makeAuth(principal),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.email, email);

      const pendingDoc = await db.collection("pending_users").doc(principal).get();
      assert.equal(pendingDoc.exists, false, "pending_users doc should be cleaned up");
    });
  });

  // ==========================================================================
  // 4. getProfile
  // ==========================================================================
  describe("getProfile", () => {
    it("returns own profile when no userId specified", async () => {
      const {id} = await seedUser({name: "Self Profile"});
      const res = await wrapped(
        makeRequest({action: "getProfile", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.name, "Self Profile");
    });

    it("returns another user's profile when userId is specified", async () => {
      const {id: ownId} = await seedUser();
      const {id: otherId} = await seedUser({name: "Other User"});
      const res = await wrapped(
        makeRequest(
          {action: "getProfile", data: {userId: otherId}},
          makeAuth(ownId),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.name, "Other User");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getProfile", data: {}})),
        /User must be authenticated/i,
      );
    });

    it("rejects when profile is not found", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "getProfile", data: {userId: "nonexistent-user"}},
            makeAuth(id),
          ),
        ),
        /NOT_FOUND|not.found/i,
      );
    });
  });

  // ==========================================================================
  // 5. updateProfile
  // ==========================================================================
  describe("updateProfile", () => {
    it("updates the user's name", async () => {
      const {id} = await seedUser({name: "Original Name"});
      const res = await wrapped(
        makeRequest(
          {action: "updateProfile", data: {name: "Updated Name"}},
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.name, "Updated Name");

      const userDoc = await fetchDoc("users", id);
      assert.equal(userDoc.name, "Updated Name");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "updateProfile", data: {name: "New Name"}})),
        /User must be authenticated/i,
      );
    });

    it("rejects invalid name length", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateProfile", data: {name: "X"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|Invalid name length/i,
      );
    });

    it("rejects when profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateProfile", data: {name: "New Name"}},
            makeAuth("nonexistent-user"),
          ),
        ),
        /NOT_FOUND|not.found/i,
      );
    });
  });

  // ==========================================================================
  // 6. switchUserRole
  // ==========================================================================
  describe("switchUserRole", () => {
    it("switches from Client to ServiceProvider", async () => {
      const {id} = await seedUser({activeRole: "Client", role: "ServiceProvider"});
      const res = await wrapped(
        makeRequest({action: "switchUserRole", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.activeRole, "ServiceProvider");
    });

    it("switches from ServiceProvider to Client", async () => {
      const {id} = await seedUser({activeRole: "ServiceProvider", role: "ServiceProvider"});
      const res = await wrapped(
        makeRequest({action: "switchUserRole", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.activeRole, "Client");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "switchUserRole", data: {}})),
        /User must be authenticated/i,
      );
    });

    it("rejects when profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "switchUserRole", data: {}}, makeAuth("nonexistent-user")),
        ),
        /NOT_FOUND|not.found/i,
      );
    });

    it("rejects when user has admin role", async () => {
      const {id} = await seedUser({activeRole: "Admin", role: "Admin"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "switchUserRole", data: {}}, makeAuth(id)),
        ),
        /INVALID_ARGUMENT|Admin role cannot be switched/i,
      );
    });
  });

  // ==========================================================================
  // 7. getAllServiceProviders
  // ==========================================================================
  describe("getAllServiceProviders", () => {
    it("returns all active service providers", async () => {
      await seedUser({name: "Provider 1", role: "ServiceProvider", isActive: true});
      await seedUser({name: "Provider 2", role: "ServiceProvider", isActive: true});
      const {id} = await seedUser();

      const res = await wrapped(
        makeRequest({action: "getAllServiceProviders", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.providers.length, 2);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getAllServiceProviders", data: {}})),
        /User must be authenticated/i,
      );
    });

    it("returns empty array when no providers exist", async () => {
      const {id} = await seedUser();
      const res = await wrapped(
        makeRequest({action: "getAllServiceProviders", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.providers, []);
    });
  });

  // ==========================================================================
  // 8. getAllUsers
  // ==========================================================================
  describe("getAllUsers", () => {
    it("returns all users", async () => {
      await seedUser({name: "User 1"});
      await seedUser({name: "User 2"});
      const {id} = await seedUser();

      const res = await wrapped(
        makeRequest({action: "getAllUsers", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.users.length, 3);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "getAllUsers", data: {}})),
        /User must be authenticated/i,
      );
    });

    it("returns empty array when no users exist", async () => {
      // clearCollections ran in beforeEach, so no users exist
      // We need an auth user for the action but no users in the collection
      // Use a principal that doesn't have a Firestore profile as auth
      const authUid = `auth-${uniqueId()}`;
      const res = await wrapped(
        makeRequest({action: "getAllUsers", data: {}}, makeAuth(authUid)),
      );

      assert.equal(res.success, true);
      assert.deepEqual(res.users, []);
    });
  });

  // ==========================================================================
  // 9. uploadProfilePicture
  // ==========================================================================
  describe("uploadProfilePicture", () => {
    it("uploads a profile picture and updates the user doc", async () => {
      const {id} = await seedUser({name: "Picture User"});
      const res = await wrapped(
        makeRequest(
          {
            action: "uploadProfilePicture",
            data: {
              fileName: "avatar.jpg",
              contentType: "image/jpeg",
              fileData: Buffer.from("fake-image-data").toString("base64"),
            },
          },
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.ok(res.profile.profilePicture, "Expected profilePicture field");
      assert.ok(res.profile.profilePicture.mediaId, "Expected mediaId");
      assert.ok(res.profile.profilePicture.imageUrl, "Expected imageUrl");
    });

    it("replaces existing profile picture", async () => {
      const {id} = await seedUser({
        name: "Replace Picture",
        profilePicture: {
          mediaId: "old-media-id",
          imageUrl: "http://example.com/old.jpg",
          thumbnailUrl: "http://example.com/old.jpg",
        },
      });
      const res = await wrapped(
        makeRequest(
          {
            action: "uploadProfilePicture",
            data: {
              fileName: "new-avatar.jpg",
              contentType: "image/jpeg",
              fileData: Buffer.from("new-image-data").toString("base64"),
            },
          },
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.ok(res.profile.profilePicture);
      assert.notEqual(res.profile.profilePicture.mediaId, "old-media-id");
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({
          action: "uploadProfilePicture",
          data: {fileName: "a.jpg", contentType: "image/jpeg", fileData: "data"},
        })),
        /User must be authenticated/i,
      );
    });

    it("rejects missing required fields", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "uploadProfilePicture", data: {fileName: "a.jpg"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|required/i,
      );
    });

    it("rejects when profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {
              action: "uploadProfilePicture",
              data: {fileName: "a.jpg", contentType: "image/jpeg", fileData: "data"},
            },
            makeAuth("nonexistent-user"),
          ),
        ),
        /NOT_FOUND|not.found/i,
      );
    });
  });

  // ==========================================================================
  // 10. removeProfilePicture
  // ==========================================================================
  describe("removeProfilePicture", () => {
    it("removes the profile picture", async () => {
      const {id} = await seedUser({name: "Remove Pic"});
      const mediaId = `media-${uniqueId()}`;
      // Create a media doc and link it as profile picture
      await db.collection("media").doc(mediaId).set({
        id: mediaId, ownerId: id, fileName: "pic.jpg",
        mediaType: "UserProfile", url: "http://example.com/pic.jpg",
        createdAt: new Date().toISOString(),
      });
      await db.collection("users").doc(id).update({
        profilePicture: {mediaId, imageUrl: "http://example.com/pic.jpg", thumbnailUrl: "http://example.com/pic.jpg"},
      });

      const res = await wrapped(
        makeRequest({action: "removeProfilePicture", data: {}}, makeAuth(id)),
      );

      assert.equal(res.success, true);
      assert.equal(res.profile.profilePicture, null);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "removeProfilePicture", data: {}})),
        /User must be authenticated/i,
      );
    });

    it("rejects when profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeProfilePicture", data: {}}, makeAuth("nonexistent-user")),
        ),
        /NOT_FOUND|not.found/i,
      );
    });

    it("rejects when no profile picture exists", async () => {
      const {id} = await seedUser({name: "No Pic"});
      await assert.rejects(
        wrapped(
          makeRequest({action: "removeProfilePicture", data: {}}, makeAuth(id)),
        ),
        /NOT_FOUND|No profile picture/i,
      );
    });
  });

  // ==========================================================================
  // 11. updateUserActiveStatus
  // ==========================================================================
  describe("updateUserActiveStatus", () => {
    it("sets active status to true", async () => {
      const {id} = await seedUser({name: "Status User", isActive: false});
      const res = await wrapped(
        makeRequest(
          {action: "updateUserActiveStatus", data: {isActive: true}},
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.ok(res.message.includes("true"));

      const userDoc = await fetchDoc("users", id);
      assert.equal(userDoc.isActive, true);
    });

    it("sets active status to false", async () => {
      const {id} = await seedUser({name: "Deactivate User", isActive: true});
      const res = await wrapped(
        makeRequest(
          {action: "updateUserActiveStatus", data: {isActive: false}},
          makeAuth(id),
        ),
      );

      assert.equal(res.success, true);
      assert.ok(res.message.includes("false"));

      const userDoc = await fetchDoc("users", id);
      assert.equal(userDoc.isActive, false);
    });

    it("rejects unauthenticated callers", async () => {
      await assert.rejects(
        wrapped(makeRequest({action: "updateUserActiveStatus", data: {isActive: true}})),
        /User must be authenticated/i,
      );
    });

    it("rejects when isActive is not a boolean", async () => {
      const {id} = await seedUser();
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateUserActiveStatus", data: {isActive: "yes"}},
            makeAuth(id),
          ),
        ),
        /INVALID_ARGUMENT|must be a boolean/i,
      );
    });

    it("rejects when profile is not found", async () => {
      await assert.rejects(
        wrapped(
          makeRequest(
            {action: "updateUserActiveStatus", data: {isActive: true}},
            makeAuth("nonexistent-user"),
          ),
        ),
        /NOT_FOUND|not.found/i,
      );
    });
  });
});
