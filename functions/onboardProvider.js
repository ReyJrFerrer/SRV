const functions = require("firebase-functions");
const {Xendit} = require("xendit-node");
const admin = require("firebase-admin");

// Initialize Xendit client
const xendit = new Xendit({
  secretKey: functions.config().xendit.secret_key,
});

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function to onboard a provider with Xendit sub-account
 * Creates a Xendit sub-account for a provider to receive direct payments
 */
exports.onboardProvider = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to onboard provider",
      );
    }

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
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: providerId, gcashNumber, gcashName, email",
      );
    }

    // Validate GCash number format (should be 11 digits starting with 09)
    const gcashRegex = /^09\d{9}$/;
    if (!gcashRegex.test(gcashNumber)) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid GCash number format. Must be 11 digits starting with 09",
      );
    }

    // Create Xendit sub-account for the provider
    const subAccountData = {
      accountEmail: email,
      type: businessType,
      publicProfile: {
        businessName: businessName || `${gcashName} Services`,
      },
    };

    const subAccount = await xendit.Account.createSubAccount(subAccountData);

    // Create GCash disbursement account for the provider
    // Note: This data structure is prepared for future Xendit disbursement API
    // const disbursementAccountData = {
    //   channelCode: "PH_GCASH",
    //   channelProperties: {
    //     accountHolderName: gcashName,
    //     accountNumber: gcashNumber,
    //   },
    //   accountName: `${gcashName} GCash Account`,
    //   type: "BANK_ACCOUNT",
    //   country: "PH",
    //   currency: "PHP",
    // };

    // Set the sub-account context for disbursement account creation
    const disbursementAccount = await xendit.Customer.createPaymentMethod({
      customerId: subAccount.id,
      type: "EWALLET",
      ewallet: {
        channelCode: "GCASH",
        channelProperties: {
          mobileNumber: gcashNumber,
        },
      },
      metadata: {
        accountHolderName: gcashName,
        providerId: providerId,
      },
    });

    // Store provider onboarding data in Firestore
    const providerData = {
      providerId,
      xenditSubAccountId: subAccount.id,
      gcashNumber,
      gcashName,
      disbursementAccountId: disbursementAccount.id,
      businessName: businessName || `${gcashName} Services`,
      businessType,
      email,
      phoneNumber,
      onboardedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "ACTIVE",
    };

    await admin.firestore()
        .collection("providers")
        .doc(providerId)
        .set(providerData, {merge: true});

    // Log successful onboarding
    console.log(
        `Provider ${providerId} successfully onboarded with Xendit ` +
        `sub-account: ${subAccount.id}`,
    );

    return {
      success: true,
      subAccountId: subAccount.id,
      disbursementAccountId: disbursementAccount.id,
      message: "Provider successfully onboarded for payments",
    };
  } catch (error) {
    console.error("Error onboarding provider:", error);

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
        `Failed to onboard provider: ${error.message}`,
    );
  }
});
