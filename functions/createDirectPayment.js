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
exports.createDirectPayment = functions.https.onRequest(async (req, res) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Enable CORS for local development
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const data = req.body.data || req.body;

    const {
      bookingId,
      providerId,
      clientId,
      amount,
      serviceTitle,
      category,
      paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"],
    } = data;

    // Validate required fields
    if (!bookingId || !providerId || !clientId || !amount) {
      return res.status(400).json({
        error: "Missing required fields: bookingId, providerId, clientId, amount",
      });
    }

    // Check if Xendit client is initialized
    if (!xendit) {
      return res.status(500).json({
        error: "Xendit client not initialized",
      });
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
        return res.status(404).json({
          error: "Provider not found or not onboarded for payments",
        });
      }

      providerData = providerDoc.data();

      if (!providerData.xenditCustomerId || !providerData.payoutInfo) {
        return res.status(400).json({
          error: "Provider not properly onboarded for direct payments",
        });
      }
    } catch (firestoreError) {
      console.error("Error fetching provider data:", firestoreError);
      return res.status(500).json({
        error: "Failed to fetch provider data",
      });
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

    // Calculate commission and net amount for provider
    // This should ideally come from the commission canister
    const commissionRate = category === "Cleaning" ? 0.035 : 0.05; // 3.5% or 5%
    const commissionAmount = Math.round(amount * commissionRate);
    const providerAmount = amount - commissionAmount;

    // Create invoice to collect payment from client
    const { Invoice } = xendit;
    const invoiceData = {
      externalId: `booking-${bookingId}-${Date.now()}`,
      amount: amount,
      description: serviceTitle || `Payment for booking ${bookingId}`,
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
      fees: [
        {
          type: "SRV_COMMISSION",
          value: commissionAmount,
        },
      ],
      metadata: {
        bookingId: bookingId,
        providerId: providerId,
        clientId: clientId,
        providerAmount: providerAmount,
        commissionAmount: commissionAmount,
        serviceTitle: serviceTitle,
        category: category,
        payoutInfo: {
          xenditCustomerId: providerData.xenditCustomerId,
          gcashNumber: providerData.payoutInfo.gcashNumber,
          accountHolderName: providerData.payoutInfo.accountHolderName,
        },
      },
    };

    console.log("Creating Xendit invoice with data:", invoiceData);
    let invoice;
    try {
      invoice = await Invoice.createInvoice({
        data: invoiceData,
      });
      console.log("Xendit invoice created:", invoice.id);
    } catch (xenditError) {
      console.error("Xendit invoice creation error:", xenditError);
      console.error(
        "Error response:",
        xenditError.response && xenditError.response.data,
      );
      return res.status(500).json({
        error: "Failed to create payment invoice",
        details: xenditError.message,
        validation_errors:
          (xenditError.response &&
            xenditError.response.data &&
            xenditError.response.data.errors) ||
          [],
      });
    }

    // Store payment data in Firestore for tracking
    const paymentData = {
      bookingId,
      providerId,
      clientId,
      invoiceId: invoice.id,
      externalId: invoiceData.externalId,
      amount: amount,
      providerAmount: providerAmount,
      commissionAmount: commissionAmount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      xenditData: {
        invoiceUrl: invoice.invoiceUrl,
        expiryDate: invoice.expiryDate,
      },
    };

    try {
      await admin
        .firestore()
        .collection("payments")
        .doc(invoice.id)
        .set(paymentData);
      console.log("Payment data saved to Firestore successfully");
    } catch (firestoreError) {
      console.error("Error saving payment to Firestore:", firestoreError);
      // Continue with success response even if Firestore fails
      // since the invoice was created successfully
    }

    // Log successful invoice creation
    console.log(
      `Invoice ${invoice.id} created for booking ${bookingId}, amount: ₱${amount}`,
    );

    return res.status(200).json({
      result: {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl,
        externalId: invoiceData.externalId,
        amount: amount,
        providerAmount: providerAmount,
        commissionAmount: commissionAmount,
        expiryDate: invoice.expiryDate,
        paymentMethods: paymentMethods,
      },
    });
  } catch (error) {
    console.error("Error creating direct payment:", error);

    // Handle Xendit API errors
    if (
      error.response &&
      error.response.data &&
      error.response.data.error_code
    ) {
      return res.status(400).json({
        result: {
          success: false,
          error: `Xendit error: ${error.response.data.message}`,
        },
      });
    }

    // Handle other errors
    return res.status(500).json({
      result: {
        success: false,
        error: `Failed to create direct payment: ${error.message}`,
      },
    });
  }
});
