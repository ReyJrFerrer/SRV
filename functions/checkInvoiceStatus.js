const {onCall} = require("firebase-functions/v2/https");
const {Xendit} = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client
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
    console.log(
      "Xendit client initialized successfully for invoice status check",
    );
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
 * Check the status of a Xendit invoice
 * This function fetches the current status of an invoice from Xendit
 */
exports.checkInvoiceStatus = onCall(async (request) => {
  console.log("=== checkInvoiceStatus function started ===");
  console.log("Request data:", request.data);

  try {
    const {invoiceId} = request.data;

    if (!invoiceId) {
      throw new Error("Invoice ID is required");
    }

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
        throw new Error("Invoice not found");
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

      // For development, we can simulate different statuses
      // In a real scenario, this would be "PAID" after webhook processing
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
    const {Invoice} = xendit;
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
        throw new Error("Invoice not found in Xendit or Firestore");
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
      paymentChannel: invoice.paymentChannel || "GCash", // Default to GCash for Xendit payments
      paymentMethod: invoice.paymentMethod,
      source: "xendit_api",
    };
  } catch (error) {
    console.error("❌ Error checking invoice status:", error);
    throw new Error(error.message || "Internal server error");
  }
});

