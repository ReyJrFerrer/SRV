---
tags: [backend, booking, state-machine, workflow]
date: 2026-06-27
related:
  - [[Service Creation Workflow]]
  - [[Service and Booking Models]]
  - [[Service Discovery and Listing]]
  - [[Firebase Architecture]]
  - [[Online Projects]]
  - [[Grill Record: Online Services Integration]]
sources:
  - functions/src/booking.js
  - src/frontend/src/services/bookingCanisterService.ts
  - src/frontend/src/hooks/bookRequest.tsx
  - src/frontend/src/hooks/bookingManagement.tsx
  - src/frontend/src/pages/client/book/[id].tsx
  - src/frontend/src/pages/client/booking/
  - docs/OnlineService.md
---

# Booking System

The complete lifecycle of a booking, from client service discovery through booking creation, status transitions, payment, and completion.

## Booking Creation Flow

### Step 1: Service Discovery

Client discovers services through:
- **Home page** (`/client/home`) — category grid + service rows (real-time Firestore subscription)
- **Search** (`/client/search-results?q=...`) — client-side text/price/rating filtering
- **Category page** (`/client/categories/:slug`) — filtered by category
- **View all** (`/client/service/view-all`) — full listing

### Step 2: Service Detail → Book Now

`/client/service/:id` (`src/frontend/src/pages/client/service/[id].tsx`):
- Shows: service info, provider info, packages, availability schedule, reviews
- **"Book Now" button** navigates to `/client/book/:serviceId`
- Gated by reputation: both client and provider must have `trustScore >= 5`
- Disabled if: no packages, own service, inactive service, low reputation

### Step 3: Booking Form (`/client/book/:id`)

Six sections rendered by dedicated components in `src/frontend/src/components/client/book/`:

| Section | Component | Fields |
|---------|-----------|--------|
| Package Selection | `PackagesSection.tsx` | Checkbox selection of ≥1 package |
| Schedule | `ScheduleSection.tsx` | Same-day vs scheduled toggle, date picker, time slot picker |
| Location | `ServiceLocationSection.tsx` | Google Maps pin or manual address entry |
| Payment | `PaymentSection.tsx` | Cash (with "change for"), GCash (disabled placeholder), SRVWallet |
| Problem Proof | `MediaAttachmentSection.tsx` | Photo/video uploads (for repair categories) |
| Notes | `NotesSection.tsx` | Optional note (50 char limit) |

Auto-saves draft to localStorage (`booking_draft_v1_<serviceId>`).

### Step 4: Submit

`handleConfirmBooking()` in `book/[id].tsx`:

```
  If GCash:
    → createDirectPayment() → GCash invoice URL → redirect to /payment-pending
      → polls checkInvoiceStatus() every 10s → on PAID/SETTLED → createBookingRequest()
  If Cash/Direct:
    → upload problem proof media → createBookingRequest()
      → bookingCanisterService.createBooking()
        → httpsCallable("bookingAction") { action: "createBooking" }
```

### Step 5: Cloud Function — `createBooking_booking`

**File**: `functions/src/booking.js` (lines ~500-540)

Validates:
- Auth, reputation scores ≥ 5 (both parties)
- Service exists, is active (`status === "Available"`), belongs to specified provider
- Package IDs are valid, belong to this service
- No time-slot conflicts (`checkBookingConflicts()`)
- Schedule is in the future, matches provider's availability window

Creates Firestore document:

```javascript
bookings/{bookingId}: {
  id: string,
  clientId: string,
  providerId: string,
  providerName: null,              // populated asynchronously
  serviceId: string,
  servicePackageIds: string[],
  status: "Requested",             // initial state
  requestedDate: string,           // ISO timestamp
  scheduledDate: string,           // requested service date/time
  startedDate: null,
  completedDate: null,
  price: number,                   // sum of selected package prices
  amountPaid: number | null,
  serviceTime: null,
  location: Location,
  evidence: null,
  attachments: string[],           // problem proof media URLs
  notes: string | null,
  paymentMethod: "CashOnHand" | "GCash" | "SRVWallet",
  locationDetection: "automatic" | "manual",  // how client location was captured
  navigationStartedNotified: false | true,     // set by startNavigation
  paymentStatus: "PENDING" | "PAID_HELD",  // PAID_HELD if GCash
  paymentId: string | null,        // GCash payment reference
  heldAmount: number | null,
  releasedAmount: null,
  paymentReleased: null,
  releasedAt: null,
  payoutId: null,
  createdAt: string,           // ISO 8601
  updatedAt: string,           // ISO 8601
}
```

Creates in-app notification for provider (`NEW_BOOKING_REQUEST`).

## Booking State Machine

### Valid Statuses

| Status | Description | Entered By |
|--------|-------------|------------|
| `Requested` | Initial state | Client (on create) |
| `Accepted` | Provider accepted | Provider |
| `Declined` | Provider declined | Provider |
| `Cancelled` | Either party cancelled | Client or Provider |
| `InProgress` | Provider started work | Provider |
| `Completed` | Provider finished | Provider |
| `Disputed` | Either party disputes | Client or Provider |

### Valid Transitions

```
Requested → [Accepted, Declined, Cancelled]
Accepted → [InProgress, Cancelled]
InProgress → [Completed, Disputed, Cancelled]
Completed → [Disputed]
Declined → []            (terminal)
Cancelled → []           (terminal)
Disputed → []            (terminal)
```

Enforced in `functions/src/booking.js` (lines 75-86) — any transition not in this map is rejected.

### Scheduled State Transitions

| Cron | Function | Action |
|------|----------|--------|
| Daily midnight (`0 0 * * *`) | `cancelMissedBookings` | Cancels `Accepted` bookings past their scheduled time; cancels expired `Requested` bookings |
| Every 10 min (`*/10 * * * *`) | `sendServiceReminders` | Sends push/notification reminders for bookings starting ~30 min |

## Payment Status Lifecycle

```
PENDING → (GCash payment received) → PAID_HELD → (admin/auto release) → RELEASED
```

- **PENDING**: Cash on hand (no digital payment) or GCash pending
- **PAID_HELD**: GCash payment confirmed, held in escrow
- **RELEASED**: Funds released to provider (via `releasePayment` action — admin or automated)

## Provider Booking Actions

All via `bookingAction` Cloud Function:

| Action | Endpoint | What It Does |
|--------|----------|--------------|
| `acceptBooking` | `bookingAction` | Validates transition Requested→Accepted, creates notification for client |
| `declineBooking` | `bookingAction` | Validates transition Requested→Declined |
| `cancelBooking` | `bookingAction` | Either party: transitions to Cancelled from Requested/Accepted/InProgress. Deducts reputation via `deductReputationForCancellationInternal`. Auto-creates `reports` doc with cancellation details. |
| `startNavigation` | `bookingAction` | **Status-neutral** — sends notification, initializes RTDB `providerLocations/{bookingId}` node for GPS tracking |
| `startService` | `bookingAction` | Transition Accepted→InProgress; marks startedDate; cleans up RTDB node |
| `completeService` | `bookingAction` | Transition InProgress→Completed; provider marks job done; sends review reminders |
| `releasePayment` | `bookingAction` | Admin action: releases held GCash funds to provider |
| `getBookingAnalytics` | `bookingAction` | Provider booking statistics |

## Client Booking Actions

| Action | Endpoint | What It Does |
|--------|----------|--------------|
| `clientCancelBooking` | `bookingAction` | Client cancels (with rules per status) |
| `disputeBooking` | `bookingAction` | Client disputes a completed booking |

## Phase 1 — Online Service Validation

Phase 1 of the Online Services rollout changes the **validation rules** for the existing `createBooking` action:

- **Service mode check**: `createBooking` rejects services where `service.serviceMode === 'Online'` (those use `createOnlineProject` instead). Hybrid services are allowed.
- **Payment method check**: `createBooking` rejects `paymentMethod === 'CashOnHand'` when `service.serviceMode !== 'InPerson'`. Online and Hybrid services must use `SRVWallet` or `GCash`.
- **ScheduledSessions handling**: When the booked `service_package.type === 'Session'`, `createBooking` requires `scheduledSessions` in the `BookingRequest` with one entry per `sessionCount`. Backend validates count matches, sessions are in the future, and times don't overlap with provider's availability.

## Phase 1 — Online Service Payment Rules

| Service Mode | Allowed Payment Methods | CashOnHand |
|---|---|---|
| `InPerson` | `CashOnHand`, `GCash`, `SRVWallet` | ✓ |
| `Online` | `SRVWallet` (manual) only for product; `SRVWallet` or `GCash` for sessions | ✗ |
| `Hybrid` | `SRVWallet` or `GCash` (in-person leg can use CashOnHand) | ✗ |

The reputation gate (trustScore > 5) and the existing conflict detection (no time-slot overlap) continue to apply to online and hybrid bookings.

## Real-Time Subscriptions

- **Client**: `useBookingManagement()` → `bookingCanisterService.subscribeToClientBookings()` → Firestore `onSnapshot` on `bookings` where `clientId == currentUser` (300ms debounce)
- **Provider**: `useProviderBookingManagement()` → similar subscription filtered by `providerId`
- Both streams enrich raw bookings with provider profile, service details, and package details

## Post-Booking Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/client/booking/confirmation` | `BookingConfirmation` | "Request Sent!" summary |
| `/client/booking/payment-pending` | `PaymentPending` | GCash payment polling (10s interval) |
| `/client/booking` | `MyBookingsIndex` | List of all client bookings (grouped by status tabs) |
| `/client/booking/:id` | `BookingDetailPage` | Single booking detail + progress tracker + action buttons |
| `/client/booking/receipt/:id` | `BookingReceipt` | Completed booking receipt |
| `/client/tracking/:bookingId` | `TrackingPage` | Real-time provider GPS tracking map |
| `/provider/bookings` | `ProviderBookings` | Provider booking dashboard |
| `/provider/booking/:id` | `ProviderBookingDetail` | Single provider booking detail |
| `/provider/active-service/:bookingId` | `ProviderActiveService` | Active service management |
| `/provider/complete-service/:bookingId` | `ProviderCompleteService` | Service completion flow |
| `/provider/directions/:bookingId` | `ProviderDirections` | Navigation to client location |

## Hidden / Undocumented Features

### `startNavigation` Action

`booking.js:771-862` — does **not** change booking status. Called by the provider before `startBooking`:
- Sends `START_NAVIGATION` notification to client
- Initializes Firebase Realtime Database node at `providerLocations/{bookingId}` with provider/client IDs
- Sets `navigationStartedNotified: true` flag on booking

### `cancelConflictingBookings`

When a provider **accepts** one booking (`Accept` transition), all other `Requested` bookings for the same provider/service/day that overlap with the accepted time slot are **automatically cancelled** with reason `"auto_cancelled_not_chosen"`. Creates `BOOKING_AUTO_CANCELLED_NOT_CHOSEN` notifications for affected clients.

### Cancellation Reputation Deduction + Report

`booking.js:1148-1239` — when cancelled from `Accepted`/`InProgress`/`Requested`:
- `deductReputationForCancellationInternal(authInfo.uid)` is called on the canceller
- A detailed report is auto-created in the `reports` collection with cancellation reason, role, service name, and user info

### Shared Booking Listener Pattern

`bookingCanisterService.ts:762-842` — `createSharedBookingListener` + `sharedBookingListeners` Map. Multiple React components can subscribe to the same Firestore query without creating extra `onSnapshot` listeners. Deduplicates by `listenerId` (`client-{clientId}`, `provider-{providerId}`, `status-{status}`, `booking-{bookingId}`). Cleanup uses a 1000ms timeout before removing the underlying listener.

### `servicePackageId` / `servicePackageIds` Duality

`bookingCanisterService.ts:154-157` — backend returns `servicePackageIds`, frontend legacy interface uses `servicePackageId`. The `mapBookingFields` function bridges them:

```typescript
servicePackageId: booking.servicePackageIds || booking.servicePackageId || [],
```

## Multi-Session Booking Extension (Phase 2)

> **Status**: Phase 2 of the Online Services rollout. Not yet implemented in the codebase. Triggered by `service_package.type === 'Session'`. See `docs/OnlineService.md` §7 and [[Grill Record: Online Services Integration]] for the canonical design.

The existing `Booking` entity is extended with `scheduledSessions[]` to support session-based services (Tutoring, Coaching, Music Instruction, Coding Training, Fitness Coaching, IT Support & Troubleshooting). All other booking behavior is unchanged.

### `scheduledSessions` Field

```typescript
interface ScheduledSession {
  id: string;                       // uuid, stable across reschedules
  date: string;                     // ISO 8601 date (YYYY-MM-DD)
  startTime: string;                // "HH:mm"
  endTime: string;                  // "HH:mm"
  status: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'NoShow';
  completedAt?: string;             // ISO 8601
  rescheduledFrom?: {               // populated when this session is a reschedule
    date: string;
    startTime: string;
    endTime: string;
  };
  notes?: string;
}
```

The field is `undefined` for all existing in-person bookings. It's populated only when the booked `service_package.type === 'Session'`.

### Session-Level Lifecycle

```
Session created (Scheduled)
  ├── Provider marks Completed → [Completed]
  ├── Either party reschedules (24h+ notice) → [Rescheduled] (new date populated, rescheduledFrom set)
  ├── Either party cancels session → [Cancelled]
  ├── No provider action within 24h after end time → [NoShow] (cron auto-marks)
  └── Either party reschedules (within 24h) → [Rescheduled] + reputation penalty on rescheduler
```

### Booking-Level Lifecycle (unchanged for session bookings)

The 7-status booking state machine is unchanged. Two transition rules are added for session bookings:

- **Booking transitions to `InProgress`** when the first session's start time passes (auto) OR when the provider manually marks the first session `Started` (future enhancement).
- **Booking transitions to `Completed`** when all sessions are `Completed` or `Cancelled`. `NoShow` sessions prevent auto-completion (booking stays in `InProgress` until resolved).
- **Booking `Cancelled`** from `Accepted` / `InProgress` cancels all remaining `Scheduled` sessions.

### New Booking Actions (5)

`bookingAction` adds 5 new actions (no new Cloud Function — dispatched via the existing `bookingAction` switch):

| # | Action | Description |
|---|--------|-------------|
| 1 | `markSessionCompleted` | Provider marks a session `Completed`. Triggers booking-level completion check. |
| 2 | `markSessionNoShow` | Provider or client marks a session `NoShow`. |
| 3 | `rescheduleSession` | Either party. Validates 24h notice (or triggers late-reschedule reputation penalty). |
| 4 | `cancelSession` | Either party. Sets session `Cancelled`. Does not change booking status. |
| 5 | `getBookingAnalytics` (extension) | Adds per-session stats: completion rate, average attendance, etc. |

### Reschedule Validation (24h rule)

Enforced server-side in the `rescheduleSession` action:

```javascript
const now = new Date();
const sessionStart = new Date(`${session.date}T${session.startTime}`);
const hoursUntilStart = (sessionStart - now) / (1000 * 60 * 60);
const isLate = hoursUntilStart < 24;
```

- If `isLate && reschedulerRole === 'provider'`: provider's reputation is decremented via the new `deductReputationForLateReschedule` internal helper
- If `isLate && reschedulerRole === 'client'`: client's reputation is decremented
- If `!isLate`: no reputation impact

### Frontend Hook Extensions

- `useBookingManagement.tsx` and `useProviderBookingManagement.tsx` add session UI components
- `/client/booking/:id` and `/provider/booking/:id` show `scheduledSessions[]` as a list with status badges
- Per-session reschedule, complete, no-show, and cancel actions

### Payment Model (Phase 2)

- **Method**: `SRVWallet` or `GCash` only. `CashOnHand` is rejected server-side for online services.
- **Flow**: Upfront, single charge at booking creation. Amount = package price × session count.
- **Escrow**: Same as existing booking — `GCash` goes `PENDING` → `PAID_HELD` → `RELEASED` on booking completion.
- **Refund**: Per session if the booking itself is cancelled before any session starts. No refund for individual cancelled sessions after the first session starts.

## Key Architecture Notes

1. **Firestore-native** — all booking data lives in Firestore's `bookings` collection; no ICP canisters
2. **Almost callable-only mutation** — most writes go through `bookingAction` Cloud Function, but `updateProviderAttachments()` uses direct Firestore `updateDoc` + `arrayUnion` client-side (`bookingCanisterService.ts:608-622`)
3. **Real-time reads** — Firestore `onSnapshot` subscriptions for booking lists and detail pages
4. **Payment is separate** — GCash flow (directPay) is independent of booking creation; only `createBookingRequest` ties them together
5. **Draft auto-save** — booking form saves/restores drafts from localStorage
6. **Reputation gate** — both client and provider must have trustScore **above** 5 (backend rejects `trustScore <= 5`; frontend gate uses `>= 5`)
7. **No service-level booking limits** — `maxBookingsPerDay` on service exists but not enforced in booking creation v1
8. **Phase 2 multi-session extension** — `scheduledSessions[]` array on Booking entity enables session-based services (tutoring, coaching, etc.); 5 new `bookingAction` actions added; 24h reschedule rule with reputation penalty; `CashOnHand` rejected for online services
