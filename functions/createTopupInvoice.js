const functions = require("firebase-functions");
const {Xendit} = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client
const xendit = new Xendit({
  secretKey: functions.config().xendit.secret_key,
});

/**
 * Cloud Function to create wallet top-up invoice
 * Generates a standard Xendit invoice for wallet top-ups
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

    // Get provider info to validate they exist
    const providerDoc = await admin.firestore()
        .collection("providers")
        .doc(providerId)
        .get();

    if (!providerDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "Provider not found",
      );
    }

    const providerData = providerDoc.data();

    // Create top-up invoice
    const invoiceData = {
      externalId: `topup-${providerId}-${Date.now()}`,
      amount: amount,
      description: `SRV Wallet Top-up - ₱${amount.toLocaleString()}`,
      invoiceDuration: 3600, // 1 hour expiry
      currency: "PHP",
      reminderTime: 1,
      shouldSendEmail: false,
      paymentMethods: paymentMethods,
      customer: {
        givenNames: providerData.gcashName || "Provider",
        email: providerData.email,
        mobileNumber: providerData.phoneNumber || providerData.gcashNumber,
      },
      metadata: {
        providerId: providerId,
        topupAmount: amount.toString(),
        type: "WALLET_TOPUP",
      },
    };

    // Create the invoice
    const invoice = await xendit.Invoice.createInvoice(invoiceData);

    // Store top-up record in Firestore
    const topupRecord = {
      providerId,
      invoiceId: invoice.id,
      externalId: invoice.external_id,
      amount,
      status: "PENDING",
      paymentUrl: invoice.invoice_url,
      expiryDate: new Date(invoice.expiry_date),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentType: "WALLET_TOPUP",
    };

    await admin.firestore()
        .collection("topups")
        .doc(invoice.id)
        .set(topupRecord);

    // Log successful top-up invoice creation
    console.log(
        `Wallet top-up invoice created for provider ${providerId}: ` +
        `${invoice.id}`,
    );

    return {
      success: true,
      invoiceId: invoice.id,
      paymentUrl: invoice.invoice_url,
      expiryDate: invoice.expiry_date,
      amount: amount,
      message: "Top-up invoice created successfully",
    };
  } catch (error) {
    console.error("Error creating top-up invoice:", error);

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
        `Failed to create top-up invoice: ${error.message}`,
    );
  }
});
