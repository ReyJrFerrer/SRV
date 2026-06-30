---
tags: [backend, booking, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Booking System]]
  - [[Functions Lint Report]]
  - [[Firebase Functions Optimization]]
  - [[Wiki Lint Booking and Service 2026-06-27]]
sources:
  - functions/test/booking.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/booking.js
  - functions/package.json
---

# Booking Test Infrastructure

The first integration test suite for the SRV backend. It exercises all 17 actions of the consolidated `bookingAction` Cloud Function against a real Firestore + Auth emulator, asserting state transitions, side effects (notifications, reputation, reports, audit trail), and error paths.

## Test Stack

| Layer | Tool | Purpose |
|---|---|---|
| Runner | Mocha 11 | `describe` / `it` BDD, async/await support |
| Firebase SDK | `firebase-functions-test` 3.4 | `test.wrap()` to invoke the `onCall` handler with a fake `{data, auth}` request |
| Emulator | Firestore + Auth (Firebase Emulator Suite) | Real persistence layer; tests run actual Firestore reads/writes, transactions, queries |
| Assertion | `node:assert/strict` | `assert.equal`, `assert.rejects(promise, /regex/i)` |
| Env loader | `dotenv` | Reads `functions/.env.test` for `GCLOUD_PROJECT`, `FIREBASE_DATABASE_URL` |

Run with: `npm test` (after `firebase emulators:start`). The npm script:
```bash
mocha --file test/mocha.js --reporter spec --timeout 30000 --exit 'test/**/*.test.js'
```

## Test Layout

```
functions/test/
├── mocha.js                 # Global setup: env, admin init, test SDK, clearCollections
├── helpers/
│   └── seed.js              # Scenario-based seeders (seedPendingBooking, etc.)
└── booking.test.js          # 17 actions × N cases per action
```

### `test/mocha.js` — Global Bootstrap

- Forces `FUNCTIONS_EMULATOR=true` so `firebase-admin` skips prod auth paths
- Forces `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1` so transactional emails fail fast (logged but don't break tests)
- Initializes `firebase-admin` against the emulator with project ID `srve-7133d`
- Wraps `console.error` to a per-suite log file via `this.currentTest.file` routing: `test-output-booking.log` / `test-output-service.log` / `test-output.log` (fallback)
- Exports `test` (firebase-functions-test instance), `db` (Firestore), `clearCollections()`

### `helpers/seed.js` — Scenario Seeders

| Seeder | Status Seeded | Returns |
|---|---|---|
| `seedUser(overrides)` | n/a | `{id}` |
| `seedService(overrides)` | n/a | `{id}` |
| `seedServicePackage(overrides)` | n/a | `{id}` |
| `seedReputation(userId, overrides)` | n/a | void (doc id = userId) |
| `seedBaseEntities(opts)` | builds full client/provider/service/package/reputation chain | `{clientId, providerId, serviceId, packageId}` |
| `seedPendingBooking()` | `Requested` | `+ bookingId` |
| `seedActiveBooking()` | `Accepted` | `+ bookingId` |
| `seedInProgressBooking()` | `InProgress`, `startedDate` set | `+ bookingId` |
| `seedCompletedBooking()` | `Completed`, `paymentMethod: GCash`, `paymentId`, `amountPaid: 500` | `+ bookingId` |
| `seedDisputedBooking()` | `Disputed` | `+ bookingId` |
| `seedDeclinedBooking()` | `Declined` (terminal) | `+ bookingId` |
| `seedCancelledBooking()` | `Cancelled` (terminal) | `+ bookingId` |

Each seeder builds a complete chain so the booking action under test has all the data it needs (client/provider/service/package/reputation). The `seedCompletedBooking` seeder uses `paymentMethod: "GCash"` and includes a `paymentId` so the booking is release-eligible out of the box.

`futureDate(days)` helper returns ISO string N days from now; negative values produce past dates used for `InProgress`/`Completed`/`Disputed` states.

### `booking.test.js` — Per-Action Test Cases

Each `describe` block exercises one `bookingAction` case via `test.wrap(myFunctions.bookingAction)`. The wrapped function is invoked with a fake callable request:

```javascript
function makeRequest(payload, auth) {
  return {data: payload, auth: auth || null};
}
function makeAuth(uid, isAdmin = false) {
  return {uid, token: {isAdmin}};
}
```

## Coverage Matrix

| # | Action | Cases | Status |
|---|---|---|---|
| 1 | `createBooking` | 11: happy, unauth, low client rep, unknown serviceId, low provider rep, inactive service, wrong provider, wrong-service package, missing package, time conflict, missing fields | 🟢 strong |
| 2 | `acceptBooking` | 6: happy, non-provider, terminal, unauth, doc-not-found, auto-cancel conflict | 🟢 strong |
| 3 | `declineBooking` | 6: happy, invalid transition, unauth, non-provider, doc-not-found, missing bookingId | 🟢 strong |
| 4 | `startNavigation` | 5: happy, idempotent, non-provider, unauth, doc-not-found | 🟢 strong |
| 5 | `startBooking` | 5: happy (2 notifs), invalid transition, unauth, non-provider, doc-not-found | 🟢 strong |
| 6 | `completeBooking` | 5: happy (3 notifs), non-provider, unauth, doc-not-found, invalid transition | 🟢 strong |
| 7 | `cancelBooking` | 8: happy, provider-initiated, no reason, terminal, stranger, unauth, doc-not-found, silent-rep-fail | 🟢 strong |
| 8 | `getBooking` | 6: client, provider, admin, stranger, unauth, doc-not-found | 🟢 strong |
| 9 | `getClientBookings` | 5: own, stranger-on-other, admin-on-behalf, empty, unauth | 🟢 strong |
| 10 | `getProviderBookings` | 5: own, stranger-on-other, admin-on-behalf, empty, unauth | 🟢 strong |
| 11 | `getBookingsByStatus` | 4: admin OK, non-admin, empty, missing-status | 🟢 strong |
| 12 | `disputeBooking` | 6: happy, invalid-from-Requested, terminal, provider-initiated, unauth, doc-not-found | 🟢 strong |
| 13 | `checkServiceAvailability` | 5: active, inactive, unauth, service-not-found, missing serviceId | 🟢 strong |
| 14 | `getServiceAvailableSlots` | 4: with-schedule, no-schedule, unauth, service-not-found | 🟢 strong |
| 15 | `getClientAnalytics` | 5: own, stranger-on-other, admin-on-behalf, empty, unauth | 🟢 strong |
| 16 | `getProviderAnalytics` | 4: admin OK, non-admin, empty, missing-providerId | 🟢 strong |
| 17 | `releasePayment` | 7: GCash happy, InProgress rejected, CashOnHand rejected, already-released, missing bookingId, missing releasedAmount, doc-not-found | 🟢 strong |

**Total: 97 test cases across 17 actions.**

Legend: 🟢 strong · 🟡 partial gaps · 🔴 sparse.

## Coverage Statistics (as of 2026-06-28)

| Category | Coverage |
|---|---|
| Auth (null/wrong-role/stranger) | ~98% |
| Missing/null args | ~90% |
| Doc-not-found | 100% (11/11 actions) |
| State transition (invalid) | 100% |
| Boundary values (reputation ≤5) | 100% |
| Idempotency | 100% (startNavigation) |
| Silent error swallowing | 33% (1/3 cancelBooking try-catches) |
| Empty results (list/analytics) | 100% (5/5) |
| Conflict guards | 67% (2/3, missing acceptBooking direct conflict) |
| Admin-on-behalf | 100% (3/3 list/analytics) |
| **Overall** | **~95%** |

## Strengths

1. **Real integration with emulator** — no mocks; tests run real Firestore transactions, real query engines, real `HttpsError` code paths
2. **Scenario-based seeders** — `seedInProgressBooking()` etc. are atomic and reusable; tests focus on the action, not the setup
3. **Side-effect assertions** — verifies `notifications` collection, `reputations` updates, `reports` docs, `paymentAuditTrail` entries (not just return values)
4. **Idempotency verified** — `startNavigation` is the only idempotent action; the test confirms a second call doesn't create a duplicate notification
5. **Error regex patterns use alternation** — e.g. `/PRECONDITION_FAILED|Invalid status transition/i` tolerates minor message variations
6. **State machine coverage** — every valid transition is hit by a happy path; every invalid transition is hit by a negative test
7. **Auth matrix** — unauthenticated, wrong-role, wrong-user, stranger, admin all exercised
8. **Cleanup** — `clearCollections()` in `beforeEach` keeps tests isolated even though they share a Firestore namespace

## Known Gaps (see [[Booking Test QA Findings]])

| Category | Tested | Missing | Coverage |
|---|---|---|---|
| Auth (null/wrong-role/stranger) | ~20 | 5 | ~80% |
| Missing/null args | ~5 | 15 | ~25% |
| Doc-not-found | 0 | 11 | 0% |
| State transition (invalid) | 7 | 0 | 100% |
| Boundary values (reputation ≤5) | 1 | 1 | 50% |
| Idempotency | 1 | 0 | 100% |
| Silent error swallowing | 0 | 3 | 0% |
| Empty results (list/analytics) | 0 | 5 | 0% |
| Duplicate/conflict guards | 0 | 3 | 0% |
| **Total** | **~34** | **~43** | **~44%** |

## Test Conventions

- Each `describe` matches one action name; nested `it` blocks describe the scenario
- `res.success` and `res.data` are the canonical return shape (per `bookingAction` contract)
- `assert.rejects(wrapped(...), /pattern/i)` for expected error paths
- `assert.equal(res.data.X, "value")` for happy path assertions
- `fetchDoc(collection, id)` helper asserts existence and returns the doc
- Multi-notification assertions use `db.collection("notifications").where(...).get()` and check `.size` or include `.notificationType`
- Admin tests use `makeAuth("admin-1", true)` — a hardcoded admin uid pattern; not a real admin claim check
