# Gemini 2.5 Flash Integration for Review Bombing Detection

## Overview

This document outlines the plan to integrate Google Gemini 2.5 Flash with the existing review bombing detection system. The integration adds AI-powered content analysis to detect sophisticated review bombing attempts that simple rating-based detection cannot catch.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Review Submission Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client App                                                                  │
│     │                                                                         │
│     ▼                                                                         │
│  submitReview() ───────────────────────────────────────────────┐            │
│     │                                                              │            │
│     │                                                             │            │
│     ▼                                                             │            │
│  Review Written to Firestore                                      │            │
│     │                                                              │            │
│     │    ┌───────────────────────────────────────────────────────┘            │
│     │    │                                                                    │
│     ▼    ▼                                                                    │
│  Queue Review for Background Processing                                      │
│     │                                                                    │
│     ▼                                                                    │
│  analyzeReviewContentBackground()  ◄── Gemini 2.5 Flash                     │
│     │                                                                    │
│     ├──► AI Content Analysis                                               │
│     │       • Sentiment Analysis                                           │
│     │       • Template Detection                                           │
│     │       • Text Similarity                                              │
│     │       • Velocity Check                                               │
│     │                                                                    │
│     ▼                                                                    │
│  Update Review Document with AI Results                                     │
│     │                                                                    │
│     ▼                                                                    │
│  checkConsecutiveBadReviews() ──────────────────────────────────► Auto-Report │
│     │                                                                    │
│     └──► Check AI Threat Level                                             │
│             └──► If threatLevel >= 'high' → Trigger immediate report      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuration

### Secret Manager (Environment Variables)

This integration uses Firebase Secret Manager for secure API key storage. Secrets are exposed as environment variables in Cloud Functions.

```bash
# Using Firebase CLI to set secrets
firebase functions:secrets:set GEMINI_API_KEY
```

### Environment Variables

| Variable                      | Type    | Default            | Description                                        |
| ----------------------------- | ------- | ------------------ | -------------------------------------------------- |
| `GEMINI_API_KEY`              | string  | -                  | **Required.** Gemini API key (from Secret Manager) |
| `GEMINI_MODEL`                | string  | `gemini-2.0-flash` | Model identifier                                   |
| `GEMINI_ANALYSIS_ENABLED`     | boolean | `true`             | Enable/disable AI analysis                         |
| `GEMINI_CONFIDENCE_THRESHOLD` | number  | `0.7`              | Min confidence to trigger flag                     |
| `GEMINI_CACHE_TTL_HOURS`      | number  | `24`               | Cache TTL for AI analysis results                  |

### Local Development

For local development, add to `.env` file:

```bash
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.0-flash
GEMINI_ANALYSIS_ENABLED=true
GEMINI_CONFIDENCE_THRESHOLD=0.7
GEMINI_CACHE_TTL_HOURS=24
```

> **Note:** The `.env` file should never be committed to version control. Ensure it's in `.gitignore`.

## New Files

### 1. `functions/src/utils/geminiClient.js`

Gemini API wrapper with:

- API key management via environment variables (Secret Manager)
- Request/response handling
- Error handling and retries
- Response caching

### 2. `functions/src/utils/reviewAnalyzer.js`

Core AI analysis logic:

- `analyzeReviewContent(review)` - Analyze single review
- `analyzeReviewBatch(reviews)` - Batch analysis for patterns
- `detectReviewBombingPattern(reviews)` - Coordinated attack detection
- Caching layer to avoid redundant API calls

### 3. `functions/src/queueReviewAnalysis.js`

Background function triggered on review creation:

- Cloud Tasks queue for async processing
- Rate limiting to prevent API throttling
- Graceful degradation on AI failure

## Modified Files

### 1. `functions/src/review.js`

**Changes:**

- `submitReview()` - Queue AI analysis instead of inline call
- `checkConsecutiveBadReviews()` - Enhanced to consider AI threat level

### 2. `functions/src/reputation.js`

**Changes:**

- `processReviewForReputationInternal()` - Apply `ReviewBomb` flag based on AI analysis

### 3. `functions/package.json`

**Changes:**

- Add `@google/generative-ai` dependency

## Firestore Schema Changes

### `reviews/{reviewId}` - New Fields

```javascript
{
  // ... existing fields ...
  aiAnalysis: {
    analyzed: boolean,           // Whether AI analysis has run
    analyzedAt: timestamp,       // When analysis completed
    isSuspicious: boolean,       // AI flagged as suspicious
    confidence: number,          // 0.0 - 1.0
    patterns: string[],         // ['template_language', 'high_similarity']
    threatLevel: string,         // 'low' | 'medium' | 'high'
    summary: string,             // AI explanation
    cachedAt: timestamp          // For cache invalidation
  }
}
```

### `reports/{reportId}` - New Fields

```javascript
{
  // ... existing fields ...
  aiAnalysis: {
    reviewContentAnalyzed: boolean,
    patternsDetected: string[],
    threatLevel: string,
    confidence: number,
    recommendation: string
  }
}
```

## API Design

### Background Function: Queue Review Analysis

**Trigger**: Firestore document create on `reviews/{reviewId}`

**Function**: `analyzeReviewContentBackground`

**Flow**:

1. Receive review document snapshot
2. Check if already analyzed (cache lookup)
3. Call Gemini API for content analysis
4. Store results in review document
5. If high threat, trigger immediate report creation
6. Log analysis for monitoring

### Gemini Analysis Prompt

```
Analyze this review for suspicious patterns indicating fake reviews or review bombing:

Review Text: {review_text}
Rating: {rating}/5
Reviewer Stats: {completed_bookings} total reviews, {average_rating} average rating
Service: {service_name}
Provider: {provider_name}
Date: {created_at}

Focus on detecting:
1. Template or copied language patterns
2. Overly generic or fake-looking content
3. Reviews that don't match the rating (e.g., 5 stars with minimal text)
4. Signs of competitive sabotage
5. Language suggesting fake/improper review

Return a JSON object with this exact structure:
{
  "isSuspicious": boolean,
  "confidence": number (0.0 to 1.0),
  "patterns": string[] (e.g., ["template_language", "generic_content"]),
  "threatLevel": "low" | "medium" | "high",
  "summary": string (2-3 sentence explanation)
}

Only flag as suspicious if confidence >= 0.7. If uncertain, mark as not suspicious.
```

### Batch Analysis Prompt (for coordinated attack detection)

```
Analyze these {count} reviews for coordinated review bombing patterns:

Reviews:
{foreach review}
- Review {index}: "{text}" (Rating: {rating}, Date: {date})
{endforeach}

Look for:
1. Similar sentence structures or templates
2. Same timing (posted within short window)
3. Similar length and formatting
4. Common phrases or keywords
5. Targeting the same provider/service
6. Coordinated negative sentiment

Return a JSON object:
{
  "isCoordinated": boolean,
  "confidence": number (0.0 to 1.0),
  "patterns": string[],
  "threatLevel": "low" | "medium" | "high",
  "summary": string,
  "affectedReviews": string[] (IDs of reviews involved)
}
```

## Caching Strategy

### Review Analysis Cache

**Storage**: Review document itself (field `aiAnalysis.cachedAt`)

**TTL**: Configurable via `gemini.cache_ttl_hours` (default: 24 hours)

**Invalidation**:

- Manual: Admin can force re-analysis
- Automatic: TTL expiration
- On update: If review content changes

### Cache Flow

```
1. Check if aiAnalysis.analyzed == true AND aiAnalysis.cachedAt is recent
2. If yes → Return cached results
3. If no → Call Gemini API
4. Store results with new cachedAt timestamp
```

## Error Handling

### Gemini API Failures

| Scenario         | Handling                                                  |
| ---------------- | --------------------------------------------------------- |
| API timeout      | Retry 3x with exponential backoff, then fail gracefully   |
| Rate limit       | Queue for later processing, log warning                   |
| Invalid response | Log error, mark as `analyzed: false`, continue without AI |
| Quota exceeded   | Disable AI analysis temporarily, fallback to rating-only  |

### Graceful Degradation

If AI analysis is unavailable:

1. Continue with review submission (don't block user)
2. Log warning for monitoring
3. Fall back to rating-based `checkConsecutiveBadReviews` only
4. Set up alerting for AI failures

## Monitoring & Logging

### Log Events

| Event                   | Severity | Details                             |
| ----------------------- | -------- | ----------------------------------- |
| `ai_analysis_started`   | INFO     | Review ID, reviewer ID              |
| `ai_analysis_completed` | INFO     | Review ID, threat level, confidence |
| `ai_analysis_failed`    | WARNING  | Review ID, error message            |
| `ai_analysis_cached`    | DEBUG    | Review ID, cache hit                |
| `review_bomb_detected`  | ERROR    | Report ID, patterns, threat level   |

### Metrics to Track

- AI analysis success rate
- Average analysis latency
- Threat level distribution
- Cache hit rate
- Cost estimation (based on token usage)

## Testing Strategy

### Unit Tests

| Test                                          | Description                      |
| --------------------------------------------- | -------------------------------- |
| `analyzeReviewContent` with suspicious review | Verify correct pattern detection |
| `analyzeReviewContent` with legitimate review | Verify no false positives        |
| `analyzeReviewBatch` with coordinated reviews | Verify pattern detection         |
| Cache TTL expiration                          | Verify cache invalidation        |
| API error handling                            | Verify graceful degradation      |

### Integration Tests

| Test                                           | Description                   |
| ---------------------------------------------- | ----------------------------- |
| Full flow: submitReview → AI analysis → Report | E2E test                      |
| Concurrent review submissions                  | Verify queue processing       |
| Gemini API mock tests                          | Avoid external API dependency |

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

- [ ] Install `@google/generative-ai` dependency
- [ ] Create `geminiClient.js` with basic API wrapper
- [ ] Set up Firebase config for API key
- [ ] Create error handling and retry logic

### Phase 2: Core Analysis (Review Analysis Logic)

- [ ] Create `reviewAnalyzer.js`
- [ ] Implement single review analysis
- [ ] Implement batch review analysis
- [ ] Add caching logic
- [ ] Unit tests

### Phase 3: Background Processing (Async Queue)

- [ ] Create `queueReviewAnalysis.js`
- [ ] Set up Cloud Tasks queue
- [ ] Implement background function trigger
- [ ] Add rate limiting

### Phase 4: Integration (Existing Code Updates)

- [ ] Update `submitReview()` to queue analysis
- [ ] Update `checkConsecutiveBadReviews()` with AI data
- [ ] Update `processReviewForReputationInternal()` for AI flags
- [ ] Update report generation with AI data

### Phase 5: Polish (Enhancements)

- [ ] Add comprehensive logging
- [ ] Create monitoring dashboard
- [ ] Backfill existing reviews with AI analysis
- [ ] Performance optimization

## Cost Estimation

### Gemini 2.0 Flash Pricing (Approximate)

| Operation             | Cost   |
| --------------------- | ------ |
| Input (per 1K chars)  | $0.075 |
| Output (per 1K chars) | $0.30  |

### Estimated Usage

| Scenario          | Input       | Output     | Cost per Review |
| ----------------- | ----------- | ---------- | --------------- |
| Single review     | ~500 chars  | ~200 chars | ~$0.000165      |
| Batch (5 reviews) | ~2500 chars | ~400 chars | ~$0.000315      |

### Monthly Estimate

Assuming 10,000 reviews/month with 10% batch analysis:

```
Single reviews: 9,000 × $0.000165 = $1.49
Batch analysis: 1,000 × (5 reviews) × $0.000315 = $1.58
Total: ~$3.07/month
```

## Security Considerations

1. **API Key Protection**: Store in Firebase Config, never in code
2. **Input Sanitization**: Escape user content before sending to Gemini
3. **Rate Limiting**: Prevent abuse via Cloud Functions quotas
4. **Audit Logging**: Log all AI analysis for compliance

## Migration Plan

### For Existing Reviews

Run one-time batch analysis:

```javascript
// Admin function to backfill AI analysis
exports.backfillReviewAnalysis = onCall(async (request) => {
  // Query all reviews without aiAnalysis.analyzed
  // Queue each for background processing
  // Track progress via Cloud Tasks
});
```

### Backward Compatibility

- All changes are additive (no breaking changes)
- Existing reviews without AI data continue to work
- Rating-based detection remains as fallback
