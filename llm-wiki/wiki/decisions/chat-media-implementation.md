---
tags: [decisions, chat, media]
date: 2026-06-16
sources:
  - functions/src/media.js
  - functions/src/chat.js
related:
  - [[FCM Push Notifications]]
  - [[Functions Lint Report]]
---

# Chat Media Implementation Plan

Add media attachments (images, PDFs, text files, videos) to the chat system following WhatsApp/Viber/Messenger patterns.

## Status: Mostly Implemented

The backend media system (`functions/src/media.js`) supports `ChatAttachment` with a 1GB size limit. All phases 1–6 and storage rules are implemented. One gap remains (mobile port to React Native).

## Completion Status

| Phase | Component | How |
|---|---|---|
| 1a | `ChatAttachment` media type in media.js | ✅ 1GB limit at line 77, registered in `generateFilePath` and `validMediaTypes` |
| 1b | `initChatAttachment` (renamed from `uploadChatAttachment`) | ✅ `initChatAttachmentUploadHandler` at media.js:1029 — validates metadata, returns pre-approved Storage path. No base64 — client uploads directly via `uploadBytesResumable`. |
| 1c | `deleteChatAttachment` action | ✅ `deleteChatAttachmentHandler` at media.js:1092 — verifies conversation participant, deletes from Storage. |
| 2 | `onMessageCreated` attachment notifications | ✅ chat.js:83-84 detects attachments, lines 114-123 generate file-type-aware previews ("sent a Photo" / "Video" / "PDF" / filename) |
| 3 | `sendMediaMessage()` in chatCanisterService.ts | ✅ Line 375 — accepts 1–5 attachments with optional caption, sets `messageType: { File: null }` |
| 4 | `uploadChatAttachments()` in mediaService.ts | ✅ Two-step: (1) `initChatAttachment` callable → (2) direct `uploadBytesResumable` to Storage → (3) `getDownloadURL` |
| 5 | `sendMediaMessage()` in useChat.tsx | ✅ Line 511 — groups files by type, sends each group as separate message, optimistic UI with status transitions |
| 6 | ChatAttachmentPicker + ChatAttachmentPreview | ✅ Both components exist with file-type-aware previews, clipboard paste, thumbnail strip |
| 7 | Mobile port to React Native | ❌ Not implemented |
| 8 | Firebase Storage security rules | ✅ `storage.rules:113-126` — authenticated read/write for `chat-attachments/{conversationId}/`, validates chat content types, 1GB size limit |

## Design Principles (Historical — All Implemented)

1. **Upload-then-reference**: ✅ Upload to Firebase Storage first, get URL, then send message with metadata
2. **Client-side compression**: ✅ Images >500KB compressed via `intelligentScaleImageTo450KB`, videos/documents pass through
3. **Optimistic UI**: ✅ Attachment preview shown immediately with status transitions (sending → sent/failed)
4. **Graceful degradation**: ✅ Text-only messages remain unchanged

## File Limits (Backend-Enforced)

| Category | Max Size | Types |
|---|---|---|
| All types | 1GB (backend `validateFileSize`) | images, videos, documents via SUPPORTED_CONTENT_TYPES |

Max 5 attachments per message, 1000 chars for caption when attachment present. Backend does not differentiate per-file-type limits for ChatAttachment.
