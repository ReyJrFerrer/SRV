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
 * Cloud Function to create wallet top-up invoice
 * Generates a Xendit Invoice for wallet top-ups using Invoice API
 */
exports.createTopupInvoice = functions.https.onRequest(async (req, res) => {
  console.log("=== createTopupInvoice function started ===");
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
      providerId,
      amount,
      paymentMethods = ["GCASH", "PAYMAYA", "GRABPAY"],
    } = data;

    console.log("Extracted fields:", {
      providerId,
      amount,
      paymentMethods,
    });

    // Validate required fields
    if (!providerId || !amount) {
      console.log("Missing required fields");
      return res.status(400).json({
        error: "Missing required fields: providerId, amount",
      });
    }

    // Validate amount (minimum top-up amount)
    const minTopupAmount = 100; // Minimum ₱100
    const maxTopupAmount = 50000; // Maximum ₱50,000

    if (amount < minTopupAmount || amount > maxTopupAmount) {
      console.log("Invalid amount range");
      return res.status(400).json({
        error: `Top-up amount must be between ₱${minTopupAmount} and ₱${maxTopupAmount}`,
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

    // Get provider info to validate they exist
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
            // Set defaults for missing data
            businessName:
              xenditCustomer.metadata?.business_name || "Provider Business",
            email: xenditCustomer.email || "provider@srv.com",
            mobileNumber: xenditCustomer.mobileNumber || "09000000000",
            name:
              xenditCustomer.metadata?.business_name ||
              `${xenditCustomer.individualDetail?.givenNames || "Provider"} ${xenditCustomer.individualDetail?.surname || ""}`.trim(),
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
          id: `invoice_mock_topup_${Date.now()}`,
          externalId: invoiceData.externalId,
          amount: invoiceData.amount,
          invoiceUrl: `https://checkout.xendit.co/web/mock-topup-${Date.now()}`,
          expiryDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          status: "PENDING",
          currency: "PHP",
          description: invoiceData.description,
          created: new Date().toISOString(),
        };

        console.log("Mock invoice created for development:", invoice.id);
      } else {
        return res.status(500).json({
          error: "Failed to create top-up invoice",
          details: xenditError.message,
          validation_errors:
            (xenditError.response &&
              xenditError.response.data &&
              xenditError.response.data.errors) ||
            [],
        });
      }
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
      `Wallet top-up invoice created for provider ${providerId}: ${invoice.id}`,
    );

    return res.status(200).json({
      result: {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoiceUrl, // Changed from paymentUrl to invoiceUrl
        expiryDate: invoice.expiryDate,
        amount: amount,
        message: "Top-up invoice created successfully",
      },
    });
  } catch (error) {
    console.error("=== Error in createTopupInvoice ===");
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
        error: `Failed to create top-up invoice: ${error.message}`,
      },
    });
  }
});
