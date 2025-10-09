/**
 * Account Management Cloud Functions
 *
 * This module handles all user profile and account management operations
 * migrated from the auth.mo canister. All profile data is stored in Firestore.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import media upload functions for consistent media handling
const {
  uploadMediaInternal,
  deleteMediaInternal,
} = require("./media");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  if (process.env.FUNCTIONS_EMULATOR) {
    // In emulator mode, initialize without credentials
    admin.initializeApp({
      projectId: "devsrv-rey",
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
  const db = admin.firestore();
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

/**
 * Create a new user profile
 * HTTP onCall Cloud Function
 */
exports.createProfile = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Debug logging
  console.log("🔍 createProfile called:", {
    hasContextAuth: !!context.auth,
    hasDataAuth: !!data.auth,
    authUid: auth?.uid,
  });

  // Check authentication
  if (!auth) {
    console.error("❌ No authentication context found!");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to create a profile",
    );
  }

  const principalId = auth.uid;
  const {name, phone, role} = data.data || data;

  // Validate inputs
  if (!validateName(name)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid name length. Must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`,
    );
  }

  if (!validatePhone(phone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid phone format",
    );
  }

  // Check if phone is already taken
  if (await isPhoneTaken(phone)) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Phone number is already registered",
    );
  }

  // Check if profile already exists
  const db = admin.firestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Profile already exists",
    );
  }

  // Create new profile
  const now = new Date().toISOString();
  const newProfile = {
    id: principalId,
    name: name,
    phone: phone,
    activeRole: role || "Client", // activeRole tracks user's preferred mode/UI
    role: "ServiceProvider", // Everyone is a ServiceProvider by default
    createdAt: now,
    updatedAt: now,
    profilePicture: null,
    biography: null,
    isActive: true,
    reputationScore: 0,
    totalEarnings: 0,
  };

  await userRef.set(newProfile);

  return {
    success: true,
    profile: newProfile,
  };
});

/**
 * Get user profile by ID
 * HTTP onCall Cloud Function
 */
exports.getProfile = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;
  const actualData = data.data || data;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const {userId} = actualData;
  const targetUserId = userId || auth.uid;

  const db = admin.firestore();
  const userRef = db.collection("users").doc(targetUserId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Profile not found",
    );
  }

  return {
    success: true,
    profile: userDoc.data(),
  };
});

/**
 * Update user profile
 * HTTP onCall Cloud Function
 */
exports.updateProfile = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;
  const actualData = data.data || data;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to update profile",
    );
  }

  const principalId = auth.uid;
  const {name, phone} = actualData;

  // Validate inputs if provided
  if (name !== undefined && !validateName(name)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid name length. Must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters`,
    );
  }

  if (phone !== undefined) {
    if (!validatePhone(phone)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid phone format",
      );
    }

    if (await isPhoneTaken(phone, principalId)) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Phone number is already registered",
      );
    }
  }

  // Get existing profile
  const db = admin.firestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Profile not found",
    );
  }

  // Update profile
  const updateData = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) {
    updateData.name = name;
  }

  if (phone !== undefined) {
    updateData.phone = phone;
  }

  await userRef.update(updateData);

  // Get updated profile
  const updatedDoc = await userRef.get();

  return {
    success: true,
    profile: updatedDoc.data(),
  };
});

/**
 * Switch user active role between Client and ServiceProvider
 * HTTP onCall Cloud Function
 */
exports.switchUserRole = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to switch role",
    );
  }

  const principalId = auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(principalId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Profile not found",
    );
  }

  const profile = userDoc.data();
  const newActiveRole = profile.activeRole === "Client" ? "ServiceProvider" : "Client";

  await userRef.update({
    activeRole: newActiveRole,
    updatedAt: new Date().toISOString(),
  });

  // Get updated profile
  const updatedDoc = await userRef.get();

  return {
    success: true,
    profile: updatedDoc.data(),
  };
});

/**
 * Get all service providers
 * HTTP onCall Cloud Function
 */
exports.getAllServiceProviders = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const db = admin.firestore();
  const usersSnapshot = await db.collection("users")
    .where("role", "==", "ServiceProvider")
    .where("isActive", "==", true)
    .get();

  const providers = [];
  usersSnapshot.forEach((doc) => {
    providers.push(doc.data());
  });

  return {
    success: true,
    providers: providers,
  };
});

/**
 * Get all users (admin function)
 * HTTP onCall Cloud Function
 */
exports.getAllUsers = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // TODO: Add admin role check in production
  // if (!auth.token.admin) {
  //   throw new functions.https.HttpsError(
  //     "permission-denied",
  //     "Only admins can access all users"
  //   );
  // }

  const db = admin.firestore();
  const usersSnapshot = await db.collection("users").get();

  const users = [];
  usersSnapshot.forEach((doc) => {
    users.push(doc.data());
  });

  return {
    success: true,
    users: users,
  };
});

// ============================================================================
// PROFILE PICTURE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Upload profile picture
 * HTTP onCall Cloud Function
 */
exports.uploadProfilePicture = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to upload profile picture",
    );
  }

  const principalId = auth.uid;
  const payload = data.data || data;
  const {fileName, contentType, fileData} = payload;

  // Validate inputs
  if (!fileName || !contentType || !fileData) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "File name, content type, and file data are required",
    );
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(principalId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Profile not found",
      );
    }

    const profile = userDoc.data();

    // Delete old profile picture if it exists
    if (profile.profilePicture && profile.profilePicture.mediaId) {
      try {
        await deleteMediaInternal(profile.profilePicture.mediaId);
      } catch (error) {
        console.error("Error deleting old profile picture:", error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new profile picture using media.js
    const mediaItem = await uploadMediaInternal({
      fileName,
      contentType,
      mediaType: "UserProfile",
      fileData, // Already base64 encoded from frontend
      ownerId: principalId,
    });

    // Update profile with new profile picture
    await userRef.update({
      profilePicture: {
        mediaId: mediaItem.id,
        imageUrl: mediaItem.url,
        thumbnailUrl: mediaItem.url, // Use same URL for thumbnail (can be enhanced later)
      },
      updatedAt: new Date().toISOString(),
    });

    // Get updated profile
    const updatedDoc = await userRef.get();

    return {
      success: true,
      profile: updatedDoc.data(),
    };
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove profile picture
 * HTTP onCall Cloud Function
 */
exports.removeProfilePicture = functions.https.onCall(async (data, context) => {
  const auth = context.auth || data.auth;

  // Check authentication
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to remove profile picture",
    );
  }

  const principalId = auth.uid;

  try {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(principalId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Profile not found",
      );
    }

    const profile = userDoc.data();

    // Check if profile picture exists
    if (!profile.profilePicture || !profile.profilePicture.mediaId) {
      throw new functions.https.HttpsError(
        "not-found",
        "No profile picture to remove",
      );
    }

    // Delete profile picture media
    await deleteMediaInternal(profile.profilePicture.mediaId);

    // Update profile to remove profile picture
    await userRef.update({
      profilePicture: null,
      updatedAt: new Date().toISOString(),
    });

    // Get updated profile
    const updatedDoc = await userRef.get();

    return {
      success: true,
      profile: updatedDoc.data(),
    };
  } catch (error) {
    console.error("Error removing profile picture:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
