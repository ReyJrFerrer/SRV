const functions = require("firebase-functions");
const {Xendit} = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client
const xendit = new Xendit({
  secretKey: functions.config().xendit.secret_key,
});

/**
 * Cloud Function to create direct payment with xenPlatform
 * Generates a xenPlatform invoice with automatic fee splitting
 */
exports.createDirectPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to create payment",
      );
    }

    const {
      bookingId,
      providerId,
      clientId,
      amount,
      description,
      commissionAmount,
      paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"],
    } = data;

    // Validate required fields
    if (!bookingId || !providerId || !clientId || !amount ||
        !commissionAmount) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: bookingId, providerId, clientId, " +
          "amount, commissionAmount",
      );
    }

    // Get provider's Xendit sub-account info from Firestore
    const providerDoc = await admin.firestore()
        .collection("providers")
        .doc(providerId)
        .get();

    if (!providerDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "Provider not found or not onboarded for payments",
      );
    }

    const providerData = providerDoc.data();
    const subAccountId = providerData.xenditSubAccountId;

    if (!subAccountId) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          "Provider not properly onboarded for payments",
      );
    }

    // Calculate net amount for provider (total amount - commission)
    const providerAmount = amount - commissionAmount;

    // Create invoice with fee splitting
    const invoiceData = {
      externalId: `booking-${bookingId}-${Date.now()}`,
      amount: amount,
      description: description || `Payment for booking ${bookingId}`,
      invoiceDuration: 3600, // 1 hour expiry
      currency: "PHP",
      reminderTime: 1,
      shouldSendEmail: false,
      paymentMethods: paymentMethods,
      fees: [
        {
          type: "XENPLATFORM",
          value: commissionAmount,
        },
      ],
      feeRule: {
        routes: [
          {
            unit: "FLAT",
            amount: providerAmount,
            flat_amount: providerAmount,
            currency: "PHP",
            destination: subAccountId,
          },
        ],
      },
      metadata: {
        bookingId: bookingId,
        providerId: providerId,
        clientId: clientId,
        commissionAmount: commissionAmount.toString(),
        providerAmount: providerAmount.toString(),
      },
    };

    // Create the invoice
    const invoice = await xendit.Invoice.createInvoice(invoiceData);

    // Store payment record in Firestore
    const paymentRecord = {
      bookingId,
      providerId,
      clientId,
      invoiceId: invoice.id,
      externalId: invoice.external_id,
      amount,
      commissionAmount,
      providerAmount,
      status: "PENDING",
      paymentUrl: invoice.invoice_url,
      expiryDate: new Date(invoice.expiry_date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentType: "DIRECT_PAYMENT",
    };

    await admin.firestore()
        .collection("payments")
        .doc(invoice.id)
        .set(paymentRecord);

    // Update booking with payment info
    await admin.firestore()
        .collection("bookings")
        .doc(bookingId)
        .update({
          paymentInvoiceId: invoice.id,
          paymentUrl: invoice.invoice_url,
          paymentStatus: "PENDING",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Log successful payment creation
    console.log(
        `Direct payment created for booking ${bookingId}: ${invoice.id}`,
    );

    return {
      success: true,
      invoiceId: invoice.id,
      paymentUrl: invoice.invoice_url,
      expiryDate: invoice.expiry_date,
      amount: amount,
      commissionAmount: commissionAmount,
      providerAmount: providerAmount,
      message: "Payment invoice created successfully",
    };
  } catch (error) {
    console.error("Error creating direct payment:", error);

    // Handle Xendit API errors
    if (error.response && error.response.data &&
        error.response.data.error_code) {
      throw new functions.https.HttpsError(
          "failed-precondition",
          `Xendit error: ${error.response.data.message}`,
      );
    }

    // Handle other errors
    throw new functions.https.HttpsError(
        "internal",
        `Failed to create direct payment: ${error.message}`,
    );
  }
});
