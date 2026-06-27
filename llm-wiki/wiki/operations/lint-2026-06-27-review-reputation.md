---
tags: [operations, lint, review, reputation]
date: 2026-06-27
related:
  - [[Reputation Service (Firestore)]]
  - [[Gemini Review Analysis]]
  - [[Reputation Scoring Algorithm]]
  - [[Reputation System Overview]]
  - [[Reputation System ICP]]
  - [[Reputation System Sui]]
sources:
  - functions/src/review.js
  - functions/src/reputation.js
  - functions/src/utils/reputationMath.js
  - functions/src/utils/reviewAnalyzer.js
  - functions/src/queueReviewAnalysis.js
  - src/frontend/src/services/reviewCanisterService.ts
  - src/frontend/src/services/reputationService.ts
  - src/frontend/src/hooks/reviewManagement.tsx
  - src/frontend/src/hooks/useReputation.tsx
  - src/frontend/src/hooks/useClientRating.tsx
  - src/frontend/src/hooks/useFeedback.tsx
---

# Wiki Lint 2026-06-27 — Review & Reputation

Health check of all review and reputation wiki pages against actual source code as of 2026-06-27.

## Contradictions

### 1. Trust level "New" does not exist — "Low" takes its range

**Page**: `domain/reputation-scoring-algorithm.md` Trust Level Thresholds table — "New (0–20)"

**Reality**: `determineTrustLevel()` in `reputationMath.js:101-108` iterates through `[{level: "Low", threshold: 20}, {level: "Medium", threshold: 50}, ...]`. A score of 0–20 returns `"Low"`. The `TrustLevel` JSDoc typedef includes `'New'` but the function never returns it. The correct first level is "Low", not "New".

### 2. Gemini analysis flows via Firestore trigger, not Cloud Tasks

**Page**: `backend/gemini-review-analysis.md` line 19 — "`submitReview()` → Firestore write → `analyzeReviewContentBackground()` (Cloud Tasks) → Gemini API"

**Reality**: No `analyzeReviewContentBackground` function exists in `functions/`. After `submitReview` writes to Firestore, analysis is triggered by the Firestore `onDocumentCreated` trigger `analyzeNewReview` (`queueReviewAnalysis.js:202-256`). It reads the new review document, calls `analyzeReviewContent()`, updates the review with `aiAnalysis` fields, then calls `checkConsecutiveBadReviews`. There is no Cloud Tasks involvement.

### 3. Gemini does not perform sentiment analysis or consistency verification

**Page**: `backend/gemini-review-analysis.md` lines 23-27 — lists "Sentiment Analysis", "Template Detection", "Text Similarity", "Velocity Check", "Consistency Verification"

**Reality**: The actual Gemini prompt (`buildSingleReviewPrompt` in `reviewAnalyzer.js:123-148`) asks the LLM to detect suspicious patterns: template/copied language, generic content, rating mismatch, competitive sabotage, and fake review characteristics. The analysis result stores `isSuspicious`, `confidence`, `patterns`, `threatLevel`, and `summary` — **no sentiment score** is computed or stored. "Consistency Verification" (comparing numeric rating with an LLM sentiment score) is not implemented — the prompt has a single "Reviews that don't match the rating" bullet, but there's no separate sentiment/consistency pipeline.

## Missing Documentation / Features Not in Any Wiki Page

### 4. No dedicated Review System wiki page

There are 4 wiki pages covering reputation, but **zero** pages covering the review system itself. `functions/src/review.js` exports 25 actions (the largest surface area of any Cloud Function module), yet none of the following are documented in any wiki page:

### 5. `submitProviderReview` action
Writes to the `providerReviews` collection (not `reviews`) with `reviewType: "ProviderToClient"`. After submission, `processReviewForReputationInternal(reviewData, true)` is called with `shouldFlag=true`, which scans for abusive keywords and reputation penalties.

### 6. `providerReviews` collection
A separate Firestore collection with schema: `{ id, bookingId, clientId, providerId, serviceId, rating, comment, createdAt, updatedAt, status, qualityScore, reviewType: "ProviderToClient" }`. Undocumented.

### 7. Review moderation workflow
`flagReview` (admin sets status to "Flagged"), `flagReviewForAdmin` (provider creates a report in `reports` collection with `reportType: "review_flag"`), `getReviewFlagReports`, `getMyReviewFlagReports`, `updateReviewFlagReportStatus` — entire moderation pipeline undocumented.

### 8. Review admin actions
`getAllReviews`, `getReviewStatistics` (counts Visible/Hidden/Flagged/Deleted), `restoreReview`, `bulkUpdateReviewStatus` — all undocumented.

### 9. Review rating calculation endpoints
`calculateProviderRating`, `calculateServiceRating`, `calculateUserAverageRating` — three dedicated rating endpoints, undocumented.

### 10. `updateReview` action
Allows the review author to update rating and comment. Recalculates service `averageRating` and `reviewCount` in a transaction. The wiki mentions `editReview` in passing but doesn't document the action.

### 11. Review status values
The review document `status` field can be `"Visible"`, `"Hidden"`, `"Flagged"`, or `"Deleted"`. `getReviewStatistics` queries all four. Wiki only mentions "Visible" and "Hidden".

### 12. `qualityScore` field on reviews
Each review stores a `qualityScore` calculated by `calculateQualityScore({rating, comment})` as `(comment.length/MAX_COMMENT_LENGTH + rating/MAX_RATING) / 2`. Undocumented.

### 13. `"Other"` detection flag missing from penalties table
`domain/reputation-scoring-algorithm.md` penalty table lists 5 flags but omits `"Other"` (5 pts, no stacking bonus). The `reputationMath.js:172-173` handles it: `case "Other": penaltyPoints += 5.0`.

### 14. Provider new-user bonus (+5 when averageRating is null)
`reputationMath.js:207` — when `averageRating` is null/undefined for a provider, `score += 5.0` ("Small bonus for new providers"). This is not mentioned in the provider score formula in `domain/reputation-scoring-algorithm.md`.

### 15. `updateReview` (not `editReview`) discrepancy
The `reviewCanisterService.ts` frontend service calls the action `"updateReview"`, not `"editReview"`. The wiki should standardize on the actual action name.

### 16. `getUserReviews` action
Allows fetching reviews by `clientId`, with optional `includeHidden` for admins. Includes index-fallback logic. Undocumented.

### 17. `getUserRating` action
The frontend `reviewCanisterService.ts` has `getUserRating` (calls `calculateUserAverageRating`). The backend action is `calculateUserAverageRating`. Neither is in any wiki page.

### 18. `deleteReview` does not hard-delete
`deleteReview` in `review.js:466-562` sets `status: "Hidden"` — it's a soft-delete, not a deletion. Updates service `averageRating` and `reviewCount`. Works for both `reviews` and `providerReviews` collections.

## Stale Claims

### 19. Review weighting based on reviewer trust score does not exist
`domain/reputation-scoring-algorithm.md` line 89-91: "A review's impact on reputation depends on the reviewer's own trust score (0.5x–1.5x), trust level bonuses, review quality (length and detail), and time decay (180-day half-life)."

**Reality**: No such logic exists in either `review.js`, `reputation.js`, or `reputationMath.js`. `processReviewForReputationInternal` simply recalculates both user and provider trust scores independently from Firestore aggregates. There is no per-review weighting, no multiplier based on reviewer trust, no time decay factor, and no review quality bonus.

### 20. Reputation history schema is incomplete
`backend/reputation-service.md` line 47: history subcollection stores `{ trustScore, timestamp }`.

**Reality**: `updateReputationFields` in `reputation.js` writes: `{ trustScore, trustLevel, completedBookings, averageRating, detectionFlags, timestamp, action }` — full state, not just score+timestamp.

### 21. "Cancellation flag listed with other penalties"
`domain/reputation-scoring-algorithm.md` penalty table includes `Cancellation | 5 pts flat | Applied separately`. This is accurate for the value, but the table grouping implies it's an `DetectionFlag` enum member, which it's not — cancellation is applied outside `reputationMath.js` via `deductReputationForCancellationInternal` and is not a flag.

### 22. Gemini cost estimate may be stale
`backend/gemini-review-analysis.md` line 43: "~$3/month for 10,000 reviews with 10% batch analysis" — this estimate was reasonable for Gemini 1.5 Flash pricing. Gemini 2.5 Flash pricing may differ. Hard to verify without actual billing data, but worth noting.

## Gaps (Concepts Without Dedicated Pages)

- **Review System** — 25 backend actions, Firestore trigger, 2 collections, moderation pipeline, frontend service + 3 hooks. The largest gap in the wiki.
- **`reports` collection** — Used by review flags, consecutive bad review detection, cancellation reports, and AI-triggered reports. No page documents its schema or role.
- **`analyzeNewReview` Firestore trigger** — The actual AI analysis entry point is a Firestore trigger in `queueReviewAnalysis.js`, not documented anywhere in the wiki.
- **`useFeedback.tsx` vs `useReview` system** — `useFeedback.tsx` sends to `feedbackCanisterService` (ICP canister), while the review system uses `reviewCanisterService` (also ICP). The distinction and relationship between "feedback" and "review" is undocumented.
- **Consecutive Bad Review Detection** — `checkConsecutiveBadReviews` in `reviewAnalyzer.js:366-637` is a substantial feature (batch AI analysis, report creation, reputation deduction) with zero wiki coverage.

## Summary

| Severity | Count |
|----------|-------|
| Contradictions | 3 |
| Missing documentation | 15 |
| Stale claims | 4 |
| Gaps | 5 |
