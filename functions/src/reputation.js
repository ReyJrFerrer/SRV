/**
 * Reputation Bridge Cloud Function
 *
 * This function serves as the bridge between Firebase backend and the Internet Computer
 * reputation canister. It handles all reputation-related operations including initialization,
 * updates, and review processing with AI-powered sentiment analysis.
 *
 * This is a critical component of the hybrid ICP-Firebase architecture.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {HttpAgent, Actor} = require("@dfinity/agent");
const {Principal} = require("@dfinity/principal");
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
      const {idlFactory} = require(declarationsPath);
      console.log("✅ Reputation IDL factory loaded from declarations");
      return idlFactory;
    }

    console.warn("⚠️ Reputation declarations not found, using manual IDL definition");
    return getManualReputationIdl();
  } catch (error) {
    console.warn(
      "⚠️ Failed to load reputation declarations, using manual IDL:",
      error.message,
    );
    return getManualReputationIdl();
  }
}

/**
 * Manual IDL definition for reputation canister
 * @return {Function} The IDL factory function
 */
function getManualReputationIdl() {
  return ({IDL}) => {
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

    const ReputationResult = IDL.Variant({ok: ReputationScore, err: IDL.Text});
    const ReviewResult = IDL.Variant({ok: Review, err: IDL.Text});

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
      getReputationScore: IDL.Func([IDL.Principal], [ReputationResult], ["query"]),
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
    console.log(`🔧 Using ICP_ENVIRONMENT: ${process.env.ICP_ENVIRONMENT}`);
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
    console.log("⚠️ No ICP_ENVIRONMENT set, defaulting to playground for deployed functions");
    return "playground";
  }

  // Default to local for development
  console.log("⚠️ No environment detected, defaulting to local");
  return "local";
}

// Canister ID mappings for different environments
const CANISTER_IDS = {
  local: {
    reputation: process.env.CANISTER_ID_REPUTATION || "bd3sg-teaaa-aaaaa-qaaba-cai",
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

  console.log(`🔧 Canister config for environment: ${environment}`, {
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
  const agent = new HttpAgent({host: config.host});

  // Fetch root key for local development
  if (config.fetchRootKey) {
    try {
      await agent.fetchRootKey();
      console.log("✅ Root key fetched successfully for local development");
    } catch (err) {
      console.warn("⚠️ Unable to fetch root key. Check if the IC local replica is running.");
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

  console.log(`🔗 Creating reputation actor for canister: ${canisterId}`);

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
  console.log("🔄 Initialize Reputation Internal:", {userId, creationTime});

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

    console.log(`📞 Calling reputation canister to initialize for ${userId}`);

    const result = await reputationActor.initializeReputation(
      principal,
      creationTimeNs,
    );

    if ("ok" in result) {
      console.log(`✅ Reputation initialized successfully for ${userId}`);
      return {
        success: true,
        data: result.ok,
        message: "Reputation initialized successfully",
      };
    } else {
      console.error(`❌ Error from canister: ${result.err}`);
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
  const {userId, creationTime} = payload;

  console.log("🔄 Initialize Reputation Payload:", {userId, creationTime});

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
  console.log("🔄 Update User Reputation Internal:", {userId});

  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // 1. Fetch all necessary data from Firestore
    console.log(`📊 Fetching user data for ${userId}`);
    const userData = await fetchUserData(userId);

    // 2. Get the reputation actor
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(userId);

    console.log(`📞 Calling reputation canister to update user ${userId}`, {
      completedBookings: userData.completedBookings,
      averageRating: userData.averageRating,
    });

    // 3. Call canister with fetched data
    const result = await reputationActor.updateUserReputation(
      principal,
      userData.completedBookings,
      userData.averageRating ? [userData.averageRating] : [],
      userData.accountAge,
    );

    if ("ok" in result) {
      console.log(`✅ User reputation updated successfully for ${userId}`);
      return {
        success: true,
        data: result.ok,
        message: "User reputation updated successfully",
      };
    } else {
      console.error(`❌ Error from canister: ${result.err}`);
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
  console.log("🔄 Update Provider Reputation Internal:", {providerId});

  if (!providerId) {
    throw new Error("Provider ID is required");
  }

  try {
    // 1. Fetch all necessary data from Firestore
    console.log(`📊 Fetching provider data for ${providerId}`);
    const providerData = await fetchProviderData(providerId);

    // 2. Get the reputation actor
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(providerId);

    console.log(`📞 Calling reputation canister to update provider ${providerId}`, {
      completedBookings: providerData.completedBookings,
      averageRating: providerData.averageRating,
    });

    // 3. Call canister with fetched data
    const result = await reputationActor.updateProviderReputation(
      principal,
      providerData.completedBookings,
      providerData.averageRating ? [providerData.averageRating] : [],
      providerData.accountAge,
    );

    if ("ok" in result) {
      console.log(`✅ Provider reputation updated successfully for ${providerId}`);
      return {
        success: true,
        data: result.ok,
        message: "Provider reputation updated successfully",
      };
    } else {
      console.error(`❌ Error from canister: ${result.err}`);
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
  console.log("🔄 Process Review For Reputation Internal:", {
    reviewId: review?.id,
    useLLM,
  });

  if (!review || !review.id) {
    throw new Error("Review object is required");
  }

  try {
    // 1. Fetch client data from Firestore
    console.log(`📊 Fetching client data for ${review.clientId}`);
    const clientData = await fetchUserData(review.clientId);

    // 2. Get the reputation actor
    const reputationActor = await createReputationActor();

    // 3. Prepare review object for canister
    const reviewForCanister = {
      id: review.id,
      bookingId: review.bookingId,
      clientId: Principal.fromText(review.clientId),
      providerId: Principal.fromText(review.providerId),
      serviceId: review.serviceId,
      rating: review.rating,
      comment: review.comment || "",
      status: review.status === "Hidden" ? {Hidden: null} :
        review.status === "Flagged" ? {Flagged: null} :
          {Visible: null},
      qualityScore: review.qualityScore ? [review.qualityScore] : [],
      createdAt: isoToNanoseconds(review.createdAt),
      updatedAt: isoToNanoseconds(review.updatedAt || review.createdAt),
    };

    console.log(`📞 Calling reputation canister to process review ${review.id}`, {
      useLLM,
      clientCompletedBookings: clientData.completedBookings,
    });

    // 4. Call appropriate canister function
    const result = useLLM ?
      await reputationActor.processReviewWithLLM(
        reviewForCanister,
        clientData.completedBookings,
        clientData.averageRating ? [clientData.averageRating] : [],
        clientData.accountAge,
      ) :
      await reputationActor.processReview(
        reviewForCanister,
        clientData.completedBookings,
        clientData.averageRating ? [clientData.averageRating] : [],
        clientData.accountAge,
      );

    if ("ok" in result) {
      console.log(`✅ Review processed successfully for reputation: ${review.id}`);

      // 5. Also update provider reputation separately
      console.log(`📞 Updating provider reputation for ${review.providerId}`);
      const providerData = await fetchProviderData(review.providerId);

      const providerResult = await reputationActor.updateProviderReputation(
        Principal.fromText(review.providerId),
        providerData.completedBookings,
        providerData.averageRating ? [providerData.averageRating] : [],
        providerData.accountAge,
      );

      if ("ok" in providerResult) {
        console.log(`✅ Provider reputation updated for ${review.providerId}`);
      }

      return {
        success: true,
        data: result.ok,
        message: "Review processed and reputations updated successfully",
      };
    } else {
      console.error(`❌ Error from canister: ${result.err}`);
      throw new Error(result.err);
    }
  } catch (error) {
    console.error("Error processing review for reputation:", error);
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
  const {userId} = payload;

  console.log("🔄 Update User Reputation Payload:", {userId});

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
  const {providerId} = payload;

  console.log("🔄 Update Provider Reputation Payload:", {providerId});

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
 * Process a review and update reputations for both client and provider
 * HTTP Cloud Function - can be called from client or other services via HTTP
 */
exports.processReviewForReputation = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const {review, useLLM = false} = payload;

  console.log("🔄 Process Review For Reputation Payload:", {
    reviewId: review?.id,
    useLLM,
  });

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
 * Get reputation score for a user
 * Public query function that anyone can call
 */
exports.getReputationScore = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data || data;
  const {userId} = payload;

  console.log("🔄 Get Reputation Score Payload:", {userId});

  if (!userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID is required",
    );
  }

  try {
    // First, try to get reputation from Firestore (where admin updates are stored)
    console.log(`🔍 Checking Firestore for reputation data for ${userId}`);
    const userDoc = await db.collection("users").doc(userId).get();

    if (userDoc.exists && userDoc.data().reputationScore !== undefined) {
      const userData = userDoc.data();
      console.log(`✅ Found reputation in Firestore for ${userId}:`, userData.reputationScore);
      return {
        success: true,
        data: {
          trustScore: userData.reputationScore || 50,
          trustLevel: userData.reputationLevel || "New",
          completedBookings: userData.completedBookings || 0,
        },
      };
    }

    // If not in Firestore, try IC canister
    console.log(`📞 No Firestore data, trying IC canister for ${userId}`);
    const reputationActor = await createReputationActor();
    const principal = Principal.fromText(userId);

    const result = await reputationActor.getReputationScore(principal);

    if ("ok" in result) {
      console.log(`✅ Reputation score retrieved from IC for ${userId}`);
      return {
        success: true,
        data: result.ok,
      };
    } else {
      console.error(`❌ Error from canister: ${result.err}`);
      // Return default reputation instead of throwing error
      return {
        success: true,
        data: {
          trustScore: 50,
          trustLevel: "New",
          completedBookings: 0,
        },
      };
    }
  } catch (error) {
    console.error("Error getting reputation score:", error);
    // Return default reputation instead of throwing error
    console.log(`⚠️ Returning default reputation for ${userId} due to error`);
    return {
      success: true,
      data: {
        trustScore: 50,
        trustLevel: "New",
        completedBookings: 0,
      },
    };
  }
});
