---
tags: [operations, testing, quality-assurance, checklist]
date: 2026-06-28
related:
  - [[Booking Test Infrastructure]]
  - [[Booking Test QA Findings 2026-06-28]]
  - [[Functions Lint Report]]
  - [[Grill Record: Unit Test Creation Checklist]]
sources:
  - functions/test/booking.test.js
  - functions/test/service.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/booking.js
  - functions/src/service.js
  - functions/src/review.js
  - functions/src/notification.js
  - functions/src/reputation.js
  - functions/src/account.js
  - functions/src/utils/reputationMath.js
  - functions/.eslintrc.js
  - functions/test/account.test.js
  - functions/test/reputation.test.js
---

# Unit Test Creation Checklist

A reusable step-by-step checklist for adding integration test coverage to any Cloud Function in `functions/src/`. Codifies the patterns from [[Booking Test Infrastructure]] and the QA lessons from [[Booking Test QA Findings 2026-06-28]].

## When to Use

Use this checklist when:
- Adding a new Cloud Function (callable, scheduled, or trigger)
- Adding new actions to an existing action-dispatch function
- Closing test coverage gaps in an under-tested function
- Reviewing test coverage before merging

## Step 0 — Read First

Before writing any test, read these wiki pages to understand the existing patterns:

- [[Booking Test Infrastructure]] — the test stack, mocha bootstrap, scenario seeders
- [[Booking Test QA Findings 2026-06-28]] — known pitfalls and required edge cases
- [Firebase unit testing docs](https://firebase.google.com/docs/functions/unit-testing) — `firebase-functions-test` API

## Step 1 — Function Discovery

Before writing the first test case, answer these questions about the function under test:

- [ ] **Entrypoint type?** (action-dispatch callable / standalone callable / scheduled / Firestore trigger / internal helper)
- [ ] **If action-dispatch:** List every action string in the `switch (action)` block. Each gets its own `describe`.
- [ ] **If scheduled:** Identify the schedule and the handler function. The schedule itself is not tested — only the handler logic.
- [ ] **If Firestore trigger:** Identify the trigger event (`onDocumentCreated`, `onDocumentWritten`, etc.) and what data shape it expects.
- [ ] **If internal helper:** It's a pure function — no emulator needed, just call it directly with various inputs.
- [ ] **Auth model?** (always-required / admin-only / owner-only / public-read)
- [ ] **Side effects?** (notifications / reputation updates / reports / RTDB writes / scheduled jobs / transactions)
- [ ] **External dependencies?** (OneSignal / email / Gemini AI / xendit / HTTP calls)
- [ ] **State machine?** If yes, list the valid transitions and the `isValidTransition()` function name.

## Step 2 — Test Infrastructure Setup

- [ ] **Add new collections to `COLLECTIONS_TO_CLEAR`** in `functions/test/mocha.js` so the emulator cleans them between tests
- [ ] **Add new entity seeders** to `functions/test/helpers/seed.js` (e.g., `seedXxx(opts)` returning `{id, ...extras}`)
- [ ] **Add new scenario seeders** for state-machine states (e.g., `seedDisputedBooking()`, `seedCancelledBooking()`)
- [ ] **Import constants from source** — `NOTIFICATION_TYPES`, `CANCELLATION_PENALTY`, `USER_TYPES`, etc. — never hardcode values that already exist as exports
- [ ] **Use the `makeRequest` / `makeAuth` / `fetchDoc` helpers** already defined in `booking.test.js` (extract them to a shared helper if not yet done)

## Step 3 — Per-Action Test Matrix (the 7-case minimum)

For **each** action or handler, write tests covering these categories. The booking.test.js reached 97 cases by applying this matrix to 17 actions.

### 3.1 Happy Path
- [ ] Setup minimal valid scenario
- [ ] Call action with valid auth + valid data
- [ ] Assert: response status, response data fields, doc persistence, all side effects

### 3.2 Auth Errors (3 tests)
- [ ] Unauthenticated caller → `HttpsError("unauthenticated", ...)` — match `/User must be authenticated/i`
- [ ] Wrong role (e.g. client calls provider-only action) → `HttpsError("permission-denied", ...)` — match `/PERMISSION_DENIED|not authorized/i`
- [ ] Stranger (neither owner nor admin) → same `/PERMISSION_DENIED|not authorized/i`

### 3.3 Validation Errors (1+ tests)
- [ ] Missing required field (omit one required arg) → `HttpsError("invalid-argument", ...)` — match `/INVALID_ARGUMENT|required|missing/i`
- [ ] If multiple required fields: add one test per omitted field
- [ ] If types are strict: test wrong-type inputs (e.g. `cancelReason: ""` rejected)

### 3.4 Doc-Not-Found (1 test, applies to any action that reads a doc)
- [ ] Pass a nonexistent ID (`"nonexistent-bk"`) → `HttpsError("not-found", ...)` — match `/NOT_FOUND|not.found/i`
- [ ] Applies to all 11 actions in `bookingAction` that have a `!bookingDoc.exists` guard

### 3.5 State-Machine Errors (1+ tests, applies if the function has states)
- [ ] Invalid transition (e.g. Cancelled → Accepted) → `HttpsError("failed-precondition", ...)` — match `/PRECONDITION_FAILED|Invalid status transition/i`
- [ ] Test one invalid transition per valid action; ideally test all of them

### 3.6 Side Effects (asserted in happy path, not separate test)
- [ ] **Notification count** — count `notifications` docs and assert exact number
- [ ] **Notification types** — assert the `notificationType` matches the expected constant (use `NOTIFICATION_TYPES.X`)
- [ ] **Reputation updates** — read `reputations/{userId}` before/after and assert the delta
- [ ] **Report generation** — read `reports` collection and assert size
- [ ] **Audit trail** — read the audit collection and assert the action entry exists
- [ ] **Subcollection updates** — read the subcollection and assert the new doc

### 3.7 Idempotency (1 test, applies if the function is idempotent)
- [ ] Call the action twice
- [ ] Assert no duplicate notifications, no duplicate audit entries
- [ ] Example: `startNavigation` is idempotent (booked via `navigationStartedNotified` flag)

## Step 4 — Cross-Cutting Edge Cases

Apply across the function as a whole, not per-action.

### 4.1 Boundary Values
- [ ] For any `>= N` or `<= N` check, test the exact boundary value (N-1, N, N+1)
- [ ] Example: `reputation trustScore <= 5` is rejected — test `{trustScore: 5}` rejects, `{trustScore: 6}` accepts

### 4.2 Empty Results
- [ ] List actions (`getXxxList`, `getXxxAnalytics`): test the no-records case returns `[]` or all-zeros
- [ ] Don't just test "1 record exists" — also test "0 records exist"
- [ ] Applies to: `getClientBookings`, `getProviderBookings`, `getBookingsByStatus`, `getClientAnalytics`, `getProviderAnalytics`, etc.

### 4.3 Conflict / Duplicate Guards
- [ ] Time-slot conflicts (`checkBookingConflicts`)
- [ ] "Already released" / "already processed" / "already cancelled" guards
- [ ] Auto-cancellation side effects (e.g. `acceptBooking` cancels conflicting Requested bookings)

### 4.4 Silent Error Swallowing
- [ ] Find all `try { ... } catch { /* empty */ }` blocks in the source
- [ ] For each: test that the calling action still succeeds when the inner operation fails
- [ ] Example: `cancelBooking` swallows reputation-update failures → test by deleting the reputation doc first

### 4.5 Provider-or-Client Initiation
- [ ] For actions that both parties can perform (cancel, dispute): test BOTH directions
- [ ] Don't just test client-initiated

### 4.6 Admin-on-Behalf
- [ ] For read/list actions that check `authInfo.isAdmin`: test admin querying on behalf of another user
- [ ] Don't just test "owner can read" and "stranger can't" — also test "admin can read anyone"

## Step 5 — Code Quality Standards

### 5.1 Constants
- [ ] **Import** `NOTIFICATION_TYPES` from `notification.js`, never hardcode `"booking_accepted"` etc.
- [ ] **Import** numeric constants like `CANCELLATION_PENALTY` from `utils/reputationMath.js`, never hardcode `5`
- [ ] **Import** status enums (e.g. `"Requested"`, `"Completed"`) from a shared constants module if available; otherwise define them in the test file as `const STATUS = {REQUESTED: "Requested", ...}` for refactor safety

### 5.2 Error Regex Patterns
- [ ] Use alternation: `/PERMISSION_DENIED|not authorized/i` tolerates message variations
- [ ] Match both the error code and a fragment of the message — never the message alone
- [ ] For boundary-specific errors, use the specific fragment (e.g. `/PRECONDITION_FAILED|Invalid status transition/i`, not just `/PRECONDITION_FAILED/`)

### 5.3 Seed Functions
- [ ] Each seeder builds a complete valid entity — no partial state
- [ ] Seeders return `{id, ...relatedIds}` so tests can use any returned field
- [ ] Scenario seeders (e.g. `seedActiveBooking`) are preferred over manual doc construction
- [ ] For complex scenarios that don't fit a seeder, build the doc inline with `db.collection(...).doc(...).set({...})` (this is acceptable, see `booking.test.js:1711-1735` CashOnHand test)

### 5.4 Assertions
- [ ] Assert side effects (notifications, reports, audit trail) — not just return values
- [ ] Use `assert.equal` for strict equality, `assert.deepEqual` for arrays/objects
- [ ] Use `assert.ok` for `includes` checks
- [ ] Use `assert.rejects(promise, /pattern/i)` for error paths — never `try/catch` with manual assertions

### 5.5 Avoid Mocking
- [ ] Run tests against the **real Firestore emulator**, not mocks
- [ ] Seed data via `db.collection(...).set(...)` — don't mock the DB
- [ ] Don't mock notifications — let them fire and assert the resulting docs

## Step 6 — Patterns by Function Type

### 6.1 Action-Dispatch Callable (e.g. `bookingAction`, `serviceAction`)

```javascript
const wrapped = test.wrap(myFunctions.someAction);

describe("someAction", () => {
  beforeEach(async () => {
    await clearCollections();
  });

  describe("createXxx", () => {
    it("happy path", ...);
    it("rejects unauthenticated callers", ...);
    it("rejects wrong role", ...);
    it("rejects when doc not found", ...);
    it("rejects when missing required fields", ...);
    // ...per Step 3
  });
});
```

**Special case — `mediaAction`** (per [[Media and Images]]): 6 touchpoints in `media.js` need registration when adding a new media type. Test the `initXxxUpload` action with the two-step upload flow.

### 6.2 Scheduled Function (e.g. `cancelMissedBookings`, `processScheduledDeletions`)

```javascript
const handler = myFunctions.scheduledHandler; // exported, not the schedule wrapper

describe("scheduledHandler", () => {
  it("processes pending records and dispatches side effects", async () => {
    // Seed records that should be processed
    await db.collection("...").doc("...").set({...});
    const result = await handler({});
    assert.equal(result.success, true);
    // Assert records were processed
  });
});
```

- Don't test the schedule itself — only the handler logic
- Export the handler separately (e.g. `exports.handler = async () => {...}` and `exports.scheduledFn = onSchedule(...)`) for testability
- Test the batch operation: seed N records, run handler, assert all N were processed
- Test the empty case: run handler with no records, assert `count: 0`

### 6.3 Firestore Trigger (e.g. `onMessageCreated`, `analyzeNewReview`)

```javascript
const handler = myFunctions.onMessageCreated; // exported

describe("onMessageCreated", () => {
  it("creates a notification when a new message is created", async () => {
    await db.collection("conversations/conv-1/messages").doc("msg-1").set({...});
    await handler({data: () => ({id: "msg-1"}), ref: {...}});
    const notif = await db.collection("notifications")...
  });
});
```

- Export the handler separately for testability
- Manually construct the trigger event payload (`event.params`, `event.data`, `event.ref`)
- The test waits for the trigger to complete via the awaited `handler` call

### 6.4 Internal Helper / Pure Function (e.g. `phLocationData.js`, `src/utils/*`)

```javascript
const {calculateTrustScore} = require("../src/utils/reputationMath");

describe("calculateTrustScore", () => {
  it("returns Bayesian average for valid input", () => {
    const result = calculateTrustScore(50, 0, 0);
    assert.equal(result, 50);
  });
  // ...pure function tests, no emulator needed
});
```

- No `beforeEach` cleanup needed
- No `db`, no `test.wrap` — direct function calls
- Easy to test hundreds of edge cases quickly
- These are the highest-value tests to write first

## Step 7 — Per-Function Pre-Flight Checklist

Before marking a test file complete:

- [ ] All actions in the function have a `describe` block
- [ ] Each `describe` covers the 7 categories from Step 3
- [ ] Cross-cutting edge cases from Step 4 are applied
- [ ] Constants are imported, not hardcoded (Step 5.1)
- [ ] Error regex uses alternation (Step 5.2)
- [ ] All new collections added to `COLLECTIONS_TO_CLEAR` in `mocha.js`
- [ ] All new scenario seeders added to `helpers/seed.js`
- [ ] Test count is documented (e.g. in a comment at the top of the test file)
- [ ] `npm test` passes
- [ ] `npm run lint` reports no new issues in the test file

## Step 8 — Wiki Updates

After the test file lands:

- [ ] Update the function's wiki page with a "Test Coverage" section (see [[Booking System]] for template)
- [ ] Update [[Booking Test Infrastructure]] coverage matrix if a new function family is added
- [ ] If new patterns emerge, update this checklist
- [ ] Append a log entry to `llm-wiki/wiki/log.md`

## Anti-Patterns (what NOT to do)

- ❌ **Don't hardcode notification type strings** — always import `NOTIFICATION_TYPES.X`
- ❌ **Don't hardcode numeric constants** (penalties, thresholds) — import them
- ❌ **Don't skip the unauth test** — every action needs it
- ❌ **Don't skip the doc-not-found test** — applies to all 11 read actions
- ❌ **Don't assert only one notification** when the function creates multiple (the bug from QA #1)
- ❌ **Don't use `try/catch` for error assertions** — use `assert.rejects(promise, /pattern/i)`
- ❌ **Don't mock the Firestore emulator** — run real integration tests
- ❌ **Don't use brittle date logic** (e.g. `new Date().getDay()`) without documenting the timezone risk
- ❌ **Don't forget to add new collections to `COLLECTIONS_TO_CLEAR`** — tests will leak state
- ❌ **Don't test only the happy path** — every action needs all 7 categories

## Reference: Coverage Stats

### Booking (17 actions)

| Metric | Value |
|---|---|
| Total cases | 97 |
| Actions covered | 17 / 17 |
| Doc-not-found paths | 11 / 11 (100%) |
| Empty-result paths | 5 / 5 (100%) |
| State machine coverage | 100% |
| Edge case coverage | ~95% |
| Lint clean | yes |

### Service (29 actions)

| Metric | Value |
|---|---|
| Total cases | 168 |
| Actions covered | 29 / 29 |
| Doc-not-found paths | ~25 / 25 |
| Empty-result paths | 5 / 5 (100%) |
| State machine coverage | 1 transition (restoreService) |
| Boundary values | ~15 (price, title, desc, images, certs, hours, bookings) |
| Lint clean | yes |

### Review (23 actions)

| Metric | Value |
|---|---|
| Total cases | 115 |
| Actions covered | 23 / 23 (+ unknown action handler) |
| Auth paths | ~35 |
| Validation errors | ~25 |
| Doc-not-found paths | ~12 |
| State-machine errors | 6 (hidden read, hidden update, already-hidden delete, not-hidden restore, not-completed submit, not-completed submitProviderReview) |
| Duplicate/conflict guards | 3 (duplicate submitReview, duplicate submitProviderReview, already-hidden deleteReview) |
| Empty-result paths | ~8 |
| Boundary values | ~6 (rating 0/6, comment 501, review window 31d, rating unchanged) |
| Side effect assertions | service rating/count, booking flag, reports doc, status transitions |
| Lint clean | yes |

### Account (11 actions)

| Metric | Value |
|---|---|
| Total cases | 49 |
| Actions covered | 11 / 11 |
| Auth paths | ~11 |
| Validation errors | ~10 |
| Doc-not-found paths | ~6 |
| Boundary values | name length (2–50), phone length (10–15), isActive type check |
| Side effect assertions | reputation init, pending_users cleanup, media lifecycle |
| Lint clean | yes |

### Reputation (7 actions)

| Metric | Value |
|---|---|
| Total cases | 31 |
| Actions covered | 7 / 7 |
| Auth paths | ~3 (admin-only guard) |
| Validation errors | ~5 |
| Idempotency guards | 2 (already exists, already flagged) |
| Boundary values | score floor at 0 |
| Side effect assertions | reputation doc persistence, history subcollection entries, detection flag propagation |
| Lint clean | yes |

Reference implementations:
- [[Booking Test Infrastructure]] — test stack, helpers, coverage matrix
- [[Booking Test QA Findings 2026-06-28]] — 3 critical bugs found and fixed
- [[Service Test Infrastructure]] — 168-case serviceAction test suite, seeders, per-action matrix
- [[Account Test Infrastructure]] — 49-case accountAction test suite, bug fix documentation
- [[Reputation Test Infrastructure]] — 31-case reputationAction test suite, history assertions
