# Online Service Modes — Specification

## Overview

This document specifies the architecture for adding **Online/Digital Service Modes** to the SRV marketplace, complementing the existing home-services model. Online services are **product/project-based engagements** (design, development, consulting, coaching) with flexible delivery timelines, milestones, and negotiation — as opposed to single-day appointment-based home services.

---

## Service Categories (Online)

### Digital & Creative Services
- Frontend & Backend Web Development
- UI/UX Design
- CMS Management (WordPress, Shopify, Wix)
- IT Support & Troubleshooting
- Video Editing
- Graphic Design (Branding, Logos)
- Copywriting
- Digital Marketing & SEO Strategy

### Professional Business & SME Services
- Business Registration (DTI/SEC/Permits)
- Tax & Financial Consulting
- Legal Contract Drafting
- Bookkeeping & Accounting
- Payroll Management
- Virtual Assistant Services
- Project Management

### Education & Specialized Knowledge
- Academic Tutoring
- Business & Startup Coaching
- Music & Arts Instruction
- Coding & Software Training
- Fitness Coaching

---

## 1. Service Model Extension

### 1.1 `serviceMode` Field

Every `Service` document gets a new field to distinguish the mode of delivery.

```typescript
interface Service {
  // ... existing fields unchanged ...
  serviceMode: "HomeService" | "OnlineService";
  onlineConfig?: OnlineServiceConfig;
}
```

- **Default**: `"HomeService"` — backward compatible. All existing services remain unchanged.
- **Immutable after creation**: The service mode cannot be toggled after the service is created. A provider must create a new service for the other mode.
- **Validation**: On creation, the Cloud Function enforces that required fields for each mode are present.

### 1.2 `OnlineServiceConfig`

```typescript
interface OnlineServiceConfig {
  defaultDeliveryMinDays: number;   // e.g., 3
  defaultDeliveryMaxDays: number;   // e.g., 14
  defaultRevisionRounds: number;    // e.g., 3
  packageSettings: Record<string, OnlinePackageSettings>;
}

interface OnlinePackageSettings {
  deliveryMinDays?: number;         // overrides default per package
  deliveryMaxDays?: number;
  revisionRounds?: number;
  milestones?: MilestoneDefinition[];
}
```

### 1.3 `MilestoneDefinition`

```typescript
interface MilestoneDefinition {
  title: string;           // e.g., "First Draft"
  description: string;
  percentage: number;      // must sum to 100 across milestones
  deadlineDays: number;    // days from project start
}
```

---

## 2. New Entity: `OnlineProject`

### 2.1 Collection

```
Firestore: online_projects/{onlineProjectId}
```

A parallel collection to `bookings/`. Completely separate lifecycle.

### 2.2 Type Definition

```typescript
interface OnlineProject {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  servicePackageId: string;
  status: OnlineProjectStatus;

  // Scheduling
  desiredDeadline: string;           // ISO date — client's requested delivery
  agreedDeadline?: string;           // Set on accept or via negotiation

  // Financial
  originalPrice: number;             // Package price at time of request
  agreedPrice?: number;              // May differ after negotiation
  amountPaid: number;                // Manually tracked (beta — no escrow)
  paymentStatus: "Pending" | "Partial" | "Full";
  paymentNotes?: string;

  // Brief
  brief: string;                     // Project description (50–2000 chars)
  referenceAttachments: string[];    // URLs from ProjectBriefAttachment uploads

  // Deliverable Config (snapshot from service at creation)
  deliverableConfig: {
    mode: "Simple" | "Milestone";
    minDeliveryDays: number;
    maxDeliveryDays: number;
    revisionRounds: number;
    milestones?: MilestoneDefinition[];
  };

  // Deliverable Submissions
  deliverables: DeliverableSubmission[];

  // Communication
  meetingUrl?: string;               // Placeholder — no provider integrated yet

  // Timestamps (ISO 8601 strings — same convention as Booking)
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
}
```

### 2.3 Statuses (State Machine)

```typescript
type OnlineProjectStatus =
  | "Pending"               // Client submitted — provider reviews
  | "Negotiating"           // Provider made a counter-offer
  | "Active"                // Provider accepted — work in progress
  | "InReview"              // Provider submitted deliverable(s)
  | "RevisionsRequested"    // Client requested changes
  | "Completed"             // Client approved final deliverable
  | "Declined"              // Provider rejected request
  | "Cancelled"             // Either party cancels
  | "Disputed";             // Either party disputes
```

### 2.4 Valid Transitions

```
Pending → [Active, Negotiating, Declined]
Negotiating → [Active, Declined, Cancelled]
Active → [InReview, Cancelled]
InReview → [Completed, RevisionsRequested]
RevisionsRequested → [Active (resubmit), Cancelled]
Completed → [Disputed]
Declined → []              (terminal)
Cancelled → []             (terminal)
Disputed → []              (terminal)
```

Enforced server-side in the Cloud Function — any transition not in this map is rejected.

### 2.5 Deliverable Submission

```typescript
interface DeliverableSubmission {
  id: string;
  milestoneIndex?: number;       // Which milestone this fulfills (if milestone mode)
  files: DeliverableFile[];
  notes?: string;
  submittedAt: string;                 // ISO 8601
  status: "Submitted" | "Approved" | "RevisionsRequested";
  clientFeedback?: string;
  revisionCount: number;         // Tracks revision iterations
}

interface DeliverableFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}
```

### 2.6 Negotiation Offers (Subcollection)

Storing negotiation offers as an array on the `OnlineProject` document creates a concurrent-write race condition: if both parties counter-offer simultaneously, `arrayUnion` or direct array updates can silently drop one offer.

Instead, offers live in a **subcollection** under each project. Each offer is its own document, written inside a Firestore **transaction** that atomically validates the current project status and writes the new offer.

```
Firestore: online_projects/{onlineProjectId}/negotiations/{offerId}
```

```typescript
interface NegotiationOffer {
  id: string;
  offeredBy: "client" | "provider";
  proposedPrice?: number;
  proposedDeadline?: string;       // ISO date
  proposedRevisionRounds?: number;
  proposedScope?: string;           // Free-text scope description
  message: string;
  createdAt: string;                // ISO 8601
  status: "Pending" | "Accepted" | "Rejected";
}
```

#### Transaction Requirements

Both `negotiateProject` and `acceptCounterOffer` handlers use a Firestore **transaction**:

1. **Transaction start**: `db.runTransaction()` — reads the project document inside the transaction.
2. **Validate status**: Confirms the project is in `Pending` or `Negotiating` (for negotiate) or `Negotiating` (for accept). If the status changed between the client's read and the transaction, the transaction retries.
3. **Write offer doc**: `setDoc(doc(projectRef, "negotiations", offerId), offerData)` — creates a new offer document in the subcollection.
4. **Update project**: `update(projectRef, { status: newStatus, ... })` — transitions the project state.
5. **Commit**: Firestore auto-retries on contention. If the other party's concurrent negotiation commits first, the retry re-reads the project and the second transaction's status validation fails — the caller receives a "conflict" error.

This ensures that if both parties counter simultaneously, exactly one offer is accepted (the one whose transaction commits first), and the other caller sees a consistent rejection.

#### Negotiation Flow

1. Client submits request → `Pending`
2. Provider can either:
   - **Accept** → moves to `Active` with agreed terms = original
   - **Decline** → terminal
   - **Negotiate** → moves to `Negotiating`, creates offer doc in `negotiations` subcollection (inside transaction)
3. On negotiation, client sees the counter-offer and can:
   - **Accept** → moves to `Active`, sets `agreedPrice`/`agreedDeadline` from offer, updates offer status (inside transaction)
   - **Counter** → creates new offer doc in subcollection, stays in `Negotiating` (inside transaction)
   - **Cancel** → terminal

#### Reading Offers

Offers are fetched from the subcollection ordered by `createdAt` ascending:

```typescript
const offersSnapshot = await getDocs(
  query(
    collection(db, "online_projects", projectId, "negotiations"),
    orderBy("createdAt", "asc"),
  ),
);
```

The frontend hook subscribes to the subcollection via `onSnapshot` for real-time updates on new offers. No caching of the offer array on the parent project document is needed — the subcollection is the single source of truth.

---

## 3. Service Creation Wizard Changes

### 3.1 Mode Toggle

**File**: `src/frontend/src/pages/provider/services/add.tsx`

A **Service Mode** toggle pill at the top of Step 1:

```
[ Home Service ]  [ Online Service ]
```

Selection is **final once submitted** — `serviceMode` is immutable after creation.

### 3.2 Conditional Steps

| Step | HomeService | OnlineService |
|------|-------------|---------------|
| 1 — Details | Title, category, packages | Same |
| 2 — Availability | `ServiceAvailability.tsx` (days + time slots) | **`DeliverableConfigSection.tsx`** (new) |
| 3 — Location | `ServiceLocation.tsx` | **Hidden** |
| 4 — Images | `ServiceImageUpload.tsx` | Same |
| 5 — Review | `ReviewSubmit.tsx` | Same |

### 3.3 `DeliverableConfigSection.tsx` — New Component

**File**: `src/frontend/src/components/provider/add service/DeliverableConfigSection.tsx`

For each package the provider entered in Step 1, they configure:

```
Package: "Logo Design" — ₱5,000
  Mode: [ Simple ] [ Milestone ]

  If Simple:
    Min delivery days: [__3__]
    Max delivery days: [__14__]
    Revision rounds:  [__3__]

  If Milestone:
    [+ Add Milestone]
    ┌──────────────────────────────────────┐
    │ First Draft         50%    Day 3     │
    │ Final Files         50%    Day 7     │
    └──────────────────────────────────────┘
    (Percentages must sum to 100)
    Revision rounds: [__2__]

All packages use the same config: [Yes] [No]
```

**Validation rules**:
- `minDeliveryDays >= 1`, `maxDeliveryDays <= 90`
- `maxDeliveryDays >= minDeliveryDays`
- Milestones: at least 1, percentages sum to 100, deadlineDays are sequential and non-decreasing
- `revisionRounds >= 0` (0 means no revisions — final deliverable is binding)

---

## 4. Cloud Functions

### 4.1 New File

**File**: `functions/src/onlineProject.js`

### 4.2 Callable Entrypoint

```javascript
exports.onlineProjectAction = onCall(async (request) => {
  const { action, data } = request.data;
  switch (action) {
    case "createOnlineProject":     return createOnlineProject_handler(request, data);
    case "acceptProject":           return acceptProject_handler(request, data);
    case "declineProject":          return declineProject_handler(request, data);
    case "negotiateProject":        return negotiateProject_handler(request, data);
    case "acceptCounterOffer":      return acceptCounterOffer_handler(request, data);
    case "submitDeliverable":       return submitDeliverable_handler(request, data);
    case "approveDeliverable":      return approveDeliverable_handler(request, data);
    case "requestRevisions":        return requestRevisions_handler(request, data);
    case "cancelProject":           return cancelProject_handler(request, data);
    case "disputeProject":          return disputeProject_handler(request, data);
    case "recordPayment":           return recordPayment_handler(request, data);
    case "getProject":              return getProject_handler(request, data);
    case "getClientProjects":         return getClientProjects_handler(request, data);
    case "getProviderProjects":       return getProviderProjects_handler(request, data);
    case "getClientProjectAnalytics":   return getClientProjectAnalytics_handler(request, data);
    case "getProviderProjectAnalytics":  return getProviderProjectAnalytics_handler(request, data);
    default:                          throw new HttpsError("invalid-argument", ...);
  }
});
```

### 4.3 Action Details

| Action | Validates | Mutates |
|--------|-----------|---------|
| `createOnlineProject` | Service is OnlineService + Available, provider != client, brief length, package belongs to service | Creates doc in `Pending` |
| `acceptProject` | Status is Pending or Negotiating | Sets `agreedPrice`/`agreedDeadline` from original or last offer, status → `Active`, sets `acceptedAt` |
| `declineProject` | Status is Pending or Negotiating | Status → `Declined` |
| `negotiateProject` | Status is Pending or Negotiating | Creates offer doc in `negotiations` subcollection (inside transaction), status → `Negotiating` |
| `acceptCounterOffer` | Status is Negotiating | Reads latest offer from `negotiations` subcollection (inside transaction), sets `agreedPrice`/`agreedDeadline` from offer, marks that offer as `Accepted` + remaining `Rejected`, status → `Active` |
| `submitDeliverable` | Status is Active, revision count not exceeded | Stores pre-uploaded file URLs in deliverable (files uploaded client-side via two-step init flow, same as `ProjectBriefAttachment`), appends to `deliverables`, status → `InReview` |
| `approveDeliverable` | Status is InReview | If all milestones approved or simple mode → status `Completed`, sets `completedAt`. Else keeps `Active` for remaining milestones. |
| `requestRevisions` | Status is InReview, revisions remaining > 0 | Sets deliverable status → `RevisionsRequested`, decrements remaining revisions, overall status → `RevisionsRequested` |
| `cancelProject` | Status is Active, InReview, RevisionsRequested, Negotiating, Pending | Status → `Cancelled` |
| `disputeProject` | Status is InReview, Completed | Status → `Disputed` |
| `recordPayment` | Provider or admin | Updates `amountPaid` and `paymentStatus` |
| `getClientProjectAnalytics` | Client or admin, optional `startDate`/`endDate` | Returns aggregated metrics for client's projects in date range |
| `getProviderProjectAnalytics` | Admin only, `providerId`, optional `startDate`/`endDate` | Returns aggregated metrics for provider's projects in date range |

### 4.4 State Machine Enforcement

Same pattern as `booking.js`:

```javascript
const VALID_TRANSITIONS = {
  Pending:              ["Active", "Negotiating", "Declined"],
  Negotiating:          ["Active", "Declined", "Cancelled"],
  Active:               ["InReview", "Cancelled"],
  InReview:             ["Completed", "RevisionsRequested"],
  RevisionsRequested:   ["Active", "Cancelled"],
  Completed:            ["Disputed"],
  Declined:             [],
  Cancelled:            [],
  Disputed:             [],
};

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### 4.5 Scheduled Functions (Future)

- `autoCancelExpiredProjects` — Daily cron: cancels `Pending` projects older than 7 days, `Negotiating` older than 14 days (not in initial build).
- `sendProjectReminders` — Reminds providers of approaching deadlines.

### 4.6 Conversation Creation (Client-Side)

Conversation creation follows the existing booking pattern — it happens **client-side** in the React hook, **not** in the Cloud Function. The backend `onlineProjectAction` does not create conversations.

**Mechanism**: `chatCanisterService.createConversation(clientId, providerId)` in `src/frontend/src/services/chatCanisterService.ts:255-299` already implements a get-or-create pattern:
1. Queries Firestore `conversations` for an active conversation between the two users.
2. Returns the existing conversation if found.
3. Creates a new conversation document (client-side `setDoc` to Firestore) if none exists.

This means the function is effectively idempotent — calling it multiple times is safe.

**When to call** — In the client-side hooks, after a successful Cloud Function response:

| Trigger | Hook | Where |
|---------|------|-------|
| `acceptProject` succeeds | `useProviderOnlineProject.tsx` → `useAcceptProject()` | After Cloud Function returns, call `createConversation(project.clientId, project.providerId)` |
| `acceptCounterOffer` succeeds | `useOnlineProject.tsx` → `useAcceptCounterOffer()` | After Cloud Function returns, call `createConversation(project.clientId, project.providerId)` |

**Rationale**: The backend (`functions/src/chat.js`) has no `createConversation` callable. All conversation creation is frontend-driven, writing directly to Firestore. Keeping the backend `onlineProjectAction` focused on state transitions and notifications aligns with the existing architecture.

### 4.7 Analytics Actions

Two new callable actions follow the same pattern as `booking.js`'s `getClientAnalytics` / `getProviderAnalytics`. They query the `online_projects` collection with optional date-range filtering and return aggregated metrics for admin dashboards and user-facing stats.

#### `getClientProjectAnalytics`

```javascript
async function getClientProjectAnalytics_handler(request, data) {
  const { clientId, startDate, endDate } = data;
  // Auth: caller == clientId || isAdmin
  // Default date range: last 30 days
}
```

**Response shape:**

```typescript
{
  success: true,
  data: {
    clientId: string;
    totalProjects: number;        // All projects in range
    completedProjects: number;    // Status === "Completed"
    activeProjects: number;       // Status in Active/InReview/RevisionsRequested
    pendingProjects: number;      // Status in Pending/Negotiating
    totalSpent: number;           // Sum of amountPaid for completed projects
    cancelledProjects: number;    // Status === "Cancelled"
    disputedProjects: number;     // Status === "Disputed"
    memberSince: string;          // ISO date from user profile createdAt
    startDate: string;
    endDate: string;
  }
}
```

**Implementation** (follows `booking.js:1701–1781`):

```javascript
const bookingsQuery = await db.collection("online_projects")
  .where("clientId", "==", targetClientId)
  .where("createdAt", ">=", actualStartDate)
  .where("createdAt", "<=", actualEndDate)
  .get();

const projects = bookingsQuery.docs.map(doc => doc.data());
// Then filter/count/reduce by status fields
```

#### `getProviderProjectAnalytics`

**Admin only** — same gating as `booking.js:1788–1892`. Requires explicit `providerId`.

```javascript
async function getProviderProjectAnalytics_handler(request, data) {
  const { providerId, startDate, endDate } = data;
  // Auth: isAdmin only
}
```

**Response shape:**

```typescript
{
  success: true,
  data: {
    providerId: string;
    totalProjects: number;
    completedJobs: number;        // Status === "Completed"
    cancelledJobs: number;        // Status === "Cancelled" || "Declined"
    activeJobs: number;           // Status in Active/InReview/RevisionsRequested
    completionRate: number;       // (completedJobs / acceptedJobs) * 100, 0 if none
    totalEarnings: number;        // Sum of amountPaid for completed projects
    packageBreakdown: Array<[string, number]>;  // [packageId, count] pairs
    startDate: string | null;
    endDate: string | null;
  }
}
```

**Status mapping for analytics counters:**

| Response Field | Statuses Included |
|----------------|-------------------|
| `completedJobs` | `Completed` |
| `cancelledJobs` | `Cancelled`, `Declined` |
| `activeJobs` | `Active`, `InReview`, `RevisionsRequested` |
| `acceptedJobs` (internal, for rate calc) | `Completed`, `Active`, `InReview`, `RevisionsRequested` (projects that progressed past Pending) |

#### Index Requirement

Both queries use `WHERE providerId/clientId = X AND createdAt >= Y AND createdAt <= Z` — this is already covered by the existing composite indexes (Section 16) since the leading field (clientId/providerId) is the same and `createdAt` DESC ordering is satisfied by the same index in both directions.

---

## 5. Media Types

### 5.1 Registration Checklist in `functions/src/media.js`

`ProjectBriefAttachment` must be registered at every touchpoint where existing media types are enumerated. The `media.js` architecture has no central config — concerns are spread across 6 locations that all need a new entry.

**1. `generateFilePath()` — Storage folder mapping** (line ~94)

```javascript
const mediaTypeFolder = {
  // ... existing entries ...
  ProjectBriefAttachment: "project-briefs",
};
```

Results in path: `project-briefs/{ownerId}/{mediaId}_{sanitizedFileName}`

**2. `validMediaTypes` array in `uploadMediaInternal()`** (line ~818)

```javascript
const validMediaTypes = [
  // ... existing entries ...
  "ProjectBriefAttachment",
];
```

**3. `validateFileSize()` — Type-specific cap** (line ~73)

```javascript
function validateFileSize(fileSize, mediaType, contentType) {
  // Add before the generic fallback:
  if (mediaType === "ProjectBriefAttachment") {
    return fileSize > 0 && fileSize <= MAX_PROJECT_BRIEF_FILE_SIZE; // 50MB
  }
  // ... existing checks ...
}
```

Define the constant at the top of the file:

```javascript
const MAX_PROJECT_BRIEF_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

**4. `uploadMediaHandler()` — Error message text** (line ~176)

Add case in the `maxSizeText` logic:

```javascript
const maxSizeText = mediaType === "ProjectBriefAttachment" ?
  "50MB" :
  // ... existing conditions ...;
```

**5. `getStorageStatsHandler()` — Type breakdown** (line ~582)

```javascript
const typeBreakdown = {
  // ... existing entries ...
  ProjectBriefAttachment: 0,
};
```

**6. Supported content types** — `SUPPORTED_CONTENT_TYPES` (line ~35)

Brief attachments support the same range as chat (images, documents, PDFs). No new MIME types needed if `SUPPORTED_CONTENT_TYPES` already covers these. If any new type is needed (e.g., `.ai`, `.psd`), add it here.

### 5.2 Upload Flow: Two-Step (Same Pattern as ChatAttachment)

`ProjectBriefAttachment` files can be up to 50MB — too large for the base64 Cloud Function upload path (limited to ~10MB body size). The spec calls for the **two-step init flow** that `ChatAttachment` already uses:

**Step 1 — Client calls `initProjectBriefUpload`** (new callable action on `mediaAction`):

```javascript
case "initProjectBriefUpload":
  return await initProjectBriefUploadHandler(request);
```

The handler:
- Validates authentication
- Validates `fileName` (1–255 chars), `contentType` (must be in `SUPPORTED_CONTENT_TYPES`), `fileSize` (1 byte to 50MB)
- Validates `projectId` exists and caller is the project client
- Generates `mediaId` via `generateUuid()`
- Returns `{ success: true, data: { mediaId, filePath, fileName, fileType, thumbnailUrl: null } }`

**Step 2 — Client uploads directly to Firebase Storage** at the returned `filePath` using `uploadBytesResumable`, then calls `getDownloadURL` for the public URL.

**Step 3 — Client includes the URL** in the `createOnlineProject` call as part of `referenceAttachments: string[]`.

This avoids base64 encoding, stays within Cloud Function body limits, and supports resumable uploads for large files.

### 5.3 Deliverable Uploads (Future)

Deliverable files follow the same two-step init pattern as `ProjectBriefAttachment`. A dedicated media type (`ProjectDeliverable`) with appropriate size limits and Storage path will be registered when the deliverable submission flow is built. The `submitDeliverable` action stores pre-uploaded file URLs — it does not call `uploadMediaInternal` (which is the old base64 path).

---

## 6. Frontend — Client Booking Flow

### 6.1 New Routes

```
/client/online-book/:id          → Online project request form
/client/online-projects          → Client project list
/client/online-project/:id       → Client project detail
```

### 6.2 Service Detail CTA

**File**: `src/frontend/src/pages/client/service/[id].tsx`

```typescript
if (service.serviceMode === "OnlineService") {
  // Show "Request Project" button → navigates to /client/online-book/:id
  // Gating: trustScore >= 5 (same as current)
  // No location check
} else {
  // Current "Book Now" → /client/book/:id (unchanged)
}
```

### 6.3 Online Project Request Form (`/client/online-book/:id`)

**File**: `src/frontend/src/pages/client/online-book/[id].tsx`

| Section | Component | Details |
|---------|-----------|---------|
| Package Selection | `PackagesSection.tsx` with `selectionMode="single"` | The existing component uses multi-select checkboxes (for home-service bookings where multiple packages can be bundled). A new `selectionMode` prop switches it to radio-button single-select for online projects. Client picks exactly one package. |
| Project Brief | `ProjectBriefSection.tsx` (new) | Text area (50–2000 chars) + file upload (images, docs, PDFs — 50MB limit) via `ProjectBriefAttachment` |

The `PackagesSection.tsx` refactor adds a `selectionMode` prop:

```typescript
export type PackagesSectionProps = {
  packages: Package[];
  onToggle: (id: string) => void;
  selectionMode: "single" | "multiple";  // new — defaults to "multiple" for backward compat
  highlight?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
};
```

When `selectionMode === "single"`:
- Renders `<input type="radio">` instead of `<input type="checkbox">` — each package card gets a radio circle, not a checkbox square.
- Toggling one package **un-checks all others**: the `onToggle` handler is called with the selected package id, and existing checked packages are cleared. The parent page maps this to a single `selectedPackageId` state instead of a `checked[]` set.
- The heading reads "Select a Package" (singular) instead of "Select Package(s)".
- Validation requires exactly one selected package (not ≥ 1).

The component file stays at `src/frontend/src/components/client/book/PackagesSection.tsx` — no new file. The online booking page imports it with `selectionMode="single"`; the existing booking page is unaffected (defaults to `"multiple"`).
| Timeline | `TimelineSection.tsx` (new) | Displays provider's delivery range from config. Client picks desired date within range. |
| Payment Summary | `PaymentSummarySection.tsx` (new) | Shows package price. "Payment is manually arranged" notice. |
| Review & Submit | `ReviewSubmitSection.tsx` (new) | Read-only summary + Submit button |

### 6.4 Client Project List (`/client/online-projects`)

**File**: `src/frontend/src/pages/client/online-projects.tsx`

Tabs: Active (Active, InReview, RevisionsRequested), Pending (Pending, Negotiating), Completed (Completed), Cancelled/Declined.

Cards show: project title, provider name, status badge, deadline, brief excerpt. Tap navigates to detail.

**Loading**: Render `BookingListSkeleton` (from `components/common/pageFlowImprovements/Skeletons.tsx`) with `count={6}` while tabs query resolves. Switch to `BookingCardSkeleton` count per tab on tab change to avoid flash-of-empty.

**Error**: Show inline yellow banner inside each tab pane (not full page): `<div className="rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">{error}</div>` with a "Retry" button using `clearError()` or refetch. Network errors should not destroy the tab layout.

**Empty**: Use `<EmptyState icon={icon} title="No projects yet" message="..." actionLabel={...} onAction={...} />` (from `components/common/EmptyState.tsx`). Each tab gets a unique empty message: "Active" → "No active projects. When a provider accepts your request, it will appear here."; "Pending" → "No pending requests. Browse services to get started."; "Completed" → "No completed projects yet."; "Cancelled/Declined" → "No cancelled or declined projects."

### 6.5 Client Project Detail (`/client/online-project/:id`)

**File**: `src/frontend/src/pages/client/online-project/[id].tsx`

- **Status banner** with progress tracker
- **Brief** + reference attachments
- **Deliverable timeline**: visual milestone progress bar (if milestone mode) or simple "Day X of Y" indicator
- **Deliverables section**: submitted files with "Approve" / "Request Changes" buttons
- **Negotiation section** (if applicable): counter-offer history, accept/counter inputs
- **Meeting button**: placeholder "Join Meeting" (disabled — no provider)
- **Payment section**: shows amount paid, manual record notice
- **Chat button**: opens existing chat conversation with provider

**Loading**: Render a full-page skeleton matching the detail layout. Use the existing client `BookingDetailsSkeleton` (from `components/client/booking-details/BookingDetailsSkeleton.tsx`) as the reference pattern — status bar placeholder, two-column content blocks, bottom action bar skeleton. Show until `useOnlineProject(projectId)` resolves.

**Error**: Full-page inline error: `<div className="p-10 text-center text-red-500">{String(error)}</div>`. Allow navigation back to project list.

**Empty / Not Found**: If `project === null` after loading completes, show `<EmptyState icon={...} title="Project not found" message="This project may have been removed or the link is invalid." actionLabel="Go to My Projects" actionHref="/client/online-projects" />`.

---

## 7. Frontend — Provider Dashboard

### 7.1 New Routes

```
/provider/online-projects                → Provider project dashboard
/provider/online-project/:id             → Provider project detail
/provider/online-project/submit-deliverable/:id → Deliverable submission
```

### 7.2 Provider Project List (`/provider/online-projects`)

**File**: `src/frontend/src/pages/provider/online-projects.tsx`

Tabs: **Action Needed** (Pending, Negotiating, RevisionsRequested), **Active** (Active, InReview), **Completed**, **All**.

Cards show: client name, project title, package, deadline, budget, status badge, days since request.

**Loading**: Same pattern as client list — `BookingListSkeleton` with `count={6}` on initial load, `BookingCardSkeleton` count per tab on tab switch. Use `useProviderOnlineProjects()` hook's `loading` state.

**Error**: In-tab inline error with retry button. Do not collapse tab bar.

**Empty**: `<EmptyState />` per tab. "Action Needed" → "No projects needing your attention."; "Active" → "No active projects. Accept a request to get started."; "Completed" → "No completed projects."; "All" → "No project requests yet. They'll appear here once clients send a booking request." Include CTA to return to dashboard.

### 7.3 Provider Project Detail (`/provider/online-project/:id`)

**File**: `src/frontend/src/pages/provider/online-project/[id].tsx`

- **Request summary**: brief, reference attachments, desired deadline, requested price
- **Actions** (varies by status):
  - `Pending`: Accept, Negotiate, Decline
  - `Negotiating`: Accept Counter, Counter, Decline
  - `Active`: Submit Deliverable button
  - `InReview`: (waiting for client)
  - `RevisionsRequested`: Resubmit button
  - `Completed`: Receipt summary
- **Deliverable timeline**: milestones with checkmarks
- **Negotiation history**: stream of offers
- **Payment tracking**: manual record field, payment history
- **Chat button**: open conversation with client

**Loading**: Full-page skeleton matching the detail layout. Use the provider `BookingDetailsSkeleton` (from `components/provider/booking-details/BookingDetailsSkeleton.tsx`) as reference — action bar skeleton, content block skeletons.

**Error**: Full-page inline error with retry. `<div className="p-10 text-center text-red-500">{String(error)}</div>` plus a "Retry" button.

**Empty / Not Found**: `<EmptyState icon={...} title="Project not found" message="This project may have been removed or the link is invalid." actionLabel="Go to My Projects" actionHref="/provider/online-projects" />`.

### 7.4 Deliverable Submission (`/provider/online-project/submit-deliverable/:id`)

**File**: `src/frontend/src/pages/provider/online-project/submit-deliverable/[id].tsx`

- File upload (drag-and-drop, multiple files, all types supported)
- Milestone selector (if milestone mode): "This deliverable completes milestone: [dropdown]"
- Optional notes
- Submit button → calls `submitDeliverable` on Cloud Function

### 7.5 Negotiation Modal

Accessible from Pending state. Fields:
- **Proposed deadline**: date picker (constrained by service min/max)
- **Proposed price**: number input (PHP)
- **Revision rounds**: number input
- **Scope notes**: text area (optional)
- **Message**: text area (required)
- "Send Counter Offer" button

---

## 8. Discovery & Listing Changes

### 8.1 Service Mode Badge

All `ServiceListItem` cards show a small badge:
- **No badge** = HomeService (current behavior)
- **"Online" badge** = OnlineService

### 8.2 Search Filter

**File**: `src/frontend/src/pages/client/search-results.tsx`

New filter toggle: **Service Type**
```
[ All ] [ In-Person ] [ Online ]
```

Default: `All`. When "Online" is selected, location-based sorting/filtering is disabled.

### 8.3 Location Handling

Online services skip location display on cards and detail pages entirely. The `location` field on the `Service` document may be set to a default or null (validation allows null when `serviceMode === "OnlineService"`).

---

## 9. Routing (main.tsx)

### 9.1 Client Routes

Add under `/client/*`:

```jsx
<Route path="online-book/:id" element={<BookOnlineProject />} />
<Route path="online-projects" element={<ClientOnlineProjects />} />
<Route path="online-project/:id" element={<ClientOnlineProjectDetail />} />
```

### 9.2 Provider Routes

Add under `/provider/*`:

```jsx
<Route path="online-projects" element={<ProviderOnlineProjects />} />
<Route path="online-project/:id" element={<ProviderOnlineProjectDetail />} />
<Route path="online-project/submit-deliverable/:id" element={<ProviderSubmitDeliverable />} />
```

---

## 10. Hooks & Services

### 10.1 New Files

| File | Exports |
|------|---------|
| `src/frontend/src/services/onlineProjectCanisterService.ts` | `OnlineProject`, `OnlineProjectStatus`, `DeliverableSubmission`, `NegotiationOffer`, `onlineProjectCanisterService` (all API methods) |
| `src/frontend/src/hooks/useOnlineProject.tsx` | `useOnlineProjects()`, `useOnlineProject(id)`, `useCreateOnlineProject()` |
| `src/frontend/src/hooks/useProviderOnlineProject.tsx` | `useProviderOnlineProjects()`, `useProviderOnlineProject(id)`, `useAcceptProject()`, `useDeclineProject()`, `useNegotiateProject()`, `useSubmitDeliverable()` |

### 10.2 Hook Details

**`useOnlineProjects()`**:
- Subscribes to Firestore `online_projects/` where `clientId == currentUser`
- Real-time via `onSnapshot` (same pattern as `useBookingManagement`)
- Enriches with provider profile + service details + package details

**`useProviderOnlineProjects()`**:
- Subscribes to Firestore `online_projects/` where `providerId == currentUser`
- Real-time via `onSnapshot`
- Enriches with client profile + service details

**`useCreateOnlineProject()`**:
- Calls `onlineProjectCanisterService.createOnlineProject(data)` → `httpsCallable("onlineProjectAction")`
- Handles brief attachment uploads first, then submits

---

## 11. File Manifest

### New Files (15)

```
src/frontend/src/services/onlineProjectCanisterService.ts
src/frontend/src/hooks/useOnlineProject.tsx
src/frontend/src/hooks/useProviderOnlineProject.tsx
src/frontend/src/pages/client/online-book/[id].tsx
src/frontend/src/pages/client/online-projects.tsx
src/frontend/src/pages/client/online-project/[id].tsx
src/frontend/src/pages/provider/online-projects.tsx
src/frontend/src/pages/provider/online-project/[id].tsx
src/frontend/src/pages/provider/online-project/submit-deliverable/[id].tsx
src/frontend/src/components/provider/add service/DeliverableConfigSection.tsx
src/frontend/src/components/client/online-book/ProjectBriefSection.tsx
src/frontend/src/components/client/online-book/TimelineSection.tsx
src/frontend/src/components/client/online-book/PaymentSummarySection.tsx
src/frontend/src/components/client/online-book/ReviewSubmitSection.tsx
functions/src/onlineProject.js
```

### Modified Files (5)

```
src/frontend/src/services/serviceCanisterService.ts    — Add serviceMode, onlineConfig, OnlineServiceConfig
src/frontend/src/pages/provider/services/add.tsx       — Mode toggle, conditional steps
src/frontend/src/pages/client/service/[id].tsx         — Conditional CTA
src/frontend/main.tsx                                  — Add 6 routes
functions/src/media.js                                 — Add ProjectBriefAttachment type (50MB)
```

---

## 12. Key Design Decisions

### 12.1 Why a Separate Entity (OnlineProject ≠ Booking)

Home services and online projects have fundamentally different lifecycles:

| Dimension | Booking | OnlineProject |
|-----------|---------|---------------|
| Duration | Single day/time slot | Days to weeks |
| Location | Required | Not applicable |
| State machine | 7 statuses, linear | 9 statuses, looping (revisions) |
| Payment | Escrow (disabled) | Manual tracking only |
| Deliverable | Service completion | File submission + approval |
| Negotiation | None | Structured counter-offers |
| Scheduling | Fixed time slot | Deadline window + negotiation |

Sharing a single entity would create a combinatorial explosion of conditional logic and make both systems harder to maintain.

### 12.2 Why Not Subclass Booking

- **TypeScript complexity**: A discriminated union or `mode`-gated fields on `Booking` would require extensive type narrowing everywhere.
- **Firestore query performance**: Single collection with mixed types creates index bloat and confusing queries.
- **Evolution**: The two systems will evolve independently (e.g., escrow for bookings, milestone payments for projects). Separate collections let each evolve without touching the other.
- **State machine enforcement**: `isValidStatusTransition` in `booking.js` would need to branch on mode — error-prone.

### 12.3 Why Milestones Are Optional ("Both — Provider's Choice")

- Simple projects (logo design, article writing) don't need milestones — just a deadline and revision rounds.
- Complex projects (web development, business registration) benefit from milestone tracking.
- Letting the provider choose per-package keeps the system flexible without forcing complexity on simple use cases.

---

## 13. Future Considerations

### 13.1 Meeting Provider Integration

The `meetingUrl` field is a placeholder. When integrated, recommended approach:
- **Daily.co** prebuilt iframe — simplest embed, no app install required.
- Room URL generated via Cloud Function on project accept.
- Both client and provider detail pages show "Join Meeting" when Active+.

### 13.2 Milestone-Based Payment Release

When escrow is re-enabled, milestones map naturally to partial releases:
```
1. First Draft (50%) → PAID_HELD → released on Approve
2. Final Files (50%) → PAID_HELD → released on Approve
```

### 13.3 Escrow Re-Enablement

The `paymentStatus` and `amountPaid` fields are designed to be forward-compatible:
- `"Pending"` | `"Partial"` | `"Full"` maps cleanly to future escrow states.
- `amountPaid` can become the total released-to-provider sum.
- New fields (`heldAmount`, `releasedAmount`) can be added without migration.

### 13.4 Dispute Resolution

Current model: `Disputed` is terminal. Future: add admin mediation workflow with evidence submission (deliverable versions, chat logs, brief).

---

## 14. Notification Dispatch

### 14.1 New Notification Types

The following constants must be added to `NOTIFICATION_TYPES` in `functions/src/notification.js`:

```javascript
const NOTIFICATION_TYPES = {
  // ... existing types ...

  // Online Project notifications
  NEW_ONLINE_PROJECT_REQUEST:    "new_online_project_request",
  ONLINE_PROJECT_ACCEPTED:       "online_project_accepted",
  ONLINE_PROJECT_DECLINED:       "online_project_declined",
  ONLINE_PROJECT_COUNTER_OFFER:  "online_project_counter_offer",
  ONLINE_PROJECT_CANCELLED:      "online_project_cancelled",
  ONLINE_PROJECT_DISPUTED:       "online_project_disputed",
  ONLINE_PROJECT_COMPLETED:      "online_project_completed",
  DELIVERABLE_SUBMITTED:         "deliverable_submitted",
  MILESTONE_APPROVED:            "milestone_approved",
  REVISIONS_REQUESTED:           "revisions_requested",
};
```

### 14.2 Local `createNotification()` Helper

`onlineProject.js` follows the same pattern as `booking.js` — a local `createNotification()` function that writes directly to Firestore and calls push/email helpers from `notification.js`, avoiding an extra HTTP callable round-trip.

**Signature** (same shape as booking.js):

```javascript
async function createNotification(
  targetUserId,       // string — Firestore UID
  userType,           // "client" | "provider" (from USER_TYPES)
  notificationType,   // string — from NOTIFICATION_TYPES
  title,              // string
  message,            // string
  onlineProjectId,    // string — related entity ID
  metadata = null,    // object | null
)
```

**Internal flow** (identical structure to `booking.js` at `booking.js:167-245`):

1. Validate required params and enum values.
2. Check spam prevention via `isSpamming()`.
3. Generate `href` via `generateNotificationHref()` — will need a new mapping for online project paths.
4. Write doc to Firestore `notifications/{autoId}`.
5. Update `notificationFrequency` counter.
6. Fire-and-forget `sendOneSignalNotification()` (push).
7. If type is in email types set, fire-and-forget `sendEmailForNotification()`.

### 14.3 Notification Dispatch Table

Every lifecycle event in the `onlineProjectAction` callable dispatches a notification. The table below specifies each dispatch call.

Create notifications **after** the state transition has been committed to Firestore, **before** returning the response. Errors in notification dispatch are logged but never thrown — they must not block the primary operation.

| Action | Transition | Target | Notification Type | Title | Message Template | Metadata |
|--------|-----------|--------|-------------------|-------|------------------|----------|
| `createOnlineProject` | → `Pending` | Provider | `NEW_ONLINE_PROJECT_REQUEST` | "New Online Project Request" | `{clientName} requested {projectTitle} — {packageName}` | `{clientId, clientName, serviceId, serviceName, packageId, packageName, projectId}` |
| `acceptProject` | → `Active` | Client | `ONLINE_PROJECT_ACCEPTED` | "Project Accepted" | `{providerName} accepted your project request for {projectTitle}` | `{providerId, providerName, serviceId, serviceName, projectId}` |
| `declineProject` | → `Declined` | Client | `ONLINE_PROJECT_DECLINED` | "Project Declined" | `{providerName} declined your project request for {projectTitle}` | `{providerId, providerName, serviceId, serviceName, projectId}` |
| `negotiateProject` | → `Negotiating` | Client | `ONLINE_PROJECT_COUNTER_OFFER` | "Counter Offer Received" | `{providerName} sent a counter offer for {projectTitle}` | `{providerId, providerName, serviceId, serviceName, projectId, offerId}` |
| `acceptCounterOffer` | → `Active` | Provider | `ONLINE_PROJECT_ACCEPTED` | "Counter Offer Accepted" | `{clientName} accepted your counter offer for {projectTitle}` | `{clientId, clientName, serviceId, serviceName, projectId}` |
| `submitDeliverable` | → `InReview` | Client | `DELIVERABLE_SUBMITTED` | "Deliverable Ready for Review" | `{providerName} submitted a deliverable for {projectTitle}` | `{providerId, providerName, deliverableId, milestoneIndex?, projectId}` |
| `approveDeliverable` (all milestones done or simple mode) | → `Completed` | Provider | `ONLINE_PROJECT_COMPLETED` | "Project Completed" | `{clientName} approved your deliverable — {projectTitle} is complete` | `{clientId, clientName, projectId}` |
| `approveDeliverable` (milestone mode, more milestones remain) | → `Active` | Provider | `MILESTONE_APPROVED` | "Milestone Approved" | `{clientName} approved milestone "{milestoneTitle}" for {projectTitle}` | `{clientId, clientName, milestoneTitle, milestoneIndex, projectId}` |
| `requestRevisions` | → `RevisionsRequested` | Provider | `REVISIONS_REQUESTED` | "Revisions Requested" | `{clientName} requested revisions for {projectTitle} — {revisionNotes}` | `{clientId, clientName, deliverableId, projectId}` |
| `cancelProject` (by client) | → `Cancelled` | Provider | `ONLINE_PROJECT_CANCELLED` | "Project Cancelled" | `{clientName} cancelled the project {projectTitle}` | `{clientId, clientName, projectId}` |
| `cancelProject` (by provider) | → `Cancelled` | Client | `ONLINE_PROJECT_CANCELLED` | "Project Cancelled" | `{providerName} cancelled the project {projectTitle}` | `{providerId, providerName, projectId}` |
| `disputeProject` | → `Disputed` | Both parties | `ONLINE_PROJECT_DISPUTED` | "Project Disputed" | `{projectTitle} has been marked as disputed. An admin will review the case.` | `{projectId, initiatedBy: "client" \| "provider"}` |

### 14.4 Implementation Notes

- **Local copy of `createNotification`**: `onlineProject.js` defines `createNotification` as a local function (same pattern as `booking.js:167-245`), importing constants and helper functions directly from `notification.js`. It does **not** call the `notificationAction` callable — that path is for client-side notification creation only.
- **`generateNotificationHref` mapping**: The `generateNotificationHref()` function in `notification.js` must be extended to generate correct deep-link paths for online project notifications. Each notification type maps to a frontend route:
  - `NEW_ONLINE_PROJECT_REQUEST` → `/provider/online-project/{projectId}`
  - `ONLINE_PROJECT_ACCEPTED` → `/client/online-project/{projectId}`
  - `ONLINE_PROJECT_DECLINED` → `/client/online-projects`
  - `ONLINE_PROJECT_COUNTER_OFFER` → `/client/online-project/{projectId}`
  - `DELIVERABLE_SUBMITTED` → `/client/online-project/{projectId}`
  - `MILESTONE_APPROVED` → `/provider/online-project/{projectId}`
  - `REVISIONS_REQUESTED` → `/provider/online-project/{projectId}`
  - `ONLINE_PROJECT_COMPLETED` → `/client/online-project/{projectId}`
  - `ONLINE_PROJECT_CANCELLED` → `/online-projects` (role-agnostic — client/provider list)
  - `ONLINE_PROJECT_DISPUTED` → `/online-project/{projectId}` (dispute page, future)
- **Email dispatch**: Initially, no online project notification types are added to `BOOKING_EMAIL_TYPES`. Email support can be introduced when volume warrants it. The notification is always delivered via in-app + push.
- **Error tolerance**: All `createNotification()` calls are wrapped in try/catch, logged via `functions.logger.error`, and never propagated. A notification failure must not prevent the primary action from succeeding.

---

## 15. File Manifest (Updated)

### New Files (15)

```
src/frontend/src/services/onlineProjectCanisterService.ts
src/frontend/src/hooks/useOnlineProject.tsx
src/frontend/src/hooks/useProviderOnlineProject.tsx
src/frontend/src/pages/client/online-book/[id].tsx
src/frontend/src/pages/client/online-projects.tsx
src/frontend/src/pages/client/online-project/[id].tsx
src/frontend/src/pages/provider/online-projects.tsx
src/frontend/src/pages/provider/online-project/[id].tsx
src/frontend/src/pages/provider/online-project/submit-deliverable/[id].tsx
src/frontend/src/components/provider/add service/DeliverableConfigSection.tsx
src/frontend/src/components/client/online-book/ProjectBriefSection.tsx
src/frontend/src/components/client/online-book/TimelineSection.tsx
src/frontend/src/components/client/online-book/PaymentSummarySection.tsx
src/frontend/src/components/client/online-book/ReviewSubmitSection.tsx
functions/src/onlineProject.js
```

### Modified Files (9 — unchanged)

```
src/frontend/src/services/serviceCanisterService.ts        — Add serviceMode, onlineConfig, OnlineServiceConfig
src/frontend/src/pages/provider/services/add.tsx           — Mode toggle, conditional steps
src/frontend/src/pages/client/service/[id].tsx             — Conditional CTA
src/frontend/src/components/client/book/PackagesSection.tsx — Add selectionMode prop (single vs. multi)
src/frontend/main.tsx                                      — Add 6 routes
functions/src/media.js                                     — Register ProjectBriefAttachment in generateFilePath, validMediaTypes, validateFileSize, uploadMediaHandler error text, getStorageStatsHandler; add initProjectBriefUpload action + handler
functions/src/notification.js                              — Add 10 online project NOTIFICATION_TYPES + href mappings
firestore.indexes.json                                     — Add 3 composite indexes (clientId/createdAt, providerId/createdAt, status/createdAt)
firestore.rules                                            — Add online_projects + negotiations rules (participant read, backend-only write)
```

---

## 16. Firestore Index Configuration

### 16.1 Required Composite Indexes

The `online_projects` collection needs composite indexes for the list queries used by client and provider dashboards. Without these, Firestore returns an error on first query with an `orderBy` on a field not in the equality filter.

| Collection | Fields | Query Served |
|------------|--------|-------------|
| `online_projects` | `clientId` ASC, `createdAt` DESC | Client project list: `WHERE clientId = X ORDER BY createdAt DESC` |
| `online_projects` | `providerId` ASC, `createdAt` DESC | Provider project list: `WHERE providerId = X ORDER BY createdAt DESC` |
| `online_projects` | `status` ASC, `createdAt` DESC | Status-tabbed views: `WHERE status = X ORDER BY createdAt DESC` (admin / tab filtering) |

### 16.2 Index Definition (Add to `firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "online_projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "online_projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "providerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "online_projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 16.3 Deployment

Deploy via Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

Firestore index creation is asynchronous — indexes may take 1–5 minutes to build after deployment. Queries that depend on a not-yet-ready index will fail. For development, Firestore auto-suggests missing indexes in the error message's error link, which opens the Firebase console to create them on demand.

### 16.4 Single-Field Indexes (Automatic)

Firestore automatically creates ascending and descending indexes for every single field. No explicit config is needed for equality-only queries like:

- `WHERE clientId = X` (no ORDER BY)
- `WHERE providerId = X` (no ORDER BY)
- `WHERE status = X` (no ORDER BY)

---

## 17. Firestore Security Rules

### 17.1 Rule Pattern

The existing `firestore.rules` uses a deny-by-default pattern (`match /{path=**} { allow read, write: if false; }`) with explicit per-collection grants. The `online_projects` collection follows the same participant-gated pattern as `bookings` — but write access is locked to the backend only (Cloud Functions via Admin SDK).

Add before the default deny rule:

```firestore
// Online projects — participants can read; only Cloud Functions can write.
match /online_projects/{projectId} {
  allow read: if request.auth.uid == resource.data.clientId
              || request.auth.uid == resource.data.providerId
              || request.auth.token.isAdmin == true;
  allow create: if false;   // Only via Cloud Function (Admin SDK)
  allow update: if false;   // Only via Cloud Function (Admin SDK)
  allow delete: if false;   // Projects are never deleted

  // Negotiation offers subcollection — same gating as parent.
  match /negotiations/{offerId} {
    allow read: if request.auth.uid == get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId
                || request.auth.uid == get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId
                || request.auth.token.isAdmin == true;
    allow create: if false;   // Only via Cloud Function (Admin SDK, inside transaction)
    allow update: if false;
    allow delete: if false;
  }
}
```

### 17.2 Rationale

| Design Choice | Reason |
|---------------|--------|
| `read` gated by `clientId` / `providerId` | Matches `bookings` rule. Client and provider dashboards need real-time `onSnapshot` subscriptions — rules must allow read for participants. |
| `create`, `update`, `delete` set to `false` | All mutations go through the `onlineProjectAction` callable, which uses the Admin SDK (bypasses rules). Direct client writes would bypass state-machine enforcement, transaction guarantees, and notification dispatch. |
| `negotiations` subcollection uses `get()` on parent doc | Avoids storing redundant owner fields on each offer doc. The `get()` call reads the parent `online_projects/{projectId}` to check `clientId`/`providerId`. |
| `delete: if false` on parent | Projects are soft-deleted via status → `Cancelled`/`Declined`. Hard deletes would orphan negotiations and break audit trails. |

### 17.3 Deployment

```bash
firebase deploy --only firestore:rules
```

Rules take effect immediately after deployment (no propagation delay like indexes).

--- 

*Last updated: 2026-06-20*
