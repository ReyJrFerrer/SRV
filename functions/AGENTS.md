# Firebase Functions Gen 1 to Gen 2 Migration Plan

This document outlines the strategy and agent instructions for migrating the SRV Firebase Functions from Gen 1 to Gen 2. The primary goals are to drastically reduce cold start times (TTFB), increase concurrency, and improve overall system reliability.

## Current Bottlenecks (Gen 1)
1. **Monolithic `index.js` Anti-pattern**: The root `index.js` eagerly `require()`s over 80 functions and all their dependencies. When one function scales, the entire codebase is loaded.
2. **Global Database Initialization**: `initializeOnStartup()` runs in the global scope of `index.js`, querying Firestore on every cold start of every instance.
3. **No Concurrency**: Gen 1 allows exactly 1 request per instance. Traffic spikes cause massive cold start delays and risk 429 Resource Exhausted errors.

---

## Migration Phases & Agent Instructions

Agents working on this repository should follow these phases strictly to ensure a smooth transition without breaking frontend integrations.

### Phase 1: Update Global Architecture
- **Goal**: Upgrade global configuration in `index.js` to Gen 2 APIs.
- **Agent Action Items**:
  - Switch imports from `firebase-functions` to `firebase-functions/v2`.
  - Update `setGlobalOptions` to include concurrency settings: `setGlobalOptions({ maxInstances: 50, concurrency: 80, region: "us-central1" })`.
  - Remove the synchronous `initializeOnStartup()` from the global scope. Convert it to a scheduled cron job or execute it defensively only within the specific services that require it.


### Phase 2: Refactoring the Handlers to Gen 2
- **Goal**: Migrate individual function logic in `src/*.js` files to `firebase-functions/v2`.
- **Agent Action Items**:
  - **HTTPS Callables**: 
    - Change `functions.https.onCall(async (data, context) => { ... })`
    - To: `const { onCall, HttpsError } = require("firebase-functions/v2/https");`
    - Signature change: `onCall(async (request) => { const { data, auth } = request; ... })`
  - **Firestore Triggers**:
    - Change `functions.firestore.document().onX()`
    - To `const { onDocumentCreated, onDocumentUpdated, onDocumentWritten, onDocumentDeleted } = require("firebase-functions/v2/firestore");`
    - Signature change: Extract `event.data` instead of `change`/`snap`.
  - **Scheduled Functions**:
    - Change `functions.pubsub.schedule().onRun()`
    - To: `const { onSchedule } = require("firebase-functions/v2/scheduler");`



---

## Agent Execution Protocol
1. **Validation**: After making changes to any file, the agent MUST run `npm run lint` in the `functions/` directory to ensure no syntax errors were introduced.
2. **Incremental Changes**: Migrate one file or module at a time. Do not attempt a massive find-and-replace across the entire `src/` directory at once.
3. **Preserve Endpoint Names**: Do not change the exported names of the functions in `index.js` unless explicitly instructed, as this will break existing frontend client SDK calls.