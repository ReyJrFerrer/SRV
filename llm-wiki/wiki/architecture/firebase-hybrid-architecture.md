---
tags: [architecture, backend, firebase]
date: 2026-06-27
sources:
  - functions/index.js
  - functions/firebase-admin.js
  - functions/src/media.js
  - functions/src/onlineProject.js (planned for Phase 1)
related:
  - [[Reputation System Overview]]
  - [[Firebase Functions Optimization]]
  - [[FCM Push Notifications]]
  - [[Reputation Service (Firestore)]]
  - [[Service Creation Workflow]]
  - [[Booking System]]
  - [[Online Projects]]
  - [[Grill Record: Online Services Integration]]
---

# Firebase Architecture

SRV uses Firebase for the cloud backend layer, with **20** deployed Cloud Functions (19 v2 onCall/onDocumentCreated/onSchedule + 1 v1 onCall), Firestore as the primary data store, and Firebase Hosting for the frontend.

> **Phase 1 (Online Services) update**: A new `onlineProjectAction` callable is added to the deployment as part of Phase 1. After Phase 1 ships, the function count will be **21** (20 v2 onCall/onDocumentCreated/onSchedule + 1 v1 onCall). The function table below will include `onlineProjectAction` after the rollout.

## Firebase Services

| Service | Purpose |
|---|---|
| Cloud Functions (Gen 2) | All backend logic via callable functions (`onCall`), Firestore triggers (`onDocumentCreated`), and scheduled tasks (`onSchedule`) |
| Firestore | Primary database (`srvefirestore`) — users, bookings, reviews, messages, notifications, reputations, **online_projects (Phase 1)** |
| Firebase Hosting | Frontend and admin app deployment |
| Cloud Messaging (FCM) | Push notifications via OneSignal |
| Cloud Storage | Media uploads (bucket `srve-7133d`) — **adds `project-briefs/` folder in Phase 1** |
| Firebase Auth | Authentication |
| Secret Manager | API keys (Gemini, OneSignal) |

## Exported Functions

| Group | Exported Functions | Type |
|---|---|---|
| Account | `accountAction` | v2 onCall |
| Admin | `adminUserAction`, `autoReactivateSuspendedAccounts` | v2 onCall/onSchedule |
| Booking | `bookingAction`, `cancelMissedBookings`, `sendServiceReminders` | v2 onCall/onSchedule |
| Chat | `onMessageCreated` | v2 onDocumentCreated |
| Feedback | `feedbackAction` | v2 onCall |
| Media | `mediaAction` | v2 onCall |
| Notification | `notificationAction`, `cleanupExpiredNotifications`, `cleanupNotificationFrequency` | v2 onCall/onSchedule |
| **Online Project (Phase 1)** | **`onlineProjectAction` (planned)** | **v2 onCall** |
| PH Locations | `phLocationsAction` | v2 onCall |
| Reputation | `reputationAction` | v2 onCall |
| Review | `reviewAction` | v2 onCall |
| Review Analysis | `analyzeNewReview`, `reviewAnalysisAction` | v2 onDocumentCreated/onCall |
| Service | `serviceAction`, `processScheduledDeletions` | v2 onCall/onSchedule |
| Contact | `sendContactEmail` | **v1** onCall |

> **Phase 1 — `onlineProjectAction` (new)**: 18 actions via `switch (action)` dispatch. Handles the full OnlineProject lifecycle (create, accept, decline, negotiate, acceptCounterOffer, submitDeliverable, approveDeliverable, requestRevision, cancel, dispute, recordPayment, markMilestoneApproved, updateMilestoneMetadata, get, listProvider, listClient, getAnalytics). Follows the same pattern as `bookingAction`. See [[Online Projects]] for the full action list.

## Global Config

```js
setGlobalOptions({
  maxInstances: 1,
  memory: "256MiB",
  region: "asia-southeast1"
});
```

> **Note**: `maxInstances: 1` limits each function to a single concurrent instance. The [[Firebase Functions Optimization]] wiki recommends higher values with explicit `concurrency` for Gen 2 — this is a known contradiction between the wiki and actual config.

## Bridge Pattern (Original Design)

The original architecture envisioned Cloud Functions as a bridge between Firestore and blockchain canisters (ICP/Sui). In practice, all business logic runs directly in Cloud Functions with Firestore as the sole data store. See [[Reputation System Overview]] for details.
