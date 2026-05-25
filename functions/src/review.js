/**
 * Review Management Cloud Functions
 *
 * This module handles all review-related operations
 * Consolidated into a single entrypoint following the Firebase optimization guidelines
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getFirestore} = require("../firebase-admin");

const {
  processReviewForReputationInternal,
} = require("./reputation");

const db = getFirestore();

// Constants
const REVIEW_WINDOW_DAYS = 30;
const MAX_COMMENT_LENGTH = 500;
const MIN_RATING = 1;
const MAX_RATING = 5;

/**
 * Get authentication info from context
 * @param {Object} context
 * @param {Object} data
 * @return {Object} Auth info with uid, isAdmin, hasAuth
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

/**
 * Generate a unique ID
 * @return {string} Generated ID
 */
function generateId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${now}-${random}`;
}

/**
 * Check if rating is within valid range
 * @param {number} rating
 * @return {boolean} Whether rating is valid
 */
function isValidRating(rating) {
  return rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * Check if review is within the allowed window
 * @param {string} completedAt
 * @return {boolean} Whether within review window
 */
function isWithinReviewWindow(completedAt) {
  const completedTime = new Date(completedAt).getTime();
  const now = Date.now();
  const windowInMs = REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return (now - completedTime) <= windowInMs;
}

/**
 * Calculate quality score for a review
 * @param {Object} review
 * @return {number} Quality score
 */
function calculateQualityScore(review) {
  const commentLength = review.comment.length;
  const maxLength = MAX_COMMENT_LENGTH;
  const lengthScore = commentLength / maxLength;
  const ratingScore = review.rating / MAX_RATING;
  return (lengthScore + ratingScore) / 2.0;
}

// ============================================================================
// SERVICE LAYER FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Submit a review for a completed booking
 * @param {Object} request
 * @return {Promise<Object>} Result object Result object
 */
async function submitReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, rating, comment = ""} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "Booking ID is required");
  }

  if (!isValidRating(rating)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const booking = bookingSnap.data();

      const existingReviewsSnap = await db
        .collection("reviews")
        .where("bookingId", "==", bookingId)
        .where("clientId", "==", authInfo.uid)
        .get();

      if (!existingReviewsSnap.empty) {
        throw new HttpsError("already-exists", "Review already exists for this booking");
      }

      const serviceRef = db.collection("services").doc(booking.serviceId);
      const serviceSnap = await transaction.get(serviceRef);

      if (booking.clientId !== authInfo.uid) {
        throw new HttpsError("permission-denied", "Not authorized to review this booking");
      }

      if (booking.status !== "Completed" || !booking.completedDate) {
        throw new HttpsError(
          "failed-precondition",
          "Booking is not completed yet. Cannot submit review until service is completed.",
        );
      }

      if (!isWithinReviewWindow(booking.completedDate)) {
        const msg = `Review window has expired. Reviews must be submitted within ` +
          `${REVIEW_WINDOW_DAYS} days of service completion`;
        throw new HttpsError("deadline-exceeded", msg);
      }

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
        qualityScore: calculateQualityScore({rating, comment}),
      };

      const reviewRef = db.collection("reviews").doc(reviewId);
      transaction.set(reviewRef, newReview);

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

    await processReviewForReputationInternal(result.data, true);
    return result;
  } catch (error) {
    console.error("Error in submitReview:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get a review by ID
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getReview_review(request) {
  const data = request.data;
  const payload = data.data || data;
  const {reviewId} = payload;

  if (!reviewId) {
    throw new HttpsError("invalid-argument", "Review ID is required");
  }

  try {
    const reviewSnap = await db.collection("reviews").doc(reviewId).get();

    if (!reviewSnap.exists) {
      throw new HttpsError("not-found", "Review not found");
    }

    const review = reviewSnap.data();

    if (review.status === "Hidden") {
      throw new HttpsError("permission-denied", "Review has been hidden");
    }

    return {success: true, data: review};
  } catch (error) {
    console.error("Error in getReview:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all reviews for a booking
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getBookingReviews_review(request) {
  const data = request.data;
  const payload = data.data || data;
  const {bookingId} = payload;

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "Booking ID is required");
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get reviews by a user
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getUserReviews_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId, includeHidden = false} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetUserId = userId || authInfo.uid;
  const showAll = includeHidden && authInfo.isAdmin;

  try {
    if (showAll) {
      const allReviewsSnap = await db
        .collection("reviews")
        .where("clientId", "==", targetUserId)
        .get();

      const allReviews = [];
      allReviewsSnap.forEach((doc) => {
        allReviews.push(doc.data());
      });

      const sorted = allReviews.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      return {success: true, data: sorted};
    }

    const query = db
      .collection("reviews")
      .where("clientId", "==", targetUserId)
      .where("status", "==", "Visible");

    const reviewsSnap = await query.orderBy("createdAt", "desc").get();

    const reviews = [];
    reviewsSnap.forEach((doc) => {
      reviews.push(doc.data());
    });

    return {success: true, data: reviews};
  } catch (error) {
    console.error("Error in getUserReviews:", error);
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

        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        return {success: true, data: sorted};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new HttpsError("internal", fallbackError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Update an existing review
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function updateReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {reviewId, rating, comment = ""} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!reviewId) {
    throw new HttpsError("invalid-argument", "Review ID is required");
  }

  if (!isValidRating(rating)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new HttpsError("not-found", "Review not found");
      }

      const existingReview = reviewSnap.data();
      const serviceRef = db.collection("services").doc(existingReview.serviceId);
      const serviceSnap = await transaction.get(serviceRef);

      if (existingReview.clientId !== authInfo.uid) {
        throw new HttpsError("permission-denied", "Not authorized to update this review");
      }

      if (existingReview.status !== "Visible") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot update a ${existingReview.status} review`,
        );
      }

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        rating: rating,
        comment: comment,
        updatedAt: now,
        qualityScore: calculateQualityScore({rating, comment}),
      };

      transaction.update(reviewRef, updatedReview);

      if (existingReview.rating !== rating && serviceSnap.exists) {
        const service = serviceSnap.data();
        const currentRating = service.averageRating || 0;
        const reviewCount = service.reviewCount || 1;

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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Delete (hide) a review
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function deleteReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {reviewId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!reviewId) {
    throw new HttpsError("invalid-argument", "Review ID is required");
  }

  try {
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
      throw new HttpsError("not-found", "Review not found");
    }

    return await db.runTransaction(async (transaction) => {
      const reviewRef = db.collection(reviewCollection).doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new HttpsError("not-found", "Review not found");
      }

      let serviceRef = null;
      let serviceSnap = null;
      if (reviewCollection === "reviews" && existingReview.serviceId) {
        serviceRef = db.collection("services").doc(existingReview.serviceId);
        serviceSnap = await transaction.get(serviceRef);
      }

      const isOwner = reviewCollection === "reviews" ? existingReview.clientId === authInfo.uid :
        existingReview.providerId === authInfo.uid;

      if (!isOwner && !authInfo.isAdmin) {
        throw new HttpsError("permission-denied", "Not authorized to delete this review");
      }

      if (existingReview.status === "Hidden") {
        throw new HttpsError("already-exists", "Review is already hidden");
      }

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        status: "Hidden",
        updatedAt: now,
      };

      transaction.update(reviewRef, updatedReview);

      if (reviewCollection === "reviews" && serviceSnap && serviceSnap.exists) {
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Restore a hidden review
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function restoreReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {reviewId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  if (!reviewId) {
    throw new HttpsError("invalid-argument", "Review ID is required");
  }

  try {
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
      throw new HttpsError("not-found", "Review not found");
    }

    return await db.runTransaction(async (transaction) => {
      const reviewRef = db.collection(reviewCollection).doc(reviewId);

      let serviceRef = null;
      let serviceSnap = null;
      if (reviewCollection === "reviews" && existingReview.serviceId) {
        serviceRef = db.collection("services").doc(existingReview.serviceId);
        serviceSnap = await transaction.get(serviceRef);
      }

      if (existingReview.status !== "Hidden") {
        throw new HttpsError("failed-precondition", "Review is not hidden");
      }

      const now = new Date().toISOString();
      const updatedReview = {
        ...existingReview,
        status: "Visible",
        updatedAt: now,
      };

      transaction.update(reviewRef, updatedReview);

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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Bulk update review statuses
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function bulkUpdateReviewStatus_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {reviewIds, status} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new HttpsError("invalid-argument", "Review IDs array is required");
  }

  if (status !== "Visible" && status !== "Hidden") {
    throw new HttpsError("invalid-argument", "Status must be 'Visible' or 'Hidden'");
  }

  try {
    const updated = [];
    const errors = [];

    const batchSize = 500;
    for (let i = 0; i < reviewIds.length; i += batchSize) {
      const batch = db.batch();
      const batchIds = reviewIds.slice(i, i + batchSize);

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

      for (const {id: rId, doc: reviewDoc, collection: collectionName} of reviewDocs) {
        if (!reviewDoc || !collectionName) {
          errors.push({reviewId: rId, error: "Review not found"});
          continue;
        }

        const reviewRef = db.collection(collectionName).doc(rId);
        batch.update(reviewRef, {
          status: status,
          updatedAt: new Date().toISOString(),
        });

        updated.push(rId);
      }
      await batch.commit();
    }

    return {
      success: true,
      updated: updated,
      errors: errors,
    };
  } catch (error) {
    console.error("Error in bulkUpdateReviewStatus:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Calculate average rating for a provider
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function calculateProviderRating_review(request) {
  const data = request.data;
  const payload = data.data || data;
  const {providerId} = payload;

  if (!providerId) {
    throw new HttpsError("invalid-argument", "Provider ID is required");
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("providerId", "==", providerId)
      .where("status", "==", "Visible")
      .get();

    if (reviewsSnap.empty) {
      throw new HttpsError("not-found", "No reviews found for this provider");
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Calculate average rating for a service
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function calculateServiceRating_review(request) {
  const data = request.data;
  const payload = data.data || data;
  const {serviceId} = payload;

  if (!serviceId) {
    throw new HttpsError("invalid-argument", "Service ID is required");
  }

  try {
    const reviewsSnap = await db
      .collection("reviews")
      .where("serviceId", "==", serviceId)
      .where("status", "==", "Visible")
      .get();

    if (reviewsSnap.empty) {
      throw new HttpsError("not-found", "No reviews found for this service");
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Calculate average rating for a user
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function calculateUserAverageRating_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {userId} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const targetUserId = userId || authInfo.uid;
  if (userId && userId !== authInfo.uid && !authInfo.isAdmin) {
    throw new HttpsError(
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
      throw new HttpsError("not-found", "No reviews found for this user");
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get all reviews (admin only)
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getAllReviews_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {limit = 50, offset = 0, status = null} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get review statistics
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getReviewStatistics_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  try {
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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Flag a review for moderation
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function flagReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {reviewId, reason} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  if (!reviewId) {
    throw new HttpsError("invalid-argument", "Review ID is required");
  }

  try {
    return await db.runTransaction(async (transaction) => {
      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await transaction.get(reviewRef);

      if (!reviewSnap.exists) {
        throw new HttpsError("not-found", "Review not found");
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
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get reviews for a provider
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getProviderReviews_review(request) {
  const data = request.data;
  const payload = data.data || data;
  const {providerId, limit = 20, offset = 0} = payload;

  if (!providerId) {
    return {success: true, data: []};
  }

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
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get reviews for a service
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getServiceReviews_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {serviceId, limit = 20, offset = 0, includeHidden = false} = payload;

  if (!serviceId) {
    throw new HttpsError("invalid-argument", "Service ID is required");
  }

  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  const authInfo = getAuthInfo(context, data);
  const showAll = includeHidden && authInfo.isAdmin;

  try {
    if (showAll) {
      const allReviewsSnap = await db
        .collection("reviews")
        .where("serviceId", "==", serviceId)
        .get();

      const allReviews = [];
      allReviewsSnap.forEach((doc) => {
        allReviews.push(doc.data());
      });

      const sorted = allReviews.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
      return {success: true, data: paginated};
    }

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
    if (error.code === 8 || error.message?.includes("index")) {
      console.log("[getServiceReviews] Falling back to client-side filtering due to index issue");
      try {
        const allReviewsSnap = await db
          .collection("reviews")
          .where("serviceId", "==", serviceId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          const reviewData = doc.data();
          if (showAll || reviewData.status === "Visible" || !reviewData.status) {
            allReviews.push(reviewData);
          }
        });

        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
        return {success: true, data: paginated};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new HttpsError("internal", fallbackError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Submit a provider review for a client
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function submitProviderReview_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {bookingId, rating, comment = ""} = payload;

  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!bookingId) {
    throw new HttpsError("invalid-argument", "Booking ID is required");
  }

  if (!isValidRating(rating)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed`,
    );
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const booking = bookingSnap.data();

      if (booking.providerId !== authInfo.uid) {
        throw new HttpsError(
          "permission-denied",
          "Only the service provider can review the client",
        );
      }

      if (booking.status !== "Completed") {
        throw new HttpsError(
          "failed-precondition",
          "Can only review completed bookings",
        );
      }

      if (!isWithinReviewWindow(booking.completedDate)) {
        const msg = `Review window has expired. Reviews must be submitted within ` +
          `${REVIEW_WINDOW_DAYS} days of service completion`;
        throw new HttpsError("deadline-exceeded", msg);
      }

      const existingReviewsSnap = await db
        .collection("providerReviews")
        .where("bookingId", "==", bookingId)
        .where("providerId", "==", authInfo.uid)
        .get();

      if (!existingReviewsSnap.empty) {
        throw new HttpsError(
          "already-exists",
          "You have already reviewed this client for this booking",
        );
      }

      const reviewId = generateId();
      const now = new Date().toISOString();
      const qualityScore = calculateQualityScore({rating, comment});

      const providerReview = {
        id: reviewId,
        bookingId: bookingId,
        clientId: booking.clientId,
        providerId: authInfo.uid,
        serviceId: booking.serviceId,
        rating: rating,
        comment: comment,
        createdAt: now,
        updatedAt: now,
        status: "Visible",
        qualityScore: qualityScore,
        reviewType: "ProviderToClient",
      };

      const reviewRef = db.collection("providerReviews").doc(reviewId);
      transaction.set(reviewRef, providerReview);

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

    await processReviewForReputationInternal(result.data, true);

    return result;
  } catch (error) {
    console.error("Error in submitProviderReview:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get provider reviews for a client
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getClientProviderReviews_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {clientId, limit = 20, offset = 0, includeHidden = false} = payload;

  if (!clientId) {
    throw new HttpsError("invalid-argument", "Client ID is required");
  }

  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  const authInfo = getAuthInfo(context, data);
  const showAll = includeHidden && authInfo.isAdmin;

  try {
    let query = db
      .collection("providerReviews")
      .where("clientId", "==", clientId);

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

        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
        return {success: true, data: paginated};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new HttpsError("internal", fallbackError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

/**
 * Get provider reviews by provider ID
 * @param {Object} request
 * @return {Promise<Object>} Result object
 */
async function getProviderReviewsByProvider_review(request) {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  const payload = data.data || data;
  const {providerId, limit = 20, offset = 0, includeHidden = false} = payload;

  if (!providerId) {
    throw new HttpsError("invalid-argument", "Provider ID is required");
  }

  const limitInt = parseInt(limit) || 20;
  const offsetInt = parseInt(offset) || 0;

  const authInfo = getAuthInfo(context, data);
  const showAll = includeHidden && authInfo.isAdmin;

  try {
    let query = db
      .collection("providerReviews")
      .where("providerId", "==", providerId);

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

        const sorted = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

        const paginated = sorted.slice(offsetInt, offsetInt + limitInt);
        return {success: true, data: paginated};
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw new HttpsError("internal", fallbackError.message);
      }
    }
    throw new HttpsError("internal", error.message);
  }
}

// ============================================================================
// TRANSPORT LAYER: SINGLE CONSOLIDATED ENTRYPOINT
// ============================================================================

exports.reviewAction = onCall(
  {
    memory: "256MiB",
  },
  async (request) => {
    const {action} = request.data || {};

    if (!action) {
      throw new HttpsError("invalid-argument", "An action must be specified.");
    }

    try {
      switch (action) {
      case "submitReview":
        return await submitReview_review(request);
      case "getReview":
        return await getReview_review(request);
      case "getBookingReviews":
        return await getBookingReviews_review(request);
      case "getUserReviews":
        return await getUserReviews_review(request);
      case "updateReview":
        return await updateReview_review(request);
      case "deleteReview":
        return await deleteReview_review(request);
      case "restoreReview":
        return await restoreReview_review(request);
      case "bulkUpdateReviewStatus":
        return await bulkUpdateReviewStatus_review(request);
      case "calculateProviderRating":
        return await calculateProviderRating_review(request);
      case "calculateServiceRating":
        return await calculateServiceRating_review(request);
      case "calculateUserAverageRating":
        return await calculateUserAverageRating_review(request);
      case "getAllReviews":
        return await getAllReviews_review(request);
      case "getReviewStatistics":
        return await getReviewStatistics_review(request);
      case "flagReview":
        return await flagReview_review(request);
      case "getProviderReviews":
        return await getProviderReviews_review(request);
      case "getServiceReviews":
        return await getServiceReviews_review(request);
      case "submitProviderReview":
        return await submitProviderReview_review(request);
      case "getClientProviderReviews":
        return await getClientProviderReviews_review(request);
      case "getProviderReviewsByProvider":
        return await getProviderReviewsByProvider_review(request);
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
