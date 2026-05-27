const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {admin, getFirestore} = require("../firebase-admin");
const {isPhoneTaken} = require("./account");
const bcrypt = require("bcryptjs");
const {FieldValue} = require("firebase-admin/firestore");

const db = getFirestore();

const MAX_BATCH_SIZE = 450;

async function commitBatchInChunks(operations) {
  for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + MAX_BATCH_SIZE);
    for (const op of chunk) {
      if (op.type === "update") batch.update(op.ref, op.data);
      else if (op.type === "delete") batch.delete(op.ref);
      else if (op.type === "set") batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

function extractStoragePath(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const path = decodeURIComponent(parsed.pathname.substring(1));
    if (path.startsWith("v0/b/")) {
      const parts = path.split("/");
      const oIndex = parts.indexOf("o");
      if (oIndex >= 0 && oIndex < parts.length - 1) {
        return parts.slice(oIndex + 1).join("/");
      }
    }
    return path;
  } catch {
    return null;
  }
}

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
 * @param {Object} request
 */
async function getUserRoleService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * List all user roles
 * @param {Object} request
 */
async function listUserRolesService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Check if user has specific role
 * @param {Object} request
 */
async function hasRoleService(request) {
  const data = request.data;
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update system settings
 * @param {Object} request
 */
async function setSettingsService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {
    restrictNewAdminLogins,
  } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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

    await db.collection("systemSettings").doc(SETTINGS_KEY).set(settings, {merge: true});

    return {success: true, message: "System settings updated successfully"};
  } catch (error) {
    console.error("Error in setSettings:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get current system settings
 * @param {Object} request
 */
async function getSettingsService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can get system settings",
    );
  }

  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();

    if (!settingsDoc.exists) {
      const defaultSettings = {
        restrictNewAdminLogins: false,
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

    return {success: true, data: settingsData};
  } catch (error) {
    console.error("Error in getSettings:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Change admin access password
 * @param {Object} request
 */
async function changeAdminPasswordService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {oldPassword, newPassword, confirmPassword} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can change the admin password",
    );
  }

  if (!newPassword || !confirmPassword) {
    throw new HttpsError(
      "invalid-argument",
      "New password and confirmation are required",
    );
  }

  if (newPassword !== confirmPassword) {
    throw new HttpsError(
      "invalid-argument",
      "New password and confirmation do not match",
    );
  }

  if (newPassword.length < 8) {
    throw new HttpsError(
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
        throw new HttpsError(
          "invalid-argument",
          "Old password is required when changing an existing password",
        );
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, settings.adminPasswordHash);
      if (!isOldPasswordValid) {
        throw new HttpsError(
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
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in changeAdminPassword:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Check if admin password is set
 * @param {Object} _request
 */
async function isAdminPasswordSetService(_request) {
  try {
    const settingsDoc = await db.collection("systemSettings").doc(SETTINGS_KEY).get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    return {
      success: true,
      isSet: !!settings.adminPasswordHash,
    };
  } catch (error) {
    console.error("Error in isAdminPasswordSet:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Verify admin password
 * @param {Object} request
 */
async function verifyAdminPasswordService(request) {
  const data = request.data;
  const payload = data;
  const {password} = payload;

  if (!password) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get system statistics
 * @param {Object} request
 */
async function getSystemStatsService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all users
 * @param {Object} request
 */
async function getAllUsersService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all user lock statuses from users collection
 * @param {Object} request
 */
async function getAllUserLockStatusesService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get user services and bookings combined
 * @param {Object} request
 */
async function getUserServicesAndBookingsService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get user service count
 * @param {Object} request
 */
async function getUserServiceCountService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Lock or unlock user account with optional time-based suspension
 * @param {Object} request
 * @param {string} request.data.userId - User ID to lock/unlock
 * @param {boolean} request.data.locked - Whether to lock the account
 * @param {number|null} request.data.suspensionDurationDays
 * Duration in days (7, 30, custom number, or null for indefinite)
 */
async function lockUserAccountService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, locked, suspensionDurationDays} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can lock/unlock user accounts",
    );
  }

  try {
    if (!locked) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists && userDoc.data().deletedAt) {
        throw new HttpsError(
          "failed-precondition",
          "Cannot unlock a deleted account. Use restore to reactivate it.",
        );
      }
    }

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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update user reputation score
 * @param {Object} request
 */
async function updateUserReputationService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, reputationScore} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can update user reputation",
    );
  }

  try {
    const {updateReputationInternal} = require("./reputation");

    const result = await updateReputationInternal(userId, reputationScore);
    return {success: true, message: result.message};
  } catch (error) {
    console.error("Error in updateUserReputation:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update user phone number
 * @param {Object} request
 */
async function updateUserPhoneNumberService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, phone} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can update phone numbers",
    );
  }

  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "User ID is required");
  }

  const normalizedPhone = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (!normalizedPhone || !/^(09|9)\d{9}$/.test(normalizedPhone)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid phone number format. Must be 10 or 11 digits starting with 9 or 09",
    );
  }

  if (await isPhoneTaken(normalizedPhone, userId)) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update certificate validation status
 * @param {Object} request
 */
async function updateCertificateValidationStatusService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {certificateId, status} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can validate certificates",
    );
  }

  if (!certificateId) {
    throw new HttpsError(
      "invalid-argument",
      "Certificate ID is required",
    );
  }

  if (!["Pending", "Validated", "Rejected"].includes(status)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid validation status. Must be Pending, Validated, or Rejected",
    );
  }

  try {
    // Get the media document
    const mediaDoc = await db.collection("media").doc(certificateId).get();

    if (!mediaDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Certificate not found",
      );
    }

    const mediaData = mediaDoc.data();

    // Verify it's a certificate
    if (mediaData.mediaType !== "ServiceCertificate") {
      throw new HttpsError(
        "invalid-argument",
        "This media item is not a service certificate",
      );
    }

    // Update the validation status in media collection
    await db.collection("media").doc(certificateId).update({
      validationStatus: status,
      updatedAt: new Date().toISOString(),
    });

    // Also update the certificateMedia array in the services collection
    const certificateUrl = mediaData.url;
    if (certificateUrl) {
      // Find services that contain this certificate by checking provider's services
      const providerId = mediaData.ownerId;
      let servicesToUpdate = [];

      if (providerId) {
        const providerServicesSnapshot = await db.collection("services")
          .where("providerId", "==", providerId)
          .get();
        servicesToUpdate = providerServicesSnapshot.docs.filter((doc) => {
          const data = doc.data();
          return data.certificateMedia &&
          data.certificateMedia.some((m) => m.url === certificateUrl);
        });
      }

      if (servicesToUpdate.length > 0) {
        const batch = db.batch();
        const now = new Date().toISOString();

        servicesToUpdate.forEach((serviceDoc) => {
          const serviceData = serviceDoc.data();
          const updatedCertificateMedia = (serviceData.certificateMedia || []).map((cert) => {
            if (cert.url === certificateUrl) {
              return {...cert, validationStatus: status, updatedAt: now};
            }
            return cert;
          });

          batch.update(serviceDoc.ref, {
            certificateMedia: updatedCertificateMedia,
            updatedAt: now,
          });
        });

        await batch.commit();
      }
    }

    return {
      success: true,
      message: `Certificate ${status.toLowerCase()} successfully`,
    };
  } catch (error) {
    console.error("Error in updateCertificateValidationStatus:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get validated certificates
 * Returns certificates with their service information
 * @param {Object} request
 */
async function getValidatedCertificatesService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
      // Find service that contains this certificate in certificateMedia
      const service = services.find((s) =>
        s.certificateMedia && s.certificateMedia.some((m) => m.url === cert.url),
      );

      if (service) {
        const certificateIndex = service.certificateMedia.findIndex((m) => m.url === cert.url);
        certificates.push({
          id: `${service.id}-${cert.url}-${cert.updatedAt || Date.now()}`,
          service: {
            serviceId: service.id,
            serviceTitle: service.title,
            providerId: service.providerId,
            certificateMedia: service.certificateMedia,
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get rejected certificates
 * Returns certificates with their service information
 * @param {Object} request
 */
async function getRejectedCertificatesService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
      // Find service that contains this certificate in certificateMedia
      const service = services.find((s) =>
        s.certificateMedia && s.certificateMedia.some((m) => m.url === cert.url),
      );

      if (service) {
        const certificateIndex = service.certificateMedia.findIndex((m) => m.url === cert.url);
        certificates.push({
          id: `${service.id}-${cert.url}-${cert.updatedAt || Date.now()}`,
          service: {
            serviceId: service.id,
            serviceTitle: service.title,
            providerId: service.providerId,
            certificateMedia: service.certificateMedia,
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all services with certificates for validation
 * @param {Object} request
 */
async function getServicesWithCertificatesService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
      if (service.certificateMedia && service.certificateMedia.length > 0) {
        // Filter to only include pending certificate media items
        const servicePendingCerts = service.certificateMedia.filter((m) =>
          pendingCertUrls.includes(m.url),
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
            certificateMedia: servicePendingCerts,
            createdAt: service.createdAt,
          });
        }
      }
    }

    return {success: true, data: servicesWithCerts};
  } catch (error) {
    console.error("Error in getServicesWithCertificates:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get pending certificate validations
 * @param {Object} request
 */
async function getPendingCertificateValidationsService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get bookings data
 * @param {Object} request
 */
async function getBookingsDataService(request) {
  const {auth: callerAuth} = request;

  if (!callerAuth) {
    throw new HttpsError("unauthenticated", "Unauthorized: Authentication required");
  }

  const isAdmin = callerAuth.token?.isAdmin || false;
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Forbidden: Only ADMIN users can get bookings data");
  }

  try {
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

    return {
      success: true,
      data: {
        bookings,
        commissionTransactions,
      },
    };
  } catch (error) {
    console.error("Error in getBookingsData:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Auto-reactivate user accounts when suspension period expires
 * Scheduled function that runs every hour to check for expired suspensions
 */
exports.autoReactivateSuspendedAccounts = onSchedule("0 0 * * *", async (_event) => {
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


/**
 * Auto-create admin profile and assign role for development
 * @param {Object} request
 */
async function createAdminProfileService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;

  const {principal, phone, uid: providedUid} = payload;

  // Get UID from context if authenticated, otherwise use provided UID
  let uid;

  if (context.auth) {
    uid = context.auth.uid;
  } else if (providedUid) {
    uid = providedUid;
  } else {
    throw new HttpsError(
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
        throw new HttpsError(
          "permission-denied",
          `You are not allowed`,
        );
      }
    }
  } catch (error) {
    if (error instanceof HttpsError) {
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Restore a soft-deleted user account
 * @param {Object} request
 */
async function restoreUserAccountService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can restore user accounts",
    );
  }

  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "User ID is required");
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    if (!userData.deletedAt) {
      throw new HttpsError(
        "failed-precondition",
        "This account has not been deleted",
      );
    }

    const now = new Date().toISOString();
    const restoredName = userData.previousName || "Restored User";
    const restoredPhone = userData.previousPhone || "";
    const restoredEmail = userData.previousEmail || "";
    const restoredProfilePicture = userData.previousProfilePicture || null;
    const restoredBiography = userData.previousBiography || "";

    await db.collection("users").doc(userId).update({
      name: restoredName,
      previousName: null,
      phone: restoredPhone,
      email: restoredEmail,
      previousPhone: null,
      previousEmail: null,
      profilePicture: restoredProfilePicture,
      previousProfilePicture: null,
      biography: restoredBiography,
      previousBiography: null,
      deletedAt: null,
      deletedBy: null,
      locked: false,
      suspensionEndDate: null,
      isActive: true,
      updatedAt: now,
      updatedBy: authInfo.uid,
    });

    try {
      await admin.auth().updateUser(userId, {disabled: false});
    } catch (authError) {
      console.error(`Failed to enable auth for user ${userId}:`, authError.message);
      throw new HttpsError(
        "internal",
        `User data restored but failed to re-enable auth account: ${authError.message}`,
      );
    }

    return {success: true, message: "User account restored successfully"};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in restoreUserAccount:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Delete user account (soft delete)
 * Anonymizes profile, disables auth, cancels active bookings, archives services
 * @param {Object} request
 */
async function deleteUserAccountService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can delete user accounts",
    );
  }

  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "User ID is required");
  }

  if (userId === authInfo.uid) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot delete your own account",
    );
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    if (userData.deletedAt) {
      throw new HttpsError(
        "already-exists",
        "User account is already deleted",
      );
    }

    const now = new Date().toISOString();
    const deletedName = "Deleted User";
    const previousName = userData.name || "Unknown";
    const previousPhone = userData.phone || "";
    const previousEmail = userData.email || "";
    const previousProfilePicture = userData.profilePicture || null;
    const previousBiography = userData.biography || "";

    await db.collection("users").doc(userId).update({
      name: deletedName,
      previousName: previousName,
      phone: "",
      email: "",
      previousPhone: previousPhone,
      previousEmail: previousEmail,
      profilePicture: null,
      previousProfilePicture: previousProfilePicture,
      biography: "",
      previousBiography: previousBiography,
      totalEarnings: 0,
      lastActivity: null,
      isActive: false,
      locked: true,
      suspensionEndDate: null,
      deletedAt: now,
      deletedBy: authInfo.uid,
      updatedAt: now,
      updatedBy: authInfo.uid,
    });

    try {
      await admin.auth().updateUser(userId, {disabled: true});
    } catch (authError) {
      console.error(`Failed to disable auth for user ${userId}:`, authError.message);
    }

    const activeStatuses = ["Requested", "Accepted", "InProgress"];
    const bookingsToCancel = [];

    for (const status of activeStatuses) {
      const clientSnapshot = await db.collection("bookings")
        .where("clientId", "==", userId)
        .where("status", "==", status)
        .get();
      clientSnapshot.forEach((doc) => bookingsToCancel.push(doc));

      const providerSnapshot = await db.collection("bookings")
        .where("providerId", "==", userId)
        .where("status", "==", status)
        .get();
      providerSnapshot.forEach((doc) => bookingsToCancel.push(doc));
    }

    const canceledCount = bookingsToCancel.length;
    if (canceledCount > 0) {
      const bookingUpdates = {};
      bookingsToCancel.forEach((doc) => {
        bookingUpdates[doc.id] = doc;
      });

      const cancelOps = Object.values(bookingUpdates).map((doc) => ({
        type: "update",
        ref: doc.ref,
        data: {
          status: "Cancelled",
          cancelledBy: "System",
          cancelledAt: now,
          cancelReason: "User account deleted",
          updatedAt: now,
        },
      }));
      await commitBatchInChunks(cancelOps);
    }

    const servicesSnapshot = await db.collection("services")
      .where("providerId", "==", userId)
      .where("status", "==", "Available")
      .get();

    let archivedCount = 0;
    if (!servicesSnapshot.empty) {
      const ops = servicesSnapshot.docs.map((doc) => {
        archivedCount++;
        return {
          type: "update",
          ref: doc.ref,
          data: {
            status: "Archived",
            archivedAt: now,
            updatedAt: now,
          },
        };
      });
      await commitBatchInChunks(ops);
    }

    try {
      await db.collection("userRoles").doc(userId).delete();
    } catch (roleError) {
      console.error(`Failed to delete user role for ${userId}:`, roleError.message);
    }

    return {
      success: true,
      message: `User account deleted successfully. Canceled ${canceledCount} active bookings, archived ${archivedCount} services.`,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in deleteUserAccount:", error);
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Permanently delete a user account (hard delete)
 * Irreversible: clears all user references, deletes from Auth and Firestore
 * @param {Object} request
 */
async function permanentDeleteUserService(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can permanently delete user accounts",
    );
  }

  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "User ID is required");
  }

  if (userId === authInfo.uid) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot delete your own account",
    );
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    if (!userData.deletedAt) {
      throw new HttpsError(
        "failed-precondition",
        "Account must be soft-deleted first before permanent deletion",
      );
    }

    const now = new Date().toISOString();
    const deletedName = "Deleted User";

    const activeStatuses = ["Requested", "Accepted", "InProgress"];
    const bookingsToCancel = [];
    for (const status of activeStatuses) {
      const clientSnapshot = await db.collection("bookings")
        .where("clientId", "==", userId)
        .where("status", "==", status)
        .get();
      clientSnapshot.forEach((doc) => bookingsToCancel.push(doc));
      const providerSnapshot = await db.collection("bookings")
        .where("providerId", "==", userId)
        .where("status", "==", status)
        .get();
      providerSnapshot.forEach((doc) => bookingsToCancel.push(doc));
    }

    const uniqueBookings = new Map();
    bookingsToCancel.forEach((doc) => uniqueBookings.set(doc.id, doc));
    if (uniqueBookings.size > 0) {
      const cancelOps = [];
      uniqueBookings.forEach((doc) => {
        cancelOps.push({
          type: "update",
          ref: doc.ref,
          data: {
            status: "Cancelled",
            cancelledBy: "System",
            cancelledAt: now,
            cancelReason: "User account permanently deleted",
            updatedAt: now,
          },
        });
      });
      await commitBatchInChunks(cancelOps);
    }

    const servicesSnapshot = await db.collection("services")
      .where("providerId", "==", userId)
      .where("status", "==", "Available")
      .get();
    if (!servicesSnapshot.empty) {
      const ops = servicesSnapshot.docs.map((doc) => ({
        type: "update",
        ref: doc.ref,
        data: {
          status: "Archived",
          archivedAt: now,
          updatedAt: now,
        },
      }));
      await commitBatchInChunks(ops);
    }

    const allServicesSnapshot = await db.collection("services")
      .where("providerId", "==", userId)
      .get();
    if (!allServicesSnapshot.empty) {
      const ops = allServicesSnapshot.docs.map((doc) => ({
        type: "update",
        ref: doc.ref,
        data: {
          providerId: "",
          providerName: deletedName,
          updatedAt: now,
        },
      }));
      await commitBatchInChunks(ops);
    }

    for (const field of ["clientId", "providerId"]) {
      const snapshot = await db.collection("bookings")
        .where(field, "==", userId)
        .get();
      if (!snapshot.empty) {
        const ops = snapshot.docs.map((doc) => {
          const update = {updatedAt: now};
          update[field] = "";
          return {type: "update", ref: doc.ref, data: update};
        });
        await commitBatchInChunks(ops);
      }
    }

    for (const field of ["clientId", "providerId"]) {
      const snapshot = await db.collection("reviews")
        .where(field, "==", userId)
        .get();
      if (!snapshot.empty) {
        const ops = snapshot.docs.map((doc) => {
          const update = {};
          update[field] = "";
          return {type: "update", ref: doc.ref, data: update};
        });
        await commitBatchInChunks(ops);
      }
    }

    for (const field of ["clientId", "providerId"]) {
      const snapshot = await db.collection("providerReviews")
        .where(field, "==", userId)
        .get();
      if (!snapshot.empty) {
        const ops = snapshot.docs.map((doc) => {
          const update = {};
          update[field] = "";
          return {type: "update", ref: doc.ref, data: update};
        });
        await commitBatchInChunks(ops);
      }
    }

    for (const field of ["clientId", "providerId"]) {
      const snapshot = await db.collection("conversations")
        .where(field, "==", userId)
        .get();
      if (!snapshot.empty) {
        const ops = snapshot.docs.map((doc) => ({
          type: "delete",
          ref: doc.ref,
        }));
        await commitBatchInChunks(ops);
      }
    }

    const messagesToDelete = [];
    for (const field of ["senderId", "receiverId"]) {
      const snapshot = await db.collection("messages")
        .where(field, "==", userId)
        .get();
      snapshot.forEach((doc) => messagesToDelete.push(doc));
    }
    if (messagesToDelete.length > 0) {
      const uniqueMessages = new Map();
      messagesToDelete.forEach((doc) => uniqueMessages.set(doc.id, doc));
      const ops = [];
      uniqueMessages.forEach((doc) => {
        ops.push({type: "delete", ref: doc.ref});
      });
      await commitBatchInChunks(ops);
    }

    const notificationsSnapshot = await db.collection("notifications")
      .where("userId", "==", userId)
      .get();
    if (!notificationsSnapshot.empty) {
      const ops = notificationsSnapshot.docs.map((doc) => ({
        type: "delete",
        ref: doc.ref,
      }));
      await commitBatchInChunks(ops);
    }

    const mediaSnapshot = await db.collection("media")
      .where("ownerId", "==", userId)
      .get();
    const mediaDocsToDelete = [];
    const bucket = admin.storage().bucket();
    for (const doc of mediaSnapshot.docs) {
      const mediaData = doc.data();
      const filePath = mediaData.filePath;
      if (filePath) {
        try {
          await bucket.file(filePath).delete();
        } catch (storageError) {
          console.error(
            `Failed to delete storage file ${filePath}:`,
            storageError.message,
          );
        }
      }
      if (mediaData.thumbnailUrl) {
        try {
          const thumbnailPath = extractStoragePath(mediaData.thumbnailUrl);
          if (thumbnailPath && thumbnailPath !== filePath) {
            await bucket.file(thumbnailPath).delete();
          }
        } catch (thumbError) {
          console.error(
            `Failed to delete thumbnail:`,
            thumbError.message,
          );
        }
      }
      mediaDocsToDelete.push({type: "delete", ref: doc.ref});
    }
    if (mediaDocsToDelete.length > 0) {
      await commitBatchInChunks(mediaDocsToDelete);
    }

    const reportsSnapshot = await db.collection("reports")
      .where("userId", "==", userId)
      .get();
    if (!reportsSnapshot.empty) {
      const ops = reportsSnapshot.docs.map((doc) => ({
        type: "update",
        ref: doc.ref,
        data: {
          userId: "",
          userName: deletedName,
        },
      }));
      await commitBatchInChunks(ops);
    }

    const feedbackSnapshot = await db.collection("app_feedback")
      .where("userId", "==", userId)
      .get();
    if (!feedbackSnapshot.empty) {
      const ops = feedbackSnapshot.docs.map((doc) => ({
        type: "update",
        ref: doc.ref,
        data: {
          userId: "",
          userName: deletedName,
        },
      }));
      await commitBatchInChunks(ops);
    }

    try {
      await db.collection("userRoles").doc(userId).delete();
    } catch (roleError) {
      console.error(`Failed to delete user role:`, roleError.message);
    }

    try {
      await admin.auth().deleteUser(userId);
    } catch (authError) {
      console.error(`Failed to delete auth user:`, authError.message);
    }

    await db.collection("users").doc(userId).delete();

    return {
      success: true,
      message: "User account permanently deleted",
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in permanentDeleteUser:", error);
    throw new HttpsError(
      "internal",
      `Permanent deletion failed for user ${userId}. Some data may have been partially removed; a retry may succeed. Error: ${error.message}`,
    );
  }
}

exports.adminUserAction = onCall(
  {
    enforceAppCheck: false,
  },
  async (request) => {
    const {action, payload} = request.data || {};
    const auth = request.auth;

    if (!action) {
      throw new HttpsError("invalid-argument", "Action is required");
    }

    // Mock request object for internal services
    const innerRequest = {
      auth,
      data: payload,
      rawRequest: request,
    };

    try {
      switch (action) {
      case "getUserRole": return await getUserRoleService(innerRequest);
      case "listUserRoles": return await listUserRolesService(innerRequest);
      case "hasRole": return await hasRoleService(innerRequest);
      case "setSettings": return await setSettingsService(innerRequest);
      case "getSettings": return await getSettingsService(innerRequest);
      case "changeAdminPassword": return await changeAdminPasswordService(innerRequest);
      case "isAdminPasswordSet": return await isAdminPasswordSetService(innerRequest);
      case "verifyAdminPassword": return await verifyAdminPasswordService(innerRequest);
      case "getSystemStats": return await getSystemStatsService(innerRequest);
      case "getAllUsers": return await getAllUsersService(innerRequest);
      case "getAllUserLockStatuses": return await getAllUserLockStatusesService(innerRequest);
      case "getUserServicesAndBookings":
        return await getUserServicesAndBookingsService(innerRequest);
      case "getUserServiceCount": return await getUserServiceCountService(innerRequest);
      case "lockUserAccount": return await lockUserAccountService(innerRequest);
      case "updateUserReputation": return await updateUserReputationService(innerRequest);
      case "updateUserPhoneNumber": return await updateUserPhoneNumberService(innerRequest);
      case "updateCertificateValidationStatus":
        return await updateCertificateValidationStatusService(innerRequest);
      case "getValidatedCertificates": return await getValidatedCertificatesService(innerRequest);
      case "getRejectedCertificates": return await getRejectedCertificatesService(innerRequest);
      case "getServicesWithCertificates":
        return await getServicesWithCertificatesService(innerRequest);
      case "getPendingCertificateValidations":
        return await getPendingCertificateValidationsService(innerRequest);
      case "getBookingsData": return await getBookingsDataService(innerRequest);
      case "createAdminProfile": return await createAdminProfileService(innerRequest);
      case "deleteUserAccount": return await deleteUserAccountService(innerRequest);
      case "restoreUserAccount": return await restoreUserAccountService(innerRequest);
      case "permanentDeleteUser": return await permanentDeleteUserService(innerRequest);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
  },
);
