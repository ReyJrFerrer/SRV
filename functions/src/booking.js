const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {admin, getFirestore} = require("../firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {deductReputationForCancellationInternal} = require("./reputation");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  NOTIFICATION_STATUS,
  generateNotificationHref,
  isSpamming,
  updateNotificationFrequency,
  sendOneSignalNotification,
} = require("./notification");
const {
  checkUserReputationInternal,
} = require("./reputation");
const db = getFirestore();
const rtdb = admin.database();

// Constants for notification system
const NOTIFICATION_EXPIRY_DAYS = 30;

/**
 * Generate a unique report ID
 * @return {string} Unique report ID
 */
function generateReportId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `report_${timestamp}_${random}`;
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
    "InProgress": ["Completed", "Disputed", "Cancelled"],
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
 * @param {string} requestedDateTime - Requested date/time ISO string (start time)
 * @param {string} scheduledDateTime - Scheduled date/time ISO string (end time)
 * @param {string} excludeBookingId - Booking ID to exclude from conflict check
 * @return {Promise<boolean>} True if conflict exists
 */
async function checkBookingConflicts(
  serviceId,
  providerId,
  requestedDateTime,
  scheduledDateTime = null,
  excludeBookingId = null,
) {
  try {
    // If scheduledDateTime is not provided, assume 1-hour slot for backward compatibility
    const newBookingStart = new Date(requestedDateTime);
    const newBookingEnd = scheduledDateTime ?
      new Date(scheduledDateTime) :
      new Date(newBookingStart.getTime() + 60 * 60 * 1000);

    // Query for bookings on the same date to check for time range overlaps
    // We check requestedDate to get bookings on the same day
    const dayStart = new Date(newBookingStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(newBookingStart);
    dayEnd.setHours(23, 59, 59, 999);

    const query = db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("serviceId", "==", serviceId)
      .where("status", "in", ["Accepted", "InProgress"])
      .where("requestedDate", ">=", dayStart.toISOString())
      .where("requestedDate", "<=", dayEnd.toISOString());

    const existingBookings = await query.get();

    // Check for time range overlap
    return existingBookings.docs.some((doc) => {
      if (excludeBookingId && doc.id === excludeBookingId) {
        return false;
      }

      const booking = doc.data();
      const existingStart = new Date(booking.requestedDate);
      const existingEnd = new Date(booking.scheduledDate);

      // Two bookings overlap if:
      // new start < existing end AND new end > existing start
      const hasOverlap = newBookingStart < existingEnd && newBookingEnd > existingStart;

      return hasOverlap;
    });
  } catch (error) {
    console.error("Error checking booking conflicts:", error);
    return false; // Default to no conflict if check fails
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
    console.log("Checking notification spam prevention...");
    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      console.log("Notification spam prevention failed");
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
      metadata: metadata,
      href,
      status: NOTIFICATION_STATUS.UNREAD,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
      pushSentAt: null,
      expiresAt,
    };

    // Store in Firestore
    await notificationRef.set(notification);

    // Update notification frequency tracking
    await updateNotificationFrequency(targetUserId, notificationType);

    // Send OneSignal push notification asynchronously (don't wait for it)
    sendOneSignalNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send OneSignal notification:", error);
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Cancel conflicting bookings when a booking is requested
 * @param {string} acceptedBookingId - The booking ID that was accepted
 * @param {string} providerId - Provider ID
 * @param {string} requestedDate - Requested date/time ISO string (start time)
 * @param {string} scheduledDate - Scheduled date/time ISO string (end time)
 * @param {string} serviceId - Service ID
 */
async function cancelConflictingBookings(
  acceptedBookingId,
  providerId,
  requestedDate,
  scheduledDate,
  serviceId,
) {
  try {
    console.log("[cancelConflictingBookings] Checking for conflicting bookings...");
    const acceptedStart = new Date(requestedDate);
    const acceptedEnd = new Date(scheduledDate);

    // Query for bookings on the same date
    const dayStart = new Date(acceptedStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(acceptedStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Find  "Requested" bookings for the service for this provider on the same day
    const conflictingBookingsQuery = await db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("serviceId", "==", serviceId)
      .where("status", "==", "Requested")
      .where("requestedDate", ">=", dayStart.toISOString())
      .where("requestedDate", "<=", dayEnd.toISOString())
      .get();

    // Fetch service details once for all notifications
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "this service";

    // Fetch provider details for notification
    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "The provider" :
      "The provider";

    const batch = db.batch();
    const notificationPromises = [];
    let cancelledCount = 0;

    conflictingBookingsQuery.forEach((doc) => {
      const conflictingBooking = doc.data();

      // Don't cancel the booking that was just accepted
      if (conflictingBooking.id === acceptedBookingId) {
        return;
      }

      // Check for time range overlap
      const conflictStart = new Date(conflictingBooking.requestedDate);
      const conflictEnd = new Date(conflictingBooking.scheduledDate);

      // Two bookings overlap if:
      // accepted start < conflict end AND accepted end > conflict start
      const hasOverlap = acceptedStart < conflictEnd && acceptedEnd > conflictStart;

      if (!hasOverlap) {
        // No overlap, don't cancel this booking
        return;
      }


      // Update booking status to Cancelled
      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
        cancellationReason: "auto_cancelled_not_chosen",
      });

      // Send notification to the client
      const notificationMessage = `Your booking request for "${serviceName}" 
      was not selected by the provider for this time slot and has been automatically cancelled. 
      Please feel free to book another time.`;

      notificationPromises.push(
        createNotification(
          conflictingBooking.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN,
          "Booking Not Selected",
          notificationMessage,
          conflictingBooking.id,
          {
            serviceId,
            serviceName,
            providerId,
            senderName: providerName,
            requestedDate: conflictingBooking.requestedDate,
          },
        ),
      );

      cancelledCount++;
    });

    if (cancelledCount > 0) {
      await batch.commit();
      await Promise.allSettled(notificationPromises);
    }
  } catch (error) {
    console.error("Error cancelling conflicting bookings:", error);
    // Don't throw - this is a background operation
  }
}

/**
 * Create a new booking request
 */
exports.createBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload from data.data
  const payload = data.data || data;
  const {
    serviceId,
    providerId,
    price,
    location,
    requestedDate,
    scheduledDate,
    servicePackageIds = [],
    notes,
    attachments = [],
    amountToPay,
    paymentMethod,
    paymentId,
    locationDetection = "manual", // Default to manual if not provided
  } = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko validation logic)
  if (!serviceId || !providerId || !price || !location || !requestedDate ||
    !paymentMethod || !scheduledDate) {
    throw new HttpsError(
      "invalid-argument",
      `Required parameters missing: serviceId,
      providerId, price, location, requestedDate, paymentMethod`,
    );
  }

  try {
    // Check client's reputation
    const clientReputation = await checkUserReputationInternal(authInfo.uid);
    console.log("[createBooking] Reputation check result:", clientReputation);
    if (!clientReputation.success || !clientReputation.data) {
      console.error("[createBooking] Failed to check client reputation:", clientReputation);
      throw new HttpsError(
        "failed-precondition",
        "Unable to verify client reputation. Please try again later.",
      );
    }

    if (clientReputation.data.trustScore <= 5) {
      console.error("[createBooking] Client reputation too low:", clientReputation.data.trustScore);
      throw new HttpsError(
        "failed-precondition",
        `Your reputation score (${clientReputation.data.trustScore}) is too ` +
        "low to create a booking. Please contact support if you believe " +
        "this is an error.",
      );
    }

    // Check provider's reputation
    console.log("[createBooking] Checking provider reputation...");
    const providerReputation = await checkUserReputationInternal(providerId);
    console.log("[createBooking] Reputation check result:", providerReputation);
    if (!providerReputation.success || !providerReputation.data) {
      console.error("[createBooking] Failed to check provider reputation:", providerReputation);
      throw new HttpsError(
        "failed-precondition",
        "Unable to verify provider reputation. Please try again later.",
      );
    }

    if (providerReputation.data.trustScore <= 5) {
      console.error("[createBooking] Provider reputation too low:",
        providerReputation.data.trustScore);
      throw new HttpsError(
        "failed-precondition",
        "This provider is currently not accepting new bookings due to " +
        "reputation issues. Please try another provider.",
      );
    }

    // Validate service exists and belongs to provider
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    if (service.providerId !== providerId) {
      console.error("[createBooking] Service does not belong to the specified provider:",
        service.providerId, providerId);
      throw new HttpsError(
        "permission-denied",
        "Service does not belong to the specified provider",
      );
    }

    // Check if service is active
    if (!isServiceActive(service)) {
      console.error("[createBooking] Service is not active:", service.id);
      throw new HttpsError(
        "failed-precondition",
        "Service is not available for booking",
      );
    }

    // If packages are specified, validate they exist and belong to this service
    let finalPrice = price;
    let totalPackagePrice = 0;

    if (servicePackageIds.length > 0) {
      for (const packageId of servicePackageIds) {
        const packageDoc = await db.collection("service_packages").doc(packageId).get();
        if (!packageDoc.exists) {
          console.error("[createBooking] Package not found:", packageId);
          const errorMsg =
            `Package with ID ${packageId} not found in 'service_packages' collection.`;
          throw new HttpsError("not-found", errorMsg);
        }

        const packageData = packageDoc.data();
        if (packageData.serviceId !== serviceId) {
          console.error("[createBooking] Package belongs to wrong service:",
            packageId, packageData.serviceId, serviceId);
          const errorMsg =
            `Package ${packageId} belongs to service ${packageData.serviceId}, 
           but booking is for service ${serviceId}.`;
          throw new HttpsError(
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
    const hasConflict = await checkBookingConflicts(
      serviceId,
      providerId,
      requestedDate,
      scheduledDate,
    );
    if (hasConflict) {
      console.error("[createBooking] Booking conflict detected:", hasConflict);
      const errorMsg = "The requested time conflicts with an existing booking.";
      throw new HttpsError(
        "failed-precondition",
        errorMsg,
      );
    }

    const bookingId = generateBookingId();
    const now = new Date().toISOString();

    // Normalize attachments (array of strings/URLs), enforce limit of 5
    let normalizedAttachments = [];
    try {
      if (Array.isArray(attachments)) {
        normalizedAttachments = attachments
          .filter((x) => typeof x === "string" && x.trim().length > 0)
          .slice(0, 5);
      }
    } catch {
      console.error("[createBooking] Failed to normalize attachments");
    }

    const newBooking = {
      id: bookingId,
      clientId: authInfo.uid,
      providerId,
      providerName: null, // Will be populated by UI
      serviceId,
      servicePackageIds,
      status: "Requested",
      requestedDate,
      scheduledDate,
      startedDate: null,
      completedDate: null,
      price: finalPrice,
      amountPaid: amountToPay || null,
      serviceTime: null,
      location,
      evidence: null,
      attachments: normalizedAttachments.length > 0 ? normalizedAttachments : [],
      notes: notes || null,
      paymentMethod,
      locationDetection: locationDetection,
      paymentStatus: paymentId ? "PAID_HELD" : "PENDING",
      paymentId: paymentId || null,
      heldAmount: paymentId ? finalPrice : null,
      releasedAmount: null,
      paymentReleased: null,
      releasedAt: null,
      payoutId: null,
      createdAt: now,
      updatedAt: now,
    };

    // Use Firestore transaction for atomic booking creation
    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection("bookings").doc(bookingId), newBooking);
    });

    // Fetch client details for notification (service details already fetched)
    const serviceName = service.title || "a service";

    const clientDoc = await db.collection("users").doc(authInfo.uid).get();
    const clientName = clientDoc.exists ? clientDoc.data().name || "A client" : "A client";

    // Create notification for the provider about new booking request
    await createNotification(
      providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.NEW_BOOKING_REQUEST,
      "New Booking Request",
      `${clientName} has requested to book "${serviceName}"`,
      bookingId,
      {
        serviceId,
        serviceName,
        clientId: authInfo.uid,
        senderName: clientName,
      },
    );

    return {success: true, data: newBooking};
  } catch (error) {
    console.error("Error in createBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Accept a booking request (provider only)
 */
exports.acceptBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, scheduledDate} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId || !scheduledDate) {
    console.error("[acceptBooking] Required parameters missing:", bookingId, scheduledDate);
    throw new HttpsError(
      "invalid-argument",
      "bookingId and scheduledDate are required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error("[acceptBooking] Booking not found:", bookingId);
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error("[acceptBooking] Not authorized to update this booking:",
        booking.providerId, authInfo.uid);
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Accepted")) {
      console.error("[acceptBooking] Invalid status transition:", booking.status, "to Accepted");
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Accepted`,
      );
    }

    // Check for scheduling conflicts
    // Use the original requestedDate (start time) and new scheduledDate (end time)
    const hasConflict = await checkBookingConflicts(
      booking.serviceId,
      booking.providerId,
      booking.requestedDate,
      scheduledDate,
      bookingId,
    );
    if (hasConflict) {
      console.warn("[acceptBooking] Scheduling conflict detected:", hasConflict);
      throw new HttpsError(
        "failed-precondition",
        "The scheduled time conflicts with an existing booking",
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Accepted",
      scheduledDate,
      updatedAt: new Date().toISOString(),
    };

    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Accepted",
        scheduledDate,
        updatedAt: new Date().toISOString(),
      });
    });
    // Cancel any conflicting bookings that weren't chosen
    await cancelConflictingBookings(
      bookingId,
      booking.providerId,
      booking.requestedDate,
      scheduledDate,
      booking.serviceId,
    );

    // Fetch service and provider details for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ? providerDoc.data().name || "the provider" :
      "the provider";

    // Create notification for the client about booking acceptance
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_ACCEPTED,
      "Booking Accepted",
      `${providerName} has accepted your booking for "${serviceName}"`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        providerId: booking.providerId,
        senderName: providerName,
      },
    );

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in acceptBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Decline a booking request (provider only)
 */
exports.declineBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  console.log("[declineBooking] called");
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    console.error("[declineBooking] User not authenticated");
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("[declineBooking] Required parameters missing:", bookingId);
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error("[declineBooking] Booking not found:", bookingId);
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error("[declineBooking] Not authorized to update this booking:",
        booking.providerId, authInfo.uid);
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Declined")) {
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Declined`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Declined",
      updatedAt: new Date().toISOString(),
    };

    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Declined",
        updatedAt: new Date().toISOString(),
      });
    });
    // Fetch service and provider details for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ? providerDoc.data().name || "the provider" :
      "the provider";

    // Create notification for the client about booking decline
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_DECLINED,
      "Booking Declined",
      `${providerName} has declined your booking request for "${serviceName}"`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        providerId: booking.providerId,
        senderName: providerName,
      },
    );

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in declineBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});


exports.startNavigation = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  console.log("[startNavigation] called");
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    console.error("[startNavigation] User not authenticated");
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("[startNavigation] Required parameters missing:", bookingId);
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }
  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error("[startNavigation] Booking not found:", bookingId);
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error("[startNavigation] Not authorized to update this booking:",
        booking.providerId, authInfo.uid);
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Fetch service and provider details for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ? providerDoc.data().name || "the provider" :
      "the provider";

    // Create notification for the client about service start
    const alreadyNotified = booking.navigationStartedNotified === true;

    if (!alreadyNotified) {
      await createNotification(
        booking.clientId,
        USER_TYPES.CLIENT,
        NOTIFICATION_TYPES.START_NAVIGATION,
        "Navigation Started",
        `${providerName} has started going to the location for "${serviceName}"`,
        bookingId,
        {
          serviceId: booking.serviceId,
          serviceName,
          providerId: booking.providerId,
          senderName: providerName,
        },
      );

      // Mark booking so we don't send this notification again in future
      try {
        await db.collection("bookings").doc(bookingId).update({
          navigationStartedNotified: true,
          navigationStartedNotifiedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.warn(
          "Failed to mark booking as navigationStartedNotified:",
          bookingId,
          err,
        );
      }

      // Initialize RTDB location node for real-time tracking
      try {
        await rtdb.ref(`providerLocations/${bookingId}`).set({
          providerId: booking.providerId,
          clientId: booking.clientId,
          lat: null,
          lng: null,
          heading: null,
          speed: null,
          accuracy: null,
          updatedAt: Date.now(),
          startedAt: Date.now(),
        });
        console.log("[startNavigation] RTDB location node initialized:", bookingId);
      } catch (rtdbErr) {
        console.warn(
          "[startNavigation] Failed to initialize RTDB location node:",
          bookingId,
          rtdbErr,
        );
      }
    }

    return {success: true};
  } catch (error) {
    console.error("Error in startBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Start a booking (mark as in progress) - provider only
 */
exports.startBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  console.log("[startBooking] called");
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    console.error("[startBooking] User not authenticated");
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("[startBooking] Required parameters missing:", bookingId);
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error("[startBooking] Booking not found:", bookingId);
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error("[startBooking] Not authorized to update this booking:",
        booking.providerId, authInfo.uid);
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "InProgress")) {
      console.error("[startBooking] Invalid status transition:", booking.status, "to InProgress");
      throw new HttpsError(
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

    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "InProgress",
        startedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Fetch service and provider details for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ? providerDoc.data().name || "the provider" :
      "the provider";

    // Create notification for the client about service start
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.START_SERVICE,
      "Service Started",
      `${providerName} has started working on "${serviceName}"`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        providerId: booking.providerId,
        senderName: providerName,
      },
    );

    // Create service completion reminder notification for the provider
    const clientDoc = await db.collection("users").doc(booking.clientId).get();
    const clientName = clientDoc.exists ? clientDoc.data().name || "your client" : "your client";
    await createNotification(
      booking.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.SERVICE_COMPLETION_REMINDER,
      "Service In Progress",
      `Don't forget to complete the service for ${clientName}`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        clientId: booking.clientId,
        clientName,
        bookingId: booking.id,
      },
    );

    // Cleanup RTDB location node (provider has arrived)
    try {
      await rtdb.ref(`providerLocations/${bookingId}`).remove();
      console.log("[startBooking] RTDB location node cleaned up:", bookingId);
    } catch (rtdbErr) {
      console.warn("[startBooking] Failed to cleanup RTDB location node:", bookingId, rtdbErr);
    }

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in startBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Complete a booking - provider only
 */
exports.completeBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  console.log("[completeBooking] called");
  const payload = data.data || data;
  const {bookingId, amountPaid} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    console.error("[completeBooking] User not authenticated");
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    console.error("[completeBooking] Required parameters missing:", bookingId);
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      console.error("[completeBooking] Booking not found:", bookingId);
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate provider authorization
    if (booking.providerId !== authInfo.uid) {
      console.error("[completeBooking] Not authorized to update this booking:",
        booking.providerId, authInfo.uid);
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Completed")) {
      console.error("[completeBooking] Invalid status transition:", booking.status, "to Completed");
      throw new HttpsError(
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

    // Update booking status
    await db.collection("bookings").doc(bookingId).update({
      status: "Completed",
      completedDate,
      amountPaid: amountPaid || booking.amountPaid,
      updatedAt: completedDate,
    });
    // TODO: Handle digital payment release here
    // This would integrate with the releaseHeldPayment Cloud Function

    // Fetch service and provider details for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ? providerDoc.data().name || "the provider" :
      "the provider";

    // Create notification for the client about booking completion
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.BOOKING_COMPLETED,
      "Service Completed",
      `${providerName} has completed "${serviceName}"`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        providerId: booking.providerId,
        senderName: providerName,
      },
    );


    // Create review reminder notification for client
    await createNotification(
      booking.clientId,
      USER_TYPES.CLIENT,
      NOTIFICATION_TYPES.REVIEW_REMINDER,
      "Share Your Experience",
      `Please review your recent "${serviceName}" service with ${providerName}`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        providerId: booking.providerId,
        providerName,
        bookingId: booking.id,
      },
    );

    // Create review reminder notification for provider
    const clientDoc = await db.collection("users").doc(booking.clientId).get();
    const clientName = clientDoc.exists ? clientDoc.data().name || "the client" : "the client";
    await createNotification(
      booking.providerId,
      USER_TYPES.PROVIDER,
      NOTIFICATION_TYPES.REVIEW_REQUEST,
      "Rate Your Client",
      `Rate your experience with ${clientName} for "${serviceName}"`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        clientId: booking.clientId,
        clientName,
        bookingId: booking.id,
      },
    );

    // Cleanup RTDB location node (if still exists)
    try {
      await rtdb.ref(`providerLocations/${bookingId}`).remove();
    } catch (rtdbErr) {
      // Ignore - node may already be deleted
    }

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in completeBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Cancel a booking - client or provider
 */
exports.cancelBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, cancelReason} = payload;

  if (!cancelReason || typeof cancelReason !== "string" || cancelReason.trim() === "") {
    throw new HttpsError(
      "invalid-argument",
      "A reason for cancellation is required",
    );
  }

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client or provider can cancel)
    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      throw new HttpsError(
        "permission-denied",
        "Not authorized to update this booking",
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(booking.status, "Cancelled")) {
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Cancelled`,
      );
    }

    // Deduct reputation for cancelling Accepted or InProgress bookings (both clients and providers)
    const shouldDeductReputation = booking.status === "Accepted" ||
      booking.status === "InProgress" || booking.status === "Requested";

    if (shouldDeductReputation) {
      try {
        await deductReputationForCancellationInternal(authInfo.uid);
      } catch (error) {
        // Don't fail the cancellation if reputation update fails, just log it
      }
    }
    // Determine the role of the canceller
    const cancellerRole = authInfo.uid === booking.clientId ? "Client" : "Provider";
    const updatedBooking = {
      ...booking,
      status: "Cancelled",
      cancelReason: cancelReason.trim(),
      cancelledBy: cancellerRole,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Cancelled",
        cancelReason: cancelReason.trim(),
        cancelledBy: cancellerRole,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Fetch service details and user names for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "a service";

    const cancellerDoc = await db.collection("users").doc(authInfo.uid).get();
    const cancellerName = cancellerDoc.exists ? cancellerDoc.data().name || "A user" : "A user";

    // Create notification for the other party about booking cancellation
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ?
      USER_TYPES.PROVIDER : USER_TYPES.CLIENT;

    await createNotification(
      targetUserId,
      targetUserType,
      NOTIFICATION_TYPES.BOOKING_CANCELLED,
      "Booking Cancelled",
      `${cancellerName} has cancelled the booking for "${serviceName}" 
      Reason: ${cancelReason.trim()}`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        cancelledBy: cancellerRole,
        cancelReason: cancelReason.trim(),
        senderName: cancellerName,
        message: `${cancellerName} has cancelled the booking for "${serviceName} " 
          Reason: ${cancelReason.trim()}`,
      },
    );

    // Automatically create a ticket with cancellation category
    try {
      const userProfile = cancellerDoc.exists ? cancellerDoc.data() : null;
      const reportId = generateReportId();

      // Create ticket description with structured data
      const ticketDescription = JSON.stringify({
        title: `Booking Cancellation - ${serviceName}`,
        description: `Cancelled Booking.\nCancellation Reason: ${cancelReason.trim()}`,
        category: "cancellation",
        timestamp: new Date().toISOString(),
        source: cancellerRole === "Client" ? "client_cancellation" : "provider_cancellation",
        bookingId: bookingId,
        cancelledBy: cancellerRole,
        serviceId: booking.serviceId,
        serviceName: serviceName,
        cancelledByName: cancellerName,
      });

      const newReport = {
        id: reportId,
        userId: authInfo.uid,
        userName: cancellerName,
        userPhone: userProfile?.phone || "Unknown",
        description: ticketDescription,
        status: "open",
        createdAt: new Date().toISOString(),
      };

      // Save report to Firestore
      await db.collection("reports").doc(reportId).set(newReport);
    } catch (ticketError) {
      // Don't fail the cancellation if ticket creation fails - just log it
    }

    // Cleanup RTDB location node (if exists)
    try {
      await rtdb.ref(`providerLocations/${bookingId}`).remove();
    } catch (rtdbErr) {
      // Ignore - node may not exist
    }

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in cancelBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get booking by ID
 */
exports.getBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client, provider, or admin can view)
    if (booking.clientId !== authInfo.uid &&
      booking.providerId !== authInfo.uid &&
      !authInfo.isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Not authorized to view this booking",
      );
    }
    return {success: true, data: booking};
  } catch (error) {
    console.error("Error in getBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get bookings for a client
 */
exports.getClientBookings = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {clientId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // User can only get their own bookings unless they're admin
  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to view these bookings",
    );
  }

  try {
    const bookingsQuery = await db.collection("bookings")
      .where("clientId", "==", targetClientId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getClientBookings:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get bookings for a provider
 */
exports.getProviderBookings = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {providerId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // User can only get their own bookings unless they're admin
  const targetProviderId = providerId || authInfo.uid;
  if (targetProviderId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to view these bookings",
    );
  }

  try {
    const bookingsQuery = await db.collection("bookings")
      .where("providerId", "==", targetProviderId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getProviderBookings:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get bookings by status
 */
exports.getBookingsByStatus = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {status, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  if (!status) {
    throw new HttpsError(
      "invalid-argument",
      "status is required",
    );
  }

  try {
    const bookingsQuery = await db.collection("bookings")
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const bookings = bookingsQuery.docs.map((doc) => doc.data());
    return {success: true, data: bookings};
  } catch (error) {
    console.error("Error in getBookingsByStatus:", error);
    throw new HttpsError("internal", error.message);
  }
});


/**
 * Dispute a booking - client or provider
 */
exports.disputeBooking = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!bookingId) {
    throw new HttpsError(
      "invalid-argument",
      "bookingId is required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate user authorization (client or provider can dispute)
    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      throw new HttpsError(
        "permission-denied",
        "Not authorized to dispute this booking",
      );
    }

    // Validate status transition - can only dispute completed bookings or in-progress bookings
    if (!isValidStatusTransition(booking.status, "Disputed")) {
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Disputed`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "Disputed",
      updatedAt: new Date().toISOString(),
    };

    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Disputed",
        updatedAt: new Date().toISOString(),
      });
    });
    // Fetch service details and user names for notification
    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "a service";

    const disputerDoc = await db.collection("users").doc(authInfo.uid).get();
    const disputerName = disputerDoc.exists ? disputerDoc.data().name || "A user" : "A user";

    // Create notification for the other party about booking dispute
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ?
      USER_TYPES.PROVIDER : USER_TYPES.CLIENT;

    await createNotification(
      targetUserId,
      targetUserType,
      NOTIFICATION_TYPES.GENERIC,
      "Booking Disputed",
      `${disputerName} has disputed the booking for "${serviceName}"`,
      bookingId,
      {serviceId: booking.serviceId, serviceName, disputedBy: authInfo.uid, disputerName},
    );

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in disputeBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Check if service is available for booking at specific date/time
 */
exports.checkServiceAvailability = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {serviceId, requestedDateTime} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!serviceId || !requestedDateTime) {
    throw new HttpsError(
      "invalid-argument",
      "serviceId and requestedDateTime are required",
    );
  }

  try {
    // Get service to check if it exists and is active
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if service is active - handle different possible field names/formats
    if (!isServiceActive(service)) {
      return {success: true, data: {available: false, reason: "Service is not active"}};
    }

    // Check for booking conflicts
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
        return {
          success: true,
          data: {available: false, reason: `Service not available on ${requestedDayName}`},
        };
      }

      // Check time slots - allow booking at any time within available slots
      if (daySchedule.availability.slots && daySchedule.availability.slots.length > 0) {
        daySchedule.availability.slots.some((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const startMinute = parseInt(slot.startTime.split(":")[1] || "0");
          const endHour = parseInt(slot.endTime.split(":")[0]);
          const endMinute = parseInt(slot.endTime.split(":")[1] || "0");

          // Check if requested time is within the slot (no notice period restriction)
          const requestedMinute = localDate.getMinutes();
          const isInSlotRange = (requestedHour > startHour ||
            (requestedHour === startHour && requestedMinute >= startMinute)) &&
            (requestedHour < endHour ||
              (requestedHour === endHour && requestedMinute < endMinute));

          return isInSlotRange;
        });
      }
    }

    return {success: true, data: {available: true, reason: "Service is available"}};
  } catch (error) {
    console.error("Error in checkServiceAvailability:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get service's available time slots for a specific date
 */
exports.getServiceAvailableSlots = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {serviceId, date} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!serviceId || !date) {
    throw new HttpsError(
      "invalid-argument",
      "serviceId and date are required",
    );
  }

  try {
    // Get service to check if it exists
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if service is active first
    if (!isServiceActive(service)) {
      return {success: true, data: []};
    }

    // Get service availability from weeklySchedule
    if (!service.weeklySchedule || service.weeklySchedule.length === 0) {
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

    if (!daySchedule || !daySchedule.availability?.isAvailable ||
      !daySchedule.availability?.slots) {
      return {success: true, data: []};
    }

    // Get existing bookings for this service on this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingsQuery = await db.collection("bookings")
      .where("serviceId", "==", serviceId)
      .where("status", "in", ["Accepted", "InProgress"])
      .where("requestedDate", ">=", startOfDay.toISOString())
      .where("requestedDate", "<=", endOfDay.toISOString())
      .get();

    const existingBookings = bookingsQuery.docs.map((doc) => doc.data());

    // Create available slots with conflict information

    const availableSlots = daySchedule.availability.slots.map((slot) => {
      // Parse slot times
      const [slotStartHour, slotStartMinute] = slot.startTime.split(":").map(Number);
      const [slotEndHour, slotEndMinute] = slot.endTime.split(":").map(Number);

      // Create Date objects for slot start and end times
      const slotStartTime = new Date(requestedDate);
      slotStartTime.setHours(slotStartHour, slotStartMinute, 0, 0);

      const slotEndTime = new Date(requestedDate);
      slotEndTime.setHours(slotEndHour, slotEndMinute, 0, 0);

      // Check for conflicts with existing bookings using proper time range overlap
      const hasBookingConflict = existingBookings.some((booking) => {
        if (!booking.requestedDate || !booking.scheduledDate) return false;

        const bookingStart = new Date(booking.requestedDate);
        const bookingEnd = new Date(booking.scheduledDate);

        // Two time ranges overlap if:
        // slot start < booking end AND slot end > booking start
        const hasOverlap = slotStartTime < bookingEnd && slotEndTime > bookingStart;

        return hasOverlap;
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

    return {success: true, data: availableSlots};
  } catch (error) {
    console.error("Error in getServiceAvailableSlots:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get client analytics (spending, booking patterns)
 */
exports.getClientAnalytics = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {clientId, startDate, endDate} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Security check: only allow clients to view their own analytics or admin
  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError(
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get provider analytics (admin function)
 * Returns comprehensive analytics for a provider including earnings, jobs, completion rate
 * Matches the logic from booking.mo getProviderAnalytics
 */
exports.getProviderAnalytics = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {providerId, startDate, endDate} = payload;

  // Authentication - Admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can get provider analytics",
    );
  }

  if (!providerId) {
    throw new HttpsError(
      "invalid-argument",
      "Provider ID is required",
    );
  }

  try {
    // Parse date range
    const now = new Date();
    const actualStartDate = startDate ? new Date(startDate) : new Date(0); // Beginning of time
    const actualEndDate = endDate ? new Date(endDate) : now; // Current time

    // Get all bookings for this provider within the date range
    let query = db.collection("bookings")
      .where("providerId", "==", providerId);

    // Apply date filtering
    if (startDate) {
      query = query.where("createdAt", ">=", actualStartDate.toISOString());
    }
    if (endDate) {
      query = query.where("createdAt", "<=", actualEndDate.toISOString());
    }

    const providerBookingsSnapshot = await query.get();
    const providerBookings = providerBookingsSnapshot.docs.map((doc) => doc.data());

    // Count total bookings
    const totalJobs = providerBookings.length;

    if (totalJobs === 0) {
      return {
        success: true,
        data: {
          providerId,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
          completionRate: 0.0,
          totalEarnings: 0,
          startDate: startDate || null,
          endDate: endDate || null,
          packageBreakdown: [],
        },
      };
    }

    // Count completed bookings
    const completedBookings = providerBookings.filter((booking) =>
      booking.status === "Completed",
    );
    const completedJobs = completedBookings.length;

    // Count cancelled bookings (including declined)
    const cancelledBookings = providerBookings.filter((booking) =>
      booking.status === "Cancelled" || booking.status === "Declined",
    );
    const cancelledJobs = cancelledBookings.length;

    // Count accepted bookings (used for completion rate calculation)
    const acceptedBookings = providerBookings.filter((booking) =>
      booking.status === "Accepted" ||
      booking.status === "InProgress" ||
      booking.status === "Completed",
    );
    const acceptedJobs = acceptedBookings.length;

    // Calculate completion rate (completed / accepted * 100)
    const completionRate = acceptedJobs === 0 ?
      0.0 :
      (completedJobs * 100) / acceptedJobs;

    // Calculate total earnings from completed bookings
    const totalEarnings = completedBookings.reduce((sum, booking) => {
      return sum + (booking.price || 0);
    }, 0);

    // Create a breakdown of package bookings from completed bookings
    const packageCounts = {};
    for (const booking of completedBookings) {
      if (booking.servicePackageIds && Array.isArray(booking.servicePackageIds)) {
        for (const packageId of booking.servicePackageIds) {
          packageCounts[packageId] = (packageCounts[packageId] || 0) + 1;
        }
      }
    }

    // Convert to array of tuples [packageId, count]
    const packageBreakdown = Object.entries(packageCounts);

    // Return the analytics data
    return {
      success: true,
      data: {
        providerId,
        completedJobs,
        cancelledJobs,
        totalJobs,
        completionRate: Number(completionRate.toFixed(2)),
        totalEarnings,
        startDate: startDate || null,
        endDate: endDate || null,
        packageBreakdown,
      },
    };
  } catch (error) {
    console.error("Error in getProviderAnalytics:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Release held payment when booking is completed
 * This function is called by authorized backend services to release payments
 */
exports.releasePayment = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, paymentId, releasedAmount, commissionRetained, payoutId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
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
    throw new HttpsError(
      "invalid-argument",
      "bookingId, releasedAmount, and commissionRetained are required",
    );
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    // Validate booking status - can only release payment for Completed bookings
    if (booking.status !== "Completed") {
      throw new HttpsError(
        "failed-precondition",
        "Payment can only be released for completed bookings",
      );
    }

    // Check if payment is already released
    if (booking.paymentReleased) {
      throw new HttpsError(
        "failed-precondition",
        "Payment has already been released for this booking",
      );
    }

    // Validate payment method - should only release digital payments
    if (booking.paymentMethod === "CashOnHand") {
      throw new HttpsError(
        "failed-precondition",
        "Cash payments do not require release",
      );
    }

    const releaseDate = new Date().toISOString();

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

    return {success: true, data: updatedBooking};
  } catch (error) {
    console.error("Error in releasePayment:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Cancel bookings that have missed their time slot
 * Scheduled function that runs every minute (for debugging)
 */
exports.cancelMissedBookings = onSchedule("* * * * *", async (_event) => {
  console.log("[cancelMissedBookings] scheduled function running...");
  console.log(`[cancelMissedBookings] Current time: ${new Date().toISOString()}`);

  try {
    const now = new Date(); // Current time


    // Find all "Accepted" bookings whose scheduled date (end time) has passed
    const missedBookingsQuery = await db.collection("bookings")
      .where("status", "==", "Accepted")
      .where("scheduledDate", "<=", now.toISOString())
      .get();

    // Find all "Requested" bookings whose scheduled date (end time) has passed
    const expiredRequestedBookingsQuery = await db.collection("bookings")
      .where("status", "==", "Requested")
      .where("scheduledDate", "<=", now.toISOString())
      .get();

    if (missedBookingsQuery.empty && expiredRequestedBookingsQuery.empty) {
      return {success: true, count: 0};
    }

    const batch = db.batch();
    const notificationPromises = [];
    const ticketPromises = [];
    let cancelledAcceptedCount = 0;
    let cancelledRequestedCount = 0;

    // Process each missed booking
    for (const doc of missedBookingsQuery.docs) {
      const booking = doc.data();


      // Fetch service details for notification
      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || "your service";
        }
      } catch (error) {
        console.error(`Error fetching service for booking ${booking.id}:`, error);
      }

      // Deduct reputation for provider missing the time slot
      try {
        await deductReputationForCancellationInternal(booking.providerId);
      } catch (error) {
        // Don't fail the cancellation if reputation update fails, just log it
      }


      // Update booking status to Cancelled
      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: now.toISOString(),
        cancellationReason: "auto_cancelled_missed_slot",
      });

      // Send notification to the client
      const notificationMessage = `Your booking for "${serviceName}" was automatically 
      cancelled because the provider did not start the service within the scheduled time. 
      Please feel free to book with another provider.`;

      notificationPromises.push(
        createNotification(
          booking.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_MISSED_SLOT,
          "Booking Cancelled - Missed Time Slot",
          notificationMessage,
          booking.id,
          {
            serviceId: booking.serviceId,
            serviceName,
            providerId: booking.providerId,
            requestedDate: booking.requestedDate,
            scheduledDate: booking.scheduledDate,
          },
        ),
      );

      // Automatically create a ticket with cancellation category for scheduled auto-cancel
      try {
        const reportId = generateReportId();
        const ticketDescription = JSON.stringify({
          title: `Scheduled Auto-Cancellation - ${serviceName}`,
          description: "Cancelled Booking.\nCancellation Reason: missed scheduled time slot",
          category: "cancellation",
          timestamp: new Date().toISOString(),
          source: "system_auto_cancellation_missed_slot",
          bookingId: booking.id,
          cancelledBy: "system",
          serviceId: booking.serviceId,
          serviceName: serviceName,
          providerId: booking.providerId,
          clientId: booking.clientId,
        });

        const newReport = {
          id: reportId,
          userId: "system",
          userName: "System",
          userPhone: "N/A",
          description: ticketDescription,
          status: "open",
          createdAt: new Date().toISOString(),
        };

        ticketPromises.push(
          db.collection("reports").doc(reportId).set(newReport).catch(() => { }),
        );
      } catch (ticketError) {
        // Capture errors
      }

      cancelledAcceptedCount++;
    }

    // Process each expired "Requested" booking
    for (const doc of expiredRequestedBookingsQuery.docs) {
      const booking = doc.data();


      // Fetch service details for notification
      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || "your service";
        }
      } catch (error) {
        console.error(`Error fetching service for booking ${booking.id}:`, error);
      }

      // Update booking status to Cancelled
      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: now.toISOString(),
        cancellationReason: "auto_cancelled_request_expired",
      });

      // Send notification to the client
      const notificationMessage = `Your booking request for "${serviceName}" has expired ` +
        `as the provider did not respond in time. 
        Please feel free to book another time or provider.`;

      notificationPromises.push(
        createNotification(
          booking.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN, // Re-using this type
          "Booking Request Expired",
          notificationMessage,
          booking.id,
          {
            serviceId: booking.serviceId,
            serviceName,
            providerId: booking.providerId,
            requestedDate: booking.requestedDate,
            scheduledDate: booking.scheduledDate,
          },
        ),
      );

      cancelledRequestedCount++;
    }

    const totalCancelled = cancelledAcceptedCount + cancelledRequestedCount;

    if (totalCancelled > 0) {
      await batch.commit();
      await Promise.allSettled(notificationPromises);
      await Promise.allSettled(ticketPromises);
    }

    return {
      success: true,
      cancelledCounts: {
        missedAccepted: cancelledAcceptedCount,
        expiredRequested: cancelledRequestedCount,
        total: totalCancelled,
      },
    };
  } catch (error) {
    console.error("Error cancelling missed bookings:", error);
    throw error;
  }
});

/**
 * Send service reminders for bookings that are due in 30 minutes
 * Scheduled function that runs every 10 minutes
 */
exports.sendServiceReminders = onSchedule("*/10 * * * *", async (_event) => {
  console.log("[sendServiceReminders] scheduled function running...");
  console.log(`[sendServiceReminders] Current time: ${new Date().toISOString()}`);

  try {
    const now = new Date();
    // Look for bookings that are 25-35 minutes away (to catch the 30-minute window)
    const reminderWindowStart = new Date(now.getTime() + 25 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 35 * 60 * 1000);


    // Find all "Accepted" bookings within the 30-minute window that haven't had reminders sent
    // Using requestedDate (start time) for the 30-minute reminder
    const upcomingBookingsQuery = await db.collection("bookings")
      .where("status", "==", "Accepted")
      .where("requestedDate", ">=", reminderWindowStart.toISOString())
      .where("requestedDate", "<=", reminderWindowEnd.toISOString())
      .get();

    if (upcomingBookingsQuery.empty) {
      return {success: true, count: 0};
    }

    const batch = db.batch();
    const notificationPromises = [];
    let reminderCount = 0;

    for (const doc of upcomingBookingsQuery.docs) {
      const booking = doc.data();

      // Skip if reminder already sent
      if (booking.reminderSent === true) {
        continue;
      }
      console.log(`   Booking details: requestedDate=${booking.requestedDate}, ` +
        `scheduledDate=${booking.scheduledDate}`);

      // Get service name for better notification message
      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || serviceDoc.data().name || serviceName;
        }
      } catch (error) {
        console.error(`Error fetching service name for ${booking.serviceId}:`, error);
      }

      // Mark booking as reminder sent
      batch.update(doc.ref, {
        reminderSent: true,
        reminderSentAt: now.toISOString(),
      });

      // Calculate exact minutes until booking starts (using requestedDate)
      const startTime = new Date(booking.requestedDate);
      const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

      // Send reminder to the client
      const clientMessage = `Reminder: Your "${serviceName}" booking is scheduled to start ` +
        `in approximately ${minutesUntil} minutes. Please be ready!`;
      notificationPromises.push(
        createNotification(
          booking.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.SERVICE_REMINDER,
          "Service Reminder",
          clientMessage,
          booking.id,
          {
            serviceId: booking.serviceId,
            serviceName,
            providerId: booking.providerId,
            requestedDate: booking.requestedDate,
            scheduledDate: booking.scheduledDate,
            minutesUntil,
          },
        ),
      );

      // Send reminder to the provider
      const providerMessage = `Reminder: You have a "${serviceName}" booking scheduled to ` +
        `start in approximately ${minutesUntil} minutes. Please prepare to start the service!`;
      notificationPromises.push(
        createNotification(
          booking.providerId,
          USER_TYPES.PROVIDER,
          NOTIFICATION_TYPES.SERVICE_REMINDER,
          "Service Reminder",
          providerMessage,
          booking.id,
          {
            serviceId: booking.serviceId,
            serviceName,
            clientId: booking.clientId,
            requestedDate: booking.requestedDate,
            scheduledDate: booking.scheduledDate,
            minutesUntil,
          },
        ),
      );

      reminderCount++;
    }

    if (reminderCount > 0) {
      await batch.commit();
      await Promise.allSettled(notificationPromises);
    }

    return {success: true, count: reminderCount};
  } catch (error) {
    console.error("Error sending service reminders:", error);
    throw error;
  }
});
