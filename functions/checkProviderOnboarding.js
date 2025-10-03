const functions = require("firebase-functions");
const { Xendit } = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client with proper error handling
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
 * Cloud Function to check if a provider is onboarded for direct payments
 */
exports.checkProviderOnboarding = functions.https.onRequest(
  async (req, res) => {
    console.log("=== checkProviderOnboarding function started ===");
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

    try {
      // Only accept GET and POST requests after handling OPTIONS
      if (!["GET", "POST"].includes(req.method)) {
        return res.status(405).json({ error: "Method not allowed" });
      }

      // Get providerId from query params (GET) or body (POST)
      const providerId =
        req.method === "GET"
          ? req.query.providerId
          : (req.body.data || req.body).providerId;

      // Validate required fields
      if (!providerId) {
        return res.status(400).json({
          error: "Missing required field: providerId",
        });
      }

      // Check if Xendit client is initialized
      if (!xendit) {
        console.warn("Xendit client not initialized, checking Firestore only");

        // Fallback to Firestore check only
        try {
          const providerDoc = await admin
            .firestore()
            .collection("providers")
            .doc(providerId)
            .get();

          const isOnboarded =
            providerDoc.exists &&
            providerDoc.data() &&
            providerDoc.data().status === "ACTIVE" &&
            providerDoc.data().xenditCustomerId;

          return res.status(200).json({
            result: {
              success: true,
              isOnboarded: isOnboarded,
              providerId: providerId,
              source: "firestore_only",
              details: isOnboarded
                ? {
                    xenditCustomerId:
                      providerDoc.data() && providerDoc.data().xenditCustomerId,
                    onboardedAt:
                      providerDoc.data() && providerDoc.data().onboardedAt,
                    payoutInfo:
                      providerDoc.data() && providerDoc.data().payoutInfo,
                  }
                : null,
            },
          });
        } catch (firestoreError) {
          console.error("Error checking Firestore:", firestoreError);
          return res.status(500).json({
            error: "Failed to check provider onboarding status",
          });
        }
      }

      let xenditCustomer = null;

      // Check Xendit Customer by reference ID
      try {
        const { Customer } = xendit;
        const customerResponse = await Customer.getCustomerByReferenceID({
          referenceId: providerId,
        });

        // Handle the response - it might be an array or a single customer
        if (
          customerResponse &&
          customerResponse.data &&
          customerResponse.data.length > 0
        ) {
          xenditCustomer = customerResponse.data[0];
        } else if (customerResponse && customerResponse.id) {
          xenditCustomer = customerResponse;
        }

        console.log("Xendit customer lookup result:", {
          providerId,
          found: !!xenditCustomer,
          customerId: xenditCustomer && xenditCustomer.id,
        });
      } catch (error) {
        console.error("Error checking Xendit customer:", error);

        // If it's a 404 error, the customer doesn't exist
        if (error.response && error.response.status === 404) {
          console.log(`No Xendit customer found for provider ${providerId}`);
        } else {
          console.error("Unexpected error from Xendit API:", error.message);
        }
      }

      // Check Firestore record as backup/additional verification
      let firestoreData = null;
      try {
        const providerDoc = await admin
          .firestore()
          .collection("providers")
          .doc(providerId)
          .get();

        if (providerDoc.exists) {
          firestoreData = providerDoc.data();
        }
      } catch (firestoreError) {
        console.error("Error checking Firestore:", firestoreError);
        // Continue without Firestore data
      }

      // Determine onboarding status
      const isXenditOnboarded = !!xenditCustomer;
      const isFirestoreOnboarded =
        firestoreData &&
        firestoreData.status === "ACTIVE" &&
        firestoreData.xenditCustomerId;

      // Provider is considered onboarded if they exist in both Xendit and Firestore
      // or if they exist in Xendit (primary source of truth)
      const isOnboarded = isXenditOnboarded || isFirestoreOnboarded;

      // Prepare response details
      const details = isOnboarded
        ? {
            xenditCustomerId:
              (xenditCustomer && xenditCustomer.id) ||
              (firestoreData && firestoreData.xenditCustomerId),
            xenditReferenceId:
              (xenditCustomer && xenditCustomer.referenceId) || providerId,
            onboardedAt:
              (firestoreData && firestoreData.onboardedAt) ||
              (xenditCustomer && xenditCustomer.created),
            payoutInfo: (firestoreData && firestoreData.payoutInfo) || {
              gcashNumber: firestoreData && firestoreData.gcashNumber,
              accountHolderName: firestoreData && firestoreData.gcashName,
              channelCode: "PH_GCASH",
            },
            verificationSources: {
              xendit: isXenditOnboarded,
              firestore: !!isFirestoreOnboarded,
            },
          }
        : null;

      // Log the result
      console.log(`Provider ${providerId} onboarding status:`, {
        isOnboarded,
        xenditFound: isXenditOnboarded,
        firestoreFound: !!isFirestoreOnboarded,
      });

      return res.status(200).json({
        result: {
          success: true,
          isOnboarded: isOnboarded,
          providerId: providerId,
          details: details,
        },
      });
    } catch (error) {
      console.error("Error checking provider onboarding:", error);

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
          error: `Failed to check provider onboarding: ${error.message}`,
        },
      });
    }
  },
);
