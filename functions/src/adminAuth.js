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


    const adminRolesSnapshot = await db.collection("userRoles")
      .where("role", "==", "ADMIN")
      .get();

    const adminCount = adminRolesSnapshot.size;
    const adminNumber = String(adminCount).padStart(2, "0");
    const adminName = `admin${adminNumber}`;

    console.log(`🔢 [Admin] Found ${adminCount} existing admin(s), assigning name: ${adminName}`);

    // Check if profile already exists
    const profileRef = db.collection("users").doc(uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      // Create new admin profile
      const newProfile = {
        uid: uid,
        principal: principal || uid,
        name: adminName, // Always use generated sequential admin name
        phone: phone || "",
        role: "ServiceProvider", // Application role (Client/ServiceProvider)
        // Note: Admin role is stored separately in userRoles collection
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isAdmin: true,
      };

      await profileRef.set(newProfile);
      console.log(`✅ [Admin] Profile created for UID: ${uid} with name: ${newProfile.name}`);
    } else {
      console.log(`ℹ️  [Admin] Profile already exists for UID: ${uid}`);

      // If profile exists but doesn't have a numbered admin name, update it
      const existingData = profileDoc.data();
      if (existingData.isAdmin || existingData.name === "Admin User") {
        // Check if already has a numbered admin name
        if (!existingData.name.match(/^admin\d{2}$/)) {
          // Find the correct admin number by checking if this user already has a role
          const existingRole = await db.collection("userRoles").doc(uid).get();

          if (existingRole.exists) {
            // User already has admin role - find their position in the ordered list
            // Get all admin roles ordered by assignedAt
            const allAdminRoles = await db.collection("userRoles")
              .where("role", "==", "ADMIN")
              .orderBy("assignedAt", "asc")
              .get();

            // Find this user's index in the ordered list
            let adminIndex = 0;
            for (let i = 0; i < allAdminRoles.docs.length; i++) {
              if (allAdminRoles.docs[i].id === uid) {
                adminIndex = i;
                break;
              }
            }

            const adminNumber = String(adminIndex).padStart(2, "0");
            const correctAdminName = `admin${adminNumber}`;

            await profileRef.update({
              name: correctAdminName,
              updatedAt: FieldValue.serverTimestamp(),
            });

            console.log(`🔄 [Admin] Updated existing admin profile name to: ${correctAdminName}`);
          } else {
            // No role yet, will be assigned below - use the calculated name
            await profileRef.update({
              name: adminName,
              updatedAt: FieldValue.serverTimestamp(),
            });

            console.log(`🔄 [Admin] Updated existing admin profile name to: ${adminName}`);
          }
        }
      }
    }

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
      needsSignOut: false, // Token refresh is handled automatically in the frontend
    };
  } catch (error) {
    console.error("❌ [Admin] Error in createAdminProfile:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
