---
tags: [frontend, chat, realtime]
date: 2026-06-16
sources:
  - raw/specs/CHAT-MEDIA-PLAN.md
related:
  - [[Services Layer]]
  - [[Media and Images]]
  - [[Chat Media Implementation]]
---

# Chat System

Chat lives entirely in **Firestore** (not ICP despite the "canister" naming in `chatCanisterService.ts`). Real-time via `onSnapshot` with 200ms debounce. Conversation summaries and messages are separate collections.

## Architecture

```
Messages stored in: Firestore `messages/{messageId}`
Conversations in: Firestore `conversations/{conversationId}`
Triggers: Cloud Function `onMessageCreated` on `messages/{messageId}`
```

## Data Model

`FrontendMessage` interface has:

- `senderId`, `receiverId`, `conversationId`
- `content.encryptedText` — message body (optional; attachment-only messages have no text)
- `messageType: "Text" | "File"` — discriminator
- `attachment?: { fileName, fileSize, fileType, fileUrl, thumbnailUrl?, mediaId? }[]`
- Timestamps, read status, delivery status

`FrontendConversation.lastMessagePreview` includes `messageType` and `attachment` metadata for file-aware previews in conversation lists.

## Key Services

- **`chatCanisterService.sendMessage()`** (line 304): Text-only — accepts `content: string`, hardcodes `messageType: { Text: null }`, sends empty `attachment: []`.
- **`chatCanisterService.sendMediaMessage()`** (line 375): **Fully implemented** — accepts `attachments: Array<{fileName, fileSize, fileType, fileUrl, thumbnailUrl, mediaId}>` with optional `caption: string`. Validates 1–5 attachments, caption max 1000 chars. Sets `messageType: { File: null }`. Updates conversation with file-aware preview text (Photo / Video / PDF / fileName).
- **`subscribeToConversationSummaries()`**: Real-time listener returning `ConversationSummary[]` with last message preview + unread counts.
- **`subscribeToMessages(conversationId)`**: Real-time message list with 200ms debounce.
- **`markConversationAsRead()`**: Updates Firestore read timestamp.
- **`getOrCreateConversation()`**: Finds existing or creates new conversation doc.
- **`adaptBackendMessage()`** (line 131): Parses multi-attachment array from Firestore — maps all 6 fields per attachment item. Not just `attachment[0]`.

## Hook Layer

**`useChat.tsx`** provides:

- **`sendMessage(content, receiverId)`** (line 431): Text-only — no file parameter.
- **`sendMediaMessage(files, caption, receiverId)`** (line 511): **Fully implemented**. Groups files by type (image/video/document), creates optimistic messages with attachment placeholders, calls `uploadChatAttachments()` (mediaService.ts), then sends via `sendMediaMessage()`. Manages optimistic UI with status transitions (`sending` → `sent` / `failed`).
- Conversation summaries list
- Messages for active conversation
- Auto-scroll to bottom
- Custom events for cross-component badge updates

## UI — File Picker & Attachment Rendering

Both `pages/client/chat.tsx` and `pages/provider/chat.tsx` have full attachment support:

- **`ChatAttachmentTrigger`**: Hidden file input with `accept` for images, video, PDF, documents.
- **Plus button**: Triggers file picker.
- **`ChatAttachmentStrip`**: Displays selected files with thumbnails before sending. Enforces max 5 files, validates file types.
- **Clipboard paste**: `handlePaste` supports pasting images/files.
- **`ChatAttachmentPreview`** (236 lines): Renders images (grid + lightbox), videos (play overlay + lightbox player), documents (icon + name + size + new-tab link). Optional caption below.
- **Attachment-aware conversation previews**: `attachmentPreviewText()` shows "Photo", "Video", "PDF", or "Attachment" in conversation list items.
- Send logic routes text → `sendMessage()`, files → `sendMediaMessage()`.

### `GlobalChatDock.tsx` (floating dock) — **NOT updated for attachments**

Text-only input, no file picker. Conversation previews only show `content.encryptedText`, not attachment-aware.

## Backend Trigger

`onMessageCreated` (Firestore `onDocumentCreated`) in `functions/src/chat.js`:

- Detects attachments (`message.attachment.length > 0`)
- Guard passes for attachment-only messages (no `encryptedText` required if attachment exists)
- Generates attachment-aware notification previews: "sent a Photo" / "sent a Video" / "sent a PDF" / fileName
- Creates in-app notification in `notifications` collection
- Sends OneSignal push (non-blocking) with `senderName`, `senderId`, `conversationId`, `messageId`
- Sends email with 1-hour cooldown per receiver+conversation pair

## Remaining Gaps

1. **GlobalChatDock.tsx** — No attachment support (text-only input, no file picker, no attachment rendering).
2. **No thumbnail generation** — `thumbnailUrl` is always `null` in `initChatAttachmentUploadHandler`. 200px image thumbnails from the plan were never implemented.
3. **No upload progress tracking** — `uploadChatAttachments()` calls `uploadBytesResumable` but passes `null` for the progress callback.
4. **No attachment cleanup on message delete** — Deleted messages' files remain in Firebase Storage indefinitely.
5. **Mobile app (Phase 7)** — Not implemented for React Native chat.
6. **Storage security rules** — `chat-attachments/` path rules in `firebase.storage.rules` not verified.

## Media Backend Integration

- **`ChatAttachment`** media type is registered in `functions/src/media.js` (line 824) with 1GB max file size.
- **`initChatAttachmentUploadHandler()`** (line 1029) validates metadata, returns pre-approved Storage path to `chat-attachments/` folder.
- **`deleteChatAttachmentHandler()`** (line 1092) verifies caller is conversation participant, deletes from Storage.
- `mediaService.uploadChatAttachments()` uses this two-step flow: init → upload → return download URL.

## Notifications Integration

- Unread count badges driven by `useChatNotifications` hook.
- Custom events (`chats-read`, `conversations-updated`, `messages-updated`) bridge chat state to notification badges.
- OneSignal push includes text preview or file-type-aware notification text.
