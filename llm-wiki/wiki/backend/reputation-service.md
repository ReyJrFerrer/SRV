---
tags: [backend, reputation]
date: 2026-06-16
sources:
  - functions/src/reputation.js
  - functions/src/utils/reputationMath.js
related:
  - [[Reputation System Overview]]
  - [[Reputation Scoring Algorithm]]
  - [[Gemini Review Analysis]]
---

# Reputation Service (Firestore)

The actual production reputation system — a Firestore-native Cloud Function (`reputationAction`) with 7 sub-actions. No blockchain involvement.

## File Structure

- `functions/src/reputation.js` — Handler + internal service logic + exported `reputationAction`
- `functions/src/utils/reputationMath.js` — Pure math utility (constants, Bayesian avg, score calc)

## Exported Actions

All routed through `reputationAction` via an `action` parameter:

| Action | Purpose |
|---|---|
| `initializeReputation` | Creates default `reputations/{userId}` doc with BASE_SCORE (50) |
| `updateUserReputation` | Recalculates client trust score from Firestore data |
| `updateProviderReputation` | Recalculates provider trust score |
| `processReviewForReputation` | Runs AI flag check + updates both client and provider scores |
| `deductReputationForCancellation` | Applies CANCELLATION_PENALTY (5 pts) |
| `deductReputationForSuspiciousReview` | Adds ReviewBomb flag + recalculates score |
| `updateReputation` | Admin-only manual score override |

## Data Flow

1. Request arrives at `reputationAction` with `{ action, data }`
2. Action dispatcher routes to internal function
3. Internal function queries Firestore for user data (bookings, reviews, account age)
4. Calls `reputationMath.js` to compute score
5. Writes result to `reputations/{userId}` and appends to `reputations/{userId}/history/{timestamp}`

## Firestore Schema

```
reputations/{userId}  →  { trustScore, trustLevel, completedBookings, averageRating, detectionFlags, lastUpdated }
reputations/{userId}/history/{timestamp}  →  { trustScore, trustLevel, completedBookings, averageRating, detectionFlags, timestamp, action }
```

> **Note**: History records store full state snapshots, not just trust score. The `action` field records what triggered the update (e.g., `"update"`).

## Key Implementation Detail

`reputation.js` duplicates `admin.initializeApp()` (line 19–28) instead of importing from `firebase-admin.js`. This is a known issue in the [[Functions Lint Report]].

## Test Coverage

31 integration tests covering all 7 actions — see [[Reputation Test Infrastructure]] for the full coverage matrix.

| Metric | Value |
|---|---|
| Total cases | 31 |
| Actions covered | 7 / 7 |
| Tests passing | 31 / 31 |
| Lint clean | yes |

## Related Pages

- [[Reputation Scoring Algorithm]] — Full formula breakdown
- [[Gemini Review Analysis]] — AI analysis pipeline that feeds into this service
- [[Reputation Test Infrastructure]] — 31 test cases, per-action matrix
