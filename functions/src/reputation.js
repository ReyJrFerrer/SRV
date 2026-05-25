/**
 * Reputation Bridge Cloud Function
 *
 * This function manages reputation directly using Firestore and pure JavaScript
 * based math utility instead of the Internet Computer reputation canister.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {admin, getFirestore} = require("../firebase-admin");

const {
  BASE_SCORE,
  CANCELLATION_PENALTY,
  calculateTrustScore,
  calculateProviderTrustScore,
  determineTrustLevel,
} = require("./utils/reputationMath");

if (!admin.apps.length) {
  if (process.env.FUNCTIONS_EMULATOR) {
    admin.initializeApp({
      projectId: "srve-7133d",
    });
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  } else {
    admin.initializeApp();
  }
}

const db = getFirestore();

/**
 * Fetch user data for reputation calculation
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function fetchUserData(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const accountAgeMs = new Date(userData.createdAt || new Date().toISOString()).getTime();

    const bookingsSnapshot = await db.collection("bookings")
      .where("clientId", "==", userId)
      .where("status", "==", "Completed")
      .get();
    const completedBookings = bookingsSnapshot.size;

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

    return {completedBookings, averageRating, accountAgeMs};
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

/**
 * Fetch provider data for reputation calculation
 * @param {string} providerId
 * @return {Promise<Object>} Result object
 */
async function fetchProviderData(providerId) {
  try {
    const userRef = db.collection("users").doc(providerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("Provider not found");
    }

    const userData = userDoc.data();
    const accountAgeMs = new Date(userData.createdAt || new Date().toISOString()).getTime();

    const bookingsSnapshot = await db.collection("bookings")
      .where("providerId", "==", providerId)
      .where("status", "==", "Completed")
      .get();
    const completedBookings = bookingsSnapshot.size;

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

    return {completedBookings, averageRating, accountAgeMs};
  } catch (error) {
    console.error("Error fetching provider data:", error);
    throw error;
  }
}

/**
 * Write reputation data and history
 * @param {string} userId
 * @param {Object} reputationData
 * @return {Promise<void>} Promise on completion
 */
async function writeReputationAndHistory(userId, reputationData) {
  const timestamp = Date.now();
  const repRef = db.collection("reputations").doc(userId);
  await repRef.set({
    ...reputationData,
    lastUpdated: timestamp,
  }, {merge: true});

  const historyRef = repRef.collection("history").doc(timestamp.toString());
  await historyRef.set({
    trustScore: reputationData.trustScore,
    timestamp: timestamp,
  });
}

/**
 * Initialize reputation for a new user
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function initializeReputationInternal(userId) {
  if (!userId) throw new Error("User ID is required");

  try {
    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    if (doc.exists) {
      return {success: true, data: doc.data(), message: "Reputation already exists"};
    }

    const defaultRep = {
      userId,
      trustScore: BASE_SCORE,
      trustLevel: "New",
      completedBookings: 0,
      averageRating: null,
      detectionFlags: [],
    };

    await writeReputationAndHistory(userId, defaultRep);

    return {success: true, data: defaultRep, message: "Reputation initialized successfully"};
  } catch (error) {
    console.error("Error initializing reputation:", error);
    throw error;
  }
}

/**
 * Update user reputation score
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function updateUserReputationInternal(userId) {
  if (!userId) throw new Error("User ID is required");
  try {
    const userData = await fetchUserData(userId);

    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    let detectionFlags = [];
    if (doc.exists && doc.data().detectionFlags) {
      detectionFlags = doc.data().detectionFlags;
    }

    const newTrustScore = calculateTrustScore(
      userData.completedBookings,
      userData.averageRating,
      userData.accountAgeMs,
      detectionFlags,
    );

    const updatedScore = {
      userId,
      trustScore: newTrustScore,
      trustLevel: determineTrustLevel(newTrustScore),
      completedBookings: userData.completedBookings,
      averageRating: userData.averageRating,
      detectionFlags,
    };

    await writeReputationAndHistory(userId, updatedScore);

    return {success: true, data: updatedScore, message: "User reputation updated successfully"};
  } catch (error) {
    console.error("Error updating user reputation:", error);
    throw error;
  }
}

/**
 * Update provider reputation score
 * @param {string} providerId
 * @return {Promise<Object>} Result object
 */
async function updateProviderReputationInternal(providerId) {
  if (!providerId) throw new Error("Provider ID is required");
  try {
    const providerData = await fetchProviderData(providerId);

    const repRef = db.collection("reputations").doc(providerId);
    const doc = await repRef.get();

    let detectionFlags = [];
    if (doc.exists && doc.data().detectionFlags) {
      detectionFlags = doc.data().detectionFlags;
    }

    const newTrustScore = calculateProviderTrustScore(
      providerData.completedBookings,
      providerData.averageRating,
      providerData.accountAgeMs,
      detectionFlags,
    );

    const updatedScore = {
      userId: providerId,
      trustScore: newTrustScore,
      trustLevel: determineTrustLevel(newTrustScore),
      completedBookings: providerData.completedBookings,
      averageRating: providerData.averageRating,
      detectionFlags,
    };

    await writeReputationAndHistory(providerId, updatedScore);

    return {success: true, data: updatedScore, message: "Provider reputation updated successfully"};
  } catch (error) {
    console.error("Error updating provider reputation:", error);
    throw error;
  }
}

/**
 * Apply AI analysis flags to detect review bombing
 * @param {Object} review
 * @return {Promise<void>} Promise on completion
 */
async function applyAIAnalysisFlags(review) {
  if (!review.aiAnalysis?.analyzed) {
    return;
  }

  const aiAnalysis = review.aiAnalysis;

  if (!aiAnalysis.isSuspicious || aiAnalysis.confidence < 0.7) {
    return;
  }

  const patterns = aiAnalysis.patterns || [];
  const threatLevel = aiAnalysis.threatLevel;

  const reviewBombPatterns = [
    "template_language",
    "coordinated_pattern",
    "repeated_structure",
    "suspicious_timing",
  ];

  const hasReviewBombIndicators = patterns.some((p) => reviewBombPatterns.includes(p));

  if (!hasReviewBombIndicators && threatLevel !== "high") {
    return;
  }

  const repRef = db.collection("reputations").doc(review.clientId);
  const doc = await repRef.get();

  let existingFlags = [];
  if (doc.exists && doc.data().detectionFlags) {
    existingFlags = doc.data().detectionFlags;
  }

  if (existingFlags.includes("ReviewBomb")) {
    return;
  }

  const updatedFlags = [...existingFlags, "ReviewBomb"];

  await repRef.update({
    detectionFlags: updatedFlags,
    lastUpdated: Date.now(),
  });

  console.log(
    `[applyAIAnalysisFlags] Added ReviewBomb flag to user ${review.clientId} based on AI analysis`,
  );
}

/**
 * Process a review through the reputation pipeline
 * @param {Object} review
 * @return {Promise<Object>} Result object
 */
async function processReviewForReputationInternal(review) {
  if (!review || !review.id) throw new Error("Review object with ID is required");

  try {
    await applyAIAnalysisFlags(review);
    await updateUserReputationInternal(review.clientId);
    await updateProviderReputationInternal(review.providerId);

    return {success: true, data: {status: "Visible"}};
  } catch (error) {
    console.error("Error in processReviewForReputationInternal:", error);
    throw error;
  }
}

/**
 * Deduct reputation points for booking cancellation
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function deductReputationForCancellationInternal(userId) {
  try {
    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    let currentScore = BASE_SCORE;
    let data = {
      userId,
      completedBookings: 0,
      averageRating: null,
      detectionFlags: [],
    };

    if (doc.exists) {
      data = doc.data();
      currentScore = data.trustScore !== undefined ? data.trustScore : BASE_SCORE;
    }

    const newTrustScore = Math.max(0, currentScore - CANCELLATION_PENALTY);

    const updatedScore = {
      ...data,
      trustScore: newTrustScore,
      trustLevel: determineTrustLevel(newTrustScore),
    };

    await writeReputationAndHistory(userId, updatedScore);

    return {
      userId,
      trustScore: newTrustScore,
      trustLevel: updatedScore.trustLevel,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in deductReputationForCancellationInternal:", error);
    throw error;
  }
}

/**
 * Deduct reputation for suspicious review activity
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function deductReputationForSuspiciousReviewInternal(userId) {
  try {
    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    if (!doc.exists) {
      console.log(`[deductReputationForSuspiciousReview] No reputation found for ${userId}`);
      return {success: false, error: "No reputation found"};
    }

    const data = doc.data();
    const existingFlags = data.detectionFlags || [];

    if (existingFlags.includes("ReviewBomb")) {
      console.log(
        `[deductReputationForSuspiciousReview] User ${userId} already has ReviewBomb flag`,
      );
      return {success: true, data, message: "Already flagged"};
    }

    const updatedFlags = [...existingFlags, "ReviewBomb"];
    const accountAgeMs = data.accountAgeMs || Date.now();

    const newTrustScore = calculateTrustScore(
      data.completedBookings || 0,
      data.averageRating,
      accountAgeMs,
      updatedFlags,
    );

    const updatedScore = {
      ...data,
      userId,
      detectionFlags: updatedFlags,
      trustScore: newTrustScore,
      trustLevel: determineTrustLevel(newTrustScore),
    };

    await writeReputationAndHistory(userId, updatedScore);

    console.log(
      `[deductReputationForSuspiciousReview] Added ReviewBomb flag to ${userId}.` +
      ` Trust score: ${data.trustScore} -> ${newTrustScore}`,
    );

    return {success: true, data: updatedScore};
  } catch (error) {
    console.error("[deductReputationForSuspiciousReview] Error:", error);
    throw error;
  }
}

/**
 * Check user reputation data
 * @param {string} userId
 * @return {Promise<Object>} Result object
 */
async function checkUserReputationInternal(userId) {
  try {
    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    if (doc.exists) {
      const data = doc.data();
      return {
        success: true,
        data: {
          trustScore: Number(data.trustScore),
          trustLevel: data.trustLevel?.toString() || "New",
          completedBookings: Number(data.completedBookings || 0),
        },
      };
    } else {
      return {
        success: true,
        data: {
          trustScore: BASE_SCORE,
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
        trustScore: BASE_SCORE,
        trustLevel: "New",
        completedBookings: 0,
      },
    };
  }
}

/**
 * Update reputation with a specific score (admin)
 * @param {string} userId
 * @param {number} reputationScore
 * @return {Promise<Object>} Result object
 */
async function updateReputationInternal(userId, reputationScore) {
  if (!userId) throw new Error("User ID is required");
  if (reputationScore === undefined || reputationScore === null) {
    throw new Error("Reputation score is required");
  }

  try {
    const repRef = db.collection("reputations").doc(userId);
    const doc = await repRef.get();

    let detectionFlags = [];
    let completedBookings = 0;
    let averageRating = null;

    if (doc.exists) {
      const data = doc.data();
      detectionFlags = data.detectionFlags || [];
      completedBookings = data.completedBookings || 0;
      averageRating = data.averageRating || null;
    }

    const updatedScore = {
      userId,
      trustScore: Number(reputationScore),
      trustLevel: determineTrustLevel(Number(reputationScore)),
      completedBookings,
      averageRating,
      detectionFlags,
    };

    await writeReputationAndHistory(userId, updatedScore);

    return {success: true, data: updatedScore, message: "Reputation updated successfully"};
  } catch (error) {
    console.error("Error updating reputation:", error);
    throw error;
  }
}

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Initialize reputation for a user
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function initializeReputation_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {userId} = payload;

  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");

  try {
    return await initializeReputationInternal(userId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update user reputation
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function updateUserReputation_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {userId} = payload;

  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");

  try {
    return await updateUserReputationInternal(userId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update provider reputation
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function updateProviderReputation_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {providerId} = payload;

  if (!providerId) {
    throw new HttpsError("invalid-argument", "Provider ID is required");
  }

  try {
    return await updateProviderReputationInternal(providerId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Process a review through reputation pipeline
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function processReviewForReputation_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {review} = payload;

  if (!review || !review.id) {
    throw new HttpsError("invalid-argument", "Review object is required");
  }

  try {
    return await processReviewForReputationInternal(review);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Deduct reputation for booking cancellation
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function deductReputationForCancellation_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {userId} = payload;

  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");

  try {
    const result = await deductReputationForCancellationInternal(userId);
    return {success: true, data: result};
  } catch (error) {
    throw new HttpsError("internal", "Failed to deduct reputation points", error);
  }
}

/**
 * Deduct reputation for suspicious review
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function deductReputationForSuspiciousReview_reputation(request) {
  const data = request.data;
  const payload = data.data || data;
  const {userId} = payload;

  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");

  try {
    return await deductReputationForSuspiciousReviewInternal(userId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update reputation score (admin only)
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function updateReputation_reputation(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, reputationScore} = payload;

  const authInfo = (context.auth && context.auth.token) ?
    {uid: context.auth.uid, isAdmin: context.auth.token.isAdmin || false, hasAuth: true} :
    {uid: null, isAdmin: false, hasAuth: !!context.auth};

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Only ADMIN users can update reputation");
  }

  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");
  if (reputationScore === undefined || reputationScore === null) {
    throw new HttpsError("invalid-argument", "Reputation score is required");
  }

  try {
    return await updateReputationInternal(userId, reputationScore);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
}

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.reputationAction = onCall(
  {
    memory: "256MiB",
    concurrency: 80,
    maxInstances: 50,
  },
  async (request) => {
    const {action} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "initializeReputation":
        return await initializeReputation_reputation(request);
      case "updateUserReputation":
        return await updateUserReputation_reputation(request);
      case "updateProviderReputation":
        return await updateProviderReputation_reputation(request);
      case "processReviewForReputation":
        return await processReviewForReputation_reputation(request);
      case "deductReputationForCancellation":
        return await deductReputationForCancellation_reputation(request);
      case "deductReputationForSuspiciousReview":
        return await deductReputationForSuspiciousReview_reputation(request);
      case "updateReputation":
        return await updateReputation_reputation(request);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error executing action [${action}]:`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Internal Server Error");
    }
  },
);

// Export internal functions for use by other modules
exports.initializeReputationInternal = initializeReputationInternal;
exports.updateUserReputationInternal = updateUserReputationInternal;
exports.updateProviderReputationInternal = updateProviderReputationInternal;
exports.processReviewForReputationInternal = processReviewForReputationInternal;
exports.deductReputationForCancellationInternal = deductReputationForCancellationInternal;
exports.deductReputationForSuspiciousReviewInternal = deductReputationForSuspiciousReviewInternal;
exports.checkUserReputationInternal = checkUserReputationInternal;
exports.updateReputationInternal = updateReputationInternal;
