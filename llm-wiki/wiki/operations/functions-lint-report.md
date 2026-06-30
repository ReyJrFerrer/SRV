---
tags: [lint, functions, architecture]
date: 2026-06-16
related:
  - [[Firebase Functions Optimization]]
  - [[Firebase Hybrid Architecture]]
  - [[Reputation System ICP]]
  - [[Reputation System Sui]]
  - [[Chat Media Implementation]]
  - [[Booking Test Infrastructure]]
  - [[Booking Test QA Findings 2026-06-28]]
---

# Lint Report: `functions/` Architecture

Lint pass against the actual `functions/` codebase. Findings are grouped by severity.

## 🔴 Contradictions (Wiki vs Reality)

### 1. Reputation is computed in JS, not on ICP

**Wiki claim**: [[Reputation System Overview]] describes an ICP canister trust engine where Firestore data is bridged to the blockchain for tamper-proof scoring. [[Reputation System ICP]] goes into detail about Principal IDs, on-chain state, and orthogonal persistence.

**Reality**: `src/reputation.js` line 4–5 explicitly states: *"manages reputation directly using Firestore and pure JavaScript based math utility instead of the Internet Computer reputation canister."* All scoring is done via `src/utils/reputationMath.js` — a Firestore-based CRUD with no blockchain interaction.

**Severity**: High — affects [[Reputation System ICP]], [[Reputation System Overview]], [[Reputation Scoring Algorithm]].

### 2. maxInstances: 1 contradicts every optimization guideline

**Wiki claim**: [[Firebase Functions Optimization]] recommends `concurrency: 80`, capped `maxInstances`, and efficient scaling.

**Reality**: `index.js` line 11 sets `setGlobalOptions({ maxInstances: 1, ... })`. Every deployed function is limited to a single concurrent instance. No function sets `concurrency` explicitly. This severely limits throughput and contradicts the entire concurrency-driven optimization strategy.

**Severity**: High — affects [[Firebase Functions Optimization]].

### 3. No Sui blockchain integration visible in functions

**Wiki claim**: [[Reputation System Sui]] describes `srv_reputation::reputation` Move module with scoring, flags, and review processing.

**Reality**: Zero references to Sui in any functions source code. The Sui module may exist in `src/backend/` but is not connected to the Firebase layer.

**Severity**: Medium — possible gap or stale wiki page.

## 🟡 Architectural Issues

### 4. Duplicate `admin.initializeApp()` calls

`src/reputation.js` (lines 19–28) and `src/account.js` (lines 23–32) both independently call `admin.initializeApp()` with emulator detection, duplicating the logic already handled by `firebase-admin.js`. Every other file imports from `firebase-admin.js`. These two files bypass the shared singleton.

**Files affected**: `src/reputation.js:19-28`, `src/account.js:23-32`

### 5. Mixed v1 and v2 function SDK

`sendContactEmail.js` uses the v1 SDK (`require("firebase-functions")`, `functions.https.onCall`). All 17 other functions use v2. This means different cold-start behavior, different context objects, and inconsistent error handling.

### 6. ~~No test files~~ — RESOLVED 2026-06-28 (partial)

**Original finding**: Zero test files exist anywhere under `functions/`. No `*.test.js`, `*.spec.js`, or `__tests__/` directory. This is a quality and regression risk.

**Resolution**: `functions/test/booking.test.js` was added with 46 integration test cases across all 17 `bookingAction` cases. It uses Mocha + `firebase-functions-test` against the real Firestore emulator. See [[Booking Test Infrastructure]] for full details and [[Booking Test QA Findings 2026-06-28]] for coverage gaps and recommended additions.

**Status**: Partial. `booking.test.js` covers the consolidated `bookingAction` callable. Still missing tests for:
- Other Cloud Functions (`reputationAction`, `reviewAction`, `notificationAction`, `mediaAction`, `onlineProjectAction`, `serviceAction`, `chatAction`, `sendContactEmail`)
- Pure modules: `reputationMath.js` (pure math — easy to unit test without emulator)
- Scheduled functions (`cancelMissedBookings`, `sendServiceReminders`)

### 7. Empty `src/lib/` directory

The directory exists but is unused. No library modules have been extracted.

### 8. No deployment manifest

[[Firebase Functions Optimization]] recommends a deployment manifest mapping source folders to exported functions for CI/CD. None exists. Full deploys are the only option.

## 🟢 Gaps (Things Not Yet in Wiki)

### 9. `ChatAttachment` media type is partially implemented

`media.js` (line 77) already handles `ChatAttachment` with a 1GB size limit — counter to the wiki's [[Chat Media Implementation]] which says this is Phase 1 work. However `chat.js` still has no attachment handling, so the frontend cannot send them.

### 10. PH location data system

`src/phLocationData.js` and `src/phLocations.js` implement an in-memory Philippine geographic data service (regions, provinces, municipalities, barangays). Not documented anywhere in the wiki.

### 11. Firestore database name `srvefirestore` is explicit

`firebase-admin.js` uses `getFirestoreFromAdmin(admin.app(), "srvefirestore")`. This naming convention is not documented in the wiki.

### 12. Function count

18 exported functions (17 v2 + 1 v1). The wiki should track this as the codebase evolves.

### 13. `sendContactEmail.js` is a standalone v1 function

Uses a different pattern from all other functions. Not documented.

## 📋 Recommendations

1. **Fix `maxInstances`**: Change global to `maxInstances: 10` or higher, and add `concurrency: 80` per-function (or globally) for Gen 2 efficiency.
2. **Update wiki**: Correct all reputation pages to reflect the JS-only, Firestore-based implementation. Move ICP/Sui details to a "Future / Legacy Architecture" section.
3. **Consolidate admin init**: Remove standalone `admin.initializeApp()` from `reputation.js` and `account.js`; use `require("../firebase-admin")` like all other files.
4. **Convert `sendContactEmail.js`** to v2 SDK for consistency.
5. **Add tests**: Start with at least `reputationMath.js` unit tests since it's pure math. *(partially resolved 2026-06-28: booking.test.js added; reputation tests still missing)*
6. **Document PH location data** in the wiki.
7. **Either use or remove `src/lib/`**.

## Quick Stats

| Metric | Value (2026-06-16) | Value (2026-06-28) |
|---|---|---|
| Exported functions | 18 (17 v2, 1 v1) | 20 (19 v2, 1 v1) + 2 scheduled |
| Test files | 0 | 1 (`booking.test.js`, 46 cases) |
| Duplicate admin inits | 2 files | 2 files (unchanged) |
| maxInstances | 1 (global) | 1 (global) (unchanged) |
| concurrency | Not set anywhere | Not set anywhere (unchanged) |
| ChatAttachment support | media.js: yes; chat.js: no | media.js: yes; chat.js: yes |
| Deployment manifest | None | None (unchanged) |
