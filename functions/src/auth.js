/**
 * Identity Bridge Cloud Function
 *
 * This function serves as the bridge between Internet Computer Identity and Firebase Auth.
 * It creates a Firebase custom token based on the provided Principal.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

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

/**
 * Check if user profile exists in Firestore
 * @param {string} principalText - The principal as text (UID)
 * @return {Promise<Object|null>} User profile data or null if not found
 */
async function getUserProfile(principalText) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(principalText);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data();
}

/**
 * Sign in with Internet Identity
 * Callable Cloud Function that serves as the Identity Bridge
 */
exports.signInWithInternetIdentity = functions.https.onCall(async (data) => {
  try {
    const {principal: principalText} = data.data;

    if (!principalText) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Principal is required",
      );
    }

    // Check if user has a Firestore profile (for existing users)
    const profile = await getUserProfile(principalText);
    const hasFirestoreProfile = !!profile;

    // Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(principalText, {
      // Add custom claims here if needed
      provider: "internet-identity",
      icPrincipal: principalText,
      hasProfile: hasFirestoreProfile,
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
  } catch (error) {
    console.error("Error in signInWithInternetIdentity:", error);

    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in an internal error
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Server error, please try again at another time ",
    );
  }
});
