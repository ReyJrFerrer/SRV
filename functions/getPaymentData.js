const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure Firebase Admin is initialized
if (admin.apps.length === 0) {
  // Check if we're in the emulator environment
  if (process.env.FUNCTIONS_EMULATOR) {
    console.log("Running in emulator mode");
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
 * Get payment/booking data from Firestore using invoice ID
 * This retrieves the booking data that was stored when the invoice was created
 */
exports.getPaymentData = functions.https.onRequest(async (req, res) => {
  console.log("=== getPaymentData function started ===");
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

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const {invoiceId} = req.body.data;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: "Invoice ID is required",
      });
    }

    console.log(`Fetching payment data for invoice: ${invoiceId}`);

    const db = admin.firestore();

    // Get the payment document from Firestore
    const paymentDoc = await db.collection("payments").doc(invoiceId).get();

    if (!paymentDoc.exists) {
      console.log(`Payment document not found for invoice: ${invoiceId}`);
      return res.status(404).json({
        success: false,
        error: "Payment data not found",
      });
    }

    const paymentData = paymentDoc.data();
    console.log(`Payment data found for invoice: ${invoiceId}`);

    // Extract and format the booking data
    const bookingData = {
      serviceId: paymentData.serviceId,
      serviceName: paymentData.serviceTitle,
      providerId: paymentData.providerId,
      packages: paymentData.packages || [],
      totalPrice: paymentData.amount,
      bookingType: paymentData.bookingType,
      scheduledDate: paymentData.scheduledDate,
      scheduledTime: paymentData.scheduledTime,
      location: paymentData.location,
      notes: paymentData.notes,
      amountToPay: paymentData.amountToPay,
      paymentMethod: "GCash", // Since this is for GCash payments
    };

    return res.status(200).json({
      success: true,
      bookingData,
    });
  } catch (error) {
    console.error("Error fetching payment data:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

