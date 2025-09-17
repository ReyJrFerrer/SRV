const functions = require("firebase-functions");
const { Xendit } = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client with proper error handling
let xendit;
try {
  const config = functions.config();
  const secretKey =
    (config.xendit && config.xendit.secret_key) ||
    process.env.XENDIT_SECRET_KEY;

  if (!secretKey) {
    console.warn("Xendit secret key not found in config or environment");
    xendit = null;
  } else {
    xendit = new Xendit({
      secretKey: secretKey,
    });
    console.log("Xendit client initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Xendit client:", error);
  xendit = null;
}

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function to release held payments when bookings are completed
 * This function validates booking completion and processes provider payouts
 */
exports.releaseHeldPayment = functions.https.onRequest(async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { bookingId, reason = "Booking completed" } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ error: "Missing required field: bookingId" });
    }

    console.log(`Processing payment release for booking: ${bookingId}`);

    // Validate booking completion status
    const bookingValidation = await validateBookingCompletion(bookingId);
    if (!bookingValidation.valid) {
      return res.status(400).json({
        error: "Booking validation failed",
        details: bookingValidation.reason,
      });
    }

    // Find held payment for this booking
    const heldPayment = await findHeldPaymentByBooking(bookingId);
    if (!heldPayment) {
      return res.status(404).json({
        error: "No held payment found for this booking",
      });
    }

    // Process payment release
    const releaseResult = await processPaymentRelease(heldPayment, reason);

    if (releaseResult.success) {
      res.status(200).json({
        success: true,
        message: "Payment released successfully",
        paymentId: heldPayment.paymentId,
        bookingId: bookingId,
        amount: heldPayment.heldAmount,
        providerAmount: heldPayment.providerAmount,
        commissionAmount: heldPayment.commissionAmount,
        payoutId: releaseResult.payoutId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to release payment",
        details: releaseResult.error,
      });
    }
  } catch (error) {
    console.error("Error in releaseHeldPayment function:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * Validate that the booking is completed and eligible for payment release
 * @param {string} bookingId - Booking ID to validate
 * @returns {Object} Validation result with valid flag and reason
 */
async function validateBookingCompletion(bookingId) {
  try {
    // Get booking details from Firestore
    const bookingDoc = await admin
      .firestore()
      .collection("bookings")
      .doc(bookingId)
      .get();

    if (!bookingDoc.exists) {
      return {
        valid: false,
        reason: "Booking not found",
      };
    }

    const booking = bookingDoc.data();

    // Check booking status
    if (booking.status !== "Completed") {
      return {
        valid: false,
        reason: `Booking status is '${booking.status}', must be 'Completed'`,
      };
    }

    // Check payment status
    if (booking.paymentStatus !== "PAID_HELD") {
      return {
        valid: false,
        reason: `Payment status is '${booking.paymentStatus}', must be 'PAID_HELD'`,
      };
    }

    // Additional validation: Check if payment was already released
    if (booking.paymentReleased === true) {
      return {
        valid: false,
        reason: "Payment has already been released for this booking",
      };
    }

    // Check if booking has required completion timestamp
    if (!booking.completedAt) {
      return {
        valid: false,
        reason: "Booking completion timestamp is missing",
      };
    }

    return {
      valid: true,
      booking: booking,
    };
  } catch (error) {
    console.error(`Error validating booking ${bookingId}:`, error);
    return {
      valid: false,
      reason: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Find held payment record by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {Object|null} Held payment data or null if not found
 */
async function findHeldPaymentByBooking(bookingId) {
  try {
    const heldPaymentQuery = await admin
      .firestore()
      .collection("held_payments")
      .where("bookingId", "==", bookingId)
      .where("status", "==", "HELD")
      .get();

    if (heldPaymentQuery.empty) {
      console.log(`No held payment found for booking: ${bookingId}`);
      return null;
    }

    // Should only be one held payment per booking
    const heldPaymentDoc = heldPaymentQuery.docs[0];
    return {
      id: heldPaymentDoc.id,
      ...heldPaymentDoc.data(),
    };
  } catch (error) {
    console.error(
      `Error finding held payment for booking ${bookingId}:`,
      error,
    );
    return null;
  }
}

/**
 * Process the payment release including payout and status updates
 * @param {Object} heldPayment - Held payment data
 * @param {string} reason - Reason for release
 * @returns {Object} Release result with success flag and details
 */
async function processPaymentRelease(heldPayment, reason) {
  const {
    id: heldPaymentId,
    paymentId,
    bookingId,
    providerId,
    clientId,
    heldAmount,
    providerAmount,
    commissionAmount,
    paymentData,
  } = heldPayment;

  let payoutId = null;

  try {
    // Create payment state audit trail for release
    await admin
      .firestore()
      .collection("payment_audit_trail")
      .add({
        paymentId,
        bookingId,
        providerId,
        clientId,
        state: "RELEASING",
        previousState: "PAID_HELD",
        amount: heldAmount,
        commissionAmount: commissionAmount,
        providerAmount: providerAmount,
        timestamp: new Date().toISOString(),
        metadata: {
          reason: reason,
          releaseInitiated: true,
        },
      });

    // Process provider payout
    const payoutResult = await processProviderPayout(
      paymentData,
      providerAmount,
      bookingId,
    );

    if (payoutResult.success) {
      payoutId = payoutResult.payoutId;
    }

    // Update held payment status
    await admin
      .firestore()
      .collection("held_payments")
      .doc(heldPaymentId)
      .update({
        status: "RELEASED",
        releasedAt: new Date().toISOString(),
        releasedAmount: providerAmount,
        commissionRetained: commissionAmount,
        payoutId: payoutId,
        releaseReason: reason,
        updatedAt: new Date().toISOString(),
      });

    // Update payment record
    await admin.firestore().collection("payments").doc(paymentId).update({
      status: "COMPLETED",
      paymentStatus: "RELEASED",
      releasedAt: new Date().toISOString(),
      releasedAmount: providerAmount,
      commissionRetained: commissionAmount,
      payoutId: payoutId,
      updatedAt: new Date().toISOString(),
    });

    // Update booking record
    await admin.firestore().collection("bookings").doc(bookingId).update({
      paymentStatus: "RELEASED",
      paymentReleased: true,
      releasedAt: new Date().toISOString(),
      releasedAmount: providerAmount,
      commissionRetained: commissionAmount,
      payoutId: payoutId,
      updatedAt: new Date().toISOString(),
    });

    // Create final audit trail entry
    await admin
      .firestore()
      .collection("payment_audit_trail")
      .add({
        paymentId,
        bookingId,
        providerId,
        clientId,
        state: "RELEASED",
        previousState: "RELEASING",
        amount: heldAmount,
        commissionAmount: commissionAmount,
        providerAmount: providerAmount,
        timestamp: new Date().toISOString(),
        metadata: {
          reason: reason,
          payoutId: payoutId,
          payoutSuccess: payoutResult.success,
          releaseCompleted: true,
        },
      });

    // Send release notifications
    await sendReleaseNotifications(
      bookingId,
      clientId,
      providerId,
      providerAmount,
      commissionAmount,
      payoutResult.success,
    );

    console.log(
      `Payment released successfully for booking ${bookingId}: ` +
        `₱${providerAmount} to provider, ₱${commissionAmount} commission retained`,
    );

    return {
      success: true,
      payoutId: payoutId,
      payoutSuccess: payoutResult.success,
      releasedAmount: providerAmount,
      commissionRetained: commissionAmount,
    };
  } catch (error) {
    console.error(`Error releasing payment for booking ${bookingId}:`, error);

    // Create error audit trail
    try {
      await admin
        .firestore()
        .collection("payment_audit_trail")
        .add({
          paymentId,
          bookingId,
          providerId,
          clientId,
          state: "RELEASE_FAILED",
          previousState: "PAID_HELD",
          amount: heldAmount,
          commissionAmount: commissionAmount,
          providerAmount: providerAmount,
          timestamp: new Date().toISOString(),
          metadata: {
            reason: reason,
            error: error.message,
            releaseFailed: true,
          },
        });
    } catch (auditError) {
      console.error("Error creating error audit trail:", auditError);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Process payout to provider's account
 * @param {Object} paymentData - Original payment data
 * @param {number} providerAmount - Amount to pay to provider
 * @param {string} bookingId - Booking ID for reference
 * @returns {Object} Payout result
 */
async function processProviderPayout(paymentData, providerAmount, bookingId) {
  const { providerId, providerPayoutInfo } = paymentData;

  try {
    // Check if Xendit client is available and provider has payout info
    if (!xendit || !providerPayoutInfo) {
      console.error(
        "Cannot process payout: missing Xendit client or provider payout info",
      );
      return {
        success: false,
        error: "Missing Xendit client or provider payout information",
      };
    }

    // Create payout using Xendit Payout API
    const { Payout } = xendit;
    const payoutData = {
      referenceId: `release-payout-${bookingId}-${Date.now()}`,
      channelCode: providerPayoutInfo.channelCode || "PH_GCASH",
      channelProperties: {
        accountNumber: providerPayoutInfo.gcashNumber,
        accountHolderName: providerPayoutInfo.accountHolderName,
      },
      amount: providerAmount,
      description: `Service payment release for booking ${bookingId}`,
      currency: "PHP",
      type: "DIRECT_DISBURSEMENT",
    };

    console.log("Creating release payout to provider:", payoutData);
    const payout = await Payout.createPayout({
      idempotencyKey: `release-payout-${bookingId}-${Date.now()}`,
      data: payoutData,
    });

    // Store payout record
    await admin
      .firestore()
      .collection("payouts")
      .doc(payout.id)
      .set({
        providerId,
        bookingId,
        payoutId: payout.id,
        referenceId: payout.referenceId,
        amount: providerAmount,
        status: payout.status,
        type: "RELEASE_PAYOUT",
        channelCode: payoutData.channelCode,
        accountNumber: providerPayoutInfo.gcashNumber,
        accountHolderName: providerPayoutInfo.accountHolderName,
        createdAt: new Date().toISOString(),
        estimatedArrival: payout.estimatedArrivalTime
          ? new Date(payout.estimatedArrivalTime).toISOString()
          : null,
      });

    console.log(
      `Release payout initiated for provider ${providerId}: ` +
        `₱${providerAmount} (Payout ID: ${payout.id})`,
    );

    return {
      success: true,
      payoutId: payout.id,
      status: payout.status,
      referenceId: payout.referenceId,
    };
  } catch (error) {
    console.error(
      `Error processing release payout for provider ${providerId}:`,
      error,
    );

    // Store failed payout attempt for manual processing
    await admin.firestore().collection("failed_payouts").add({
      providerId,
      bookingId,
      amount: providerAmount,
      type: "RELEASE_PAYOUT",
      error: error.message,
      createdAt: new Date().toISOString(),
      payoutInfo: providerPayoutInfo,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send notifications about payment release
 * @param {string} bookingId - Booking ID
 * @param {string} clientId - Client ID
 * @param {string} providerId - Provider ID
 * @param {number} providerAmount - Amount released to provider
 * @param {number} commissionAmount - Commission retained
 * @param {boolean} payoutSuccess - Whether payout was successful
 */
async function sendReleaseNotifications(
  bookingId,
  clientId,
  providerId,
  providerAmount,
  commissionAmount,
  payoutSuccess,
) {
  try {
    // Send notification to client
    const clientDoc = await admin
      .firestore()
      .collection("users")
      .doc(clientId)
      .get();

    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      const clientFcmToken = clientData.fcmToken;

      if (clientFcmToken) {
        const clientMessage = {
          token: clientFcmToken,
          notification: {
            title: "Payment Released",
            body:
              `Payment of ₱${providerAmount.toLocaleString()} has been released ` +
              "to your service provider. Service completed successfully!",
          },
          data: {
            type: "PAYMENT_RELEASED",
            bookingId: bookingId,
            amount: providerAmount.toString(),
            status: "RELEASED",
          },
        };

        await admin.messaging().send(clientMessage);
      }
    }

    // Send notification to provider
    const providerDoc = await admin
      .firestore()
      .collection("providers")
      .doc(providerId)
      .get();

    if (providerDoc.exists) {
      const providerData = providerDoc.data();
      const providerFcmToken = providerData.fcmToken;

      if (providerFcmToken) {
        const providerMessage = {
          token: providerFcmToken,
          notification: {
            title: payoutSuccess
              ? "Payment Released!"
              : "Payment Released (Processing)",
            body: payoutSuccess
              ? `₱${providerAmount.toLocaleString()} has been sent to your account!`
              : `₱${providerAmount.toLocaleString()} is being processed to your account.`,
          },
          data: {
            type: "PAYMENT_RELEASED",
            bookingId: bookingId,
            amount: providerAmount.toString(),
            status: "RELEASED",
            payoutSuccess: payoutSuccess.toString(),
          },
        };

        await admin.messaging().send(providerMessage);
      }
    }
  } catch (error) {
    console.error(
      `Error sending release notifications for booking ${bookingId}:`,
      error,
    );
  }
}
