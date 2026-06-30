---
tags: [backend, service, testing, quality-assurance]
date: 2026-06-28
related:
  - [[Service Creation Workflow]]
  - [[Booking Test Infrastructure]]
  - [[Unit Test Creation Checklist]]
  - [[Functions Lint Report]]
  - [[Media and Images]]
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
└── service.test.js             # 29 actions × ~5-12 cases per action (168 total)
```

### Log File Routing

`mocha.js` now writes `console.error` output to per-suite log files:

| Test File | Log File |
|---|---|
| `booking.test.js` | `test-output-booking.log` |
| `service.test.js` | `test-output-service.log` |
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
