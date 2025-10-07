const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
    "REQUESTED": ["ACCEPTED", "DECLINED", "CANCELLED"],
    "ACCEPTED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED", "DISPUTED"],
    "COMPLETED": ["DISPUTED"],
    "DECLINED": [],
    "CANCELLED": [],
    "DISPUTED": [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || newStatus === "DISPUTED";
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
      .where("status", "in", ["ACCEPTED", "IN_PROGRESS"])
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
 * Create notification for users
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
    await db.collection("notifications").add({
      targetUserId,
      userType,
      notificationType,
      title,
      message,
      relatedEntityId: bookingId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      read: false,
      createdAt: new Date().toISOString(),
    });
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
    if (service.providerId !== providerId) {
      console.error(`❌ [createBooking] 
        Service provider mismatch. Expected ${providerId}, got ${service.providerId}.`);
      throw new functions.https.HttpsError(
        "permission-denied",
        "Service does not belong to the specified provider",
      );
    }

    // If packages are specified, validate they exist and belong to this service
    let finalPrice = price;
    let totalPackagePrice = 0;

    if (servicePackageIds.length > 0) {
      for (const packageId of servicePackageIds) {
        console.log(`📦 [createBooking] Validating package ${packageId}...`);
        const packageDoc = await db.collection("servicePackages").doc(packageId).get();
        if (!packageDoc.exists) {
          throw new functions.https.HttpsError("not-found", `Package ${packageId} not found`);
        }

        const packageData = packageDoc.data();
        if (packageData.serviceId !== serviceId) {
          throw new functions.https.HttpsError(
            "permission-denied",
            `Package ${packageId} does not belong to the specified service`,
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
      console.warn("⚠️ [createBooking] Booking conflict detected.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The requested time conflicts with an existing booking",
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
      status: "REQUESTED",
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
      "provider",
      "new_booking_request",
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
    if (!isValidStatusTransition(booking.status, "ACCEPTED")) {
      console.error(`❌ [acceptBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to ACCEPTED`,
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
      status: "ACCEPTED",
      scheduledDate,
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [acceptBooking] Updating booking ${bookingId} to ACCEPTED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "ACCEPTED",
        scheduledDate,
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [acceptBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about booking acceptance
    await createNotification(
      booking.clientId,
      "client",
      "booking_accepted",
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
    if (!isValidStatusTransition(booking.status, "DECLINED")) {
      console.error(`❌ [declineBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to DECLINED`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "DECLINED",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [declineBooking] Updating booking ${bookingId} to DECLINED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "DECLINED",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [declineBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about booking decline
    await createNotification(
      booking.clientId,
      "client",
      "booking_declined",
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
    if (!isValidStatusTransition(booking.status, "IN_PROGRESS")) {
      console.error(`❌ [startBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to IN_PROGRESS`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "IN_PROGRESS",
      startedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [startBooking] Updating booking ${bookingId} to IN_PROGRESS.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "IN_PROGRESS",
        startedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [startBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the client about service start
    await createNotification(
      booking.clientId,
      "client",
      "service_started",
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
    if (!isValidStatusTransition(booking.status, "COMPLETED")) {
      console.error(`❌ [completeBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to COMPLETED`,
      );
    }

    const completedDate = new Date().toISOString();
    const updatedBooking = {
      ...booking,
      status: "COMPLETED",
      completedDate,
      amountPaid: amountPaid || booking.amountPaid,
      updatedAt: completedDate,
    };

    console.log(`📝 [completeBooking] Updating booking ${bookingId} to COMPLETED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "COMPLETED",
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
      "client",
      "booking_completed",
      "Service Completed",
      "Your service has been completed by the provider",
      bookingId,
      {serviceId: booking.serviceId, providerId: booking.providerId},
    );

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
    if (!isValidStatusTransition(booking.status, "CANCELLED")) {
      console.error(`❌ [cancelBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to CANCELLED`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [cancelBooking] Updating booking ${bookingId} to CANCELLED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "CANCELLED",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [cancelBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the other party about booking cancellation
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ? "provider" : "client";

    await createNotification(
      targetUserId,
      targetUserType,
      "booking_cancelled",
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
    if (!isValidStatusTransition(booking.status, "DISPUTED")) {
      console.error(`❌ [disputeBooking] Invalid status transition from ${booking.status}.`);
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Invalid status transition from ${booking.status} to DISPUTED`,
      );
    }

    const updatedBooking = {
      ...booking,
      status: "DISPUTED",
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 [disputeBooking] Updating booking ${bookingId} to DISPUTED.`);
    // Use Firestore transaction for atomic update
    await db.runTransaction(async (transaction) => {
      transaction.update(db.collection("bookings").doc(bookingId), {
        status: "DISPUTED",
        updatedAt: new Date().toISOString(),
      });
    });
    console.log(`✅ [disputeBooking] Successfully updated booking ${bookingId}.`);

    // Create notification for the other party about booking dispute
    const targetUserId = authInfo.uid === booking.clientId ? booking.providerId : booking.clientId;
    const targetUserType = authInfo.uid === booking.clientId ? "provider" : "client";

    await createNotification(
      targetUserId,
      targetUserType,
      "booking_disputed",
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
    if (!service.isActive) {
      console.warn(`⚠️ [checkServiceAvailability] Service ${serviceId} is not active.`);
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

    // Check provider availability settings if they exist
    console.log(`📝 [checkServiceAvailability]
       Checking provider availability for ${service.providerId}...`);
    const availabilityDoc = await db.collection("providerAvailability")
      .doc(service.providerId)
      .get();

    if (availabilityDoc.exists) {
      const availability = availabilityDoc.data();
      const requestedDate = new Date(requestedDateTime);
      const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const requestedHour = requestedDate.getHours();

      // Check if provider is available on this day and time
      const dayNames = [
        "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
      ];
      const daySchedule = availability.schedule?.[dayNames[dayOfWeek]];

      if (!daySchedule || !daySchedule.isAvailable) {
        console.warn(`⚠️ [checkServiceAvailability] 
          Provider not available on ${dayNames[dayOfWeek]}.`);
        return {
          success: true,
          data: {available: false, reason: "Provider not available on this day"},
        };
      }

      // Check time slots
      if (daySchedule.timeSlots && daySchedule.timeSlots.length > 0) {
        const isWithinTimeSlot = daySchedule.timeSlots.some((slot) => {
          const startHour = parseInt(slot.startTime.split(":")[0]);
          const endHour = parseInt(slot.endTime.split(":")[0]);
          return requestedHour >= startHour && requestedHour < endHour;
        });

        if (!isWithinTimeSlot) {
          console.warn(`⚠️ [checkServiceAvailability] 
            Requested time is outside provider's available hours.`);
          return {
            success: true,
            data: {
              available: false,
              reason: "Requested time is outside provider's available hours",
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

    // Get provider availability settings
    console.log(`📝 [getServiceAvailableSlots] 
      Fetching availability for provider ${service.providerId}...`);
    const availabilityDoc = await db.collection("providerAvailability")
      .doc(service.providerId)
      .get();

    if (!availabilityDoc.exists) {
      return {success: true, data: []};
    }

    const availability = availabilityDoc.data();
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const daySchedule = availability.schedule?.[dayNames[dayOfWeek]];

    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.timeSlots) {
      console.warn(`⚠️ [getServiceAvailableSlots] 
        No schedule available for ${dayNames[dayOfWeek]}.`);
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
      .where("status", "in", ["ACCEPTED", "IN_PROGRESS"])
      .where("scheduledDate", ">=", startOfDay.toISOString())
      .where("scheduledDate", "<=", endOfDay.toISOString())
      .get();

    const existingBookings = bookingsQuery.docs.map((doc) => doc.data());
    console.log(`[getServiceAvailableSlots] Found ${existingBookings.length} existing bookings.`);

    // Create available slots with conflict information
    const availableSlots = daySchedule.timeSlots.map((slot) => {
      const slotStart = parseInt(slot.startTime.split(":")[0]);
      const slotEnd = parseInt(slot.endTime.split(":")[0]);

      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some((booking) => {
        if (!booking.scheduledDate) return false;

        const bookingDate = new Date(booking.scheduledDate);
        const bookingHour = bookingDate.getHours();

        // Assume 1-hour booking duration for conflict checking
        return bookingHour >= slotStart && bookingHour < slotEnd;
      });

      return {
        timeSlot: {
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        isAvailable: !hasConflict,
        conflictReason: hasConflict ? "Time slot conflicts with existing booking" : null,
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
    const completedBookings = clientBookings.filter((booking) => booking.status === "COMPLETED");
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

    // Validate booking status - can only release payment for completed bookings
    if (booking.status !== "COMPLETED") {
      console.error(`❌ [releasePayment] Booking status is ${booking.status}, not COMPLETED.`);
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
      "provider",
      "payment_released",
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
