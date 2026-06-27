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
