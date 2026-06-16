# SRV Wiki Activity Log

Chronological record of all wiki operations (ingests, queries, lint passes, updates).

## [2026-06-16] init | Wiki created

- Initialized `llm-wiki/` directory structure
- Created index.md and log.md stubs
- No pages yet

## [2026-06-16] ingest | Initial batch: docs/ and top-level plans

Ingested 9 source files from `docs/` and repo root into `llm-wiki/raw/specs/`.

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
