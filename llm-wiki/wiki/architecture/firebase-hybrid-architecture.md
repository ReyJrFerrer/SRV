---
tags: [architecture, backend, firebase]
date: 2026-06-16
sources:
  - functions/index.js
  - functions/firebase-admin.js
  - functions/src/media.js
  - raw/specs/comprehensive_reputation_system.md
related:
  - [[Reputation System Overview]]
  - [[Firebase Functions Optimization]]
  - [[FCM Push Notifications]]
  - [[Reputation Service (Firestore)]]
  - [[Service Creation Workflow]]
  - [[Booking System]]
---

# Firebase Architecture

SRV uses Firebase for the cloud backend layer, with 18 deployed Cloud Functions (17 v2, 1 v1), Firestore as the primary data store, and Firebase Hosting for the frontend.

## Firebase Services

| Service | Purpose |
|---|---|
| Cloud Functions (Gen 2) | All backend logic via callable functions (`onCall`), Firestore triggers (`onDocumentCreated`), and scheduled tasks (`onSchedule`) |
| Firestore | Primary database (`srvefirestore`) — users, bookings, reviews, messages, notifications, reputations |
| Firebase Hosting | Frontend and admin app deployment |
| Cloud Messaging (FCM) | Push notifications via OneSignal |
| Cloud Storage | Media uploads (bucket `srve-7133d`) |
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
| PH Locations | `phLocationsAction` | v2 onCall |
| Reputation | `reputationAction` | v2 onCall |
| Review | `reviewAction` | v2 onCall |
| Review Analysis | `analyzeNewReview`, `reviewAnalysisAction` | v2 onDocumentCreated/onCall |
| Service | `serviceAction`, `processScheduledDeletions` | v2 onCall/onSchedule |
| Contact | `sendContactEmail` | **v1** onCall |

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
