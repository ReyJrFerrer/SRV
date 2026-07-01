---
tags: [backend, service, testing, quality-assurance, online-services]
date: 2026-06-29
related:
  - [[Service Creation Workflow]]
  - [[Booking Test Infrastructure]]
  - [[Unit Test Creation Checklist]]
  - [[Functions Lint Report]]
  - [[Media and Images]]
  - [[Online Projects]]
  - [[Grill Record: Online Services Integration]]
sources:
  - functions/test/service.test.js
  - functions/test/mocha.js
  - functions/test/helpers/seed.js
  - functions/src/service.js
  - functions/.eslintrc.js
---

# Service Test Infrastructure

The second integration test suite for the SRV backend, following the [[Unit Test Creation Checklist]]. Exercises all 29 actions of the consolidated `serviceAction` Cloud Function against a real Firestore + Auth emulator, plus the scheduled deletion handler and internal helpers.

## Test Stack

Same stack as [[Booking Test Infrastructure]]:

| Layer | Tool | Purpose |
|---|---|---|
| Runner | Mocha 11 | `describe` / `it` BDD |
| Firebase SDK | `firebase-functions-test` 3.4 | `test.wrap()` to invoke `onCall` handlers |
| Emulator | Firestore + Auth + Storage (Firebase Emulator Suite) | Real persistence; image upload tests also exercise Storage emulator |
| Assertion | `node:assert/strict` | `assert.equal`, `assert.rejects(promise, /regex/i)` |
| Env loader | `dotenv` | Reads `functions/.env.test` |

Run with: `npm test` (after `firebase emulators:start`).

## Test Layout

```
functions/test/
├── mocha.js                    # Shared bootstrap: env, admin init, clearCollections, log routing
├── helpers/
│   └── seed.js                 # Seeders shared across booking + service tests
├── service.test.js             # 29 actions × ~5-12 cases per action (168 total)
└── service.online.test.js      # 50 cases — Phase 1 Online Services entity (4 new fields + ServicePackage type)
```

### Log File Routing

`mocha.js` now writes `console.error` output to per-suite log files:

| Test File | Log File |
|---|---|
| `booking.test.js` | `test-output-booking.log` |
| `service.test.js` | `test-output-service.log` |
| `service.online.test.js` | `test-output-service-online.log` |
| Unknown / fallback | `test-output.log` |

Routing is determined by inspecting `this.currentTest.file` in the root `beforeEach` hook.

### New Seeders in `helpers/seed.js`

| Seeder | Purpose | Returns |
|---|---|---|
| `seedCategory(overrides)` | Create a category doc for `createService` validation | `{id}` |
| `seedArchivedService(overrides)` | Archived service with `deletionScheduledAt` +30 days | `{id, providerId}` |
| `buildServiceLocation(overrides)` | Builds `{latitude, longitude, address}` format (vs `lat/lng` used by booking seeders) | Object |

## Per-Action Coverage

### Group A — Service CRUD (5 actions, ~27 tests)

| Action | Cases |
|---|---|
| `createService` | 10: happy, unauth, missing title, missing description, invalid price (0), invalid price (1M+), invalid location, nonexistent category, images > 10, certificates > 10 |
| `getService` | 3: happy, missing serviceId, nonexistent serviceId |
| `getServicesByProvider` | 3: happy, missing providerId, empty results |
| `getServicesByCategory` | 4: happy, missing categoryId, nonexistent categoryId, empty results |
| `getAllServices` | 3: happy, excludes archived, empty results |

### Group B — Service Status & Lifecycle (4 actions, ~27 tests)

| Action | Cases |
|---|---|
| `updateServiceStatus` | 8: Available→Suspended, Available→Unavailable, admin-allowed, unauth, stranger, missing args, invalid status, doc-not-found |
| `archiveService` | 6: happy (sets deletionScheduledAt), admin-allowed, unauth, stranger, missing serviceId, doc-not-found |
| `restoreService` | 7: happy (deletes archived fields), admin-allowed, unauth, stranger, missing serviceId, doc-not-found, state-machine (not-archived) |
| `permanentDeleteService` | 7: happy (deletes doc + marks bookings), admin-allowed, unauth, stranger, missing serviceId, doc-not-found |

### Group C — Image Management (3 actions, ~18 tests)

| Action | Cases |
|---|---|
| `uploadServiceImages` | 6: happy (uploads via media.js), unauth, wrong-provider, missing args, doc-not-found, exceeds limit |
| `removeServiceImage` | 6: happy, unauth, wrong-provider, missing args, doc-not-found, image-not-found |
| `reorderServiceImages` | 6: happy, unauth, wrong-provider, missing args, doc-not-found, mismatched URLs |

### Group D — Certificate Management (2 actions, ~12 tests)

| Action | Cases |
|---|---|
| `uploadServiceCertificates` | 6: happy (sets isVerifiedService), unauth, wrong-provider, missing args, doc-not-found, exceeds limit |
| `removeServiceCertificate` | 6: happy (clears isVerifiedService), unauth, wrong-provider, missing args, doc-not-found, cert-not-found |

### Group E — Category Management (3 actions, ~15 tests)

| Action | Cases |
|---|---|
| `verifyService` | 6: happy (verify/unverify), unauth, non-admin, missing args, doc-not-found |
| `addCategory` | 7: happy, subcategory, unauth, non-admin, missing name, missing slug, nonexistent parent |
| `getAllCategories` | 2: auto-initializes, returns existing |

### Group F — Package Management (5 actions, ~27 tests)

| Action | Cases |
|---|---|
| `createServicePackage` | 8: happy, unauth, wrong-provider, missing args, doc-not-found, invalid title (too long), invalid description (too long), invalid price (negative) |
| `getServicePackages` | 4: happy, missing serviceId, doc-not-found, empty results |
| `getPackage` | 3: happy, missing packageId, doc-not-found |
| `updateServicePackage` | 7: happy (title, price), unauth, wrong-provider, missing packageId, doc-not-found, invalid price |
| `deleteServicePackage` | 5: happy, unauth, wrong-provider, missing packageId, doc-not-found |

### Group G — Service Update & Rating (2 actions, ~15 tests)

| Action | Cases |
|---|---|
| `updateService` | 12: happy (all fields), partial update (preserves others), admin-allowed, unauth, stranger, missing serviceId, doc-not-found, invalid title, invalid price, invalid location, bookingNoticeHours >720, maxBookingsPerDay 0 or >50 |
| `updateServiceRating` | 3: happy, missing args, doc-not-found |

### Group H — Availability Management (3 actions, ~17 tests)

| Action | Cases |
|---|---|
| `setServiceAvailability` | 8: happy, unauth, wrong-provider, missing args, doc-not-found, bookingNoticeHours >720, maxBookingsPerDay 0, maxBookingsPerDay >50 |
| `getServiceAvailability` | 4: happy, missing serviceId, doc-not-found, not-configured (failed-precondition) |
| `getAvailableTimeSlots` | 5: happy, missing args, doc-not-found, not-configured, day-not-in-schedule → empty slots |

### Group I — Search (1 action, ~5 tests)

| Action | Cases |
|---|---|
| `searchServicesByLocation` | 5: happy (distance sort), category filter, missing userLocation, no services in range, empty DB |

### Scheduled Function

| Function | Cases |
|---|---|
| `processScheduledDeletionsHandler` | 3: deletes past-date, preserves future-date, no archived services |

### Edge Cases / Other

| Category | Tests |
|---|---|
| `deleteService` alias | 2 (happy, unauth) |
| Unknown action | 2 (unknown action, missing action) |

## Coverage Statistics

| Metric | Value |
|---|---|
| **Total cases** | **168** |
| Actions covered | 29 / 29 |
| Auth paths (unauth / wrong-role / stranger) | ~50 |
| Validation errors | ~40 |
| Doc-not-found paths | ~25 |
| State-machine errors | 1 (restoreService not-archived) |
| Empty-result paths | 5 (getServicesByProvider, getServicesByCategory, getAllServices, getServicePackages, search no results) |
| Boundary values | ~15 (price 0/1M, title 0/501, desc 0/1001, bookingNoticeHours 721, maxBookings 0/51, images 11, certs 11) |
| Lint clean | yes |
| **Tests passing** | **168 / 168** |
| **Combined with `service.online.test.js`** | **218 / 218** |

## Source Code Change

The only source modification needed for testability was extracting `processScheduledDeletionsHandler` as a named function from the inline `onSchedule(...)` callback (see [[Unit Test Creation Checklist]] §6.2):

```javascript
// Before (not testable):
exports.processScheduledDeletions = onSchedule("0 0 * * *", async (_event) => { ... });

// After (testable):
async function processScheduledDeletionsHandler() { ... }
exports.processScheduledDeletions = onSchedule("0 0 * * *", processScheduledDeletionsHandler);
exports.processScheduledDeletionsHandler = processScheduledDeletionsHandler;
```

## ESLint Configuration

The `.eslintrc.js` was updated to add test-file overrides:

```javascript
{
  files: ["**/*.spec.*", "**/*.test.*"],
  rules: {
    "require-jsdoc": "off",   // Test helpers don't need JSDoc
    "max-len": ["error", {code: 140, ignoreUrls: true}], // Test data is verbose
  },
}
```

## Test Conventions

Same as [[Booking Test Infrastructure]] with these additional patterns:

- **Image upload tests** provide base64-encoded test data and exercise the Storage emulator
- **Certificate upload tests** assert `isVerifiedService` flips to `true`
- **Partial update tests** seed the service with all availability fields (`instantBookingEnabled`, `bookingNoticeHours`, `maxBookingsPerDay`) to prevent Firestore `undefined` value errors
- **Validation order awareness**: `createServicePackage` checks `!title` (falsy) before length validation, so invalid-title tests use strings > 500 chars rather than empty strings
- **`TEST_IMAGE` / `TEST_CERT` constants** defined at top of test file for reuse across upload tests

## Phase 1 — Online Services Test Suite (`service.online.test.js`)

A second test file dedicated to the Phase 1 Online Services entity changes (4 new `Service` fields, `ServicePackage` 3-type discriminated union, and 3 new cross-cutting validations on `createService`/`createServicePackage`). 50 cases, all GREEN as of 2026-06-29.

### Group A — Service entity (`createService`)

| Test group | Cases | Source |
|---|---|---|
| `createService — serviceMode and negotiable` | 8 | `service.online.test.js:92-244` |
| `createService — weeklySchedule requirement` | 7 | `service.online.test.js:253-396` (Task 23) |
| `createServicePackage — 1-5 packages-per-service rule` | 7 | `service.online.test.js:405-581` (Task 24) |
| `createServicePackage — Service.price = min(package.prices) invariant` | 7 | `service.online.test.js:592-770` (Task 25, includes 1 race-condition test) |

### Group B — ServicePackage type (`createServicePackage`)

| Test group | Cases | Source |
|---|---|---|
| `createServicePackage — type='Fixed'` | 1 | `service.online.test.js:799-815` |
| `createServicePackage — type='Milestone'` | 9 | `service.online.test.js:817-922` (9 boundary cases for percentage-sum=100) |
| `createServicePackage — type='Session'` | 10 | `service.online.test.js:924-1003` (`sessionCount` 0/1/50/51 + `sessionDurationMinutes` 14/15/240/241) |
| `createServicePackage — type missing or invalid` | 2 | `service.online.test.js:1005-1048` (default-to-Fixed + invalid-value rejection) |

### Test helpers

- `baseServicePayload(overrides)` — minimum-valid `createService` payload with `weeklySchedule: null` default; tests override individual fields
- `makeAuth(uid, isAdmin)` — builds the `{uid, token: {isAdmin}}` auth context
- `sampleWeeklySchedule()` — single-day schedule for the happy path

### Phase 1 Specific Validations

The 3 cross-cutting rules added in Phase 1 are validated end-to-end:

1. **weeklySchedule required for `InPerson`/`Hybrid`** (`service.js:219-226`): the `validateServiceMode()` helper throws `invalid-argument` when `weeklySchedule` is `null` and `serviceMode ∈ {InPerson, Hybrid}`. 7 cases cover all combinations.

2. **1-5 packages per service** (`service.js:1987-1997`): `createServicePackage_service` queries `service_packages` by `serviceId` and rejects when `size >= MAX_PACKAGES_PER_SERVICE` (constant = 5 at `service.js:52`). 7 cases cover the 1st/5th/6th boundaries, auth, missing serviceId, wrong-provider, and empty `getServicePackages`.

3. **`Service.price = min(package.prices)` invariant** (`service.js:2050-2070`): when a new package's `price < service.price`, the service's `price` is updated inside `db.runTransaction` with a re-read of the latest `service.price` (to prevent race-condition overwrites). 7 cases include a 2-write concurrent test (`Promise.all`) that asserts the final `service.price = min(initial, pkg1.price, pkg2.price) = 300`.

### Coverage Statistics (Phase 1 only)

| Metric | Value |
|---|---|
| **Total cases** | **50** |
| `createService` paths | 15 (8 + 7 weeklySchedule) |
| `createServicePackage` type paths | 22 (Fixed 1 + Milestone 9 + Session 10 + default 2) |
| `createServicePackage` cross-cutting paths | 14 (7 packages-rule + 7 price-invariant) |
| Boundary values | ~20 (milestone sum 100, session count 0/1/50/51, duration 14/15/240/241) |
| Race condition | 1 (concurrent package creates) |
| **Tests passing** | **50 / 50** |

### Combined Service Test Suite

Running `npx mocha test/service.test.js test/service.online.test.js` together produces **218 / 218 passing** with zero regressions in 17s. The two files share `mocha.js`'s `clearCollections()` and the `seedUser`/`seedCategory`/`seedService` helpers in `helpers/seed.js`; no additional seed helpers are required for the online test file (uses `buildServiceLocation` from the service suite).

### References

- Canonical spec: `docs/OnlineService.md` §4.2, §4.3, §5.4
- Implementation tracker: `docs/OnlineService-Implementation-Checklist.md` (Tasks 8–25, 50/50 GREEN as of 2026-06-29)
- Source code under test: `functions/src/service.js` (lines 41–52, 161–234, 250–341, 1987–2070)
