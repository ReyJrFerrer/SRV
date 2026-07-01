# SRV Wiki Activity Log

Chronological record of all wiki operations (ingests, queries, lint passes, updates).

## [2026-06-16] init | Wiki created

- Initialized `llm-wiki/` directory structure
- Created index.md and log.md stubs
- No pages yet

## [2026-06-16] ingest | Initial batch: docs/ and top-level plans

Ingested 9 source files from `docs/` and repo root into the initial wiki pages.

Created 9 wiki pages covering architecture, backend, domain, decisions, and operations.

## [2026-06-16] lint | functions/ architecture

Performed lint pass on the actual `functions/` source code. Found 3 contradictions, 5 architectural issues, 5 documentation gaps. Created [[Functions Lint Report]].

## [2026-06-16] ingest | Apply lint findings

Updated wiki to reflect actual codebase:

**Fixed pages (5):**

- [[Reputation System Overview]] — Rewritten to reflect Firestore-native JS reality, ICP/Sui demoted to legacy
- [[Reputation System ICP]] — Marked as legacy design reference with "why it was replaced" note
- [[Reputation System Sui]] — Marked as standalone experiment, not integrated
- [[Reputation Scoring Algorithm]] — Updated constants and formulas to match `reputationMath.js` exactly
- [[Firebase Functions Optimization]] — Added actual-vs-recommended comparison table

**New pages (3):**

- [[Reputation Service (Firestore)]] — Actual production implementation details
- [[PH Location Data]] — Philippine geographic data service
- [[Send Contact Email]] — v1 contact form handler

**Updated pages (1):**

- [[Chat Media Implementation]] — Added completion tracker showing partial media.js progress

Updated index.md (13 pages, 6 categories).

## [2026-06-16] ingest | Frontend Client-Side App

Ingested the complete `src/frontend/` source code — all pages, services, hooks, stores, contexts, and utilities.

**New pages (7):**

- [[Frontend Overview]] — Stack, entry point chain, directory structure, conventions
- [[Routing and Layouts]] — HashRouter route groups, client/provider layouts, auth guards
- [[Authentication Flow]] — zkLogin + Firebase custom token bridge, session management
- [[Services Layer]] — All 20 service modules documented with responsibilities
- [[State and Hooks]] — Zustand stores, React contexts, 26 custom hooks mapped
- [[Chat System]] — Firestore-based chat architecture, data model, known media gaps
- [[Media and Images]] — Upload pipeline, 3-layer caching, Firebase Storage integration

Updated index.md (20 pages, 6 categories).

## [2026-06-16] lint | Frontend chat/media pages

Lint pass on `[[Chat System]]` and `[[Media and Images]]` against actual source code. Found that the initial ingest was based on outdated `AGENTS.md` — chat media sending is **mostly implemented**, not missing.

**Fixed pages (2):**
- [[Chat System]] — Rewrote to reflect `sendMediaMessage()`, `uploadChatAttachments()`, `ChatAttachmentPreview` UI, attachment-aware `onMessageCreated` trigger, and `ChatAttachment` media type. Changed "Known Gaps" to true remaining gaps (GlobalChatDock, thumbnails, progress, cleanup, mobile, storage rules).
- [[Media and Images]] — Removed "No ChatAttachment type exists" claim. Added `ChatAttachment` table entry with 1GB limit, `chat-attachments/` path pattern, two-step upload flow, and accurate remaining gaps.

Updated index.md (20 pages, 6 categories).

## [2026-06-16] ingest | Chat recent commits

Ingested git commits from `d54a0d74` (Initial Chat Overhaul) through `1106eb19` plus uncommitted changes.

**Updated pages (2):**
- [[Chat System]] — Added video support, document support (PDF/DOC/TXT/CSV), base64→direct Storage upload architecture change, 1GB limit, group-by-type sending (separate messages per type), text-first sending order, document icon styling, paste support for all types, Heroicons in preview text, recent commit log table
- [[Media and Images]] — Updated `uploadChatAttachments` pipeline: `initChatAttachment` action (not `uploadChatAttachment`), direct `uploadBytesResumable` to Storage (no base64), document types in file type table, 1GB max for all chat files, path pattern with `mediaId_sanitizedName`, `validateFileSize` now allows unlimited for video content. Added architectural change note explaining why base64 was replaced.

Updated index.md (20 pages, 6 categories).

## [2026-06-17] ingest | Service creation to booking workflow

Ingested full end-to-end workflow: provider service creation → client discovery → booking → state machine → completion.

**New pages (4):**
- [[Service Creation Workflow]] — 5-step wizard, data flow, Firestore document structure, post-creation lifecycle
- [[Booking System]] — Creation flow, full state machine with all 7 statuses and valid transitions, payment lifecycle, scheduled functions, provider/client actions
- [[Service and Booking Models]] — All domain types: Service, ServicePackage, Booking, Location, Availability, Schedule, enriched UI types, collection structure, entity relationships
- [[Service Discovery and Listing]] — All listing routes, home page, search (client-side), categories, service detail page with Book Now gating, data layer hooks, location & distance

Updated index.md (24 pages, 6 categories).

## [2026-06-19] ingest | OnlineService.md specification

Ingested the Online Service Modes specification from `OnlineService.md`.

**New pages (1):**
- [[Online Projects]] — Online/digital service entity, state machine, Cloud Function actions, client-side conversation creation, notification dispatch

**Fixed pages (2):**
- [[Chat System]] — Corrected `getOrCreateConversation()` → `createConversation()` which implements get-or-create pattern internally
- [[Services Layer]] — Same correction in `chatCanisterService` method listing

**Key finding**: The original spec referenced a non-existent `getOrCreateConversation` backend function. Investigation revealed that `chatCanisterService.createConversation()` in the frontend already implements a get-or-create pattern client-side, and the backend has no conversation creation callable. Online projects follow the same booking pattern — conversation is created client-side after acceptance.

Updated index.md (25 pages, 6 categories).

## [2026-06-20] update | ProjectBriefAttachment media.js registration

Fixed the `ProjectBriefAttachment` 50MB spec — it wasn't registered in `media.js`'s decentralized config (6 separate locations need entries: `generateFilePath`, `validMediaTypes`, `validateFileSize`, error text, `getStorageStatsHandler`, `SUPPORTED_CONTENT_TYPES`).

**Spec change** (`OnlineService.md` §5):
- Replaced the inaccurate "Storage path: /media/{userId}/{uuid}.{ext}" with the actual path pattern `project-briefs/{ownerId}/{mediaId}_{sanitizedFileName}`
- Added full 6-point registration checklist with exact code snippets for each touchpoint in `media.js`
- Changed upload flow from ambiguous to explicit two-step init pattern (matching `ChatAttachment`): client calls `initProjectBriefUpload` → client uploads directly to Storage → URL included in `createOnlineProject`
- Fixed `submitDeliverable` row in §4.3: removed `uploadMediaInternal("ProjectDeliverable")` (doesn't exist), replaced with pre-uploaded file URL pattern

## [2026-06-20] ingest | Firestore security rules for online_projects

Ingested the Firestore security rules pattern for `online_projects` into the wiki.

**Updated page** (`backend/online-projects.md`):
- Added "Security Rules" section documenting the pattern: read gated by `clientId`/`providerId`, `create`/`update`/`delete` blocked to enforce backend-only mutations
- Includes the rules diff snippet for `firestore.rules` and the `get(parent doc)` pattern for the `negotiations` subcollection

## [2026-06-20] ingest | media.js decentralized registration architecture

Ingested findings about the `media.js` type registration architecture into the wiki.

**Existing page updated** (`frontend/media-and-images.md`):
- Added "Media Type Registration (6 Scattered Touchpoints)" section documenting all 6 locations that need entries when adding a new media type: `generateFilePath`, `validMediaTypes`, `validateFileSize`, error message text, `getStorageStatsHandler`, `SUPPORTED_CONTENT_TYPES`
- Added reference table of all 8 registered media types with their folder, cap, and init action
- Added "Design Debt" note about the lack of central config, the `ProblemProof` gap in `validMediaTypes`, and the maintenance burden of 6 scattered touchpoints
- Updated `mediaAction` line to include `initProjectBriefUpload`

Replaced the array-based `negotiationHistory` with a `negotiations/{offerId}` subcollection under each project, written inside Firestore transactions:

**Spec change** (`OnlineService.md`):
- Removed `negotiationHistory?: NegotiationOffer[]` from `OnlineProject` interface
- Restructured §2.6 as "Negotiation Offers (Subcollection)" — offers live in `online_projects/{id}/negotiations/{offerId}`
- Added transaction requirements: `db.runTransaction()` validates status atomically before writing offer doc
- Updated §4.3 `negotiateProject` → "Creates offer doc in `negotiations` subcollection (inside transaction)"
- Updated §4.3 `acceptCounterOffer` → "Reads latest offer from `negotiations` subcollection (inside transaction)"

**Wiki update** (`backend/online-projects.md`):
- Updated description and actions table to reflect subcollection + transaction pattern

## [2026-06-20] update | Timestamp convention consistency

Fixed inconsistent timestamp types across `OnlineService.md` and wiki pages:

**Spec fix** (`OnlineService.md`):
- `createdAt`/`updatedAt`/`acceptedAt`/`completedAt` on `OnlineProject`: `Timestamp` → `string` (ISO 8601)
- `submittedAt` on `DeliverableSubmission`: `Timestamp` → `string`
- `createdAt` on `NegotiationOffer`: `Timestamp` → `string`
- Rationale: Backend writes `new Date().toISOString()` in Cloud Functions (same as `booking.js`). The Booking interface consistently uses `string` for all timestamps.

**Wiki fixes (3 pages):**
- `backend/booking-system.md` — `createdAt`/`updatedAt`: `Timestamp` → `string`
- `backend/service-creation.md` — `createdAt`/`updatedAt` on Service and ServicePackage: `Timestamp` → `string`
- `domain/service-and-booking-models.md` — All 8 `Timestamp` type references on entity definitions fixed to `string`

## [2026-06-27] lint | Wiki health check

Performed comprehensive lint pass across all 25 wiki pages against the codebase state at commit `85aec7b8`.

**Contradictions (2):**
- [[Chat Media Implementation]] — completion table is entirely stale: phases 1–6 are all implemented, page needs rewrite
- [[Functions Lint Report]] claim #9 — chat.js attachment handling gap is now closed

**Orphans (4):**
- [[Online Projects]] — no inbound wikilinks from other pages
- [[Version Cache Busting]] — no inbound wikilinks
- [[PH Location Data]] — no inbound wikilinks from other pages
- [[Send Contact Email]] — no inbound wikilinks from other pages

**Stale claims (3):**
- `decisions/chat-media-implementation.md` — entire completion status table
- `operations/functions-lint-report.md` claim #9 — chat.js attachment handling
- `operations/fcm-push-notifications.md` — should clarify OneSignal is primary, FCM is underlying layer

**Gaps (5 uncovered concepts):**
- OneSignal integration (referenced by 5 pages, no dedicated page)
- TanStack Query pattern
- Firestore Security Rules pattern
- GCash/Payment Flow
- Provider Profile (FrontendProfile) entity

Created [[Wiki Lint 2026-06-27]].

## [2026-06-27] update | Raw layer redefined to codebase

Redefined the wiki's raw source layer from `llm-wiki/raw/` to the actual codebase (`src/`, `functions/`, etc.). The `llm-wiki/raw/` directory is deleted — all obsolete spec references removed.

**Updated skill**: `llm-wiki/SKILL.md` — Architecture, directory layout, ingest operation, page format, log format, and integration notes all reflect code-as-source convention.

**Cleaned up 12 wiki pages**: Removed 15 `raw/specs/` references from frontmatter `sources:` fields, replaced with actual code paths or docs/ paths where appropriate. Zero remaining `raw/` references in any wiki page.

## [2026-06-27] lint | Booking & Service deep code review

Linted all booking and service wiki pages against actual source code. Reviewed `functions/src/booking.js` (2354 lines), `functions/src/service.js` (2516 lines), `src/frontend/src/services/bookingCanisterService.ts`, `src/frontend/src/services/serviceCanisterService.ts`, and 5+ hook files.

**Contradictions found (6):**
- "Callable-only mutation" — `updateProviderAttachments()` does direct Firestore writes
- "Trust score >= 5" — backend rejects `<= 5` (effective: `> 5`)
- `instantBookingEnabled` defaults false, not true
- `maxBookingsPerDay` defaults null, not 10
- `bookingNoticeHours` defaults null, not 2
- Title min length is 1, not 3

**Missing features documented (5):**
- `startNavigation` action (status-neutral GPS init)
- `cancelConflictingBookings` auto-cancellation
- Cancellation reputation deduction + report generation
- Shared booking listener pattern
- `servicePackageId`/`servicePackageIds` duality

**Created page:**
- [[Wiki Lint Booking and Service 2026-06-27]] — Full findings with 18 items

**Fixed pages (4):**
- [[Booking System]] — Added startNavigation, cancelConflictingBookings, shared listeners, duality, fixed callable-only and trust-score claims
- [[Service Creation Workflow]] — Fixed 4 default values, title min length, added description max length
- [[Service and Booking Models]] — Fixed category slugs, added createdAt/updatedAt `any` type, Principal inconsistencies, package commission gap, enhanced service variants
- [[Service Discovery and Listing]] — Added correct category slugs from backend

## [2026-06-27] lint | Review & Reputation deep code review

Linted all 4 review/reputation wiki pages against actual source code. Reviewed `functions/src/review.js` (1677 lines), `functions/src/reputation.js` (~910 lines), `functions/src/queueReviewAnalysis.js` (375 lines), `functions/src/utils/reviewAnalyzer.js` (651 lines), `functions/src/utils/reputationMath.js` (311 lines), `src/frontend/src/services/reviewCanisterService.ts`, `src/frontend/src/services/reputationService.ts`, and 4 hook files.

**Contradictions found (3):**
- Trust level "New" doesn't exist — first level is "Low" (0–20)
- Gemini flow uses Firestore trigger (`analyzeNewReview`), not Cloud Tasks
- Gemini analysis detects suspicious patterns, not sentiment

**Missing docs found (15):**
- No dedicated Review System wiki page (25 backend actions, 2 collections, moderation pipeline)
- `submitProviderReview`, `providerReviews` collection, review moderation, admin actions, rating endpoints, `updateReview`, status values (`Flagged`/`Deleted`), `qualityScore` field, "Other" flag, provider new-user bonus, `getUserReviews`, `getUserRating`, soft-delete behavior

**Created page:**
- [[Wiki Lint Review and Reputation 2026-06-27]] — Full findings with 22 items

**Fixed pages (4):**
- [[Reputation Scoring Algorithm]] — Fixed "New"→"Low" trust level, added "Other" flag, added provider new-user bonus, marked review weighting as not implemented
- [[Gemini Review Analysis]] — Rewrote flow (Firestore trigger, not Cloud Tasks), removed non-existent sentiment/consistency claims, added actual pattern detection capabilities
- [[Reputation Service (Firestore)]] — Fixed history schema to include full state (`trustScore`, `trustLevel`, `completedBookings`, `averageRating`, `detectionFlags`, `timestamp`, `action`)
- [[Reputation System Overview]] — Clarified deduction applies to providers only, added "Other" flag to anti-manipulation list, corrected AI-powered analysis flow reference

## [2026-06-27] create | Review System standalone page

Created [[Review System]] page covering the entire review subsystem:

- Backend: all 23 `reviewAction` actions with auth requirements and descriptions
- `reviews` and `providerReviews` collection schemas
- AI analysis trigger flow (Firestore `analyzeNewReview` → Gemini → `checkConsecutiveBadReviews`)
- Reports collection schema and role in the review ecosystem
- Frontend `reviewCanisterService.ts` — 23 backend method mappings + 3 client-side helpers
- Frontend hooks: `useReviewManagement`, `useServiceReviews`, `useProviderReviews`, `useBookingRating`, `useClientRating`
- Key implementation details: soft-delete behavior, sync reputation impact, async AI, no review weighting, index-fallback pattern

Updated index.md (29 pages).

## [2026-06-27] lint | Media & Notifications deep code review

Linted all 4 media/notification wiki pages against actual source code. Reviewed `functions/src/media.js` (1186 lines), `functions/src/notification.js` (1326 lines), `functions/src/chat.js` (205 lines), `src/frontend/src/services/mediaService.ts`, `src/frontend/src/services/oneSignalService.ts`, `src/frontend/src/services/notificationCanisterService.ts`, `src/frontend/src/services/notificationIntegrationService.ts`, `src/frontend/src/services/pwaService.ts`, and 4 hook files.

**Contradictions found (4):**
- `ProjectBriefAttachment` claimed as registered but doesn't exist in `media.js`
- `firebase-hybrid-architecture.md` says 18 functions, actual count is 20
- `media-and-images.md` claims "server-side thumbnails" — no thumbnail gen exists
- `chat-media-implementation.md` completion table still shows phases 1b–6 as ❌ (previous lint finding unfixed)

**Missing docs found (11):**
- No Notification System wiki page (11 actions, 2 scheduled functions, 2 auxiliary collections)
- `notifications` collection schema, spam prevention (`notificationFrequency`), chat email cooldowns (`chatEmailCooldowns`)
- 6 undocumented `mediaAction` actions (getMediaByOwner, getMediaByTypeAndOwner, getFileData, updateMediaMetadata, validateMediaItems, getCertificatesByValidationStatus, updateCertificateValidationStatus)
- Frontend PWA infrastructure (`pwaService.ts`, `usePWA.ts`, `useChatNotifications.tsx`)
- Notification component ecosystem (7 components), emulator-aware URLs

**Created page:**
- [[Wiki Lint Media and Notifications 2026-06-27]] — Full findings with 22 items

**Fixed pages (3):**
- [[Chat Media Implementation]] — Rewrote completion table (phases 1b–6 ✅), removed aspirational file limits, added historical notes on design principles
- [[Media and Images]] — Fixed "server-side thumbnails" claim, marked `ProjectBriefAttachment` as planned/not implemented
- [[Firebase Architecture]] — Fixed function count (18→20)

Updated index.md (30 pages).

## [2026-06-27] create | Notification System wiki page

Created [[Notification System]] page covering the complete notification infrastructure:
- Backend `notification.js` — 11 actions, 2 scheduled functions, `notifications` collection schema (25 fields), `notificationFrequency` spam prevention, `chatEmailCooldowns` for chat email rate-limiting
- 23 `NOTIFICATION_TYPES`, 4 `NOTIFICATION_STATUS` values, 16 booking email types, spam prevention constants
- OneSignal push delivery flow (fire-and-forget, multi-device via `include_player_ids`)
- Email notification delivery with booking detail enrichment (Asia/Manila timezone, PHP amounts, Google Maps links)
- Notification href generation table (20+ type-to-route mappings for client/provider)
- 5 other notification sources (chat `onMessageCreated`, booking state changes, review submissions, cancellation reports)
- Frontend `notificationCanisterService.ts` — 14 methods with real-time Firestore `onSnapshot` subscriptions (250ms debounce, lazy cleanup)
- Frontend hooks: `useNotificationsWithPush` (554 lines), `useProviderNotificationsWithPush` (549 lines), `useChatNotifications.tsx` (226 lines), `usePWA.ts` (437 lines)
- Frontend services: `oneSignalService.ts` (OneSignal v16 SDK wrapper, 10 methods), `notificationIntegrationService.ts` (bridge, 125 lines), `pwaService.ts` (PushManager lifecycle, 455 lines)
- Component ecosystem: push permission modals, in-app popups (queue, stacking, auto-dismiss), notification list items, type-to-icon mapping, toast notifications

Fixed `chat-media-implementation.md`:
- Storage security rules row updated from ❌ to ✅ (`storage.rules:113-126`)
- Status line updated from "Two gaps remain" to "One gap remains (mobile port)"
- Chat System and Media and Images index descriptions updated (no longer reference "gaps")

Updated index.md (31 pages).

## [2026-06-27] grill | Online Services Integration

Grilled the plan for integrating 20 new online services (8 Digital & Creative, 7 Business & SME, 5 Education & Specialized Knowledge) into the SRV local-service marketplace. Two engagement models: product-based (OnlineProject) and session-based (multi-session Booking).

**Created**:
- `docs/OnlineService.md` — Canonical spec covering all 20 services, both engagement models, the full data model, state machines, payment, notifications, security rules, indexes, frontend routes, and rollout phases.
- `llm-wiki/wiki/decisions/grill-2026-06-27-online-services-integration.md` — Decision record with 24 locked decisions across architecture, data model, lifecycle, payment, discovery, security, mobile, and rollout.

**Updated wiki pages (9)**:
- `backend/online-projects.md` — Rewrote to reflect opt-in negotiation via `service.negotiable`, 18-action list with milestone metadata exception, 4 subcollections (briefs/negotiations/deliverables + direct fields), Phase 1/Phase 2 split, 6 new Firestore indexes
- `domain/service-and-booking-models.md` — Added 4 new Service fields (`serviceMode`, `negotiable`, `allowsMilestones`, `onlineDeliveryFormat`), 3 new categories (13 total), ServicePackage 3-type discriminated union, `scheduledSessions[]` on Booking, OnlineProject type
- `backend/booking-system.md` — Added Multi-Session Booking Extension section (Phase 2), 5 new actions, 24h reschedule rule, Phase 1 payment validation rules
- `backend/service-creation.md` — Documented Step 0 serviceMode selection, conditional wizard fields, new Service fields, ServicePackage type field
- `frontend/media-and-images.md` — Marked `ProjectBriefAttachment` as implemented in Phase 1, added 6+1 touchpoint table, two-step upload flow
- `backend/notification-system.md` — Added 8 new notification types for online projects with full href table and dispatch pattern
- `architecture/firebase-hybrid-architecture.md` — Added `onlineProjectAction` to the function list (Phase 1 deployment)

**Walked 19 design tree branches**, resolved 24 key decisions, flagged 5 wiki contradictions (callable-only invariant with documented exception, category count, function count, ProjectBriefAttachment status, action count).

**Output**: `wiki/decisions/grill-2026-06-27-online-services-integration.md` + `docs/OnlineService.md`

Updated index.md (32 pages, 6 categories).

## [2026-06-28] ingest | Booking test infrastructure & QA findings

Ingested `functions/test/booking.test.js` (46 cases across 17 actions) and cross-validated against `functions/src/booking.js`. Documented the test stack, scenario seeders, coverage matrix, and the QA findings from the review.

**New pages (2):**
- [[Booking Test Infrastructure]] — Mocha + `firebase-functions-test` setup, scenario seeders, coverage matrix, ~44% edge case coverage summary
- [[Booking Test QA Findings 2026-06-28]] — 3 critical bugs (missing 2nd notification, sparse declineBooking, missing auth tests), ~30 recommended tests across doc-not-found/empty-results/conflict-guards/silent-swallow categories

**Updated pages (3):**
- [[Booking System]] — Added "Test Coverage" section with strengths/gaps summary, updated frontmatter `related:` and `sources:` to include test files
- [[Functions Lint Report]] — Marked finding #6 (no test files) as RESOLVED (partial); updated Quick Stats table with before/after columns; updated recommendation #5
- [[Wiki Lint Booking and Service 2026-06-27]] — Added "Test Coverage (added 2026-06-28)" follow-up section with cross-references to new pages

Updated index.md (34 pages, 7 categories).

## [2026-06-28] resolve | Booking test QA findings

Resolved all 3 critical bugs and ~30 recommended tests from [[Booking Test QA Findings 2026-06-28]] by editing `functions/test/booking.test.js` directly. Test suite grew from 46 to **97 cases**; all passing.

**Critical bugs fixed:**
- ✅ Bug 1: `startBooking` now asserts both `START_SERVICE` (client) and `SERVICE_COMPLETION_REMINDER` (provider) notifications
- ✅ Bug 2: `declineBooking` now has 6 cases (was 2) — added unauth, non-provider, doc-not-found, missing bookingId
- ✅ Bug 3: `checkServiceAvailability` and `getServiceAvailableSlots` now have unauth tests (5 and 4 cases respectively)

**Edge case coverage closed:**
- 11/11 doc-not-found paths now tested
- 5/5 empty-result list/analytics paths tested
- `releasePayment` already-released guard tested
- `createBooking` time conflict, inactive service, wrong provider, wrong package, missing package, missing fields, low provider reputation
- `acceptBooking` auto-cancellation side effect tested
- `cancelBooking` provider-initiated + silent-rep-fail tested
- `disputeBooking` provider-initiated + unauth + doc-not-found tested
- `getBooking` unauth + doc-not-found tested
- `getClientBookings`/`getProviderBookings` admin-on-behalf + empty + unauth tested
- `getClientAnalytics` admin-on-behalf + empty + unauth tested
- `getProviderAnalytics` empty + missing providerId tested
- `releasePayment` missing bookingId + missing releasedAmount + doc-not-found tested

**Code quality improvements:**
- Imported `NOTIFICATION_TYPES` from `notification.js` — replaced 11 hardcoded strings with constants
- Imported `CANCELLATION_PENALTY` from `reputationMath.js` — replaced hardcoded `5` in cancelBooking test

**Coverage improvement:** ~44% → ~95% edge case coverage.

**Verified**: `npm test` runs all 97 tests in ~5s. `eslint` reports no new issues in `booking.test.js` (3 pre-existing issues remain in `mocha.js`).

**Updated pages (3):**
- [[Booking Test Infrastructure]] — Coverage matrix updated to reflect 97 cases across 17 actions; all 🟢
- [[Booking Test QA Findings 2026-06-28]] — Each finding marked ✅ RESOLVED with before/after coverage table
- [[Booking System]] — Test Coverage section rewritten to reflect 97 cases / ~95% coverage; remaining minor gaps listed

Updated index.md (34 pages, 7 categories).

## [2026-06-28] grill | Unit test creation checklist

Grilled plan for a reusable wiki checklist that codifies the patterns from `booking.test.js` (97 cases, ~95% edge case coverage) and applies them to the other 13 functions in `functions/src/`.

**Walked 8 design tree branches** (Steps 0-8), **resolved 7 key decisions** (location, scope, prescriptive style, 7-case matrix, cross-cutting edges, code quality, per-function-type patterns), **flagged 0 contradictions** with existing wiki pages, **identified 2 non-blocking open questions** (scheduled function export pattern, separate media.js touchpoints checklist).

**Function-type mapping**: 11 action-dispatch callables, 6 scheduled functions, 2 Firestore triggers, 2 internal-helper modules.

**New pages (2):**
- [[Unit Test Creation Checklist]] — 8-step checklist with 4 function-type patterns and anti-patterns section, derived directly from booking.test.js QA findings
- [[Grill Record: Unit Test Creation Checklist]] — Decision record with design tree, key decisions, contradictions, open questions

**Updated pages (1):**
- `index.md` — Added [[Unit Test Creation Checklist]] to Operations and [[Grill Record: Unit Test Creation Checklist]] to Decisions

**Output**: `wiki/decisions/grill-2026-06-28-unit-test-checklist.md` + `wiki/operations/unit-test-creation-checklist.md`

Updated index.md (36 pages, 7 categories).

## [2026-06-28] ingest | Review Test Infrastructure

Created [[Review Test Infrastructure]] — 114 integration tests for `reviewAction` (23 actions + unknown action handler).

**Files changed:**
- `functions/test/review.test.js` — new (114 tests, 24 describe blocks)
- `functions/test/mocha.js` — added log routing for `test-output-review.log`
- `functions/test/helpers/seed.js` — added `seedReview`, `seedProviderReview`, `buildReview`, `buildProviderReview`

**Bug fix:** `getReviewStatistics` auth guard (`review.js:954`) was checking `!hasAuth` instead of `!hasAuth || !isAdmin` — any authenticated user could access statistics instead of only admins. Fixed + added non-admin rejection test.

**New pages (1):**
- [[Review Test Infrastructure]] — Full coverage matrix, seeders, conventions, edge cases

**Updated pages (3):**
- [[Review System]] — Added Test Coverage section with highlights
- [[Unit Test Creation Checklist]] — Added Review coverage stats reference, updated sources
- `index.md` — Added [[Review Test Infrastructure]] under Backend (38 pages)

## [2026-06-28] ingest | Service Test Infrastructure

Created [[Service Test Infrastructure]] — 168 integration tests for `serviceAction` (29 actions), scheduled deletion handler, and internal helpers.

**Files changed:**
- `functions/test/service.test.js` — new (168 tests)
- `functions/test/mocha.js` — log file routing per-suite (booking → `test-output-booking.log`, service → `test-output-service.log`)
- `functions/test/helpers/seed.js` — added `seedCategory`, `seedArchivedService`, `buildServiceLocation`
- `functions/src/service.js` — extracted `processScheduledDeletionsHandler` for testability
- `functions/.eslintrc.js` — test file overrides for `require-jsdoc: off`, `max-len: 140`

**New pages (1):**
- [[Service Test Infrastructure]] — Full coverage matrix, seeders, conventions, edge cases

**Updated pages (3):**
- [[Unit Test Creation Checklist]] — Added Service coverage stats reference, updated sources
- [[Booking Test Infrastructure]] — Updated log file description to reflect per-suite routing
- `index.md` — Added [[Service Test Infrastructure]] under Backend (37 pages)

## [2026-06-28] ingest | Account Test Infrastructure

Created [[Account Test Infrastructure]] — 49 integration tests for `accountAction` (11 actions), covering custom token exchange, profile CRUD, role switching, media uploads, and account status.

**Files changed:**
- `functions/test/account.test.js` — new (49 tests across 11 describe blocks)
- `functions/test/mocha.js` — added `pending_users` to `COLLECTIONS_TO_CLEAR`, set `FIREBASE_AUTH_EMULATOR_HOST` for auth emulator integration
- `functions/src/account.js` — fixed `data: payload` destructuring bug at line 589 (caused "Internal Server Error" for all payload-carrying actions)

**Bug fix:** `account.js:589` — `const {action, data: payload} = request.data || {}` replaces `const {action, payload} = request.data || {}`. The property in the client request body is named `data`, not `payload`, causing every action with a payload to receive `undefined`.

**New pages (1):**
- [[Account Test Infrastructure]] — Full coverage matrix, bug fix documentation, seeders, conventions

**Updated pages (2):**
- [[Unit Test Creation Checklist]] — Added Account test count (49) to reference stats
- `index.md` — Added [[Account Test Infrastructure]] under Backend (39 pages)

## [2026-06-28] ingest | Reputation Test Infrastructure

Created [[Reputation Test Infrastructure]] — 31 integration tests for `reputationAction` (7 actions), covering trust score calculation, history subcollection persistence, idempotency, AI flag pipeline, and admin-only guards.

**Files changed:**
- `functions/test/reputation.test.js` — new (31 tests across 7 describe blocks)

**New pages (1):**
- [[Reputation Test Infrastructure]] — Full coverage matrix, history assertions, seeders, conventions

**Updated pages (2):**
- [[Reputation Service (Firestore)]] — Added Test Coverage section with summary stats
- `index.md` — Added [[Reputation Test Infrastructure]] under Backend (40 pages)

## [2026-06-28] fix | `data`/`payload` inconsistency in account action

Fixed an inconsistency where `authCanisterService.ts:updateUserActiveStatus` sent `data` as the payload key, but the handler (`account.js:589`) and `identityBridge.ts` both use `payload`. The mismatch caused `updateUserActiveStatus` to silently fail with "isActive must be a boolean" because payload destructured to `undefined`.

**Files changed:**
- `src/frontend/src/services/authCanisterService.ts:267` — `data:` → `payload:`
- `functions/test/account.test.js` — All test payloads changed from `data:` to `payload:` to match handler

**Updated pages (1):**
- [[Account Test Infrastructure]] — Rewrote "Bug Fix" section to document the actual `data`/`payload` inconsistency

## [2026-06-29] ingest | Phase 1 Online Services tasks 23/24/25 + wiki sync

Verified that Tasks 23 (weeklySchedule required for InPerson/Hybrid), 24 (1–5 packages-per-service rule), and 25 (Service.price = min(package.prices) invariant) were **already implemented** in `functions/src/service.js` and tested in `functions/test/service.online.test.js` — the implementation checklist was stale. All 50 cases in `service.online.test.js` pass alongside the 168 cases in `service.test.js` (combined 218/218 in 17s, no regressions).

**Implementation verified** (all GREEN as of 2026-06-29):
- Task 23: `service.js:219-226` in `validateServiceMode()` — 7 cases
- Task 24: `service.js:1987-1997` with `MAX_PACKAGES_PER_SERVICE = 5` at `service.js:52` — 7 cases
- Task 25: `service.js:2050-2070` transactional price update with race-safe re-read — 7 cases (incl. 2-write concurrent test)

**Updated pages (4):**
- `docs/OnlineService-Implementation-Checklist.md` — marked Tasks 23/24/25 done; added Phase 1.5 closure section; bumped status line
- `llm-wiki/wiki/backend/online-projects.md` — replaced the stale "Not yet implemented" note with the accurate Phase 0+1 status (skeleton dispatcher + 50/50 service tests GREEN; Phases 2–11 still pending)
- `llm-wiki/wiki/backend/service-test-infrastructure.md` — added a new "Phase 1 — Online Services Test Suite" section documenting the 50-case layout, per-group coverage matrix, and the 3 cross-cutting validations; bumped combined coverage to 218/218
- `llm-wiki/wiki/backend/service-creation.md` — added 3 new validation notes to the `createService_service` Validates list (serviceMode fields, weeklySchedule requirement) and to the Phase 1 changes (1–5 packages rule, Service.price invariant)
- `llm-wiki/wiki/index.md` — updated descriptions of [[Online Projects]] and [[Service Test Infrastructure]] to reflect Phase 0+1 status; bumped last-updated date to 2026-06-29

**Test verification**: `npx mocha test/service.test.js test/service.online.test.js` → **218 passing (17s)**.
