const functions = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {isPhoneTaken} = require("./account");
const bcrypt = require("bcryptjs");

const db = admin.firestore();

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

const SETTINGS_KEY = "system_settings";

/**
 * Get user role
 */
exports.getUserRole = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get user roles",
    );
  }

  try {
    const roleDoc = await db.collection("userRoles").doc(userId).get();

    if (!roleDoc.exists) {
      return {success: true, data: null};
    }

    return {success: true, data: roleDoc.data()};
  } catch (error) {
    console.error("Error in getUserRole:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * List all user roles
 */
exports.listUserRoles = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can list user roles",
    );
  }

  try {
    const snapshot = await db.collection("userRoles").get();
    const roles = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    return {success: true, data: roles};
  } catch (error) {
    console.error("Error in listUserRoles:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Check if user has specific role
 */
exports.hasRole = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {userId, role} = payload;

  try {
    const roleDoc = await db.collection("userRoles").doc(userId).get();

    if (!roleDoc.exists) {
      return {success: true, data: false};
    }

    const userRole = roleDoc.data();
    return {success: true, data: userRole.role === role};
  } catch (error) {
    console.error("Error in hasRole:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update system settings
 */
exports.setSettings = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {
    restrictNewAdminLogins,
    serviceRetentionDays,
  } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can update system settings",
    );
  }

  try {
    const now = new Date().toISOString();
    const currentSettingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();
    const currentSettings = currentSettingsDoc.exists ? currentSettingsDoc.data() : {};

    const settings = {
      restrictNewAdminLogins: restrictNewAdminLogins !== undefined ? restrictNewAdminLogins :
        (currentSettings.restrictNewAdminLogins || false),
      updatedAt: now,
      updatedBy: authInfo.uid,
    };

    if (serviceRetentionDays !== undefined) {
      settings.serviceRetentionDays = serviceRetentionDays;
    }

    await db.collection("systemSettings").doc(SETTINGS_KEY).set(settings, {merge: true});

    return {success: true, message: "System settings updated successfully"};
  } catch (error) {
    console.error("Error in setSettings:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get current system settings
 */
exports.getSettings = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get system settings",
    );
  }

  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();

    if (!settingsDoc.exists) {
      const defaultSettings = {
        restrictNewAdminLogins: false,
        serviceRetentionDays: 30,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      };

      await db.collection("systemSettings").doc(SETTINGS_KEY).set(defaultSettings);
      return {success: true, data: defaultSettings};
    }

    const settingsData = settingsDoc.data();
    if (settingsData.restrictNewAdminLogins === undefined) {
      settingsData.restrictNewAdminLogins = false;
    }
    if (settingsData.serviceRetentionDays === undefined) {
      settingsData.serviceRetentionDays = 30;
    }

    return {success: true, data: settingsData};
  } catch (error) {
    console.error("Error in getSettings:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Change admin access password
 */
exports.changeAdminPassword = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {oldPassword, newPassword, confirmPassword} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can change the admin password",
    );
  }

  if (!newPassword || !confirmPassword) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "New password and confirmation are required",
    );
  }

  if (newPassword !== confirmPassword) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "New password and confirmation do not match",
    );
  }

  if (newPassword.length < 8) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "New password must be at least 8 characters long",
    );
  }

  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const isInitialPassword = !settings.adminPasswordHash;

    if (!isInitialPassword) {
      if (!oldPassword) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Old password is required when changing an existing password",
        );
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, settings.adminPasswordHash);
      if (!isOldPasswordValid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Old password is incorrect",
        );
      }
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await db.collection("systemSettings").doc(SETTINGS_KEY).update({
      adminPasswordHash: newPasswordHash,
      passwordUpdatedAt: new Date().toISOString(),
      passwordUpdatedBy: authInfo.uid,
    });

    return {success: true, message: "Password changed successfully"};
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("Error in changeAdminPassword:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Check if admin password is set
 */
exports.isAdminPasswordSet = functions.https.onCall(async () => {
  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    return {
      success: true,
      isSet: !!settings.adminPasswordHash,
    };
  } catch (error) {
    console.error("Error in isAdminPasswordSet:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Verify admin password
 */
exports.verifyAdminPassword = functions.https.onCall(async (data) => {
  const payload = data.data;
  const {password} = payload;

  if (!password) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Password is required",
    );
  }

  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    if (!settings.adminPasswordHash) {
      return {success: true, verified: true, message: "No password set"};
    }

    const isPasswordValid = await bcrypt.compare(password, settings.adminPasswordHash);

    return {
      success: true,
      verified: isPasswordValid,
      message: isPasswordValid ? "Password verified" : "Incorrect password",
    };
  } catch (error) {
    console.error("Error in verifyAdminPassword:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get system statistics
 */
exports.getSystemStats = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get system statistics",
    );
  }

  try {
    // Get commission rules count
    const rulesSnapshot = await db.collection("commissionRules").get();
    const activeRulesSnapshot =
    await db.collection("commissionRules").where("isActive", "==", true).get();

    // Get user roles count
    const rolesSnapshot = await db.collection("userRoles").get();
    const adminRolesSnapshot = await db.collection("userRoles").where("role", "==", "ADMIN").get();

    // Get booking counts and revenue data
    const bookingsSnapshot = await db.collection("bookings").get();
    const totalBookings = bookingsSnapshot.size;

    // Calculate total revenue from completed bookings
    const completedBookings = bookingsSnapshot.docs.filter((doc) => {
      const status = doc.data().status;
      return status === "Completed";
    });

    const totalRevenue = completedBookings.reduce((sum, doc) => {
      const data = doc.data();
      const price = parseFloat(data.price) || 0;
      return sum + price;
    }, 0);

    // Calculate total commission from actual wallet deductions
    const commissionTransactionsSnapshot = await db.collection("transactions")
      .where("transaction_type", "==", "Debit")
      .where("payment_channel", "==", "SRV_COMMISSION")
      .get();

    const totalCommission = commissionTransactionsSnapshot.docs.reduce((sum, doc) => {
      const amount = doc.data().amount || 0;
      return sum + amount;
    }, 0);

    // Calculate total topups amount from transactions collection
    const allCreditTransactionsSnapshot = await db.collection("transactions")
      .where("transaction_type", "==", "Credit")
      .get();

    // Filter and sum topup transaction amounts (exclude admin credits, etc.)
    const totalTopups = allCreditTransactionsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      const description = (data.description || "").toLowerCase();
      const paymentChannel = data.payment_channel || "";
      const amount = parseFloat(data.amount) || 0;

      if (
        (description.includes("topup") || description.includes("top-up")) &&
        paymentChannel !== "ADMIN_UPDATE"
      ) {
        return sum + amount;
      }

      return sum;
    }, 0);

    const stats = {
      totalCommissionRules: rulesSnapshot.size,
      activeCommissionRules: activeRulesSnapshot.size,
      totalUsersWithRoles: rolesSnapshot.size,
      adminUsers: adminRolesSnapshot.size,
      totalBookings: totalBookings,
      settledBookings: completedBookings.length,
      totalRevenue: totalRevenue,
      totalCommission: totalCommission,
      totalTopups: totalTopups,
    };

    return {success: true, data: stats};
  } catch (error) {
    console.error("Error in getSystemStats:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all users
 */
exports.getAllUsers = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get all users",
    );
  }

  try {
    const usersSnapshot = await db.collection("users").get();

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userMap = new Map();
    users.forEach((user) => {
      const userId = user.id;
      if (userId) {
        userMap.set(userId, user);
      }
    });

    const allUsers = Array.from(userMap.values());

    return {success: true, users: allUsers};
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all user lock statuses from users collection
 */
exports.getAllUserLockStatuses = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get user lock statuses",
    );
  }

  try {
    const usersSnapshot = await db.collection("users").get();
    const lockStatuses = {};
    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data();
      if (userData.locked !== undefined) {
        lockStatuses[doc.id] = userData.locked;
      }
    });

    return {success: true, lockStatuses: lockStatuses};
  } catch (error) {
    console.error("Error in getAllUserLockStatuses:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get user services and bookings combined
 */
exports.getUserServicesAndBookings = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get user services and bookings",
    );
  }

  try {
    // Get user's services as provider
    const servicesSnapshot = await db.collection("services")
      .where("providerId", "==", userId)
      .get();
    const services = servicesSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    // Get user's bookings as client
    const clientBookingsSnapshot = await db.collection("bookings")
      .where("clientId", "==", userId)
      .get();
    const clientBookings = clientBookingsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    // Get user's bookings as provider
    const providerBookingsSnapshot = await db.collection("bookings")
      .where("providerId", "==", userId)
      .get();
    const providerBookings =
    providerBookingsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    return {
      success: true,
      data: {
        services,
        clientBookings,
        providerBookings,
      },
    };
  } catch (error) {
    console.error("Error in getUserServicesAndBookings:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get user service count
 */
exports.getUserServiceCount = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get user service count",
    );
  }

  try {
    const servicesSnapshot = await db.collection("services")
      .where("providerId", "==", userId)
      .get();

    return {success: true, data: servicesSnapshot.size};
  } catch (error) {
    console.error("Error in getUserServiceCount:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Lock or unlock user account with optional time-based suspension
 * @param {Object} data - Request data
 * @param {string} data.userId - User ID to lock/unlock
 * @param {boolean} data.locked - Whether to lock the account
 * @param {number|null} data.suspensionDurationDays
 * Duration in days (7, 30, custom number, or null for indefinite)
 */
exports.lockUserAccount = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId, locked, suspensionDurationDays} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can lock/unlock user accounts",
    );
  }

  try {
    const updateData = {
      locked: locked,
      updatedAt: new Date().toISOString(),
      updatedBy: authInfo.uid,
    };

    // Calculate suspension end date based on duration
    if (locked && suspensionDurationDays !== undefined && suspensionDurationDays !== null) {
      const suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + suspensionDurationDays);
      updateData.suspensionEndDate = suspensionEndDate.toISOString();
    } else if (locked && suspensionDurationDays === null) {
      // Indefinite suspension
      updateData.suspensionEndDate = null;
    } else if (!locked) {
      // Unlocking - clear suspension end date
      updateData.suspensionEndDate = null;
    }

    // Update user's locked status in Firestore
    await db.collection("users").doc(userId).update(updateData);

    // Disable/enable user in Firebase Auth
    await admin.auth().updateUser(userId, {disabled: locked});

    const action = locked ? "locked" : "unlocked";
    const durationText = locked ?
      (suspensionDurationDays === null ?
        "indefinitely" :
        `for ${suspensionDurationDays} day${suspensionDurationDays !== 1 ? "s" : ""}`) :
      "";

    return {
      success: true,
      message: `User account ${action} ${durationText}`.trim(),
      suspensionEndDate: updateData.suspensionEndDate || null,
    };
  } catch (error) {
    console.error("Error in lockUserAccount:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update user reputation score
 */
exports.updateUserReputation = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId, reputationScore} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can update user reputation",
    );
  }

  try {
    const {createReputationActor} = require("./reputation");
    const {Principal} = require("@dfinity/principal");

    // Create reputation actor
    const reputationActor = await createReputationActor();

    // Call IC canister to update reputation
    const principal = Principal.fromText(userId);
    const result = await reputationActor.setUserReputation(
      principal,
      BigInt(reputationScore),
    );

    if ("ok" in result) {
      return {success: true, message: result.ok};
    } else {
      throw new Error(result.err || "Failed to update reputation in canister");
    }
  } catch (error) {
    console.error("Error in updateUserReputation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.updateUserPhoneNumber = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {userId, phone} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can update phone numbers",
    );
  }

  if (!userId || typeof userId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required",
    );
  }

  const normalizedPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (!normalizedPhone || !/^(09|9)\d{9}$/.test(normalizedPhone)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid phone number format. Must be 10 or 11 digits starting with 9 or 09",
    );
  }

  if (await isPhoneTaken(normalizedPhone, userId)) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Phone number is already registered to another user",
    );
  }

  try {
    await db.collection("users").doc(userId).update({
      phone: normalizedPhone,
      updatedAt: new Date().toISOString(),
      updatedBy: authInfo.uid,
    });

    return {
      success: true,
      message: "Phone number updated successfully",
    };
  } catch (error) {
    console.error("Error in updateUserPhoneNumber:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update certificate validation status
 */
exports.updateCertificateValidationStatus = functions.https.onCall(async (data, context) => {
  const payload = data.data || data;
  const {certificateId, status} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can validate certificates",
    );
  }

  if (!certificateId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Certificate ID is required",
    );
  }

  if (!["Pending", "Validated", "Rejected"].includes(status)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid validation status. Must be Pending, Validated, or Rejected",
    );
  }

  try {
    // Get the media document
    const mediaDoc = await db.collection("media").doc(certificateId).get();

    if (!mediaDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Certificate not found",
      );
    }

    const mediaData = mediaDoc.data();

    // Verify it's a certificate
    if (mediaData.mediaType !== "ServiceCertificate") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "This media item is not a service certificate",
      );
    }

    // Update the validation status
    await db.collection("media").doc(certificateId).update({
      validationStatus: status,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Certificate ${status.toLowerCase()} successfully`,
    };
  } catch (error) {
    console.error("Error in updateCertificateValidationStatus:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get validated certificates
 * Returns certificates with their service information
 */
exports.getValidatedCertificates = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get validated certificates",
    );
  }

  try {
    // Get all validated certificates from media collection
    const certSnapshot = await db.collection("media")
      .where("mediaType", "==", "ServiceCertificate")
      .where("validationStatus", "==", "Validated")
      .get();

    const validatedCerts = certSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all services to match certificates to services
    const {getAllServicesInternal} = require("./service");
    const services = await getAllServicesInternal();

    // Match certificates to services and format
    const certificates = [];
    for (const cert of validatedCerts) {
      // Find service that contains this certificate URL
      const service = services.find((s) =>
        s.certificateUrls && s.certificateUrls.includes(cert.url),
      );

      if (service) {
        const certificateIndex = service.certificateUrls.indexOf(cert.url);
        certificates.push({
          id: `${service.id}-${cert.url}-${cert.updatedAt || Date.now()}`,
          service: {
            serviceId: service.id,
            serviceTitle: service.title,
            providerId: service.providerId,
            certificateUrls: service.certificateUrls,
          },
          certificateIndex,
          certificateUrl: cert.url,
          approvedAt: cert.updatedAt || new Date().toISOString(),
        });
      }
    }

    return {success: true, data: certificates};
  } catch (error) {
    console.error("Error in getValidatedCertificates:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get rejected certificates
 * Returns certificates with their service information
 */
exports.getRejectedCertificates = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can get rejected certificates",
    );
  }

  try {
    // Get all rejected certificates from media collection
    const certSnapshot = await db.collection("media")
      .where("mediaType", "==", "ServiceCertificate")
      .where("validationStatus", "==", "Rejected")
      .get();

    const rejectedCerts = certSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get all services to match certificates to services
    const {getAllServicesInternal} = require("./service");
    const services = await getAllServicesInternal();

    // Match certificates to services and format
    const certificates = [];
    for (const cert of rejectedCerts) {
      // Find service that contains this certificate URL
      const service = services.find((s) =>
        s.certificateUrls && s.certificateUrls.includes(cert.url),
      );

      if (service) {
        const certificateIndex = service.certificateUrls.indexOf(cert.url);
        certificates.push({
          id: `${service.id}-${cert.url}-${cert.updatedAt || Date.now()}`,
          service: {
            serviceId: service.id,
            serviceTitle: service.title,
            providerId: service.providerId,
            certificateUrls: service.certificateUrls,
          },
          certificateIndex,
          certificateUrl: cert.url,
          rejectedAt: cert.updatedAt || new Date().toISOString(),
        });
      }
    }

    return {success: true, data: certificates};
  } catch (error) {
    console.error("Error in getRejectedCertificates:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all services with certificates for validation
 */
exports.getServicesWithCertificates = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can view services with certificates",
    );
  }

  try {
    // Import internal functions
    const {getAllServicesInternal} = require("./service");
    const {getCertificatesByValidationStatusInternal} = require("./media");

    // Get all services
    const services = await getAllServicesInternal();

    // Get all pending certificates
    const pendingCerts = await getCertificatesByValidationStatusInternal("Pending");
    const pendingCertUrls = pendingCerts.map((cert) => cert.url);

    const servicesWithCerts = [];

    for (const service of services) {
      if (service.certificateUrls && service.certificateUrls.length > 0) {
        // Filter to only include pending certificate URLs
        const servicePendingCerts = service.certificateUrls.filter((url) =>
          pendingCertUrls.includes(url),
        );

        // Only add service if it has pending certificates
        if (servicePendingCerts.length > 0) {
          // Get provider name from auth
          let providerName = "Unknown Provider";
          try {
            const userDoc = await db.collection("users").doc(service.providerId).get();
            if (userDoc.exists) {
              providerName = userDoc.data().name || "Unknown Provider";
            } else {
              providerName = `Provider ${service.providerId}`;
            }
          } catch (error) {
            console.error("Error fetching provider name:", error);
            providerName = `Provider ${service.providerId}`;
          }

          servicesWithCerts.push({
            serviceId: service.id,
            serviceTitle: service.title,
            providerId: service.providerId,
            providerName: providerName,
            certificateUrls: servicePendingCerts,
            createdAt: service.createdAt,
          });
        }
      }
    }

    return {success: true, data: servicesWithCerts};
  } catch (error) {
    console.error("Error in getServicesWithCertificates:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get pending certificate validations
 */
exports.getPendingCertificateValidations = functions.https.onCall(async (data, context) => {
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can view certificate validations",
    );
  }

  try {
    const snapshot = await db.collection("certificateValidations")
      .where("status", "==", "Pending")
      .get();

    const pendingValidations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {success: true, data: pendingValidations};
  } catch (error) {
    console.error("Error in getPendingCertificateValidations:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.getBookingsData = functions.https.onRequest(async (req, res) => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS ||
    "https://srvadmin.web.app,https://srvpinoy.com,http://localhost:5173,http://127.0.0.1:5173";
  const allowedOrigins = allowedOriginsEnv.split(",").map((origin) => origin.trim());

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  } else if (process.env.FUNCTIONS_EMULATOR === "true") {
    // In emulator, allow all origins for development
    res.set("Access-Control-Allow-Origin", "*");
  } else {
    // In production, only allow configured origins or deny
    res.set("Access-Control-Allow-Origin", allowedOrigins[0] || "*");
  }

  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid authorization header",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid token",
      });
    }

    const isAdmin = decodedToken.isAdmin || false;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only ADMIN users can get bookings data",
      });
    }

    const bookingsSnapshot = await db.collection("bookings").get();

    const bookings = bookingsSnapshot.docs.map((doc) => {
      const data = doc.data();
      const convertDate = (dateValue) => {
        if (!dateValue) return null;
        if (dateValue instanceof Date) return dateValue;
        return new Date(dateValue);
      };

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: convertDate(data.updatedAt),
        requestedDate: convertDate(data.requestedDate),
        scheduledDate: convertDate(data.scheduledDate),
        startedDate: convertDate(data.startedDate),
        completedDate: convertDate(data.completedDate),
        releasedAt: convertDate(data.releasedAt),
      };
    });

    const commissionTransactionsSnapshot = await db.collection("transactions")
      .where("transaction_type", "==", "Debit")
      .where("payment_channel", "==", "SRV_COMMISSION")
      .get();

    const commissionTransactions = commissionTransactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: new Date(doc.data().timestamp),
    }));

    return res.status(200).json({
      success: true,
      bookings: bookings,
      commissionTransactions: commissionTransactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Auto-reactivate user accounts when suspension period expires
 * Scheduled function that runs every hour to check for expired suspensions
 */
exports.autoReactivateSuspendedAccounts = onSchedule("0 * * * *", async (_event) => {
  try {
    const now = new Date();

    // Find all locked users with suspensionEndDate that has passed
    const expiredSuspensionsQuery = await db.collection("users")
      .where("locked", "==", true)
      .where("suspensionEndDate", "<=", now.toISOString())
      .get();

    if (expiredSuspensionsQuery.empty) {
      return {success: true, count: 0};
    }

    const batch = db.batch();
    let reactivatedCount = 0;

    // Process each expired suspension
    for (const doc of expiredSuspensionsQuery.docs) {
      const user = doc.data();

      // Update user's locked status in Firestore
      batch.update(doc.ref, {
        locked: false,
        suspensionEndDate: null,
        updatedAt: now.toISOString(),
      });

      // Enable user in Firebase Auth
      try {
        await admin.auth().updateUser(user.id, {disabled: false});
      } catch (authError) {
        console.error(`Failed to enable user ${user.id} in Firebase Auth:`, authError.message);
        // Continue with Firestore update even if Auth update fails
      }

      reactivatedCount++;
    }

    if (reactivatedCount > 0) {
      await batch.commit();
    }

    return {success: true, count: reactivatedCount};
  } catch (error) {
    console.error("Error reactivating suspended accounts:", error);
    throw error;
  }
});

