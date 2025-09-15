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
 * Cloud Function to handle Xendit webhook notifications
 * This is the most critical function that receives payment status updates
 */
exports.xenditWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Verify webhook signature from Xendit
    const callbackToken =
      (functions.config().xendit && functions.config().xendit.callback_token) ||
      process.env.XENDIT_CALLBACK_TOKEN;
    const receivedSignature = req.headers["x-callback-token"];

    if (!receivedSignature || receivedSignature !== callbackToken) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    const webhookData = req.body;
    console.log("Xendit webhook received:", JSON.stringify(webhookData));

    // Handle different webhook events based on Xendit documentation
    // Check for invoice callback structure
    if (webhookData.id && webhookData.status) {
      if (webhookData.status === "PAID") {
        await handlePaidInvoice(webhookData);
      } else if (webhookData.status === "EXPIRED") {
        await handleExpiredInvoice(webhookData);
      } else {
        console.log(`Unhandled invoice status: ${webhookData.status}`);
      }
    } else {
      console.log("Unknown webhook format:", webhookData);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Xendit webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Handle successful payment (PAID status)
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handlePaidInvoice(webhookData) {
  const { id, externalId } = webhookData;

  try {
    // Determine if this is a direct payment or wallet top-up
    if (externalId && externalId.startsWith("topup-")) {
      await handleWalletTopupPaid(webhookData);
    } else if (externalId && externalId.startsWith("booking-")) {
      await handleDirectPaymentPaid(webhookData);
    } else {
      console.error(`Unknown externalId format: ${externalId}`);
    }
  } catch (error) {
    console.error(`Error handling paid invoice ${id}:`, error);
    throw error;
  }
}

/**
 * Handle wallet top-up payment completion
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handleWalletTopupPaid(webhookData) {
  const { id, paidAmount, amount } = webhookData;
  const actualPaidAmount = paidAmount || amount;

  try {
    // Update top-up record
    try {
      await admin.firestore().collection("topups").doc(id).update({
        status: "COMPLETED",
        paidAmount: actualPaidAmount,
        paidAt: new Date().toISOString(),
      });
    } catch (firestoreError) {
      console.error("Error updating topup record:", firestoreError);
      // Continue processing even if Firestore update fails
    }

    // Get top-up details
    let topupData;
    try {
      const topupDoc = await admin
        .firestore()
        .collection("topups")
        .doc(id)
        .get();

      if (!topupDoc.exists) {
        throw new Error(`Top-up record not found: ${id}`);
      }

      topupData = topupDoc.data();
    } catch (error) {
      console.error(`Error fetching top-up data for ${id}:`, error);
      return; // Cannot continue without topup data
    }

    const providerId = topupData.providerId;

    // Credit the provider's wallet via ICP canister
    // Note: This would typically call your ICP backend
    // For now, we'll store the transaction and let the frontend sync
    try {
      await admin
        .firestore()
        .collection("wallet_transactions")
        .add({
          providerId,
          type: "CREDIT",
          amount: actualPaidAmount,
          description: `Wallet top-up via Xendit: ${id}`,
          invoiceId: id,
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
        });
    } catch (error) {
      console.error("Error saving wallet transaction:", error);
    }

    // Send push notification
    await sendTopupNotification(providerId, actualPaidAmount);

    console.log(
      `Wallet top-up completed for provider ${providerId}: ` +
        `₱${actualPaidAmount}`,
    );
  } catch (error) {
    console.error(`Error handling wallet top-up ${id}:`, error);
    throw error;
  }
}

/**
 * Handle direct payment completion and trigger payout to provider
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handleDirectPaymentPaid(webhookData) {
  const { id, paidAmount, amount } = webhookData;
  const actualPaidAmount = paidAmount || amount;

  try {
    // Update payment record
    try {
      await admin.firestore().collection("payments").doc(id).update({
        status: "COMPLETED",
        paidAmount: actualPaidAmount,
        paidAt: new Date().toISOString(),
      });
    } catch (firestoreError) {
      console.error("Error updating payment record:", firestoreError);
      // Continue processing even if Firestore update fails
    }

    // Get payment details
    let paymentData;
    try {
      const paymentDoc = await admin
        .firestore()
        .collection("payments")
        .doc(id)
        .get();

      if (!paymentDoc.exists) {
        throw new Error(`Payment record not found: ${id}`);
      }

      paymentData = paymentDoc.data();
    } catch (error) {
      console.error(`Error fetching payment data for ${id}:`, error);
      return; // Cannot continue without payment data
    }

    const { bookingId, providerId, clientId } = paymentData;

    // Update booking status to PAID
    try {
      await admin.firestore().collection("bookings").doc(bookingId).update({
        paymentStatus: "PAID",
        paidAmount: actualPaidAmount,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating booking:", error);
    }

    // Trigger payout to provider's GCash
    await processProviderPayout(paymentData, actualPaidAmount);

    // Call ICP canister to confirm digital payment
    // Note: This would typically make a call to your ICP backend
    // For now, we'll store the confirmation and let the backend sync
    try {
      await admin.firestore().collection("payment_confirmations").add({
        bookingId,
        providerId,
        clientId,
        invoiceId: id,
        amount: actualPaidAmount,
        paymentMethod: "DIGITAL",
        confirmedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving payment confirmation:", error);
    }

    // Send notifications to both client and provider
    await sendPaymentNotifications(
      bookingId,
      clientId,
      providerId,
      actualPaidAmount,
    );

    console.log(
      `Direct payment completed for booking ${bookingId}: ` +
        `₱${actualPaidAmount}`,
    );
  } catch (error) {
    console.error(`Error handling direct payment ${id}:`, error);
    throw error;
  }
}

/**
 * Process payout to provider's GCash account
 * @param {Object} paymentData - Payment record data
 * @param {number} paidAmount - Amount that was actually paid
 */
async function processProviderPayout(paymentData, paidAmount) {
  const {
    providerId,
    providerAmount,
    bookingId,
    invoiceId,
    providerPayoutInfo,
  } = paymentData;

  try {
    // Check if Xendit client is available and provider has payout info
    if (!xendit || !providerPayoutInfo) {
      console.error(
        "Cannot process payout: missing Xendit client or " +
          "provider payout info",
      );
      return;
    }

    // Create payout using Xendit Payout API
    const { Payout } = xendit;
    const payoutData = {
      referenceId: `payout-${bookingId}-${Date.now()}`,
      channelCode: providerPayoutInfo.channelCode || "PH_GCASH",
      channelProperties: {
        accountNumber: providerPayoutInfo.gcashNumber,
        accountHolderName: providerPayoutInfo.accountHolderName,
      },
      amount: providerAmount,
      description: `Service payment for booking ${bookingId}`,
      currency: "PHP",
      type: "DIRECT_DISBURSEMENT",
    };

    console.log("Creating payout to provider:", payoutData);
    const payout = await Payout.createPayout({
      idempotencyKey: `payout-${invoiceId}-${Date.now()}`,
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
        invoiceId,
        payoutId: payout.id,
        referenceId: payout.referenceId,
        amount: providerAmount,
        status: payout.status,
        channelCode: payoutData.channelCode,
        accountNumber: providerPayoutInfo.gcashNumber,
        accountHolderName: providerPayoutInfo.accountHolderName,
        createdAt: new Date().toISOString(),
        estimatedArrival: payout.estimatedArrivalTime
          ? new Date(payout.estimatedArrivalTime).toISOString()
          : null,
      });

    console.log(
      `Payout initiated for provider ${providerId}: ` +
        `₱${providerAmount} (Payout ID: ${payout.id})`,
    );
  } catch (error) {
    console.error(`Error processing payout for provider ${providerId}:`, error);

    // Store failed payout attempt for manual processing
    await admin.firestore().collection("failed_payouts").add({
      providerId,
      bookingId,
      invoiceId,
      amount: providerAmount,
      error: error.message,
      createdAt: new Date().toISOString(),
      payoutInfo: providerPayoutInfo,
    });
  }
}

/**
 * Handle expired invoice
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handleExpiredInvoice(webhookData) {
  const { id, externalId } = webhookData;

  try {
    if (externalId && externalId.startsWith("topup-")) {
      await admin.firestore().collection("topups").doc(id).update({
        status: "EXPIRED",
        expiredAt: new Date().toISOString(),
      });
    } else if (externalId && externalId.startsWith("booking-")) {
      await admin.firestore().collection("payments").doc(id).update({
        status: "EXPIRED",
        expiredAt: new Date().toISOString(),
      });

      // Also update the booking
      const paymentDoc = await admin
        .firestore()
        .collection("payments")
        .doc(id)
        .get();

      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();
        await admin
          .firestore()
          .collection("bookings")
          .doc(paymentData.bookingId)
          .update({
            paymentStatus: "EXPIRED",
            updatedAt: new Date().toISOString(),
          });
      }
    }

    console.log(`Invoice expired: ${id}`);
  } catch (error) {
    console.error(`Error handling expired invoice ${id}:`, error);
    throw error;
  }
}

/**
 * Send push notification for wallet top-up
 * @param {string} providerId - Provider ID
 * @param {number} amount - Top-up amount
 */
async function sendTopupNotification(providerId, amount) {
  try {
    // Get provider's FCM token (assuming stored in Firestore)
    const providerDoc = await admin
      .firestore()
      .collection("providers")
      .doc(providerId)
      .get();

    if (providerDoc.exists) {
      const providerData = providerDoc.data();
      const fcmToken = providerData.fcmToken;

      if (fcmToken) {
        const message = {
          token: fcmToken,
          notification: {
            title: "Wallet Top-up Successful",
            body: `₱${amount.toLocaleString()} has been added to your wallet`,
          },
          data: {
            type: "WALLET_TOPUP",
            amount: amount.toString(),
          },
        };

        await admin.messaging().send(message);
      }
    }
  } catch (error) {
    console.error(`Error sending top-up notification to ${providerId}:`, error);
  }
}

/**
 * Send payment notifications to client and provider
 * @param {string} bookingId - Booking ID
 * @param {string} clientId - Client ID
 * @param {string} providerId - Provider ID
 * @param {number} amount - Payment amount
 */
async function sendPaymentNotifications(
  bookingId,
  clientId,
  providerId,
  amount,
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
            title: "Payment Confirmed",
            body:
              `Your payment of ₱${amount.toLocaleString()} ` +
              "has been confirmed",
          },
          data: {
            type: "PAYMENT_CONFIRMED",
            bookingId: bookingId,
            amount: amount.toString(),
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
            title: "Payment Received",
            body: `You received ₱${amount.toLocaleString()} for your service`,
          },
          data: {
            type: "PAYMENT_RECEIVED",
            bookingId: bookingId,
            amount: amount.toString(),
          },
        };

        await admin.messaging().send(providerMessage);
      }
    }
  } catch (error) {
    console.error(
      `Error sending payment notifications for booking ${bookingId}:`,
      error,
    );
  }
}
