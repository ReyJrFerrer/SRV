const {getFirestore} = require("../../firebase-admin");
const {generateContentWithJSON, isCacheValid, getGeminiConfig} = require("./geminiClient");
const {
  deductReputationForSuspiciousReviewInternal,
} = require("../reputation");

const db = getFirestore();

const CONSECUTIVE_BAD_REVIEWS_THRESHOLD = 5;
const BAD_REVIEW_RATING_THRESHOLD = 2;

const SUSPICIOUS_PATTERNS = [
  "template_language",
  "generic_content",
  "fake_review_characteristics",
  "rating_mismatch",
  "competitive_sabotage",
  "repeated_structure",
  "suspicious_timing",
  "coordinated_pattern",
];

/**
 * Fetch reviewer statistics from Firestore
 * @param {string} userId - User ID to fetch stats for
 * @return {Promise<Object>} Reviewer statistics
 */
async function fetchReviewerStats(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return {completedBookings: 0, averageRating: null};
    }

    const userData = userDoc.data();
    const createdAt = userData.createdAt ? new Date(userData.createdAt).getTime() : Date.now();

    const bookingsSnapshot = await db.collection("bookings")
      .where("clientId", "==", userId)
      .where("status", "==", "Completed")
      .get();

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

    return {
      completedBookings: bookingsSnapshot.size,
      averageRating: ratingCount > 0 ? totalRating / ratingCount : null,
      accountAgeMs: createdAt,
    };
  } catch (error) {
    console.error("[ReviewAnalyzer] Error fetching reviewer stats:", error);
    return {completedBookings: 0, averageRating: null};
  }
}

/**
 * Fetch service and provider names
 * @param {string} serviceId - Service ID
 * @param {string} providerId - Provider ID
 * @return {Promise<Object>} Service and provider names
 */
async function fetchServiceAndProvider(serviceId, providerId) {
  try {
    const [serviceDoc, providerDoc] = await Promise.all([
      serviceId ?
        db.collection("services").doc(serviceId).get() :
        Promise.resolve({exists: false, data: () => ({})}),
      providerId ?
        db.collection("users").doc(providerId).get() :
        Promise.resolve({exists: false, data: () => ({})}),
    ]);

    const serviceName = serviceDoc.exists ?
      serviceDoc.data()?.name || "Unknown Service" :
      "Unknown Service";
    const providerName = providerDoc.exists ?
      providerDoc.data()?.name || "Unknown Provider" :
      "Unknown Provider";

    return {
      serviceName,
      providerName,
    };
  } catch (error) {
    console.error("[ReviewAnalyzer] Error fetching service/provider:", error);
    return {serviceName: "Unknown Service", providerName: "Unknown Provider"};
  }
}

/**
 * Build prompt for single review analysis
 * @param {Object} review - Review object
 * @param {Object} stats - Reviewer statistics
 * @param {Object} context - Service and provider context
 * @return {string} Prompt string
 */
function buildSingleReviewPrompt(review, stats, context) {
  const config = getGeminiConfig();
  const confidenceThreshold = config.confidenceThreshold || 0.7;

  const reviewText = review.comment || "No comment provided";
  const avgRatingStr = stats.averageRating ?
    stats.averageRating.toFixed(1) :
    "N/A";
  const totalReviews = stats.completedBookings || 0;
  const historyStr = `${totalReviews} total reviews, average rating ${avgRatingStr}`;
  const dateStr = review.createdAt || "Unknown";
  const confidenceNote = `confidence >= ${confidenceThreshold}`;

  return `Analyze this review for suspicious patterns indicating fake reviews or review bombing.

Review Text: "${reviewText}"
Rating: ${review.rating}/5
Reviewer History: ${historyStr}
Service: ${context.serviceName}
Provider: ${context.providerName}
Date: ${dateStr}

Focus on detecting:
1. Template or copied language patterns (same structure, swapped keywords)
2. Overly generic or fake-looking content (vague statements, no specifics)
3. Reviews that don't match the rating (e.g., 5 stars with minimal text)
4. Signs of competitive sabotage (targeting specific providers unfairly)
5. Language suggesting fake/improper review (incentives or threats)

Return a JSON object with this exact structure:
{
  "isSuspicious": boolean,
  "confidence": number (0.0 to 1.0),
  "patterns": string[] (e.g., ["template_language", "generic_content"]),
  "threatLevel": "low" | "medium" | "high",
  "summary": string (2-3 sentence explanation of your reasoning)
}

IMPORTANT: Only flag as suspicious if ${confidenceNote}. If uncertain, mark as not suspicious.`;
}

/**
 * Build prompt for batch review analysis
 * @param {Array<Object>} reviews - Array of review objects
 * @return {string} Prompt string
 */
function buildBatchReviewPrompt(reviews) {
  const reviewList = reviews.map((r, i) => {
    const comment = r.comment || "No comment";
    const date = r.createdAt || "Unknown";
    return `- Review ${i + 1}: "${comment}" (Rating: ${r.rating}/5, Date: ${date}, ID: ${r.id})`;
  }).join("\n");

  const numReviews = reviews.length;
  const coordinationNote = "confidence >= 0.7";

  return `Analyze these ${numReviews} reviews for coordinated review bombing patterns.

Reviews:
${reviewList}

Look specifically for:
1. Similar sentence structures or templates (same format with different words)
2. Same or very similar timing patterns (posted within short time window)
3. Similar length and formatting
4. Common phrases, keywords, or talking points
5. Targeting the same provider/service
6. Coordinated negative sentiment or suspicious uniformity
7. Copy-pasted content or minor variations

Return a JSON object:
{
  "isCoordinated": boolean,
  "confidence": number (0.0 to 1.0),
  "patterns": string[] (e.g., ["template_language", "coordinated_timing"]),
  "threatLevel": "low" | "medium" | "high",
  "summary": string (2-3 sentence explanation of your reasoning),
  "affectedReviewIds": string[] (IDs of reviews that appear coordinated)
}

IMPORTANT: Only flag as coordinated if ${coordinationNote}.`;
}

/**
 * Analyze review content using Gemini AI
 * @param {Object} review - Review object to analyze
 * @return {Promise<Object>} Analysis result
 */
async function analyzeReviewContent(review) {
  try {
    if (!review || !review.id) {
      return {success: false, error: "Review object with ID is required"};
    }

    const config = getGeminiConfig();
    if (!config.analysisEnabled) {
      return {success: false, error: "AI analysis is disabled"};
    }

    if (review.aiAnalysis?.analyzed && isCacheValid(review.aiAnalysis.cachedAt)) {
      console.log("[ReviewAnalyzer] Using cached AI analysis for review:", review.id);
      return {
        success: true,
        data: review.aiAnalysis,
        cached: true,
      };
    }

    const [stats, context] = await Promise.all([
      fetchReviewerStats(review.clientId),
      fetchServiceAndProvider(review.serviceId, review.providerId),
    ]);

    const prompt = buildSingleReviewPrompt(review, stats, context);
    const result = await generateContentWithJSON(prompt);

    if (!result.success) {
      console.error("[ReviewAnalyzer] Gemini API failed for review:", review.id, result.error);
      return {success: false, error: result.error};
    }

    const analysis = {
      analyzed: true,
      analyzedAt: new Date().toISOString(),
      isSuspicious: result.parsed.isSuspicious || false,
      confidence: result.parsed.confidence || 0,
      patterns: result.parsed.patterns || [],
      threatLevel: result.parsed.threatLevel || "low",
      summary: result.parsed.summary || "",
      cachedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: analysis,
      cached: false,
    };
  } catch (error) {
    console.error("[ReviewAnalyzer] Error analyzing review content:", error);
    return {success: false, error: error.message};
  }
}

/**
 * Analyze batch of reviews for coordinated patterns
 * @param {Array<Object>} reviews - Array of review objects
 * @return {Promise<Object>} Analysis result
 */
async function analyzeReviewBatch(reviews) {
  try {
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return {success: false, error: "Reviews array is required"};
    }

    if (reviews.length < 2) {
      return {success: false, error: "Batch analysis requires at least 2 reviews"};
    }

    const config = getGeminiConfig();
    if (!config.analysisEnabled) {
      return {success: false, error: "AI analysis is disabled"};
    }

    const prompt = buildBatchReviewPrompt(reviews);
    const result = await generateContentWithJSON(prompt);

    if (!result.success) {
      console.error("[ReviewAnalyzer] Gemini API failed for batch analysis:", result.error);
      return {success: false, error: result.error};
    }

    return {
      success: true,
      data: {
        isCoordinated: result.parsed.isCoordinated || false,
        confidence: result.parsed.confidence || 0,
        patterns: result.parsed.patterns || [],
        threatLevel: result.parsed.threatLevel || "low",
        summary: result.parsed.summary || "",
        affectedReviewIds: result.parsed.affectedReviewIds || [],
        analyzedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("[ReviewAnalyzer] Error in batch analysis:", error);
    return {success: false, error: error.message};
  }
}

/**
 * Update review document with AI analysis results
 * @param {string} reviewId - Review ID to update
 * @param {Object} analysis - AI analysis results
 * @return {Promise<Object>} Update result
 */
async function updateReviewWithAnalysis(reviewId, analysis) {
  try {
    const reviewRef = db.collection("reviews").doc(reviewId);
    await reviewRef.update({
      aiAnalysis: analysis,
      updatedAt: new Date().toISOString(),
    });
    return {success: true};
  } catch (error) {
    console.error("[ReviewAnalyzer] Error updating review with analysis:", error);
    return {success: false, error: error.message};
  }
}

/**
 * Determine if AI analysis results warrant report creation
 * @param {Object} aiAnalysis - AI analysis results
 * @param {Object} ratingAnalysis - Optional rating-based analysis
 * @return {boolean} True if should trigger report
 */
function shouldTriggerReport(aiAnalysis, ratingAnalysis = null) {
  if (!aiAnalysis || !aiAnalysis.analyzed) {
    return false;
  }

  if (aiAnalysis.threatLevel === "high" && aiAnalysis.confidence >= 0.7) {
    return true;
  }

  if (aiAnalysis.threatLevel === "medium" && aiAnalysis.confidence >= 0.85) {
    return true;
  }

  if (ratingAnalysis && ratingAnalysis.isSuspicious && ratingAnalysis.confidence >= 0.8) {
    return true;
  }

  return false;
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
 * Check for consecutive bad reviews and auto-create report
 * Runs AI analysis when bad reviews are detected
 * @param {string} collectionName - Firestore collection to check
 * @param {string} filterField - Field to filter by (providerId or clientId)
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
    if (newReview.rating > BAD_REVIEW_RATING_THRESHOLD) {
      return false;
    }

    let recentReviewsSnap;
    try {
      recentReviewsSnap = await db
        .collection(collectionName)
        .where(filterField, "==", userId)
        .orderBy("createdAt", "desc")
        .limit(CONSECUTIVE_BAD_REVIEWS_THRESHOLD)
        .get();
    } catch (queryError) {
      if (queryError.code === 8 || queryError.message?.includes("index")) {
        const allReviewsSnap = await db
          .collection(collectionName)
          .where(filterField, "==", userId)
          .get();

        const allReviews = [];
        allReviewsSnap.forEach((doc) => {
          allReviews.push(doc.data());
        });

        const sortedReviews = allReviews.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });

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
        let batchAnalysisResult = null;
        let singleReviewAnalysis = null;

        try {
          if (reviews.length >= 2) {
            batchAnalysisResult = await analyzeReviewBatch(reviews);
            if (batchAnalysisResult.success) {
              console.log(`[checkConsecutiveBadReviews] Batch AI analysis completed:`, {
                isCoordinated: batchAnalysisResult.data.isCoordinated,
                threatLevel: batchAnalysisResult.data.threatLevel,
                confidence: batchAnalysisResult.data.confidence,
              });
            }
          } else {
            singleReviewAnalysis = await analyzeReviewContent(reviews[0]);
            if (singleReviewAnalysis.success) {
              console.log(`[checkConsecutiveBadReviews] Single review AI analysis completed:`, {
                isSuspicious: singleReviewAnalysis.data.isSuspicious,
                threatLevel: singleReviewAnalysis.data.threatLevel,
                confidence: singleReviewAnalysis.data.confidence,
              });
            }
          }
        } catch (aiError) {
          console.error("[checkConsecutiveBadReviews] AI analysis failed:", aiError);
        }

        const aiAnalysisResults = [];
        const suspiciousAIReviews = [];

        for (const review of reviews) {
          if (review.aiAnalysis?.analyzed) {
            aiAnalysisResults.push(review.aiAnalysis);
            if (review.aiAnalysis.isSuspicious && review.aiAnalysis.confidence >= 0.7) {
              suspiciousAIReviews.push(review.id);
            }
          }
        }

        const aiConfirmedSuspicious = suspiciousAIReviews.length > 0 ||
          (singleReviewAnalysis?.success && singleReviewAnalysis.data.isSuspicious &&
           singleReviewAnalysis.data.confidence >= 0.7);

        const batchDetectedCoordinated = batchAnalysisResult?.success &&
          batchAnalysisResult.data.isCoordinated;

        const aiThreatAnalysis = batchAnalysisResult?.success ? {
          analyzed: true,
          threatLevel: batchAnalysisResult.data.threatLevel,
          confidence: batchAnalysisResult.data.confidence,
          isSuspicious: batchDetectedCoordinated,
        } : singleReviewAnalysis?.success ? {
          analyzed: true,
          threatLevel: singleReviewAnalysis.data.threatLevel,
          confidence: singleReviewAnalysis.data.confidence,
          isSuspicious: singleReviewAnalysis.data.isSuspicious,
        } : null;

        const aiTriggeredReport = shouldTriggerReport(aiThreatAnalysis);

        const reportId = generateReportId();
        const userName = userType === "provider" ? "Provider" : "Client";
        const action = scenarioType === "received" ? "received" : "given";

        const userDoc = await db.collection("users").doc(userId).get();
        const userProfile = userDoc.exists ? userDoc.data() : null;
        const displayName = userProfile?.name || `Unknown ${userName}`;
        const userPhone = userProfile?.phone || userProfile?.phoneNumber || "N/A";

        let serviceName = "Unknown Service";
        if (newReview.serviceId) {
          const serviceDoc = await db.collection("services").doc(newReview.serviceId).get();
          if (serviceDoc.exists) {
            serviceName = serviceDoc.data()?.name || "Unknown Service";
          }
        }

        const aiSummary = [];
        if (aiConfirmedSuspicious) {
          aiSummary.push("Individual review analysis detected suspicious patterns.");
        }
        if (batchDetectedCoordinated) {
          const threatLvl = batchAnalysisResult.data.threatLevel;
          aiSummary.push(
            `Batch analysis detected coordinated attack (${threatLvl} threat).`,
          );
        }
        if (singleReviewAnalysis?.success) {
          aiSummary.push(
            `Single review analysis: ${singleReviewAnalysis.data.threatLevel} threat ` +
            `(confidence: ${(singleReviewAnalysis.data.confidence * 100).toFixed(0)}%). ` +
            `${singleReviewAnalysis.data.summary}`,
          );
        }
        if (batchAnalysisResult?.success) {
          aiSummary.push(batchAnalysisResult.data.summary);
        }

        const title = `${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} Consecutive Bad Reviews - ` +
          `${displayName} (${action} by ${userType})`;
        const aiNote = aiSummary.length > 0 ?
          `\n\nAI Analysis:\n${aiSummary.join("\n")}` :
          "";
        const description = `${userName} ${displayName} has ${action}
        ${CONSECUTIVE_BAD_REVIEWS_THRESHOLD} ` +
          `consecutive bad reviews (rating <= ${BAD_REVIEW_RATING_THRESHOLD}).\n\n` +
          `This is an automatically generated report.${aiNote}`;

        const ticketDescription = JSON.stringify({
          title: title,
          description: description,
          category: "service",
          timestamp: new Date().toISOString(),
          source: `system_auto_report_consecutive_bad_reviews_${scenarioType}_${userType}`,
          userId: userId,
          userName: displayName,
          userType: userType,
          scenarioType: scenarioType,
          clientId: newReview.clientId,
          clientName: userType === "client" ? displayName : undefined,
          providerId: newReview.providerId,
          providerName: userType === "provider" ? displayName : undefined,
          serviceId: newReview.serviceId,
          serviceName: serviceName,
          reviewId: newReview.id,
          rating: newReview.rating,
          comment: newReview.comment || "",
          reviewIds: reviews.map((r) => r.id),
          ratings: reviews.map((r) => r.rating),
          collection: collectionName,
          aiAnalysis: {
            threatLevel: batchAnalysisResult?.success ?
              batchAnalysisResult.data.threatLevel :
              singleReviewAnalysis?.success ?
                singleReviewAnalysis.data.threatLevel : "low",
            confidence: batchAnalysisResult?.success ?
              batchAnalysisResult.data.confidence :
              singleReviewAnalysis?.success ?
                singleReviewAnalysis.data.confidence : 0,
            patterns: batchAnalysisResult?.success ?
              batchAnalysisResult.data.patterns :
              singleReviewAnalysis?.success ?
                singleReviewAnalysis.data.patterns : [],
            summary: batchAnalysisResult?.success ?
              batchAnalysisResult.data.summary :
              singleReviewAnalysis?.success ?
                singleReviewAnalysis.data.summary : "",
            batchAnalysis: batchAnalysisResult?.success ? {
              isCoordinated: batchAnalysisResult.data.isCoordinated,
              confidence: batchAnalysisResult.data.confidence,
              threatLevel: batchAnalysisResult.data.threatLevel,
              patterns: batchAnalysisResult.data.patterns,
              summary: batchAnalysisResult.data.summary,
              affectedReviewIds: batchAnalysisResult.data.affectedReviewIds,
            } : null,
            singleReviewAnalysis: singleReviewAnalysis?.success ? {
              isSuspicious: singleReviewAnalysis.data.isSuspicious,
              confidence: singleReviewAnalysis.data.confidence,
              threatLevel: singleReviewAnalysis.data.threatLevel,
              patterns: singleReviewAnalysis.data.patterns,
              summary: singleReviewAnalysis.data.summary,
            } : null,
            individualAnalysis: aiAnalysisResults.length > 0 ? {
              totalAnalyzed: aiAnalysisResults.length,
              suspiciousCount: suspiciousAIReviews.length,
              suspiciousReviewIds: suspiciousAIReviews,
              patterns: aiAnalysisResults.reduce((acc, a) => {
                if (a.patterns) acc.push(...a.patterns);
                return acc;
              }, []),
            } : null,
            aiTriggeredReport: aiTriggeredReport,
          },
        });

        const isAISuspicious = aiConfirmedSuspicious || batchDetectedCoordinated ||
          (singleReviewAnalysis?.success && singleReviewAnalysis.data.isSuspicious);

        const newReport = {
          id: reportId,
          userId: userId,
          userName: displayName,
          userPhone: userPhone,
          description: ticketDescription,
          status: "open",
          createdAt: new Date().toISOString(),
          aiAnalysisTriggered: isAISuspicious,
        };

        await db.collection("reports").doc(reportId).set(newReport);

        if (isAISuspicious) {
          try {
            await deductReputationForSuspiciousReviewInternal(newReview.clientId);
          } catch (repError) {
            console.error("[checkConsecutiveBadReviews] Failed to deduct reputation:", repError);
          }
        }

        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("[checkConsecutiveBadReviews] Error:", error);
    return false;
  }
}

module.exports = {
  analyzeReviewContent,
  analyzeReviewBatch,
  updateReviewWithAnalysis,
  fetchReviewerStats,
  fetchServiceAndProvider,
  shouldTriggerReport,
  checkConsecutiveBadReviews,
  generateReportId,
  CONSECUTIVE_BAD_REVIEWS_THRESHOLD,
  BAD_REVIEW_RATING_THRESHOLD,
  SUSPICIOUS_PATTERNS,
};
