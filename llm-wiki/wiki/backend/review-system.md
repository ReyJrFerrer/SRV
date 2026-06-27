---
tags: [backend, reviews]
date: 2026-06-27
sources:
  - functions/src/review.js
  - functions/src/queueReviewAnalysis.js
  - functions/src/utils/reviewAnalyzer.js
  - src/frontend/src/services/reviewCanisterService.ts
  - src/frontend/src/hooks/reviewManagement.tsx
  - src/frontend/src/hooks/useClientRating.tsx
related:
  - [[Gemini Review Analysis]]
  - [[Reputation Service (Firestore)]]
  - [[Reputation Scoring Algorithm]]
  - [[Services Layer]]
  - [[State and Hooks]]
---

# Review System

The review system spans two Firestore collections (`reviews`, `providerReviews`), a consolidated Cloud Function entrypoint (`reviewAction`) with 23 actions, a Firestore-triggered AI analysis pipeline, and a frontend service + hooks layer.

## Backend: `functions/src/review.js`

### Entrypoint

All actions are routed through a single `onCall` function:

```
reviewAction ({ action, data }) → dispatches to internal handler
```

### Client Reviews (`reviews` collection)

#### Document Schema

```
reviews/{reviewId}
  id: string          — auto-generated as `${Date.now()}-${random}`
  bookingId: string
  clientId: string
  providerId: string
  serviceId: string
  rating: number      — 1–5 (validated by isValidRating)
  comment: string     — max 500 chars (MAX_COMMENT_LENGTH)
  createdAt: string   — ISO 8601
  updatedAt: string   — ISO 8601
  status: string      — "Visible" | "Hidden" | "Flagged" | "Deleted"
  qualityScore: number — (comment.length/500 + rating/5) / 2

  // After AI analysis (set by queueReviewAnalysis):
  aiAnalysis: {
    analyzed: boolean
    analyzedAt: string
    isSuspicious: boolean
    confidence: number
    patterns: string[]
    threatLevel: "low" | "medium" | "high"
    summary: string
    cachedAt: string
  }
```

#### Constants

| Constant | Value | Enforced In |
|---|---|---|
| `REVIEW_WINDOW_DAYS` | 30 | `submitReview`, `submitProviderReview` |
| `MAX_COMMENT_LENGTH` | 500 | All write actions |
| `MIN_RATING` | 1 | All write actions |
| `MAX_RATING` | 5 | All write actions |

#### Actions

| Action | Auth | Description |
|---|---|---|
| `submitReview` | Authenticated | Creates a review for a completed booking. Validates booking is completed, within 30-day window, no duplicate review. Updates service `averageRating` and `reviewCount` in same transaction. After commit, calls `processReviewForReputationInternal` for reputation impact. |
| `getReview` | — | Fetches single review by ID. Throws if status is "Hidden". |
| `getBookingReviews` | — | Returns all Visible reviews for a booking. |
| `getUserReviews` | Authenticated | Returns reviews by `clientId`. Admins can pass `includeHidden`. Falls back to client-side filtering on index errors. |
| `updateReview` | Owner | Updates rating and comment. Recalculates service `averageRating` in transaction if rating changed. Only Visible reviews can be updated. |
| `deleteReview` | Owner/Admin | **Soft-delete**: sets `status: "Hidden"`. Updates service `averageRating` and `reviewCount`. Works for both `reviews` and `providerReviews` collections. |
| `getProviderReviews` | — | Returns Visible reviews for a provider, with pagination (`limit`/`offset`). |
| `getServiceReviews` | — | Returns Visible reviews for a service, with pagination. Admins can pass `includeHidden`. |
| `calculateProviderRating` | — | Returns `{ averageRating, reviewCount, providerId }` from Visible reviews. |
| `calculateServiceRating` | — | Returns `{ averageRating, reviewCount, serviceId }` from Visible reviews. |
| `calculateUserAverageRating` | Auth'd/Owner | Returns `{ averageRating, reviewCount, userId }` for a user's reviews. |

### Provider Reviews (`providerReviews` collection)

Separate collection for provider-to-client reviews, stored at `providerReviews/{reviewId}`.

#### Document Schema

```
providerReviews/{reviewId}
  id: string
  bookingId: string
  clientId: string
  providerId: string
  serviceId: string
  rating: number       — 1–5
  comment: string      — max 500 chars
  createdAt: string
  updatedAt: string
  status: string       — "Visible" | "Hidden"
  qualityScore: number
  reviewType: string   — always "ProviderToClient"
```

#### Actions

| Action | Auth | Description |
|---|---|---|
| `submitProviderReview` | Provider (booking's provider) | Creates a review of a client in `providerReviews`. Validates booking is completed, within 30-day window, no duplicate. Calls `processReviewForReputationInternal(reviewData, true)` — the `true` enables abusive keyword flagging and reputation deduction for the reviewed client. |
| `getClientProviderReviews` | — | Returns Visible provider reviews for a client. Supports `includeHidden` for admins. |
| `getProviderReviewsByProvider` | — | Returns Visible provider reviews by provider ID. Supports `includeHidden` for admins. |

### Admin Actions

| Action | Auth | Description |
|---|---|---|
| `flagReview` | Admin | Sets review `status: "Flagged"` with `flaggedAt`, `flaggedBy`, `flagReason`. |
| `flagReviewForAdmin` | Authenticated | Creates a report in the `reports` collection with `reportType: "review_flag"`. Provider-facing: lets any user flag a review for admin review. |
| `getReviewFlagReports` | Admin | Returns all reports with `reportType: "review_flag"`. |
| `getMyReviewFlagReports` | Auth'd user | Returns the user's own review flag reports. |
| `updateReviewFlagReportStatus` | Admin | Updates a flag report's status (`open`/`resolved`/`dismissed`). |
| `getAllReviews` | Admin | Returns all reviews with optional `status` filter, paginated. |
| `getReviewStatistics` | Admin | Returns counts for each status: `{ totalReviews, activeReviews, hiddenReviews, flaggedReviews, deletedReviews }`. |
| `restoreReview` | Admin | Sets `status: "Visible"` on a hidden review. Restores service `averageRating` and `reviewCount`. |
| `bulkUpdateReviewStatus` | Admin | Batch updates review statuses in chunks of 500. Processes both `reviews` and `providerReviews` collections. |

## AI Analysis Integration

See [[Gemini Review Analysis]] for details.

Trigger flow:

```
submitReview() → Firestore write (reviews/{reviewId})
  → analyzeNewReview (Firestore onDocumentCreated trigger in queueReviewAnalysis.js)
    → processReviewAnalysisWithRetry(reviewId)
      → analyzeReviewContent(review) in reviewAnalyzer.js
        → Gemini API (buildSingleReviewPrompt / buildBatchReviewPrompt)
      → updateReviewWithAnalysis(reviewId, analysis)
        → sets aiAnalysis block on the review doc
    → checkConsecutiveBadReviews("reviews", "providerId", providerId, ...)
    → checkConsecutiveBadReviews("reviews", "clientId", clientId, ...)
    → if no report created and shouldTriggerReport:
      → createConsolidatedAIReport(review, aiAnalysis)
```

The trigger has a concurrency limit of 5 (`MAX_CONCURRENT_ANALYSES`) and retries up to 2 times with exponential backoff.

### Consecutive Bad Review Detection

`checkConsecutiveBadReviews` in `reviewAnalyzer.js:366-637`:

- Triggers when 5 consecutive reviews (`CONSECUTIVE_BAD_REVIEWS_THRESHOLD`) with rating ≤ 2 (`BAD_REVIEW_RATING_THRESHOLD`) exist for a provider or client.
- Runs batch AI analysis (if ≥2 reviews) or single review AI analysis.
- Creates a detailed report in the `reports` collection with review IDs, ratings, AI analysis results, and service/provider context.
- If AI confirms suspicious patterns, deducts reputation via `deductReputationForSuspiciousReviewInternal`.

### AI Analysis Report

If `checkConsecutiveBadReviews` does not create a report, but `shouldTriggerReport` returns true (threat level is "high" with confidence ≥ 0.7, or "medium" with confidence ≥ 0.85), `createConsolidatedAIReport` creates a report in the `reports` collection with `source: "ai_analysis"`.

## Reports Collection

The `reports` collection is shared across multiple systems:

```
reports/{reportId}
  id: string
  userId: string           — the user being reported
  userName: string
  userPhone: string
  description: string      — JSON-encoded ticket with context
  status: string           — "open" | "resolved" | "dismissed"
  createdAt: string
  reportType?: string      — "review_flag" (from flagReviewForAdmin)
  source?: string          — "ai_analysis" | "system_auto_report_consecutive_bad_reviews_..."
  aiAnalysisTriggered?: boolean
  attachments?: string[]
```

## Frontend: `src/frontend/src/services/reviewCanisterService.ts`

The service maps 1:1 to backend actions, with additional client-side helper methods:

| Method | Backend Action | Notes |
|---|---|---|
| `submitReview` | `submitReview` | — |
| `getReview` | `getReview` | — |
| `getBookingReviews` | `getBookingReviews` | — |
| `getUserReviews` | `getUserReviews` | — |
| `updateReview` | `updateReview` | — |
| `deleteReview` | `deleteReview` | — |
| `restoreReview` | `restoreReview` | Admin |
| `bulkUpdateReviewStatus` | `bulkUpdateReviewStatus` | Admin |
| `calculateProviderRating` | `calculateProviderRating` | — |
| `calculateServiceRating` | `calculateServiceRating` | — |
| `calculateUserAverageRating` | `calculateUserAverageRating` | — |
| `getAllReviews` | `getAllReviews` | Admin |
| `getReviewStatistics` | `getReviewStatistics` | Admin |
| `flagReview` | `flagReview` | Admin |
| `flagReviewForAdmin` | `flagReviewForAdmin` | Provider-facing |
| `getReviewFlagReports` | `getReviewFlagReports` | Admin |
| `getMyReviewFlagReports` | `getMyReviewFlagReports` | — |
| `updateReviewFlagReportStatus` | `updateReviewFlagReportStatus` | Admin |
| `getProviderReviews` | `getProviderReviews` | — |
| `getServiceReviews` | `getServiceReviews` | — |
| `submitProviderReview` | `submitProviderReview` | — |
| `getClientProviderReviews` | `getClientProviderReviews` | — |
| `getProviderReviewsByProvider` | `getProviderReviewsByProvider` | — |
| `canUserReviewBooking` | — | Client-side check via `getBookingReviews` |
| `getRecentReviews` | — | Client-side filter on `getAllReviews` |
| `getTopRatedReviews` | — | Client-side sort on `getAllReviews` |

## Frontend Hooks

### `useReviewManagement` (`hooks/reviewManagement.tsx`)

Main hook wrapping `reviewCanisterService` with profile enrichment, caching, and analytics.

**Enrichment**: Each `Review` is enriched into `EnhancedReview`:
- `clientProfile` / `providerProfile` (fetched via `authCanisterService.getProfile`)
- `clientName` / `providerName` / `clientAvatar` (with fallback)
- `clientReputationScore` / `clientReputationLevel` (fetched from `reputationService.getReputationScore`)
- `isOwner` / `canEdit` / `canDelete` (permission flags)
- `formattedDate` / `relativeTime` (formatted timestamps)

**Analytics**: `calculateAnalytics()` computes:
- Rating distribution (1–5)
- Time-window counts (this week, this month)
- Status breakdown (Visible, Hidden, Flagged)
- Quality score (`avgRating/5 * 0.6 + topRatedRatio * 0.4`)

**Options**: `autoRefresh`, `refreshInterval`, `enableProfileCaching`, `autoLoadUserReviews`.

### Specialized Hooks

| Hook | Purpose |
|---|---|
| `useServiceReviews(serviceId)` | Auto-loads reviews for a service page. 30s refresh interval. |
| `useProviderReviews(providerId)` | Auto-loads reviews for a provider dashboard. 30s refresh interval. |
| `useBookingRating(bookingId)` | Checks if the current user can review a booking. |
| `useClientRating(bookingId)` | Submits and fetches provider-to-client reviews. Wraps `submitProviderReview`, `getClientProviderReviews`. |

## Notable Implementation Details

1. **No hard-delete**: `deleteReview` sets `status: "Hidden"` — reviews are never actually deleted from Firestore.
2. **Reputation impact is synchronous**: After `submitReview` and `submitProviderReview`, `processReviewForReputationInternal` is called inline (not queued). The user waits for reputation recalculation.
3. **AI analysis is asynchronous**: The Firestore trigger runs after the response is returned to the client. The `aiAnalysis` field may be null for a brief window after review creation.
4. **No review weighting**: Despite being documented in older wiki versions, there is no per-review weighting based on reviewer trust score, review quality, or time decay. Each review affects reputation equally through aggregate rating and booking counts.
5. **Index-fallback pattern**: Several query functions (`getUserReviews`, `getServiceReviews`, `getClientProviderReviews`) fall back to in-memory filtering when Firestore composite indexes are missing.

## Related

- [[Gemini Review Analysis]] — AI analysis pipeline triggered by new reviews
- [[Reputation Service (Firestore)]] — Reputation recalculation triggered after review submission
- [[Reputation Scoring Algorithm]] — Trust score formulas used in reputation calculations
- [[Services Layer]] — Frontend service architecture context
- [[State and Hooks]] — Hook system context
