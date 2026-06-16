---
tags: [frontend, media, images, caching]
date: 2026-06-16
related:
  - [[Services Layer]]
  - [[Chat System]]
  - [[Chat Media Implementation]]
---

# Media and Images

Media is stored in **Firebase Cloud Storage** (`srve-7133d` bucket). The upload/download pipeline goes through `mediaService.ts` with client-side resizing, server-side thumbnails (for service images), and a multi-layer caching system.

## Media Types

System-defined types in `functions/src/media.js`:

| Type | Purpose | Max Size |
|------|---------|----------|
| `UserProfile` | Profile pictures | 1MB |
| `ServiceImage` | Service listing images | 1MB |
| `ServiceCertificate` | Provider certification documents | 1MB |
| `RemittancePaymentProof` | Payment receipts | 1MB |
| `ReportAttachment` | Report evidence | 1MB |
| `ProblemProof` | Issue documentation (video) | 30MB |
| `ChatAttachment` | Images, videos, documents | 1GB |

`ChatAttachment` supports images, videos, and documents (PDF, DOC, DOCX, TXT, CSV). Directory: `chat-attachments/`. Actions: `initChatAttachment` (validate + return path), `deleteChatAttachment` (participant-verified delete).

## Storage Path Pattern

```
/media/{userId}/{uuid}.{ext}                             — general media
/chat-attachments/{conversationId}/{mediaId}_{sanitizedName} — chat files
```

## Upload Pipeline

| Function | Resizing | Max Size | File Types |
|---|---|---|---|
| `uploadProfilePicture` | 400×400 Canvas | 450KB | JPEG, PNG, WebP |
| `uploadServiceImage` | 1024×1024 + server thumb | 450KB | JPEG, PNG, WebP, GIF |
| `uploadChatAttachments` | Image compression >500KB | 1GB | Images (jpeg/png/gif/webp/bmp/svg/heic), video (mp4/webm/quicktime), documents (pdf/doc/docx/txt/csv) |

Client-side resizing via Canvas API for profile and service images. Chat images >500KB compressed via `intelligentScaleImageTo450KB`. Videos and documents pass through without compression.

## Chat Attachment Upload Flow

Two-step process in `mediaService.uploadChatAttachments()` (`mediaService.ts` line 1134), changed from base64 to direct Storage upload in commit `a8fba8fb`:

1. **`initChatAttachment`** callable action → validates `{fileName, contentType, fileSize, conversationId}`, returns `{filePath, mediaId, fileName, fileType, thumbnailUrl}`
2. **`uploadBytesResumable`** directly to Firebase Storage at pre-approved path (no base64, no Cloud Function body limit)
3. **`getDownloadURL`** for public URL
4. Returns `ChatAttachmentResult[]` with `{ fileName, fileSize, fileType, fileUrl, thumbnailUrl, mediaId }`

### Key architectural change

Before `a8fba8fb`: files were converted to base64 → sent through `mediaAction("uploadChatAttachment", {fileData: base64})` → Cloud Function saved to Storage → returned URL. This was limited by Cloud Function request body size (~10MB), effectively capping attachments at ~5MB.

After `a8fba8fb`: Cloud Function only validates and returns a pre-approved path. Client uploads directly via `uploadBytesResumable` — no body size limit, supporting files up to 1GB.

## Retrieval & Caching (3 Layers)

### Layer 1: SessionStorage Cache

`persistentImageCache.ts` (148 lines):
- Stores base64 data URLs in `sessionStorage`
- 1-hour expiry per entry
- LRU cleanup when storage is full
- Validation against corruption

### Layer 2: TanStack Query

`useMediaLoader.tsx` hooks:
- `useImageLoader(fileId)` — generic image loader
- `useProfileImage(userId)` — profile picture
- `useServiceImages(serviceId)` — service gallery
- `useCertificateMedia(serviceId)` — certificate docs
- 5-min stale time, 24h garbage collection
- Fallback placeholder images on error/loading

### Layer 3: Firebase SDK

Direct `getDownloadURL(ref)` for uncached images. The chain is:
`getImageDataUrl()` → `persistentImageCache.set()` → TanStack `useQuery` wraps the call.

## Asset Resolution

`assetResolver.ts` (92 lines) converts backend image paths to frontend URLs:
- Local assets (prefixed `images/`) → `/<path>`
- Full URLs → pass through
- Also contains legacy ICP profile adapter code (vestigial, not in use)

## Backend Media Action

`mediaAction` callable Cloud Function routes by action: `upload`, `get`, `delete`, `list`, `getUploadUrl`, `initChatAttachment`, `deleteChatAttachment`. Internal helpers (`uploadMediaInternal`, `deleteMediaInternal`) exported for cross-module use from `functions/src/media.js`.

## Remaining Media Gaps

1. **No thumbnail generation** — `thumbnailUrl` is always `null` in the chat attachment init response. The plan called for 200px image thumbnails.
2. **No upload progress** — The `onProgress` callback of `uploadBytesResumable` is not exposed in `uploadChatAttachments()`.
3. **No attachment cleanup on message delete** — No trigger cleans up Storage files when a Firestore message is deleted.
4. **Storage security rules** — `chat-attachments/` path rules not verified in `firebase.storage.rules`.
