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
- **`chatCanisterService.sendMediaMessage()`** (line 375): **Fully implemented** — accepts `attachments: Array<{fileName, fileSize, fileType, fileUrl, thumbnailUrl, mediaId}>` with optional `caption: string`. Validates 1–5 attachments, caption max 1000 chars. Sets `messageType: { File: null }`. Updates conversation with file-aware preview text distinguishing Photo/Video/PDF/filename.
- **`subscribeToConversationSummaries()`**: Real-time listener returning `ConversationSummary[]` with last message preview + unread counts.
- **`subscribeToMessages(conversationId)`**: Real-time message list with 200ms debounce.
- **`markConversationAsRead()`**: Updates Firestore read timestamp.
- **`createConversation(clientId, providerId)`** (line 255): Implements a get-or-create pattern — queries Firestore `conversations` for an existing active conversation between the two users, returns it if found, otherwise creates a new conversation doc via client-side `setDoc`. Used after booking acceptance and after online project acceptance to ensure a chat channel exists.
- **`adaptBackendMessage()`** (line 131): Parses multi-attachment array from Firestore — maps all 6 fields per attachment item.

## Hook Layer

**`useChat.tsx`** provides:

- **`sendMessage(content, receiverId)`** (line 431): Text-only — no file parameter.
- **`sendMediaMessage(files, caption, receiverId)`** (line 511): **Fully implemented**. Groups files by type (`image`/`video`/`document`), then sends **each group as a separate message** (caption only on the first group). Creates optimistic messages per group, calls `uploadChatAttachments()`, then sends via `sendMediaMessage()`. Manages optimistic UI with status transitions (`sending` → `sent` / `failed`).
- Conversation summaries list, messages for active conversation, auto-scroll, custom events.

## UI — File Picker & Attachment Rendering

Both `pages/client/chat.tsx` and `pages/provider/chat.tsx` have full attachment support for **images, videos, and documents** (PDF, DOC, DOCX, TXT, CSV, etc.):

- **`ChatAttachmentTrigger`**: Hidden file input with accept `image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv`.
- **Plus button**: Triggers file picker. Max 5 files.
- **`ChatAttachmentStrip`**: Shows thumbnails (image preview, video play overlay, document icon) before sending.
- **Clipboard paste**: `handlePaste` supports pasting images, videos, and documents.
- **`ChatAttachmentPreview`**: Renders image grid with tap-to-expand lightbox, video with play overlay + lightbox player, document as rounded-2xl card with white icon circle + name + size. Optional caption below. Timestamps use `mt-0` spacing.
- **Attachment-aware conversation previews**: `attachmentPreviewText()` renders Heroicons (`PhotoIcon`, `VideoCameraIcon`, `DocumentIcon`) with "Photo" / "Video" / "PDF" / filename text.
- Send logic: text → `sendMessage()`; files → `sendMediaMessage()`.

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

## Media Backend Integration

- **`ChatAttachment`** media type is registered in `functions/src/media.js` (line 824) with **1GB max file size** for all types.
- **`initChatAttachmentUploadHandler()`** (line 1029): Validates metadata (fileName, contentType — image/video/document, fileSize, conversationId). Returns pre-approved Storage path to `chat-attachments/` folder. No base64 processing — server only validates, client uploads directly.
- **`deleteChatAttachmentHandler()`** (line 1092): Verifies caller is conversation participant, deletes from Storage.
- **Two-step upload flow**: (1) `initChatAttachment` callable → returns `{filePath, mediaId}`, (2) `uploadBytesResumable` directly to Firebase Storage at pre-approved path, (3) `getDownloadURL` for public URL. No base64 encoding, no Cloud Function body size limit.

## Recent Changes (git log)

| Commit | Change |
|--------|--------|
| `a8fba8fb` **Video Upload Works** | Added video support, replaced base64 upload with direct `uploadBytesResumable`, 1GB limit for all, `initChatAttachment` action replacing `uploadChatAttachment` |
| `c82e2a8e` **Document Upload Works** | Added document support (PDF, DOC, DOCX, TXT, CSV), document icon in picker/preview, Heroicons in preview text |
| `5a9733fb` **Paste support** | Clipboard paste handles video and document types |
| `eb838173` **Group-by-type sending** | `sendMediaMessage` groups files by type, sends each group as separate message, caption on first only |
| `6a240ecf` **Text-first reorder** | Text sent before media attachments for better UX |
| `259e1ea7` **Remove sendingMessage guard** | Ensures image sends first then text as separate message |
| `f019e0db` **No bubble for object messages** | Chat bubble outline hidden for attachment-only messages |
| `d090abe9` **Chat form UI** | Improved chat forms and attachment picker styling |
| `eb838173` **Document icon size** | Document attachment icons at 20px, refined document card styling |

## Remaining Gaps

1. **No thumbnail generation** — `thumbnailUrl` is always `null` in `initChatAttachmentUploadHandler`. 200px image thumbnails from the plan were never implemented.
2. **No upload progress tracking** — `uploadChatAttachments()` calls `uploadBytesResumable` but passes `null` for the progress callback.
3. **No attachment cleanup on message delete** — Deleted messages' files remain in Firebase Storage indefinitely.
4. **Mobile app (Phase 7)** — Not implemented for React Native chat.
5. **Storage security rules** — `chat-attachments/` path rules in `firebase.storage.rules` not verified.

## Notifications Integration

- Unread count badges driven by `useChatNotifications` hook.
- Custom events (`chats-read`, `conversations-updated`, `messages-updated`) bridge chat state to notification badges.
- OneSignal push includes text preview or file-type-aware notification text.
