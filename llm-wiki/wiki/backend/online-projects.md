---
tags: [backend, cloud-functions, online-service]
date: 2026-06-19
sources:
  - raw/specs/OnlineService.md
related:
  - [[Booking System]]
  - [[Service Creation Workflow]]
  - [[Chat System]]
---

# Online Projects

Online/Digital Service Modes extend the SRV marketplace with product/project-based engagements (design, development, consulting, coaching) that have flexible delivery timelines, milestones, and negotiation — as opposed to single-day appointment-based home services.

## Entity Model

A new Firestore collection `online_projects/{onlineProjectId}` (with subcollection `negotiations/{offerId}`) parallels `bookings/` with a completely separate lifecycle:

- **9 statuses** (vs. 7 for bookings): Pending, Negotiating, Active, InReview, RevisionsRequested, Completed, Declined, Cancelled, Disputed
- **Revisions loop**: InReview → RevisionsRequested → Active → InReview (bookings are linear)
- **Deliverable-based**: Providers submit files, clients approve or request changes
- **Negotiation**: Structured counter-offers in `negotiations` subcollection (price, deadline, scope, revision rounds) — written inside Firestore transactions to prevent concurrent-write race conditions
- **Payment**: Manual tracking only (no escrow in beta); `amountPaid` / `paymentStatus` fields are forward-compatible with future escrow

## State Machine

```
Pending → [Active, Negotiating, Declined]
Negotiating → [Active, Declined, Cancelled]
Active → [InReview, Cancelled]
InReview → [Completed, RevisionsRequested]
RevisionsRequested → [Active (resubmit), Cancelled]
Completed → [Disputed]
Declined → [] (terminal)
Cancelled → [] (terminal)
Disputed → [] (terminal)
```

Enforced server-side via an `isValidTransition()` function matching the `booking.js` pattern.

## Cloud Function

A single callable entrypoint `onlineProjectAction` in `functions/src/onlineProject.js` handles all actions (18 actions total) via a `switch (action)` dispatch, following the same pattern as `bookingAction`, `notificationAction`, etc.

### Actions

| Action | Description |
|--------|-------------|
| `createOnlineProject` | Validates service is OnlineService + available, creates doc in Pending |
| `acceptProject` | Status → Active, sets agreed terms, does NOT create conversation (handled client-side) |
| `declineProject` | Status → Declined |
| `negotiateProject` | Creates offer doc in `negotiations` subcollection (inside transaction), status → Negotiating |
| `acceptCounterOffer` | Reads latest offer from `negotiations` subcollection (inside transaction), sets agreed terms, marks offer statuses, status → Active, does NOT create conversation (handled client-side) |
| `submitDeliverable` | Uploads files, status → InReview |
| `approveDeliverable` | If all milestones done → Completed, else stays Active for remaining |
| `requestRevisions` | Status → RevisionsRequested, decrements revisions |
| `cancelProject` | Status → Cancelled |
| `disputeProject` | Status → Disputed |
| `recordPayment` | Updates amountPaid and paymentStatus |

## Conversation Creation (Client-Side)

Unlike the original spec's assumption of `getOrCreateConversation` in the backend, conversation creation follows the **frontend-driven pattern** from booking:

1. After `acceptProject` or `acceptCounterOffer` succeeds on the client, the React hook calls `chatCanisterService.createConversation(clientId, providerId)`.
2. `createConversation` (in `src/frontend/src/services/chatCanisterService.ts:255-299`) already implements a get-or-create pattern — it queries Firestore for an existing active conversation between the two users and returns it if found, otherwise creates a new doc.
3. The backend `functions/src/chat.js` has no `createConversation` callable — it only has the `onMessageCreated` trigger for notifications.

This idempotent, client-side approach was the existing booking pattern, so online projects follow the same convention.

## Notification Dispatch

10 new notification types, following the same local `createNotification()` pattern as `booking.js`. Each lifecycle event dispatches a push + in-app notification to the relevant party (see the spec for the full dispatch table).

## Security Rules

`online_projects` and its `negotiations` subcollection follow the same `firestore.rules` pattern as `bookings`:

- **Read**: gated by `clientId` / `providerId` — participants can subscribe via `onSnapshot` for real-time dashboards. Admin override via `request.auth.token.isAdmin`.
- **Write**: all `create`, `update`, `delete` set to `false` — all mutations go through `onlineProjectAction` callable (Admin SDK, bypasses rules). This enforces state-machine validation, transaction atomicity, and notification dispatch.
- **Negotiations subcollection**: uses `get(parent doc)` check instead of storing redundant owner fields on each offer doc.
- **Soft-delete**: projects are never hard-deleted, only transitioned to terminal statuses (`Cancelled`, `Declined`).

### Rules diff (add before the default deny at line 83)

```firestore
match /online_projects/{projectId} {
  allow read: if request.auth.uid == resource.data.clientId
              || request.auth.uid == resource.data.providerId
              || request.auth.token.isAdmin == true;
  allow create: if false;
  allow update: if false;
  allow delete: if false;

  match /negotiations/{offerId} {
    allow read: if get(/databases/$(database)/documents/online_projects/$(projectId)).data.clientId == request.auth.uid
                || get(/databases/$(database)/documents/online_projects/$(projectId)).data.providerId == request.auth.uid
                || request.auth.token.isAdmin == true;
    allow create: if false;
    allow update: if false;
    allow delete: if false;
  }
}
```

## Key Files

- `functions/src/onlineProject.js` — new Cloud Function (18 actions)
- `src/frontend/src/services/onlineProjectCanisterService.ts` — API service
- `src/frontend/src/hooks/useOnlineProject.tsx` — client-side hooks
- `src/frontend/src/hooks/useProviderOnlineProject.tsx` — provider-side hooks
