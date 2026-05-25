/**
 * Account Management Cloud Functions
 *
 * This module handles all user profile and account management operations
 *  All profile data is stored in Firestore.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {admin, getFirestore} = require("../firebase-admin");

// Import media upload functions for consistent media handling
const {
  uploadMediaInternal,
  deleteMediaInternal,
} = require("./media");

// Import reputation bridge for initializing user reputation
const {
  initializeReputationInternal,
} = require("./reputation");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  if (process.env.FUNCTIONS_EMULATOR) {
    // In emulator mode, initialize without credentials
    admin.initializeApp({
      projectId: "srve-7133d",
    });
    // Use Auth emulator
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  } else {
    admin.initializeApp();
  }
}

// Validation constants
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const MIN_PHONE_LENGTH = 10;
const MAX_PHONE_LENGTH = 15;

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @return {boolean} Whether the phone is valid
 */
function validatePhone(phone) {
  if (!phone || phone.length < MIN_PHONE_LENGTH || phone.length > MAX_PHONE_LENGTH) {
    return false;
  }

  let digitCount = 0;
  for (const char of phone) {
    if (/\d/.test(char)) {
      digitCount++;
    } else if (!["+", "-", "(", ")", " "].includes(char)) {
      return false;
    }
  }

  return digitCount >= 10;
}

/**
 * Validate name length
 * @param {string} name - Name to validate
 * @return {boolean} Whether the name is valid
 */
function validateName(name) {
  return name && name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

/**
 * Check if a phone number is already taken
 * @param {string} phone - Phone number to check
 * @param {string} excludePrincipal - Principal to exclude from check (for updates)
 * @return {Promise<boolean>} Whether the phone is taken
 */
async function isPhoneTaken(phone, excludePrincipal = null) {
  const db = getFirestore();
  const usersSnapshot = await db.collection("users")
    .where("phone", "==", phone)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return false;
  }

  if (excludePrincipal) {
    const existingUser = usersSnapshot.docs[0];
    return existingUser.id !== excludePrincipal;
  }

  return true;
}

exports.isPhoneTaken = isPhoneTaken;

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Get user profile from Firestore
 * @param {string} principalText
 * @return {Promise<Object|null>} The user profile data or null
 */
async function getUserProfile(principalText) {
  const db = getFirestore();
  const userRef = db.collection("users").doc(principalText);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data();
}

/**
 * Sign in with Internet Identity
 * @param {Object} data
 * @return {Promise<Object>} Authentication result with custom token
 */
async function signInWithInternetIdentityService(data) {
  const {principal: principalText, email} = data;

  if (!principalText) {
    throw new HttpsError(
      "invalid-argument",
      "Principal is required",
    );
  }

  // Check if user has a Firestore profile (for existing users)
  const profile = await getUserProfile(principalText);
  const hasFirestoreProfile = !!profile;

  // Check if account is locked before issuing a token
  if (profile && profile.locked) {
    throw new HttpsError(
      "failed-precondition",
      "Account has been locked by an administrator.",
      {suspensionEndDate: profile.suspensionEndDate ?? null},
    );
  }

  // Store email in Firestore profile if provided (zkLogin users)
  if (email) {
    const db = getFirestore();
    const userRef = db.collection("users").doc(principalText);
    if (hasFirestoreProfile) {
      await userRef.set({email}, {merge: true});
    } else {
      // Store email in a pending document so createProfile can pick it up
      await db.collection("pending_users").doc(principalText).set({email}, {merge: true});
    }
  }

  // Create Firebase custom token
  const customToken = await admin.auth().createCustomToken(principalText, {
    // Add custom claims here if needed
    provider: "internet-identity",
    icPrincipal: principalText,
    hasProfile: hasFirestoreProfile,
    ...(email && {email}),
  });

  return {
    success: true,
    customToken,
    principal: principalText,
    hasProfile: hasFirestoreProfile,
    needsProfile: !hasFirestoreProfile,
    message: hasFirestoreProfile ?
      "Successfully authenticated with Internet Identity" :
      "Successfully authenticated. Please complete your profile.",
  };
}

/**
 * Validate phone number availability
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} Whether phone is available
 */
async function validatePhoneNumberService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {phone} = data;

  if (!validatePhone(phone)) {
    throw new HttpsError("invalid-argument", "Invalid phone format");
  }

  if (await isPhoneTaken(phone)) {
    throw new HttpsError("already-exists", "Phone number is already registered");
  }
  return {success: true, message: "Phone number is available"};
}

/**
 * Create a new user profile
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} The created profile
 */
async function createProfileService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to create a profile");
  }

  const principalId = auth.uid;
  const {name, phone, role, email} = data;

  if (!validateName(name)) {
    const msg = `Invalid name length. Must be between ${MIN_NAME_LENGTH}` +
      ` and ${MAX_NAME_LENGTH} characters`;
    throw new HttpsError("invalid-argument", msg);
  }

  if (!validatePhone(phone)) {
    throw new HttpsError("invalid-argument", "Invalid phone format");
  }

  if (await isPhoneTaken(phone)) {
    throw new HttpsError("already-exists", "Phone number is already registered");
  }

  const db = getFirestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    throw new HttpsError("already-exists", "Profile already exists");
  }

  const now = new Date().toISOString();

  let userEmail = email || null;
  if (!userEmail) {
    try {
      const pendingDoc = await db.collection("pending_users").doc(principalId).get();
      if (pendingDoc.exists) {
        userEmail = pendingDoc.data().email || null;
      }
    } catch (err) {
      // Ignore errors when pending_users lookup fails
    }
  }

  try {
    await initializeReputationInternal(principalId, now);
  } catch (error) {
    console.error(`Reputation initialization failed for user: ${principalId}`, error);
  }

  const newProfile = {
    id: principalId,
    name: name,
    phone: phone,
    activeRole: role || "Client",
    role: "ServiceProvider",
    createdAt: now,
    updatedAt: now,
    profilePicture: null,
    biography: null,
    isActive: true,
    totalEarnings: 0,
    ...(userEmail && {email: userEmail}),
  };

  await userRef.set(newProfile);

  try {
    await db.collection("pending_users").doc(principalId).delete();
  } catch (err) {
    // Ignore errors when deleting pending_users doc
  }

  return {success: true, profile: newProfile};
}

/**
 * Get a user profile
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} The user profile
 */
async function getProfileService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userId} = data;
  const targetUserId = userId || auth.uid;

  const db = getFirestore();
  const userRef = db.collection("users").doc(targetUserId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Profile not found");
  }

  return {success: true, profile: userDoc.data()};
}

/**
 * Update user profile
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} The updated profile
 */
async function updateProfileService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to update profile");
  }

  const principalId = auth.uid;
  const {name} = data;

  if (name !== undefined && !validateName(name)) {
    const msg = `Invalid name length. Must be between ${MIN_NAME_LENGTH}` +
      ` and ${MAX_NAME_LENGTH} characters`;
    throw new HttpsError("invalid-argument", msg);
  }

  const db = getFirestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Profile not found");
  }

  const updateData = {updatedAt: new Date().toISOString()};
  if (name !== undefined) {
    updateData.name = name;
  }

  await userRef.update(updateData);
  const updatedDoc = await userRef.get();

  return {success: true, profile: updatedDoc.data()};
}

/**
 * Switch user role between Client and ServiceProvider
 * @param {Object} auth
 * @return {Promise<Object>} The updated profile with new role
 */
async function switchUserRoleService(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to switch role");
  }

  const principalId = auth.uid;
  const db = getFirestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Profile not found");
  }

  const profile = userDoc.data();

  if (profile.role === "Admin" || profile.activeRole === "Admin") {
    throw new HttpsError("invalid-argument", "Admin role cannot be switched");
  }

  const newActiveRole = profile.activeRole === "Client" ? "ServiceProvider" : "Client";

  await userRef.update({
    activeRole: newActiveRole,
    updatedAt: new Date().toISOString(),
  });

  const updatedDoc = await userRef.get();
  return {success: true, profile: updatedDoc.data()};
}

/**
 * Get all active service providers
 * @param {Object} auth
 * @return {Promise<Object>} List of active service providers
 */
async function getAllServiceProvidersService(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const usersSnapshot = await db.collection("users")
    .where("role", "==", "ServiceProvider")
    .where("isActive", "==", true)
    .get();

  const providers = [];
  usersSnapshot.forEach((doc) => {
    providers.push(doc.data());
  });

  return {success: true, providers: providers};
}

/**
 * Get all users
 * @param {Object} auth
 * @return {Promise<Object>} List of all users
 */
async function getAllUsersService(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const usersSnapshot = await db.collection("users").get();

  const users = [];
  usersSnapshot.forEach((doc) => {
    users.push(doc.data());
  });

  return {success: true, users: users};
}

/**
 * Upload a profile picture
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} The updated profile with new picture
 */
async function uploadProfilePictureService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to upload profile picture");
  }

  const principalId = auth.uid;
  const {fileName, contentType, fileData} = data;

  if (!fileName || !contentType || !fileData) {
    throw new HttpsError("invalid-argument", "File name, content type, and file data are required");
  }

  try {
    const db = getFirestore();
    const userRef = db.collection("users").doc(principalId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Profile not found");
    }

    const profile = userDoc.data();

    if (profile.profilePicture && profile.profilePicture.mediaId) {
      try {
        await deleteMediaInternal(profile.profilePicture.mediaId);
      } catch (error) {
        console.error("Error deleting old profile picture:", error);
      }
    }

    const mediaItem = await uploadMediaInternal({
      fileName,
      contentType,
      mediaType: "UserProfile",
      fileData,
      ownerId: principalId,
    });

    await userRef.update({
      profilePicture: {
        mediaId: mediaItem.id,
        imageUrl: mediaItem.url,
        thumbnailUrl: mediaItem.url,
      },
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await userRef.get();
    return {success: true, profile: updatedDoc.data()};
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Remove profile picture
 * @param {Object} auth
 * @return {Promise<Object>} The updated profile without picture
 */
async function removeProfilePictureService(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to remove profile picture");
  }

  const principalId = auth.uid;

  try {
    const db = getFirestore();
    const userRef = db.collection("users").doc(principalId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Profile not found");
    }

    const profile = userDoc.data();

    if (!profile.profilePicture || !profile.profilePicture.mediaId) {
      throw new HttpsError("not-found", "No profile picture to remove");
    }

    await deleteMediaInternal(profile.profilePicture.mediaId);

    await userRef.update({
      profilePicture: null,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await userRef.get();
    return {success: true, profile: updatedDoc.data()};
  } catch (error) {
    console.error("Error removing profile picture:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update user active status
 * @param {Object} auth
 * @param {Object} data
 * @return {Promise<Object>} Success message with updated status
 */
async function updateUserActiveStatusService(auth, data) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated to update active status");
  }

  const principalId = auth.uid;
  const {isActive} = data;

  if (typeof isActive !== "boolean") {
    throw new HttpsError("invalid-argument", "isActive must be a boolean value");
  }

  try {
    const db = getFirestore();
    const userRef = db.collection("users").doc(principalId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Profile not found");
    }

    const now = new Date().toISOString();

    await userRef.update({
      isActive: isActive,
      lastActivity: now,
      updatedAt: now,
    });

    return {success: true, message: `User active status updated to ${isActive}`};
  } catch (error) {
    console.error("Error updating user active status:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.accountAction = onCall(
  {
    memory: "256MiB",
  },
  async (request) => {
    const {action, payload} = request.data || {};
    const auth = request.auth;

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "signInWithInternetIdentity":
        return await signInWithInternetIdentityService(payload);
      case "validatePhoneNumber":
        return await validatePhoneNumberService(auth, payload);
      case "createProfile":
        return await createProfileService(auth, payload);
      case "getProfile":
        return await getProfileService(auth, payload);
      case "updateProfile":
        return await updateProfileService(auth, payload);
      case "switchUserRole":
        return await switchUserRoleService(auth);
      case "getAllServiceProviders":
        return await getAllServiceProvidersService(auth);
      case "getAllUsers":
        return await getAllUsersService(auth);
      case "uploadProfilePicture":
        return await uploadProfilePictureService(auth, payload);
      case "removeProfilePicture":
        return await removeProfilePictureService(auth);
      case "updateUserActiveStatus":
        return await updateUserActiveStatusService(auth, payload);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  },
);
