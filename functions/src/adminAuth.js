const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

const db = admin.firestore();

/**
 * Auto-create admin profile and assign role for development
 * This function creates a profile for the user if it doesn't exist
 * and then assigns admin role - useful for testing
 * Can be called with either authenticated context OR with a customToken
 */
exports.createAdminProfile = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  console.log("createAdminProfile", payload);

  const {principal, name, phone, uid: providedUid} = payload;
  console.log("Destructured values:", {principal, name, phone, providedUid});

  // Get UID from context if authenticated, otherwise use provided UID
  let uid;

  if (context.auth) {
    uid = context.auth.uid;
    console.log(`🔧 [Admin] Using authenticated UID: ${uid}`);
  } else if (providedUid) {
    uid = providedUid;
    console.log(`🔧 [Admin] Using provided UID: ${uid}`);
  } else {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Either authenticate or provide UID",
    );
  }

  try {
    console.log(`🔧 [Admin] Creating admin profile for UID: ${uid}`);

    // Check if profile already exists
    const profileRef = db.collection("users").doc(uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      // Create new admin profile
      const newProfile = {
        uid: uid,
        principal: principal || uid,
        name: name || "Admin User",
        phone: phone || "",
        role: "ServiceProvider", // Default role for admin users
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isAdmin: true,
      };

      await profileRef.set(newProfile);
      console.log(`✅ [Admin] Profile created for UID: ${uid}`);
    } else {
      console.log(`ℹ️  [Admin] Profile already exists for UID: ${uid}`);
    }

    // Assign admin role
    const roleAssignment = {
      userId: uid,
      role: "ADMIN",
      scope: null,
      assignedBy: uid, // Self-assigned for initial setup
      assignedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("userRoles").doc(uid).set(roleAssignment);
    console.log(`✅ [Admin] Admin role assigned to UID: ${uid}`);

    // Set custom claims for Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {isAdmin: true});
    console.log(`✅ [Admin] Custom claims set for UID: ${uid}`);

    return {
      success: true,
      message: "Admin profile created and role assigned successfully",
      uid: uid,
      needsSignOut: true, // Indicate that user should sign out/in to refresh token
    };
  } catch (error) {
    console.error("❌ [Admin] Error in createAdminProfile:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
