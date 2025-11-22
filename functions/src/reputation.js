/**
 * Reputation Bridge Cloud Function
 *
 * This function serves as the bridge between Firebase backend and the Internet Computer
 * reputation canister. It handles all reputation-related operations including initialization,
 * updates, and review processing with AI-powered sentiment analysis.
 *
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { HttpAgent, Actor } = require("@dfinity/agent");
const { Principal } = require("@dfinity/principal");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  if (process.env.FUNCTIONS_EMULATOR) {
    admin.initializeApp({
      projectId: "devsrv-rey",
    });
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

/**
 * Load IDL factory from declarations
 * @return {Function} The IDL factory function
 */
function loadReputationIdlFactory() {
  try {
    const declarationsPath = path.resolve(
      __dirname,
      "../../src/declarations/reputation/reputation.did.js",
    );

    if (fs.existsSync(declarationsPath)) {
      console.log("Reputation declarations found, loading IDL factory...");
      const { idlFactory } = require(declarationsPath);
      return idlFactory;
    }

    console.log("Reputation declarations not found, using manual IDL...");
    return getManualReputationIdl();
  } catch (error) {
    console.error("Failed to load reputation declarations, using manual IDL:", error.message);
    return getManualReputationIdl();
  }
}

/**
 * Manual IDL definition for reputation canister
 * @return {Function} The IDL factory function
 */
function getManualReputationIdl() {
  return ({ IDL }) => {
    const TrustLevel = IDL.Variant({
      New: IDL.Null,
      Low: IDL.Null,
      Medium: IDL.Null,
      High: IDL.Null,
      VeryHigh: IDL.Null,
    });

    const DetectionFlag = IDL.Variant({
      ReviewBomb: IDL.Null,
      CompetitiveManipulation: IDL.Null,
      FakeEvidence: IDL.Null,
      IdentityFraud: IDL.Null,
      Other: IDL.Null,
    });

    const ReputationScore = IDL.Record({
      userId: IDL.Principal,
      trustScore: IDL.Float64,
      trustLevel: TrustLevel,
      completedBookings: IDL.Nat,
      averageRating: IDL.Opt(IDL.Float64),
      detectionFlags: IDL.Vec(DetectionFlag),
      lastUpdated: IDL.Int,
    });

    const ReviewStatus = IDL.Variant({
      Visible: IDL.Null,
      Hidden: IDL.Null,
      Flagged: IDL.Null,
    });

    const Review = IDL.Record({
      id: IDL.Text,
      bookingId: IDL.Text,
      clientId: IDL.Principal,
      providerId: IDL.Principal,
      serviceId: IDL.Text,
      rating: IDL.Nat,
      comment: IDL.Text,
      status: ReviewStatus,
      qualityScore: IDL.Opt(IDL.Float64),
      createdAt: IDL.Int,
      updatedAt: IDL.Int,
    });

    const ReputationResult = IDL.Variant({ ok: ReputationScore, err: IDL.Text });
    const ReviewResult = IDL.Variant({ ok: Review, err: IDL.Text });

    return IDL.Service({
      initializeReputation: IDL.Func(
        [IDL.Principal, IDL.Int],
        [ReputationResult],
        [],
      ),
      updateUserReputation: IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReputationResult],
        [],
      ),
      updateProviderReputation: IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReputationResult],
        [],
      ),
      processReview: IDL.Func(
        [Review, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReviewResult],
        [],
      ),
      processReviewWithLLM: IDL.Func(
        [Review, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReviewResult],
        [],
      ),
      processProviderReview: IDL.Func(
        [Review, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReviewResult],
        [],
      ),
      processProviderReviewWithLLM: IDL.Func(
        [Review, IDL.Nat, IDL.Opt(IDL.Float64), IDL.Int],
        [ReviewResult],
        [],
      ),
      getReputationScore: IDL.Func([IDL.Principal], [ReputationResult], ["query"]),
      deductReputationForCancellation: IDL.Func(
        [IDL.Principal],
        [ReputationResult],
        [],
      ),
      setUserReputation: IDL.Func(
        [IDL.Principal, IDL.Nat],
        [IDL.Variant({ ok: IDL.Text, err: IDL.Text })],
        [],
      ),
    });
  };
}

/**
 * Environment detection
 * @return {string} The detected environment
 */
function detectEnvironment() {
  // Check explicit environment variable first
  if (process.env.ICP_ENVIRONMENT) {
    console.log(`Using ICP_ENVIRONMENT: ${process.env.ICP_ENVIRONMENT}`);
    return process.env.ICP_ENVIRONMENT;
  }

  // Check if running in Firebase Functions emulator
  if (
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.NODE_ENV === "development"
  ) {
    return "local";
  }

  // Check for production IC environment
  if (
    process.env.DFX_NETWORK === "ic" ||
    process.env.ENVIRONMENT === "production"
  ) {
    return "ic";
  }

  // Check for playground environment
  if (
    process.env.DFX_NETWORK === "playground" ||
    process.env.ENVIRONMENT === "playground"
  ) {
    return "playground";
  }

  // If deployed to Firebase (not in emulator) but no environment set, default to playground
  // This is the case when functions are deployed to Firebase Cloud Functions
  if (process.env.FUNCTION_NAME || process.env.K_SERVICE) {
    console.log("No environment detected, defaulting to playground");
    return "playground";
  }

  // Default to local for development
  console.log("No environment detected, defaulting to local");
  return "local";
}

// Canister ID mappings for different environments
const CANISTER_IDS = {
  local: {
    reputation: "u6s2n-gx777-77774-qaaba-cai",
  },
  ic: {
    reputation: process.env.CANISTER_ID_REPUTATION,
  },
  playground: {
    reputation: process.env.CANISTER_ID_REPUTATION,
  },
};

// Host URLs for different environments
const HOSTS = {
  local: "http://127.0.0.1:4943",
  ic: `https://id.ai`,
  playground: `https://id.ai`,
};

/**
 * Get canister configuration for current environment
 * @return {Object} The canister configuration
 */
function getCanisterConfig() {
  const environment = detectEnvironment();

  const config = {
    environment,
    host: HOSTS[environment],
    canisterIds: CANISTER_IDS[environment],
    fetchRootKey: environment === "local",
  };

  console.log(`Canister config for environment: ${environment}`, {
    host: config.host,
    reputationCanisterId: config.canisterIds.reputation,
    fetchRootKey: config.fetchRootKey,
  });

  return config;
}

// Load the IDL factory
const reputationIdlFactory = loadReputationIdlFactory();

/**
 * Creates a reputation actor to communicate with the IC canister
 * @return {Object} Reputation actor instance
 */
async function createReputationActor() {
  const config = getCanisterConfig();
  const agent = new HttpAgent({ host: config.host });

  // Fetch root key for local development
  if (config.fetchRootKey) {
    try {
      await agent.fetchRootKey();
      console.log("Root key fetched successfully for local development");
    } catch (err) {
      console.error("Failed to fetch root key:", err.message);
      throw err;
    }
  }

  const canisterId = config.canisterIds.reputation;
  if (!canisterId) {
    throw new Error(
      `Reputation canister ID not found for ${config.environment} environment. ` +
      `Please set CANISTER_ID_REPUTATION environment variable.`,
    );
  }

  console.log(`Creating reputation actor for canister: ${canisterId}`);

  return Actor.createActor(reputationIdlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Convert ISO timestamp to nanoseconds (IC Time format)
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @return {bigint} Nanoseconds since epoch
 */
function isoToNanoseconds(isoTimestamp) {
  const milliseconds = new Date(isoTimestamp).getTime();
  return BigInt(milliseconds) * BigInt(1000000);
}

/**
 * Fetch user data from Firestore
 * @param {string} userId - User principal as text
 * @return {Promise<Object>} User data including completed bookings and ratings
 */
async function fetchUserData(userId) {
  try {
    // Get user profile
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const accountAge = isoToNanoseconds(userData.createdAt || new Date().toISOString());

    // Get completed bookings count
    const bookingsSnapshot = await db.collection("bookings")
      .where("clientId", "==", userId)
      .where("status", "==", "Completed")
      .get();

    const completedBookings = bookingsSnapshot.size;

    // Get average rating from reviews given by this user
    const reviewsSnapshot = await db.collection("reviews")
      .where("clientId", "==", userId)
      .get();

    let totalRating = 0;
    let ratingCount = 0;

    reviewsSnapshot.forEach((doc) => {
      const review = doc.data();
      if (review.rating) {
        totalRating += review.rating;
        ratingCount++;
      }
    });

    const averageRating = ratingCount > 0 ? totalRating / ratingCount : null;

    return {
      completedBookings,
      averageRating,
      accountAge,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

/**
 * Fetch provider data from Firestore
 * @param {string} providerId - Provider principal as text
 * @return {Promise<Object>} Provider data including completed bookings and ratings
 */
async function fetchProviderData(providerId) {
  try {
    // Get provider profile
    const userRef = db.collection("users").doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("Provider not found");
    }

    const userData = userDoc.data();
    const accountAge = isoToNanoseconds(userData.createdAt || new Date().toISOString());

    // Get completed bookings count as provider
    const bookingsSnapshot = await db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("status", "==", "Completed")
      .get();

    const completedBookings = bookingsSnapshot.size;

    // Get average rating from reviews received by this provider
    const reviewsSnapshot = await db.collection("reviews")
      .where("providerId", "==", providerId)
      .get();

    let totalRating = 0;
    let ratingCount = 0;

    reviewsSnapshot.forEach((doc) => {
      const review = doc.data();
      if (review.rating) {
        totalRating += review.rating;
        ratingCount++;
      }
    });

    const averageRating = ratingCount > 0 ? totalRating / ratingCount : null;

    return {
      completedBookings,
      averageRating,
      accountAge,
    };
  } catch (error) {
    console.error("Error fetching provider data:", error);
    throw error;
  }
}

/**
 * Internal function to initialize reputation
 * Can be called directly from other cloud functions
 * @param {string} userId - User principal as text
 * @param {string} creationTime - ISO timestamp of user creation
 * @return {Promise<Object>} Result object
 */
async function initializeReputationInternal(userId, creationTime) {
  console.log("initializeReputationInternal called");
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(userId);

    // Convert ISO timestamp to nanoseconds
    const creationTimeNs = creationTime ?
      isoToNanoseconds(creationTime) :
      BigInt(Date.now()) * BigInt(1000000);

    console.log("Creating reputation actor...");
    const result = await reputationActor.initializeReputation(
      principal,
      creationTimeNs,
    );

    if ("ok" in result) {
      console.log("Reputation initialized successfully");
      return {
        success: true,
        data: result.ok,
        message: "Reputation initialized successfully",
      };
    } else {
      console.error("Failed to initialize reputation:", result.err);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Error initializing reputation:", error);
    throw error;
  }
}

/**
 * Initialize reputation for a new user
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.initializeReputation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const { userId, creationTime } = payload;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required",
    );
  }

  try {
    const result = await initializeReputationInternal(userId, creationTime);
    return result;
  } catch (error) {
    console.error("Error initializing reputation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Export the internal function for use by other cloud functions
exports.initializeReputationInternal = initializeReputationInternal;

/**
 * Internal function to update user reputation
 * Can be called directly from other cloud functions
 * @param {string} userId - User principal as text
 * @return {Promise<Object>} Result object
 */
async function updateUserReputationInternal(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // 1. Fetch all necessary data from Firestore
    const userData = await fetchUserData(userId);

    // 2. Get the reputation actor
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(userId);

    // 3. Call canister with fetched data
    const result = await reputationActor.updateUserReputation(
      principal,
      userData.completedBookings,
      userData.averageRating ? [userData.averageRating] : [],
      userData.accountAge,
    );

    if ("ok" in result) {
      console.log("User reputation updated successfully");
      return {
        success: true,
        data: result.ok,
        message: "User reputation updated successfully",
      };
    } else {
      console.error("Failed to update user reputation:", result.err);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Error updating user reputation:", error);
    throw error;
  }
}

/**
 * Internal function to update provider reputation
 * Can be called directly from other cloud functions
 * @param {string} providerId - Provider principal as text
 * @return {Promise<Object>} Result object
 */
async function updateProviderReputationInternal(providerId) {
  console.log("updateProviderReputationInternal called");
  if (!providerId) {
    throw new Error("Provider ID is required");
  }

  try {
    // 1. Fetch all necessary data from Firestore
    const providerData = await fetchProviderData(providerId);

    // 2. Get the reputation actor
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(providerId);

    // 3. Call canister with fetched data
    const result = await reputationActor.updateProviderReputation(
      principal,
      providerData.completedBookings,
      providerData.averageRating ? [providerData.averageRating] : [],
      providerData.accountAge,
    );

    if ("ok" in result) {
      return {
        success: true,
        data: result.ok,
        message: "Provider reputation updated successfully",
      };
    } else {
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Error updating provider reputation:", error);
    throw error;
  }
}

/**
 * Internal function to process review for reputation
 * Can be called directly from other cloud functions
 * @param {Object} review - Review object
 * @param {boolean} useLLM - Whether to use LLM for processing
 * @return {Promise<Object>} Result object
 */
async function processReviewForReputationInternal(review, useLLM = false) {
  if (!review || !review.id) {
    throw new Error("Review object with ID is required");
  }

  try {
    const reputationActor = await createReputationActor();

    // Check if this is a provider-to-client review
    const isProviderReview = review.reviewType === "ProviderToClient";

    // Fetch appropriate user data based on review type
    let clientData;
    let providerData;

    if (isProviderReview) {
      // For provider reviews, we need provider data (the reviewer)
      providerData = await fetchProviderData(review.providerId);
    } else {
      // For regular reviews, we need client data (the reviewer)
      clientData = await fetchUserData(review.clientId);
    }

    // Prepare review for IC canister
    const icReview = {
      id: review.id,
      bookingId: review.bookingId,
      clientId: Principal.fromText(review.clientId),
      providerId: Principal.fromText(review.providerId),
      serviceId: review.serviceId,
      rating: BigInt(review.rating),
      comment: review.comment,
      status: { Visible: null },
      qualityScore: review.qualityScore ? [review.qualityScore] : [],
      createdAt: isoToNanoseconds(review.createdAt),
      updatedAt: isoToNanoseconds(review.updatedAt),
    };

    // Process review with or without LLM based on flag
    let result;
    if (useLLM) {
      if (isProviderReview) {
        // Process provider review - updates provider's reputation (the reviewer)
        // This tracks if the provider is trustworthy when rating clients
        result = await reputationActor.processProviderReviewWithLLM(
          icReview,
          BigInt(providerData.completedBookings),
          providerData.averageRating ? [providerData.averageRating] : [],
          providerData.accountAge,
        );
      } else {
        // Process regular review (client rating provider)
        // Updates client's reputation (the reviewer)
        result = await reputationActor.processReviewWithLLM(
          icReview,
          BigInt(clientData.completedBookings),
          clientData.averageRating ? [clientData.averageRating] : [],
          clientData.accountAge,
        );
      }
    } else {
      if (isProviderReview) {
        // Process provider review - updates provider's reputation (the reviewer)
        // This tracks if the provider is trustworthy when rating clients
        result = await reputationActor.processProviderReview(
          icReview,
          BigInt(providerData.completedBookings),
          providerData.averageRating ? [providerData.averageRating] : [],
          providerData.accountAge,
        );
      } else {
        // Process regular review (client rating provider)
        // Updates client's reputation (the reviewer)
        result = await reputationActor.processReview(
          icReview,
          BigInt(clientData.completedBookings),
          clientData.averageRating ? [clientData.averageRating] : [],
          clientData.accountAge,
        );
      }
    }

    if ("ok" in result) {
      return { success: true, data: result.ok };
    } else {
      throw new Error(`Failed to process review: ${result.err}`);
    }
  } catch (error) {
    console.error("Error in processReviewForReputationInternal:", error);
    throw error;
  }
}

/**
 * Update a user's (client's) reputation score
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.updateUserReputation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const { userId } = payload;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required",
    );
  }

  try {
    const result = await updateUserReputationInternal(userId);
    return result;
  } catch (error) {
    console.error("Error updating user reputation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Export the internal function for use by other cloud functions
exports.updateUserReputationInternal = updateUserReputationInternal;

/**
 * Update a service provider's reputation score
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.updateProviderReputation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const { providerId } = payload;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required",
    );
  }

  try {
    const result = await updateProviderReputationInternal(providerId);
    return result;
  } catch (error) {
    console.error("Error updating provider reputation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Export the internal function for use by other cloud functions
exports.updateProviderReputationInternal = updateProviderReputationInternal;

/**
 * Deduct reputation points for a user who cancelled a booking
 * @param {string} userId - The ID of the user who cancelled the booking
 * @returns {Promise<Object>} Result of the reputation deduction
 */
const deductReputationForCancellationInternal = async (userId) => {
  try {
    const actor = await createReputationActor();
    const result = await actor.deductReputationForCancellation(Principal.fromText(userId));

    if ("ok" in result) {
      return {
        success: true,
        data: {
          userId: result.ok.userId.toString(),
          trustScore: result.ok.trustScore,
          trustLevel: result.ok.trustLevel,
          lastUpdated: new Date(Number(result.ok.lastUpdated / BigInt(1000000))).toISOString(),
        },
      };
    } else {
      throw new Error(result.err || "Failed to deduct reputation points");
    }
  } catch (error) {
    console.error("Error in deductReputationForCancellationInternal:", error);
    throw error;
  }
};

/**
 * Deduct reputation points for a user who cancelled a booking
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.deductReputationForCancellation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const { userId } = payload;

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required",
    );
  }

  try {
    const result = await deductReputationForCancellationInternal(userId);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error deducting reputation for cancellation:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to deduct reputation points",
      error,
    );
  }
});

// Export the internal function for use in other cloud functions
exports.deductReputationForCancellationInternal = deductReputationForCancellationInternal;

/**
 * Process a review and update reputations for both client and provider
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.processReviewForReputation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const { review, useLLM = false } = payload;

  if (!review || !review.id) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review object is required",
    );
  }

  try {
    const result = await processReviewForReputationInternal(review, useLLM);
    return result;
  } catch (error) {
    console.error("Error processing review for reputation:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Export the internal function for use by other cloud functions
exports.processReviewForReputationInternal = processReviewForReputationInternal;

/**
 * Internal function to check the user reputation
 * Can be called directly from other cloud functions
 * @param {string} userId -  User principal as text
 * @return {Promise<Object>} Result object
 */
async function checkUserReputationInternal(userId) {
  try {
    // Check in IC canister
    console.log("Checking user reputation...");
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(userId);

    const result = await reputationActor.getReputationScore(principal);

    console.log("Reputation result", result);

    if ("ok" in result) {
      console.log("User reputation checked successfully");
      return {
        success: true,
        data: {
          trustScore: Number(result.ok.trustScore),
          trustLevel: result.ok.trustLevel?.toString(),
          completedBookings: Number(result.ok.completedBookings),
        },
      };
    } else {
      console.error("Failed to get reputation from canister:", result.err);
      return {
        success: false,
        error: result.err || "Failed to get reputation from canister",
        data: {
          trustScore: 50,
          trustLevel: "New",
          completedBookings: 0,
        },
      };
    }
  } catch (error) {
    console.error("Error in checkUserReputationInternal:", error);
    return {
      success: false,
      error: error.message || "Error checking reputation",
      data: {
        trustScore: 50,
        trustLevel: "New",
        completedBookings: 0,
      },
    };
  }
}

exports.checkUserReputationInternal = checkUserReputationInternal;

// Export helper functions for use in other modules
exports.getManualReputationIdl = getManualReputationIdl;
exports.getCanisterConfig = getCanisterConfig;
exports.createReputationActor = createReputationActor;
