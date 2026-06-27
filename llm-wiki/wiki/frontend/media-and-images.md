---
tags: [frontend, media, images, caching]
date: 2026-06-16
related:
  - [[Services Layer]]
  - [[Chat System]]
  - [[Chat Media Implementation]]
---

# Media and Images

Media is stored in **Firebase Cloud Storage** (`srve-7133d` bucket). The upload/download pipeline goes through `mediaService.ts` with client-side resizing and a multi-layer caching system. **No server-side thumbnail generation exists** — `thumbnailUrl` is always `null`.

## Media Types

System-defined types in `functions/src/media.js`:

| Type | Purpose | Max Size | Status |
|------|---------|----------|--------|
| `UserProfile` | Profile pictures | 1MB | implemented |
| `ServiceImage` | Service listing images | 1MB | implemented |
| `ServiceCertificate` | Provider certification documents | 1MB | implemented |
| `RemittancePaymentProof` | Payment receipts | 1MB | implemented |
| `ReportAttachment` | Report evidence | 1MB | implemented |
| `ProblemProof` | Issue documentation (video) | 30MB | implemented |
| `ChatAttachment` | Images, videos, documents | 1GB | implemented |
| `ProjectBriefAttachment` | Project brief documents | 50MB | **implemented in Phase 1** (see §ProjectBriefAttachment) |

`ChatAttachment` supports images, videos, and documents (PDF, DOC, DOCX, TXT, CSV). Directory: `chat-attachments/`. Actions: `initChatAttachment` (validate + return path), `deleteChatAttachment` (participant-verified delete).

`ProjectBriefAttachment` is the new media type for the OnlineProject brief form. Directory: `project-briefs/`. Action: `initProjectBriefUpload` (validate + return path). Documents and images up to 50MB.

## Storage Path Pattern

```
/media/{userId}/{uuid}.{ext}                             — general media
/chat-attachments/{conversationId}/{mediaId}_{sanitizedName} — chat files
/project-briefs/{ownerId}/{mediaId}_{sanitizedFileName}  — project brief files (Phase 1)
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

`mediaAction` callable Cloud Function routes by action: `upload`, `get`, `delete`, `list`, `getUploadUrl`, `initChatAttachment`, `deleteChatAttachment`, `initProjectBriefUpload`. Internal helpers (`uploadMediaInternal`, `deleteMediaInternal`) exported for cross-module use from `functions/src/media.js`.

## ProjectBriefAttachment (Phase 1)

The new `ProjectBriefAttachment` media type is for files attached to an online project brief. It follows the same 2-step upload pattern as `ChatAttachment`.

### Specifications

| Attribute | Value |
|---|---|
| Folder | `project-briefs/` |
| Cap | 50MB per file |
| Path | `project-briefs/{ownerId}/{mediaId}_{sanitizedFileName}` |
| Init action | `initProjectBriefUpload` (new action in `mediaAction` switch) |
| Content types | All `SUPPORTED_CONTENT_TYPES` (images, PDFs, DOC, DOCX, TXT, CSV) |
| Status | **Implemented in Phase 1** of the Online Services rollout |

### The 6 Scattered Touchpoints (now complete for Phase 1)

| # | Location | Line ~ | Status |
|---|----------|--------|--------|
| 1 | `mediaTypeFolder` in `generateFilePath()` | 94 | ✓ added in Phase 1 |
| 2 | `validMediaTypes` array in `uploadMediaInternal()` | 818 | ✓ added in Phase 1 |
| 3 | `validateFileSize()` function | 73 | ✓ added in Phase 1 (50MB cap) |
| 4 | `maxSizeText` in `uploadMediaHandler()` | 176 | ✓ added in Phase 1 |
| 5 | `typeBreakdown` in `getStorageStatsHandler()` | 582 | ✓ added in Phase 1 |
| 6 | `SUPPORTED_CONTENT_TYPES` array | 35 | unchanged (already comprehensive) |
| **7** | **`initProjectBriefUpload` handler in `mediaAction` switch** | — | ✓ added in Phase 1 |

### Two-Step Upload Flow

1. **`initProjectBriefUpload`** callable action → validates `{fileName, contentType, fileSize, projectId}`, returns `{filePath, mediaId, fileName, fileType, thumbnailUrl: null}`
2. **`uploadBytesResumable`** directly to Firebase Storage at pre-approved path (no base64, no Cloud Function body limit)
3. **`getDownloadURL`** for public URL
4. Returns `{ fileName, fileSize, fileType, fileUrl, thumbnailUrl, mediaId }`
5. Client includes the `mediaId` in `createOnlineProject` to attach the file to the brief

### Storage Rules

`project-briefs/{ownerId}/{file}` in `storage.rules` (mirrors `chat-attachments/`):

```firestore
match /project-briefs/{ownerId}/{file} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == ownerId;
}
```

## Media Type Registration (6 Scattered Touchpoints)

There is **no central config** for media types. Registering a new type requires entries in **6 separate locations** scattered across `functions/src/media.js`. Missing any one causes silent failures or incorrect behavior.

| # | Location | Line ~ | What to Add |
|---|----------|--------|-------------|
| 1 | `mediaTypeFolder` in `generateFilePath()` | 94 | Maps media type string → Storage folder prefix (e.g., `ServiceImage → "services"`). Determines the Storage path. |
| 2 | `validMediaTypes` array in `uploadMediaInternal()` | 818 | Whitelist for the base64 upload path. Types missing here are rejected with "Invalid media type". |
| 3 | `validateFileSize()` function | 73 | Type-specific max-size condition. Falls through to generic caps (`MAX_FILE_SIZE` = 1MB, `MAX_REMITTANCE_FILE_SIZE` = 1MB). |
| 4 | `maxSizeText` in `uploadMediaHandler()` error message | 176 | Human-readable size text in validation error messages. Missing entries show wrong cap. |
| 5 | `typeBreakdown` in `getStorageStatsHandler()` | 582 | Stats aggregation key. Types missing here don't appear in admin storage stats. |
| 6 | `SUPPORTED_CONTENT_TYPES` array | 35 | Allowed MIME type whitelist. Only needed if the new type requires content types not already listed. |

### Reference: Existing Registration

| Media Type | Folder | Cap | Init Action |
|------------|--------|-----|-------------|
| `UserProfile` | `users/` | 1MB | — |
| `ServiceImage` | `services/` | 1MB | — |
| `ServiceCertificate` | `certificates/` | 1MB | — |
| `RemittancePaymentProof` | `remittance/` | 1MB | — |
| `ReportAttachment` | `reports/` | 1MB | — |
| `ProblemProof` | `problem-proof/` | 30MB (video) | — |
| `ChatAttachment` | `chat-attachments/` | 1GB | `initChatAttachment` (two-step) |
| `ProjectBriefAttachment` | `project-briefs/` | 50MB | `initProjectBriefUpload` (two-step, implemented Phase 1) |

All 6+1 touchpoints for `ProjectBriefAttachment` are now registered in `media.js` as part of Phase 1. See the §ProjectBriefAttachment section above for the full details.

### Design Debt

- No single `REGISTERED_MEDIA_TYPES = [...]` array drives all config — each location is maintained manually
- `ProblemProof` is missing from `validMediaTypes` yet works because it bypasses `uploadMediaInternal` (goes through `uploadMediaHandler` directly)
- Adding a type means updating 6+ files/functions; easy to miss one during development

## Remaining Media Gaps

1. **No thumbnail generation** — `thumbnailUrl` is always `null` in the chat attachment init response. The plan called for 200px image thumbnails.
2. **No upload progress** — The `onProgress` callback of `uploadBytesResumable` is not exposed in `uploadChatAttachments()`.
3. **No attachment cleanup on message delete** — No trigger cleans up Storage files when a Firestore message is deleted.
4. **Storage security rules** — `chat-attachments/` path rules not verified in `firebase.storage.rules`.
