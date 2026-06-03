# Chat Media Sending — Implementation Plan

Add media attachments (images, PDFs, text files, videos) to the chat system, following patterns from WhatsApp, Viber, and Messenger.

## Design Principles

1. **Upload-then-reference**: Upload file to Firebase Storage first, get URL, then send message with attachment metadata. This is the pattern used by all major chat apps — the message document only stores a reference, never the binary.
2. **Client-side compression**: Compress images before upload (reuse existing `mediaService.ts` helpers). Videos pass through with size validation only.
3. **Optimistic UI**: Show attachment preview immediately while upload is in progress, with progress indicator.
4. **Graceful degradation**: Text-only messages continue working unchanged. Attachment is optional metadata on the message.
5. **Security**: All uploads go through authenticated `mediaAction` callable. Storage rules restrict access to conversation participants.

## File Size & Type Limits

| Media Category | Max Size                            | Accepted MIME Types                                                                                                                          |
| -------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Images         | 5 MB (client-compressed to ~500 KB) | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`                                                                           |
| Documents      | 10 MB                               | `application/pdf`, `text/plain`, `text/csv`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Videos         | 25 MB                               | `video/mp4`, `video/webm`, `video/quicktime`                                                                                                 |

- Max **5 attachments per message**
- Max **1000 characters** for caption text (raised from 500 when attachment present)

## Firestore Message Document Schema (Updated)

```js
{
  id: string,
  conversationId: string,
  senderId: string,
  receiverId: string,
  participants: [senderId, receiverId],
  messageType: { File: null },          // changed from { Text: null }
  content: {
    encryptedText: "optional caption",  // can be empty string for media-only
    encryptionKey: ""
  },
  attachment: [{                        // array of attachment objects
    fileName: "photo.jpg",
    fileSize: 48230,                    // bytes (post-compression)
    fileType: "image/jpeg",
    fileUrl: "https://firebasestorage...",
    thumbnailUrl: "https://...",        // generated for images/videos, null for docs
    mediaId: "uuid-from-media-system"  // for deletion tracking
  }],
  status: { Sent: null },
  createdAt: ISO_STRING,
  readAt: []
}
```

## Phase 1: Backend — Media Type & Upload (`functions/src/media.js`)

### 1.1 Add `ChatAttachment` media type

```js
// In SUPPORTED_CONTENT_TYPES, add document types:
"text/plain",
"text/csv",
"application/msword",
"application/vnd.openxmlformats-officedocument.wordprocessingml.document",

// In generateFilePath, add:
ChatAttachment: "chat-attachments",

// In validateFileSize, add ChatAttachment branch:
if (mediaType === "ChatAttachment") {
  if (contentType.startsWith("video/")) return fileSize > 0 && fileSize <= 25 * 1024 * 1024;
  if (contentType === "application/pdf" || contentType.startsWith("text/") ||
      contentType.includes("word") || contentType.includes("document")) {
    return fileSize > 0 && fileSize <= 10 * 1024 * 1024;
  }
  return fileSize > 0 && fileSize <= 5 * 1024 * 1024; // images
}

// In uploadMediaInternal validMediaTypes array, add "ChatAttachment"
```

### 1.2 Add `uploadChatAttachment` action

New action in the `mediaAction` switch:

```js
case "uploadChatAttachment":
  return await uploadChatAttachmentHandler(request);
```

Handler logic:

- Authenticate user
- Validate file (type + size using ChatAttachment rules)
- Upload to `chat-attachments/{conversationId}/{mediaId}_{fileName}` path
- Return `{ url, thumbnailUrl, mediaId, fileName, fileSize, fileType }`
- Thumbnail: for images, generate a small (200px) thumbnail and upload alongside; for videos, skip thumbnail (can add later)

### 1.3 Add `deleteChatAttachment` action

For when a user deletes a message with attachments or cancels an upload:

- Verify the caller is the attachment owner or conversation participant
- Delete from Storage + Firestore media index

## Phase 2: Backend — Notification Updates (`functions/src/chat.js`)

### 2.1 Update `onMessageCreated` trigger

```js
// Current: only processes if content.encryptedText exists
// Updated: also process if attachment array is non-empty

const hasText = content && content.encryptedText;
const hasAttachment = message.attachment && message.attachment.length > 0;
if (!hasText && !hasAttachment) return;

// Generate smart preview:
let messagePreview;
if (hasText) {
  messagePreview =
    content.encryptedText.trim().substring(0, 50) +
    (content.encryptedText.length > 50 ? "..." : "");
} else {
  const att = message.attachment[0];
  if (att.fileType.startsWith("image/")) messagePreview = "📷 Photo";
  else if (att.fileType.startsWith("video/")) messagePreview = "🎥 Video";
  else if (att.fileType === "application/pdf") messagePreview = "📄 PDF";
  else messagePreview = `📎 ${att.fileName}`;
}
```

## Phase 3: Frontend Service — Send with Attachment (`chatCanisterService.ts`)

### 3.1 Add `sendMediaMessage()` method

```ts
async sendMediaMessage(
  conversationId: string,
  receiverId: string,
  senderId: string,
  attachments: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
    thumbnailUrl?: string;
    mediaId: string;
  }>,
  caption: string = "",
): Promise<FrontendMessage | null>
```

- Validates caption length (1000 chars max)
- Creates message document with `messageType: { File: null }`, populated `attachment` array
- Updates conversation `lastMessageAt`, `unreadCount`, `lastMessagePreview` (with attachment-aware preview text)
- Same transaction pattern as existing `sendMessage()`

### 3.2 Update `adaptBackendMessage()`

Already handles `attachment[0]` — extend to handle multiple attachments:

```ts
attachment: backendMessage.attachment?.map((att: any) => ({
  fileName: att.fileName,
  fileSize: Number(att.fileSize),
  fileType: att.fileType,
  fileUrl: att.fileUrl,
  thumbnailUrl: att.thumbnailUrl || null,
  mediaId: att.mediaId || null,
})) || undefined,
```

### 3.3 Update `FrontendMessage` interface

```ts
attachment?: Array<{
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  mediaId?: string | null;
}>;
```

## Phase 4: Frontend Media Service — Chat Upload Helper (`mediaService.ts`)

### 4.1 Add `uploadChatAttachments()` function

```ts
export const uploadChatAttachments = async (
  conversationId: string,
  files: File[],
  onProgress?: (index: number, progress: number) => void,
): Promise<Array<{ fileName, fileSize, fileType, fileUrl, thumbnailUrl?, mediaId }>>
```

Logic:

- Validate each file against chat-specific type/size limits
- For images: compress using existing `intelligentScaleImageTo450KB()` (target 500KB)
- For videos: validate size only, no compression
- For documents: validate size only
- Upload each via `httpsCallable(functions, "mediaAction")` with `action: "uploadChatAttachment"`
- Return array of attachment metadata ready for `sendMediaMessage()`

## Phase 5: Frontend Hook — Media Sending (`useChat.tsx`)

### 5.1 Add `sendMediaMessage()` to hook

```ts
const sendMediaMessage = useCallback(
  async (files: File[], caption: string, receiverId: string) => {
    // 1. Create optimistic message with attachment placeholder
    // 2. Upload files via mediaService.uploadChatAttachments()
    // 3. Send message via chatCanisterService.sendMediaMessage()
    // 4. Update optimistic message status
  },
  [isAuthenticated, firebaseUser, currentConversation],
);
```

### 5.2 Update `OptimisticMessage` interface

Add optional `attachments` field for rendering previews during upload.

## Phase 6: Frontend UI — File Picker & Attachment Rendering

### 6.1 New component: `ChatAttachmentPicker`

- Paperclip/camera icon button next to text input
- Opens file picker (accept images, PDFs, text files, videos)
- Shows selected files as removable chips with thumbnails
- Enforces max 5 files
- Shows file size and type validation errors inline

### 6.2 New component: `ChatAttachmentPreview`

Renders attachment(s) in message bubbles:

- **Images**: Thumbnail with tap-to-expand lightbox. Show blurhash/placeholder while loading.
- **Videos**: Thumbnail with play button overlay. Tap opens native video player.
- **PDFs**: File icon + filename + size. Tap opens in new tab / download.
- **Text files**: File icon + filename + size. Tap downloads.
- **Multiple attachments**: Grid layout (2 columns for 2-4 images, scrollable row for 5+)

### 6.3 Update message bubble rendering

In `pages/client/chat.tsx`, `pages/provider/chat.tsx`:

```tsx
{
  m.messageType === "File" && m.attachment?.length ? (
    <ChatAttachmentPreview
      attachments={m.attachment}
      caption={m.content?.encryptedText}
    />
  ) : (
    <span>{m.content?.encryptedText}</span>
  );
}
```

### 6.4 Update conversation list preview

In conversation list items, show attachment-aware preview:

```tsx
const previewText =
  last?.messageType === "File"
    ? last.attachment?.[0]?.fileType?.startsWith("image/")
      ? "📷 Photo"
      : last.attachment?.[0]?.fileType?.startsWith("video/")
        ? "🎥 Video"
        : `📎 ${last.attachment?.[0]?.fileName || "File"}`
    : last?.content?.encryptedText || "No messages";
```

### 6.5 Update `lastMessagePreview` in conversation document

When sending a media message, set `lastMessagePreview.messageType` to `"File"` and `lastMessagePreview.content` to the attachment-aware preview string.

## Phase 7: Mobile App (`SRV-Mobile/srv-mobile/`)

### 7.1 Chat screens

- `app/client/chat.tsx` and `app/provider/chat.tsx` need same attachment picker and rendering
- Use `expo-document-picker` for file selection and `expo-image-picker` for camera/gallery
- Use `expo-file-system` for reading file data as base64
- Reuse the same `chatCanisterService` and `mediaService` patterns (adapted for React Native)

### 7.2 Mobile-specific considerations

- Image compression: use `expo-image-manipulator` instead of canvas-based resize
- Video: no client-side compression (pass through with size validation)
- File preview: use `expo-sharing` or `Linking.openURL()` for opening documents
- Thumbnail caching: use `expo-image` for efficient image caching

## Phase 8: Firebase Storage Security Rules

Add rules for `chat-attachments/` path:

```
match /chat-attachments/{conversationId}/{file} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.resource.size <= 25 * 1024 * 1024
    && request.resource.contentType in [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
}
```

## Implementation Order

1. **Backend media.js** — Add `ChatAttachment` type, `uploadChatAttachment` and `deleteChatAttachment` actions
2. **Backend chat.js** — Update `onMessageCreated` for attachment-aware notifications
3. **Frontend chatCanisterService.ts** — Add `sendMediaMessage()`, update interfaces and adapter
4. **Frontend mediaService.ts** — Add `uploadChatAttachments()` with compression
5. **Frontend useChat.tsx** — Add `sendMediaMessage()` to hook
6. **Frontend UI components** — Build `ChatAttachmentPicker` and `ChatAttachmentPreview`
7. **Frontend chat pages** — Integrate picker and preview into all three chat views
8. **Mobile app** — Port attachment picking and rendering to React Native
9. **Storage rules** — Deploy updated Firebase Storage security rules

## Testing Checklist

- [ ] Send image attachment — displays thumbnail in bubble, tap to expand
- [ ] Send PDF attachment — shows file icon + name, tap to open/download
- [ ] Send video attachment — shows play overlay, tap to play
- [ ] Send text file attachment — shows file icon, tap to download
- [ ] Send multiple attachments (up to 5) — grid layout
- [ ] Send media-only message (no caption text)
- [ ] Send media with caption text
- [ ] Notification preview shows attachment type icon
- [ ] Conversation list shows attachment-aware preview
- [ ] File size validation rejects oversized files
- [ ] File type validation rejects unsupported types
- [ ] Optimistic UI shows upload progress
- [ ] Failed upload shows retry option
- [ ] Delete message with attachment cleans up Storage
- [ ] Mobile: pick from camera, gallery, and file manager
- [ ] Mobile: image compression works on-device
