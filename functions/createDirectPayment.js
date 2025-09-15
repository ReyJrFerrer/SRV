const functions = require("firebase-functions");
const { Xendit } = require("xendit-node");
const { admin } = require("./firebase-admin");

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

/**
 * Cloud Function to create direct payment for booking
 * Generates a Xendit Invoice to collect payment from client
 * When paid, will trigger payout to provider's GCash
 */
exports.createDirectPayment = functions.https.onRequest(async (req, res) => {
  console.log("=== createDirectPayment function started ===");
  console.log("Request method:", req.method);
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      console.log("Invalid method, returning 405");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Enable CORS for local development
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      console.log("OPTIONS request, returning 200");
      return res.status(200).end();
    }

    console.log("Processing POST request...");
    const data = req.body.data || req.body;
    console.log("Extracted data:", JSON.stringify(data, null, 2));

    const {
      bookingId,
      clientId,
      providerId,
      amount,
      serviceTitle,
      category,
      bookingData, // New: receive full booking data
    } = req.body.data; // Fix category if it's an object
    const categoryStr =
      typeof category === "object"
        ? JSON.stringify(category)
        : String(category || "General");

    console.log("Extracted fields:", {
      bookingId,
      providerId,
      clientId,
      amount,
      serviceTitle,
      category: categoryStr,
    });

    // Validate required fields
    if (!bookingId || !providerId || !clientId || !amount) {
      console.log("Missing required fields");
      return res.status(400).json({
        error:
          "Missing required fields: bookingId, providerId, clientId, amount",
      });
    }

    // Check if Xendit client is initialized
    if (!xendit) {
      console.log("Xendit client not initialized");
      return res.status(500).json({
        error: "Xendit client not initialized",
      });
    }

    console.log("Xendit client is ready, proceeding with provider lookup...");

    // Get provider's onboarding info from Firestore
    let providerData;
    try {
      console.log("Attempting to connect to Firestore...");
      console.log("Admin apps:", admin.apps.length);
      console.log("Functions emulator env:", process.env.FUNCTIONS_EMULATOR);
      console.log(
        "Firestore host:",
        admin.firestore()._settings?.host || "default",
      );

      const providerDoc = await admin
        .firestore()
        .collection("providers")
        .doc(providerId)
        .get();

      console.log("Firestore query completed, checking if provider exists...");
      if (!providerDoc.exists) {
        console.log(
          "Provider document not found in Firestore, checking Xendit directly...",
        );

        // Fallback: Check if provider exists in Xendit Customer API
        try {
          const { Customer } = xendit;
          const customerResponse = await Customer.getCustomerByReferenceID({
            referenceId: providerId,
          });

          let xenditCustomer = null;
          if (
            customerResponse &&
            customerResponse.data &&
            customerResponse.data.length > 0
          ) {
            xenditCustomer = customerResponse.data[0];
          } else if (customerResponse && customerResponse.id) {
            xenditCustomer = customerResponse;
          }

          if (!xenditCustomer) {
            console.log("Provider not found in Xendit either");
            return res.status(404).json({
              error: "Provider not found or not onboarded for payments",
            });
          }

          console.log("Provider found in Xendit:", xenditCustomer.id);

          // Create a temporary provider data structure from Xendit data
          providerData = {
            xenditCustomerId: xenditCustomer.id,
            xenditReferenceId: xenditCustomer.referenceId,
            payoutInfo: {
              gcashNumber: xenditCustomer.metadata?.gcash_number || "Unknown",
              accountHolderName:
                xenditCustomer.metadata?.gcash_name ||
                `${xenditCustomer.individualDetail?.givenNames || "Provider"} ${xenditCustomer.individualDetail?.surname || ""}`.trim(),
              channelCode: "PH_GCASH",
            },
            // Set defaults for missing data
            businessName:
              xenditCustomer.metadata?.business_name || "Provider Business",
            email: xenditCustomer.email || "provider@srv.com",
            mobileNumber: xenditCustomer.mobileNumber || "09000000000",
          };

          console.log(
            "Created temporary provider data from Xendit:",
            JSON.stringify(providerData, null, 2),
          );
        } catch (xenditError) {
          console.error("Error checking Xendit for provider:", xenditError);
          return res.status(404).json({
            error: "Provider not found or not onboarded for payments",
          });
        }
      } else {
        providerData = providerDoc.data();
        console.log(
          "Provider data retrieved from Firestore:",
          JSON.stringify(providerData, null, 2),
        );
      }

      if (!providerData.xenditCustomerId || !providerData.payoutInfo) {
        console.log("Provider not properly onboarded");
        return res.status(400).json({
          error: "Provider not properly onboarded for direct payments",
        });
      }
    } catch (firestoreError) {
      console.error("=== Firestore Error ===");
      console.error("Error fetching provider data:", firestoreError);
      console.error("Error code:", firestoreError.code);
      console.error("Error message:", firestoreError.message);
      return res.status(500).json({
        result: {
          success: false,
          error: "Failed to fetch provider data from Firestore",
          details: firestoreError.message,
        },
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
    const commissionRate = categoryStr.includes("Cleaning") ? 0.035 : 0.05; // 3.5% or 5%
    const commissionAmount = Math.round(amount * commissionRate);
    const providerAmount = amount - commissionAmount;

    // Define payment methods for the invoice
    const paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"];

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
        category: categoryStr,
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

      // Check if it's a permission error and we're in development
      if (xenditError.status === 403 && process.env.FUNCTIONS_EMULATOR) {
        console.log(
          "Permission error in development mode, creating mock invoice...",
        );

        // Create a mock invoice for development
        invoice = {
          id: `invoice_mock_${Date.now()}`,
          externalId: invoiceData.externalId,
          amount: invoiceData.amount,
          invoiceUrl: `https://checkout.xendit.co/web/mock-${Date.now()}`,
          expiryDate: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          status: "PENDING",
          currency: "PHP",
          description: invoiceData.description,
          created: new Date().toISOString(),
        };

        console.log("Mock invoice created for development:", invoice.id);
      } else {
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
      // Add booking data if provided
      ...(bookingData && {
        serviceId: bookingData.serviceId,
        serviceTitle: bookingData.serviceName || serviceTitle,
        packages: bookingData.packages,
        bookingType: bookingData.bookingType,
        scheduledDate: bookingData.scheduledDate
          ? typeof bookingData.scheduledDate === "string"
            ? bookingData.scheduledDate
            : new Date(bookingData.scheduledDate).toISOString()
          : null,
        scheduledTime: bookingData.scheduledTime,
        location: bookingData.location,
        notes: bookingData.notes,
        amountToPay: bookingData.amountToPay,
        paymentMethod: bookingData.paymentMethod,
      }),
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
    console.error("=== Error in createDirectPayment ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Handle Xendit API errors
    if (
      error.response &&
      error.response.data &&
      error.response.data.error_code
    ) {
      console.error("Xendit API error:", error.response.data);
      return res.status(400).json({
        result: {
          success: false,
          error: `Xendit error: ${error.response.data.message}`,
        },
      });
    }

    // Handle other errors
    console.error("Returning 500 error");
    return res.status(500).json({
      result: {
        success: false,
        error: `Failed to create direct payment: ${error.message}`,
      },
    });
  }
});
