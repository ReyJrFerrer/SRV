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
 * Cloud Function to onboard a provider with Xendit Customer
 * Creates a Xendit Customer record for a provider to receive payouts to GCash
 */
exports.onboardProvider = functions.https.onRequest(async (req, res) => {
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
      providerId,
      gcashNumber,
      gcashName,
      businessName,
      businessType = "INDIVIDUAL",
      email,
      phoneNumber,
    } = data;

    // Validate required fields
    if (!providerId || !gcashNumber || !gcashName || !email) {
      return res.status(400).json({
        error:
          "Missing required fields: " +
          "providerId, gcashNumber, gcashName, email",
      });
    }

    // Validate GCash number format (should be 11 digits starting with 09)
    const gcashRegex = /^09\d{9}$/;
    if (!gcashRegex.test(gcashNumber)) {
      return res.status(400).json({
        error:
          "Invalid GCash number format. " +
          "Must be 11 digits starting with 09",
      });
    }

    // Check if Xendit client is initialized
    if (!xendit) {
      return res.status(500).json({
        error: "Xendit client not initialized",
      });
    }

    // Create Xendit Customer for the provider
    const { Customer } = xendit;
    const customerData = {
      referenceId: providerId,
      type: "INDIVIDUAL",
      individualDetail: {
        givenNames: gcashName.split(" ")[0] || gcashName,
        surname: gcashName.split(" ").slice(1).join(" ") || "Provider",
      },
      email: email,
      mobileNumber: phoneNumber || gcashNumber,
      metadata: {
        provider_id: providerId,
        gcash_number: gcashNumber,
        business_name: businessName || `${gcashName} Services`,
        business_type: businessType,
      },
    };

    console.log("Creating Xendit customer with data:", customerData);
    let xenditCustomer;
    try {
      xenditCustomer = await Customer.createCustomer({
        data: customerData,
      });
      console.log("Xendit customer created:", xenditCustomer);
    } catch (xenditError) {
      console.error("Xendit customer creation error:", xenditError);
      console.error(
        "Error response:",
        xenditError.response && xenditError.response.data,
      );
      console.error("Error details:", JSON.stringify(xenditError, null, 2));
      return res.status(500).json({
        error: "Failed to create Xendit customer",
        details: xenditError.message,
        validation_errors:
          (xenditError.response &&
            xenditError.response.data &&
            xenditError.response.data.errors) ||
          [],
      });
    }

    // Store provider onboarding data in Firestore
    const providerData = {
      providerId,
      gcashNumber,
      gcashName,
      businessName: businessName || `${gcashName} Services`,
      businessType,
      email,
      phoneNumber: phoneNumber || gcashNumber,
      xenditCustomerId: xenditCustomer.id,
      xenditReferenceId: providerId,
      onboardedAt: new Date().toISOString(),
      status: "ACTIVE",
      payoutInfo: {
        gcashNumber: gcashNumber,
        accountHolderName: gcashName,
        channelCode: "PH_GCASH",
      },
    };

    try {
      await admin
        .firestore()
        .collection("providers")
        .doc(providerId)
        .set(providerData, { merge: true });
      console.log("Provider data saved to Firestore successfully");
    } catch (firestoreError) {
      console.error("Error saving to Firestore:", firestoreError);
      // Continue with success response even if Firestore fails
      // since the Xendit customer was created successfully
    }

    // Log successful onboarding
    console.log(
      `Provider ${providerId} successfully onboarded with Xendit customer`,
      xenditCustomer.id,
    );

    return res.status(200).json({
      result: {
        success: true,
        message: "Provider successfully onboarded for payments",
        providerId: providerId,
        xenditCustomerId: xenditCustomer.id,
        payoutChannelCode: "PH_GCASH",
      },
    });
  } catch (error) {
    console.error("Error onboarding provider:", error);

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
        error: `Failed to onboard provider: ${error.message}`,
      },
    });
  }
});
