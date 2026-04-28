# Reputation System Documentation

## Overview

The reputation system manages trust scores for users and providers using Firestore and pure JavaScript math utilities. It calculates scores based on booking activity, ratings, account age, and other factors.

---

## Core Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BASE_SCORE` | 50.0 | Starting score for all new users/providers |
| `MAX_BOOKING_POINTS` | 20.0 | Maximum points from booking activity |
| `MAX_AGE_POINTS` | 10.0 | Maximum points from account age |
| `MIN_TRUST_SCORE` | 0.0 | Minimum possible score |
| `MAX_TRUST_SCORE` | 100.0 | Maximum possible score |
| `CANCELLATION_PENALTY` | 5.0 | Points deducted for booking cancellation |

### Trust Level Thresholds

| Level | Score Range |
|-------|-------------|
| New | No score yet |
| Low | 0 - 20 |
| Medium | 21 - 50 |
| High | 51 - 80 |
| VeryHigh | 81 - 100 |

### Weights and Bonuses

| Constant | Value |
|----------|-------|
| `RECENCY_WEIGHT` | 0.3 |
| `CONSISTENCY_BONUS` | 5.0 |
| `ACTIVITY_FREQUENCY_WEIGHT` | 0.1 |
| `BAYESIAN_CONFIDENCE_THRESHOLD` | 2.0 |
| `BAYESIAN_PRIOR_MEAN` | 3.0 |

### Detection Flags (Penalty Types)

| Flag | Base Penalty | With Multiple Flags |
|------|-------------|---------------------|
| `ReviewBomb` | 15.0 | 20.0 |
| `CompetitiveManipulation` | 15.0 | 20.0 |
| `FakeEvidence` | 10.0 | 13.0 |
| `IdentityFraud` | 15.0 | 25.0 |
| `AbusiveContent` | 20.0 | 30.0 |
| `Other` | 5.0 | 5.0 |

---

## User Trust Score Algorithm

**Function**: `calculateTrustScore(completedBookings, averageRating, accountAgeMs, flags)`

**Target Range**: 0 - 100

### Calculation Steps

```
1. BASE SCORE (Starting Point)
   - Start at 50.0

2. BOOKING ACTIVITY (max +20 points)
   - Points = min(20, completedBookings)

3. RATING QUALITY (max +20 points)
   - If averageRating exists:
     - bayesianAvg = calculateBayesianAverage(averageRating, completedBookings)
     - ratingPoints = (bayesianAvg - 1.0) * 5.0
     - Points = clamp(ratingPoints, 0, 20)

4. ACCOUNT AGE (max +10 points)
   - ageInDays = (now - accountAgeMs) / (24 * 60 * 60 * 1000)
   - Points = min(10, ageInDays / 36.5)

5. CONSISTENCY BONUS (max +5 points)
   - If completedBookings >= 5 AND averageRating exists:
     - +5.0 if averageRating >= 4.0
     - +3.0 if averageRating >= 3.5

6. RECENCY WEIGHT (max +4.5 points)
   - recencyScore = calculateRecencyScore(completedBookings, accountAgeMs)
   - Points = recencyScore * 0.3

   Recency Score calculation:
   - 15 points if account age <= 30 days AND has bookings
   - 10 points if account age <= 90 days
   - 5 points if account age <= 180 days
   - 0 points otherwise

7. ACTIVITY FREQUENCY (max +1 point)
   - frequencyScore = calculateActivityFrequency(completedBookings, accountAgeMs)
   - Points = frequencyScore * 0.1

   Frequency Score calculation:
   - 10 points if bookingsPerMonth >= 5.0
   - 7 points if bookingsPerMonth >= 3.0
   - 4 points if bookingsPerMonth >= 1.0
   - 0 points otherwise

   Where: bookingsPerMonth = completedBookings / (effectiveAgeDays / 30.0)

8. DETECTION FLAG PENALTIES
   - Subtract penalty points based on flag type
   - Maximum penalty = min(totalPenaltyPoints, score * 0.5)

9. ACTIVITY THRESHOLD MULTIPLIER (New Users)
   - If completedBookings < 3 AND ageInDays < 30:
     - score *= 0.8

10. FINAL CLAMP
    - score = clamp(score, 0, 100)
```

### Bayesian Average Formula

```
bayesianAvg = (currentAverage * count + BAYESIAN_PRIOR_MEAN * BAYESIAN_CONFIDENCE_THRESHOLD)
              / (count + BAYESIAN_CONFIDENCE_THRESHOLD)
```

---

## Provider Trust Score Algorithm

**Function**: `calculateProviderTrustScore(completedBookings, averageRating, accountAgeMs, flags)`

**Target Range**: 0 - 100

### Calculation Steps

```
1. BASE SCORE (Starting Point)
   - Start at 50.0

2. BOOKING COMPLETION (max +25 points)
   - Points = min(25, completedBookings * 1.25)

3. SERVICE QUALITY (max ±25 points)
   - If averageRating is null/undefined:
     - +5.0 (small bonus for new providers)
   - Else:
     - bayesianAvg = calculateBayesianAverage(averageRating, completedBookings)

     If bayesianAvg < 3.0:
       - If completedBookings < 3: penalty = (3.0 - bayesianAvg) * 2.0
       - Else: penalty = (3.0 - bayesianAvg) * 8.0
       - score -= penalty

     If bayesianAvg >= 3.0:
       - If completedBookings < 3: reward = (bayesianAvg - 3.0) * 2.5
       - Else: reward = (bayesianAvg - 3.0) * 12.5
       - score += reward

4. ACCOUNT AGE (max +10 points)
   - Same as User Trust Score

5. PROVIDER CONSISTENCY BONUS (max +10 points)
   - If completedBookings >= 5:
     - +10.0 if averageRating >= 4.5
     - +7.5 if averageRating >= 4.0
     - +5.0 if averageRating >= 3.5
   - If completedBookings >= 10 with no rating:
     - +5.0

6. RECENCY WEIGHT (max +4.5 points)
   - Same as User Trust Score

7. ACTIVITY FREQUENCY (max +1 point)
   - Same as User Trust Score

8. EXPERIENCE BONUS
   - +5.0 if completedBookings >= 50
   - +3.0 if completedBookings >= 25
   - +1.0 if completedBookings >= 10

9. DETECTION FLAG PENALTIES
   - Subtract penalty points based on flag type
   - Maximum penalty = min(totalPenaltyPoints, score * 0.4)

10. NEW PROVIDER MULTIPLIER
    - If completedBookings < 3 AND ageInDays < 30:
      - score *= 0.9

11. FINAL CLAMP
    - score = clamp(score, 0, 100)
```

---

## Review System

### Constants

| Constant | Value |
|----------|-------|
| `REVIEW_WINDOW_DAYS` | 30 |
| `MAX_COMMENT_LENGTH` | 500 |
| `MIN_RATING` | 1 |
| `MAX_RATING` | 5 |
| `CONSECUTIVE_BAD_REVIEWS_THRESHOLD` | 5 |
| `BAD_REVIEW_RATING_THRESHOLD` | 2 |

### Review Quality Score

```
qualityScore = (commentLength / MAX_COMMENT_LENGTH + rating / MAX_RATING) / 2.0
```

### Review Window Validation

A review can only be submitted within 30 days of service completion:

```
isWithinReviewWindow(completedAt) {
  completedTime = new Date(completedAt).getTime()
  now = Date.now()
  windowInMs = 30 * 24 * 60 * 60 * 1000
  return (now - completedTime) <= windowInMs
}
```

### Consecutive Bad Reviews Detection

If a user/provider receives 5 consecutive bad reviews (rating <= 2), an automatic system report is generated:

1. Query last 5 reviews ordered by `createdAt` descending
2. Check if all 5 have rating <= 2
3. If true, create a report in the `reports` collection with:
   - Title: "5 Consecutive Bad Reviews - {displayName}"
   - Category: "bad_reviews"
   - Source: `system_auto_report_consecutive_bad_reviews_{scenarioType}_{userType}`
   - Structured JSON with user details, review IDs, ratings, etc.

### Service Rating Updates

On review submission, service average ratings are recalculated:

```
newAverageRating = ((currentAverage * currentCount) + newRating) / newCount
```

On review deletion:
```
newAverageRating = ((currentAverage * currentCount) - deletedRating) / (newCount - 1)
```

---

## Firestore Collections

### `reputations/{userId}`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User or provider ID |
| `trustScore` | number | Calculated trust score |
| `trustLevel` | string | Trust level (New, Low, Medium, High, VeryHigh) |
| `completedBookings` | number | Total completed bookings |
| `averageRating` | number | Average rating received |
| `detectionFlags` | array | List of active flags |
| `lastUpdated` | number | Timestamp of last update |

### `reputations/{userId}/history/{timestamp}`

| Field | Type | Description |
|-------|------|-------------|
| `trustScore` | number | Score at this point in time |
| `timestamp` | number | Timestamp of this record |

### `reviews/{reviewId}`

Client-to-provider reviews.

### `providerReviews/{reviewId}`

Provider-to-client reviews.

---

## Reputation Functions (Cloud Functions)

### User Functions

| Function | Description |
|----------|-------------|
| `initializeReputation` | Initialize reputation for new user (BASE_SCORE = 50) |
| `updateUserReputation` | Recalculate user trust score |
| `checkUserReputation` | Get current reputation (or defaults if not exists) |
| `deductReputationForCancellation` | Subtract CANCELLATION_PENALTY from score |

### Provider Functions

| Function | Description |
|----------|-------------|
| `updateProviderReputation` | Recalculate provider trust score |

### Review Functions

| Function | Description |
|----------|-------------|
| `submitReview` | Submit client review for a booking |
| `submitProviderReview` | Submit provider review for a client |
| `updateReview` | Update an existing review |
| `deleteReview` | Hide a review (soft delete) |
| `restoreReview` | Restore a hidden review (admin) |
| `getReview` | Get single review by ID |
| `getBookingReviews` | Get reviews for a booking |
| `getUserReviews` | Get reviews by a user |
| `getProviderReviews` | Get reviews for a provider |
| `getServiceReviews` | Get reviews for a service |
| `getClientProviderReviews` | Get provider reviews about a client |
| `getProviderReviewsByProvider` | Get reviews written by a provider |
| `bulkUpdateReviewStatus` | Bulk update review status (admin) |
| `calculateProviderRating` | Calculate average rating for provider |
| `calculateServiceRating` | Calculate average rating for service |
| `calculateUserAverageRating` | Calculate user's average rating |
| `getAllReviews` | Get all reviews with pagination (admin) |
| `getReviewStatistics` | Get review counts by status (admin) |
| `flagReview` | Flag review for moderation (admin) |

---

## Reputation Flow

### On Review Submission

1. Validate booking exists and is completed
2. Check review window (30 days)
3. Check for existing review
4. Create review in transaction
5. Update service rating statistics
6. Call `processReviewForReputationInternal()`:
   - Updates client's trust score
   - Updates provider's trust score
7. Check for consecutive bad reviews (auto-report if triggered)

### On Booking Cancellation

1. Call `deductReputationForCancellation()`
2. Subtract `CANCELLATION_PENALTY` (5.0) from current score
3. Score cannot go below 0
4. Recalculate trust level
5. Write to reputation and history collections

---

## Anti-Abuse Measures

1. **Review Window**: 30-day limit prevents old review manipulation
2. **Consecutive Bad Reviews Detection**: Auto-reports users/providers with 5+ bad reviews
3. **Detection Flags**: Manual/admin-applied flags that penalize scores
4. **Quality Score**: Reviews with longer comments score higher
5. **Bayesian Average**: Prevents manipulation from small sample sizes
6. **Activity Multiplier**: New users with low activity get score penalty
