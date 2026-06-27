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

## Status: Partially Implemented

The backend media system (`functions/src/media.js`) already supports `ChatAttachment` with a 1GB size limit. However `chat.js` is still text-only — the trigger (`onMessageCreated`) ignores attachments.

## Completion Status

| Phase | Component | Status |
|---|---|---|
| 1a | `ChatAttachment` media type in media.js | ✅ Done (1GB limit at line 77) |
| 1b | `uploadChatAttachment` action | ❌ Not implemented |
| 1c | `deleteChatAttachment` action | ❌ Not implemented |
| 2 | Update `onMessageCreated` for attachment notifications | ❌ Not started |
| 3 | `sendMediaMessage()` in chatCanisterService.ts | ❌ Not started |
| 4 | `uploadChatAttachments()` in mediaService.ts | ❌ Not started |
| 5 | `sendMediaMessage()` in useChat.tsx | ❌ Not started |
| 6 | ChatAttachmentPicker + ChatAttachmentPreview UI | ❌ Not started |
| 7 | Mobile port to React Native | ❌ Not started |
| 8 | Firebase Storage security rules | ❌ Not started |

## Design Principles

1. **Upload-then-reference**: Upload to Firebase Storage first, get URL, then send message with metadata
2. **Client-side compression**: Images compressed before upload (reuse `mediaService.ts` helpers)
3. **Optimistic UI**: Show attachment preview immediately with progress indicator
4. **Graceful degradation**: Text-only messages remain unchanged

## File Limits

| Category | Max Size | Types |
|---|---|---|
| Images | 5 MB (→~500 KB compressed) | jpeg, png, gif, webp, heic |
| Documents | 10 MB | pdf, text, csv, doc/docx |
| Videos | 25 MB | mp4, webm, quicktime |

Max 5 attachments per message, 1000 chars for caption when attachment present.
