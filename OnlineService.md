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
- **`updateService` enforcement**: The existing `updateService_service` handler in `functions/src/service.js` uses a whitelist-by-destructuring approach (only 9 named fields are read and written), so `serviceMode` is already implicitly protected. However, to make this explicit and prevent future regressions, `updateService` must actively reject any payload that includes `serviceMode` or `onlineConfig` with a `400 invalid-argument` error: "serviceMode and onlineConfig are immutable after creation. Create a new service for a different mode."

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

  // Milestone progression (milestone mode only)
  currentMilestoneIndex: number;        // 0-based index of the next milestone to submit; starts at 0

  // Deliverable Submissions (stored in subcollection — see 2.5)
  // deliverableCount caches the number of submissions on the parent doc
  // for list-view display without fetching the subcollection.
  deliverableCount: number;

  // Communication
  meetingUrl?: string;               // Placeholder — no provider integrated yet

  // Dispute Resolution
  disputeReason?: string;            // Reason provided by the party who initiated the dispute
  disputeInitiatedBy?: string;       // "client" | "provider" — who filed the dispute
  disputeInitiatedAt?: string;       // ISO 8601 — when the dispute was filed
  disputePreStatus?: string;         // Status immediately before the dispute (e.g., "InReview", "Completed") — used by dismissDispute to revert
  resolutionNote?: string;           // Admin's explanation of the resolution decision
  resolvedBy?: string;               // Firestore UID of the admin who resolved
  resolvedAt?: string;               // ISO 8601 timestamp of resolution

  // Timestamps (ISO 8601 strings — same convention as Booking)
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  lastNegotiationAt: string;           // Set to createdAt on creation, updated on every negotiate/counter — always non-null, enables single-query auto-expiry
  autoCancelled?: boolean;           // Set to true when auto-cancelled by cron (Section 4.5)
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
  | "Disputed"              // Either party disputes — awaiting admin resolution
  | "ResolvedForClient"     // Admin resolved dispute in client's favor (terminal)
  | "ResolvedForProvider";  // Admin resolved dispute in provider's favor (terminal)
```

### 2.4 Valid Transitions

```
Pending → [Active, Negotiating, Declined, Cancelled (client only)]
Negotiating → [Active, Declined, Cancelled]
Active → [InReview, Cancelled]
InReview → [Completed, RevisionsRequested, Active, Disputed]
RevisionsRequested → [InReview (resubmit), Cancelled, Disputed]
Completed → [Disputed]
Disputed → [ResolvedForClient, ResolvedForProvider]   (admin only — dismissDispute reverts to disputePreStatus instead of transitioning to a terminal state)
Declined → []              (terminal)
Cancelled → []             (terminal)
ResolvedForClient → []     (terminal)
ResolvedForProvider → []   (terminal)
```

Enforced server-side in the Cloud Function — any transition not in this map is rejected. The two `Disputed → *` transitions and the `dismissDispute` revert are gated to admin callers only (Section 4.3). `dismissDispute` does not use the standard transition map; it reverts the project status to the value stored in `disputePreStatus` (captured when `disputeProject` was called) — see Section 4.3.

**Semantic notes**:
- **`Decline` vs `Cancel` from `Pending`**: `Decline` is provider-only (rejecting the project request — negative signal, notifies client). `Cancel` from `Pending` is client-only (withdrawing the request — neutral signal, notifies provider). The provider should never `Cancel` from `Pending`; they use `Decline` instead. The backend enforces this: `cancelProject` from `Pending` with a provider caller is rejected.
- **`RevisionsRequested → InReview`**: This is the "resubmit" path. The provider calls `submitDeliverable` again; the handler accepts `RevisionsRequested` and transitions directly to `InReview`. See Section 2.5 for the deliverable payload specification.

### 2.5 Deliverable Submission (Subcollection)

Deliverables are stored in a **subcollection** under each project, matching the same pattern used for negotiation offers (Section 2.6). This avoids the 1MB Firestore document limit risk from accumulating files and revision history across multiple milestones.

```
Firestore: online_projects/{onlineProjectId}/deliverables/{deliverableId}
```

```typescript
interface DeliverableSubmission {
  id: string;
  milestoneIndex?: number;       // Which milestone this fulfills (if milestone mode)
  files: DeliverableFile[];
  notes?: string;
  submittedAt: string;           // ISO 8601
  status: "Submitted" | "Approved" | "RevisionsRequested";
  clientFeedback?: string;
  revisionCount: number;         // Tracks total revision iterations for this milestone/scope
}

interface DeliverableFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}
```

The parent `OnlineProject` document caches `deliverableCount` (updated atomically in the same transaction as the subcollection write) so list views can show submission counts without fetching the subcollection.

Each call to `submitDeliverable` creates a **new** document — the subcollection is append-only, providing a complete version history. The `submitDeliverable` handler:
1. Creates the deliverable doc in the subcollection
2. Increments `deliverableCount` on the parent doc (inside a transaction)
3. Transitions the project status to `InReview`

**Resubmission (Revision) Flow**:

When the client requests revisions (`requestRevisions`), the most recent deliverable's `status` is set to `"RevisionsRequested"` and the project status moves to `RevisionsRequested`. The provider then calls `submitDeliverable` again to resubmit:

1. The handler accepts `RevisionsRequested` status (in addition to `Active`) — see Section 4.3.
2. A **new** `DeliverableSubmission` document is created in the `deliverables` subcollection. The previous submission remains with `status: "RevisionsRequested"` as a permanent audit record.
3. The new submission's `revisionCount` is calculated as `previousSubmission.revisionCount + 1` (for the same `milestoneIndex`, or overall if simple mode).
4. The handler validates that the total `revisionCount` across all submissions for this milestone (or overall) does not exceed the configured `revisionRounds`.
5. Status transitions directly to `InReview` (not through `Active`).

**Milestone Progression**:

In milestone mode, the project tracks `currentMilestoneIndex` (0-based) on the parent `OnlineProject` document:

| Event | `currentMilestoneIndex` Behavior |
|-------|----------------------------------|
| Project creation | Initialized to `0` |
| `submitDeliverable` | Validates the submission's `milestoneIndex === project.currentMilestoneIndex`. Rejects with `"milestone-index-mismatch"` if the provider submits for the wrong milestone. |
| `approveDeliverable` (milestone mode, not all milestones approved) | Increments `currentMilestoneIndex` by 1. Status → `Active` so provider can submit the next milestone. |
| `approveDeliverable` (milestone mode, all milestones approved after increment: `currentMilestoneIndex >= milestones.length`) | Status → `Completed`, sets `completedAt`. |

This prevents the provider from submitting the same milestone twice or skipping milestones. The sequential milestone order is enforced by firestore rules (the field is only updated by the Cloud Function inside a transaction).

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

  // Denormalized from parent project doc — written atomically in the
  // same transaction that creates this offer. Eliminates the need for
  // a get() on the parent document in Firestore security rules,
  // reducing per-read cost and latency on every negotiation read.
  clientId: string;
  providerId: string;
}
```

#### Transaction Requirements

Both `negotiateProject` and `acceptCounterOffer` handlers use a Firestore **transaction**:

1. **Transaction start**: `db.runTransaction()` — reads the project document inside the transaction.
2. **Validate status**: Confirms the project is in `Pending` or `Negotiating` (for negotiate) or `Negotiating` (for accept). If the status changed between the client's read and the transaction, the transaction retries.
3. **Write offer doc**: `setDoc(doc(projectRef, "negotiations", offerId), offerData)` — creates a new offer document in the subcollection. The offer document includes `clientId` and `providerId` copied from the project document read in step 1. This denormalization is atomic with the write and ensures Firestore security rules can gate reads on `resource.data.clientId`/`resource.data.providerId` without an extra `get()` on the parent document.
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

### 2.7 Payment History (Subcollection)

`recordPayment` updates `amountPaid` and `paymentStatus` on the parent project document. Without an audit trail, incorrect or fraudulent payment entries are irrecoverable — there is no way to trace what changed, when, or by whom.

Every payment mutation writes an immutable record to a **subcollection** under the project. The parent document's `amountPaid` and `paymentStatus` remain the fast-read path for dashboards; the subcollection is the source of truth for reconciliation and dispute evidence.

```
Firestore: online_projects/{onlineProjectId}/payment_history/{recordId}
```

```typescript
interface PaymentRecord {
  id: string;
  projectId: string;
  recordedBy: string;              // Firestore UID of the provider or admin
  recordedByRole: "provider" | "admin";
  amountDelta: number;             // Signed: positive = payment received, negative = correction/refund
  amountBefore: number;            // amountPaid on parent doc before this mutation
  amountAfter: number;             // amountPaid on parent doc after this mutation
  paymentStatusBefore: "Pending" | "Partial" | "Full";
  paymentStatusAfter: "Pending" | "Partial" | "Full";
  notes?: string;                  // Optional reason / context
  createdAt: string;               // ISO 8601
}
```

#### Write Atomicity

`recordPayment` uses a Firestore **transaction** to atomically:

1. Read the current project document (capture `amountPaid` and `paymentStatus` as `amountBefore`/`paymentStatusBefore`).
2. Compute `amountAfter = amountBefore + amountDelta` and derive `paymentStatusAfter` (`"Full"` if `amountAfter >= agreedPrice`, `"Partial"` if `> 0`, `"Pending"` if `0`).
3. Validate `amountAfter >= 0` (reject negative totals — corrections that would overcorrect must be re-entered).
4. Write the `PaymentRecord` document to `payment_history/{autoId}`.
5. Update the parent project document's `amountPaid`, `paymentStatus`, and `paymentNotes`.

#### Reading Payment History

```typescript
const historySnapshot = await getDocs(
  query(
    collection(db, "online_projects", projectId, "payment_history"),
    orderBy("createdAt", "asc"),
  ),
);
```

The provider project detail page renders a payment timeline from this subcollection. The client sees the same history (read-only) for transparency.

#### Firestore Rules

The `payment_history` subcollection inherits the same participant-read, backend-only-write pattern as `negotiations`. `clientId` and `providerId` are denormalized onto each `PaymentRecord` document for the same zero-`get()` rule evaluation:

```firestore
match /payment_history/{recordId} {
  allow read: if request.auth.uid == resource.data.clientId
              || request.auth.uid == resource.data.providerId
              || request.auth.token.isAdmin == true;
  allow create: if false;   // Only via Cloud Function (Admin SDK, inside transaction)
  allow update: if false;   // Immutable after creation
  allow delete: if false;   // Audit records are never deleted
}
```

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
    case "resolveDisputeForClient": return resolveDisputeForClient_handler(request, data);
    case "resolveDisputeForProvider": return resolveDisputeForProvider_handler(request, data);
    case "dismissDispute":          return dismissDispute_handler(request, data);
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
| `createOnlineProject` | Service is OnlineService + Available, provider != client, brief length, package belongs to service, `idempotencyKey` is valid UUID and not already used (Section 17.3) | Creates doc in `Pending` with `currentMilestoneIndex: 0`, `lastNegotiationAt` set to `createdAt`, records idempotency key in `online_project_idempotency` |
| `acceptProject` | Status is Pending or Negotiating | Sets `agreedPrice`/`agreedDeadline` from original or last offer, status → `Active`, sets `acceptedAt` |
| `declineProject` | Status is Pending or Negotiating | Status → `Declined` |
| `negotiateProject` | Status is Pending or Negotiating, negotiation rounds < 10 (Section 17.2) | Creates offer doc in `negotiations` subcollection (inside transaction), status → `Negotiating`, sets `lastNegotiationAt` |
| `acceptCounterOffer` | Status is Negotiating, negotiation rounds < 10 (Section 17.2) | Reads latest offer from `negotiations` subcollection (inside transaction), sets `agreedPrice`/`agreedDeadline` from offer, marks that offer as `Accepted` + remaining `Rejected`, status → `Active`, sets `lastNegotiationAt` |
| `submitDeliverable` | Status is Active or RevisionsRequested, revision rounds not exceeded; in milestone mode, the submitted `milestoneIndex` must equal `currentMilestoneIndex` | Creates a `DeliverableSubmission` doc in the `deliverables` subcollection (inside transaction), increments `deliverableCount` on parent. From `Active`: status → `InReview`. From `RevisionsRequested`: status → `InReview` (resubmit path). |
| `approveDeliverable` | Status is InReview; in milestone mode, the deliverable's `milestoneIndex` must equal `currentMilestoneIndex` | Updates the latest deliverable doc in the `deliverables` subcollection: sets its `status` to `"Approved"`. If all milestones approved (`currentMilestoneIndex` is the last milestone before increment) or simple mode → status `Completed`, sets `completedAt`, dispatches `REVIEW_REMINDER` (to client) and `REVIEW_REQUEST` (to provider). For milestone mode with remaining milestones: increments `currentMilestoneIndex`, status → `Active`. |
| `requestRevisions` | Status is InReview, revisions remaining > 0 | Updates the latest deliverable doc in the `deliverables` subcollection: sets its `status` to `"RevisionsRequested"` and stores `clientFeedback`. Decrements remaining revisions on parent. Overall status → `RevisionsRequested`. |
| `cancelProject` | Status is Active, InReview, RevisionsRequested, Negotiating (any party), or Pending (client only — provider must use `declineProject` for Pending) | Status → `Cancelled` |
| `disputeProject` | Status is InReview, Completed, RevisionsRequested | Sets `disputePreStatus` to current project status, then status → `Disputed`, sets `disputeReason` (from caller's input), `disputeInitiatedBy`, `disputeInitiatedAt` |
| `resolveDisputeForClient` | **Admin only**, status is Disputed | Status → `ResolvedForClient`, sets `resolutionNote`, `resolvedAt`, `resolvedBy`. Notifies both parties. |
| `resolveDisputeForProvider` | **Admin only**, status is Disputed | Status → `ResolvedForProvider`, sets `resolutionNote`, `resolvedAt`, `resolvedBy`. Notifies both parties. |
| `dismissDispute` | **Admin only**, status is Disputed | Reverts project status to `disputePreStatus` (captured when the dispute was filed), sets `resolutionNote`, `resolvedAt`, `resolvedBy`. Notifies both parties. Dispute deemed without merit — work resumes from pre-dispute state. |
| `recordPayment` | **Client only** (caller must be the project client) | Inside transaction: writes immutable `PaymentRecord` to `payment_history` subcollection (with `amountBefore`/`amountAfter`, `recordedBy`, signed `amountDelta`), then updates parent doc `amountPaid` and `paymentStatus`. The provider cannot unilaterally record payments — they request payment via chat/notification, and the client records it. This prevents abuse (see Section 17.5 rationale). |
| `getClientProjectAnalytics` | Client or admin, optional `startDate`/`endDate` | Returns aggregated metrics for client's projects in date range |
| `getProviderProjectAnalytics` | Admin only, `providerId`, optional `startDate`/`endDate` | Returns aggregated metrics for provider's projects in date range |
| `getClientProjects` | Client or admin, optional `limit` (default 50, Section 17.1) | Returns client's projects ordered by `createdAt` DESC |
| `getProviderProjects` | Provider or admin, optional `limit` (default 50, Section 17.1) | Returns provider's projects ordered by `createdAt` DESC |

### 4.4 State Machine Enforcement

Same pattern as `booking.js`:

```javascript
const VALID_TRANSITIONS = {
  Pending:              ["Active", "Negotiating", "Declined", "Cancelled"],
  Negotiating:          ["Active", "Declined", "Cancelled"],
  Active:               ["InReview", "Cancelled"],
  InReview:             ["Completed", "RevisionsRequested", "Active", "Disputed"],
  RevisionsRequested:   ["InReview", "Cancelled", "Disputed"],
  Completed:            ["Disputed"],
  Disputed:             ["ResolvedForClient", "ResolvedForProvider"],
  Declined:             [],
  Cancelled:            [],
  ResolvedForClient:    [],
  ResolvedForProvider:  [],
};

const ADMIN_ONLY_TRANSITIONS = new Set([
  "ResolvedForClient",
  "ResolvedForProvider",
]);

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function requiresAdmin(targetStatus) {
  return ADMIN_ONLY_TRANSITIONS.has(targetStatus);
}
```

**`dismissDispute` bypasses `isValidTransition`**: The `dismissDispute` handler does not use the standard transition map. Instead, it reads `disputePreStatus` from the project document and transitions to that status (which is whatever valid status the project was in before the dispute was filed — e.g., `InReview`, `Completed`, or `RevisionsRequested`). The transition is inherently valid because the project held that status before the dispute; the revert is restoring a prior valid state. This is enforced by the handler, not the transition map.

**Role-specific gating**: The `cancelProject` handler additionally checks the caller's role when the project is in `Pending` status — only the client is allowed to cancel from `Pending`. A provider attempting `cancelProject` on a `Pending` project receives a `"permission-denied"` error: "Provider cannot cancel a Pending project. Use declineProject instead." This is enforced in the handler, not in the transition map (the transition map permits the state change; the handler adds the role gate).

### 4.5 Scheduled Functions (Initial Build)

The following scheduled (cron) functions run in the initial build. They follow the same `onSchedule` pattern as existing functions.

#### `autoCancelExpiredProjects`

Daily cron that cancels stale projects to prevent indefinite accumulation:

| Condition | Action | Notification |
|-----------|--------|-------------|
| `Pending` older than **7 days** from `createdAt` | Status → `Cancelled`, sets `autoCancelled: true` | Both parties receive `ONLINE_PROJECT_CANCELLED` with message "This project request was automatically cancelled due to inactivity." |
| `Negotiating` with `lastNegotiationAt` older than **14 days** | Status → `Cancelled`, sets `autoCancelled: true` | Both parties receive `ONLINE_PROJECT_CANCELLED` with message "This project negotiation was automatically cancelled due to inactivity." |

```javascript
// fires every 24 hours
exports.autoCancelExpiredProjects = onSchedule("every day 00:00", async () => {
  const now = admin.firestore.Timestamp.now();
  const sevenDaysAgo = new Date(now.toMillis() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.toMillis() - 14 * 24 * 60 * 60 * 1000);

  // Cancel expired Pending projects
  const pendingExpired = await db.collection("online_projects")
    .where("status", "==", "Pending")
    .where("createdAt", "<", sevenDaysAgo.toISOString())
    .get();

  // Cancel expired Negotiating projects
  // lastNegotiationAt is always set (initialized to createdAt on project creation,
  // updated on every negotiate/counter), so no null fallback query is needed.
  // See `lastNegotiationAt: string` (non-optional) in the OnlineProject interface.
  const negotiatingExpired = await db.collection("online_projects")
    .where("status", "==", "Negotiating")
    .where("lastNegotiationAt", "<", fourteenDaysAgo.toISOString())
    .get();

  // For each expired project, batch-update status and dispatch notifications
});
```

#### `sendProjectReminders`

(Kept as future — Section 12.5.)

#### Index Requirement

The `Negotiating` expiry query uses `WHERE status = X AND lastNegotiationAt < Y ORDER BY lastNegotiationAt ASC`. This query requires an explicit composite index on `[status ASC, lastNegotiationAt ASC]` — the `[status ASC, createdAt DESC]` index cannot serve an inequality filter on a different field. This index is defined in Section 15.1 as the fourth online_projects index.

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
    disputedProjects: number;     // Status in Disputed, ResolvedForClient, ResolvedForProvider, Dismissed
    memberSince: string;          // ISO date from user profile createdAt
    startDate: string;
    endDate: string;
  }
}
```

**Implementation** (follows `booking.js:1701–1781`):

```javascript
const projectsQuery = await db.collection("online_projects")
  .where("clientId", "==", targetClientId)
  .where("createdAt", ">=", actualStartDate)
  .where("createdAt", "<=", actualEndDate)
  .get();

const projects = projectsQuery.docs.map(doc => doc.data());
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
    disputedProjects: number;     // Status in Disputed, ResolvedForClient, ResolvedForProvider, Dismissed
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
| `disputedProjects` | `Disputed`, `ResolvedForClient`, `ResolvedForProvider`, `Dismissed` (all dispute-related statuses, including resolved disputes) |
| `acceptedJobs` (internal, for rate calc) | `Completed`, `Active`, `InReview`, `RevisionsRequested` (projects that progressed past Pending) |

#### Index Requirement

Both queries use `WHERE providerId/clientId = X AND createdAt >= Y AND createdAt <= Z` — this is covered by the composite indexes defined in Section 15 (which are new additions to `firestore.indexes.json`; the existing file contains only one index for the `messages` collection). The leading field (clientId/providerId) is the same and `createdAt` DESC ordering is satisfied by the same index in both directions.

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

The existing `typeBreakdown` only lists 4 types and is already missing `ReportAttachment`, `ChatAttachment`, and `ProblemProof`:

```javascript
const typeBreakdown = {
  UserProfile: 0,
  ServiceImage: 0,
  ServiceCertificate: 0,
  RemittancePaymentProof: 0,
  // Missing: ReportAttachment — not counted in stats
  // Missing: ChatAttachment — not counted in stats
  // Missing: ProblemProof — not counted in stats
  ProjectBriefAttachment: 0,
};
```

**Pre-existing gap**: `ReportAttachment`, `ChatAttachment`, and `ProblemProof` are also missing from this list. They work correctly at runtime (the `forEach` loop dynamically counts any `mediaType` it encounters) but they will not appear with a `0` default in stats responses when no documents of that type exist. This affects admin storage statistics accuracy. Fixing these is outside the scope of this spec but recommended as a follow-up.

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
- Validates `serviceId` exists, is an `OnlineService` (`serviceMode === "OnlineService"`), and is in "Available" status
- Validates the caller is **not** the provider who owns the service (a provider cannot upload a brief attachment for their own service — only potential clients can)
- Generates `mediaId` via `generateUuid()`
- Generates a `filePath` using the caller's UID as the owner prefix (not a projectId, since the project doesn't exist yet): `project-briefs/{callerUid}/{mediaId}_{sanitizedFileName}`
- Returns `{ success: true, data: { mediaId, filePath, fileName, fileType, thumbnailUrl: null } }`

**Rationale**: The brief upload happens **before** `createOnlineProject` is called (Step 1 → Step 2 → Step 3 flow). There is no `projectId` to validate against. Instead, the handler validates that the target service is a legitimate online service and the caller is a legitimate potential client (not the provider). The returned `filePath` uses the caller's UID as the owner prefix, so Storage security rules can isolate uploads to the uploading user. When `createOnlineProject` later stores the URL in `referenceAttachments`, the project becomes the logical owner of the file, but the Storage path remains keyed by the uploader's UID.

**Step 2 — Client uploads directly to Firebase Storage** at the returned `filePath` using `uploadBytesResumable`, then calls `getDownloadURL` for the public URL.

**Step 3 — Client includes the URL** in the `createOnlineProject` call as part of `referenceAttachments: string[]`.

This avoids base64 encoding, stays within Cloud Function body limits, and supports resumable uploads for large files.

### 5.3 Deliverable Uploads

Deliverable files follow the same two-step init pattern as `ProjectBriefAttachment` (Section 5.2). A dedicated media type (`ProjectDeliverable`) is registered in the initial build using the same 6 touchpoints (Section 5.1) with the following differences:

| Parameter | ProjectBriefAttachment | ProjectDeliverable |
|-----------|----------------------|-------------------|
| Storage folder | `"project-briefs"` | `"project-deliverables"` |
| Max file size | 50MB | 500MB |
| `MAX_*_FILE_SIZE` constant | `MAX_PROJECT_BRIEF_FILE_SIZE` | `MAX_PROJECT_DELIVERABLE_FILE_SIZE` |

The `submitDeliverable` handler stores pre-uploaded file URLs — it does not call `uploadMediaInternal` (which is the old base64 path). The flow is:

1. **Provider uploads file** client-side via the two-step init (`initProjectDeliverableUpload` action on `mediaAction`)
2. **Provider submits** the deliverable with the resulting `fileUrl` array
3. **`submitDeliverable_handler`** stores the URLs in the `deliverables` subcollection

This keeps deliverable files out of the Cloud Function request body (avoiding the 10MB base64 limit) and supports resumable uploads for large files (e.g., video edits, design files).

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
| Timeline | `TimelineSection.tsx` (new) | Displays provider's delivery range from config. Client picks desired date within range. |
| Payment Summary | `PaymentSummarySection.tsx` (new) | Shows package price. "Payment is manually arranged" notice. |
| Review & Submit | `ReviewSubmitSection.tsx` (new) | Read-only summary + Submit button |

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

**Post-submit destination**: After `useCreateOnlineProject()` succeeds, the page navigates to `/client/online-project/{projectId}` showing the project detail in `Pending` status. This matches the booking flow's `/client/booking/confirmation` pattern — the client sees their submitted request immediately, with a status banner reading "Waiting for provider to respond."

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

- **File upload**: Drag-and-drop zone, multiple files, all types supported. Files are uploaded client-side via the two-step init flow (`initProjectDeliverableUpload` on `mediaAction`) — see Section 5.3. The upload step returns pre-uploaded file URLs that are passed to `submitDeliverable`.
- **Milestone selector** (if milestone mode): "This deliverable completes milestone: [dropdown]"
- **Optional notes**: text area
- **Submit button**: calls `submitDeliverable` on the Cloud Function with the pre-uploaded file URLs

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

**Implementation**: The existing search results page queries Firestore for services. The `serviceMode` filter is applied as an additional query clause:

```javascript
// When "All" or "In-Person" is selected, include legacy docs without serviceMode:
const modeFilter = selectedMode === "Online"
  ? ["OnlineService"]
  : selectedMode === "In-Person"
    ? ["HomeService", null]
    : null;  // "All" — no filter

let query = db.collection("services");
if (modeFilter) {
  query = query.where("serviceMode", "in", modeFilter);
}
// Apply remaining filters (category, price range, etc.)
```

**Index requirement**: The `serviceMode` field already has automatic single-field indexes (Firestore creates ascending/descending indexes for every field by default). No additional composite index is needed for equality-only filters on `serviceMode`.

**Search results page behavior**:
- When "Online" is selected: the "Location" filter dropdown is hidden (online services have no location).
- When "In-Person" is selected: location-based sorting and distance filtering behave as today.
- When "All" is selected: both types appear mixed, but online services show no location/distance info.

**Frontend state**: The selected mode is stored as `serviceModeFilter: "All" | "In-Person" | "Online"` in the search results page state. It syncs with URL search params (`?mode=online`) for shareable search URLs. On mode change, the page re-fetches the services query with the updated filter.

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

### 9.3 Navigation & Sidebar Integration

#### Client Sidebar
The client sidebar/layout (shared across `/client/*` pages) gains a new **"Online Projects"** nav item:

```
Dashboard
Notifications
Messages
My Bookings       → /client/booking
Online Projects   → /client/online-projects    ← NEW
Wallet
Saved Providers
Saved Searches
```

The sidebar badge (unread count) for "Online Projects" shows the count of projects in `Pending` or `Negotiating` status (projects needing client attention).

#### Provider Sidebar
The provider sidebar gains a new **"Online Projects"** nav item:

```
Dashboard
Notifications
Messages
My Services
Bookings          → /provider/bookings
Online Projects   → /provider/online-projects  ← NEW
Wallet
```

The provider sidebar badge shows the count of projects in `Pending` or `Negotiating` status (projects needing provider attention).

#### Dashboard Integration
Both client and provider dashboard pages show a **summary card** for online projects alongside the existing bookings summary:

| Metric | Booking Source | Online Project Source |
|--------|---------------|----------------------|
| Active count | Bookings with status InProgress/Accepted | Projects with status Active/InReview |
| Pending count | Bookings with status Requested/Pending | Projects with status Pending/Negotiating |
| Completed count (this month) | Bookings with status Completed | Projects with status Completed |

The dashboard card links to the respective list page (`/client/online-projects` or `/provider/online-projects`).

#### "My Bookings" Page Cross-Reference
The existing `/client/booking/myBookingsPage` page does **not** show online projects. A subtle cross-reference link is added at the bottom of the booking list: "Looking for online projects? [View Online Projects →](/client/online-projects)". This prevents confusion while keeping the two entities visually separate.

## 10. Hooks & Services

### 10.1 New Files

| File | Exports |
|------|---------|
| `src/frontend/src/services/onlineProjectCanisterService.ts` | `OnlineProject`, `OnlineProjectStatus`, `DeliverableSubmission`, `NegotiationOffer`, `onlineProjectCanisterService` (all API methods) |
| `src/frontend/src/hooks/useOnlineProject.tsx` | `useOnlineProjects()`, `useOnlineProject(id)`, `useCreateOnlineProject()` |
| `src/frontend/src/hooks/useProviderOnlineProject.tsx` | `useProviderOnlineProjects()`, `useProviderOnlineProject(id)`, `useAcceptProject()`, `useDeclineProject()`, `useNegotiateProject()`, `useSubmitDeliverable()` |

### 10.2 Hook Details

**`useOnlineProjects()`**:
- On mount, calls `onlineProjectCanisterService.getClientProjects({ clientId, limit: 50 })` → `httpsCallable("onlineProjectAction")` for the initial paginated fetch (Section 17.1).
- After the initial fetch resolves, subscribes to Firestore `online_projects/` where `clientId == currentUser` via `onSnapshot` for real-time updates.
- Merges the two data sources: the callable provides the initial 50-project page, and `onSnapshot` provides subsequent changes. This ensures the list respects the pagination limit while staying real-time.
- Enriches with provider profile + service details + package details.

**`useProviderOnlineProjects()`**:
- Same dual pattern: initial fetch via `getProviderProjects` callable (limit 50), then `onSnapshot` subscription for real-time updates.
- Enriches with client profile + service details.

**`getClientProjects` / `getProviderProjects` callables**:
- Serve as the **initial data source** for the hooks and as a **standalone fallback** for non-realtime contexts (e.g., admin tools, exports).
- Accept an optional `limit` parameter (default 50) for pagination.
- The hooks also expose a `refetch()` function that re-invokes the callable to refresh the initial page.

**`useCreateOnlineProject()`**:
- Calls `onlineProjectCanisterService.createOnlineProject(data)` → `httpsCallable("onlineProjectAction")`
- Handles brief attachment uploads first, then submits

---

## 11. Key Design Decisions

### 11.1 Why a Separate Entity (OnlineProject ≠ Booking)

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

### 11.2 Why Not Subclass Booking

- **TypeScript complexity**: A discriminated union or `mode`-gated fields on `Booking` would require extensive type narrowing everywhere.
- **Firestore query performance**: Single collection with mixed types creates index bloat and confusing queries.
- **Evolution**: The two systems will evolve independently (e.g., escrow for bookings, milestone payments for projects). Separate collections let each evolve without touching the other.
- **State machine enforcement**: `isValidStatusTransition` in `booking.js` would need to branch on mode — error-prone.

### 11.3 Why Milestones Are Optional ("Both — Provider's Choice")

- Simple projects (logo design, article writing) don't need milestones — just a deadline and revision rounds.
- Complex projects (web development, business registration) benefit from milestone tracking.
- Letting the provider choose per-package keeps the system flexible without forcing complexity on simple use cases.

### 11.4 Timestamp Convention

The codebase has an existing inconsistency in how timestamps are typed:

| Interface | `createdAt` / `updatedAt` Type | Source |
|-----------|-------------------------------|--------|
| `Service` | `any` (Firestore Timestamp) | `serviceCanisterService.ts:119-120` |
| `Booking` | `string` (ISO 8601) | Booking interface |
| `OnlineProject` | `string` (ISO 8601) | This spec |

The `Service` interface's `any` type with the comment `// Firestore Timestamp` is a legacy convention from the earliest version of the app. All new entities (`Booking`, `OnlineProject`, `NegotiationOffer`, `DeliverableSubmission`) use ISO 8601 strings, which the backend writes via `new Date().toISOString()`.

**Rule for new code**: All timestamps in new entities and Cloud Functions must use ISO 8601 strings. The `Service` type's Firestore Timestamp convention is legacy and should not be replicated. If the Service interface is refactored in the future, its timestamps should be changed to `string` to match the rest of the codebase.

### 11.5 Review/Rating After Completion

Online projects reuse the existing review system instead of creating a separate one:

- The `Review` interface (in `reviewCanisterService.ts`) uses `projectId: string` as the primary linking field for online project reviews, separate from the existing `bookingId: string` (which remains the primary for booking reviews). Reviews have exactly one of the two fields — the entity type is determined by which is present.
- The `submitReview` and `submitProviderReview` Cloud Functions accept a `projectId` parameter in addition to the existing `bookingId`. When `projectId` is provided, validation checks the project's status is `Completed` and the caller is the project client (for client→provider reviews) or provider (for provider→client reviews).
- The review page route (`/client/review/:id` and `/provider/rate-client/:id`) already exists — the page reads the entity ID from the URL, queries for a review with that ID, and then loads either the booking or project data depending on which field the review references.
- The **review reminder notification** fires inside `approveDeliverable` when the transition to `Completed` happens, using the same `REVIEW_REMINDER` and `REVIEW_REQUEST` notification types as bookings (see Section 13.3).
- Reviews for online projects use the same reputation scoring, quality scoring, and display logic as booking reviews — no changes needed to the review analysis or reputation system.

### 11.6 Commission Not Applied

Commission fees are **not applied** to online projects. This is a deliberate design choice:

- **The `OnlineProject` entity has no `commissionFee` or `commissionRate` fields**. The `Service` and `Package` types in `serviceCanisterService.ts` do define these fields (used for home-service bookings), but `onlineConfig` (Section 1.2) does not include commission settings.
- **The `originalPrice` and `agreedPrice` on `OnlineProject` are the full amounts**. Frontend price display for online services shows the package price directly — no `commissionFee` addition (unlike `PackagesSection.tsx` which adds commission to home-service prices).
- **Rationale**: Online projects represent ongoing professional engagements (design, development, consulting) where the provider sets fixed project-based pricing. Commission on home services covers platform costs for scheduling, navigation, and escrow-dispute overhead that doesn't apply to online projects. Escrow is disabled for online projects (Section 13.3 in Future Considerations), and there is no navigation/dispatch infrastructure cost. If a commission model is introduced later (e.g., a flat listing fee or milestone-based percentage), it should be added as new fields on `OnlineServiceConfig`, not inherited from the home-service commission system.

## 12. Future Considerations

### 12.1 Meeting Provider Integration

The `meetingUrl` field is a placeholder. When integrated, recommended approach:
- **Daily.co** prebuilt iframe — simplest embed, no app install required.
- Room URL generated via Cloud Function on project accept.
- Both client and provider detail pages show "Join Meeting" when Active+.

### 12.2 Milestone-Based Payment Release

When escrow is re-enabled, milestones map naturally to partial releases:
```
1. First Draft (50%) → PAID_HELD → released on Approve
2. Final Files (50%) → PAID_HELD → released on Approve
```

### 12.3 Escrow Re-Enablement

The `paymentStatus` and `amountPaid` fields are designed to be forward-compatible:
- `"Pending"` | `"Partial"` | `"Full"` maps cleanly to future escrow states.
- `amountPaid` can become the total released-to-provider sum.
- New fields (`heldAmount`, `releasedAmount`) can be added without migration.

### 12.4 Dispute Resolution (Implemented — Basic Admin Flow)

The initial build includes a basic admin mediation workflow. When a project enters `Disputed` state, an admin reviews the case (using evidence from deliverable versions, chat logs, brief, and payment history) and takes one of three actions:

- **`resolveDisputeForClient`** → `ResolvedForClient` — Admin rules in client's favor (e.g., refund, re-do). The `resolutionNote` documents the rationale.
- **`resolveDisputeForProvider`** → `ResolvedForProvider` — Admin rules in provider's favor (e.g., payment stands, deliverable accepted). The `resolutionNote` documents the rationale.
- **`dismissDispute`** → Reverts to `disputePreStatus` — Admin determines the dispute has no merit. The project is restored to whatever valid status it held before the dispute was filed (e.g., `InReview`, `Completed`, or `RevisionsRequested`). Work and payments resume from the pre-dispute state, preserving the existing deliverable and payment history. No new terminal state is created — the project returns to an active lifecycle. See Section 2.4 for the `disputePreStatus` mechanism.

Future enhancements: structured evidence submission (file uploads from both parties), escalation tiers, automated timeout (auto-dismiss after N days with no admin action), and integration with escrow release/hold logic.

---

## 13. Notification Dispatch

### 13.1 New Notification Types

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
  DISPUTE_RESOLVED_FOR_CLIENT:   "dispute_resolved_for_client",
  DISPUTE_RESOLVED_FOR_PROVIDER: "dispute_resolved_for_provider",
  DISPUTE_DISMISSED:             "dispute_dismissed",
  DELIVERABLE_SUBMITTED:         "deliverable_submitted",
  MILESTONE_APPROVED:            "milestone_approved",
  REVISIONS_REQUESTED:           "revisions_requested",
};
```

### 13.2 Local `createNotification()` Helper

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

### 13.3 Notification Dispatch Table

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
| `approveDeliverable` (on → `Completed`) | → `Completed` | Client | `REVIEW_REMINDER` | "Share Your Experience" | `Please review your "{projectTitle}" project with {providerName}` | `{providerId, providerName, projectId}` |
| `approveDeliverable` (on → `Completed`) | → `Completed` | Provider | `REVIEW_REQUEST` | "Rate Your Client" | `Rate your experience with {clientName} for "{projectTitle}"` | `{clientId, clientName, projectId}` |
| `approveDeliverable` (milestone mode, more milestones remain) | → `Active` | Provider | `MILESTONE_APPROVED` | "Milestone Approved" | `{clientName} approved milestone "{milestoneTitle}" for {projectTitle}` | `{clientId, clientName, milestoneTitle, milestoneIndex, projectId}` |
| `requestRevisions` | → `RevisionsRequested` | Provider | `REVISIONS_REQUESTED` | "Revisions Requested" | `{clientName} requested revisions for {projectTitle} — {revisionNotes}` | `{clientId, clientName, deliverableId, projectId}` |
| `cancelProject` (by client) | → `Cancelled` | Provider | `ONLINE_PROJECT_CANCELLED` | "Project Cancelled" | `{clientName} cancelled the project {projectTitle}` | `{clientId, clientName, projectId}` |
| `cancelProject` (by provider) | → `Cancelled` | Client | `ONLINE_PROJECT_CANCELLED` | "Project Cancelled" | `{providerName} cancelled the project {projectTitle}` | `{providerId, providerName, projectId}` |
| `autoCancelExpiredProjects` (cron) | → `Cancelled` | Both parties | `ONLINE_PROJECT_CANCELLED` | "Project Auto-Cancelled" | `{projectTitle} was automatically cancelled due to inactivity.` | `{projectId, autoCancelled: true, reason: "pending_expired" \| "negotiating_expired"}` |
| `disputeProject` | → `Disputed` | Both parties | `ONLINE_PROJECT_DISPUTED` | "Project Disputed" | `{projectTitle} has been marked as disputed. An admin will review the case.` | `{projectId, initiatedBy: "client" \| "provider"}` |
| `resolveDisputeForClient` | → `ResolvedForClient` | Both parties | `DISPUTE_RESOLVED_FOR_CLIENT` | "Dispute Resolved — Client" | `The dispute for {projectTitle} has been resolved in the client's favor. Resolution: {resolutionNote}` | `{projectId, resolvedBy, resolutionNote}` |
| `resolveDisputeForProvider` | → `ResolvedForProvider` | Both parties | `DISPUTE_RESOLVED_FOR_PROVIDER` | "Dispute Resolved — Provider" | `The dispute for {projectTitle} has been resolved in the provider's favor. Resolution: {resolutionNote}` | `{projectId, resolvedBy, resolutionNote}` |
| `dismissDispute` | → reverts to `disputePreStatus` | Both parties | `DISPUTE_DISMISSED` | "Dispute Dismissed" | `The dispute for {projectTitle} has been dismissed. Note: {resolutionNote}` | `{projectId, resolvedBy, resolutionNote}` |

### 13.4 Implementation Notes

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
  - `ONLINE_PROJECT_CANCELLED` → `/client/online-projects` (client) or `/provider/online-projects` (provider)
  - `ONLINE_PROJECT_DISPUTED` → `/client/online-project/{projectId}` (client) or `/provider/online-project/{projectId}` (provider)
  - `DISPUTE_RESOLVED_FOR_CLIENT` → `/client/online-project/{projectId}` (client) or `/provider/online-project/{projectId}` (provider)
  - `DISPUTE_RESOLVED_FOR_PROVIDER` → `/client/online-project/{projectId}` (client) or `/provider/online-project/{projectId}` (provider)
  - `DISPUTE_DISMISSED` → `/client/online-project/{projectId}` (client) or `/provider/online-project/{projectId}` (provider)

  The function already receives `userType` as a parameter (from `USER_TYPES`), so role-specific paths use the existing `isProvider` branching pattern. Notifications targeting the provider (e.g., `NEW_ONLINE_PROJECT_REQUEST`, `MILESTONE_APPROVED`) always generate `/provider/...` paths. Notifications targeting the client (e.g., `ONLINE_PROJECT_ACCEPTED`, `DELIVERABLE_SUBMITTED`) always generate `/client/...` paths. For `ONLINE_PROJECT_CANCELLED` and `ONLINE_PROJECT_DISPUTED`, which can target either party, the `userType` parameter determines the prefix.
- **Email dispatch**: Initially, no online project notification types are added to `BOOKING_EMAIL_TYPES`. Email support can be introduced when volume warrants it. The notification is always delivered via in-app + push.
- **Error tolerance**: All `createNotification()` calls are wrapped in try/catch, logged via `functions.logger.error`, and never propagated. A notification failure must not prevent the primary action from succeeding.

---

## 14. File Manifest

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

### Modified Files (11)

```
src/frontend/src/services/serviceCanisterService.ts        — Add serviceMode, onlineConfig, OnlineServiceConfig
src/frontend/src/services/reviewCanisterService.ts         — Add projectId field to Review interface
src/frontend/src/pages/provider/services/add.tsx           — Mode toggle, conditional steps
src/frontend/src/pages/client/service/[id].tsx             — Conditional CTA
src/frontend/src/components/client/book/PackagesSection.tsx — Add selectionMode prop (single vs. multi)
src/frontend/main.tsx                                      — Add 6 routes
functions/src/media.js                                     — Register ProjectBriefAttachment + ProjectDeliverable in generateFilePath, validMediaTypes, validateFileSize, uploadMediaHandler error text, getStorageStatsHandler; add initProjectBriefUpload + initProjectDeliverableUpload actions + handlers
functions/src/notification.js                              — Add 13 online project NOTIFICATION_TYPES + href mappings
functions/src/review.js                                    — Accept projectId alongside bookingId in submitReview and submitProviderReview
firestore.indexes.json                                     — Add 4 composite indexes (clientId/createdAt, providerId/createdAt, status/createdAt, status/lastNegotiationAt)
firestore.rules                                            — Add online_projects + negotiations + deliverables + payment_history + online_project_idempotency rules (participant read, backend-only write, audit immutability)
```

---

## 15. Firestore Index Configuration

### 15.1 Required Composite Indexes

The `online_projects` collection needs composite indexes for the list queries used by client and provider dashboards. Without these, Firestore returns an error on first query with an `orderBy` on a field not in the equality filter.

| Collection | Fields | Query Served |
|------------|--------|-------------|
| `online_projects` | `clientId` ASC, `createdAt` DESC | Client project list: `WHERE clientId = X ORDER BY createdAt DESC` |
| `online_projects` | `providerId` ASC, `createdAt` DESC | Provider project list: `WHERE providerId = X ORDER BY createdAt DESC` |
| `online_projects` | `status` ASC, `createdAt` DESC | Status-tabbed views: `WHERE status = X ORDER BY createdAt DESC` (admin / tab filtering) |
| `online_projects` | `status` ASC, `lastNegotiationAt` ASC | Auto-expiry cron: `WHERE status = "Negotiating" AND lastNegotiationAt < 14-days-ago ORDER BY lastNegotiationAt ASC` (Section 4.5) |

### 15.2 Index Definition (Add to `firestore.indexes.json`)

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
    },
    {
      "collectionGroup": "online_projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "lastNegotiationAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 15.3 Deployment

Deploy via Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

Firestore index creation is asynchronous — indexes may take 1–5 minutes to build after deployment. Queries that depend on a not-yet-ready index will fail. For development, Firestore auto-suggests missing indexes in the error message's error link, which opens the Firebase console to create them on demand.

### 15.4 Single-Field Indexes (Automatic)

Firestore automatically creates ascending and descending indexes for every single field. No explicit config is needed for equality-only queries like:

- `WHERE clientId = X` (no ORDER BY)
- `WHERE providerId = X` (no ORDER BY)
- `WHERE status = X` (no ORDER BY)

---

## 16. Firestore Security Rules

### 16.1 Rule Pattern

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
  // clientId and providerId are denormalized onto each offer document
  // (written atomically in the Cloud Function transaction), so rules
  // check resource.data directly — no get() on the parent, no extra
  // document read per rule evaluation.
  match /negotiations/{offerId} {
    allow read: if request.auth.uid == resource.data.clientId
                || request.auth.uid == resource.data.providerId
                || request.auth.token.isAdmin == true;
    allow create: if false;   // Only via Cloud Function (Admin SDK, inside transaction)
    allow update: if false;
    allow delete: if false;
  }

  // Deliverables subcollection — append-only version history.
  // Each DeliverableSubmission stores clientId and providerId
  // (denormalized from parent in the Cloud Function transaction).
  match /deliverables/{deliverableId} {
    allow read: if request.auth.uid == resource.data.clientId
                || request.auth.uid == resource.data.providerId
                || request.auth.token.isAdmin == true;
    allow create: if false;   // Only via Cloud Function (Admin SDK, inside transaction)
    allow update: if false;   // Only via Cloud Function (Admin SDK)
    allow delete: if false;   // History is never deleted
  }

  // Payment history subcollection — immutable audit trail.
  // clientId and providerId are denormalized onto each PaymentRecord
  // (written atomically in the recordPayment transaction).
  // Records are append-only: update and delete are permanently denied.
  match /payment_history/{recordId} {
    allow read: if request.auth.uid == resource.data.clientId
                || request.auth.uid == resource.data.providerId
                || request.auth.token.isAdmin == true;
    allow create: if false;   // Only via Cloud Function (Admin SDK, inside transaction)
    allow update: if false;   // Immutable after creation
    allow delete: if false;   // Audit records are never deleted
  }
}

// Idempotency keys for createOnlineProject — backend-only.
// Clients never read or write this collection directly. The Cloud Function
// checks for existing keys before creating a project to prevent duplicates
// from network retries. Keys are pruned after 24 hours by a scheduled function.
match /online_project_idempotency/{idempotencyKey} {
  allow read: if false;   // Backend-only
  allow create: if false; // Only via Cloud Function (Admin SDK)
  allow update: if false;
  allow delete: if false;
}
```

### 16.2 Rationale

| Design Choice | Reason |
|---------------|--------|
| `read` gated by `clientId` / `providerId` | Matches `bookings` rule. Client and provider dashboards need real-time `onSnapshot` subscriptions — rules must allow read for participants. |
| `create`, `update`, `delete` set to `false` | All mutations go through the `onlineProjectAction` callable, which uses the Admin SDK (bypasses rules). Direct client writes would bypass state-machine enforcement, transaction guarantees, and notification dispatch. |
| `negotiations` subcollection uses denormalized `clientId`/`providerId` | Each `NegotiationOffer` document stores `clientId` and `providerId` (written atomically in the Cloud Function transaction). Rules check `resource.data` directly — zero extra document reads per rule evaluation. The backend enforces consistency: the transaction reads the parent project and copies its `clientId`/`providerId` into the offer doc, so the values are always correct at write time. |
| `deliverables` subcollection is append-only | Same pattern as `negotiations`. Deliverable submissions accumulate files and revision history across milestones. Storing them on the parent doc risks the 1MB Firestore document limit. A subcollection ensures each submission is a separate document. Rules allow read by participants, write by Cloud Function only. |
| `payment_history` subcollection is append-only | `update: if false` and `delete: if false` enforce immutability at the rules layer, not just the application layer. Even if a bug in the Cloud Function attempted to modify or delete a record, the rules would reject it (Admin SDK bypasses rules, but the function code never issues update/delete on this subcollection). Combined with the transaction-based write, this creates a tamper-evident audit trail. |
| `delete: if false` on parent | Projects are soft-deleted via status → `Cancelled`/`Declined`. Hard deletes would orphan negotiations and break audit trails. |
| `online_project_idempotency` is fully locked | Clients never read or write idempotency keys directly. The Cloud Function uses the Admin SDK (bypasses rules) to check and record keys. Locking all operations at the rules layer prevents any client-side tampering with the deduplication mechanism. |

### 16.3 Deployment

```bash
firebase deploy --only firestore:rules
```

Rules take effect immediately after deployment (no propagation delay like indexes).

---

## 17. Operational Concerns

### 17.1 Pagination Strategy

Project list queries use **limit-only pagination** (default 50), matching the existing `booking.js` pattern:

```javascript
// getClientProjects_handler
const { clientId, limit = 50 } = data;
const projectsQuery = await db.collection("online_projects")
  .where("clientId", "==", clientId)
  .orderBy("createdAt", "desc")
  .limit(limit)
  .get();

// getProviderProjects_handler
const { providerId, limit = 50 } = data;
const projectsQuery = await db.collection("online_projects")
  .where("providerId", "==", providerId)
  .orderBy("createdAt", "desc")
  .limit(limit)
  .get();
```

**Rationale**: Matches `getClientBookings_booking` and `getProviderBookings_booking` (booking.js:1306-1371). Most users will have fewer than 50 active projects. If a provider accumulates hundreds of projects, cursor-based pagination can be added in a future iteration.

**Frontend hooks**: `useOnlineProjects()` and `useProviderOnlineProjects()` pass `limit: 50` to the Cloud Function. No "Load More" UI is needed initially — the 50 most recent projects are displayed.

### 17.2 Negotiation Rate Limiting

To prevent infinite negotiation loops and stalling tactics, the spec enforces a **maximum of 10 negotiation rounds** per project.

**Implementation** (in `negotiateProject_handler` and `acceptCounterOffer_handler`):

```javascript
// Count existing offers in the negotiations subcollection
const offersSnapshot = await db.collection("online_projects")
  .doc(projectId)
  .collection("negotiations")
  .get();

if (offersSnapshot.size >= 10) {
  throw new HttpsError(
    "failed-precondition",
    "Maximum negotiation rounds (10) reached. Accept, decline, or cancel the project."
  );
}
```

**Transaction safety**: The count check must happen **inside the Firestore transaction** (using `transaction.get()`) to prevent race conditions where both parties submit a counter-offer simultaneously and both pass the check.

**User feedback**: The frontend displays "Round X of 10" in the negotiation UI. When 10 rounds are reached, the "Counter Offer" button is disabled with a tooltip: "Maximum negotiation rounds reached."

**Rationale**: Prevents abuse while allowing reasonable back-and-forth. Matches the principle of bounded negotiation in professional services.

### 17.3 Idempotency for `createOnlineProject`

To prevent duplicate projects from network retries, the client supplies an **idempotency key** (UUID) with each `createOnlineProject` request.

**Client-side** (in `useCreateOnlineProject` hook):

```typescript
import { v4 as uuidv4 } from "uuid";

const createOnlineProject = async (data: CreateOnlineProjectData) => {
  const idempotencyKey = uuidv4();
  return onlineProjectCanisterService.createOnlineProject({
    ...data,
    idempotencyKey,
  });
};
```

**Backend** (in `createOnlineProject_handler`):

```javascript
const { idempotencyKey, ...projectData } = data;

if (!idempotencyKey || typeof idempotencyKey !== "string") {
  throw new HttpsError("invalid-argument", "idempotencyKey is required");
}

// Check if this idempotency key was already used
const existingDoc = await db.collection("online_project_idempotency")
  .doc(idempotencyKey)
  .get();

if (existingDoc.exists) {
  // Validate that the caller is the same user who created the project.
  // Prevents a UUID guessing attack from returning a project the caller
  // doesn't own (extremely unlikely uuid collision, but defense-in-depth).
  if (existingDoc.data().clientId !== authInfo.uid) {
    throw new HttpsError("permission-denied",
      "Idempotency key belongs to a different user");
  }
  // Return the existing project ID instead of creating a duplicate
  return { success: true, data: { projectId: existingDoc.data().projectId } };
}

// Create the project
const projectId = generateProjectId();
await db.collection("online_projects").doc(projectId).set(newProject);

// Record the idempotency key
await db.collection("online_project_idempotency").doc(idempotencyKey).set({
  projectId,
  clientId: authInfo.uid,
  createdAt: new Date().toISOString(),
});

return { success: true, data: { projectId } };
```

**Cleanup**: A scheduled function (future) prunes `online_project_idempotency` docs older than 24 hours. Idempotency keys are short-lived — they only need to survive the network retry window.

**Rationale**: Matches industry best practices (Stripe, AWS). Prevents duplicate projects from double-taps or network timeouts. The separate `online_project_idempotency` collection avoids polluting the main `online_projects` collection with metadata.

### 17.4 Search and Filter for Project Lists

The client and provider project list pages include **search and filter UI** matching the `SharedMyBookingsPage` pattern:

**Search input**: Free-text search across:
- Project title (service name + package name)
- Client/provider name
- Brief excerpt (first 100 chars)
- Project ID

**Filter dropdowns**:
- **Status filter**: All, Active, Pending, Completed, Cancelled/Declined (matches tab structure)
- **Package filter**: Dynamically populated from the user's projects (e.g., "Logo Design", "Web Development")

**Sorting**: Programmatic (no user-facing sort control):
- Active/Pending tabs: newest first (createdAt DESC)
- Completed tab: completion date DESC
- Cancelled/Declined tab: cancellation date DESC

**Implementation**: Search and filtering happen **client-side** after fetching the 50 most recent projects. This matches the `SharedMyBookingsPage` pattern where `searchTerm` and `statusFilter` are applied in-memory to the fetched bookings array.

**Rationale**: With a 50-project limit, client-side filtering is performant and avoids additional backend complexity. If the limit increases in the future, server-side search (via Firestore queries or Algolia) can be added.

### 17.5 Optimistic UI Strategy

Since all writes go through Cloud Functions (Admin SDK), the frontend cannot optimistically update Firestore. Instead, the UI uses a **pending state pattern** to provide immediate feedback:

**Action buttons** (Accept, Decline, Submit Deliverable, etc.):
1. On click: button shows spinner, becomes disabled, text changes to "Processing..."
2. On success: button re-enables, success toast appears, data refreshes via `onSnapshot`
3. On error: button re-enables, error toast appears with retry option

**Implementation** (in hooks like `useAcceptProject`):

```typescript
const [isPending, setIsPending] = useState(false);

const acceptProject = async (projectId: string) => {
  setIsPending(true);
  try {
    await onlineProjectCanisterService.acceptProject(projectId);
    toast.success("Project accepted");
  } catch (error) {
    toast.error("Failed to accept project. Please try again.");
    throw error;
  } finally {
    setIsPending(false);
  }
};

return { acceptProject, isPending };
```

**UI components** consume `isPending`:

```tsx
<Button
  onClick={() => acceptProject(project.id)}
  disabled={isPending}
>
  {isPending ? <Spinner /> : "Accept Project"}
</Button>
```

**Rationale**: Prevents double-taps, provides immediate feedback, and avoids the complexity of optimistic updates (which would require rollback logic on Cloud Function failure). The `onSnapshot` listener ensures the UI updates as soon as the Cloud Function commits the change.

### 17.6 Data Migration for Existing Services

Existing `Service` documents in Firestore lack the `serviceMode` field. The spec treats missing `serviceMode` as `"HomeService"` (backward compatible).

**Backend queries**: When filtering services by mode, use an `in` query that includes `null`:

```javascript
// Get all HomeService services (including legacy docs without serviceMode)
const homeServicesQuery = await db.collection("services")
  .where("serviceMode", "in", ["HomeService", null])
  .get();

// Get all OnlineService services (new docs only)
const onlineServicesQuery = await db.collection("services")
  .where("serviceMode", "==", "OnlineService")
  .get();
```

**Frontend type safety**: The `Service` interface defines `serviceMode` as optional with a default:

```typescript
interface Service {
  // ... existing fields ...
  serviceMode?: "HomeService" | "OnlineService";  // Optional for legacy docs
  onlineConfig?: OnlineServiceConfig;
}

// Helper function to normalize
function getServiceMode(service: Service): "HomeService" | "OnlineService" {
  return service.serviceMode ?? "HomeService";
}
```

**No migration script**: A bulk update to add `serviceMode: "HomeService"` to all existing services is unnecessary. The `in` query handles both legacy and new documents. If a migration is desired in the future, it can be run as a one-time admin script.

**Rationale**: Avoids a risky bulk write operation. The `in` query is efficient (Firestore supports it natively). New services created after deployment will always have `serviceMode` set explicitly.

--- 

*Last updated: 2026-06-20*
