const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

const db = admin.firestore();

/**
 * Auto-create admin profile and assign role for development
 */
exports.createAdminProfile = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;

  const {principal, phone, uid: providedUid} = payload;

  // Get UID from context if authenticated, otherwise use provided UID
  let uid;

  if (context.auth) {
    uid = context.auth.uid;
  } else if (providedUid) {
    uid = providedUid;
  } else {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Either authenticate or provide UID",
    );
  }

  try {
    const settingsDoc = await db.collection("systemSettings").doc("system_settings").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    
    if (settings.restrictNewAdminLogins === true) {
      const userDoc = await db.collection("users").doc(uid).get();
      const userRoleDoc = await db.collection("userRoles").doc(uid).get();
      
      const userExists = userDoc.exists;
      const hasAdminRole = userRoleDoc.exists && userRoleDoc.data()?.role === "ADMIN";
      
      if (!userExists || !hasAdminRole) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "New accounts are not allowed to access the admin panel. Please contact an administrator.",
        );
      }
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
  }

  try {
    const adminRolesSnapshot = await db.collection("userRoles")
      .where("role", "==", "ADMIN")
      .get();

    const adminCount = adminRolesSnapshot.size;
    const adminNumber = String(adminCount).padStart(2, "0");
    const adminName = `admin${adminNumber}`;

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
        role: "Admin",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isAdmin: true,
      };

      await profileRef.set(newProfile);
    } else {
      const existingData = profileDoc.data();
      if (existingData.isAdmin || existingData.name === "Admin User") {
        if (!existingData.name.match(/^admin\d{2}$/)) {
          const existingRole = await db.collection("userRoles").doc(uid).get();

          if (existingRole.exists) {
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
          } else {
            await profileRef.update({
              name: adminName,
              updatedAt: FieldValue.serverTimestamp(),
            });
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

    // Set custom claims for Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {isAdmin: true});

    return {
      success: true,
      message: "Admin profile created and role assigned successfully",
      uid: uid,
      needsSignOut: false,
    };
  } catch (error) {
    console.error("Error in createAdminProfile:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
