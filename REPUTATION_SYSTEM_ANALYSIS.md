# Reputation System Analysis Report

## Executive Summary

This document provides a comprehensive analysis of the reputation system implemented across three primary modules:

- `functions/src/reputation.js` (641 lines)
- `functions/src/review.js` (1652 lines)
- `functions/src/utils/` (reputationMath.js, reviewAnalyzer.js, geminiClient.js)

The system manages trust scores for both clients and providers using Firestore as the primary data store, with AI-powered review analysis using Google's Gemini API.

---

## System Architecture

### Module Overview

| File                | Purpose                     | Key Exports                                                                                                                                                        |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reputation.js`     | Core reputation management  | `initializeReputation`, `updateUserReputation`, `updateProviderReputation`, `processReviewForReputation`, `deductReputationForCancellation`, `checkUserReputation` |
| `review.js`         | Review lifecycle management | `submitReview`, `submitProviderReview`, `getReview`, `updateReview`, `deleteReview`, `restoreReview`                                                               |
| `reputationMath.js` | Trust score calculations    | `calculateTrustScore`, `calculateProviderTrustScore`, `determineTrustLevel`, `calculateBayesianAverage`                                                            |
| `reviewAnalyzer.js` | AI-powered review analysis  | `analyzeReviewContent`, `analyzeReviewBatch`, `checkConsecutiveBadReviews`                                                                                         |
| `geminiClient.js`   | Gemini AI integration       | `generateContent`, `generateContentWithJSON`, `isCacheValid`                                                                                                       |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ACTIONS                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         review.js (Entry Points)                            │
│  • submitReview (client → provider)                                         │
│  • submitProviderReview (provider → client)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Firestore Transaction                                │
│  1. Validate booking exists and is completed                                │
│  2. Check review doesn't already exist                                      │
│  3. Create review document                                                  │
│  4. Update service rating statistics                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              processReviewForReputationInternal (reputation.js)             │
│  1. applyAIAnalysisFlags (checks review.aiAnalysis)                        │
│  2. updateUserReputationInternal (client)                                   │
│  3. updateProviderReputationInternal (provider)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ reviewAnalyzer│  │ reputation  │  │ reputation   │
         │ .js          │  │ Math.js     │  │ Math.js      │
         │              │  │             │  │              │
         │ analyzeReview│  │ calculate   │  │ determine    │
         │ Content()    │  │ TrustScore()│  │ TrustLevel()│
         └──────────────┘  └──────────────┘  └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Firestore Storage                                    │
│  • reputations/{userId} - Current reputation                                │
│  • reputations/{userId}/history/{timestamp} - Historical snapshots        │
│  • reviews/{reviewId} - Review documents                                     │
│  • providerReviews/{reviewId} - Provider-to-client reviews                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Data Flow Analysis

### 1. Review Submission Flow

#### Entry Point: `submitReview` (review.js:79-238)

**Input Data:**

```javascript
{
  bookingId: string,    // Required
  rating: number (1-5), // Required
  comment: string        // Optional, max 500 chars
}
```

**Processing Steps:**

1. **Authentication & Authorization** (lines 88-94)
   - Checks `authInfo.hasAuth`
   - Validates user is the booking's client

2. **Input Validation** (lines 97-116)
   - Booking ID required
   - Rating must be 1-5
   - Comment max 500 characters

3. **Transaction Execution** (lines 119-224)

   **Read Operations:**

   ```javascript
   // Line 124: Get booking
   bookingRef = db.collection("bookings").doc(bookingId);
   booking = bookingSnap.data(); // {clientId, providerId, serviceId, status, completedDate}

   // Line 136-140: Check existing review
   db.collection("reviews")
     .where("bookingId", "==", bookingId)
     .where("clientId", "==", authInfo.uid);

   // Line 150-151: Get service for rating update
   db.collection("services").doc(booking.serviceId);
   ```

   **Validation Checks:**
   - Booking exists and user is client (line 156)
   - Booking status is "Completed" (line 164)
   - Within review window: 30 days from completion (line 172)
   - No existing review for this booking (line 142)

   **Write Operations:**

   ```javascript
   // Line 186-201: Create review document
   newReview = {
     id: generated_reviewId,
     bookingId,
     clientId,
     providerId,
     serviceId,
     rating,
     comment,
     createdAt,
     updatedAt,
     status: "Visible",
     qualityScore: calculateQualityScore({ rating, comment }),
   };

   // Line 204-205: Save to Firestore
   db.collection("reviews").doc(reviewId).set(newReview);

   // Line 216-220: Update service rating
   newAverageRating = (currentRating * currentCount + rating) / newCount;
   serviceRef.update({
     averageRating: newAverageRating,
     reviewCount: newCount,
     updatedAt: now,
   });
   ```

4. **Post-Transaction Processing** (line 228)
   ```javascript
   await processReviewForReputationInternal(result.data, true);
   ```
   Called outside transaction to avoid long-running operations.

### 2. Reputation Processing Flow

#### Entry Point: `processReviewForReputationInternal` (reputation.js:314-330)

```javascript
async function processReviewForReputationInternal(review) {
  // 1. Apply AI analysis flags
  await applyAIAnalysisFlags(review);

  // 2. Update both reputations
  await updateUserReputationInternal(review.clientId);
  await updateProviderReputationInternal(review.providerId);

  return { success: true, data: { status: "Visible" } };
}
```

#### Step 2.1: `applyAIAnalysisFlags` (reputation.js:336-389)

**Input:** Review object with `review.aiAnalysis` field

**Processing Logic:**

```javascript
// Lines 337-346: Check if AI analysis exists and meets threshold
if (!review.aiAnalysis?.analyzed) return;
if (!aiAnalysis.isSuspicious || aiAnalysis.confidence < 0.7) return;

// Lines 348-363: Check for review bomb patterns
patterns = aiAnalysis.patterns || [];
threatLevel = aiAnalysis.threatLevel;
reviewBombPatterns = [
  "template_language",
  "coordinated_pattern",
  "repeated_structure",
  "suspicious_timing",
];

hasReviewBombIndicators = patterns.some((p) => reviewBombPatterns.includes(p));
if (!hasReviewBombIndicators && threatLevel !== "high") return;

// Lines 366-388: Add ReviewBomb flag to user
existingFlags = doc.data().detectionFlags || [];
if (!existingFlags.includes("ReviewBomb")) {
  updatedFlags = [...existingFlags, "ReviewBomb"];
  repRef.update({ detectionFlags: updatedFlags, lastUpdated: Date.now() });
}
```

#### Step 2.2: `updateUserReputationInternal` (reputation.js:200-236)

**Data Fetching** (fetchUserData, lines 38-80):

```javascript
// Get user document
userRef = db.collection("users").doc(userId);
userData = userDoc.data();
accountAgeMs = new Date(userData.createdAt).getTime();

// Get completed bookings count
bookingsSnapshot = db
  .collection("bookings")
  .where("clientId", "==", userId)
  .where("status", "==", "Completed");
completedBookings = bookingsSnapshot.size;

// Get average rating from reviews given
reviewsSnapshot = db.collection("reviews").where("clientId", "==", userId);
(totalRating, (ratingCount = iterate(reviewsSnapshot)));
averageRating = ratingCount > 0 ? totalRating / ratingCount : null;
```

**Trust Score Calculation** (lines 213-218):

```javascript
// Get existing detection flags
detectionFlags = doc.data().detectionFlags || [];

// Calculate new trust score
newTrustScore = calculateTrustScore(
  userData.completedBookings,
  userData.averageRating,
  userData.accountAgeMs,
  detectionFlags,
);

// Determine trust level
trustLevel = determineTrustLevel(newTrustScore);
```

**Storage** (lines 229, via writeReputationAndHistory):

```javascript
// Update main reputation document
repRef = db.collection("reputations").doc(userId);
repRef.set(
  {
    trustScore: newTrustScore,
    trustLevel,
    completedBookings,
    averageRating,
    detectionFlags,
    lastUpdated: timestamp,
  },
  { merge: true },
);

// Add to history subcollection
historyRef = repRef.collection("history").doc(timestamp.toString());
historyRef.set({
  trustScore: newTrustScore,
  timestamp: timestamp,
});
```

#### Step 2.3: `updateProviderReputationInternal` (reputation.js:256-292)

Identical flow to user reputation, but:

- Queries `providerId` instead of `clientId`
- Uses `calculateProviderTrustScore()` instead of `calculateTrustScore()`

---

## Trust Score Calculation Details

### Constants (reputationMath.js)

```javascript
BASE_SCORE = 50.0; // Starting trust score
MAX_BOOKING_POINTS = 20.0; // Max points from completed bookings
MAX_AGE_POINTS = 10.0; // Max points from account age
MIN_TRUST_SCORE = 0.0; // Floor
MAX_TRUST_SCORE = 100.0; // Ceiling
CANCELLATION_PENALTY = 5.0; // Points deducted for cancellation
```

### Trust Level Thresholds

```javascript
TRUST_LEVEL_THRESHOLDS = [
  { level: "Low", threshold: 20.0 },
  { level: "Medium", threshold: 50.0 },
  { level: "High", threshold: 80.0 },
  { level: "VeryHigh", threshold: 100.0 },
];
// "New" is returned when reputation doesn't exist
```

### Client Trust Score Algorithm (`calculateTrustScore`)

**Score Components:**

| Component          | Max Points | Calculation                                        |
| ------------------ | ---------- | -------------------------------------------------- |
| Base Score         | 50         | Starting point                                     |
| Booking Activity   | 20         | `Math.min(20, completedBookings)`                  |
| Rating Quality     | 20         | Bayesian average weighted: `(bayesianAvg - 1) * 5` |
| Account Age        | 10         | `ageInDays / 36.5`                                 |
| Consistency Bonus  | 5          | If 5+ bookings and rating >= 3.5                   |
| Recency Weight     | 15 \* 0.3  | Based on account age (15 pts if <30 days)          |
| Activity Frequency | 10 \* 0.1  | Based on bookings per month                        |
| **Subtotal**       | **~100**   |                                                    |

**Penalties:**

| Flag                    | Penalty | Additional if Multiple |
| ----------------------- | ------- | ---------------------- |
| ReviewBomb              | 15      | +5                     |
| CompetitiveManipulation | 15      | +5                     |
| FakeEvidence            | 10      | +3                     |
| IdentityFraud           | 15      | +10                    |
| Other                   | 5       | -                      |
| AbusiveContent          | 20      | +10                    |

**Cap:** Penalty limited to 50% of score

**New User Reduction:** 20% reduction if `<3` bookings AND `<30` days old

### Provider Trust Score Algorithm (`calculateProviderTrustScore`)

**Score Components:**

| Component          | Max Points | Calculation                                |
| ------------------ | ---------- | ------------------------------------------ |
| Base Score         | 50         | Starting point                             |
| Booking Completion | 25         | `completedBookings * 1.25`                 |
| Service Quality    | 25         | Rating-based, with Bayesian adjustment     |
| Account Age        | 10         | Same as client                             |
| Consistency Bonus  | 10         | If 5+ bookings with high rating            |
| Recency Weight     | 15 \* 0.3  | Same as client                             |
| Activity Frequency | 10 \* 0.1  | Same as client                             |
| Experience Bonus   | 5          | 1pt at 10 bookings, 3pts at 25, 5pts at 50 |

**Penalties:** Same as client but capped at 40%

**New Provider Reduction:** 10% reduction if `<3` bookings AND `<30` days old

---

## AI Review Analysis Flow

### Module: reviewAnalyzer.js

#### Entry Point: `analyzeReviewContent` (lines 198-251)

**Purpose:** Analyze individual review for suspicious patterns

**Data Fetching:**

```javascript
// Fetch reviewer statistics
stats = await fetchReviewerStats(review.clientId);
// Queries: users/{userId}, bookings (completed), reviews (given)

// Fetch service and provider names
context = await fetchServiceAndProvider(review.serviceId, review.providerId);
```

**Prompt Construction** (buildSingleReviewPrompt, lines 110-149):

- Review text, rating, date
- Reviewer history (total reviews, average rating)
- Service and provider names
- Detection targets: template language, generic content, rating mismatch, competitive sabotage

**AI Analysis** (via geminiClient.js):

```javascript
result = await generateContentWithJSON(prompt);
// Returns: {isSuspicious, confidence, patterns, threatLevel, summary}
```

**Result Storage:**

```javascript
// Update review document with AI analysis
reviewRef.update({
  aiAnalysis: {
    analyzed: true,
    analyzedAt: timestamp,
    isSuspicious: result.parsed.isSuspicious,
    confidence: result.parsed.confidence,
    patterns: result.parsed.patterns,
    threatLevel: result.parsed.threatLevel,
    summary: result.parsed.summary,
    cachedAt: timestamp,
  },
});
```

#### Batch Analysis: `analyzeReviewBatch` (lines 258-297)

**Triggered by:** 5 consecutive bad reviews (rating <= 2)

**Purpose:** Detect coordinated review bombing

**Analysis:**

- Sends multiple reviews to AI
- Looks for: similar structure, timing patterns, common phrases
- Returns: isCoordinated, affectedReviewIds

#### Automatic Report Generation: `checkConsecutiveBadReviews` (lines 366-637)

**Trigger Conditions:**

- 5 consecutive reviews with rating <= 2

**Processing Flow:**

```javascript
// 1. Get 5 most recent reviews
recentReviews = db
  .collection(collectionName)
  .where(filterField, "==", userId)
  .orderBy("createdAt", "desc")
  .limit(5);

// 2. Check if all are bad (<=2 rating)
allBad = reviews.every((r) => r.rating <= 2);

// 3. If all bad, trigger AI analysis
if (allBad) {
  // Batch analysis if >= 2 reviews
  batchAnalysis = await analyzeReviewBatch(reviews);

  // Single analysis for remaining
  singleAnalysis = await analyzeReviewContent(reviews[0]);
}

// 4. Determine if report should be created
shouldTriggerReport(aiAnalysis); // See thresholds below

// 5. Create report document
report = {
  id: "report_{timestamp}_{random}",
  userId,
  userName,
  userPhone,
  description: ticketDescription,
  status: "open",
  createdAt,
  aiAnalysisTriggered: isAISuspicious,
};
db.collection("reports").doc(reportId).set(report);

// 6. Deduct reputation if suspicious
if (isAISuspicious) {
  await deductReputationForSuspiciousReviewInternal(newReview.clientId);
}
```

**Report Thresholds** (shouldTriggerReport):

- High threat + 70% confidence = trigger
- Medium threat + 85% confidence = trigger
- Rating analysis suspicious + 80% confidence = trigger

---

## Reputation Update Triggers

### 1. Review Submission

- **Location:** review.js line 228
- **Flow:** `submitReview` → `processReviewForReputationInternal`
- **Affected:** Both client (giver) and provider (receiver)

### 2. Provider Review Submission

- **Location:** review.js line 1470
- **Flow:** `submitProviderReview` → `processReviewForReputationInternal`
- **Affected:** Both provider (giver) and client (receiver)

### 3. Cancellation

- **Location:** reputation.js line 411-449
- **Function:** `deductReputationForCancellationInternal`
- **Triggered by:** External booking system when user cancels
- **Affected:** User who cancelled
- **Penalty:** `CANCELLATION_PENALTY = 5.0`

### 4. Suspicious Review Detection

- **Location:** reputation.js line 471-521
- **Function:** `deductReputationForSuspiciousReviewInternal`
- **Triggered by:** AI analysis flagging review as suspicious
- **Affected:** Review author
- **Action:** Add "ReviewBomb" flag, recalculate trust score

### 5. Consecutive Bad Reviews

- **Location:** reviewAnalyzer.js line 621-627
- **Triggered by:** 5 consecutive reviews with rating <= 2
- **Action:** Create report, optionally deduct reputation

---

## Data Models

### Reputation Document (reputations/{userId})

```javascript
{
  userId: string,
  trustScore: number,          // 0-100
  trustLevel: string,          // "New" | "Low" | "Medium" | "High" | "VeryHigh"
  completedBookings: number,
  averageRating: number | null,
  detectionFlags: string[],    // ["ReviewBomb", "CompetitiveManipulation", ...]
  lastUpdated: timestamp
}
```

### Reputation History (reputations/{userId}/history/{timestamp})

```javascript
{
  trustScore: number,
  timestamp: timestamp
}
```

### Review Document (reviews/{reviewId})

```javascript
{
  id: string,
  bookingId: string,
  clientId: string,            // Review author
  providerId: string,          // Review target
  serviceId: string,
  rating: number (1-5),
  comment: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  status: "Visible" | "Hidden" | "Flagged" | "Deleted",
  qualityScore: number,        // Calculated: (lengthScore + ratingScore) / 2
  aiAnalysis: {
    analyzed: boolean,
    analyzedAt: timestamp,
    isSuspicious: boolean,
    confidence: number,
    patterns: string[],
    threatLevel: "low" | "medium" | "high",
    summary: string,
    cachedAt: timestamp
  }
}
```

---

## Key Processing Constants

| Constant                          | Value | Location             |
| --------------------------------- | ----- | -------------------- |
| REVIEW_WINDOW_DAYS                | 30    | review.js:27         |
| MAX_COMMENT_LENGTH                | 500   | review.js:28         |
| MIN_RATING                        | 1     | review.js:29         |
| MAX_RATING                        | 5     | review.js:30         |
| CONSECUTIVE_BAD_REVIEWS_THRESHOLD | 5     | reviewAnalyzer.js:9  |
| BAD_REVIEW_RATING_THRESHOLD       | 2     | reviewAnalyzer.js:10 |
| DEFAULT_CONFIDENCE_THRESHOLD      | 0.7   | geminiClient.js:5    |
| DEFAULT_CACHE_TTL_HOURS           | 24    | geminiClient.js:6    |

---

## Integration Points

### External Systems

1. **Firebase Auth** - User authentication via request.auth
2. **Firestore** - Primary data store
3. **Google Gemini API** - AI review analysis
4. **Secret Manager** - API key storage (via process.env)

### Cross-Module Dependencies

```
review.js ──────────────────────► reputation.js
     │                                 │
     │  processReviewForReputation    │
     │  Internal()                    │
     │                                 ▼
     │                          reputationMath.js
     │                                 │
     └─────────────────────────────────┘
```

```
reputation.js ──────────────► reviewAnalyzer.js
                                 │
                                 ▼
                           geminiClient.js
```

---

## Current Limitations and Observations

1. **No Transaction on Reputation Updates:** The `updateUserReputationInternal` and `updateProviderReputationInternal` functions fetch data outside a transaction, potentially leading to race conditions under high concurrency.

2. **AI Analysis Not Triggered on Submit:** Review AI analysis is handled by a Firestore trigger (not in submitReview), meaning `applyAIAnalysisFlags` may not find `review.aiAnalysis` populated.

3. **Missing accountAgeMs Storage:** The reputation document does not store `accountAgeMs`, requiring recalculation from the user document each time.

4. **Service Review Count Decrement on Delete:** When a review is deleted (status → "Hidden"), the service rating is recalculated by removing that review's rating, but the comment suggests it's a "soft delete" vs "permanent delete."

5. **Dual Write Pattern:** Reputation is written to both main document and history subcollection in same operation without transaction wrapper.

---

## Security Considerations

1. **Admin-Only Functions:**
   - `updateReputation` - Admin only
   - `deleteReview` - Owner or admin
   - `restoreReview` - Admin only
   - `bulkUpdateReviewStatus` - Admin only

2. **User Data Exposure:** Review analysis fetches user phone numbers for report generation.

3. **No Rate Limiting:** Review submission and reputation updates have no explicit rate limiting.
