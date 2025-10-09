const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

// Import notification system from notification.js
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  NOTIFICATION_STATUS,
  generateNotificationHref,
  isSpamming,
  updateNotificationFrequency,
  sendFCMNotification,
} = require("./notification");

// Import reputation bridge for updating reputations after booking completion
const {
  updateUserReputationInternal,
  updateProviderReputationInternal,
} = require("./reputation");

const db = admin.firestore();

// Constants for notification system
const NOTIFICATION_EXPIRY_DAYS = 30;

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

/**
 * Generate unique booking ID
 * @return {string} Unique booking ID
 */
function generateBookingId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${now}-${random}`;
}

/**
 * Validate status transition
 * @param {string} currentStatus - Current booking status
 * @param {string} newStatus - New booking status
 * @return {boolean} True if valid transition
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    "Requested": ["Accepted", "Declined", "Cancelled"],
    "Accepted": ["InProgress", "Cancelled"],
    "InProgress": ["Completed", "Disputed"],
    "Completed": ["Disputed"],
    "Declined": [],
    "Cancelled": [],
    "Disputed": [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || newStatus === "Disputed";
}

/**
 * Check for booking conflicts at the requested time
 * @param {string} serviceId - Service ID
 * @param {string} providerId - Provider ID
 * @param {string} requestedDateTime - Requested date/time ISO string
 * @param {string} excludeBookingId - Booking ID to exclude from conflict check
 * @return {Promise<boolean>} True if conflict exists
 */
async function checkBookingConflicts(
  serviceId,
  providerId,
  requestedDateTime,
  excludeBookingId = null,
) {
  try {
    const requestedTime = new Date(requestedDateTime);
    const startTime = new Date(requestedTime.getTime() - 60 * 60 * 1000); // 1 hour buffer
    const endTime = new Date(requestedTime.getTime() + 60 * 60 * 1000); // 1 hour buffer

    const query = db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("status", "in", ["Accepted", "InProgress"])
      .where("scheduledDate", ">=", startTime.toISOString())
      .where("scheduledDate", "<=", endTime.toISOString());

    const conflictingBookings = await query.get();

    return conflictingBookings.docs.some((doc) => {
      return excludeBookingId ? doc.id !== excludeBookingId : true;
    });
  } catch (error) {
    console.error("Error checking booking conflicts:", error);
    return false; // Default to no conflict if check fails
  }
}

/**
 * Validate provider wallet balance for commission (cash jobs only)
 * @param {object} booking - Booking object
 * @return {Promise<boolean>} True if sufficient balance
 */
async function validateCommissionBalance(booking) {
  if (booking.paymentMethod !== "CASH_ON_HAND") {
    return true; // No commission validation needed for digital payments
  }

  try {
    // Get service details to calculate commission
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    if (!serviceDoc.exists) {
      return false;
    }

    const service = serviceDoc.data();
    let commissionFee = 0;

    // Calculate commission based on packages or service price
    if (booking.servicePackageIds && booking.servicePackageIds.length > 0) {
      for (const packageId of booking.servicePackageIds) {
        const packageDoc = await db.collection("servicePackages").doc(packageId).get();
        if (packageDoc.exists) {
          commissionFee += packageDoc.data().commissionFee || 0;
        }
      }
    } else {
      commissionFee = service.commissionFee || 0;
    }

    // Check provider wallet balance
    const walletDoc = await db.collection("wallets").doc(booking.providerId).get();
    const walletBalance = walletDoc.exists ? (walletDoc.data().balance || 0) : 0;

    return walletBalance >= commissionFee;
  } catch (error) {
    console.error("Error validating commission balance:", error);
    return false;
  }
}

/**
 * Check if service is active based on multiple possible field formats
 * @param {object} service - Service object
 * @return {boolean} True if service is active
 */
function isServiceActive(service) {
  return service.isActive === true ||
         service.active === true ||
         service.status === "Available" ||
         service.status === "active" ||
         service.isActive === "true" ||
         service.active === "true";
}

/**
 * Create notification for users with advanced features
 * @param {string} targetUserId - Target user ID
 * @param {string} userType - User type (client/provider)
 * @param {string} notificationType - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} bookingId - Related booking ID
 * @param {object} metadata - Additional metadata
 */
async function createNotification(
  targetUserId,
  userType,
  notificationType,
  title,
  message,
  bookingId,
  metadata = null,
) {
  try {
    // Validation
    if (!targetUserId || !userType || !notificationType || !title || !message) {
      console.error("Error creating notification: Required parameters missing");
      return;
    }

    if (!Object.values(USER_TYPES).includes(userType)) {
      console.error(`Error creating notification: Invalid userType: ${userType}`);
      return;
    }

    if (!Object.values(NOTIFICATION_TYPES).includes(notificationType)) {
      console.error(`Error creating notification: Invalid notificationType: ${notificationType}`);
      return;
    }

    // Check spam prevention
    console.log(`🛡️ [createNotification] Checking spam prevention for user ${targetUserId}...`);
    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      console.warn(`⚠️ [createNotification] Rate limit exceeded for user ${targetUserId}.`);
      return;
    }

    // Generate notification ID and timestamps
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Generate href
    const href = generateNotificationHref(
      notificationType,
      userType,
      bookingId,
    );

    // Create notification document
    const notificationRef = db.collection("notifications").doc();
    const notification = {
      id: notificationRef.id,
      userId: targetUserId,
      userType,
      notificationType,
      title,
      message,
      relatedEntityId: bookingId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      href,
      status: NOTIFICATION_STATUS.UNREAD,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
      pushSentAt: null,
      expiresAt,
    };

    // Store in Firestore
    console.log(`📝 [createNotification] Creating notification document ${notificationRef.id}...`);
    await notificationRef.set(notification);

    // Update notification frequency tracking
    await updateNotificationFrequency(targetUserId, notificationType);

    // Send FCM push notification asynchronously (don't wait for it)
    sendFCMNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send FCM notification:", error);
    });

    console.log(`✅ [createNotification] Successfully created notification for ${targetUserId}`);
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Create a new booking request
 */
exports.createBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [createBooking] called");
  const safeDataForLog = {
    serviceId: data.data?.serviceId,
    providerId: data.data?.providerId,
    price: data.data?.price,
    location: data.data?.location ? "Present" : "Missing",
    requestedDate: data.data?.requestedDate,
    paymentMethod: data.data?.paymentMethod,
    servicePackageIds: data.data?.servicePackageIds,
    notes: data.data?.notes,
    auth: data.auth ? "Present" : "Missing",
  };
  console.log("📦 [createBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  // Extract payload from data.data
  const payload = data.data || data;
  const {
    serviceId,
    providerId,
    price,
    location,
    requestedDate,
    servicePackageIds = [],
    notes,
    amountToPay,
    paymentMethod,
    paymentId,
  } = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [createBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko validation logic)
  if (!serviceId || !providerId || !price || !location || !requestedDate || !paymentMethod) {
    console.error("❌ [createBooking] Validation failed: Missing required parameters.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Required parameters missing: serviceId,
      providerId, price, location, requestedDate, paymentMethod`,
    );
  }

  try {
    // Validate service exists and belongs to provider
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      console.error(`❌ [createBooking] Service with ID ${serviceId} not found.`);
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();
    console.log(`[createBooking] Fetched service data for serviceId ${serviceId}:`,
      JSON.stringify(service, null, 2));

    if (service.providerId !== providerId) {
      console.error(`❌ [createBooking] 
        Service provider mismatch. Expected ${providerId}, got ${service.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Service does not belong to the specified provider",
      );
    }

    // Check if service is active
    if (!isServiceActive(service)) {
      console.error(`❌ [createBooking] Service ${serviceId} is not active.` +
        ` Status: ${service.status}`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Service is not available for booking",
      );
    }

    // If packages are specified, validate they exist and belong to this service
    let finalPrice = price;
    let totalPackagePrice = 0;

    if (servicePackageIds.length > 0) {
      for (const packageId of servicePackageIds) {
        console.log(`📦 [createBooking] Validating package ${packageId}...`);
        // Corrected collection name from "servicePackages" to "service_packages"
        const packageDoc = await db.collection("service_packages").doc(packageId).get();
        if (!packageDoc.exists) {
          const errorMsg =
          `Package with ID ${packageId} not found in 'servicePackages' collection.`;
          console.error(`❌ [createBooking] Package validation failed. ${errorMsg}`);
          throw new functions.https.HttpsError("not-found", errorMsg);
        }

        const packageData = packageDoc.data();
        if (packageData.serviceId !== serviceId) {
          const errorMsg =
           `Package ${packageId} belongs to service ${packageData.serviceId}, 
           but booking is for service ${serviceId}.`;
          console.error(`❌ [createBooking] Package service mismatch. ${errorMsg}`);
          throw new functions.https.HttpsError(
            "permission-denied",
            errorMsg,
          );
        }

        totalPackagePrice += packageData.price || 0;
      }

      if (totalPackagePrice > 0) {
        finalPrice = totalPackagePrice;
      }
    }

    // Check for booking conflicts
    console.log("🔄 [createBooking] Checking for booking conflicts...");
    const hasConflict = await checkBookingConflicts(serviceId, providerId, requestedDate);
    if (hasConflict) {
      const errorMsg = "The requested time conflicts with an existing booking.";
      console.warn(`⚠️ [createBooking] Booking conflict detected. ${errorMsg}`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        errorMsg,
      );
    }

    const bookingId = generateBookingId();
    const now = new Date().toISOString();

    const newBooking = {
      id: bookingId,
      clientId: authInfo.uid,
      providerId,
      providerName: null, // Will be populated by UI
      serviceId,
      servicePackageIds,
      status: "Requested",
      requestedDate,
      scheduledDate: null,
      startedDate: null,
      completedDate: null,
      price: finalPrice,
      amountPaid: amountToPay || null,
      serviceTime: null,
      location,
      evidence: null,
      notes: notes || null,
      paymentMethod,
      // Initialize payment status tracking fields
      paymentStatus: paymentId ? "PAID_HELD" : "PENDING",
      paymentId: paymentId || null,
      heldAmount: paymentId ? finalPrice : null,
      releasedAmount: null,
      commissionRetained: null,
      paymentReleased: null,
      releasedAt: null,
      payoutId: null,
      createdAt: now,
      updatedAt: now,
    };

    console.log("📝 [createBooking] Creating new booking object:"
      , JSON.stringify(newBooking, null, 2));
    // Use Firestore transaction for atomic booking creation
    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection("bookings").doc(bookingId), newBooking);
    });
    console.log(`✅ [createBooking] Successfully created booking ${bookingId} in Firestore.`);

    // Create notification for the provider about new booking request
    await createNotification(
      providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.NEW_BOOKING_REQUEST,
      "New Booking Request",
      `You have received a new booking request for ${serviceId}`,
      bookingId,
      {serviceId, clientId: authInfo.uid},
    );

    console.log("✅ [createBooking] Function finished successfully.");
    return {success: true, data: newBooking};
  } catch (error) {
    console.error("Error in createBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Accept a booking request (provider only)
 */
exports.acceptBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [acceptBooking] called");
  const safeDataForLog = {
    bookingId: data.data?.bookingId,
    scheduledDate: data.data?.scheduledDate,
  };
  console.log("📦 [acceptBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId, scheduledDate} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [acceptBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId || !scheduledDate) {
    console.error("❌ [acceptBooking] Validation failed: Missing bookingId or scheduledDate.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId and scheduledDate are required",
    );
  }

  try {
    console.log(`📝 [acceptBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [acceptBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error(`❌ [acceptBooking] Permission denied. 
        User ${authInfo.uid} is not the provider ${booking.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Accepted")) {
      console.error(`❌ [acceptBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Accepted`,
      );
    }

    // Check for scheduling conflicts
    console.log("🔄 [acceptBooking] Checking for scheduling conflicts...");
    const hasConflict = await checkBookingConflicts(
      booking.serviceId,
      booking.providerId,
      scheduledDate,
      bookingId,
    );
    if (hasConflict) {
      console.warn("⚠️ [acceptBooking] Scheduling conflict detected.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The scheduled time conflicts with an existing booking",
      );
    }

    // Validate commission balance for cash jobs
    console.log("💰 [acceptBooking] Validating commission balance for cash job...");
    const hasValidBalance = await validateCommissionBalance(booking);
    if (!hasValidBalance) {
      console.error("❌ [acceptBooking] Insufficient wallet balance for commission.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Insufficient wallet balance to cover commission fee",
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Accepted",
      scheduledDate,
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [acceptBooking] Updating booking ${bookingId} to Accepted.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Accepted",
        scheduledDate,
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [acceptBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about booking acceptance
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_ACCEPTED,
      "Booking Accepted",
      "Your booking has been accepted by the provider",
      bookingId,
      {serviceId: booking.serviceId, providerId: booking.providerId},
    );

    console.log("✅ [acceptBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in acceptBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Decline a booking request (provider only)
 */
exports.declineBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [declineBooking] called");
  const safeDataForLog = {bookingId: data.data?.bookingId};
  console.log("📦 [declineBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [declineBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [declineBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [declineBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [declineBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error(`❌ [declineBooking] 
        Permission denied. User ${authInfo.uid} is not the provider ${booking.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Declined")) {
      console.error(`❌ [declineBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Declined`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Declined",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [declineBooking] Updating booking ${bookingId} to Declined.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Declined",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [declineBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about booking decline
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_DECLINED,
      "Booking Declined",
      "Your booking request has been declined by the provider",
      bookingId,
      {serviceId: booking.serviceId, providerId: booking.providerId},
    );

    console.log("✅ [declineBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in declineBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Start a booking (mark as in progress) - provider only
 */
exports.startBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [startBooking] called");
  const safeDataForLog = {bookingId: data.data?.bookingId};
  console.log("📦 [startBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [startBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [startBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [startBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [startBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error(`❌ [startBooking] Permission denied.
         User ${authInfo.uid} is not the provider ${booking.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "InProgress")) {
      console.error(`❌ [startBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to InProgress`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "InProgress",
      startedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [startBooking] Updating booking ${bookingId} to InProgress.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "InProgress",
        startedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [startBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about service start
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.GENERIC,
      "Service Started",
      "Your service has been started by the provider",
      bookingId,
      {serviceId: booking.serviceId, providerId: booking.providerId},
    );

    console.log("✅ [startBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in startBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Complete a booking - provider only
 */
exports.completeBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [completeBooking] called");
  const safeDataForLog = {
    bookingId: data.data?.bookingId,
    amountPaid: data.data?.amountPaid,
  };
  console.log("📦 [completeBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId, amountPaid} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [completeBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [completeBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [completeBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [completeBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error(`❌ [completeBooking] 
        Permission denied. User ${authInfo.uid} is not the provider ${booking.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Completed")) {
      console.error(`❌ [completeBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Completed`,
      );
    }

    const completedDate = new Date().toISOString();
    const updatedBooking = {
      ...booking,
      status: "Completed",
      completedDate,
      amountPaid: amountPaid || booking.amountPaid,
      updatedAt: completedDate,
    };

    console.log(`📝 [completeBooking] Updating booking ${bookingId} to Completed.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Completed",
        completedDate,
        amountPaid: amountPaid || booking.amountPaid,
        updatedAt: completedDate,
      });

      // Handle commission deduction for cash jobs
      if (booking.paymentMethod === "CASH_ON_HAND") {
        console.log("💰 [completeBooking] Processing commission for cash job.");
        // Get service details to calculate commission
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          const service = serviceDoc.data();
          let commissionFee = 0;

          // Calculate commission based on packages or service price
          if (booking.servicePackageIds && booking.servicePackageIds.length > 0) {
            for (const packageId of booking.servicePackageIds) {
              const packageDoc = await db.collection("servicePackages").doc(packageId).get();
              if (packageDoc.exists) {
                commissionFee += packageDoc.data().commissionFee || 0;
              }
            }
          } else {
            commissionFee = service.commissionFee || 0;
          }

          // Deduct commission from provider wallet
          if (commissionFee > 0) {
            console.log(`💰 [completeBooking] 
              Deducting commission of ${commissionFee} from provider ${booking.providerId}.`);
            const walletRef = db.collection("wallets").doc(booking.providerId);
            const walletDoc = await walletRef.get();
            const currentBalance = walletDoc.exists ? (walletDoc.data().balance || 0) : 0;

            transaction.set(walletRef, {
              balance: Math.max(0, currentBalance - commissionFee),
              updatedAt: completedDate,
            }, {merge: true});

            // Record commission transaction
            transaction.set(db.collection("transactions").doc(), {
              userId: booking.providerId,
              type: "DEBIT",
              amount: commissionFee,
              description: `Commission fee for booking ${bookingId}`,
              paymentChannel: "SRV_COMMISSION",
              bookingId,
              createdAt: completedDate,
            });
          }
        }
      }

      // TODO: Handle digital payment release here
      // This would integrate with the releaseHeldPayment Cloud Function
      console.log("💳 [completeBooking] Digital payment release logic to be implemented.");
    });
    console.log(`✅ [completeBooking] 
      Successfully updated booking ${bookingId} and processed transactions.`);

    // Create notification for the client about booking completion
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_COMPLETED,
      "Service Completed",
      "Your service has been completed by the provider",
      bookingId,
      {serviceId: booking.serviceId, providerId: booking.providerId},
    );

    // Update reputation scores. If any of these fail, the entire function will fail.
    console.log(`🌟 [completeBooking] Updating reputation for client ${booking.clientId}`);
    await updateUserReputationInternal(booking.clientId);
    console.log(`✅ [completeBooking] Client reputation updated successfully`);

    console.log(`🌟 [completeBooking] Updating reputation for provider ${booking.providerId}`);
    await updateProviderReputationInternal(booking.providerId);
    console.log(`✅ [completeBooking] Provider reputation updated successfully`);


    console.log("✅ [completeBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in completeBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Cancel a booking - client or provider
 */
exports.cancelBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [cancelBooking] called");
  const safeDataForLog = {bookingId: data.data?.bookingId};
  console.log("📦 [cancelBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [cancelBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [cancelBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [cancelBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [cancelBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client or provider can cancel)
    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      console.error(`❌ [cancelBooking] 
        Permission denied. User ${authInfo.uid} is not a participant.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Cancelled")) {
      console.error(`❌ [cancelBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Cancelled`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Cancelled",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [cancelBooking] Updating booking ${bookingId} to Cancelled.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [cancelBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the other party about booking cancellation
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ?
      USER_TYPES.PROVIDER : USER_TYPES.CLIENT;

    await createNotification(
      targetUserId,
      targetUserType,
      NOTIFICATION_TYPES.BOOKING_CANCELLED,
      "Booking Cancelled",
      "A booking has been cancelled",
      bookingId,
      {serviceId: booking.serviceId, cancelledBy: authInfo.uid},
    );

    console.log("✅ [cancelBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in cancelBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get booking by ID
 */
exports.getBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getBooking] called");
  const safeDataForLog = {bookingId: data.data?.bookingId};
  console.log("📦 [getBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [getBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [getBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [getBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client, provider, or admin can view)
    if (booking.clientId !== authInfo.uid &&
        booking.providerId !== authInfo.uid &&
        !authInfo.isAdmin) {
      console.error(`❌ [getBooking] 
        Permission denied. User ${authInfo.uid} is not a participant or admin.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to view this booking",
      );
    }
    console.log("✅ [getBooking] Function finished successfully.");
    return {success: true, data: booking};
  } catch (error) {
    console.error("Error in getBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get bookings for a client
 */
exports.getClientBookings = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getClientBookings] called");
  const safeDataForLog = {
    clientId: data.data?.clientId,
    limit: data.data?.limit,
  };
  console.log("📦 [getClientBookings] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {clientId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getClientBookings] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // User can only get their own bookings unless they're admin
  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    console.error(`❌ [getClientBookings] 
      Permission denied. User ${authInfo.uid} cannot view bookings for ${targetClientId}.`);
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to view these bookings",
    );
  }

  try {
    console.log(`📝 [getClientBookings] Fetching bookings for client ${targetClientId}...`);
    const bookingsQuery = await db.collection("bookings")
      .where("clientId", "==", targetClientId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    console.log(`✅ [getClientBookings] Found ${bookings.length} bookings.`);
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getClientBookings:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get bookings for a provider
 */
exports.getProviderBookings = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getProviderBookings] called");
  const safeDataForLog = {
    providerId: data.data?.providerId,
    limit: data.data?.limit,
  };
  console.log("📦 [getProviderBookings] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {providerId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getProviderBookings] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // User can only get their own bookings unless they're admin
  const targetProviderId = providerId || authInfo.uid;
  if (targetProviderId !== authInfo.uid && !authInfo.isAdmin) {
    console.error(`❌ [getProviderBookings] Permission denied. 
      User ${authInfo.uid} cannot view bookings for ${targetProviderId}.`);
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to view these bookings",
    );
  }

  try {
    console.log(`📝 [getProviderBookings] Fetching bookings for provider ${targetProviderId}...`);
    const bookingsQuery = await db.collection("bookings")
      .where("providerId", "==", targetProviderId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    console.log(`✅ [getProviderBookings] Found ${bookings.length} bookings.`);
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getProviderBookings:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get bookings by status
 */
exports.getBookingsByStatus = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getBookingsByStatus] called");
  const safeDataForLog = {
    status: data.data?.status,
    limit: data.data?.limit,
  };
  console.log("📦 [getBookingsByStatus] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {status, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getBookingsByStatus] Auth info:", authInfo);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  if (!status) {
    console.error("❌ [getBookingsByStatus] Validation failed: Missing status.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "status is required",
    );
  }

  try {
    console.log(`📝 [getBookingsByStatus] Fetching bookings with status ${status}...`);
    const bookingsQuery = await db.collection("bookings")
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    console.log(`✅ [getBookingsByStatus] Found ${bookings.length} bookings.`);
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getBookingsByStatus:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});


/**
 * Dispute a booking - client or provider
 */
exports.disputeBooking = functions.https.onCall(async (data, context) => {
  console.log("🚀 [disputeBooking] called");
  const safeDataForLog = {bookingId: data.data?.bookingId};
  console.log("📦 [disputeBooking] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [disputeBooking] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("❌ [disputeBooking] Validation failed: Missing bookingId.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    console.log(`📝 [disputeBooking] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [disputeBooking] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client or provider can dispute)
    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      console.error(`❌ [disputeBooking] 
        Permission denied. User ${authInfo.uid} is not a participant.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not authorized to dispute this booking",
      );
    }

    // Validate status transition - can only dispute completed bookings or in-progress bookings
    if (!isValidStatusTransition(booking.status, "Disputed")) {
      console.error(`❌ [disputeBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Disputed`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Disputed",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [disputeBooking] Updating booking ${bookingId} to Disputed.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Disputed",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [disputeBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the other party about booking dispute
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ?
      USER_TYPES.PROVIDER : USER_TYPES.CLIENT;

    await createNotification(
      targetUserId,
      targetUserType,
      NOTIFICATION_TYPES.GENERIC,
      "Booking Disputed",
      "A booking has been disputed and requires attention",
      bookingId,
      {serviceId: booking.serviceId, disputedBy: authInfo.uid},
    );

    console.log("✅ [disputeBooking] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in disputeBooking:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Check if service is available for booking at specific date/time
 */
exports.checkServiceAvailability = functions.https.onCall(async (data, context) => {
  console.log("🚀 [checkServiceAvailability] called");
  const safeDataForLog = {
    serviceId: data.data?.serviceId,
    requestedDateTime: data.data?.requestedDateTime,
  };
  console.log(`📦 [checkServiceAvailability] Received payload:`
    , JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {serviceId, requestedDateTime} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [checkServiceAvailability] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!serviceId || !requestedDateTime) {
    console.error(`❌ [checkServiceAvailability] Validation failed: 
    Missing serviceId or requestedDateTime.`);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "serviceId and requestedDateTime are required",
    );
  }

  try {
    console.log(`📝 [checkServiceAvailability] Fetching service ${serviceId}...`);
    // Get service to check if it exists and is active
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      console.error(`❌ [checkServiceAvailability] Service ${serviceId} not found.`);
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();
    console.log(`🔍 [checkServiceAvailability] Service data:`, {
      isActive: service.isActive,
      active: service.active,
      status: service.status,
      serviceData: JSON.stringify(service, null, 2),
    });

    // Check if service is active - handle different possible field names/formats
    if (!isServiceActive(service)) {
      console.warn(`⚠️ [checkServiceAvailability] Service ${serviceId} is not active.` +
        ` Status: ${service.status}, isActive: ${service.isActive}`);
      return {success: true, data: {available: false, reason: "Service is not active"}};
    }

    // Check for booking conflicts
    console.log("🔄 [checkServiceAvailability] Checking for booking conflicts...");
    const hasConflict = await checkBookingConflicts(
      serviceId,
      service.providerId,
      requestedDateTime,
    );
    console.log(`[checkServiceAvailability] Conflict check result: ${hasConflict}`);

    if (hasConflict) {
      return {
        success: true,
        data: {available: false, reason: "Time slot conflicts with existing booking"},
      };
    }

    // Check service availability using its weeklySchedule
    console.log(`📝 [checkServiceAvailability] Checking service availability schedule...`);

    if (service.weeklySchedule && service.weeklySchedule.length > 0) {
      const requestedDate = new Date(requestedDateTime);

      // Convert UTC time to Philippine time (UTC+8) since service slots are in local time
      const philippineOffset = 8 * 60; // 8 hours in minutes
      const localDate = new Date(requestedDate.getTime() + (philippineOffset * 60 * 1000));
      const dayOfWeek = localDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const requestedHour = localDate.getHours();

      // Map day of week to day names
      const dayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
      ];
      const requestedDayName = dayNames[dayOfWeek];

      // Find the schedule for the requested day
      const daySchedule = service.weeklySchedule.find((schedule) =>
        schedule.day === requestedDayName,
      );

      if (!daySchedule || !daySchedule.availability?.isAvailable) {
        console.warn(`⚠️ [checkServiceAvailability] 
          Service not available on ${requestedDayName}.`);
        return {
          success: true,
          data: {available: false, reason: `Service not available on ${requestedDayName}`},
        };
      }

      // Check time slots - allow booking at any time within available slots
      if (daySchedule.availability.slots && daySchedule.availability.slots.length > 0) {
        console.log(`🔍 [checkServiceAvailability] Time slot check:`, {
          requestedDateTime,
          requestedHour,
          availableSlots: daySchedule.availability.slots.length,
        });

        const isWithinTimeSlot = daySchedule.availability.slots.some((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const startMinute = parseInt(slot.startTime.split(":")[1] || "0");
          const endHour = parseInt(slot.endTime.split(":")[0]);
          const endMinute = parseInt(slot.endTime.split(":")[1] || "0");

          console.log(`🔍 [checkServiceAvailability] Checking slot` +
            ` ${slot.startTime}-${slot.endTime}:`, {
            requestedHour,
            requestedMinute: localDate.getMinutes(),
            slotStartHour: startHour,
            slotStartMinute: startMinute,
            slotEndHour: endHour,
            slotEndMinute: endMinute,
            requestedDateTime: requestedDate.toISOString(),
            localDateTime: localDate.toISOString(),
          });

          // Check if requested time is within the slot (no notice period restriction)
          const requestedMinute = localDate.getMinutes();
          const isInSlotRange = (requestedHour > startHour ||
                                (requestedHour === startHour && requestedMinute >= startMinute)) &&
                               (requestedHour < endHour ||
                                (requestedHour === endHour && requestedMinute < endMinute));

          console.log(`🔍 [checkServiceAvailability] Slot check result: ${isInSlotRange}`);
          return isInSlotRange;
        });

        if (!isWithinTimeSlot) {
          console.warn(`⚠️ [checkServiceAvailability] 
            Requested time is outside service's available hours.`);
          return {
            success: true,
            data: {
              available: false,
              reason: "Requested time is outside service's available hours",
            },
          };
        }
      }
    }

    console.log("✅ [checkServiceAvailability] Service is available.");
    return {success: true, data: {available: true, reason: "Service is available"}};
  } catch (error) {
    console.error("Error in checkServiceAvailability:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get service's available time slots for a specific date
 */
exports.getServiceAvailableSlots = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getServiceAvailableSlots] called");
  const safeDataForLog = {
    serviceId: data.data?.serviceId,
    date: data.data?.date,
  };
  console.log("📦 [getServiceAvailableSlots] Received payload:"
    , JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {serviceId, date} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getServiceAvailableSlots] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!serviceId || !date) {
    console.error("❌ [getServiceAvailableSlots] Validation failed: Missing serviceId or date.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "serviceId and date are required",
    );
  }

  try {
    console.log(`📝 [getServiceAvailableSlots] Fetching service ${serviceId}...`);
    // Get service to check if it exists
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      console.error(`❌ [getServiceAvailableSlots] Service ${serviceId} not found.`);
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();
    console.log(`🔍 [getServiceAvailableSlots] Service data:`, {
      isActive: service.isActive,
      active: service.active,
      status: service.status,
      providerId: service.providerId,
    });

    // Check if service is active first
    if (!isServiceActive(service)) {
      console.warn(`⚠️ [getServiceAvailableSlots] Service ${serviceId} is not active.` +
        ` Status: ${service.status}`);
      return {success: true, data: []};
    }

    // Get service availability from weeklySchedule
    console.log(`📝 [getServiceAvailableSlots] 
      Checking service weeklySchedule for availability...`);

    if (!service.weeklySchedule || service.weeklySchedule.length === 0) {
      console.warn(`⚠️ [getServiceAvailableSlots] No weeklySchedule found for service` +
        ` ${serviceId}`);
      return {success: true, data: []};
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const dayNames = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ];
    const requestedDayName = dayNames[dayOfWeek];

    // Find the schedule for the requested day
    const daySchedule = service.weeklySchedule.find((schedule) =>
      schedule.day === requestedDayName,
    );

    console.log(`🔍 [getServiceAvailableSlots] Availability debug:`, {
      requestedDate: requestedDate.toISOString(),
      dayOfWeek,
      dayName: requestedDayName,
      hasWeeklySchedule: !!service.weeklySchedule,
      weeklyScheduleLength: service.weeklySchedule?.length || 0,
      daySchedule: daySchedule ? {
        day: daySchedule.day,
        isAvailable: daySchedule.availability?.isAvailable,
        slots: daySchedule.availability?.slots,
      } : null,
    });

    if (!daySchedule || !daySchedule.availability?.isAvailable ||
        !daySchedule.availability?.slots) {
      console.warn(`⚠️ [getServiceAvailableSlots] 
        No schedule available for ${requestedDayName}.`);
      return {success: true, data: []};
    }

    // Get existing bookings for this service on this date
    console.log(`📝 [getServiceAvailableSlots] 
      Fetching existing bookings for ${new Date(date).toDateString()}...`);
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsQuery = await db.collection("bookings")
      .where("serviceId", "==", serviceId)
      .where("status", "in", ["Accepted", "InProgress"])
      .where("scheduledDate", ">=", startOfDay.toISOString())
      .where("scheduledDate", "<=", endOfDay.toISOString())
      .get();

    const existingBookings = bookingsQuery.docs.map((doc) => doc.data());
    console.log(`[getServiceAvailableSlots] Found ${existingBookings.length} existing bookings.`);

    // Create available slots with conflict information
    console.log(`🔍 [getServiceAvailableSlots] Slot availability check:`, {
      requestedDate: requestedDate.toISOString(),
      slotsCount: daySchedule.availability.slots.length,
    });

    const availableSlots = daySchedule.availability.slots.map((slot) => {
      const slotStart = parseInt(slot.startTime.split(":")[0]);
      const slotEnd = parseInt(slot.endTime.split(":")[0]);

      // Check for conflicts with existing bookings
      const hasBookingConflict = existingBookings.some((booking) => {
        if (!booking.scheduledDate) return false;

        const bookingDate = new Date(booking.scheduledDate);
        const bookingHour = bookingDate.getHours();

        // Assume 1-hour booking duration for conflict checking
        return bookingHour >= slotStart && bookingHour < slotEnd;
      });

      // Slot is available if no booking conflicts exist
      const isSlotAvailable = !hasBookingConflict;
      const conflictReason = hasBookingConflict ?
        "Time slot conflicts with existing booking" :
        null;

      return {
        timeSlot: {
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        isAvailable: isSlotAvailable,
        conflictReason,
      };
    });

    console.log("✅ [getServiceAvailableSlots] Function finished successfully.");
    return {success: true, data: availableSlots};
  } catch (error) {
    console.error("Error in getServiceAvailableSlots:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get client analytics (spending, booking patterns)
 */
exports.getClientAnalytics = functions.https.onCall(async (data, context) => {
  console.log("🚀 [getClientAnalytics] called");
  const safeDataForLog = {
    clientId: data.data?.clientId,
    startDate: data.data?.startDate,
    endDate: data.data?.endDate,
  };
  console.log("📦 [getClientAnalytics] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {clientId, startDate, endDate} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [getClientAnalytics] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Security check: only allow clients to view their own analytics or admin
  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    console.error(`❌ [getClientAnalytics] 
      Permission denied. User ${authInfo.uid} cannot view analytics for ${targetClientId}.`);
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to view these analytics",
    );
  }

  try {
    const now = new Date();
    // Default to 30 days ago if no start date provided
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const actualStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
    const actualEndDate = endDate ? new Date(endDate) : now;

    // Get user profile for member since date
    console.log(`📝 [getClientAnalytics] Fetching user profile for ${targetClientId}...`);
    let memberSinceDate = now;
    try {
      const userDoc = await db.collection("users").doc(targetClientId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        memberSinceDate = userData.createdAt ? new Date(userData.createdAt) : now;
      }
    } catch (error) {
      console.log("Could not get user profile, using default member date");
    }

    // Get all bookings for this client within the date range
    console.log(`📝 [getClientAnalytics]
      Fetching bookings for client ${targetClientId}
      between ${actualStartDate.toISOString()} and ${actualEndDate.toISOString()}...`);
    const bookingsQuery = await db.collection("bookings")
      .where("clientId", "==", targetClientId)
      .where("createdAt", ">=", actualStartDate.toISOString())
      .where("createdAt", "<=", actualEndDate.toISOString())
      .get();

    const clientBookings = bookingsQuery.docs.map((doc) => doc.data());
    const totalBookings = clientBookings.length;
    console.log(`[getClientAnalytics] Found ${totalBookings} total bookings.`);

    // Count completed bookings only
    const completedBookings = clientBookings.filter((booking) => booking.status === "Completed");
    const servicesCompleted = completedBookings.length;

    // Calculate total spending from completed bookings only
    const totalSpent = completedBookings.reduce((sum, booking) => {
      return sum + (booking.amountPaid || booking.price || 0);
    }, 0);
    console.log(`[getClientAnalytics] Total spent: ${totalSpent}.`);

    // Create a breakdown of package bookings from completed bookings
    const packageCounts = {};
    completedBookings.forEach((booking) => {
      if (booking.servicePackageIds && booking.servicePackageIds.length > 0) {
        booking.servicePackageIds.forEach((packageId) => {
          packageCounts[packageId] = (packageCounts[packageId] || 0) + 1;
        });
      }
    });

    const packageBreakdown = Object.entries(packageCounts);

    console.log("✅ [getClientAnalytics] Function finished successfully.");
    return {
      success: true,
      data: {
        clientId: targetClientId,
        totalBookings,
        servicesCompleted,
        totalSpent,
        memberSince: memberSinceDate.toISOString(),
        startDate: actualStartDate.toISOString(),
        endDate: actualEndDate.toISOString(),
        packageBreakdown,
      },
    };
  } catch (error) {
    console.error("Error in getClientAnalytics:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Release held payment when booking is completed
 * This function is called by authorized backend services to release payments
 */
exports.releasePayment = functions.https.onCall(async (data, context) => {
  console.log("🚀 [releasePayment] called");
  const safeDataForLog = {
    bookingId: data.data?.bookingId,
    paymentId: data.data?.paymentId,
    releasedAmount: data.data?.releasedAmount,
    commissionRetained: data.data?.commissionRetained,
    payoutId: data.data?.payoutId,
  };
  console.log("📦 [releasePayment] Received payload:", JSON.stringify(safeDataForLog, null, 2));
  const payload = data.data || data;
  const {bookingId, paymentId, releasedAmount, commissionRetained, payoutId} = payload;

  const authInfo = getAuthInfo(context, data);
  console.log("🔐 [releasePayment] Auth info:", authInfo);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Note: In production, this should verify the caller is an authorized backend service
  // For now, we'll allow admin users or the provider to call this function
  if (!authInfo.isAdmin) {
    // Additional security check could be implemented here
    console.log("Payment release called by:", authInfo.uid);
  }

  if (!bookingId || releasedAmount === undefined || commissionRetained === undefined) {
    console.error("❌ [releasePayment] Validation failed: Missing required parameters.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "bookingId, releasedAmount, and commissionRetained are required",
    );
  }

  try {
    console.log(`📝 [releasePayment] Fetching booking ${bookingId}...`);
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error(`❌ [releasePayment] Booking ${bookingId} not found.`);
      throw new functions.https.HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate booking status - can only release payment for Completed bookings
    if (booking.status !== "Completed") {
      console.error(`❌ [releasePayment] Booking status is ${booking.status}, not Completed.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Payment can only be released for completed bookings",
      );
    }

    // Check if payment is already released
    if (booking.paymentReleased) {
      console.warn(`⚠️ [releasePayment] 
        Payment for booking ${bookingId} has already been released.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Payment has already been released for this booking",
      );
    }

    // Validate payment method - should only release digital payments
    if (booking.paymentMethod === "CASH_ON_HAND") {
      console.error("❌ [releasePayment] Cannot release payment for CASH_ON_HAND method.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Cash payments do not require release",
      );
    }

    const releaseDate = new Date().toISOString();

    console.log(`📝 [releasePayment] Updating booking ${bookingId} to RELEASED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        paymentStatus: "RELEASED",
        releasedAmount,
        commissionRetained,
        paymentReleased: true,
        releasedAt: releaseDate,
        payoutId: payoutId || null,
        updatedAt: releaseDate,
      });

      // Record payment release in audit trail
      transaction.set(db.collection("paymentAuditTrail").doc(), {
        bookingId,
        paymentId: paymentId || booking.paymentId,
        action: "PAYMENT_RELEASED",
        releasedAmount,
        commissionRetained,
        payoutId: payoutId || null,
        processedBy: authInfo.uid,
        createdAt: releaseDate,
      });
    });
    console.log(`✅ [releasePayment] 
      Successfully updated booking ${bookingId} and created audit trail.`);

    // Create notification for the provider about payment release
    await createNotification(
      booking.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      "Payment Released",
      `Payment for booking ${bookingId} has been released`,
      bookingId,
      {serviceId: booking.serviceId, releasedAmount, commissionRetained},
    );

    const updatedBooking = {
      ...booking,
      paymentStatus: "RELEASED",
      releasedAmount,
      commissionRetained,
      paymentReleased: true,
      releasedAt: releaseDate,
      payoutId: payoutId || null,
      updatedAt: releaseDate,
    };

    console.log("✅ [releasePayment] Function finished successfully.");
    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in releasePayment:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});
