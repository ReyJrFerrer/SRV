---
tags: [backend, review, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Review System]]
  - [[Unit Test Creation Checklist]]
  - [[Booking Test Infrastructure]]
  - [[Service Test Infrastructure]]
sources:
  - functions/test/review.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/review.js
  - functions/src/reputation.js
---

# Review Test Infrastructure

The third integration test suite for the SRV backend, following the [[Unit Test Creation Checklist]]. Exercises all 23 actions of the consolidated `reviewAction` Cloud Function against a real Firestore + Auth emulator.

## Test Stack

Same stack as [[Booking Test Infrastructure]] and [[Service Test Infrastructure]]:

| Layer | Tool | Purpose |
|---|---|---|
| Runner | Mocha 11 | `describe` / `it` BDD |
| Firebase SDK | `firebase-functions-test` 3.4 | `test.wrap()` to invoke `onCall` handlers |
| Emulator | Firestore + Auth (Firebase Emulator Suite) | Real persistence layer; tests run actual Firestore reads/writes, transactions, queries |
| Assertion | `node:assert/strict` | `assert.equal`, `assert.rejects(promise, /regex/i)` |
| Env loader | `dotenv` | Reads `functions/.env.test` |

Run with: `npm test` (after `firebase emulators:start`).

## Test Layout

```
functions/test/
├── mocha.js                    # Shared bootstrap (now routes review tests to test-output-review.log)
├── helpers/
│   └── seed.js                 # Seeders shared across booking + service + review tests
└── review.test.js              # 23 actions + unknown action handler (114 total)
```

### Log File Routing

`mocha.js` routes `console.error` output to per-suite log files. Review tests write to `test-output-review.log`.

### New Seeders in `helpers/seed.js`

| Seeder | Purpose | Returns |
|---|---|---|
| `seedReview(opts)` | Create a review doc in the `reviews` collection | `{id}` |
| `seedProviderReview(opts)` | Create a provider review doc in the `providerReviews` collection | `{id}` |
| `buildReview(opts)` | Build review data object (used internally by `seedReview`) | Object |
| `buildProviderReview(opts)` | Build provider review data object (used internally by `seedProviderReview`) | Object |

## Coverage Matrix

### Group A — Client Reviews (9 actions, ~53 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 1 | `submitReview` | 11: happy (updates service rating), unauth, missing bookingId, invalid rating (0), invalid rating (6), comment too long, booking not found, not the client, booking not completed, review window expired, duplicate review | 🟢 strong |
| 2 | `getReview` | 4: happy (visible), missing reviewId, not found, hidden review rejected | 🟢 strong |
| 3 | `getBookingReviews` | 4: happy (returns visible), missing bookingId, empty results, hidden excluded | 🟢 strong |
| 4 | `getUserReviews` | 4: own visible, unauth, defaults to own uid, admin includeHidden | 🟢 strong |
| 5 | `updateReview` | 8: happy (service rating recalculated), unauth, missing reviewId, invalid rating, not found, not owner, hidden review, rating unchanged | 🟢 strong |
| 6 | `deleteReview` | 8: happy (walks reviews+providerReviews), unauth, missing reviewId, not found, not owner+not admin, admin deletes, already hidden | 🟢 strong |
| 7 | `getProviderReviews` | 4: happy (visible), empty providerId → [], empty reviews → [], hidden excluded | 🟢 strong |
| 8 | `getServiceReviews` | 5: happy, missing serviceId, admin includeHidden, empty results, non-admin cannot see hidden | 🟢 strong |
| 9 | `calculateProviderRating` | 4: happy average, missing providerId, no reviews → not-found, hidden excluded | 🟢 strong |

### Group B — Provider Reviews (3 actions, ~17 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 10 | `submitProviderReview` | 8: happy (marks booking, creates review), unauth, missing bookingId, invalid rating, booking not found, not the provider, not completed, duplicate | 🟢 strong |
| 11 | `getClientProviderReviews` | 4: happy, missing clientId, admin includeHidden, empty results | 🟢 strong |
| 12 | `getProviderReviewsByProvider` | 5: happy, missing providerId, admin includeHidden, empty results, hidden excluded by default | 🟢 strong |

### Group C — Admin Moderation (7 actions, ~24 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 13 | `restoreReview` | 6: happy (walks reviews+providerReviews), non-admin, missing reviewId, not found, not hidden | 🟢 strong |
| 14 | `bulkUpdateReviewStatus` | 6: happy, non-admin, missing reviewIds, empty array, invalid status, partial errors | 🟢 strong |
| 15 | `getAllReviews` | 4: happy paginated, non-admin, status filter, pagination limit | 🟢 strong |
| 16 | `getReviewStatistics` | 3: happy (counts per status), unauth, non-admin | 🟢 strong |
| 17 | `flagReview` | 4: happy (sets Flagged status), non-admin, missing reviewId, not found | 🟢 strong |
| 18 | `getReviewFlagReports` | 2: happy (returns reports), non-admin | 🟢 strong |
| 19 | `updateReviewFlagReportStatus` | 4: happy, non-admin, missing reportId/status, report not found | 🟢 strong |

### Group D — Reports & Ratings (4 actions, ~14 tests)

| # | Action | Cases | Status |
|---|---|---|---|
| 20 | `flagReviewForAdmin` | 4: happy (creates report doc), unauth, missing reviewId/reason, user not found | 🟢 strong |
| 21 | `getMyReviewFlagReports` | 3: happy (own reports), unauth, scoped to own userId only | 🟢 strong |
| 22 | `calculateServiceRating` | 4: happy average, missing serviceId, no reviews → not-found, hidden excluded | 🟢 strong |
| 23 | `calculateUserAverageRating` | 5: happy (own average), unauth, admin-on-behalf, non-admin viewing others → denied, no reviews → not-found | 🟢 strong |

### Group E — Error Handler

| Test | Cases |
|---|---|
| Unknown action | 1: rejects unknown action string |

## Coverage Statistics

| Metric | Value |
|---|---|
| **Total cases** | **115** |
| Actions covered | 23 / 23 (+ unknown action handler) |
| Auth paths (unauth / wrong-role / stranger) | ~35 |
| Validation errors | ~25 |
| Doc-not-found paths | ~12 |
| State-machine errors | 6 (hidden review read, hidden review update, already hidden delete, not hidden restore, not completed submitReview, not completed submitProviderReview) |
| Duplicate/conflict guards | 3 (duplicate submitReview, duplicate submitProviderReview, already hidden deleteReview) |
| Empty-result paths | ~8 (getBookingReviews, getProviderReviews, getServiceReviews, getClientProviderReviews, getProviderReviewsByProvider, getUserReviews empty, calculateProviderRating no reviews, calculateServiceRating no reviews) |
| Boundary values | ~6 (rating 0, 6; comment 501 chars; review window 31 days; rating unchanged path) |
| Side effect assertions | service `averageRating`/`reviewCount` updates, booking `providerReviewSubmitted` flag, `reports` collection creation, `reviews`/`providerReviews` doc persistence, status transitions |
| Lint clean | yes |
| **Tests passing** | **114 / 114** |

## Seeders Used

The test file uses these seeders from `helpers/seed.js`:

| Seeder | Usage |
|---|---|
| `seedReview(opts)` | Creates review docs with custom rating, status, clientId, providerId, serviceId |
| `seedProviderReview(opts)` | Creates provider review docs with custom rating, status |
| `seedUser(opts)` | Creates user docs for auth context |
| `seedBaseEntities(opts)` | Creates full client/provider/service/package/reputation chain |
| `uniqueId()` | Generates unique IDs for test entities |

An inline helper `seedCompleteBookingForReview(opts)` extends `seedBaseEntities` to create a completed booking with configurable `daysAgo` parameter for testing the 30-day review window.

## Key Test Scenarios

### `submitReview` — Full transaction flow
The happy path verifies: review doc created in `reviews` collection, service `averageRating` updated from 0 to 4, `reviewCount` incremented to 1. Covers all 6 pre-conditions (auth, bookingId, rating range, comment length, client match, completed status, review window) plus duplicate guard.

### `deleteReview` — Dual collection support
Tests that `deleteReview` works for both `reviews` and `providerReviews` collections, including the admin-override path and the "already hidden" guard.

### `submitProviderReview` — Booking flag side effect
Verifies the `providerReviewSubmitted` flag on the booking doc after successful submission, and the duplicate check per booking+provider combination.

### `getReviewStatistics` — 4 parallel queries
Tests that the function correctly counts reviews across all 4 statuses (Visible, Hidden, Flagged, Deleted).

## Test Conventions

Same as [[Booking Test Infrastructure]] with these additional patterns:

- **Inline scenario seeder**: `seedCompleteBookingForReview({daysAgo: 31})` for testing the review window boundary
- **admin-on-behalf** pattern: tests use `seedUser()` to create a fresh admin, never reuse admin IDs across tests
- **Side-effect verification**: after `submitReview`, verifies the service doc's `averageRating` and `reviewCount` are correct; after `deleteReview`, verifies `status: "Hidden"`; after `flagReviewForAdmin`, verifies a `reports` doc was created
- **Dual-collection tests**: `deleteReview` and `restoreReview` have separate tests for both `reviews` and `providerReviews` collections
- **Error alternation patterns** include both the gRPC status code and message fragment, e.g. `/INVALID_ARGUMENT|Booking ID is required/i`
