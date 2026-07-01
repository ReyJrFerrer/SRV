# SRV Wiki Index

This is the page catalog for the LLM-compiled knowledge base. Every wiki page is listed here with a link and one-line summary.

## Architecture

- [[Reputation System Overview]] — Hybrid Firestore/blockchain reputation architecture (actual: Firestore JS)
- [[Reputation System ICP]] — ICP canister trust engine (legacy design reference)
- [[Reputation System Sui]] — Sui Move reputation module (standalone, not integrated)
- [[Firebase Hybrid Architecture]] — 20 deployed Cloud Functions, Firestore, services overview (Phase 1: +1 for onlineProjectAction)

## Backend

- [[Service Creation Workflow]] — Provider service creation, 6-step wizard (Phase 1: +1 Step 0 serviceMode) → Cloud Function → Firestore
- [[Booking System]] — Client booking creation, state machine, payment lifecycle, all status transitions; Phase 2: multi-session `scheduledSessions[]`
- [[Booking Test Infrastructure]] — Mocha + firebase-functions-test, 97 cases, scenario seeders, coverage matrix
- [[Service Test Infrastructure]] — Mocha + firebase-functions-test, **218 cases** (168 base + 50 Phase 1), 29 actions + 4 new validations (serviceMode/weeklySchedule/1-5 packages rule/Service.price invariant)
- [[Review Test Infrastructure]] — Mocha + firebase-functions-test, 115 cases, 23 actions, per-action coverage matrix
- [[Account Test Infrastructure]] — Mocha + firebase-functions-test, 49 cases, 11 actions, per-action coverage matrix, bug fix (payload destructuring)
- [[Reputation Test Infrastructure]] — Mocha + firebase-functions-test, 31 cases, 7 actions, per-action coverage matrix, history subcollection assertions
- [[Online Projects]] — Online/digital service entity, state machine, 18 Cloud Function actions, client-side conversation creation, brief/negotiations/deliverables subcollections; **Phase 0+1 in progress (2026-06-29)**
- [[Reputation Service (Firestore)]] — Actual production reputation implementation (Firestore + JS)
- [[Gemini Review Analysis]] — Gemini 2.5 Flash for review bombing detection
- [[Review System]] — 23 backend actions, 2 Firestore collections, AI analysis, moderation, frontend hooks
- [[Review Test Infrastructure]] — Mocha + firebase-functions-test, 114 cases, 23 actions, per-action coverage matrix
- [[Send Contact Email]] — v1 callable contact form handler
- [[Notification System]] — Multi-channel notifications: 23 → 31 types (Phase 1: +8 for online projects), OneSignal push, transactional email, Firestore store, spam prevention, frontend hooks

## Frontend

- [[Frontend Overview]] — Stack, entry point chain, directory structure, conventions
- [[Routing and Layouts]] — HashRouter route groups, client/provider layouts, auth guards
- [[Authentication Flow]] — zkLogin (Google OAuth via Sui) + Firebase custom token bridge
- [[Services Layer]] — All 20 service modules (Firebase, auth, booking, chat, media, wallet); Phase 1: +1 `onlineProjectCanisterService.ts`
- [[Service Discovery and Listing]] — How clients find, search, browse, and view services; Phase 1: +serviceMode filter
- [[State and Hooks]] — Zustand stores, React contexts, 26 custom hooks; Phase 1: +2 online project hooks
- [[Chat System]] — Firestore-based chat architecture, data model, chat notifications
- [[Media and Images]] — Upload pipeline, 3-layer caching, Firebase Storage, chat attachments, **ProjectBriefAttachment (Phase 1)**
- [[Version Cache Busting]] — Multi-layered cache clearing for Firebase deployments

## Domain

- [[Service and Booking Models]] — Core entities: Service (4 new fields), ServicePackage (3 types), Booking (scheduledSessions[]), OnlineProject, Location, Availability, enriched UI types
- [[Reputation Scoring Algorithm]] — Bayesian average, penalties, time decay, and review weighting (as implemented in `reputationMath.js`)

## Decisions

- [[Chat Media Implementation]] — Plan for media attachments, implemented except mobile port
- [[Grill Record: Online Services Integration]] — Design review: 20 online services, 2 engagement models, 3 new categories, 22 Cloud Functions target (2026-06-27)

## Operations

- [[FCM Push Notifications]] — FCM configuration, testing, and troubleshooting
- [[Firebase Functions Optimization]] — Gen 2 best practices with actual config comparison
- [[PH Location Data]] — Philippine geographic data service (in-memory)
- [[Functions Lint Report]] — Lint findings for functions/ directory architecture
- [[Unit Test Creation Checklist]] — 8-step checklist for adding integration tests to any Cloud Function (action-dispatch, scheduled, trigger, internal)
- [[Wiki Lint 2026-06-27]] — Health check: contradictions, orphans, gaps, stale claims
- [[Wiki Lint Booking and Service 2026-06-27]] — Booking/service focused lint: 6 contradictions, 8 missing docs, 3 stale claims, 3 gaps
- [[Wiki Lint Review and Reputation 2026-06-27]] — Review/reputation focused lint: 3 contradictions, 15 missing docs, 4 stale claims, 5 gaps
- [[Wiki Lint Media and Notifications 2026-06-27]] — Media/notification focused lint: 4 contradictions, 11 missing docs, 3 stale claims, 4 gaps
- [[Booking Test QA Findings 2026-06-28]] — QA review of `booking.test.js`: 3 critical bugs, ~30 recommended tests, ~44% edge case coverage

## Decisions

- [[Chat Media Implementation]] — Plan for media attachments, implemented except mobile port
- [[Grill Record: Online Services Integration]] — Design review: 20 online services, 2 engagement models, 3 new categories, 22 Cloud Functions target (2026-06-27)
- [[Grill Record: Unit Test Creation Checklist]] — 8-step reusable checklist for unit test creation, derived from booking.test.js QA review (2026-06-28)

---

_Last updated: 2026-06-29_
_Pages: 40_
