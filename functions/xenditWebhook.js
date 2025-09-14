const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
    const callbackToken = functions.config().xendit.callback_token;
    const receivedSignature = req.headers["x-callback-token"];

    if (!receivedSignature || receivedSignature !== callbackToken) {
      console.error("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    const webhookData = req.body;
    console.log("Xendit webhook received:", JSON.stringify(webhookData));

    // Handle different webhook events
    switch (webhookData.status) {
      case "PAID":
        await handlePaidInvoice(webhookData);
        break;
      case "EXPIRED":
        await handleExpiredInvoice(webhookData);
        break;
      case "PENDING":
        await handlePendingInvoice(webhookData);
        break;
      default:
        console.log(`Unhandled webhook status: ${webhookData.status}`);
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
  const {id, external_id: externalId} = webhookData;

  try {
    // Determine if this is a direct payment or wallet top-up
    if (externalId.startsWith("topup-")) {
      await handleWalletTopupPaid(webhookData);
    } else if (externalId.startsWith("booking-")) {
      await handleDirectPaymentPaid(webhookData);
    } else {
      console.error(`Unknown external_id format: ${externalId}`);
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
  const {id, paid_amount: paidAmount} = webhookData;

  try {
    // Update top-up record
    await admin.firestore()
        .collection("topups")
        .doc(id)
        .update({
          status: "COMPLETED",
          paidAmount: paidAmount,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Get top-up details
    const topupDoc = await admin.firestore()
        .collection("topups")
        .doc(id)
        .get();

    if (!topupDoc.exists) {
      throw new Error(`Top-up record not found: ${id}`);
    }

    const topupData = topupDoc.data();
    const providerId = topupData.providerId;

    // Credit the provider's wallet via ICP canister
    // Note: This would typically call your ICP backend
    // For now, we'll store the transaction and let the frontend sync
    await admin.firestore()
        .collection("wallet_transactions")
        .add({
          providerId,
          type: "CREDIT",
          amount: paidAmount,
          description: `Wallet top-up via Xendit: ${id}`,
          invoiceId: id,
          status: "COMPLETED",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Send push notification
    await sendTopupNotification(providerId, paidAmount);

    console.log(
        `Wallet top-up completed for provider ${providerId}: ₱${paidAmount}`,
    );
  } catch (error) {
    console.error(`Error handling wallet top-up ${id}:`, error);
    throw error;
  }
}

/**
 * Handle direct payment completion
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handleDirectPaymentPaid(webhookData) {
  const {id, paid_amount: paidAmount} = webhookData;

  try {
    // Update payment record
    await admin.firestore()
        .collection("payments")
        .doc(id)
        .update({
          status: "COMPLETED",
          paidAmount: paidAmount,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Get payment details
    const paymentDoc = await admin.firestore()
        .collection("payments")
        .doc(id)
        .get();

    if (!paymentDoc.exists) {
      throw new Error(`Payment record not found: ${id}`);
    }

    const paymentData = paymentDoc.data();
    const {bookingId, providerId, clientId} = paymentData;

    // Update booking status to PAID
    await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .update({
          paymentStatus: "PAID",
          paidAmount: paidAmount,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Call ICP canister to confirm digital payment
    // Note: This would typically make a call to your ICP backend
    // For now, we'll store the confirmation and let the backend sync
    await admin.firestore()
        .collection("payment_confirmations")
        .add({
          bookingId,
          providerId,
          clientId,
          invoiceId: id,
          amount: paidAmount,
          paymentMethod: "DIGITAL",
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Send notifications to both client and provider
    await sendPaymentNotifications(bookingId, clientId, providerId, paidAmount);

    console.log(
        `Direct payment completed for booking ${bookingId}: ₱${paidAmount}`,
    );
  } catch (error) {
    console.error(`Error handling direct payment ${id}:`, error);
    throw error;
  }
}

/**
 * Handle expired invoice
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handleExpiredInvoice(webhookData) {
  const {id, external_id: externalId} = webhookData;

  try {
    if (externalId.startsWith("topup-")) {
      await admin.firestore()
          .collection("topups")
          .doc(id)
          .update({
            status: "EXPIRED",
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          });
    } else if (externalId.startsWith("booking-")) {
      await admin.firestore()
          .collection("payments")
          .doc(id)
          .update({
            status: "EXPIRED",
            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          });

      // Also update the booking
      const paymentDoc = await admin.firestore()
          .collection("payments")
          .doc(id)
          .get();

      if (paymentDoc.exists) {
        const paymentData = paymentDoc.data();
        await admin.firestore()
            .collection("bookings")
            .doc(paymentData.bookingId)
            .update({
              paymentStatus: "EXPIRED",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
 * Handle pending invoice status
 * @param {Object} webhookData - Webhook data from Xendit
 */
async function handlePendingInvoice(webhookData) {
  const {id, external_id: externalId} = webhookData;

  try {
    if (externalId.startsWith("topup-")) {
      await admin.firestore()
          .collection("topups")
          .doc(id)
          .update({
            status: "PENDING",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
    } else if (externalId.startsWith("booking-")) {
      await admin.firestore()
          .collection("payments")
          .doc(id)
          .update({
            status: "PENDING",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
    }

    console.log(`Invoice pending: ${id}`);
  } catch (error) {
    console.error(`Error handling pending invoice ${id}:`, error);
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
    const providerDoc = await admin.firestore()
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
    const clientDoc = await admin.firestore()
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
            body: `Your payment of ₱${amount.toLocaleString()} ` +
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
    const providerDoc = await admin.firestore()
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
