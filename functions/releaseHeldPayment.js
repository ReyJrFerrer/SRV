const functions = require("firebase-functions");
const { Xendit } = require("xendit-node");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

// Initialize Xendit client with proper error handling
let xendit;
try {
  const secretKey = process.env.XENDIT_SECRET_KEY;

  if (!secretKey) {
    console.warn("Xendit secret key not found in environment variables");
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

// Ensure Firebase Admin is initialized
if (admin.apps.length === 0) {
  // Check if we're in the emulator environment
  if (process.env.FUNCTIONS_EMULATOR) {
    console.log("🔥 Running in emulator mode");
    admin.initializeApp({
      projectId: "devsrv-rey",
    });

    // Set Firestore emulator settings
    const db = admin.firestore();
    db.settings({
      host: "127.0.0.1:8080",
      ssl: false,
    });
  } else {
    admin.initializeApp();
  }
}

/**
 * Get payment data by invoice ID (same logic as getPaymentData.js)
 * @param {string} invoiceId - Invoice ID
 * @return {Object|null} Payment data or null if not found
 */
async function getPaymentDataByInvoiceId(invoiceId) {
  try {
    console.log(`🔍 Fetching payment data for invoice: ${invoiceId}`);

    const db = admin.firestore();

    // Get the payment document from Firestore
    const paymentDoc = await db.collection("payments").doc(invoiceId).get();

    if (!paymentDoc.exists) {
      console.log(`❌ Payment document not found for invoice: ${invoiceId}`);
      return null;
    }

    const paymentData = paymentDoc.data();
    console.log(`✅ Payment data found for invoice: ${invoiceId}`);

    return {
      id: paymentDoc.id,
      ...paymentData,
    };
  } catch (error) {
    console.error("❌ Error fetching payment data:", error);
    return null;
  }
}

/**
 * Check invoice status (same logic as checkInvoiceStatus.js)
 * @param {string} invoiceId - Invoice ID
 * @return {Object} Status result
 */
async function checkInvoiceStatus(invoiceId) {
  try {
    console.log(`🔍 Checking status for invoice: ${invoiceId}`);

    // Check if Xendit client is initialized
    if (!xendit) {
      console.log(
        "Xendit client not initialized, checking Firestore for cached status",
      );

      // Fallback: Check Firestore for payment status
      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (!paymentDoc.exists) {
        return {
          success: false,
          error: "Invoice not found",
        };
      }

      const paymentData = paymentDoc.data();
      return {
        success: true,
        status: paymentData.status || "PENDING",
        invoiceId: invoiceId,
        amount: paymentData.amount,
        paymentChannel: paymentData.paymentChannel || "GCash",
        source: "firestore_cache",
      };
    }

    // Check if this is a mock invoice (development mode)
    if (invoiceId.startsWith("invoice_mock_")) {
      console.log("Mock invoice detected, simulating status check");

      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();
        return {
          success: true,
          status: paymentData.status || "PENDING",
          invoiceId: invoiceId,
          amount: paymentData.amount,
          paymentChannel: paymentData.paymentChannel || "GCash",
          source: "mock_development",
        };
      }
    }

    // Fetch invoice status from Xendit
    const { Invoice } = xendit;
    let invoice;

    try {
      invoice = await Invoice.getInvoiceById({
        invoiceId: invoiceId,
      });

      console.log(`✅ Invoice status fetched: ${invoice.status}`);
    } catch (xenditError) {
      console.error("Error fetching invoice from Xendit:", xenditError);

      // Fallback to Firestore if Xendit fails
      const db = admin.firestore();
      const paymentDoc = await db.collection("payments").doc(invoiceId).get();

      if (!paymentDoc.exists) {
        return {
          success: false,
          error: "Invoice not found in Xendit or Firestore",
        };
      }

      const paymentData = paymentDoc.data();
      return {
        success: true,
        status: paymentData.status || "PENDING",
        invoiceId: invoiceId,
        amount: paymentData.amount,
        paymentChannel: paymentData.paymentChannel || "GCash",
        source: "firestore_fallback",
      };
    }

    return {
      success: true,
      status: invoice.status,
      invoiceId: invoiceId,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount || invoice.amount,
      expiryDate: invoice.expiryDate,
      paidAt: invoice.paidAt,
      paymentChannel: invoice.paymentChannel || "GCash",
      paymentMethod: invoice.paymentMethod,
      source: "xendit_api",
    };
  } catch (error) {
    console.error("❌ Error checking invoice status:", error);
    return {
      success: false,
      error: error.message || "Internal server error",
    };
  }
}

/**
 * Cloud Function to release held payments when bookings are completed
 * This function uses invoiceId to directly fetch payment data and process payout
 */
exports.releaseHeldPayment = functions.https.onRequest(async (req, res) => {
  console.log("=== releaseHeldPayment function started ===");
  console.log("Request method:", req.method);
  console.log("Request headers origin:", req.headers.origin);

  // Set CORS headers first, before any other logic
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://devsrv-rey.web.app",
    "https://devsrv-rey.firebaseapp.com",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  } else {
    // For development and testing, allow localhost
    res.set("Access-Control-Allow-Origin", "*");
  }

  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return res.status(204).send();
  }

  try {
    // Only accept POST requests after handling OPTIONS
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method Not Allowed",
      });
    }

    // Extract data from request body
    const requestData = req.body.data || req.body;
    const { invoiceId, reason = "Booking completed" } = requestData;

    console.log("📦 Request received:", {
      invoiceId,
      reason,
    });

    if (!invoiceId) {
      console.error("❌ Missing invoiceId in request");
      return res.status(400).json({
        success: false,
        error: "Missing required field: invoiceId",
      });
    }

    console.log(`🔄 Processing payment release for invoice: ${invoiceId}`);

    // Get payment data directly using invoiceId
    const paymentData = await getPaymentDataByInvoiceId(invoiceId);
    if (!paymentData) {
      console.log(`❌ No payment data found for invoice: ${invoiceId}`);
      return res.status(404).json({
        success: false,
        error: "Payment data not found for this invoice",
      });
    }

    console.log("💳 Payment data found:", {
      invoiceId: paymentData.id,
      bookingId: paymentData.bookingId,
      amount: paymentData.amount,
      providerAmount: paymentData.providerAmount,
      commissionAmount: paymentData.commissionAmount,
    });

    // Verify payment status
    const invoiceStatus = await checkInvoiceStatus(invoiceId);
    if (
      !invoiceStatus.success ||
      (invoiceStatus.status !== "PAID" && invoiceStatus.status !== "SETTLED")
    ) {
      console.error("❌ Payment not eligible for release:", {
        success: invoiceStatus.success,
        status: invoiceStatus.status,
      });
      return res.status(400).json({
        success: false,
        error: "Payment not eligible for release",
        details: `Payment status is ${invoiceStatus.status || "unknown"}`,
      });
    }

    console.log("✅ Payment status verified:", invoiceStatus.status);

    // Process payment release
    const releaseResult = await processPaymentRelease(paymentData, reason);

    if (releaseResult.success) {
      console.log("✅ Payment release successful");

      res.status(200).json({
        success: true,
        message: "Payment released successfully",
        invoiceId: invoiceId,
        bookingId: paymentData.bookingId,
        amount: paymentData.amount,
        providerAmount: paymentData.providerAmount,
        commissionAmount: paymentData.commissionAmount,
        payoutId: releaseResult.payoutId,
      });
    } else {
      console.error("❌ Payment release failed:", releaseResult.error);
      res.status(500).json({
        success: false,
        error: "Failed to release payment",
        details: releaseResult.error,
      });
    }
  } catch (error) {
    console.error("❌ Error in releaseHeldPayment function:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

/**
 * Process the payment release including payout and status updates
 * @param {Object} paymentData - Payment data from payments collection
 * @param {string} reason - Reason for release
 * @return {Object} Release result with success flag and details
 */
async function processPaymentRelease(paymentData, reason) {
  const {
    id: invoiceId,
    bookingId,
    providerId,
    clientId,
    amount: totalAmount,
    providerAmount,
    commissionAmount,
  } = paymentData;

  let payoutId = null;

  try {
    // Create payment state audit trail for release
    await admin
      .firestore()
      .collection("payment_audit_trail")
      .add({
        invoiceId,
        bookingId,
        providerId,
        clientId,
        state: "RELEASING",
        previousState: "PAID_HELD",
        amount: totalAmount,
        commissionAmount: commissionAmount,
        providerAmount: providerAmount,
        timestamp: new Date().toISOString(),
        metadata: {
          reason: reason,
          releaseInitiated: true,
        },
      });

    // Process provider payout using payment data
    const payoutResult = await processProviderPayout(
      paymentData,
      providerAmount,
      bookingId,
    );

    if (payoutResult.success) {
      payoutId = payoutResult.payoutId;
    }

    // Update payment record to mark as released
    const db = admin.firestore();
    await db
      .collection("payments")
      .doc(invoiceId)
      .update({
        status: "COMPLETED",
        paymentStatus: "RELEASED",
        releasedAt: new Date().toISOString(),
        releasedAmount: providerAmount,
        commissionRetained: commissionAmount,
        payoutId: payoutId,
        updatedAt: new Date().toISOString(),
        statusHistory: FieldValue.arrayUnion({
          status: "released",
          timestamp: new Date().toISOString(),
          description:
            `Payment released to provider: ₱${providerAmount}, ` +
            `Commission retained: ₱${commissionAmount}`,
          reason: reason,
          payoutId: payoutId,
        }),
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
        invoiceId,
        bookingId,
        providerId,
        clientId,
        state: "RELEASED",
        previousState: "RELEASING",
        amount: totalAmount,
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
          invoiceId,
          bookingId,
          providerId,
          clientId,
          state: "RELEASE_FAILED",
          previousState: "PAID_HELD",
          amount: totalAmount,
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
 * @param {Object} paymentData - Payment data from payments collection
 * @param {number} providerAmount - Amount to pay to provider
 * @param {string} bookingId - Booking ID for reference
 * @return {Object} Payout result
 */
async function processProviderPayout(paymentData, providerAmount, bookingId) {
  const { providerId } = paymentData;

  try {
    // Get provider's payout information from the provider document
    const providerDoc = await admin
      .firestore()
      .collection("providers")
      .doc(providerId)
      .get();

    if (!providerDoc.exists) {
      console.error(`Provider ${providerId} not found`);
      return {
        success: false,
        error: "Provider not found",
      };
    }

    const providerData = providerDoc.data();
    const providerPayoutInfo =
      providerData.payoutInfo || providerData.onboardingData?.payoutInfo;

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

    // Validate required payout information
    if (
      !providerPayoutInfo.gcashNumber ||
      !providerPayoutInfo.accountHolderName
    ) {
      console.error("Provider payout info incomplete:", providerPayoutInfo);
      return {
        success: false,
        error: "Provider payout information is incomplete",
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
        invoiceId: paymentData.id,
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
    await admin
      .firestore()
      .collection("failed_payouts")
      .add({
        providerId,
        bookingId,
        invoiceId: paymentData.id,
        amount: providerAmount,
        type: "RELEASE_PAYOUT",
        error: error.message,
        createdAt: new Date().toISOString(),
        paymentData: {
          amount: paymentData.amount,
          commissionAmount: paymentData.commissionAmount,
          providerAmount: paymentData.providerAmount,
        },
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
