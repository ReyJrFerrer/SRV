---
tags: [backend, cloud-functions, online-service, online-project]
date: 2026-06-27
sources:
  - docs/OnlineService.md
  - functions/src/onlineProject.js (planned, not yet implemented)
  - src/frontend/src/services/onlineProjectCanisterService.ts (planned)
  - src/frontend/src/hooks/useOnlineProject.tsx (planned)
  - src/frontend/src/hooks/useProviderOnlineProject.tsx (planned)
related:
  - [[Booking System]]
  - [[Service Creation Workflow]]
  - [[Service and Booking Models]]
  - [[Service Discovery and Listing]]
  - [[Chat System]]
  - [[Notification System]]
  - [[Media and Images]]
  - [[Grill Record: Online Services Integration]]
---

# Online Projects

Online/Digital Service Modes extend the SRV marketplace with 20 new online services across 3 new top-level categories (Digital & Creative, Business & SME, Education & Specialized Knowledge). Supports two engagement models: product-based (deliverable + negotiation + revisions) via `OnlineProject`, and session-based (multi-session bookings) via an extended `Booking`. The canonical spec is at `docs/OnlineService.md` (ratified 2026-06-27).

> **Implementation status**: Not yet implemented in the codebase. `onlineProject.js` and the related frontend modules are scheduled for Phase 1 of the rollout. This page documents the **ratified design**, not the running code.

## Entity Model

A new Firestore collection `online_projects/{onlineProjectId}` (with 4 subcollections: `briefs/`, `negotiations/`, `deliverables/`, and direct fields) parallels `bookings/` with a separate lifecycle:

- **9 statuses** (vs. 7 for bookings): Pending, Negotiating, Active, InReview, RevisionsRequested, Completed, Declined, Cancelled, Disputed
- **Revisions loop**: InReview → RevisionsRequested → Active → InReview (bookings are linear)
- **Deliverable-based**: Providers submit files in `deliverables/` subcollection, clients approve or request changes
- **Negotiation (opt-in)**: When `service.negotiable === true`, structured counter-offers in `negotiations/{offerId}` subcollection (price, deadline, scope, revisionRounds) — written inside Firestore transactions
- **Brief-based**: Client submits a `briefs/{briefId}` doc with scope, requirements, attachments (via new `ProjectBriefAttachment` media type), and suggested price/deadline/revisions
- **Milestone support (opt-in)**: When `service.allowsMilestones === true`, project tracks `milestones[]` array with per-milestone status (Pending/Submitted/Approved)
- **Payment**: Manual tracking only via `amountPaid` / `paymentStatus` fields (forward-compatible with future escrow); `SRVWallet` only in v1
- **Multi-session bookings**: For session-type services (tutoring, coaching), the existing `Booking` gets a `scheduledSessions[]` array — see [[Booking System]] for that extension

## State Machine

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

Enforced server-side via an `isValidTransition()` function matching the `booking.js` pattern.

## Cloud Function

A single callable entrypoint `onlineProjectAction` in `functions/src/onlineProject.js` handles all 18 actions via a `switch (action)` dispatch, following the same pattern as `bookingAction`, `notificationAction`, etc.

### Actions

| # | Action | Description |
|---|--------|-------------|
| 1 | `createOnlineProject` | Validates `service.serviceMode !== 'InPerson'`, creates project + brief in Pending. Requires authenticated client with `trustScore > 5`. |
| 2 | `acceptProject` | `Pending` → `Active`. Sets agreed terms. Does NOT create conversation (handled client-side, matches booking pattern). |
| 3 | `declineProject` | `Pending` → `Declined`. |
| 4 | `negotiateProject` | Creates offer doc in `negotiations` subcollection (inside transaction). `Pending` → `Negotiating`. Only when `service.negotiable=true`. |
| 5 | `acceptCounterOffer` | Reads latest offer from `negotiations` subcollection (inside transaction), sets agreed terms, marks offer statuses. `Negotiating` → `Active`. |
| 6 | `rejectCounterOffer` | `Negotiating` → `Declined` (when client rejects provider's last offer). |
| 7 | `submitDeliverable` | Creates doc in `deliverables` subcollection. `Active` → `InReview`. Sets `workStarted=true`. |
| 8 | `approveDeliverable` | If all milestones approved → `Completed`. Else stays `Active` for remaining. |
| 9 | `requestRevision` | `InReview` → `RevisionsRequested`. Decrements `revisionsRemaining`. Auto-escalates to `Disputed` when counter hits 0. |
| 10 | `cancelProject` | Either party. Validates `workStarted` for refund eligibility. `→ Cancelled`. Reputation deduction. Auto-creates `reports` doc. |
| 11 | `disputeProject` | Either party. `→ Disputed`. Creates `reports` doc for admin. |
| 12 | `recordPayment` | Updates `amountPaid` and `paymentStatus`. SRVWallet manual in v1. |
| 13 | `markMilestoneApproved` | For Milestone projects: client approves a single milestone. Status stays `Active` until all approved. |
| 14 | `updateMilestoneMetadata` | Provider-side direct write (security rule exception, see §Security Rules). Updates `title`, `description`, `dueDate` only. |
| 15 | `getOnlineProject` | Read single project. Callable for non-participant reads. |
| 16 | `listProviderOnlineProjects` | Provider's projects, paginated, status filter. |
| 17 | `listClientOnlineProjects` | Client's projects, paginated, status filter. |
| 18 | `getProjectAnalytics` | Provider stats: total, by status, revenue, average completion time. |

> **Negotiation simplification**: The "sub-feature" decision means `negotiateProject` is reused for both sides (no separate `counterNegotiateOffer` action). When `service.negotiable=false`, the negotiation path is hidden in the UI and the backend rejects any `negotiateProject` call with `permission-denied`.

## Subcollections

### `briefs/{briefId}` — Project Brief

One brief per project, created during `createOnlineProject`. Contains scope, requirements, attachments (via `ProjectBriefAttachment` media type), and suggested price/deadline/revisions.

### `negotiations/{offerId}` — Negotiation Offers

Written inside Firestore transactions. Latest `Pending` offer is active; prior offers get `Superseded`. Four negotiable fields: `price`, `deadline`, `scope`, `revisionRounds`.

### `deliverables/{deliverableId}` — Submitted Deliverables

Provider-submitted files against a project (or a specific milestone). Includes review status (`Pending` / `Approved` / `RevisionRequested`).

## Conversation Creation (Client-Side)

Matches the booking pattern. After `acceptProject` or `acceptCounterOffer` succeeds on the client, the React hook calls `chatCanisterService.createConversation(clientId, providerId)`. `createConversation` (`src/frontend/src/services/chatCanisterService.ts:255-299`) implements a get-or-create pattern. The backend `functions/src/chat.js` has no `createConversation` callable — it only has the `onMessageCreated` trigger for notifications. The resulting `conversationId` is stored in `onlineProject.conversationId`.

## Notification Dispatch

8 new notification types follow the same local `createNotification()` pattern as `booking.js`:

| Type | Trigger | Recipient |
|---|---|---|
| `PROJECT_CREATED` | `createOnlineProject` | Provider |
| `PROJECT_ACCEPTED` | `acceptProject` | Client |
| `PROJECT_DECLINED` | `declineProject` | Client |
| `PROJECT_NEGOTIATION_RECEIVED` | `negotiateProject` | Other party |
| `PROJECT_NEGOTIATION_ACCEPTED` | `acceptCounterOffer` | Other party |
| `DELIVERABLE_SUBMITTED` | `submitDeliverable` | Client |
| `DELIVERABLE_APPROVED` | `approveDeliverable` | Provider |
| `REVISION_REQUESTED` | `requestRevision` | Provider |

See [[Notification System]] for the full href table and dispatch implementation.

## Security Rules

`online_projects` and its subcollections follow the `bookings` pattern: callable-only with one documented exception.

- **Read**: gated by `clientId` / `providerId` (and admin via `request.auth.token.isAdmin`).
- **Write**: `create`, `delete` set to `false` for all collections. `update` set to `false` by default — all mutations go through `onlineProjectAction` callable (Admin SDK bypasses rules). This enforces state-machine validation, transaction atomicity, and notification dispatch.
- **Documented exception**: provider-side direct writes to `online_projects/{id}` for milestone metadata (`title`, `description`, `dueDate` only — not `percentage` or `status`). Matches the existing `updateProviderAttachments()` precedent in `bookingCanisterService.ts:608-622`. Implemented as a per-field-conditional rule block.
- **Subcollections**: `negotiations/`, `deliverables/`, `briefs/` all use `get(parent doc)` to check participants instead of storing redundant owner fields.
- **Soft-delete**: projects are never hard-deleted, only transitioned to terminal statuses (`Cancelled`, `Declined`, `Disputed`).

### Rules diff (add before the default deny at line 83)

```firestore
match /online_projects/{projectId} {
  allow read: if request.auth.uid == resource.data.clientId
              || request.auth.uid == resource.data.providerId
              || request.auth.token.isAdmin == true;
  allow create: if false;
  allow update: if false;   // callable-only; milestone metadata exception below
  allow delete: if false;

  // Documented exception: provider can update milestone metadata
  // (title, description, dueDate) without a callable round-trip.
  // Mirrors updateProviderAttachments in bookingCanisterService.ts:608-622.
  // (Field-restricted allow block — see onlineProject.js for the exact pattern.)

  match /negotiations/{offerId} {
    allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
                || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
                || request.auth.token.isAdmin == true;
    allow create: if false;
    allow update: if false;
    allow delete: if false;
  }

  match /deliverables/{deliverableId} {
    allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
                || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
                || request.auth.token.isAdmin == true;
    allow create: if false;
    allow update: if false;
    allow delete: if false;
  }

  match /briefs/{briefId} {
    allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
                || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
                || request.auth.token.isAdmin == true;
    allow create: if false;
    allow update: if false;
    allow delete: if false;
  }
}
```

### Storage Rules

Add `project-briefs/{ownerId}/{file}` to `storage.rules` (mirroring `chat-attachments/`):

```firestore
match /project-briefs/{ownerId}/{file} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == ownerId;
}
```

## Firestore Indexes (6 new)

| # | Collection | Fields | Query Pattern |
|---|------------|--------|---------------|
| 1 | `online_projects` | `clientId` ASC + `status` ASC + `updatedAt` DESC | Client dashboard with status filter |
| 2 | `online_projects` | `providerId` ASC + `status` ASC + `updatedAt` DESC | Provider dashboard with status filter |
| 3 | `online_projects` | `status` ASC + `updatedAt` DESC | Admin analytics, all projects by status |
| 4 | `negotiations` | `createdAt` DESC | Project detail page (latest offers first) |
| 5 | `services` | `serviceMode` ASC + `category.id` ASC + `status` ASC | Category page filtered by serviceMode |
| 6 | `services` | `providerId` ASC + `serviceMode` ASC + `status` ASC | Provider's services filtered by serviceMode |

## Multi-Session Booking (Session-type services)

For the 5 session-based services (Tutoring, Coaching, Music, Coding, Fitness) and IT Support, the existing `Booking` entity is extended with `scheduledSessions[]`. This is **not** an OnlineProject — it's a separate engagement model with its own actions added to `bookingAction`. See [[Booking System#Multi-Session Booking Extension]].

The trigger for using multi-session Booking vs. OnlineProject is `package.type === 'Session'`. The provider picks the package type when creating the service. The 20 services are pre-mapped (15 product → OnlineProject, 5 session → multi-session Booking). See `docs/OnlineService.md` §2 for the full mapping.

## Rollout Phases

| Phase | Scope | Includes |
|---|---|---|
| **Phase 1** | OnlineProject + 15 product services | New categories, `serviceMode` field, ServicePackage types, `onlineProjectAction` (18 actions), `ProjectBriefAttachment`, 8 new notification types, security rules, 6 indexes, frontend routes, "Projects" tab in provider dashboard, dynamic CTA on service detail page |
| **Phase 2** | Multi-session Booking + 5 session services | `scheduledSessions[]` on Booking, 5 new `bookingAction` actions, reschedule validation, session UI, IT Support + Education services |

## Key Files

**Planned for Phase 1:**
- `functions/src/onlineProject.js` — new Cloud Function (18 actions)
- `src/frontend/src/services/onlineProjectCanisterService.ts` — API service
- `src/frontend/src/hooks/useOnlineProject.tsx` — client-side hooks
- `src/frontend/src/hooks/useProviderOnlineProject.tsx` — provider-side hooks
- `src/frontend/src/pages/client/project/` — 3 new pages (new, list, detail)
- `src/frontend/src/pages/provider/project/` — 2 new pages (list, detail)
- `src/frontend/src/components/client/project/` — brief form, deliverable viewer, milestone tracker, negotiation UI
- `src/frontend/src/components/provider/project/` — deliverable uploader, milestone editor, negotiation responder

**Modified for Phase 1:**
- `functions/src/service.js` — add 4 new fields to `createService_service` validation
- `functions/src/media.js` — register `ProjectBriefAttachment` in 6 touchpoints + add `initProjectBriefUpload` action
- `functions/src/notification.js` — add 8 new notification types and hrefs
- `firestore.rules` — add `online_projects` match block
- `firestore.indexes.json` — add 6 new composite indexes
- `storage.rules` — add `project-briefs/` match block
- `src/frontend/src/pages/provider/services/add.tsx` — add Step 0 serviceMode
- `src/frontend/src/pages/client/service/[id].tsx` — dynamic CTA logic
- `src/frontend/src/pages/provider/home.tsx` — add "Projects" tab
- `src/frontend/src/components/provider/add service/` — Step 0 component + package type selector

**Modified for Phase 2:**
- `functions/src/booking.js` — add 5 new actions + `scheduledSessions[]` handling
- `src/frontend/src/services/bookingCanisterService.ts` — session CRUD methods
- `src/frontend/src/hooks/bookingManagement.tsx` + `useProviderBookingManagement.tsx` — session UI
- `src/frontend/src/pages/client/booking/[id].tsx` + `pages/provider/booking/[id].tsx` — session list + reschedule UI

## Reference

- Canonical spec: `docs/OnlineService.md` (ratified 2026-06-27)
- Decision record: [[Grill Record: Online Services Integration]]
- 20-service list and engagement mapping: `docs/OnlineService.md` §2
- ServicePackage 3 types: `docs/OnlineService.md` §5
- 8 new notification types: `docs/OnlineService.md` §9
- `ProjectBriefAttachment` 6-touchpoint registration: `docs/OnlineService.md` §10
- Multi-session Booking extension: `docs/OnlineService.md` §7 and [[Booking System]]
