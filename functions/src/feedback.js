const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_COMMENT_LENGTH = 1000;

/**
 * Generate a unique feedback ID
 * @return {string} Unique feedback ID
 */
function generateFeedbackId() {
  const timestamp = Date.now(); // Convert to seconds
  const random = Math.floor(Math.random() * 10000);
  return `feedback_${timestamp}_${random}`;
}

/**
 * Generate a unique report ID
 * @return {string} Unique report ID
 */
function generateReportId() {
  const timestamp = Date.now(); // Convert to seconds
  const random = Math.floor(Math.random() * 10000);
  return `report_${timestamp}_${random}`;
}

/**
 * Validate rating is within acceptable range
 * @param {number} rating - Rating to validate
 * @return {boolean} True if rating is valid
 */
function validateRating(rating) {
  return rating >= MIN_RATING && rating <= MAX_RATING;
}

/**
 * Validate comment length
 * @param {string|null} comment - Comment to validate
 * @return {boolean} True if comment is valid
 */
function validateComment(comment) {
  if (comment === null || comment === undefined) {
    return true;
  }
  return comment.length <= MAX_COMMENT_LENGTH;
}

/**
 * Validate description length
 * @param {string} description - Description to validate
 * @return {boolean} True if description is valid
 */
function validateDescription(description) {
  return description && description.length > 0 && description.length <= MAX_COMMENT_LENGTH;
}

/**
 * Submit feedback
 */
exports.submitFeedback = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {rating, comment = null} = payload;
  console.log("Submit Feedback Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "Anonymous principal not allowed",
    );
  }

  // Validate input - mirror Motoko validation
  if (!validateRating(rating)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid rating. Must be between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }

  if (!validateComment(comment)) {
    throw new HttpsError(
      "invalid-argument",
      `Comment too long. Maximum ${MAX_COMMENT_LENGTH} characters`,
    );
  }

  try {
    // Get user profile from Firestore users collection
    const userRef = db.collection("users").doc(authInfo.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found");
    }

    const userProfile = userSnap.data();
    console.log("User profile data:", userProfile);

    const feedbackId = generateFeedbackId();
    const newFeedback = {
      id: feedbackId,
      userId: authInfo.uid,
      userName: userProfile?.name || "Unknown",
      userPhone: userProfile?.phone || "Unknown",
      rating: Number(rating), // Ensure it's a safe number
      comment: comment || null,
      createdAt: new Date().toISOString(),
    };

    console.log("New feedback object:", newFeedback);

    // Save feedback to Firestore
    await db.collection("app_feedback").doc(feedbackId).set(newFeedback);

    return {success: true, data: newFeedback};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in submitFeedback:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get all feedback (admin function)
 */
exports.getAllFeedback = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  console.log("Get All Feedback Payload", payload);

  // Authentication - admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  try {
    const feedbackSnap = await db.collection("app_feedback")
      .orderBy("createdAt", "desc")
      .get();

    const feedbackArray = [];
    feedbackSnap.forEach((doc) => {
      feedbackArray.push(doc.data());
    });

    return {success: true, data: feedbackArray};
  } catch (error) {
    console.error("Error in getAllFeedback:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get feedback by user
 */
exports.getMyFeedback = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  console.log("Get My Feedback Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "Anonymous principal not allowed",
    );
  }

  try {
    const feedbackSnap = await db.collection("app_feedback")
      .where("userId", "==", authInfo.uid)
      .orderBy("createdAt", "desc")
      .get();

    const userFeedback = [];
    feedbackSnap.forEach((doc) => {
      userFeedback.push(doc.data());
    });

    return {success: true, data: userFeedback};
  } catch (error) {
    console.error("Error in getMyFeedback:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get feedback statistics
 */
exports.getFeedbackStats = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  console.log("Get Feedback Stats Payload", payload);

  try {
    const feedbackSnap = await db.collection("app_feedback").get();
    const allFeedback = [];
    feedbackSnap.forEach((doc) => {
      allFeedback.push(doc.data());
    });

    const totalFeedback = allFeedback.length;

    if (totalFeedback === 0) {
      return {
        success: true,
        data: {
          totalFeedback: 0,
          averageRating: 0.0,
          ratingDistribution: [],
          totalWithComments: 0,
          latestFeedback: null,
        },
      };
    }

    // Calculate statistics - mirror Motoko logic
    let totalRating = 0;
    let commentsCount = 0;
    const ratingCounts = [0, 0, 0, 0, 0, 0]; // Index 0 unused, 1-5 for ratings

    for (const feedback of allFeedback) {
      totalRating += feedback.rating;

      // Count rating distribution
      ratingCounts[feedback.rating] += 1;

      // Count comments
      if (feedback.comment) {
        commentsCount += 1;
      }
    }

    const averageRating = totalRating / totalFeedback;

    // Create rating distribution array
    const distribution = [];
    for (let rating = 1; rating <= 5; rating++) {
      distribution.push([rating, ratingCounts[rating]]);
    }

    // Sort feedback by creation time (newest first)
    allFeedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestFeedback = allFeedback.length > 0 ? allFeedback[0] : null;

    const stats = {
      totalFeedback: totalFeedback,
      averageRating: averageRating,
      ratingDistribution: distribution,
      totalWithComments: commentsCount,
      latestFeedback: latestFeedback,
    };

    return {success: true, data: stats};
  } catch (error) {
    console.error("Error in getFeedbackStats:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get feedback by ID
 */
exports.getFeedbackById = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {feedbackId} = payload;
  console.log("Get Feedback By ID Payload", payload);

  // Validation
  if (!feedbackId) {
    throw new HttpsError(
      "invalid-argument",
      "Feedback ID is required",
    );
  }

  try {
    const feedbackSnap = await db.collection("app_feedback").doc(feedbackId).get();

    if (!feedbackSnap.exists) {
      throw new HttpsError("not-found", "Feedback not found");
    }

    return {success: true, data: feedbackSnap.data()};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in getFeedbackById:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get recent feedback (limited number)
 */
exports.getRecentFeedback = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {limit} = payload;
  console.log("Get Recent Feedback Payload", payload);

  // Validation
  if (!limit || limit <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Limit must be a positive number",
    );
  }

  try {
    const feedbackSnap = await db.collection("app_feedback")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const recentFeedback = [];
    feedbackSnap.forEach((doc) => {
      recentFeedback.push(doc.data());
    });

    return {success: true, data: recentFeedback};
  } catch (error) {
    console.error("Error in getRecentFeedback:", error);
    throw new HttpsError("internal", error.message);
  }
});

// ========== REPORT FUNCTIONS ==========

/**
 * Submit report
 */
exports.submitReport = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {description, attachments = []} = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "Anonymous principal not allowed",
    );
  }

  // Validate input - mirror Motoko validation
  if (!validateDescription(description)) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid description. Must be between 1 and ${MAX_COMMENT_LENGTH} characters`,
    );
  }

  // Validate attachments array
  if (attachments && !Array.isArray(attachments)) {
    throw new HttpsError(
      "invalid-argument",
      "Attachments must be an array",
    );
  }

  if (attachments && attachments.length > 5) {
    throw new HttpsError(
      "invalid-argument",
      "Maximum 5 attachments allowed per report",
    );
  }

  try {
    // Get user profile from Firestore users collection
    const userRef = db.collection("users").doc(authInfo.uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User profile not found");
    }

    const userProfile = userSnap.data();
    console.log("User profile data for report:", userProfile);

    // Determine user's actual role from profile
    const userActiveRole = userProfile?.activeRole || "Client";
    const isProvider = userActiveRole === "ServiceProvider";
    const correctSource = isProvider ? "provider_report" : "client_report";

    // Parse and validate the description to ensure source matches user's role
    let finalDescription = String(description);
    try {
      // Try to parse description as JSON (structured report format)
      const parsedDesc = JSON.parse(description);
      if (parsedDesc && typeof parsedDesc === "object") {
        // Override source field to match user's actual role
        parsedDesc.source = correctSource;
        finalDescription = JSON.stringify(parsedDesc);
      }
    } catch (e) {
      // Description is not JSON, create structured format with correct source
      finalDescription = JSON.stringify({
        title: "User Report",
        description: String(description),
        category: "other",
        timestamp: new Date().toISOString(),
        source: correctSource,
      });
    }

    // Extract media IDs from URLs if needed
    // Attachments should be media IDs, but support both URL and ID formats
    const mediaIds = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        // If it's a URL, query Firestore to find the media ID
        if (attachment.startsWith("http://") || attachment.startsWith("https://")) {
          const mediaSnapshot = await db
            .collection("media")
            .where("url", "==", attachment)
            .limit(1)
            .get();

          if (!mediaSnapshot.empty) {
            mediaIds.push(mediaSnapshot.docs[0].id);
          } else {
            console.warn("Media not found for URL:", attachment);
          }
        } else {
          // Assume it's already a media ID
          mediaIds.push(attachment);
        }
      }
    }

    const reportId = generateReportId();
    const newReport = {
      id: reportId,
      userId: authInfo.uid,
      userName: userProfile?.name || "Unknown",
      userPhone: userProfile?.phone || "Unknown",
      description: finalDescription,
      attachments: mediaIds,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    console.log("New report object:", newReport);

    // Save report to Firestore
    await db.collection("reports").doc(reportId).set(newReport);

    return {success: true, data: newReport};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in submitReport:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get all reports (admin function)
 * Mirrors the Motoko getAllReports function
 */
exports.getAllReports = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Authentication - admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  try {
    const reportsSnap = await db.collection("reports")
      .orderBy("createdAt", "desc")
      .get();

    const reportsArray = [];
    reportsSnap.forEach((doc) => {
      reportsArray.push(doc.data());
    });

    return {success: true, data: reportsArray};
  } catch (error) {
    console.error("Error in getAllReports:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get reports by user
 */
exports.getMyReports = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  console.log("Get My Reports Payload", payload);

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new HttpsError(
      "unauthenticated",
      "Anonymous principal not allowed",
    );
  }

  try {
    const reportsSnap = await db.collection("reports")
      .where("userId", "==", authInfo.uid)
      .orderBy("createdAt", "desc")
      .get();

    const userReports = [];
    reportsSnap.forEach((doc) => {
      userReports.push(doc.data());
    });

    return {success: true, data: userReports};
  } catch (error) {
    console.error("Error in getMyReports:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Update report status (admin function)
 */
exports.updateReportStatus = onCall(async (request) => {
  const data = request.data;
  const context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {reportId, newStatus} = payload;
  console.log("Update Report Status Payload", payload);

  // Authentication - admin only
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  // Validation
  if (!reportId) {
    throw new HttpsError(
      "invalid-argument",
      "Report ID is required",
    );
  }

  if (!newStatus) {
    throw new HttpsError(
      "invalid-argument",
      "New status is required",
    );
  }

  try {
    const reportRef = db.collection("reports").doc(reportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Report not found");
    }

    const existingReport = reportSnap.data();
    const updatedReport = {
      ...existingReport,
      status: newStatus,
    };

    await reportRef.update({status: newStatus});

    return {success: true, data: updatedReport};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in updateReportStatus:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get report statistics
 */
exports.getReportStats = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  console.log("Get Report Stats Payload", payload);

  try {
    const reportsSnap = await db.collection("reports").get();
    const allReports = [];
    reportsSnap.forEach((doc) => {
      allReports.push(doc.data());
    });

    const totalReports = allReports.length;

    if (totalReports === 0) {
      return {
        success: true,
        data: {
          totalReports: 0,
          latestReport: null,
        },
      };
    }

    // Sort reports by creation time (newest first)
    allReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestReport = allReports.length > 0 ? allReports[0] : null;

    const stats = {
      totalReports: totalReports,
      latestReport: latestReport,
    };

    return {success: true, data: stats};
  } catch (error) {
    console.error("Error in getReportStats:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get report by ID
 */
exports.getReportById = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {reportId} = payload;
  console.log("Get Report By ID Payload", payload);

  // Validation
  if (!reportId) {
    throw new HttpsError(
      "invalid-argument",
      "Report ID is required",
    );
  }

  try {
    const reportSnap = await db.collection("reports").doc(reportId).get();

    if (!reportSnap.exists) {
      throw new HttpsError("not-found", "Report not found");
    }

    return {success: true, data: reportSnap.data()};
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error in getReportById:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get recent reports (limited number)
 */
exports.getRecentReports = onCall(async (request) => {
  const data = request.data;
  const _context = {auth: request.auth, rawRequest: request};
  // Extract payload
  const payload = data.data.data || data;
  const {limit} = payload;
  console.log("Get Recent Reports Payload", payload);

  // Validation
  if (!limit || limit <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "Limit must be a positive number",
    );
  }

  try {
    const reportsSnap = await db.collection("reports")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const recentReports = [];
    reportsSnap.forEach((doc) => {
      recentReports.push(doc.data());
    });

    return {success: true, data: recentReports};
  } catch (error) {
    console.error("Error in getRecentReports:", error);
    throw new HttpsError("internal", error.message);
  }
});
