const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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
 * Get payment/booking data from Firestore using invoice ID
 * This retrieves the booking data that was stored when the invoice was created
 */
exports.getPaymentData = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { invoiceId } = req.body.data;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: "Invoice ID is required",
      });
    }

    console.log(`🔍 Fetching payment data for invoice: ${invoiceId}`);

    const db = admin.firestore();
    
    // Get the payment document from Firestore
    const paymentDoc = await db.collection("payments").doc(invoiceId).get();
    
    if (!paymentDoc.exists) {
      console.log(`❌ Payment document not found for invoice: ${invoiceId}`);
      return res.status(404).json({
        success: false,
        error: "Payment data not found",
      });
    }

    const paymentData = paymentDoc.data();
    console.log(`✅ Payment data found for invoice: ${invoiceId}`);

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
    console.error("❌ Error fetching payment data:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});
