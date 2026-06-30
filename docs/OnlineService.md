# Online Service Modes — Specification

**Status**: Ratified 2026-06-27
**Source decision record**: `llm-wiki/wiki/decisions/grill-2026-06-27-online-services-integration.md`
**Rollout**: Phase 1 = OnlineProject + 15 product services; Phase 2 = 5 session services + multi-session Booking extension

---

## 1. Overview

The SRV marketplace is extended with **20 new online services** across 3 new top-level categories. Online services introduce a fundamentally different engagement model from the existing in-person booking system:

| Aspect | In-Person Service | Online Service |
|---|---|---|
| Location | Required (PH province/city + GPS) | Optional |
| Schedule | Single day + time slot | Either a deadline (product) or N session dates (tutoring) |
| Engagement | Single delivery event | Product deliverable OR recurring sessions |
| Negotiation | None | Opt-in (price, deadline, scope, revisionRounds) |
| Payment | GCash escrow / Cash / SRVWallet | SRVWallet manual (product) / SRVWallet/GCash upfront (sessions) |
| Lifecycle | Booking state machine (7 statuses) | OnlineProject state machine (9 statuses) or extended Booking (7 statuses + session array) |

Online services are **delivery-mode-flexible** — a "Hybrid" service can be booked either way. Providers choose per-service.

---

## 2. The 20 Services

### 2.1 Digital & Creative Services (8)

| Service | Engagement Model | Package Type | Notes |
|---|---|---|---|
| Frontend & Backend Web Development | Product | Milestone | Phased delivery: design → build → deploy |
| UI/UX Design | Product | Milestone | Wireframes → mockups → final assets |
| CMS Management (WordPress, Shopify, Wix) | Product | Fixed | Setup, migration, or maintenance |
| IT Support & Troubleshooting | Product (online-only) | Session | Live remote help; sold as session packs |
| Video Editing | Product | Milestone | Rough cut → revisions → final cut |
| Graphic Design (Branding, Logos) | Product | Fixed | Single deliverable, revisions handled separately |
| Copywriting | Product | Fixed | One-shot articles, sales pages |
| Digital Marketing & SEO Strategy | Product | Milestone | Audit → strategy → implementation |

### 2.2 Business & SME Services (7)

| Service | Engagement Model | Package Type | Notes |
|---|---|---|---|
| Business Registration (DTI/SEC/Permits) | Product | Fixed | Document-heavy; brief includes client docs |
| Tax & Financial Consulting | Product | Fixed | Periodic consultation, advisory deliverables |
| Legal Contract Drafting | Product | Fixed | Single contract + revisions |
| Bookkeeping & Accounting | Product | Milestone | Monthly cycles; deliverable per period |
| Payroll Management | Product | Milestone | Per-payroll-cycle deliverables |
| Virtual Assistant Services | Product | Milestone | Task-based deliverables |
| Project Management | Product | Milestone | Phased: plan → execute → deliver |

### 2.3 Education & Specialized Knowledge (5)

| Service | Engagement Model | Package Type | Notes |
|---|---|---|---|
| Academic Tutoring | Session | Session | N sessions × duration |
| Business & Startup Coaching | Session | Session | N sessions × duration |
| Music & Arts Instruction | Session | Session | N sessions × duration |
| Coding & Software Training | Session | Session | N sessions × duration |
| Fitness Coaching | Session | Session | N sessions × duration |

### 2.4 Categorization

The 3 new categories are seeded into the existing Firestore `categories` collection alongside the 10 existing ones. **Total: 13 categories.**

| # | Name | Slug | Notes |
|---|---|---|---|
| 1 | Home Repairs | `home-services` | existing |
| 2 | Cleaning Services | `cleaning-services` | existing |
| 3 | Automobile Repairs | `automobile-repairs` | existing |
| 4 | Gadget Technicians | `gadget-technicians` | existing |
| 5 | Beauty Services | `beauty-services` | existing |
| 6 | Delivery and Errands | `delivery-errands` | existing |
| 7 | Massage Services | `beauty-wellness` | existing |
| 8 | Tutoring | `tutoring` | existing (in-person, retained for backwards compat) |
| 9 | Photographer | `photographer` | existing |
| 10 | Others | `others` | existing |
| **11** | **Digital & Creative Services** | `digital-creative-services` | **new** |
| **12** | **Business & SME Services** | `business-sme-services` | **new** |
| **13** | **Education & Specialized Knowledge** | `education-knowledge` | **new** |

The existing `tutoring` category (in-person) is retained; the 5 new Education services land in `education-knowledge`.

---

## 3. Engagement Models

### 3.1 Product Model (OnlineProject) — 15 services

For work that produces a deliverable over time. The full OnlineProject lifecycle applies.

### 3.2 Session Model (Multi-Session Booking) — 5 services

For recurring appointments (tutoring, coaching, instruction). Uses an extended Booking with a `scheduledSessions[]` array.

### 3.3 Model Selection

The provider picks the model when creating the service. The 20 services are pre-mapped (see §2.1–2.3 tables), but the system supports any service in any category being either model.

---

## 4. Service Entity Extensions

The `Service` document gets 4 new fields. Existing in-person services backfill with sensible defaults.

```typescript
interface Service {
  // ... existing fields ...

  // New fields (Phase 1)
  serviceMode: 'InPerson' | 'Online' | 'Hybrid';   // default: 'InPerson' (backfill)
  negotiable: boolean;                            // default: false (backfill)
  allowsMilestones: boolean;                      // default: false (backfill)
  onlineDeliveryFormat: 'live' | 'async' | 'mixed' | null;  // default: null (backfill)
}
```

### 4.1 Field Semantics

| Field | Values | Meaning |
|---|---|---|
| `serviceMode` | `InPerson` / `Online` / `Hybrid` | How the service is delivered |
| `negotiable` | `true` / `false` | Whether the client can submit a counter-offer before accept (only meaningful for online services; ignored for `InPerson`) |
| `allowsMilestones` | `true` / `false` | Whether the project supports a `milestones[]` array (typically true for product services with phased work) |
| `onlineDeliveryFormat` | `live` / `async` / `mixed` / `null` | For online services: live = real-time (e.g., tutoring, IT support); async = file-based (e.g., logo design, bookkeeping); mixed = both (e.g., coaching with homework review). `null` for in-person services. |

### 4.2 Validation Rules

- `InPerson` services: `negotiable` must be `false`, `allowsMilestones` must be `false`, `onlineDeliveryFormat` must be `null`. **Enforced server-side.**
- `Online` services: `negotiable` and `allowsMilestones` may be `true`; `onlineDeliveryFormat` must be set.
- `Hybrid` services: same as `Online` for the `negotiable`/`allowsMilestones`/`onlineDeliveryFormat` fields.
- Existing services (in-person) get backfill: `serviceMode='InPerson'`, `negotiable=false`, `allowsMilestones=false`, `onlineDeliveryFormat=null`.

### 4.3 Optional Fields for Online Services

| Field | InPerson | Online | Hybrid |
|---|---|---|---|
| `location` | Required | Optional | Required (in-person leg must have a location) |
| `weeklySchedule` | Required | Optional | Required (in-person leg must have a schedule) |
| `certificateMedia` | Recommended | Recommended (more important for online trust) | Recommended |

When `location` is omitted for online services, the frontend hides the map / location step. When `weeklySchedule` is omitted, the frontend hides the availability step.

---

## 5. ServicePackage — 3-Type Discriminated Union

`ServicePackage` keeps its existing collection and structure, with one new field: `type`.

```typescript
interface ServicePackage {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  price: number;             // PHP, 1–1,000,000
  type: 'Fixed' | 'Milestone' | 'Session';   // NEW
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
}
```

### 5.1 Type: Fixed (no extra fields)

The current behavior. A single deliverable at a flat price. No milestones, no session structure.

**Used by**: CMS Management, Graphic Design, Copywriting, Business Registration, Tax & Financial Consulting, Legal Contract Drafting.

### 5.2 Type: Milestone

```typescript
interface MilestonePackage extends ServicePackage {
  type: 'Milestone';
  milestones: Array<{
    title: string;
    description: string;
    dueDateOffsetDays: number;     // days from project acceptance
    percentage: number;            // 1–100, all milestones sum to 100
  }>;
}
```

The client pays the package price; the provider submits a deliverable per milestone; the client approves each. Percentages determine payment-release weighting (future escrow) and reporting. The sum of percentages must equal exactly 100 — backend-enforced.

**Used by**: Web Development, UI/UX Design, Video Editing, Digital Marketing & SEO, Bookkeeping & Accounting, Payroll Management, Virtual Assistant Services, Project Management.

### 5.3 Type: Session

```typescript
interface SessionPackage extends ServicePackage {
  type: 'Session';
  sessionCount: number;                       // 1–50
  sessionDurationMinutes: number;             // 15–240
  sessionType: 'live' | 'recorded';           // 'live' = real-time video; 'recorded' = pre-recorded
}
```

The `scheduledSessions[]` array on the Booking is generated from this template. The client picks N specific dates and time slots during booking. Provider confirms. Each session has its own status.

**Used by**: Academic Tutoring, Business & Startup Coaching, Music & Arts Instruction, Coding & Software Training, Fitness Coaching, IT Support & Troubleshooting.

### 5.4 Rules

- Existing 1–5 packages-per-service rule applies to all 3 types.
- A service's `price` field remains the minimum across its packages (unchanged).
- A service's `negotiable` field applies per-package-type (Milestone can be negotiated on milestone structure, Session can be negotiated on session count, Fixed on price).
- A service's `allowsMilestones` field controls whether a Fixed package can have ad-hoc milestones added by the client during brief submission. Default false for Fixed.

---

## 6. OnlineProject — Product Engagement

### 6.1 Firestore Structure

```
online_projects/{projectId}                    — project doc
online_projects/{projectId}/briefs/{briefId}   — brief doc (one per project)
online_projects/{projectId}/negotiations/{offerId}  — negotiation offers
online_projects/{projectId}/deliverables/{deliverableId}  — submitted deliverables
```

(Subcollection split between briefs/negotiations/deliverables is for transaction isolation and 1MB doc-limit safety.)

### 6.2 OnlineProject Document

```typescript
interface OnlineProject {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;            // denormalized
  serviceCategory: ServiceCategory; // denormalized
  packageId: string;
  packageType: 'Fixed' | 'Milestone' | 'Session';
  packageSnapshot: {               // snapshot at project creation
    title: string;
    description: string;
    price: number;
    type: 'Fixed' | 'Milestone' | 'Session';
    typeFields: MilestonePackage | SessionPackage | {};
  };
  title: string;                   // client-provided project title
  description: string;             // client-provided project description
  price: number;                   // agreed price (may differ from packageSnapshot.price)
  deadline: string;                // ISO 8601, client or package-suggested
  milestones: Array<{              // populated when allowsMilestones=true
    id: string;
    title: string;
    description: string;
    dueDate: string;               // ISO 8601
    percentage: number;            // 1–100, sum to 100
    status: 'Pending' | 'Submitted' | 'Approved';
    submittedAt?: string;
    approvedAt?: string;
  }>;
  briefId: string;                 // ref to briefs/{briefId}
  status: 'Pending' | 'Negotiating' | 'Active' | 'InReview' | 'RevisionsRequested' | 'Completed' | 'Declined' | 'Cancelled' | 'Disputed';
  revisionsRemaining: number;      // 0 = no more revisions
  workStarted: boolean;            // true once first deliverable submitted
  conversationId?: string;         // set when client-side createConversation runs after accept
  amountPaid: number;              // forward-compat with escrow
  paymentStatus: 'PENDING' | 'PAID_HELD' | 'RELEASED';  // forward-compat
  paymentMethod?: 'SRVWallet' | 'GCash';
  paymentId?: string;
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  declinedAt?: string;
  disputedAt?: string;
}
```

### 6.3 Project Brief Subcollection

```typescript
interface ProjectBrief {
  id: string;
  projectId: string;
  clientId: string;
  scope: string;                   // what the client wants done
  requirements: string;            // specific requirements
  attachments: Array<{
    mediaId: string;               // ref to media collection
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  suggestedPrice?: number;         // only when service.negotiable=true
  suggestedDeadline?: string;      // ISO 8601
  suggestedRevisions?: number;     // only when service.negotiable=true
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

Attachments use the new `ProjectBriefAttachment` media type (see §10). Upload is the 2-step `initProjectBriefUpload` → direct Storage upload → URL included in `createOnlineProject`.

### 6.4 Negotiation Subcollection

```typescript
interface NegotiationOffer {
  id: string;
  projectId: string;
  authorId: string;                // clientId or providerId
  authorRole: 'client' | 'provider';
  price: number;
  deadline: string;                // ISO 8601
  scope: string;
  revisionRounds: number;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Countered' | 'Superseded';
  createdAt: string;
  respondedAt?: string;
}
```

Negotiations are written inside Firestore transactions to prevent race conditions. The latest `Pending` offer is the active one; prior offers get `Superseded`.

### 6.5 Deliverables Subcollection

```typescript
interface DeliverableSubmission {
  id: string;
  projectId: string;
  milestoneId?: string;            // null for Fixed or single-deadline projects
  attachments: Array<{
    mediaId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
  }>;
  notes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewStatus: 'Pending' | 'Approved' | 'RevisionRequested';
  reviewNotes?: string;
}
```

### 6.6 State Machine

```
Pending → [Active, Negotiating, Declined]
Negotiating → [Active, Declined, Cancelled]
Active → [InReview, Cancelled]
InReview → [Completed, RevisionsRequested]
RevisionsRequested → [Active, Cancelled]
Completed → [Disputed]
Declined → [] (terminal)
Cancelled → [] (terminal)
Disputed → [] (terminal)
```

Enforced server-side via `isValidTransition()` matching the `booking.js` pattern.

### 6.7 Action List (`onlineProjectAction` callable)

| # | Action | Description |
|---|---|---|
| 1 | `createOnlineProject` | Validates service, creates project + brief in `Pending`. Requires `service.serviceMode !== 'InPerson'`. |
| 2 | `acceptProject` | `Pending` → `Active`. Sets agreed terms. Does NOT create conversation (client-side, matches booking pattern). |
| 3 | `declineProject` | `Pending` → `Declined`. |
| 4 | `negotiateProject` | Creates offer doc in `negotiations` subcollection (transaction). `Pending` → `Negotiating`. Only when `service.negotiable=true`. |
| 5 | `acceptCounterOffer` | Reads latest offer (transaction), sets agreed terms, marks offer statuses. `Negotiating` → `Active`. |
| 6 | `rejectCounterOffer` | `Negotiating` → `Declined` (when client rejects provider's last offer) or stays `Negotiating` (when provider rejects client's last offer). |
| 7 | `submitDeliverable` | Uploads files, creates doc in `deliverables` subcollection. `Active` → `InReview`. Sets `workStarted=true`. |
| 8 | `approveDeliverable` | If all milestones approved → `Completed`. Else stays `Active`. |
| 9 | `requestRevision` | `InReview` → `RevisionsRequested`. Decrements `revisionsRemaining`. |
| 10 | `cancelProject` | Either party. Validates `workStarted` for refund eligibility. Status → `Cancelled`. Reputation deduction. Auto-creates `reports` doc. |
| 11 | `disputeProject` | Either party. Status → `Disputed`. Creates `reports` doc for admin. |
| 12 | `recordPayment` | Updates `amountPaid` and `paymentStatus`. SRVWallet manual in v1. |
| 13 | `markMilestoneApproved` | For Milestone projects: client approves a single milestone. Status stays `Active` until all approved. |
| 14 | `updateMilestoneMetadata` | **Provider-only, direct Firestore write** (security rule exception). Updates `title`, `description`, `dueDate` only. Cannot modify `percentage` or `status`. |
| 15 | `getOnlineProject` | Read single project. Callable for non-participant reads (e.g., admin). |
| 16 | `listProviderOnlineProjects` | Provider's projects, paginated, status filter. |
| 17 | `listClientOnlineProjects` | Client's projects, paginated, status filter. |
| 18 | `getProjectAnalytics` | Provider stats: total, by status, revenue, average completion time. |

**Total: 18 actions.** Note: the original spec's 18 actions have been preserved; the "sub-feature negotiation" decision simplifies the action list (no separate `counterNegotiateOffer` action — `negotiateProject` is reused for both sides).

### 6.8 Negotiation Flow

```
[Pending] client submits project
         ↓
[Pending] provider reviews brief
         ↓
    provider decides:
    ├── Accept → acceptProject → [Active]
    ├── Negotiate → negotiateProject (provider's offer) → [Negotiating]
    └── Decline → declineProject → [Declined]
                              ↓
                    [Negotiating] client reviews offer
                              ↓
                         client decides:
                         ├── Accept → acceptCounterOffer → [Active]
                         ├── Counter → negotiateProject (client's counter) → [Negotiating]
                         │              ↓
                         │         [Negotiating] provider reviews counter
                         │              ↓
                         │         loops back to "client decides"
                         └── Reject → rejectCounterOffer → [Declined]
```

When `service.negotiable=false`, the `[Pending] provider decides` step skips the `Negotiate` option.

### 6.9 Deliverable Flow

```
[Active] provider works
         ↓
   submitDeliverable(milestoneId?) → [InReview]
         ↓
   client reviews deliverable
         ↓
   client decides:
   ├── Approve (all milestones) → [Completed]
   ├── Approve (some milestones) → [Active] (for remaining)
   └── Request revision → [RevisionsRequested]
                              ↓
                        provider revises
                              ↓
                        submitDeliverable → [InReview] (loops)
                        OR
                        provider decides to give up → cancelProject → [Cancelled]
```

`revisionsRemaining` is decremented on each `requestRevision`. When it hits 0, the next request triggers an auto-escalation to `Disputed` (instead of staying in the revision loop).

---

## 7. Multi-Session Booking — Session Engagement

For the 5 session-based services (Tutoring, Coaching, Music, Coding, Fitness), plus IT Support as a session-type product.

### 7.1 Booking Extension

The `Booking` document gets one new field: `scheduledSessions[]`. All other booking behavior is unchanged.

```typescript
interface Booking {
  // ... existing fields ...

  scheduledSessions?: Array<{
    id: string;                           // uuid, stable across reschedules
    date: string;                         // ISO 8601 date (YYYY-MM-DD)
    startTime: string;                    // "HH:mm"
    endTime: string;                      // "HH:mm"
    status: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'NoShow';
    completedAt?: string;                 // ISO 8601
    rescheduledFrom?: {                   // populated when this session is a reschedule
      date: string;
      startTime: string;
      endTime: string;
    };
    notes?: string;
  }>;
}
```

`scheduledSessions` is only populated when the package type is `Session`. For all existing in-person bookings, this field is `undefined`.

### 7.2 Session Lifecycle

```
Session created (Scheduled) →
  ├── Provider marks Completed → [Completed]
  ├── Either party reschedules (24h+ notice) → [Rescheduled] (new date populated, rescheduledFrom set)
  ├── Either party cancels session → [Cancelled]
  ├── No provider action within 24h after end time → [NoShow] (cron auto-marks)
  └── Either party reschedules (within 24h) → [Rescheduled] + reputation penalty on rescheduler
```

### 7.3 Booking Lifecycle (unchanged for the booking-level state)

```
Requested → Accepted → InProgress → Completed
                ↘ Declined / Cancelled
                                  ↘ Disputed
```

- Booking transitions to `InProgress` when the first session's start time passes (or when the provider marks the first session `Started` — see §7.4).
- Booking transitions to `Completed` when all sessions are `Completed` or `Cancelled`. `NoShow` sessions prevent auto-completion.
- Booking `Cancelled` from `Accepted` or `InProgress` cancels all remaining `Scheduled` sessions.

### 7.4 New Booking Actions

`bookingAction` adds 5 new actions (no new Cloud Function — dispatched via the existing `bookingAction` switch):

| # | Action | Description |
|---|---|---|
| 1 | `markSessionCompleted` | Provider marks a session `Completed`. Triggers booking-level completion check. |
| 2 | `markSessionNoShow` | Provider or client marks a session `NoShow`. |
| 3 | `rescheduleSession` | Either party. Validates 24h notice (or triggers late-reschedule reputation penalty). |
| 4 | `cancelSession` | Either party. Sets session `Cancelled`. Does not change booking status. |
| 5 | `getBookingAnalytics` (extension) | Adds per-session stats: completion rate, average attendance, etc. |

### 7.5 Reschedule Validation

The 24h rule is enforced server-side:

```javascript
const now = new Date();
const sessionStart = new Date(`${session.date}T${session.startTime}`);
const hoursUntilStart = (sessionStart - now) / (1000 * 60 * 60);
const isLate = hoursUntilStart < 24;
```

If `isLate && reschedulerRole === 'provider'`: provider's reputation is decremented (`deductReputationForLateReschedule`, new internal helper).
If `isLate && reschedulerRole === 'client'`: client's reputation is decremented.

---

## 8. Payment

### 8.1 OnlineProject (Product)

- **Method**: `SRVWallet` only in v1. `CashOnHand` is rejected server-side for `service.serviceMode !== 'InPerson'`.
- **Flow**: Manual tracking. Client transfers to provider's SRVWallet out-of-band; provider records receipt via `recordPayment` action. `amountPaid` and `paymentStatus` are forward-compatible with future escrow.
- **Release**: No escrow in v1. `paymentStatus` stays `PENDING` until admin or future logic releases it.

### 8.2 Multi-Session Booking

- **Method**: `SRVWallet` or `GCash` (no `CashOnHand` for online services).
- **Flow**: Upfront, single charge at booking creation. Amount = package price × session count.
- **Escrow**: Same as existing booking — `GCash` goes `PENDING` → `PAID_HELD` → `RELEASED` on booking completion.

### 8.3 Refund Rules (OnlineProject)

Inherit the existing cancellation policy:
- `Cancelled` from `Pending` / `Negotiating` → full refund (no work started).
- `Cancelled` from `Active` / `InReview` / `RevisionsRequested` → no refund (`workStarted=true`).
- `Disputed` → admin determines.

For multi-session bookings: refund per session if the booking itself is cancelled before any session starts. No refund for individual cancelled sessions after the first session starts.

---

## 9. Notifications

### 9.1 New Notification Types (8)

| # | Type | Trigger | Recipient |
|---|---|---|---|
| 1 | `PROJECT_CREATED` | `createOnlineProject` | Provider |
| 2 | `PROJECT_ACCEPTED` | `acceptProject` | Client |
| 3 | `PROJECT_DECLINED` | `declineProject` | Client |
| 4 | `PROJECT_NEGOTIATION_RECEIVED` | `negotiateProject` (either side) | Other party |
| 5 | `PROJECT_NEGOTIATION_ACCEPTED` | `acceptCounterOffer` | Other party |
| 6 | `DELIVERABLE_SUBMITTED` | `submitDeliverable` | Client |
| 7 | `DELIVERABLE_APPROVED` | `approveDeliverable` (full or partial) | Provider |
| 8 | `REVISION_REQUESTED` | `requestRevision` | Provider |

### 9.2 Notification Hrefs

| Type | Client href | Provider href |
|---|---|---|
| `PROJECT_CREATED` | — | `/provider/project/{id}` |
| `PROJECT_ACCEPTED` | `/client/project/{id}` | — |
| `PROJECT_DECLINED` | `/client/project/{id}` | — |
| `PROJECT_NEGOTIATION_RECEIVED` | `/client/project/{id}?tab=negotiations` | `/provider/project/{id}?tab=negotiations` |
| `PROJECT_NEGOTIATION_ACCEPTED` | `/client/project/{id}` | `/provider/project/{id}` |
| `DELIVERABLE_SUBMITTED` | `/client/project/{id}?tab=deliverables` | — |
| `DELIVERABLE_APPROVED` | — | `/provider/project/{id}?tab=deliverables` |
| `REVISION_REQUESTED` | — | `/provider/project/{id}?tab=deliverables` |

### 9.3 Multi-Session Booking Notifications

Reuse existing booking notification types (`BOOKING_*`). No new types needed. A future enhancement can add `SESSION_REMINDER` (24h before each session) but is deferred to Phase 2.

---

## 10. ProjectBriefAttachment Media Type

`ProjectBriefAttachment` is a new media type for brief uploads. It must be registered in all 6 media.js touchpoints (matching the existing `ChatAttachment` 2-step pattern).

### 10.1 Specifications

| Attribute | Value |
|---|---|
| Folder | `project-briefs/` |
| Cap | 50MB per file |
| Path | `project-briefs/{ownerId}/{mediaId}_{sanitizedFileName}` |
| Init action | `initProjectBriefUpload` (new action in `mediaAction` switch) |
| Content types | All `SUPPORTED_CONTENT_TYPES` (images, PDFs, DOC, DOCX, TXT, CSV) |

### 10.2 The 6 Touchpoints (media.js)

1. `mediaTypeFolder` in `generateFilePath()` — add `ProjectBriefAttachment → "project-briefs"`.
2. `validMediaTypes` array in `uploadMediaInternal()` — add `ProjectBriefAttachment`.
3. `validateFileSize()` function — add 50MB cap.
4. `maxSizeText` in `uploadMediaHandler()` — add "50MB for project briefs".
5. `typeBreakdown` in `getStorageStatsHandler()` — add `ProjectBriefAttachment` aggregation.
6. `SUPPORTED_CONTENT_TYPES` — already comprehensive; no change unless adding new types.

### 10.3 The 7th Touchpoint (2-step pattern)

Add a new `initProjectBriefUpload` case in the `mediaAction` switch dispatch and a dedicated handler function, matching `initChatAttachment`.

```javascript
// mediaAction switch
case 'initProjectBriefUpload': {
  const { fileName, contentType, fileSize, projectId } = data;
  // validate, generate path, return
  return { filePath, mediaId, fileName, fileType, thumbnailUrl: null };
}
```

The client then uploads directly via `uploadBytesResumable` and includes the resulting `mediaId` in `createOnlineProject`.

---

## 11. Security Rules

### 11.1 `online_projects` (revised from wiki — callable-only with documented exception)

```firestore
match /online_projects/{projectId} {
  allow read: if request.auth.uid == resource.data.clientId
              || request.auth.uid == resource.data.providerId
              || request.auth.token.isAdmin == true;
  allow create: if false;       // onlineProjectAction uses Admin SDK
  allow update: if false;       // callable-only (with documented exception below)
  allow delete: if false;       // soft-delete only via terminal statuses

  // DOCUMENTED EXCEPTION: provider-side milestone metadata writes
  // (title, description, dueDate). Cannot modify percentage or status.
  // Matches the existing updateProviderAttachments pattern in bookings.
  // Enforced by rule: even though update is "false" at the rule level,
  // the project's firestore.rules is overridden per-field via a conditional.
  // (Implementation: see onlineProject.js #14 updateMilestoneMetadata action
  //  and the corresponding firestore.rules conditional block.)
}
```

**Note**: The "documented exception" is implemented as a separate rule block for milestone metadata, NOT as a free `allow update`. The exact pattern (conditional allow with field-restricted write) is to be confirmed in implementation. The intent: providers can update milestone `title`/`description`/`dueDate` directly without a callable round-trip; everything else still requires a callable.

### 11.2 `negotiations` and `deliverables` subcollections

```firestore
match /online_projects/{projectId}/negotiations/{offerId} {
  allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
              || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
              || request.auth.token.isAdmin == true;
  allow create, update, delete: if false;
}

match /online_projects/{projectId}/deliverables/{deliverableId} {
  allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
              || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
              || request.auth.token.isAdmin == true;
  allow create, update, delete: if false;
}

match /online_projects/{projectId}/briefs/{briefId} {
  allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
              || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
              || request.auth.token.isAdmin == true;
  allow create, update, delete: if false;
}
```

### 11.3 Storage Rules

Add a new rule block for `project-briefs/{ownerId}/{file}`:

```firestore
match /project-briefs/{ownerId}/{file} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == ownerId;
}
```

(Matches the existing `chat-attachments/` pattern.)

---

## 12. Firestore Indexes (6 new)

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "online_projects",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "clientId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "online_projects",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "online_projects",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "negotiations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "services",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "serviceMode", "order": "ASCENDING" },
    { "fieldPath": "category.id", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "services",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "serviceMode", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

## 13. Provider Service Creation — Step 0

The 5-step wizard gets a new Step 0 at the start.

### 13.1 New Step 0: Service Mode

Single-select: `In-Person Service` / `Online Service` / `Hybrid Service`.

This decision affects all subsequent steps:
- **Step 1 (Service Details)**: Add fields `negotiable`, `allowsMilestones`, `onlineDeliveryFormat` (only when not in-person).
- **Step 2 (Availability)**: `weeklySchedule` is **optional** when service mode is `Online`; required for `InPerson` and `Hybrid`.
- **Step 3 (Location)**: `location` is **optional** when service mode is `Online`; required for `InPerson` and `Hybrid`.
- **Step 4 (Images)**: Unchanged.
- **Step 5 (Review & Submit)**: Unchanged.

### 13.2 ServicePackage Type Selector

In the package creation form (within Step 1), the provider picks the package type:
- `Fixed` (default)
- `Milestone` (reveals milestone editor)
- `Session` (reveals session count/duration editor)

---

## 14. Frontend Routes

### 14.1 New Client Routes

| Route | Page | Purpose |
|---|---|---|
| `/client/project/:id` | `ClientProjectDetail` | Single project view (status, brief, deliverables, milestones, negotiations) |
| `/client/projects` | `MyProjectsIndex` | List of all client projects (status tabs) |
| `/client/project/new?serviceId=...` | `CreateProject` | Brief form (title, scope, requirements, attachments, deadline, suggested price/revisions) |

### 14.2 New Provider Routes

| Route | Page | Purpose |
|---|---|---|
| `/provider/project/:id` | `ProviderProjectDetail` | Single project view |
| `/provider/projects` | `ProviderProjects` | Provider's projects (status tabs: Pending, Active, InReview, Completed) |
| `/provider/projects/delivered` | `ProviderDeliveredProjects` | Filter: completed projects (for portfolio) |

### 14.3 Modified Routes

| Route | Change |
|---|---|
| `/client/service/:id` | CTA: "Book Now" (InPerson) / "Request Project" (Online) / both (Hybrid) |
| `/client/home` | Add `serviceMode` filter (All / In-Person / Online) |
| `/client/categories/:slug` | Filter by serviceMode if category is online-capable |
| `/provider/home` | Add "Projects" top-level tab alongside "Bookings" |
| `/provider/services/add` | New Step 0: serviceMode selection |
| `/provider/service-details/:id` | New fields: serviceMode, negotiable, allowsMilestones, onlineDeliveryFormat |
| `/client/booking/:id` | Show `scheduledSessions[]` for Session-type bookings |

---

## 15. Provider Dashboard

Two top-level tabs in `/provider/home`:
- **Bookings** (existing `/provider/bookings`): all in-person bookings.
- **Projects** (new `/provider/projects`): all online projects, grouped by status (Pending, Negotiating, Active, InReview, RevisionsRequested, Completed, Declined, Cancelled, Disputed).

Notification badges are separate. The InAppNotification system dispatches both booking and project notifications through the same channel.

---

## 16. Service Discovery

- **Same `/client/home`** with a new `serviceMode` filter chip: `All` / `In-Person` / `Online`.
- **Category grid** shows all 13 categories (10 existing + 3 new). Tap a category → filtered listing.
- **Search** (`/client/search-results`) supports filtering by serviceMode and category.
- **Service detail** (`/client/service/:id`) shows the dynamic CTA based on `service.serviceMode`.

No new top-level routes for discovery. The online services are first-class citizens in the existing UI.

---

## 17. Mobile (SRV-Mobile)

**Deferred**. Web proves out Phase 1 first. SRV-Mobile does not render any online-services-related UI in Phase 1. Mobile parity is a future ticket.

---

## 18. Rollout Plan

### Phase 1 — OnlineProject (single ship)

1. Add 3 new categories to Firestore.
2. Add 4 new Service fields; backfill existing services with defaults.
3. Add `type` to `ServicePackage`; backfill existing packages with `type: 'Fixed'`.
4. Build `onlineProjectAction` Cloud Function (18 actions) in `functions/src/onlineProject.js`.
5. Register `ProjectBriefAttachment` in all 6 media.js touchpoints + add `initProjectBriefUpload` action.
6. Add 8 new notification types; add notification hrefs.
7. Add `online_projects` security rules; add storage rules for `project-briefs/`.
8. Add 6 new composite indexes.
9. Build frontend: `onlineProjectCanisterService.ts`, `useOnlineProject.tsx`, `useProviderOnlineProject.tsx`, 6 new pages.
10. Add `serviceMode` to provider service wizard (Step 0).
11. Add `serviceMode` filter to `/client/home`.
12. Add "Projects" tab to provider dashboard.
13. Modify service detail page CTA logic.
14. Update provider service-details page for new fields.
15. Ship 15 product services live.

### Phase 2 — Multi-Session Booking (post-Phase 1 validation)

1. Extend `Booking` with `scheduledSessions[]` (backfill: undefined for all existing bookings).
2. Add 5 new `bookingAction` actions: `markSessionCompleted`, `markSessionNoShow`, `rescheduleSession`, `cancelSession`, analytics extension.
3. Build frontend: extend `useBookingManagement`, add session UI components, extend `/client/booking/:id` and `/provider/booking/:id`.
4. Add `rescheduleSession` validation + `deductReputationForLateReschedule` helper.
5. Update package form for `Session` type (session count, duration, type).
6. Ship 5 session services + IT Support live.

---

## 19. Admin Tools

**No new admin tools in Phase 1.** Existing actions cover all needs:
- `adminUserAction` — suspend providers/clients for fraud.
- `feedbackAction` — handle disputes.
- `accountAction` — manage accounts.
- The existing `reports` collection receives auto-generated dispute reports from `disputeProject` and `cancelProject`.

Phase 2 may add an `adminOnlineProjectAction` callable for forced cancellation, refund, or provider reassignment. Defer until needed.

---

## 20. Implementation Notes

### 20.1 Backfill Strategy

When Phase 1 ships, all existing services get:
```javascript
{
  serviceMode: 'InPerson',
  negotiable: false,
  allowsMilestones: false,
  onlineDeliveryFormat: null,
}
```

All existing packages get:
```javascript
{
  type: 'Fixed',
}
```

A one-time Cloud Function (`backfillOnlineServiceFields` scheduled) or migration script handles the update.

### 20.2 Frontend ↔ Backend Date Conventions

- All timestamps: ISO 8601 strings (e.g., `"2026-06-27T12:34:56.789Z"`).
- Dates without time (session dates): `"YYYY-MM-DD"` strings.
- Time slots: `"HH:mm"` strings.

### 20.3 Firestore Listener Patterns

Online projects use the same `onSnapshot` pattern as bookings, with a 300ms debounce. The frontend `useOnlineProject` hook follows the same shape as `useBookingManagement`.

### 20.4 Real-Time Updates

`online_projects/{id}`, `online_projects/{id}/negotiations`, `online_projects/{id}/deliverables`, `online_projects/{id}/briefs` all support real-time subscriptions. The hook consolidates these into a single state object per project.

### 20.5 Conversation Creation (Client-Side)

Matches the booking pattern. After `acceptProject` or `acceptCounterOffer` succeeds, the React hook calls `chatCanisterService.createConversation(clientId, providerId)` which uses the get-or-create pattern client-side. Stores the result in `onlineProject.conversationId`.

---

## 21. Open Questions

- [ ] Exact `onlineProjectAction` action count: 18 confirmed in this spec, pending final review during implementation
- [ ] Wizard Step 0 placement: at the very start vs. after Step 1 (UX validation needed)
- [ ] Brief `scope` vs `requirements` distinction: one field or two? (UX validation needed)
- [ ] Deadline default: 7 days from creation when client doesn't pick?
- [ ] Notification href table: confirmed in §9.2 but routes pending implementation
- [ ] Multi-session booking reminders: `SESSION_REMINDER` notification deferred to Phase 2
- [ ] Admin tools for online services: deferred to Phase 2 or post-Phase 1
- [ ] Escrow support for OnlineProject: forward-compat fields in place; full escrow is a separate future ticket

---

## 22. Glossary

| Term | Meaning |
|---|---|
| **Product service** | An online service with a deliverable (web dev, design, bookkeeping) — uses OnlineProject |
| **Session service** | An online service with N scheduled meetings (tutoring, coaching) — uses multi-session Booking |
| **Service mode** | `InPerson`, `Online`, or `Hybrid` — how a service is delivered |
| **Brief** | The client's initial scope/requirements/attachments document for an OnlineProject |
| **Deliverable** | A file or set of files the provider submits against a project (or milestone) |
| **Milestone** | A tracked phase of a Milestone-type package with its own due date and approval |
| **Negotiation offer** | A counter-proposal in the `negotiations` subcollection (price, deadline, scope, revisions) |
| **Session** | A single scheduled meeting in a Session-type package |
| **`workStarted`** | True once the first deliverable is submitted (project) or first session's start time passes (booking) |
| **Phase 1** | The OnlineProject + 15 product services rollout |
| **Phase 2** | The multi-session Booking + 5 session services rollout |
