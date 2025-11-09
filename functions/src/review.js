const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import reputation bridge for processing reviews with AI sentiment analysis
const {
  processReviewForReputationInternal,
} = require("./reputation");

const db = admin.firestore();

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

// Constants
const REVIEW_WINDOW_DAYS = 30;
const MAX_COMMENT_LENGTH = 500;
const MIN_RATING = 1;
const MAX_RATING = 5;
const CONSECUTIVE_BAD_REVIEWS_THRESHOLD = 1;
// Number of consecutive bad reviews to trigger auto-report
const BAD_REVIEW_RATING_THRESHOLD = 2; // Rating <= this value is considered "bad"

/**
 * Generate a unique review ID
 * @return {string} Unique review ID
 */
function generateId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${now}-${random}`;
}

/**
 * Generate a unique report ID
 * @return {string} Unique report ID
 */
function generateReportId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `report_${timestamp}_${random}`;
}

/**
 * Validate rating is within acceptable range
 * @param {number} rating - Rating to validate
 * @return {boolean} True if rating is valid
 */
function isValidRating(rating) {
  return rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * Check if completed booking is within review window
 * @param {string} completedAt - ISO timestamp of completion
 * @return {boolean} True if within review window
 */
function isWithinReviewWindow(completedAt) {
  const completedTime = new Date(completedAt).getTime();
  const now = Date.now();
  const windowInMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (now - completedTime) <= windowInMs;
}

/**
 * Calculate quality score for a review
 * @param {object} review - Review object
 * @return {number} Quality score between 0 and 1
 */
function calculateQualityScore(review) {
  const commentLength = review.comment.length;
  const maxLength = MAX_COMMENT_LENGTH;
  const lengthScore = commentLength / maxLength;
  const ratingScore = review.rating / MAX_RATING;
  return (lengthScore + ratingScore) / 2.0;
}

/**
 * Check for consecutive bad reviews and create auto-report if threshold is met
 * @param {string} collectionName - Collection to query ("reviews" or "providerReviews")
 * @param {string} filterField - Field to filter by ("providerId" or "clientId")
 * @param {string} userId - User ID to check reviews for
 * @param {object} newReview - The newly submitted review
 * @param {string} scenarioType - Type of scenario: "received" or "given"
 * @param {string} userType - Type of user: "provider" or "client"
 * @return {Promise<boolean>} True if a report was created, false otherwise
 */
async function checkConsecutiveBadReviews(
  collectionName,
  filterField,
  userId,
  newReview,
  scenarioType,
  userType,
) {
  try {
    // Only check if this review is bad (rating <= threshold)
    if (newReview.rating > BAD_REVIEW_RATING_THRESHOLD) {
      return false;
    }

    console.log(`📊 Checking for consecutive bad reviews ${scenarioType} by ${userType} ${userId}`);

    let recentReviewsSnap;
    try {
      // Get the last N reviews, ordered by createdAt desc
      recentReviewsSnap = await db
        .collection(collectionName)
        .where(filterField, "==", userId)
        .orderBy("createdAt", "desc")
        .limit(CONSECUTIVE_BAD_REVIEWS_THRESHOLD)
        .get();
    } catch (queryError) {
      // If query fails due to missing index, try fallback approach
      if (queryError.code === 8 || queryError.message?.includes("index")) {
        console.log(`⚠️ Query failed due to index, using fallback approach`);
        // Fallback: get all reviews and filter/sort client-side
        const allReviewsSnap = await db
          .collection(collectionName)
          .where(filterField, "==", userId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          allReviews.push(doc.data());
        });

        // Sort by createdAt desc and take first N
        const sortedReviews = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        // Create a mock snapshot-like structure
        recentReviewsSnap = {
          size: Math.min(CONSECUTIVE_BAD_REVIEWS_THRESHOLD, sortedReviews.length),
          forEach: (callback) => {
            sortedReviews.slice(0, CONSECUTIVE_BAD_REVIEWS_THRESHOLD).forEach((review) => {
              callback({data: () => review});
            });
          },
        };
      } else {
        throw queryError;
      }
    }

    if (recentReviewsSnap.size === CONSECUTIVE_BAD_REVIEWS_THRESHOLD) {
      // Check if all N reviews are bad (rating <= threshold)
      let allBad = true;
      const reviews = [];
      recentReviewsSnap.forEach((doc) => {
        const review = doc.data();
        reviews.push(review);
        if (review.rating > BAD_REVIEW_RATING_THRESHOLD) {
          allBad = false;
        }
      });

      if (allBad) {
        const reportId = generateReportId();
        const userName = userType === "provider" ? "Provider" : "Client";
        const action = scenarioType === "received" ? "received" : "given";

        console.log(`⚠️ Detected ${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} consecutive bad reviews ` +
          `${action} by ${userType} ${userId}. Creating auto-report.`);

        // Get user profile for report details
        const userDoc = await db.collection("users").doc(userId).get();
        const userProfile = userDoc.exists ? userDoc.data() : null;
        const displayName = userProfile?.name || `Unknown ${userName}`;
        const userPhone = userProfile?.phone || userProfile?.phoneNumber || "N/A";

        // Get service name for context
        let serviceName = "Unknown Service";
        if (newReview.serviceId) {
          const serviceDoc = await db.collection("services").doc(newReview.serviceId).get();
          if (serviceDoc.exists) {
            serviceName = serviceDoc.data()?.name || "Unknown Service";
          }
        }

        // Create ticket description with structured data
        const title = `${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} Consecutive Bad Reviews - ` +
          `${displayName} (${action} by ${userType})`;
        const description = `${userName} ${displayName} has ${action}
        ${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} ` +
          `consecutive bad reviews (rating <= ${BAD_REVIEW_RATING_THRESHOLD}).\n\n` +
          `This is an automatically generated report.`;

        const ticketDescription = JSON.stringify({
          title: title,
          description: description,
          category: "bad_reviews",
          timestamp: new Date().toISOString(),
          source: `system_auto_report_consecutive_bad_reviews_${scenarioType}_${userType}`,
          userId: userId,
          userName: displayName,
          userType: userType,
          scenarioType: scenarioType,
          serviceId: newReview.serviceId,
          serviceName: serviceName,
          reviewIds: reviews.map((r) => r.id),
          ratings: reviews.map((r) => r.rating),
          collection: collectionName,
        });

        const newReport = {
          id: reportId,
          userId: userId, // Report submitted by the user involved
          userName: displayName,
          userPhone: userPhone,
          description: ticketDescription,
          status: "open",
          createdAt: new Date().toISOString(),
        };

        // Save report to Firestore
        await db.collection("reports").doc(reportId).set(newReport);
        console.log(`✅ Automatically created ticket ${reportId} for ` +
          `${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} consecutive bad reviews.`);
        return true;
      }
    }
    return false;
  } catch (error) {
    // Don't fail the review submission if report creation fails - just log it
    console.error(`⚠️ Failed to check/create auto-report for consecutive bad reviews: ` +
      `${error.message}`);
    return false;
  }
}

/**
 * Submit a review for a booking
 */
exports.submitReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {bookingId, rating, comment = ""} = payload;
  console.log("Submit Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Input validation
  if (!bookingId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Booking ID is required",
    );
  }

  if (!isValidRating(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // ===== ALL READ OPERATIONS FIRST =====

      // Check if booking exists and user is the client
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Booking not found",
        );
      }

      const booking = bookingSnap.data();

      // Check if review already exists
      const existingReviewsSnap = await db
        .collection("reviews")
        .where("bookingId", "==", bookingId)
        .where("clientId", "==", authInfo.uid)
        .get();

      if (!existingReviewsSnap.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Review already exists for this booking",
        );
      }

      // Read service data for rating statistics update
      const serviceRef = db.collection("services").doc(booking.serviceId);
      const serviceSnap = await transaction.get(serviceRef);

      // ===== VALIDATION CHECKS =====

      // Verify user is the client of this booking
      if (booking.clientId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized to review this booking",
        );
      }

      // Check if booking is completed
      if (booking.status !== "Completed" || !booking.completedDate) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Booking is not completed yet. Cannot submit review until service is completed.",
        );
      }

      // Check if within review window
      if (!isWithinReviewWindow(booking.completedDate)) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          `Review window has expired. Reviews must be submitted within 
          ${REVIEW_WINDOW_DAYS} days of service completion`,
        );
      }

      // ===== ALL WRITE OPERATIONS AFTER =====

      // Create new review
      const reviewId = generateId();
      const now = new Date().toISOString();

      const newReview = {
        id: reviewId,
        bookingId: bookingId,
        clientId: authInfo.uid,
        providerId: booking.providerId,
        serviceId: booking.serviceId,
        rating: rating,
        comment: comment,
        createdAt: now,
        updatedAt: now,
        status: "Visible",
        qualityScore: calculateQualityScore({
          rating,
          comment,
        }),
      };

      // Save review to Firestore
      const reviewRef = db.collection("reviews").doc(reviewId);
      transaction.set(reviewRef, newReview);

      // Update service rating statistics

      if (serviceSnap.exists) {
        const service = serviceSnap.data();
        const currentRating = service.averageRating || 0;
        const currentCount = service.reviewCount || 0;
        const newCount = currentCount + 1;
        const newAverageRating = ((currentRating * currentCount) + rating) / newCount;

        transaction.update(serviceRef, {
          averageRating: newAverageRating,
          reviewCount: newCount,
          updatedAt: now,
        });
      }

      return {success: true, data: newReview};
    });

    // Process review for reputation with AI sentiment analysis
    // This is done outside the transaction to avoid long-running operations
    console.log(`🌟 [submitReview] Processing review for reputation with AI`);
    await processReviewForReputationInternal(result.data, true);
    console.log(`✅ [submitReview] Review processed for reputation successfully`);

    // Check for consecutive bad reviews and auto-create report if needed
    // This is done outside the transaction to avoid long-running operations
    // Check both scenarios:
    // 1. Provider receives 5 consecutive bad reviews (from clients)
    // 2. Client gives 5 consecutive bad reviews (to providers)
    try {
      const newReview = result.data;
      const providerId = newReview.providerId;
      const clientId = newReview.clientId;

      console.log(`📊 [submitReview] Checking for consecutive bad reviews...`);

      // Scenario 1: Provider receives consecutive bad reviews
      await checkConsecutiveBadReviews(
        "reviews",
        "providerId",
        providerId,
        newReview,
        "received",
        "provider",
      );

      // Scenario 2: Client gives consecutive bad reviews
      await checkConsecutiveBadReviews(
        "reviews",
        "clientId",
        clientId,
        newReview,
        "given",
        "client",
      );
    } catch (reportError) {
      // Don't fail the review submission if report creation fails - just log it
      console.error(`⚠️ [submitReview] Failed to check/create auto-report
        for consecutive bad reviews: ${reportError.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error in submitReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get review by ID
 */
exports.getReview = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewId} = payload;
  console.log("Get Review Payload", payload);

  if (!reviewId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review ID is required",
    );
  }

  try {
    const reviewSnap = await db.collection("reviews").doc(reviewId).get();

    if (!reviewSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Review not found",
      );
    }

    const review = reviewSnap.data();

    if (review.status === "Hidden") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Review has been hidden",
      );
    }

    return {success: true, data: review};
  } catch (error) {
    console.error("Error in getReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get reviews for a booking
 */
exports.getBookingReviews = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {bookingId} = payload;
  console.log("Get booking Review Payload", payload);

  if (!bookingId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Booking ID is required",
    );
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("bookingId", "==", bookingId)
      .where("status", "==", "Visible")
      .get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getBookingReviews:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get reviews by a user
 */
exports.getUserReviews = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {userId, includeHidden = false} = payload;
  console.log("Get User Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use authenticated user's ID if no userId provided
  const targetUserId = userId || authInfo.uid;

  // Reviews are public (as per firestore.rules), so any authenticated user can view them
  // Only restriction: admins can request hidden reviews

  // Only admins can request hidden reviews
  const showAll = includeHidden && authInfo.isAdmin;

  console.log("[getUserReviews] includeHidden:", includeHidden,
    "isAdmin:", authInfo.isAdmin, "showAll:", showAll);

  try {
    // When showing all (including hidden), fetch all and filter client-side to avoid index issues
    if (showAll) {
      console.log("[getUserReviews] Fetching all reviews (including hidden) for admin");
      const allReviewsSnap = await db
        .collection("reviews")
        .where("clientId", "==", targetUserId)
        .get();

      const allReviews = [];
      allReviewsSnap.forEach((doc) => {
        allReviews.push(doc.data());
      });

      // Sort client-side
      const sorted = allReviews.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      return {success: true, data: sorted};
    }

    // Normal query for visible reviews only (has proper index)
    const query = db
      .collection("reviews")
      .where("clientId", "==", targetUserId)
      .where("status", "==", "Visible");

    const reviewsSnap = await query
      .orderBy("createdAt", "desc")
      .get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getUserReviews:", error);
    // If the query fails due to missing index, try fetching all and filtering client-side
    if (error.code === 8 || error.message?.includes("index")) {
      console.log("[getUserReviews] Falling back to client-side filtering due to index issue");
      try {
        const allReviewsSnap = await db
          .collection("reviews")
          .where("clientId", "==", targetUserId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          const reviewData = doc.data();
          if (showAll || reviewData.status === "Visible" || !reviewData.status) {
            allReviews.push(reviewData);
          }
        });

        // Sort client-side
        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        return {success: true, data: sorted};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new functions.https.HttpsError("internal", fallbackError.message);
      }
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update a review
 */
exports.updateReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewId, rating, comment = ""} = payload;
  console.log("Update Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Input validation
  if (!reviewId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review ID is required",
    );
  }

  if (!isValidRating(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // ===== ALL READ OPERATIONS FIRST =====

      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Review not found",
        );
      }

      const existingReview = reviewSnap.data();

      // Read service data if we might need to update rating
      const serviceRef = db.collection("services").doc(existingReview.serviceId);
      const serviceSnap = await transaction.get(serviceRef);

      // ===== VALIDATION CHECKS =====

      // Verify user owns this review
      if (existingReview.clientId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized to update this review",
        );
      }

      if (existingReview.status !== "Visible") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Cannot update a ${existingReview.status} review`,
        );
      }

      // ===== ALL WRITE OPERATIONS AFTER =====

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        rating: rating,
        comment: comment,
        updatedAt: now,
        qualityScore: calculateQualityScore({
          rating,
          comment,
        }),
      };

      transaction.update(reviewRef, updatedReview);

      // Update service rating if rating changed
      if (existingReview.rating !== rating && serviceSnap.exists) {
        const service = serviceSnap.data();
        const currentRating = service.averageRating || 0;
        const reviewCount = service.reviewCount || 1;

        // Recalculate average by removing old rating and adding new rating
        const oldTotal = currentRating * reviewCount;
        const newTotal = oldTotal - existingReview.rating + rating;
        const newAverageRating = newTotal / reviewCount;

        transaction.update(serviceRef, {
          averageRating: newAverageRating,
          updatedAt: now,
        });
      }

      return {success: true, data: updatedReview};
    });
  } catch (error) {
    console.error("Error in updateReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Delete (hide) a review
 */
exports.deleteReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewId} = payload;
  console.log("Delete Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!reviewId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review ID is required",
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      // ===== ALL READ OPERATIONS FIRST =====

      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Review not found",
        );
      }

      const existingReview = reviewSnap.data();

      // Read service data for rating statistics update
      const serviceRef = db.collection("services").doc(existingReview.serviceId);
      const serviceSnap = await transaction.get(serviceRef);

      // ===== VALIDATION CHECKS =====

      // Verify user owns this review or is admin
      if (existingReview.clientId !== authInfo.uid && !authInfo.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized to delete this review",
        );
      }

      if (existingReview.status === "Hidden") {
        throw new functions.https.HttpsError(
          "already-exists",
          "Review is already hidden",
        );
      }

      // ===== ALL WRITE OPERATIONS AFTER =====

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        status: "Hidden",
        updatedAt: now,
      };

      transaction.update(reviewRef, updatedReview);

      // Update service rating statistics

      if (serviceSnap.exists) {
        const service = serviceSnap.data();
        const currentRating = service.averageRating || 0;
        const currentCount = service.reviewCount || 1;
        const newCount = Math.max(0, currentCount - 1);

        let newAverageRating = 0;
        if (newCount > 0) {
          const oldTotal = currentRating * currentCount;
          const newTotal = oldTotal - existingReview.rating;
          newAverageRating = newTotal / newCount;
        }

        transaction.update(serviceRef, {
          averageRating: newAverageRating,
          reviewCount: newCount,
          updatedAt: now,
        });
      }

      return {success: true, message: "Review hidden successfully"};
    });
  } catch (error) {
    console.error("Error in deleteReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Restore (unhide) a review
 */
exports.restoreReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewId} = payload;
  console.log("Restore Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  if (!reviewId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review ID is required",
    );
  }

  try {
    // First, try to find the review in either collection
    const reviewDoc = await db.collection("reviews").doc(reviewId).get();
    const providerReviewDoc = await db.collection("providerReviews").doc(reviewId).get();

    let reviewCollection = null;
    let existingReview = null;

    if (reviewDoc.exists) {
      reviewCollection = "reviews";
      existingReview = reviewDoc.data();
    } else if (providerReviewDoc.exists) {
      reviewCollection = "providerReviews";
      existingReview = providerReviewDoc.data();
    } else {
      throw new functions.https.HttpsError(
        "not-found",
        "Review not found",
      );
    }

    return await db.runTransaction(async (transaction) => {
      // ===== ALL READ OPERATIONS FIRST =====

      const reviewRef = db.collection(reviewCollection).doc(reviewId);

      // Read service data for rating statistics update (only for regular reviews)
      let serviceRef = null;
      let serviceSnap = null;
      if (reviewCollection === "reviews" && existingReview.serviceId) {
        serviceRef = db.collection("services").doc(existingReview.serviceId);
        serviceSnap = await transaction.get(serviceRef);
      }

      // ===== VALIDATION CHECKS =====

      if (existingReview.status !== "Hidden") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Review is not hidden",
        );
      }

      // ===== ALL WRITE OPERATIONS AFTER =====

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        status: "Visible",
        updatedAt: now,
      };

      transaction.update(reviewRef, updatedReview);

      // Update service rating statistics (only for regular reviews, not provider reviews)
      if (reviewCollection === "reviews" && serviceSnap && serviceSnap.exists) {
        const service = serviceSnap.data();
        const currentRating = service.averageRating || 0;
        const currentCount = service.reviewCount || 0;
        const newCount = currentCount + 1;

        let newAverageRating = 0;
        if (newCount > 0) {
          const oldTotal = currentRating * currentCount;
          const newTotal = oldTotal + existingReview.rating;
          newAverageRating = newTotal / newCount;
        }

        transaction.update(serviceRef, {
          averageRating: newAverageRating,
          reviewCount: newCount,
          updatedAt: now,
        });
      }

      return {success: true, message: "Review restored successfully"};
    });
  } catch (error) {
    console.error("Error in restoreReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Bulk update review status (admin only)
 */
exports.bulkUpdateReviewStatus = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewIds, status} = payload;
  console.log("Bulk Update Review Status Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review IDs array is required",
    );
  }

  if (status !== "Visible" && status !== "Hidden") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Status must be 'Visible' or 'Hidden'",
    );
  }

  try {
    const updated = [];
    const errors = [];

    // Process reviews in batches to avoid transaction limits
    const batchSize = 500; // Firestore batch write limit
    for (let i = 0; i < reviewIds.length; i += batchSize) {
      const batch = db.batch();
      const batchIds = reviewIds.slice(i, i + batchSize);

      // Get all reviews from both collections
      const reviewPromises = batchIds.map(async (id) => {
        const reviewDoc = await db.collection("reviews").doc(id).get();
        if (reviewDoc.exists) {
          return {id, doc: reviewDoc, collection: "reviews"};
        }
        const providerReviewDoc = await db.collection("providerReviews").doc(id).get();
        if (providerReviewDoc.exists) {
          return {id, doc: providerReviewDoc, collection: "providerReviews"};
        }
        return {id, doc: null, collection: null};
      });

      const reviewDocs = await Promise.all(reviewPromises);

      // Update each review
      for (const {id: reviewId, doc: reviewDoc, collection: collectionName} of reviewDocs) {
        if (!reviewDoc || !collectionName) {
          errors.push({reviewId, error: "Review not found"});
          continue;
        }

        const reviewRef = db.collection(collectionName).doc(reviewId);
        batch.update(reviewRef, {
          status: status,
          updatedAt: new Date().toISOString(),
        });

        updated.push(reviewId);
      }

      // Commit batch
      await batch.commit();
    }

    return {
      success: true,
      updated: updated,
      errors: errors,
    };
  } catch (error) {
    console.error("Error in bulkUpdateReviewStatus:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Calculate average rating for a provider
 */
exports.calculateProviderRating = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {providerId} = payload;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required",
    );
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("providerId", "==", providerId)
      .where("status", "==", "Visible")
      .get();

    if (reviewsSnap.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "No reviews found for this provider",
      );
    }

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnap.forEach((doc) => {
      const review = doc.data();
      totalRating += review.rating;
      reviewCount++;
    });

    const averageRating = totalRating / reviewCount;

    return {
      success: true,
      data: {
        averageRating,
        reviewCount,
        providerId,
      },
    };
  } catch (error) {
    console.error("Error in calculateProviderRating:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Calculate average rating for a service
 */
exports.calculateServiceRating = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {serviceId} = payload;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required",
    );
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("serviceId", "==", serviceId)
      .where("status", "==", "Visible")
      .get();

    if (reviewsSnap.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "No reviews found for this service",
      );
    }

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnap.forEach((doc) => {
      const review = doc.data();
      totalRating += review.rating;
      reviewCount++;
    });

    const averageRating = totalRating / reviewCount;

    return {
      success: true,
      data: {
        averageRating,
        reviewCount,
        serviceId,
      },
    };
  } catch (error) {
    console.error("Error in calculateServiceRating:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Calculate user average rating (reviews given by user)
 */
exports.calculateUserAverageRating = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {userId} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Use authenticated user's ID if no userId provided, or validate admin access
  const targetUserId = userId || authInfo.uid;
  if (userId && userId !== authInfo.uid && !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to view other user's rating statistics",
    );
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("clientId", "==", targetUserId)
      .where("status", "==", "Visible")
      .get();

    if (reviewsSnap.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "No reviews found for this user",
      );
    }

    let totalRating = 0;
    let reviewCount = 0;

    reviewsSnap.forEach((doc) => {
      const review = doc.data();
      totalRating += review.rating;
      reviewCount++;
    });

    const averageRating = totalRating / reviewCount;

    return {
      success: true,
      data: {
        averageRating,
        reviewCount,
        userId: targetUserId,
      },
    };
  } catch (error) {
    console.error("Error in calculateUserAverageRating:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all reviews (admin function)
 */
exports.getAllReviews = functions.https.onCall(async (data, context) => {
  // Authentication - Admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  // Extract payload for pagination
  const payload = data.data.data || data;
  const {limit = 50, offset = 0, status = null} = payload;

  // Convert limit and offset to integers
  const limitInt = parseInt(limit) || 50;
  const offsetInt = parseInt(offset) || 0;

  try {
    let query = db.collection("reviews").orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.limit(limitInt).offset(offsetInt);

    const reviewsSnap = await query.get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getAllReviews:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get review statistics (admin function)
 */
exports.getReviewStatistics = functions.https.onCall(async (data, context) => {
  // Authentication - Admin only
  const authInfo = getAuthInfo(context, data);
  // Removed the is not an admin
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  try {
    // Get counts for each status
    const [visibleSnap, hiddenSnap, flaggedSnap, deletedSnap] = await Promise.all([
      db.collection("reviews").where("status", "==", "Visible").get(),
      db.collection("reviews").where("status", "==", "Hidden").get(),
      db.collection("reviews").where("status", "==", "Flagged").get(),
      db.collection("reviews").where("status", "==", "Deleted").get(),
    ]);

    const statistics = {
      totalReviews: visibleSnap.size + hiddenSnap.size + flaggedSnap.size + deletedSnap.size,
      activeReviews: visibleSnap.size,
      hiddenReviews: hiddenSnap.size,
      flaggedReviews: flaggedSnap.size,
      deletedReviews: deletedSnap.size,
    };

    return {success: true, data: statistics};
  } catch (error) {
    console.error("Error in getReviewStatistics:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Flag a review for moderation (admin function)
 */
exports.flagReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {reviewId, reason} = payload;

  // Authentication - Admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  if (!reviewId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Review ID is required",
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Review not found",
        );
      }

      const review = reviewSnap.data();
      const now = new Date().toISOString();

      const updatedReview = {
        ...review,
        status: "Flagged",
        flaggedAt: now,
        flaggedBy: authInfo.uid,
        flagReason: reason || "Review flagged for moderation",
        updatedAt: now,
      };

      transaction.update(reviewRef, updatedReview);

      return {success: true, message: "Review flagged successfully"};
    });
  } catch (error) {
    console.error("Error in flagReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get reviews for a specific provider
 */
exports.getProviderReviews = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {providerId, limit = 20, offset = 0} = payload;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required",
    );
  }

  // Convert limit and offset to integers
  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("providerId", "==", providerId)
      .where("status", "==", "Visible")
      .orderBy("createdAt", "desc")
      .limit(limitInt)
      .offset(offsetInt)
      .get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getProviderReviews:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get reviews for a service with pagination
 */
exports.getServiceReviews = functions.https.onCall(async (data, _context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {serviceId, limit = 20, offset = 0} = payload;
  console.log("Get Service Reviews ", payload);

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required",
    );
  }

  // Convert limit and offset to integers
  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("serviceId", "==", serviceId)
      .where("status", "==", "Visible")
      .orderBy("createdAt", "desc")
      .limit(limitInt)
      .offset(offsetInt)
      .get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getServiceReviews:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Submit a provider review for a client
 * This allows providers to rate clients after service completion
 */
exports.submitProviderReview = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {bookingId, rating, comment = ""} = payload;
  console.log("Submit Provider Review Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Input validation
  if (!bookingId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Booking ID is required",
    );
  }

  if (!isValidRating(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      // Get the booking
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Booking not found",
        );
      }

      const booking = bookingSnap.data();

      // Verify the authenticated user is the provider
      if (booking.providerId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the service provider can review the client",
        );
      }

      // Verify booking is completed
      if (booking.status !== "Completed") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Can only review completed bookings",
        );
      }

      // Check if within review window
      if (!isWithinReviewWindow(booking.completedDate)) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          `Review window has expired. Reviews must be submitted within 
          ${REVIEW_WINDOW_DAYS} days of service completion`,
        );
      }

      // Check if provider already reviewed this client for this booking
      const existingReviewsSnap = await db
        .collection("providerReviews")
        .where("bookingId", "==", bookingId)
        .where("providerId", "==", authInfo.uid)
        .get();

      if (!existingReviewsSnap.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "You have already reviewed this client for this booking",
        );
      }

      // Create the provider review
      const reviewId = generateId();
      const now = new Date().toISOString();
      const qualityScore = calculateQualityScore({rating, comment});

      const providerReview = {
        id: reviewId,
        bookingId: bookingId,
        clientId: booking.clientId, // Client being reviewed
        providerId: authInfo.uid, // Provider doing the review
        serviceId: booking.serviceId,
        rating: rating,
        comment: comment,
        createdAt: now,
        updatedAt: now,
        status: "Visible",
        qualityScore: qualityScore,
        reviewType: "ProviderToClient", // Distinguish from client-to-provider reviews
      };

      // Save to providerReviews collection
      const reviewRef = db.collection("providerReviews").doc(reviewId);
      transaction.set(reviewRef, providerReview);

      // Update booking to mark that provider has reviewed
      transaction.update(bookingRef, {
        providerReviewSubmitted: true,
        updatedAt: now,
      });

      return {
        success: true,
        message: "Provider review submitted successfully",
        data: providerReview,
      };
    });

    // Process review for client reputation with AI sentiment analysis
    console.log(
      `🌟 [submitProviderReview] Processing provider review for ` +
      `client reputation with AI`,
    );
    await processReviewForReputationInternal(result.data, true);
    console.log(
      `✅ [submitProviderReview] Provider review processed ` +
      `for reputation successfully`,
    );

    // Check for consecutive bad reviews and auto-create report if needed
    // This is done outside the transaction to avoid long-running operations
    // Check both scenarios:
    // 1. Provider gives 5 consecutive bad reviews (to clients)
    // 2. Client receives 5 consecutive bad reviews (from providers)
    try {
      const newReview = result.data;
      const providerId = newReview.providerId;
      const clientId = newReview.clientId;

      console.log(`📊 [submitProviderReview] Checking for consecutive bad reviews...`);

      // Scenario 1: Provider gives consecutive bad reviews
      await checkConsecutiveBadReviews(
        "providerReviews",
        "providerId",
        providerId,
        newReview,
        "given",
        "provider",
      );

      // Scenario 2: Client receives consecutive bad reviews
      await checkConsecutiveBadReviews(
        "providerReviews",
        "clientId",
        clientId,
        newReview,
        "received",
        "client",
      );
    } catch (reportError) {
      // Don't fail the review submission if report creation fails - just log it
      console.error(`⚠️ [submitProviderReview] Failed to check/create auto-report
        for consecutive bad reviews: ${reportError.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error in submitProviderReview:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get provider reviews for a specific client
 * Shows what providers have said about a client
 */
exports.getClientProviderReviews = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {clientId, limit = 20, offset = 0, includeHidden = false} = payload;

  if (!clientId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Client ID is required",
    );
  }

  // Convert limit and offset to integers
  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  // Authentication check
  const authInfo = getAuthInfo(context, data);

  // Only admins can request hidden reviews
  const showAll = includeHidden && authInfo.isAdmin;

  console.log("[getClientProviderReviews] includeHidden:",
    includeHidden, "isAdmin:", authInfo.isAdmin, "showAll:", showAll);

  try {
    let query = db
      .collection("providerReviews")
      .where("clientId", "==", clientId);

    // Only filter by status if not showing all (admin only)
    if (!showAll) {
      query = query.where("status", "==", "Visible");
    }

    const reviewsSnap = await query
      .orderBy("createdAt", "desc")
      .limit(limitInt)
      .offset(offsetInt)
      .get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getClientProviderReviews:", error);
    // If the query fails due to missing index, try fetching all and filtering client-side
    if (error.code === 8 || error.message?.includes("index")) {
      console.log("[getClientProviderReviews] Falling back to client-side filtering");
      try {
        const allReviewsSnap = await db
          .collection("providerReviews")
          .where("clientId", "==", clientId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          const reviewData = doc.data();
          if (showAll || reviewData.status === "Visible" || !reviewData.status) {
            allReviews.push(reviewData);
          }
        });

        // Sort and paginate client-side
        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
        return {success: true, data: paginated};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new functions.https.HttpsError("internal", fallbackError.message);
      }
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get reviews given by a provider (reviews they wrote about clients)
 * Shows what a provider has said about clients
 */
exports.getProviderReviewsByProvider = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data.data || data;
  const {providerId, limit = 20, offset = 0, includeHidden = false} = payload;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required",
    );
  }

  // Convert limit and offset to integers
  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  // Authentication check
  const authInfo = getAuthInfo(context, data);

  // Only admins can request hidden reviews
  const showAll = includeHidden && authInfo.isAdmin;

  console.log("[getProviderReviewsByProvider] includeHidden:",
    includeHidden, "isAdmin:", authInfo.isAdmin, "showAll:", showAll);

  try {
    let query = db
      .collection("providerReviews")
      .where("providerId", "==", providerId);

    // Only filter by status if not showing all (admin only)
    if (!showAll) {
      query = query.where("status", "==", "Visible");
    }

    query = query
      .orderBy("createdAt", "desc")
      .limit(limitInt)
      .offset(offsetInt);

    const reviewsSnap = await query.get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getProviderReviewsByProvider:", error);
    // If the query fails due to missing index, try fetching all and filtering client-side
    if (error.code === 8 || error.message?.includes("index")) {
      console.log("[getProviderReviewsByProvider] Falling back to client-side filtering");
      try {
        const allReviewsSnap = await db
          .collection("providerReviews")
          .where("providerId", "==", providerId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          const reviewData = doc.data();
          if (showAll || reviewData.status === "Visible" || !reviewData.status) {
            allReviews.push(reviewData);
          }
        });

        // Sort and paginate client-side
        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
        return {success: true, data: paginated};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new functions.https.HttpsError("internal", fallbackError.message);
      }
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});
