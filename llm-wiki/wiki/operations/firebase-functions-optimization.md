---
tags: [operations, firebase, functions, deployment]
date: 2026-06-16
sources:
  - raw/specs/Firebase-Optimization.md
  - functions/index.js
related:
  - [[Firebase Hybrid Architecture]]
  - [[Version Cache Busting]]
  - [[Functions Lint Report]]
---

# Firebase Functions Optimization

Guidelines for writing, deploying, and scaling Firebase Cloud Functions (Gen 2). This page documents both the **ideal** practices from `Firebase-Optimization.md` and the **current reality** of the deployed config.

## Actual Current Config (as of lint)

| Setting | Value | Assessment |
|---|---|---|
| `maxInstances` | **1** (global) | Too restrictive — single instance limits throughput severely |
| `memory` | 256MiB (global), 512MiB (media only) | Good default for CRUD |
| `concurrency` | **Not set anywhere** | Gen 2 default is 1 — should be explicitly set |
| `region` | `asia-southeast1` | OK |

## Recommended Config

| Rule | Implementation |
|---|---|
| Concurrency | Set `concurrency: 80` on all Gen 2 callable functions |
| Max instances | Remove `maxInstances: 1` global; set per-function caps (e.g., `maxInstances: 10`) for budget control |
| Memory | `256MiB` for CRUD; `512MiB–1GiB` for media processing only |
| Connections | Initialize SDK clients globally via `firebase-admin.js` singleton |

## Consolidation Strategy

The codebase already follows a **good consolidation pattern** — each domain file exports a single `onCall` handler with internal action dispatch (e.g., `reputationAction` routes to 7 sub-actions). This avoids function sprawl. The [[Functions Lint Report]] confirms this is well-structured.

## Deployment Strategy

- Avoid full `firebase deploy --only functions` for routine changes
- Partial deploys: `firebase deploy --only functions:reputationAction`
- **No deployment manifest exists** yet (recommended: map source folders to exported functions for CI/CD)
- CI/CD should detect changed functions from git diff and deploy in batches of 5–20

## Known Anti-Patterns (Present in Codebase)

| Anti-Pattern | Location |
|---|---|
| `maxInstances: 1` — prevents scaling | `index.js` global |
| Mixed v1 and v2 SDKs | `sendContactEmail.js` uses v1 |
| No test files | Entire `functions/` |
| Empty `src/lib/` | Directory exists but unused |
