const functions = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getFirestore} = require("../firebase-admin");
const {
  analyzeReviewContent,
  updateReviewWithAnalysis,
  shouldTriggerReport,
  checkConsecutiveBadReviews,
  generateReportId,
} = require("./utils/reviewAnalyzer");
const {getGeminiConfig} = require("./utils/geminiClient");

const db = getFirestore();

const MAX_CONCURRENT_ANALYSES = 5;
let activeAnalyses = 0;

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @return {Promise<void>} Resolves after the delay
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process review analysis with retry logic
 * @param {string} reviewId - Review ID to analyze
 * @param {number} maxRetries - Maximum retry attempts
 * @return {Promise<Object>} Analysis result
 */
async function processReviewAnalysisWithRetry(reviewId, maxRetries = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await reviewRef.get();

      if (!reviewSnap.exists) {
        console.log(`[QueueReviewAnalysis] Review ${reviewId} no longer exists`);
        return {success: false, error: "Review no longer exists"};
      }

      const review = {id: reviewSnap.id, ...reviewSnap.data()};

      if (review.aiAnalysis?.analyzed) {
        console.log(`[QueueReviewAnalysis] Review ${reviewId} already analyzed`);
        return {success: true, cached: true};
      }

      console.log(`[QueueReviewAnalysis] Analyzing review ${reviewId}, attempt ${attempt}`);

      const result = await analyzeReviewContent(review);

      if (!result.success) {
        lastError = result.error;
        console.error(`[QueueReviewAnalysis] Analysis failed for ${reviewId}:`, result.error);

        if (attempt < maxRetries) {
          await delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        return result;
      }

      await updateReviewWithAnalysis(reviewId, result.data);

      console.log(`[QueueReviewAnalysis] Analysis complete for ${reviewId}:`, {
        isSuspicious: result.data.isSuspicious,
        threatLevel: result.data.threatLevel,
        confidence: result.data.confidence,
      });

      return result;
    } catch (error) {
      lastError = error;
      console.error(`[QueueReviewAnalysis] Error processing review ${reviewId}:`, error);

      if (attempt < maxRetries) {
        await delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  return {success: false, error: lastError?.message || "All retries failed"};
}

/**
 * Get AI recommendation based on threat level
 * @param {Object} aiAnalysis - AI analysis results
 * @return {string} Recommendation text
 */
function getAIRecommendation(aiAnalysis) {
  const recommendations = {
    high: "Immediate investigation recommended. " +
      "AI detected coordinated or sophisticated fake review patterns.",
    medium: "Review should be flagged for manual moderation. " +
      "AI detected suspicious patterns with moderate confidence.",
    low: "No immediate action required. " +
      "Patterns should be logged for pattern analysis over time.",
  };

  return recommendations[aiAnalysis.threatLevel] || recommendations.low;
}

/**
 * Create a single consolidated AI report for a suspicious review
 * @param {Object} review - The review object
 * @param {Object} aiAnalysis - AI analysis results
 * @return {Promise<Object>} Report creation result
 */
async function createConsolidatedAIReport(review, aiAnalysis) {
  try {
    const reportId = generateReportId();
    const timestamp = new Date().toISOString();

    const [clientDoc, providerDoc, serviceDoc] = await Promise.all([
      db.collection("users").doc(review.clientId).get(),
      db.collection("users").doc(review.providerId).get(),
      review.serviceId ? db.collection("services").doc(review.serviceId).get() :
        Promise.resolve({exists: false, data: () => ({})}),
    ]);

    const clientName = clientDoc.exists ?
      clientDoc.data()?.name || "Unknown Client" : "Unknown Client";
    const providerName = providerDoc.exists ?
      providerDoc.data()?.name || "Unknown Provider" : "Unknown Provider";
    const serviceName = serviceDoc.exists ?
      serviceDoc.data()?.name || "Unknown Service" : "Unknown Service";

    const recommendation = getAIRecommendation(aiAnalysis);

    const ticketDescription = JSON.stringify({
      title: `Suspicious Review Detected - ${clientName} (given by client)`,
      description:
        `AI analysis flagged a review submitted by client ${clientName} ` +
        `(${review.clientId}) against provider ${providerName} ` +
        `(${review.providerId}) for service "${serviceName}" as suspicious.\n\n` +
        `Review Details:\n` +
        `- Rating: ${review.rating}/5\n` +
        `- Comment: "${review.comment || "No comment"}"\n\n` +
        `AI Analysis:\n` +
        `- Threat Level: ${aiAnalysis.threatLevel}\n` +
        `- Confidence: ${(aiAnalysis.confidence * 100).toFixed(0)}%\n` +
        `- Patterns: ${(aiAnalysis.patterns || []).join(", ") || "None"}\n` +
        `- Summary: ${aiAnalysis.summary}\n\n` +
        `Recommendation: ${recommendation}`,
      category: "service",
      timestamp: timestamp,
      source: "ai_analysis",
      clientId: review.clientId,
      clientName: clientName,
      providerId: review.providerId,
      providerName: providerName,
      serviceId: review.serviceId,
      serviceName: serviceName,
      reviewId: review.id,
      rating: review.rating,
      comment: review.comment || "",
      aiAnalysis: {
        threatLevel: aiAnalysis.threatLevel,
        confidence: aiAnalysis.confidence,
        patterns: aiAnalysis.patterns || [],
        summary: aiAnalysis.summary,
        recommendation: recommendation,
      },
    });

    const reportData = {
      id: reportId,
      userId: review.clientId,
      userName: clientName,
      userPhone: clientDoc.exists ?
        clientDoc.data()?.phone || clientDoc.data()?.phoneNumber || "" : "",
      description: ticketDescription,
      status: "open",
      createdAt: timestamp,
      source: "ai_analysis",
      aiAnalysisTriggered: true,
    };

    await db.collection("reports").doc(reportId).set(reportData);

    console.log(
      `[createConsolidatedAIReport] Created report ${reportId} for review ${review.id}`,
    );

    return {success: true, reportId};
  } catch (error) {
    console.error(`[createConsolidatedAIReport] Failed:`, error);
    return {success: false, error: error.message};
  }
}

/**
 * Background function triggered when a new review is created
 * Analyzes review content using Gemini AI
 */
exports.analyzeNewReview = onDocumentCreated(
  {document: "reviews/{reviewId}", database: "srvefirestore"},
  async (event) => {
    const reviewId = event.params.reviewId;
    const config = getGeminiConfig();

    if (!config.analysisEnabled) {
      console.log(`[analyzeNewReview] AI analysis disabled, skipping ${reviewId}`);
      return null;
    }

    console.log(`[analyzeNewReview] Triggered for review: ${reviewId}`);

    while (activeAnalyses >= MAX_CONCURRENT_ANALYSES) {
      await delay(500);
    }

    activeAnalyses++;

    try {
      const result = await processReviewAnalysisWithRetry(reviewId);

      console.log(`[analyzeNewReview] Completed for ${reviewId}:`, {
        success: result.success,
        cached: result.cached,
        error: result.error,
      });

      if (result.success) {
        const reviewSnap = await db.collection("reviews").doc(reviewId).get();
        if (reviewSnap.exists) {
          const review = {id: reviewSnap.id, ...reviewSnap.data()};
          const aiAnalysis = result.data;

          const providerReport = await checkConsecutiveBadReviews(
            "reviews", "providerId", review.providerId,
            review, "received", "provider",
          );
          const clientReport = await checkConsecutiveBadReviews(
            "reviews", "clientId", review.clientId,
            review, "given", "client",
          );

          if (!providerReport && !clientReport && shouldTriggerReport(aiAnalysis)) {
            await createConsolidatedAIReport(review, aiAnalysis);
          }
        }
      }

      return result;
    } finally {
      activeAnalyses--;
    }
  },
);

/**
 * Manually queue a review for AI analysis
 */
exports.queueReviewAnalysis = functions.https.onCall(async (request) => {
  const {reviewId} = request.data;

  if (!reviewId) {
    throw new functions.https.HttpsError("invalid-argument", "Review ID is required");
  }

  console.log(`[queueReviewAnalysis] Manually queued analysis for review: ${reviewId}`);

  const result = await processReviewAnalysisWithRetry(reviewId);

  if (!result.success) {
    throw new functions.https.HttpsError("internal", `Analysis failed: ${result.error}`);
  }

  return {
    success: true,
    reviewId,
    cached: result.cached || false,
  };
});

/**
 * Batch analyze multiple reviews (admin only)
 */
exports.batchAnalyzeReviews = functions.https.onCall(async (request) => {
  const context = {auth: request.auth, rawRequest: request};
  const auth = context.auth?.token || {};

  if (!auth.isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const {reviewIds, force = false} = request.data?.data || request.data || {};

  if (!reviewIds || !Array.isArray(reviewIds)) {
    throw new functions.https.HttpsError("invalid-argument", "Review IDs array is required");
  }

  console.log(`[batchAnalyzeReviews] Starting batch analysis for ${reviewIds.length} reviews`);

  const results = [];
  const errors = [];

  for (const reviewId of reviewIds) {
    try {
      const reviewRef = db.collection("reviews").doc(reviewId);
      const reviewSnap = await reviewRef.get();

      if (!reviewSnap.exists) {
        errors.push({reviewId, error: "Review not found"});
        continue;
      }

      if (!force && reviewSnap.data().aiAnalysis?.analyzed) {
        results.push({reviewId, success: true, cached: true});
        continue;
      }

      const result = await processReviewAnalysisWithRetry(reviewId);
      results.push({reviewId, ...result});
    } catch (error) {
      errors.push({reviewId, error: error.message});
    }

    if (results.length % 10 === 0) {
      console.log(`[batchAnalyzeReviews] Progress: ${results.length}/${reviewIds.length}`);
    }
  }

  return {
    success: true,
    processed: results.length,
    errors: errors.length,
    results,
    allErrors: errors,
  };
});
