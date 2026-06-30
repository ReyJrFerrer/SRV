---
tags: [backend, reputation, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Reputation Service (Firestore)]]
  - [[Reputation Scoring Algorithm]]
  - [[Unit Test Creation Checklist]]
  - [[Booking Test Infrastructure]]
  - [[Review Test Infrastructure]]
sources:
  - functions/test/reputation.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/reputation.js
  - functions/src/utils/reputationMath.js
---

# Reputation Test Infrastructure

The fifth integration test suite for the SRV backend, following the [[Unit Test Creation Checklist]]. Exercises all 7 actions of the consolidated `reputationAction` Cloud Function against a real Firestore + Auth emulator, asserting trust score calculations, persistence, history subcollection entries, and admin-only guards.

## Test Stack

Same stack as [[Booking Test Infrastructure]]:

| Layer | Tool | Purpose |
|---|---|---|
| Runner | Mocha 11 | `describe` / `it` BDD |
| Firebase SDK | `firebase-functions-test` 3.4 | `test.wrap()` to invoke `onCall` handlers |
| Emulator | Firestore + Auth (Firebase Emulator Suite) | Real persistence; tests run actual Firestore reads/writes for users, bookings, reviews, reputations |
| Assertion | `node:assert/strict` | `assert.equal`, `assert.rejects(promise, /regex/i)` |
| Env loader | `dotenv` | Reads `functions/.env.test` |

Run with: `npm test` (after `firebase emulators:start`).

## Test Layout

```
functions/test/
├── mocha.js                    # Shared bootstrap: env, admin init, clearCollections, log routing
├── helpers/
│   └── seed.js                 # Seeders shared across all test suites
└── reputation.test.js          # 7 actions × ~3-5 cases per action (31 total)
```

### Seeders Used

| Seeder | Usage |
|---|---|
| `seedUser(opts)` | Creates user docs for auth context and reputation target |
| `seedReputation(userId, overrides)` | Creates reputation docs with custom trust scores and detection flags |
| `seedBaseEntities(opts)` | Creates full client/provider/service/package/reputation chain for booking-dependent tests |

An inline helper `seedCompletedBookingWithEntities(opts)` extends `seedBaseEntities` to create a completed booking with a configurable timeline and review data, used by `updateUserReputation`, `updateProviderReputation`, and `processReviewForReputation` tests.

## Imported Constants

All numeric constants and utility functions are imported from source, never hardcoded:

| Import | Source | Used In |
|---|---|---|
| `BASE_SCORE` | `reputationMath.js` | `initializeReputation`, `deductReputationForCancellation` |
| `CANCELLATION_PENALTY` | `reputationMath.js` | `deductReputationForCancellation` |
| `determineTrustLevel` | `reputationMath.js` | `updateReputation` assertion |

## Coverage Matrix

### Group A — Reputation CRUD (10 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 1 | `initializeReputation` | 4: creates with `BASE_SCORE`, rejects missing userId, idempotent (returns existing), writes history subcollection entry | 🟢 strong |
| 2 | `updateReputation` | 5: admin sets score, non-admin rejected, missing userId, missing score, creates entry when none exists | 🟢 strong |

### Group B — User & Provider Score Updates (8 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 3 | `updateUserReputation` | 4: recalculates from booking/review data, missing userId, handles no bookings, preserves detection flags | 🟢 strong |
| 4 | `updateProviderReputation` | 4: recalculates from provider data, missing providerId, handles no bookings, preserves detection flags | 🟢 strong |

### Group C — Review Pipeline & Deductions (13 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 5 | `processReviewForReputation` | 4: updates both user+provider rep, missing review object, review without ID, applies AI analysis flags when suspicious | 🟢 strong |
| 6 | `deductReputationForCancellation` | 5: deducts `CANCELLATION_PENALTY` (5 pts), missing userId, creates from `BASE_SCORE` when no existing doc, never below 0, writes history entry | 🟢 strong |
| 7 | `deductReputationForSuspiciousReview` | 5: adds `ReviewBomb` flag + recalculates, missing userId, no reputation found (returns error), already flagged (idempotent), writes history entry | 🟢 strong |

## Coverage Statistics

| Metric | Value |
|---|---|
| **Total cases** | **31** |
| Actions covered | 7 / 7 |
| Auth paths (unauth / non-admin) | ~3 (`updateReputation` admin-only) |
| Validation errors | ~5 |
| Doc-not-found paths | ~2 (`deductReputationForSuspiciousReview` no rep found, `checkUserReputationInternal` default branch) |
| Idempotency guards | 2 (initializeReputation already exists, deductReputationForSuspiciousReview already flagged) |
| State-machine / guard errors | 2 (already flagged, already exists) |
| Boundary values | score floor at 0 (`deductReputationForCancellation`), `BASE_SCORE` deduction |
| Side effect assertions | reputation doc persistence, history subcollection entries (`trustScore` + `timestamp`), detection flag propagation |
| Lint clean | yes |
| **Tests passing** | **31 / 31** |

## Key Test Scenarios

### `initializeReputation` — Default score + history
The happy path verifies the reputation doc is created with `trustScore: BASE_SCORE` (50), `trustLevel: "New"`, and an empty `detectionFlags` array. Idempotency test confirms calling it again returns the existing doc without creating a duplicate. History subcollection is verified to have exactly one entry with the correct trust score.

### `updateUserReputation` / `updateProviderReputation` — Real data flow
These tests seed actual Firestore data (users, completed bookings, reviews) and verify that the trust score calculation produces a positive score above `BASE_SCORE` when real booking and rating data exists. They also verify that existing detection flags from a pre-seeded reputation doc are preserved after recalculation.

### `processReviewForReputation` — Full pipeline with AI flags
Seeds a completed booking and review, then calls the pipeline action. Verifies both client and provider reputation docs are updated. The AI flags test creates a review with `aiAnalysis: { analyzed: true, isSuspicious: true, confidence: 0.9, patterns: ["template_language"], threatLevel: "high" }` and asserts that `detectionFlags` includes `"ReviewBomb"` after processing.

### `deductReputationForSuspiciousReview` — Three-way guard
Tests three paths: (1) normal — adds `ReviewBomb` flag and recalculates a lower trust score, (2) no reputation doc — returns `{success: false, error: "No reputation found"}`, (3) already flagged — returns `{success: true, message: "Already flagged"}` without double-penalizing.

## Test Conventions

Same as [[Booking Test Infrastructure]] with these additions:

- **History subcollection assertions**: Each mutation action (`initializeReputation`, `deductReputationForCancellation`, `deductReputationForSuspiciousReview`) verifies a history entry is written to `reputations/{userId}/history/{timestamp}`
- **Import math constants**: Uses imported `BASE_SCORE`, `CANCELLATION_PENALTY`, and `determineTrustLevel` from `reputationMath.js` instead of hardcoded values
- **Admin-only auth pattern**: `updateReputation` requires `makeAuth(uid, true)` for happy path and `makeAuth(uid)` (no admin) for rejection — the only action in this suite with auth enforcement
- **No-auth actions**: 6 of 7 actions don't check authentication at all (they're designed as internal bridges); only `updateReputation` requires admin claims
