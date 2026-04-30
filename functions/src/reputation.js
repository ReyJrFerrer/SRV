/**
 * Reputation Bridge Cloud Function
 *
 * This function manages reputation directly using Firestore and pure JavaScript
 * based math utility instead of the Internet Computer reputation canister.
 */

const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {admin, getFirestore} = require("../firebase-admin");

const {
  BASE_SCORE,
  CANCELLATION_PENALTY,
  calculateTrustScore,
  calculateProviderTrustScore,
  determineTrustLevel,
} = require("./utils/reputationMath");

// Initialize Firebase Admin if not already initialized
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
 * Fetch user data from Firestore
 * @param {string} userId - The user ID
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

    return {completedBookings, averageRating, accountAgeMs};
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}

/**
 * Fetch provider data from Firestore
 * @param {string} providerId - The provider ID
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
 * Write reputation and its history subcollection entry
 * @param {string} userId - The user ID
 * @param {Object} reputationData - The reputation data
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
 * Internal function to initialize reputation
 * @param {string} userId - The user ID
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

exports.initializeReputation = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;
  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");

  try {
    return await initializeReputationInternal(userId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
exports.initializeReputationInternal = initializeReputationInternal;

/**
 * Internal function to update user reputation
 * @param {string} userId - The user ID
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

exports.updateUserReputation = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;
  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");
  try {
    return await updateUserReputationInternal(userId);
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
exports.updateUserReputationInternal = updateUserReputationInternal;

/**
 * Internal function to update provider reputation
 * @param {string} providerId - The provider ID
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

exports.updateProviderReputation = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
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
});
exports.updateProviderReputationInternal = updateProviderReputationInternal;

/**
 * Internal function to process review for reputation
 * @param {Object} review - The review object
 */
async function processReviewForReputationInternal(review) {
  if (!review || !review.id) throw new Error("Review object with ID is required");

  try {
    // Check if AI analysis indicates review bombing
    await applyAIAnalysisFlags(review);

    // Update both reputations whenever a review is processed
    await updateUserReputationInternal(review.clientId);
    await updateProviderReputationInternal(review.providerId);

    return {success: true, data: {status: "Visible"}};
  } catch (error) {
    console.error("Error in processReviewForReputationInternal:", error);
    throw error;
  }
}

/**
 * Apply detection flags based on AI analysis results
 * @param {Object} review - The review object with AI analysis
 */
async function applyAIAnalysisFlags(review) {
  if (!review.aiAnalysis?.analyzed) {
    return;
  }

  const aiAnalysis = review.aiAnalysis;

  // Check if AI analysis indicates review bombing patterns
  if (!aiAnalysis.isSuspicious || aiAnalysis.confidence < 0.7) {
    return;
  }

  const patterns = aiAnalysis.patterns || [];
  const threatLevel = aiAnalysis.threatLevel;

  // Determine if this warrants a ReviewBomb flag
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

  // Check if user already has ReviewBomb flag
  const repRef = db.collection("reputations").doc(review.clientId);
  const doc = await repRef.get();

  let existingFlags = [];
  if (doc.exists && doc.data().detectionFlags) {
    existingFlags = doc.data().detectionFlags;
  }

  // Don't add duplicate flags
  if (existingFlags.includes("ReviewBomb")) {
    return;
  }

  // Add ReviewBomb flag
  const updatedFlags = [...existingFlags, "ReviewBomb"];

  await repRef.update({
    detectionFlags: updatedFlags,
    lastUpdated: Date.now(),
  });

  const msg = `[applyAIAnalysisFlags] Added ReviewBomb flag to user ${review.clientId}`;
  console.log(`${msg} based on AI analysis`);
}

exports.processReviewForReputation = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
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
});
exports.processReviewForReputationInternal = processReviewForReputationInternal;

/**
 * Deduct reputation points for a user who cancelled a booking
 * @param {string} userId - The user ID
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

exports.deductReputationForCancellation = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;
  if (!userId) throw new HttpsError("invalid-argument", "User ID is required");
  try {
    const result = await deductReputationForCancellationInternal(userId);
    return {success: true, data: result};
  } catch (error) {
    throw new HttpsError("internal", "Failed to deduct reputation points", error);
  }
});
exports.deductReputationForCancellationInternal = deductReputationForCancellationInternal;

/**
 * Deduct reputation for a user who submitted a suspicious review (AI-flagged)
 * Adds a ReviewBomb detection flag and recalculates trust score
 * @param {string} userId - The reviewer's user ID
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
      console.log(`[deductReputationForSuspiciousReview] 
        User ${userId} already has ReviewBomb flag`);
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
      `[deductReputationForSuspiciousReview] Added ReviewBomb flag to ${userId}. ` +
      `Trust score: ${data.trustScore} -> ${newTrustScore}`,
    );

    return {success: true, data: updatedScore};
  } catch (error) {
    console.error("[deductReputationForSuspiciousReview] Error:", error);
    throw error;
  }
}
exports.deductReputationForSuspiciousReviewInternal = deductReputationForSuspiciousReviewInternal;

/**
 * Internal function to check the user reputation
 * @param {string} userId - The user ID
 */
async function checkUserReputationInternal(userId) {
  try {
    // If not exists, initialize it implicitly
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
      // Return default if not exists
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
exports.checkUserReputationInternal = checkUserReputationInternal;

/**
 * Internal function to set a specific reputation score (admin override)
 * @param {string} userId - The user ID
 * @param {number} reputationScore - The reputation score to set
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

exports.updateReputation = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, reputationScore} = payload;

  const authInfo = (context.auth && context.auth.token) ?
    {uid: context.auth.uid, isAdmin: context.auth.token.isAdmin || false, hasAuth: true} :
    {uid: null, isAdmin: false, hasAuth: !!context.auth};

  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only ADMIN users can update reputation",
    );
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
});
exports.updateReputationInternal = updateReputationInternal;
