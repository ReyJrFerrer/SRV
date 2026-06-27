---
tags: [operations, lint, booking, service]
date: 2026-06-27
related:
  - [[Booking System]]
  - [[Service Creation Workflow]]
  - [[Service and Booking Models]]
  - [[Services Layer]]
  - [[Service Discovery and Listing]]
  - [[State and Hooks]]
sources:
  - functions/src/booking.js
  - functions/src/service.js
  - src/frontend/src/services/bookingCanisterService.ts
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/hooks/bookingManagement.tsx
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/hooks/serviceDetail.tsx
  - src/frontend/src/hooks/serviceInformation.tsx
  - src/frontend/src/hooks/bookRequest.tsx
  - src/frontend/src/hooks/useCachedBooking.ts
  - src/frontend/src/hooks/useProviderBookingManagement.tsx
---

# Wiki Lint 2026-06-27 — Booking & Service

Health check of all booking and service wiki pages against the actual source code as of 2026-06-27.

## Contradictions

### 1. "Callable-only mutation" claim is wrong

**Page**: `backend/booking-system.md` line 209 — "all writes go through `bookingAction` Cloud Function (no direct Firestore client writes)"

**Reality**: `bookingCanisterService.updateProviderAttachments()` (bookingCanisterService.ts:608-622) performs a **direct Firestore `updateDoc` + `arrayUnion`** write — no Cloud Function. This is a client-side mutation bypassing the callable-only rule.

### 2. Trust score gate uses `<= 5`, not `>= 5`

**Page**: `backend/booking-system.md` line 213 — "both client and provider must have trustScore >= 5"

**Reality**: `booking.js:402` and `booking.js:419` check `trustScore <= 5` and throw if true. This means scores of **exactly 5 are rejected**. The effective threshold is `trustScore > 5`, not `>= 5`. The page wording conflates the display gate (frontend shows `>= 5`) with the backend enforcement (`> 5`).

### 3. `instantBookingEnabled` defaults to `false`, not `true`

**Page**: `backend/service-creation.md` line 96 — "defaults true"

**Reality**: `service.js:341` sets `instantBookingEnabled || false` — defaults to **`false`** when not provided.

### 4. `maxBookingsPerDay` defaults to `null`, not `10`

**Page**: `backend/service-creation.md` line 97 — "defaults 10"

**Reality**: `service.js:342` sets `maxBookingsPerDay || null`.

### 5. `bookingNoticeHours` defaults to `null`, not `2`

**Page**: `backend/service-creation.md` line 98 — "defaults 2"

**Reality**: `service.js:341` sets `bookingNoticeHours || null`.

### 6. Title minimum is 1 character, not 3

**Page**: `backend/service-creation.md` line 30 — "Title (3-500 chars)"

**Reality**: `service.js:30` sets `MIN_TITLE_LENGTH = 1`. Titles as short as 1 character are valid.

## Missing Features / Documentation Gaps

### 7. `startNavigation` action undocumented

The backend `booking.js:771-862` has a `startNavigation_booking` action that:
- Sends a "Navigation Started" notification to client
- Initializes a Firebase Realtime Database node at `providerLocations/{bookingId}` with provider/client IDs
- Sets `navigationStartedNotified` flag on the booking
- Does **not** change booking status

This action is called from the frontend as `bookingCanisterService.startNavigation()` but is entirely absent from the provider actions table in `backend/booking-system.md`.

### 8. `cancelConflictingBookings` — auto-cancellation hidden feature

`booking.js:256-347` implements automatic cancellation of conflicting `Requested` bookings when a provider accepts one booking for a time slot. It:
- Finds all `Requested` bookings by the same provider/service on the same day
- Cancels overlapping ones with reason `"auto_cancelled_not_chosen"`
- Creates `BOOKING_AUTO_CANCELLED_NOT_CHOSEN` notifications

Not mentioned in any wiki page.

### 9. Cancellation reputation deduction + report generation

`booking.js:1148-1239` shows that when a booking is cancelled from `Accepted`/`InProgress`/`Requested`:
- `deductReputationForCancellationInternal(authInfo.uid)` is called
- A detailed report/ticket is created in the `reports` collection with cancellation reason, role, service name

Not documented in the wiki.

### 10. Shared booking listener pattern

`bookingCanisterService.ts:762-842` implements a unique `createSharedBookingListener` + `sharedBookingListeners` Map pattern. Multiple callbacks can subscribe to the same Firestore query without creating extra `onSnapshot` listeners. Includes lazy cleanup with 1000ms timeout. This is a notable architecture decision not documented.

### 11. `servicePackageId` / `servicePackageIds` naming duality

`bookingCanisterService.ts:154-157` — `mapBookingFields` maps `servicePackageIds` (from backend) to `servicePackageId` (legacy frontend interface). The frontend `Booking` type has both fields for compatibility:

```typescript
servicePackageId: string[];     // deprecated
servicePackageIds?: string[];
```

Not documented.

### 12. `locationDetection` field on booking

Backend `createBooking_booking` stores `locationDetection: "automatic" | "manual"` on the booking document. This is in `BookingRequest` but not in the wiki's booking document schema.

### 13. Service packages lack commission fields

`service.js:1786-1794` creates packages without `commissionFee` or `commissionRate`, but the frontend `ServicePackage` type includes both. These fields are likely added by a separate process or only exist on the frontend for display. The wiki's package document schema should note this.

### 14. `deleteService` vs `archiveService` — frontend has both

The frontend `serviceCanisterService.ts` has both `deleteService()` (action: `"deleteService"`) and `archiveService()` (action: `"archiveService"`). The wiki service-creation line 126 says "Permanent delete: `permanentDeleteService_service`" but doesn't clarify the relationship between `deleteService`, `archiveService`, and `permanentDeleteService`.

## Stale Claims

### 15. Category display order table

`frontend/service-discovery-and-landing.md` line 51 lists categories with display priority. The actual order in `initializeCategoriesDirectly` (`service.js:1589-1671`) is: Home Repairs, Cleaning, Automobile, Gadget, Beauty, Delivery, Massage, Tutoring, Photographer, Others. The category slugs in the code differ from the wiki (e.g., `"home-services"` not `"home-repairs"`, `"beauty-wellness"` not `"massage"`).

### 16. Service description max length

Wiki doesn't mention `MAX_DESCRIPTION_LENGTH = 1000` which is enforced server-side (`service.js:35`). The wizard step table only mentions title limits.

### 17. `providerId` type inconsistency

`bookingCanisterService.ts` uses `Principal` type for `providerId`/`clientId` on `Booking`, `ProviderAvailability`, etc. `serviceCanisterService.ts` uses plain `string`. The wiki shows `string` everywhere, which is correct for runtime values but misses the type-level inconsistency.

## Gaps (Concepts Without Dedicated Pages)

- **GPS Tracking Flow** — `useProviderLocationPublisher` / `useProviderLocationSubscriber` + RTDB `providerLocations/{bookingId}` is a significant feature only briefly mentioned
- **Cancellation + Reporting Flow** — The automatic report generation on cancellation
- **Firestore Security Rules pattern** — Already flagged in prior lint

## Summary

| Severity | Count |
|----------|-------|
| Contradictions | 6 |
| Missing documentation | 8 |
| Stale claims | 3 |
| Gaps | 3 |
