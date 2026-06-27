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

Flow: `submitReview()` → Firestore write → `analyzeReviewContentBackground()` (Cloud Tasks) → Gemini API → update review with `aiAnalysis` fields → `checkConsecutiveBadReviews()` enhancement.

## Gemini Analysis

- **Sentiment Analysis**: LLM rates sentiment 0.0–1.0
- **Template Detection**: Identifies copied or generic language patterns
- **Text Similarity**: Flags high similarity between recent reviews
- **Velocity Check**: Detects coordinated bursts of negative reviews
- **Consistency Verification**: Compares numeric rating with LLM sentiment score — flags mismatches (e.g., 5 stars with negative comment)

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
