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
 * Cloud Function to create direct payment for booking
 * Generates a Xendit Invoice to collect payment from client
 * When paid, will trigger payout to provider's GCash
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
    if (
      !bookingId ||
      !providerId ||
      !clientId ||
      !amount ||
      !commissionAmount
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: bookingId, providerId, clientId, " +
          "amount, commissionAmount",
      );
    }

    // Check if Xendit client is initialized
    if (!xendit) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Xendit client not initialized",
      );
    }

    // Get provider's onboarding info from Firestore
    let providerData;
    try {
      const providerDoc = await admin
        .firestore()
        .collection("providers")
        .doc(providerId)
        .get();

      if (!providerDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Provider not found or not onboarded for payments",
        );
      }

      providerData = providerDoc.data();

      if (!providerData.xenditCustomerId || !providerData.payoutInfo) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Provider not properly onboarded for payments",
        );
      }
    } catch (firestoreError) {
      console.error("Error fetching provider data:", firestoreError);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to fetch provider data",
      );
    }

    // Get client info if available
    let clientData;
    try {
      const clientDoc = await admin
        .firestore()
        .collection("users")
        .doc(clientId)
        .get();

      clientData = clientDoc.exists ? clientDoc.data() : {};
    } catch (error) {
      console.warn("Could not fetch client data:", error);
      clientData = {};
    }

    // Calculate net amount for provider (total amount - commission)
    const providerAmount = amount - commissionAmount;

    // Create invoice to collect payment from client
    const { Invoice } = xendit;
    const invoiceData = {
      externalId: `booking-${bookingId}-${Date.now()}`,
      amount: amount,
      description: description || `Payment for booking ${bookingId}`,
      invoiceDuration: 86400, // 24 hours expiry for booking payments
      currency: "PHP",
      reminderTime: 1,
      customer: {
        givenNames: (clientData.name || "Client").split(" ")[0] || "Client",
        surname:
          (clientData.name || "Client").split(" ").slice(1).join(" ") || "User",
        email: clientData.email || "client@srv.com",
        mobileNumber: clientData.phoneNumber || "09000000000",
      },
      customerNotificationPreference: {
        invoiceCreated: ["whatsapp", "sms"],
        invoiceReminder: ["whatsapp", "sms"],
        invoicePaid: ["whatsapp", "sms"],
        invoiceExpired: ["whatsapp", "sms"],
      },
      paymentMethods: paymentMethods,
      metadata: {
        bookingId: bookingId,
        providerId: providerId,
        clientId: clientId,
        commissionAmount: commissionAmount.toString(),
        providerAmount: providerAmount.toString(),
        paymentType: "DIRECT_PAYMENT",
        providerGcash: providerData.payoutInfo.gcashNumber,
        providerName: providerData.payoutInfo.accountHolderName,
      },
    };

    console.log("Creating Xendit invoice with data:", invoiceData);
    let invoice;
    try {
      invoice = await Invoice.createInvoice({ data: invoiceData });
      console.log("Xendit invoice created:", invoice);
    } catch (xenditError) {
      console.error("Xendit invoice creation error:", xenditError);
      console.error(
        "Error response:",
        xenditError.response && xenditError.response.data,
      );
      console.error("Error details:", JSON.stringify(xenditError, null, 2));
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Failed to create Xendit invoice: ${xenditError.message}`,
      );
    }

    // Store payment record in Firestore
    const paymentRecord = {
      bookingId,
      providerId,
      clientId,
      invoiceId: invoice.id,
      externalId: invoice.externalId,
      amount,
      commissionAmount,
      providerAmount,
      status: "PENDING",
      paymentUrl: invoice.invoiceUrl,
      expiryDate: new Date(invoice.expiryDate),
      createdAt: new Date().toISOString(),
      paymentType: "DIRECT_PAYMENT",
      providerPayoutInfo: {
        gcashNumber: providerData.payoutInfo.gcashNumber,
        accountHolderName: providerData.payoutInfo.accountHolderName,
        channelCode: providerData.payoutInfo.channelCode,
      },
    };

    try {
      await admin
        .firestore()
        .collection("payments")
        .doc(invoice.id)
        .set(paymentRecord);

      // Update booking with payment info
      await admin.firestore().collection("bookings").doc(bookingId).update({
        paymentInvoiceId: invoice.id,
        paymentUrl: invoice.invoiceUrl,
        paymentStatus: "PENDING",
        updatedAt: new Date().toISOString(),
      });

      console.log("Payment record saved to Firestore successfully");
    } catch (firestoreError) {
      console.error("Error saving to Firestore:", firestoreError);
      // Continue with success response even if Firestore fails
      // since the Xendit invoice was created successfully
    }

    // Log successful payment creation
    console.log(
      `Direct payment created for booking ${bookingId}: ${invoice.id}`,
    );

    return {
      success: true,
      invoiceId: invoice.id,
      paymentUrl: invoice.invoiceUrl,
      expiryDate: invoice.expiryDate,
      amount: amount,
      commissionAmount: commissionAmount,
      providerAmount: providerAmount,
      message: "Payment invoice created successfully",
    };
  } catch (error) {
    console.error("Error creating direct payment:", error);

    // Re-throw Firebase HTTP errors
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Handle Xendit API errors
    if (
      error.response &&
      error.response.data &&
      error.response.data.error_code
    ) {
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
