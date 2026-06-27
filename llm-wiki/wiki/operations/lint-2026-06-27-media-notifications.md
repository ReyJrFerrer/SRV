---
tags: [operations, lint, media, notifications]
date: 2026-06-27
related:
  - [[Media and Images]]
  - [[Chat System]]
  - [[Chat Media Implementation]]
  - [[FCM Push Notifications]]
  - [[Firebase Architecture]]
  - [[Services Layer]]
  - [[State and Hooks]]
sources:
  - functions/src/media.js
  - functions/src/notification.js
  - functions/src/chat.js
  - src/frontend/src/services/mediaService.ts
  - src/frontend/src/services/oneSignalService.ts
  - src/frontend/src/services/notificationCanisterService.ts
  - src/frontend/src/services/notificationIntegrationService.ts
  - src/frontend/src/services/pwaService.ts
  - src/frontend/src/hooks/useNotificationsWithPush.ts
  - src/frontend/src/hooks/useProviderNotificationsWithPush.ts
  - src/frontend/src/hooks/useMediaLoader.tsx
  - src/frontend/src/hooks/useChatNotifications.tsx
  - src/frontend/src/hooks/usePWA.ts
---

# Wiki Lint 2026-06-27 — Media & Notifications

Health check of all media and notification wiki pages against actual source code as of 2026-06-27.

## Contradictions

### 1. `ProjectBriefAttachment` does not exist in `media.js`

**Page**: `frontend/media-and-images.md` "Existing Registration" table (line 122) — `ProjectBriefAttachment` registered with `project-briefs/` folder, 50MB cap, `initProjectBriefUpload` init action.

**Reality**: `ProjectBriefAttachment` is not registered anywhere in `media.js`:
- `generateFilePath()` (line 94-102) — no `ProjectBriefAttachment` entry
- `uploadMediaInternal()` `validMediaTypes` (line 818-825) — not in the whitelist
- `mediaAction` switch (line 1142-1168) — no `initProjectBriefUpload` case
- `typeBreakdown` in `getStorageStatsHandler` (line 582-587) — not included
- No `initProjectBriefUpload` handler function exists anywhere in the codebase

This is a planned/aspirational type documented in `OnlineService.md` spec but never implemented. The table heading "Existing Registration" is misleading.

### 2. `firebase-hybrid-architecture.md` function count is wrong

**Page**: `architecture/firebase-hybrid-architecture.md` line 19 — "18 deployed Cloud Functions (17 v2, 1 v1)"

**Reality**: The exported functions table lists 20 functions:
- accountAction, adminUserAction, autoReactivateSuspendedAccounts (3)
- bookingAction, cancelMissedBookings, sendServiceReminders (3)
- onMessageCreated (1)
- feedbackAction (1)
- mediaAction (1)
- notificationAction, cleanupExpiredNotifications, cleanupNotificationFrequency (3)
- phLocationsAction (1)
- reputationAction (1)
- reviewAction (1)
- analyzeNewReview, reviewAnalysisAction (2)
- serviceAction, processScheduledDeletions (2)
- sendContactEmail v1 (1)

Total: 20 (19 v2 onCall/onDocumentCreated/onSchedule + 1 v1 onCall).

### 3. "Server-side thumbnails" claim is false

**Page**: `frontend/media-and-images.md` line 12 — "server-side thumbnails (for service images)"

**Reality**: No thumbnail generation exists in `media.js`. The `uploadMediaHandler` (line 231) sets `thumbnailUrl: null`. The remaining gaps section (line 134) correctly states "No thumbnail generation — thumbnailUrl is always null." The intro paragraph contradicts the gaps section.

### 4. `chat-media-implementation.md` completion table still stale

**Page**: `decisions/chat-media-implementation.md` lines 23-33 — phases 1b–6 shown as ❌ Not implemented.

**Reality**: All phases 1b–6 are implemented (flagged in prior lint `lint-2026-06-27.md` item #1, but page was never updated):

| Phase | Claimed | Actual |
|-------|---------|--------|
| 1b `uploadChatAttachment` | ❌ | ✅ `initChatAttachment` (line 1165, renamed) |
| 1c `deleteChatAttachment` | ❌ | ✅ `deleteChatAttachmentHandler` (line 1092) |
| 2 `onMessageCreated` attachment notifications | ❌ | ✅ Attachment-aware (chat.js:83-84,114-123) |
| 3 `sendMediaMessage()` in chatCanisterService | ❌ | ✅ Line 375 |
| 4 `uploadChatAttachments()` in mediaService | ❌ | ✅ Implemented (direct Storage upload) |
| 5 `sendMediaMessage()` in useChat.tsx | ❌ | ✅ Line 511, group-by-type sending |
| 6 ChatAttachmentPicker + ChatAttachmentPreview | ❌ | ✅ Both components exist |

## Missing Documentation / Features Not in Any Wiki Page

### 5. No Notification System wiki page

`functions/src/notification.js` exports 11 actions via `notificationAction` and 2 scheduled functions, with complex spam prevention, email integration, and OneSignal delivery. None of this has a dedicated wiki page.

### 6. `notifications` collection schema undocumented

The `notifications` Firestore collection is used by `notification.js`, `chat.js` (onMessageCreated), and the frontend `notificationCanisterService.ts`. No wiki page documents its schema.

### 7. Notification actions (11 total)

All routed through `notificationAction`:

| Action | Auth | Description |
|---|---|---|
| `createNotification` | Authenticated | Creates notification doc with spam check, sends OneSignal push, optionally sends email. Validates `notificationType` against `NOTIFICATION_TYPES` enum. |
| `getUserNotifications` | Auth'd/Admin | Queries notifications with filters (`userType`, `notificationType`, `status`, `limit`). |
| `markNotificationAsRead` | Owner/Admin | Transactional status update to "read" or "push_sent_and_read". |
| `markNotificationAsPushSent` | Owner/Admin | Transactional status update to "push_sent" or "push_sent_and_read". |
| `getNotificationsForPush` | Auth'd/Admin | Returns unread notifications (limit 50) for push delivery. |
| `storeOneSignalPlayerId` | Authenticated | Validates UUID format, stores in `users/{uid}.oneSignalPlayerIds[]`. |
| `removeOneSignalPlayerId` | Authenticated | Removes specific or all player IDs. |
| `getNotificationStats` | Auth'd/Admin | Counts by status: total, unread, pushSent, read. |
| `markAllNotificationsAsRead` | Authenticated | Batch marks all unread/push_sent as read for the user. |
| `canReceiveNotification` | Authenticated | Checks spam prevention before creating notification. |
| `deleteNotification` | Owner/Admin | Hard-deletes from `notifications` collection. |

### 8. Scheduled notification functions undocumented

```
cleanupExpiredNotifications — onSchedule("0 0 * * *") — daily, deletes notifications past expiresAt
cleanupNotificationFrequency — onSchedule("0 */6 * * *") — every 6h, prunes stale spam-tracking entries
```

### 9. Spam prevention system undocumented

`notificationFrequency` collection: `{ userId, notificationType, timestamps[], lastUpdated }`. Enforced by `isSpamming()` — rejects if ≥10 notifications in 5 minutes for the same type. Tracked by `updateNotificationFrequency()`.

### 10. Chat email cooldown undocumented

`chatEmailCooldowns` collection: `{ receiverId, conversationId, lastEmailSentAt }`. Enforces 1-hour cooldown per conversation pair before sending another email notification.

### 11. `media` collection schema undocumented

The `media` collection stores metadata for all uploaded files: `{ id, ownerId, fileName, fileSize, contentType, mediaType, filePath, url, thumbnailUrl, validationStatus?, createdAt, updatedAt }`. Plus a user index at `users/{ownerId}/media/{mediaId}`.

### 12. Media backend actions undocumented

6 actions in `mediaAction` with no wiki coverage:

| Action | Auth | Description |
|---|---|---|
| `getMediaByOwner` | Owner/Admin | Lists all media for a user |
| `getMediaByTypeAndOwner` | Owner/Admin | Lists media filtered by type and owner |
| `getFileData` | — | Returns public URL for a media item |
| `updateMediaMetadata` | Owner | Updates fileName on a media item |
| `validateMediaItems` | Authenticated | Batch-validates media IDs (type, size, existence) |
| `getCertificatesByValidationStatus` | Admin | Lists certificates by status (Pending/Validated/Rejected) |
| `updateCertificateValidationStatus` | Admin | Sets validation status on a ServiceCertificate |

### 13. Frontend PWA and push subscription undocumented

- `pwaService.ts` (455 lines) — PWA lifecycle management: push subscription, permission handling, install prompt, offline detection
- `usePWA.ts` (437 lines) — Hook wrapping PWA state: support detection, subscription state, permission
- `useChatNotifications.tsx` (226 lines) — Unread conversation tracking, notification sound on new messages

### 14. Notification component ecosystem undocumented

- `NotificationMenu` — Context menu for delete/mark-read
- `NotificationIcon` / `NotificationIconClient` — Type-to-icon mapping
- `InAppNotificationPopup` — Animated popup with navigation on click
- `InAppNotificationBridge` — Firestore listener → popup bridge
- `NotificationItemClient` / `NotificationItem` — List items with icons, timestamps, actions
- `OneSignalEnableModal` — Push permission onboarding modal
- `PWAInstall` / `PWAInstallDetailed` — Install prompt components

### 15. Emulator-aware URL generation undocumented

`media.js:208-218` generates different public URLs depending on `FUNCTIONS_EMULATOR` / `FIREBASE_STORAGE_EMULATOR_HOST` env vars. Wiki doesn't mention emulator support.

## Stale Claims

### 16. `chat-media-implementation.md` — entire page (repeat from #4)

The completion table is completely stale. Page needs rewrite as historical record with remaining gaps (mobile, storage rules, thumbnails, progress, cleanup).

### 17. `media-and-images.md` — "server-side thumbnails" (repeat from #3)

Intro paragraph claims server-side thumbnails for service images. No such feature exists.

### 18. `firebase-hybrid-architecture.md` — function count (repeat from #2)

Still says 18 functions instead of 20.

### 19. `media-and-images.md` — "Existing Registration" table

The `ProjectBriefAttachment` row implies it's registered. It's not — it's an aspirational type from the `OnlineService.md` spec.

## Gaps (Concepts Without Dedicated Pages)

- **Notification System** — 11 backend actions, 2 scheduled functions, 2 auxiliary collections, frontend service + hooks + components. Major gap.
- **Media Backend (functions/src/media.js)** — 13 actions, 4 internal helpers, 8 media types, 6 registration touchpoints. Currently split across `media-and-images.md` (frontend focus) and `firebase-hybrid-architecture.md` (architecture focus).
- **PWA Infrastructure** — Service worker setup, push subscription, install prompt, offline detection. Scattered across `fcm-push-notifications.md`, `pwaService.ts`, `usePWA.ts`.
- **OneSignal Integration Pattern** — Singleton service, initialization flow, player ID lifecycle, multi-device support. Referenced by 4 pages but no dedicated page.

## Summary

| Severity | Count |
|----------|-------|
| Contradictions | 4 |
| Missing documentation | 11 |
| Stale claims | 3 (1 fully stale page, 2 minor) |
| Gaps | 4 |
