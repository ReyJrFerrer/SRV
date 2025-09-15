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
 * Cloud Function to create wallet top-up invoice
 * Generates a Xendit Invoice for wallet top-ups using Invoice API
 */
exports.createTopupInvoice = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create top-up invoice",
      );
    }

    const {
      providerId,
      amount,
      paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"],
    } = data;

    // Validate required fields
    if (!providerId || !amount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: providerId, amount",
      );
    }

    // Validate amount (minimum top-up amount)
    const minTopupAmount = 100; // Minimum ₱100
    const maxTopupAmount = 50000; // Maximum ₱50,000

    if (amount < minTopupAmount || amount > maxTopupAmount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Top-up amount must be between ₱${minTopupAmount} and ` +
          `₱${maxTopupAmount}`,
      );
    }

    // Check if Xendit client is initialized
    if (!xendit) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Xendit client not initialized",
      );
    }

    // Get provider info to validate they exist
    let providerData;
    try {
      const providerDoc = await admin
        .firestore()
        .collection("providers")
        .doc(providerId)
        .get();

      if (!providerDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Provider not found");
      }

      providerData = providerDoc.data();
    } catch (firestoreError) {
      console.error("Error fetching provider data:", firestoreError);
      // Continue with minimal data if Firestore fails
      providerData = {
        gcashName: "Provider",
        email: "provider@srv.com",
        gcashNumber: "09000000000",
      };
    }

    // Create top-up invoice using Invoice API
    const { Invoice } = xendit;
    const invoiceData = {
      externalId: `topup-${providerId}-${Date.now()}`,
      amount: amount,
      description: `SRV Wallet Top-up - ₱${amount.toLocaleString()}`,
      invoiceDuration: 3600, // 1 hour expiry
      currency: "PHP",
      reminderTime: 1,
      customer: {
        givenNames: (providerData.gcashName || "Provider").split(" ")[0],
        surname:
          (providerData.gcashName || "Provider")
            .split(" ")
            .slice(1)
            .join(" ") || "User",
        email: providerData.email || "provider@srv.com",
        mobileNumber: providerData.phoneNumber || providerData.gcashNumber,
      },
      customerNotificationPreference: {
        invoiceCreated: ["whatsapp", "sms"],
        invoiceReminder: ["whatsapp", "sms"],
        invoicePaid: ["whatsapp", "sms"],
        invoiceExpired: ["whatsapp", "sms"],
      },
      paymentMethods: paymentMethods,
      metadata: {
        providerId: providerId,
        topupAmount: amount.toString(),
        type: "WALLET_TOPUP",
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

    // Store top-up record in Firestore
    const topupRecord = {
      providerId,
      invoiceId: invoice.id,
      externalId: invoice.externalId,
      amount,
      status: "PENDING",
      paymentUrl: invoice.invoiceUrl,
      expiryDate: new Date(invoice.expiryDate),
      createdAt: new Date().toISOString(),
      paymentType: "WALLET_TOPUP",
    };

    try {
      await admin
        .firestore()
        .collection("topups")
        .doc(invoice.id)
        .set(topupRecord);
      console.log("Top-up record saved to Firestore successfully");
    } catch (firestoreError) {
      console.error("Error saving to Firestore:", firestoreError);
      // Continue with success response even if Firestore fails
      // since the Xendit invoice was created successfully
    }

    // Log successful top-up invoice creation
    console.log(
      `Wallet top-up invoice created for provider ${providerId}: ` +
        `${invoice.id}`,
    );

    return {
      success: true,
      invoiceId: invoice.id,
      paymentUrl: invoice.invoiceUrl,
      expiryDate: invoice.expiryDate,
      amount: amount,
      message: "Top-up invoice created successfully",
    };
  } catch (error) {
    console.error("Error creating top-up invoice:", error);

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
      `Failed to create top-up invoice: ${error.message}`,
    );
  }
});
