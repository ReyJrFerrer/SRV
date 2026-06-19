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

  // Negotiation
  negotiationHistory?: NegotiationOffer[];

  // Communication
  meetingUrl?: string;               // Placeholder — no provider integrated yet

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
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
  submittedAt: Timestamp;
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

### 2.6 Negotiation Offer

```typescript
interface NegotiationOffer {
  offeredBy: "client" | "provider";
  proposedPrice?: number;
  proposedDeadline?: string;       // ISO date
  proposedRevisionRounds?: number;
  proposedScope?: string;           // Free-text scope description
  message: string;
  createdAt: Timestamp;
  status: "Pending" | "Accepted" | "Rejected";
}
```

#### Negotiation Flow

1. Client submits request → `Pending`
2. Provider can either:
   - **Accept** → moves to `Active` with agreed terms = original
   - **Decline** → terminal
   - **Negotiate** → moves to `Negotiating`, creates `NegotiationOffer`
3. On negotiation, client sees the counter-offer and can:
   - **Accept** → moves to `Active`, sets `agreedPrice`/`agreedDeadline` from offer
   - **Counter** → appends new offer, stays in `Negotiating`
   - **Cancel** → terminal

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
    case "getClientProjects":       return getClientProjects_handler(request, data);
    case "getProviderProjects":     return getProviderProjects_handler(request, data);
    default:                        throw new HttpsError("invalid-argument", ...);
  }
});
```

### 4.3 Action Details

| Action | Validates | Mutates |
|--------|-----------|---------|
| `createOnlineProject` | Service is OnlineService + Available, provider != client, brief length, package belongs to service | Creates doc in `Pending` |
| `acceptProject` | Status is Pending or Negotiating | Sets `agreedPrice`/`agreedDeadline` from original or last offer, status → `Active`, sets `acceptedAt`, creates Conversation via `getOrCreateConversation` |
| `declineProject` | Status is Pending or Negotiating | Status → `Declined` |
| `negotiateProject` | Status is Pending or Negotiating | Appends offer to `negotiationHistory`, status → `Negotiating` |
| `acceptCounterOffer` | Status is Negotiating | Sets `agreedPrice`/`agreedDeadline` from last offer, marks all offers as accepted/rejected, status → `Active`, creates Conversation |
| `submitDeliverable` | Status is Active, revision count not exceeded | Uploads files via `uploadMediaInternal("ProjectDeliverable")`, appends to `deliverables`, status → `InReview` |
| `approveDeliverable` | Status is InReview | If all milestones approved or simple mode → status `Completed`, sets `completedAt`. Else keeps `Active` for remaining milestones. |
| `requestRevisions` | Status is InReview, revisions remaining > 0 | Sets deliverable status → `RevisionsRequested`, decrements remaining revisions, overall status → `RevisionsRequested` |
| `cancelProject` | Status is Active, InReview, RevisionsRequested, Negotiating, Pending | Status → `Cancelled` |
| `disputeProject` | Status is InReview, Completed | Status → `Disputed` |
| `recordPayment` | Provider or admin | Updates `amountPaid` and `paymentStatus` |

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

---

## 5. Media Types

### 5.1 New Media Type in `functions/src/media.js`

| Type | Purpose | Max Size |
|------|---------|----------|
| `ProjectBriefAttachment` | Reference files uploaded by client with brief | 50MB |

Storage path: `/media/{userId}/{uuid}.{ext}` (same general pattern as existing media).

### 5.2 Deliverable Uploads (Future)

Deliverable files are uploaded client-side directly to Storage (like `ChatAttachment` two-step flow), not via Cloud Function base64. The `submitDeliverable` action stores the URLs. A dedicated deliverable media type (`ProjectDeliverable`) with larger limits will be defined when the two-step upload flow is built.

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
| Package Selection | Reuse `PackagesSection.tsx` (radio, single-select) | Client picks one package |
| Project Brief | `ProjectBriefSection.tsx` (new) | Text area (50–2000 chars) + file upload (images, docs, PDFs — 50MB limit) via `ProjectBriefAttachment` |
| Timeline | `TimelineSection.tsx` (new) | Displays provider's delivery range from config. Client picks desired date within range. |
| Payment Summary | `PaymentSummarySection.tsx` (new) | Shows package price. "Payment is manually arranged" notice. |
| Review & Submit | `ReviewSubmitSection.tsx` (new) | Read-only summary + Submit button |

### 6.4 Client Project List (`/client/online-projects`)

**File**: `src/frontend/src/pages/client/online-projects.tsx`

Tabs: Active (Active, InReview, RevisionsRequested), Pending (Pending, Negotiating), Completed (Completed), Cancelled/Declined.

Cards show: project title, provider name, status badge, deadline, brief excerpt. Tap navigates to detail.

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

### New Files (12)

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

*Last updated: 2026-06-19*
