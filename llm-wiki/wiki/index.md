# SRV Wiki Index

This is the page catalog for the LLM-compiled knowledge base. Every wiki page is listed here with a link and one-line summary.

## Architecture

- [[Reputation System Overview]] — Hybrid Firestore/blockchain reputation architecture (actual: Firestore JS)
- [[Reputation System ICP]] — ICP canister trust engine (legacy design reference)
- [[Reputation System Sui]] — Sui Move reputation module (standalone, not integrated)
- [[Firebase Hybrid Architecture]] — 18 deployed Cloud Functions, Firestore, services overview

## Backend

- [[Service Creation Workflow]] — Provider service creation, 5-step wizard → Cloud Function → Firestore
- [[Booking System]] — Client booking creation, state machine, payment lifecycle, all status transitions
- [[Online Projects]] — Online/digital service entity, state machine, Cloud Function actions, client-side conversation creation
- [[Reputation Service (Firestore)]] — Actual production reputation implementation (Firestore + JS)
- [[Gemini Review Analysis]] — Gemini 2.5 Flash for review bombing detection
- [[Review System]] — 23 backend actions, 2 Firestore collections, AI analysis, moderation, frontend hooks
- [[Send Contact Email]] — v1 callable contact form handler
- [[Notification System]] — Multi-channel notifications: 23 types, OneSignal push, transactional email, Firestore store, spam prevention, frontend hooks

## Frontend

- [[Frontend Overview]] — Stack, entry point chain, directory structure, conventions
- [[Routing and Layouts]] — HashRouter route groups, client/provider layouts, auth guards
- [[Authentication Flow]] — zkLogin (Google OAuth via Sui) + Firebase custom token bridge
- [[Services Layer]] — All 20 service modules (Firebase, auth, booking, chat, media, wallet)
- [[Service Discovery and Listing]] — How clients find, search, browse, and view services
- [[State and Hooks]] — Zustand stores, React contexts, 26 custom hooks
- [[Chat System]] — Firestore-based chat architecture, data model, chat notifications
- [[Media and Images]] — Upload pipeline, 3-layer caching, Firebase Storage, chat attachments
- [[Version Cache Busting]] — Multi-layered cache clearing for Firebase deployments

## Domain

- [[Service and Booking Models]] — Core entities: Service, ServicePackage, Booking, Location, Availability, enriched UI types
- [[Reputation Scoring Algorithm]] — Bayesian average, penalties, time decay, and review weighting (as implemented in `reputationMath.js`)

## Decisions

- [[Chat Media Implementation]] — Plan for media attachments, implemented except mobile port

## Operations

- [[FCM Push Notifications]] — FCM configuration, testing, and troubleshooting
- [[Firebase Functions Optimization]] — Gen 2 best practices with actual config comparison
- [[PH Location Data]] — Philippine geographic data service (in-memory)
- [[Functions Lint Report]] — Lint findings for functions/ directory architecture
- [[Wiki Lint 2026-06-27]] — Health check: contradictions, orphans, gaps, stale claims
- [[Wiki Lint Booking and Service 2026-06-27]] — Booking/service focused lint: 6 contradictions, 8 missing docs, 3 stale claims, 3 gaps
- [[Wiki Lint Review and Reputation 2026-06-27]] — Review/reputation focused lint: 3 contradictions, 15 missing docs, 4 stale claims, 5 gaps
- [[Wiki Lint Media and Notifications 2026-06-27]] — Media/notification focused lint: 4 contradictions, 11 missing docs, 3 stale claims, 4 gaps

---

_Last updated: 2026-06-27_
_Pages: 31_
