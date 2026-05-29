/**
 * Booking Management Cloud Functions
 *
 * This module handles all booking-related operations
 * Consolidated into a single entrypoint following the Firebase optimization guidelines
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {admin, getFirestore} = require("../firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const {
  NOTIFICATION_TYPES,
  USER_TYPES,
  NOTIFICATION_STATUS,
  generateNotificationHref,
  isSpamming,
  updateNotificationFrequency,
  sendOneSignalNotification,
  sendEmailForNotification,
  BOOKING_EMAIL_TYPES,
} = require("./notification");
const {
  checkUserReputationInternal,
  deductReputationForCancellationInternal,
} = require("./reputation");

const db = getFirestore();
const rtdb = admin.database();

// Constants for notification system
const NOTIFICATION_EXPIRY_DAYS = 30;

/**
 * Generates a unique report ID
 * @return {string} A unique report identifier
 */
function generateReportId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `report_${timestamp}_${random}`;
}

/**
 * Extracts authentication info from context or data
 * @param {Object} context The call context
 * @param {Object} data The request data
 * @return {Object} Auth info with uid, isAdmin, hasAuth
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
 * Generates a unique booking ID
 * @return {string} A unique booking identifier
 */
function generateBookingId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${now}-${random}`;
}

/**
 * Checks if a booking status transition is valid
 * @param {string} currentStatus The current booking status
 * @param {string} newStatus The desired new status
 * @return {boolean} Whether the transition is allowed
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
 * Checks if a booking conflicts with existing bookings
 * @param {string} serviceId The service ID
 * @param {string} providerId The provider ID
 * @param {string} requestedDateTime The requested start time
 * @param {string|null} scheduledDateTime The scheduled end time
 * @param {string|null} excludeBookingId Booking ID to exclude from check
 * @return {Promise<boolean>} Whether a conflict exists
 */
async function checkBookingConflicts(
  serviceId,
  providerId,
  requestedDateTime,
  scheduledDateTime = null,
  excludeBookingId = null,
) {
  try {
    const newBookingStart = new Date(requestedDateTime);
    const newBookingEnd = scheduledDateTime ?
      new Date(scheduledDateTime) :
      new Date(newBookingStart.getTime() + 60 * 60 * 1000);

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

    return existingBookings.docs.some((doc) => {
      if (excludeBookingId && doc.id === excludeBookingId) {
        return false;
      }

      const booking = doc.data();
      const existingStart = new Date(booking.requestedDate);
      const existingEnd = new Date(booking.scheduledDate);

      const hasOverlap = newBookingStart < existingEnd && newBookingEnd > existingStart;
      return hasOverlap;
    });
  } catch (error) {
    console.error("Error checking booking conflicts:", error);
    return false;
  }
}

/**
 * Checks if a service is currently active/available
 * @param {Object} service The service data
 * @return {boolean} Whether the service is active
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
 * Creates a notification for a user
 * @param {string} targetUserId The target user ID
 * @param {string} userType The user type (client/provider)
 * @param {string} notificationType The notification type
 * @param {string} title The notification title
 * @param {string} message The notification message
 * @param {string} bookingId The related booking ID
 * @param {Object|null} metadata Additional metadata
 * @return {Promise<void>} Resolves when notification is created
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

    const spamming = await isSpamming(targetUserId, notificationType);
    if (spamming) {
      console.log("Notification spam prevention failed");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + NOTIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const href = generateNotificationHref(
      notificationType,
      userType,
      bookingId,
    );

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

    await notificationRef.set(notification);
    await updateNotificationFrequency(targetUserId, notificationType);

    sendOneSignalNotification(targetUserId, {
      ...notification,
      createdAt: now,
    }).catch((error) => {
      console.error("Failed to send OneSignal notification:", error);
    });

    if (BOOKING_EMAIL_TYPES.has(notificationType)) {
      sendEmailForNotification(targetUserId, notification).catch((error) => {
        console.error("Failed to send notification email:", error);
      });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Cancels bookings that conflict with an accepted booking
 * @param {string} acceptedBookingId The accepted booking ID
 * @param {string} providerId The provider ID
 * @param {string} requestedDate The requested date
 * @param {string} scheduledDate The scheduled date
 * @param {string} serviceId The service ID
 * @return {Promise<void>} Resolves when conflicts are cancelled
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

    const dayStart = new Date(acceptedStart);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(acceptedStart);
    dayEnd.setHours(23, 59, 59, 999);

    const conflictingBookingsQuery = await db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("serviceId", "==", serviceId)
      .where("status", "==", "Requested")
      .where("requestedDate", ">=", dayStart.toISOString())
      .where("requestedDate", "<=", dayEnd.toISOString())
      .get();

    const serviceDoc = await db.collection("services").doc(serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "this service";

    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "The provider" :
      "The provider";

    const batch = db.batch();
    const notificationPromises = [];
    let cancelledCount = 0;

    conflictingBookingsQuery.forEach((doc) => {
      const conflictingBooking = doc.data();

      if (conflictingBooking.id === acceptedBookingId) {
        return;
      }

      const conflictStart = new Date(conflictingBooking.requestedDate);
      const conflictEnd = new Date(conflictingBooking.scheduledDate);

      const hasOverlap = acceptedStart < conflictEnd && acceptedEnd > conflictStart;

      if (!hasOverlap) {
        return;
      }

      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
        cancellationReason: "auto_cancelled_not_chosen",
      });

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
  }
}

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Creates a new booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} The created booking data
 */
async function createBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
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
    locationDetection = "manual",
  } = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!serviceId || !providerId || !price || !location || !requestedDate ||
    !paymentMethod || !scheduledDate) {
    throw new HttpsError(
      "invalid-argument",
      `Required parameters missing: serviceId, providerId, ` +
        `price, location, requestedDate, paymentMethod`,
    );
  }

  try {
    const clientReputation = await checkUserReputationInternal(authInfo.uid);
    console.log("[createBooking] Reputation check result:", clientReputation);
    if (!clientReputation.success || !clientReputation.data) {
      throw new HttpsError(
        "failed-precondition",
        "Unable to verify client reputation. Please try again later.",
      );
    }

    if (clientReputation.data.trustScore <= 5) {
      throw new HttpsError(
        "failed-precondition",
        `Your reputation score (${clientReputation.data.trustScore}) is too ` +
        "low to create a booking. Please contact support if you believe " +
        "this is an error.",
      );
    }

    const providerReputation = await checkUserReputationInternal(providerId);
    if (!providerReputation.success || !providerReputation.data) {
      throw new HttpsError(
        "failed-precondition",
        "Unable to verify provider reputation. Please try again later.",
      );
    }

    if (providerReputation.data.trustScore <= 5) {
      throw new HttpsError(
        "failed-precondition",
        "This provider is currently not accepting new bookings due to " +
        "reputation issues. Please try another provider.",
      );
    }

    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    if (service.providerId !== providerId) {
      throw new HttpsError(
        "permission-denied",
        "Service does not belong to the specified provider",
      );
    }

    if (!isServiceActive(service)) {
      throw new HttpsError(
        "failed-precondition",
        "Service is not available for booking",
      );
    }

    let finalPrice = price;
    let totalPackagePrice = 0;

    if (servicePackageIds.length > 0) {
      for (const packageId of servicePackageIds) {
        const packageDoc = await db.collection("service_packages").doc(packageId).get();
        if (!packageDoc.exists) {
          throw new HttpsError(
            "not-found",
            `Package with ID ${packageId} not found ` +
          `in 'service_packages' collection.`,
          );
        }

        const packageData = packageDoc.data();
        if (packageData.serviceId !== serviceId) {
          throw new HttpsError(
            "permission-denied",
            `Package ${packageId} belongs to ` +
            `service ${packageData.serviceId}, ` +
            `but booking is for service ${serviceId}.`,
          );
        }

        totalPackagePrice += packageData.price || 0;
      }

      if (totalPackagePrice > 0) {
        finalPrice = totalPackagePrice;
      }
    }

    const hasConflict = await checkBookingConflicts(
      serviceId,
      providerId,
      requestedDate,
      scheduledDate,
    );
    if (hasConflict) {
      throw new HttpsError(
        "failed-precondition",
        "The requested time conflicts with an existing booking.",
      );
    }

    const bookingId = generateBookingId();
    const now = new Date().toISOString();

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
      providerName: null,
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

    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection("bookings").doc(bookingId), newBooking);
    });

    const serviceName = service.title || "a service";
    const clientDoc = await db.collection("users").doc(authInfo.uid).get();
    const clientName = clientDoc.exists ? clientDoc.data().name || "A client" : "A client";

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
}

/**
 * Accepts a booking request
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function acceptBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, scheduledDate} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId || !scheduledDate) {
    throw new HttpsError("invalid-argument", "bookingId and scheduledDate are required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

    if (!isValidStatusTransition(booking.status, "Accepted")) {
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Accepted`,
      );
    }

    const hasConflict = await checkBookingConflicts(
      booking.serviceId,
      booking.providerId,
      booking.requestedDate,
      scheduledDate,
      bookingId,
    );
    if (hasConflict) {
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

    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Accepted",
        scheduledDate,
        updatedAt: new Date().toISOString(),
      });
    });

    await cancelConflictingBookings(
      bookingId,
      booking.providerId,
      booking.requestedDate,
      scheduledDate,
      booking.serviceId,
    );

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "the provider" :
      "the provider";

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
}

/**
 * Declines a booking request
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function declineBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

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

    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Declined",
        updatedAt: new Date().toISOString(),
      });
    });

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "the provider" :
      "the provider";

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
}

/**
 * Starts navigation tracking for a booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} Success status
 */
async function startNavigation_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "the provider" :
      "the provider";

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

      try {
        await db.collection("bookings").doc(bookingId).update({
          navigationStartedNotified: true,
          navigationStartedNotifiedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.warn("Failed to mark booking as navigationStartedNotified:", bookingId, err);
      }

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
          "[startNavigation] Failed to init RTDB location:",
          bookingId, rtdbErr,
        );
      }
    }

    return {success: true};
  } catch (error) {
    console.error("Error in startNavigation:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Starts a booking (transitions to InProgress)
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function startBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

    if (!isValidStatusTransition(booking.status, "InProgress")) {
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

    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "InProgress",
        startedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "the provider" :
      "the provider";

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

    try {
      await rtdb.ref(`providerLocations/${bookingId}`).remove();
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
}

/**
 * Completes a booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function completeBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, amountPaid} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

    if (!isValidStatusTransition(booking.status, "Completed")) {
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

    await db.collection("bookings").doc(bookingId).update({
      status: "Completed",
      completedDate,
      amountPaid: amountPaid || booking.amountPaid,
      updatedAt: completedDate,
    });

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "your service";

    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const providerName = providerDoc.exists ?
      providerDoc.data().name || "the provider" :
      "the provider";

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
}

/**
 * Cancels a booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function cancelBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, cancelReason} = payload;

  if (!cancelReason || typeof cancelReason !== "string" || cancelReason.trim() === "") {
    throw new HttpsError("invalid-argument", "A reason for cancellation is required");
  }

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to update this booking");
    }

    if (!isValidStatusTransition(booking.status, "Cancelled")) {
      throw new HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to Cancelled`,
      );
    }

    const shouldDeductReputation = booking.status === "Accepted" ||
      booking.status === "InProgress" || booking.status === "Requested";

    if (shouldDeductReputation) {
      try {
        await deductReputationForCancellationInternal(authInfo.uid);
      } catch (error) {
        // Don't fail the cancellation if reputation update fails
      }
    }

    const cancellerRole = authInfo.uid === booking.clientId ? "Client" : "Provider";
    const updatedBooking = {
      ...booking,
      status: "Cancelled",
      cancelReason: cancelReason.trim(),
      cancelledBy: cancellerRole,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Cancelled",
        cancelReason: cancelReason.trim(),
        cancelledBy: cancellerRole,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "a service";

    const cancellerDoc = await db.collection("users").doc(authInfo.uid).get();
    const cancellerName = cancellerDoc.exists ? cancellerDoc.data().name || "A user" : "A user";

    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ?
      USER_TYPES.PROVIDER : USER_TYPES.CLIENT;

    await createNotification(
      targetUserId,
      targetUserType,
      NOTIFICATION_TYPES.BOOKING_CANCELLED,
      "Booking Cancelled",
      `${cancellerName} cancelled the booking ` +
      `for "${serviceName}". Reason: ${cancelReason.trim()}`,
      bookingId,
      {
        serviceId: booking.serviceId,
        serviceName,
        cancelledBy: cancellerRole,
        cancelReason: cancelReason.trim(),
        senderName: cancellerName,
        message: `${cancellerName} cancelled the ` +
          `booking for "${serviceName}". ` +
          `Reason: ${cancelReason.trim()}`,
      },
    );

    try {
      const userProfile = cancellerDoc.exists ? cancellerDoc.data() : null;
      const reportId = generateReportId();

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

      await db.collection("reports").doc(reportId).set(newReport);
    } catch (ticketError) {
      // Don't fail the cancellation if ticket creation fails
    }

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
}

/**
 * Gets a single booking by ID
 * @param {Object} request The callable request
 * @return {Promise<Object>} The booking data
 */
async function getBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.clientId !== authInfo.uid &&
      booking.providerId !== authInfo.uid &&
      !authInfo.isAdmin) {
      throw new HttpsError("permission-denied", "Not authorized to view this booking");
    }

    return {success: true, data: booking};
  } catch (error) {
    console.error("Error in getBooking:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Gets bookings for a client
 * @param {Object} request The callable request
 * @return {Promise<Object>} List of client bookings
 */
async function getClientBookings_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {clientId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these bookings");
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
}

/**
 * Gets bookings for a provider
 * @param {Object} request The callable request
 * @return {Promise<Object>} List of provider bookings
 */
async function getProviderBookings_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {providerId, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetProviderId = providerId || authInfo.uid;
  if (targetProviderId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these bookings");
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
}

/**
 * Gets bookings filtered by status (admin only)
 * @param {Object} request The callable request
 * @return {Promise<Object>} List of bookings with the given status
 */
async function getBookingsByStatus_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {status, limit = 50} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  if (!status) {
    throw new HttpsError("invalid-argument", "status is required");
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
}

/**
 * Disputes a booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function disputeBooking_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "bookingId is required");
  }

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      throw new HttpsError("not-found", "Booking not found");
    }

    const booking = bookingDoc.data();

    if (booking.clientId !== authInfo.uid && booking.providerId !== authInfo.uid) {
      throw new HttpsError("permission-denied", "Not authorized to dispute this booking");
    }

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

    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "Disputed",
        updatedAt: new Date().toISOString(),
      });
    });

    const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
    const serviceName = serviceDoc.exists ? serviceDoc.data().title : "a service";

    const disputerDoc = await db.collection("users").doc(authInfo.uid).get();
    const disputerName = disputerDoc.exists ? disputerDoc.data().name || "A user" : "A user";

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
}

/**
 * Checks if a service is available at a given time
 * @param {Object} request The callable request
 * @return {Promise<Object>} Availability status
 */
async function checkServiceAvailability_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {serviceId, requestedDateTime} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!serviceId || !requestedDateTime) {
    throw new HttpsError("invalid-argument", "serviceId and requestedDateTime are required");
  }

  try {
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    if (!isServiceActive(service)) {
      return {success: true, data: {available: false, reason: "Service is not active"}};
    }

    const hasConflict = await checkBookingConflicts(
      serviceId,
      service.providerId,
      requestedDateTime,
    );

    if (hasConflict) {
      return {
        success: true,
        data: {available: false, reason: "Time slot conflicts with existing booking"},
      };
    }

    if (service.weeklySchedule && service.weeklySchedule.length > 0) {
      const requestedDate = new Date(requestedDateTime);
      const philippineOffset = 8 * 60;
      const localDate = new Date(requestedDate.getTime() + (philippineOffset * 60 * 1000));
      const dayOfWeek = localDate.getDay();
      const requestedHour = localDate.getHours();

      const dayNames = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
      ];
      const requestedDayName = dayNames[dayOfWeek];

      const daySchedule = service.weeklySchedule.find((schedule) =>
        schedule.day === requestedDayName,
      );

      if (!daySchedule || !daySchedule.availability?.isAvailable) {
        return {
          success: true,
          data: {available: false, reason: `Service not available on ${requestedDayName}`},
        };
      }

      if (daySchedule.availability.slots && daySchedule.availability.slots.length > 0) {
        daySchedule.availability.slots.some((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const startMinute = parseInt(slot.startTime.split(":")[1] || "0");
          const endHour = parseInt(slot.endTime.split(":")[0]);
          const endMinute = parseInt(slot.endTime.split(":")[1] || "0");

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
}

/**
 * Gets available time slots for a service on a given date
 * @param {Object} request The callable request
 * @return {Promise<Object>} Available time slots
 */
async function getServiceAvailableSlots_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {serviceId, date} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!serviceId || !date) {
    throw new HttpsError("invalid-argument", "serviceId and date are required");
  }

  try {
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    if (!isServiceActive(service)) {
      return {success: true, data: []};
    }

    if (!service.weeklySchedule || service.weeklySchedule.length === 0) {
      return {success: true, data: []};
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const dayNames = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ];
    const requestedDayName = dayNames[dayOfWeek];

    const daySchedule = service.weeklySchedule.find((schedule) =>
      schedule.day === requestedDayName,
    );

    if (!daySchedule || !daySchedule.availability?.isAvailable ||
      !daySchedule.availability?.slots) {
      return {success: true, data: []};
    }

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

    const availableSlots = daySchedule.availability.slots.map((slot) => {
      const [slotStartHour, slotStartMinute] = slot.startTime.split(":").map(Number);
      const [slotEndHour, slotEndMinute] = slot.endTime.split(":").map(Number);

      const slotStartTime = new Date(requestedDate);
      slotStartTime.setHours(slotStartHour, slotStartMinute, 0, 0);

      const slotEndTime = new Date(requestedDate);
      slotEndTime.setHours(slotEndHour, slotEndMinute, 0, 0);

      const hasBookingConflict = existingBookings.some((booking) => {
        if (!booking.requestedDate || !booking.scheduledDate) return false;

        const bookingStart = new Date(booking.requestedDate);
        const bookingEnd = new Date(booking.scheduledDate);

        const hasOverlap = slotStartTime < bookingEnd && slotEndTime > bookingStart;
        return hasOverlap;
      });

      const isSlotAvailable = !hasBookingConflict;
      const conflictReason = hasBookingConflict ?
        "Time slot conflicts with existing booking" : null;

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
}

/**
 * Gets analytics for a client
 * @param {Object} request The callable request
 * @return {Promise<Object>} Client analytics data
 */
async function getClientAnalytics_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {clientId, startDate, endDate} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetClientId = clientId || authInfo.uid;
  if (targetClientId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to view these analytics");
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const actualStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
    const actualEndDate = endDate ? new Date(endDate) : now;

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

    const bookingsQuery = await db.collection("bookings")
      .where("clientId", "==", targetClientId)
      .where("createdAt", ">=", actualStartDate.toISOString())
      .where("createdAt", "<=", actualEndDate.toISOString())
      .get();

    const clientBookings = bookingsQuery.docs.map((doc) => doc.data());
    const totalBookings = clientBookings.length;

    const completedBookings = clientBookings.filter((booking) => booking.status === "Completed");
    const servicesCompleted = completedBookings.length;

    const totalSpent = completedBookings.reduce((sum, booking) => {
      return sum + (booking.amountPaid || booking.price || 0);
    }, 0);

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
}

/**
 * Gets analytics for a provider (admin only)
 * @param {Object} request The callable request
 * @return {Promise<Object>} Provider analytics data
 */
async function getProviderAnalytics_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {providerId, startDate, endDate} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Only ADMIN users can get provider analytics");
  }

  if (!providerId) {
    throw new HttpsError("invalid-argument", "Provider ID is required");
  }

  try {
    const now = new Date();
    const actualStartDate = startDate ? new Date(startDate) : new Date(0);
    const actualEndDate = endDate ? new Date(endDate) : now;

    let query = db.collection("bookings").where("providerId", "==", providerId);

    if (startDate) {
      query = query.where("createdAt", ">=", actualStartDate.toISOString());
    }
    if (endDate) {
      query = query.where("createdAt", "<=", actualEndDate.toISOString());
    }

    const providerBookingsSnapshot = await query.get();
    const providerBookings = providerBookingsSnapshot.docs.map((doc) => doc.data());

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

    const completedBookings = providerBookings.filter((booking) =>
      booking.status === "Completed",
    );
    const completedJobs = completedBookings.length;

    const cancelledBookings = providerBookings.filter((booking) =>
      booking.status === "Cancelled" || booking.status === "Declined",
    );
    const cancelledJobs = cancelledBookings.length;

    const acceptedBookings = providerBookings.filter((booking) =>
      booking.status === "Accepted" ||
      booking.status === "InProgress" ||
      booking.status === "Completed",
    );
    const acceptedJobs = acceptedBookings.length;

    const completionRate = acceptedJobs === 0 ?
      0.0 :
      (completedJobs * 100) / acceptedJobs;

    const totalEarnings = completedBookings.reduce((sum, booking) => {
      return sum + (booking.price || 0);
    }, 0);

    const packageCounts = {};
    for (const booking of completedBookings) {
      if (booking.servicePackageIds && Array.isArray(booking.servicePackageIds)) {
        for (const packageId of booking.servicePackageIds) {
          packageCounts[packageId] = (packageCounts[packageId] || 0) + 1;
        }
      }
    }

    const packageBreakdown = Object.entries(packageCounts);

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
}

/**
 * Releases payment for a completed booking
 * @param {Object} request The callable request
 * @return {Promise<Object>} The updated booking data
 */
async function releasePayment_booking(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, paymentId, releasedAmount, commissionRetained, payoutId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!authInfo.isAdmin) {
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

    if (booking.status !== "Completed") {
      throw new HttpsError(
        "failed-precondition",
        "Payment can only be released for completed bookings",
      );
    }

    if (booking.paymentReleased) {
      throw new HttpsError(
        "failed-precondition",
        "Payment has already been released for this booking",
      );
    }

    if (booking.paymentMethod === "CashOnHand") {
      throw new HttpsError(
        "failed-precondition",
        "Cash payments do not require release",
      );
    }

    const releaseDate = new Date().toISOString();

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
}

// ============================================================================
// SCHEDULED FUNCTIONS (separate from action router)
// ============================================================================

exports.cancelMissedBookings = onSchedule("0 0 * * *", async (_event) => {
  console.log("[cancelMissedBookings] scheduled function running...");
  console.log(`[cancelMissedBookings] Current time: ${new Date().toISOString()}`);

  try {
    const now = new Date();

    const missedBookingsQuery = await db.collection("bookings")
      .where("status", "==", "Accepted")
      .where("scheduledDate", "<=", now.toISOString())
      .get();

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

    for (const doc of missedBookingsQuery.docs) {
      const booking = doc.data();

      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || "your service";
        }
      } catch (error) {
        console.error(`Error fetching service for booking ${booking.id}:`, error);
      }

      try {
        await deductReputationForCancellationInternal(booking.providerId);
      } catch (error) {
        // Don't fail the cancellation if reputation update fails
      }

      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: now.toISOString(),
        cancellationReason: "auto_cancelled_missed_slot",
      });

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

    for (const doc of expiredRequestedBookingsQuery.docs) {
      const booking = doc.data();

      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || "your service";
        }
      } catch (error) {
        console.error(`Error fetching service for booking ${booking.id}:`, error);
      }

      batch.update(doc.ref, {
        status: "Cancelled",
        updatedAt: now.toISOString(),
        cancellationReason: "auto_cancelled_request_expired",
      });

      const notificationMessage = `Your booking request for "${serviceName}" has expired ` +
        `as the provider did not respond in time. 
        Please feel free to book another time or provider.`;

      notificationPromises.push(
        createNotification(
          booking.clientId,
          USER_TYPES.CLIENT,
          NOTIFICATION_TYPES.BOOKING_AUTO_CANCELLED_NOT_CHOSEN,
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

exports.sendServiceReminders = onSchedule("*/10 * * * *", async (_event) => {
  console.log("[sendServiceReminders] scheduled function running...");
  console.log(`[sendServiceReminders] Current time: ${new Date().toISOString()}`);

  try {
    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 25 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 35 * 60 * 1000);

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

      if (booking.reminderSent === true) {
        continue;
      }

      let serviceName = "your service";
      try {
        const serviceDoc = await db.collection("services").doc(booking.serviceId).get();
        if (serviceDoc.exists) {
          serviceName = serviceDoc.data().title || serviceDoc.data().name || serviceName;
        }
      } catch (error) {
        console.error(`Error fetching service name for ${booking.serviceId}:`, error);
      }

      batch.update(doc.ref, {
        reminderSent: true,
        reminderSentAt: now.toISOString(),
      });

      const startTime = new Date(booking.requestedDate);
      const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

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

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.bookingAction = onCall(
  {
    memory: "256MiB",
  },
  async (request) => {
    const {action} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "createBooking":
        return await createBooking_booking(request);
      case "acceptBooking":
        return await acceptBooking_booking(request);
      case "declineBooking":
        return await declineBooking_booking(request);
      case "startNavigation":
        return await startNavigation_booking(request);
      case "startBooking":
        return await startBooking_booking(request);
      case "completeBooking":
        return await completeBooking_booking(request);
      case "cancelBooking":
        return await cancelBooking_booking(request);
      case "getBooking":
        return await getBooking_booking(request);
      case "getClientBookings":
        return await getClientBookings_booking(request);
      case "getProviderBookings":
        return await getProviderBookings_booking(request);
      case "getBookingsByStatus":
        return await getBookingsByStatus_booking(request);
      case "disputeBooking":
        return await disputeBooking_booking(request);
      case "checkServiceAvailability":
        return await checkServiceAvailability_booking(request);
      case "getServiceAvailableSlots":
        return await getServiceAvailableSlots_booking(request);
      case "getClientAnalytics":
        return await getClientAnalytics_booking(request);
      case "getProviderAnalytics":
        return await getProviderAnalytics_booking(request);
      case "releasePayment":
        return await releasePayment_booking(request);
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
