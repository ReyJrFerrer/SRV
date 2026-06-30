---
tags: [backend, ai, reviews, gemini]
date: 2026-06-16
sources:
  - functions/src/utils/geminiClient.js
  - functions/src/utils/reviewAnalyzer.js
  - functions/src/queueReviewAnalysis.js
related:
  - [[Reputation System Overview]]
  - [[Reputation Scoring Algorithm]]
---

# Gemini Review Analysis

Integration of Google Gemini 2.5 Flash with the review system for AI-powered review bombing detection. Adds content analysis beyond simple rating-based detection.

## Architecture

Flow: `submitReview()` → Firestore write → `analyzeNewReview` (Firestore `onDocumentCreated` trigger) → `processReviewAnalysisWithRetry()` → `analyzeReviewContent()` (Gemini API) → update review with `aiAnalysis` fields → `checkConsecutiveBadReviews()` for both provider and client → optional consolidated AI report.

> **Note**: Analysis is triggered by the Firestore trigger `analyzeNewReview` in `queueReviewAnalysis.js`, not by Cloud Tasks. The trigger runs inline in the same Cloud Functions runtime with a concurrency limit of 5 (`MAX_CONCURRENT_ANALYSES`).

## Gemini Analysis

The Gemini prompt (`buildSingleReviewPrompt` in `reviewAnalyzer.js`) asks the LLM to detect suspicious patterns:
- **Template Detection**: Identifies copied or generic language patterns
- **Text Similarity**: Flags high similarity between recent reviews
- **Velocity Check**: Detects coordinated bursts of negative reviews
- **Rating Mismatch**: Flags suspicious rating/content combinations (e.g., 5 stars with no comment)
- **Competitive Sabotage**: Detects language suggesting unfair targeting

## Firestore Schema Addition

Reviews gain an `aiAnalysis` block with fields: `analyzed`, `analyzedAt`, `isSuspicious`, `confidence`, `patterns[]`, `threatLevel` (low/medium/high), `summary`, `cachedAt`.

## Caching

TTL of 24 hours for AI results (configurable via `GEMINI_CACHE_TTL_HOURS`). Cache stored directly on the review document to avoid a separate cache layer.

## Graceful Degradation

If Gemini is unavailable, the system falls back to rating-based `checkConsecutiveBadReviews()` only. No user-facing disruption.

## Cost

~$3/month for 10,000 reviews with 10% batch analysis. Review-level analysis costs ~$0.000165 each.

## Security

API key stored in Firebase Secret Manager (never in code or env files directly).
