---
tags: [backend, service, provider, workflow, online-services]
date: 2026-06-29
related:
  - [[Service Creation Workflow]]
  - [[Service and Booking Models]]
  - [[Service Discovery and Listing]]
  - [[Firebase Architecture]]
  - [[Online Projects]]
  - [[Grill Record: Online Services Integration]]
  - [[Service Test Infrastructure]]
sources:
  - src/frontend/src/pages/provider/services/add.tsx
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/components/provider/add service/
  - functions/src/service.js
  - functions/src/media.js
  - docs/OnlineService.md
---

# Service Creation Workflow

The end-to-end flow for a provider to create a service, from the 5-step UI wizard through Firebase Cloud Functions to a Firestore document.

## UI Flow (Provider Side)

**Entry point**: `/provider/services` → lists all services with a "+" Add button (max 5 active services enforced).

**Wizard** at `/provider/services/add` (`src/frontend/src/pages/provider/services/add.tsx`) has 6 steps rendered by dedicated components in `src/frontend/src/components/provider/add service/`:

| Step | Component | Fields Collected |
|------|-----------|-----------------|
| **0 — Service Mode (Phase 1)** | `ServiceMode.tsx` | **NEW**: Single-select `InPerson` / `Online` / `Hybrid`. Determines visibility of all subsequent steps. |
| 1 — Service Details | `ServiceDetails.tsx` | Title (1-500 chars), description (1-1000 chars), category (from Firestore `categories`, 13 total — was 10), up to 5 packages (name, description, price PHP 1–1,000,000, **type: 'Fixed' \| 'Milestone' \| 'Session'**). For Online/Hybrid services, also: `negotiable`, `allowsMilestones`, `onlineDeliveryFormat`. |
| 2 — Availability | `ServiceAvailability.tsx` | Day selection (≥1), time slots per day (validated: no overlap, start < end), same-time-for-all-days toggle. **Optional for `Online` services.** |
| 3 — Location | `ServiceLocation.tsx` | Province + City/municipality (from PH locations data), GPS toggle for coordinates, address details. **Optional for `Online` services.** |
| 4 — Images | `ServiceImageUpload.tsx` | Up to 10 service images (PNG/JPEG, 10MB max), up to 10 certificates (image/PDF, 450KB max). **Optional for `Online` services** (but recommended for trust). |
| 5 — Review & Submit | `ReviewSubmit.tsx` | Summary of all above; triggers `createService()` |

Supporting components:
- `ProgressTracker.tsx` — step indicator
- `ServiceDrafts.tsx` — localStorage autosave/restore (`service_draft` key)
- `ServiceImageUpload.tsx` — client-side compression via `mediaService.ts`
- **NEW (Phase 1)**: `PackageTypeSelector.tsx` — when adding a package, picker for `Fixed` / `Milestone` / `Session`. Reveals type-specific field editors.

### Service Mode Conditional Behavior

| Step | `InPerson` | `Online` | `Hybrid` |
|------|------------|----------|----------|
| 0 — Service Mode | selected | selected | selected |
| 1 — Service Details | base fields | + negotiable, allowsMilestones, onlineDeliveryFormat | + negotiable, allowsMilestones, onlineDeliveryFormat |
| 2 — Availability | required | **skipped/optional** | required (for in-person leg) |
| 3 — Location | required | **skipped/optional** | required (for in-person leg) |
| 4 — Images | recommended | **optional** (but recommended for trust) | recommended |
| 5 — Review & Submit | always | always | always |

The wizard's `serviceMode` selection is stored in the draft and re-validated at submit. Backwards-compatible: providers creating a service in the existing flow (without the new Step 0) will have `serviceMode='InPerson'` inferred by the backend.

## Data Flow

```
AddServicePage (form state)
  → useServiceManagement().createService(request: ServiceCreateRequest)
    → serviceCanisterService.createService(title, desc, categoryId, price, location, ...)
      → httpsCallable("serviceAction") { action: "createService", data: {...} }
        → Firebase Cloud Function: createService_service()
          → Firestore: services/{serviceId} document created
```

### Frontend → Backend Bridge

In `useServiceManagement.tsx` (lines ~489-598), images are converted `File → Uint8Array → base64` for JSON transport via `httpsCallable`. The call to `serviceCanisterService.createService()` passes individual params (not the `ServiceCreateRequest` object).

### Cloud Function: `createService_service`

**File**: `functions/src/service.js` (lines 182-354)

Validates:
- Auth exists
- Title 1-500 chars (corrected from 3-500 in Wiki Lint 2026-06-27), description 1-1000 chars
- Price ≥ 1 and ≤ 1,000,000 PHP
- Location has latitude/longitude (when required by `serviceMode`)
- Category exists in Firestore `categories` collection
- No duplicate title for this provider
- **NEW (Phase 1)**: `serviceMode`, `negotiable`, `allowsMilestones`, `onlineDeliveryFormat` are validated by `validateServiceMode()` at `service.js:161-234`
- **NEW (Phase 1)**: `weeklySchedule` is required when `serviceMode ∈ {InPerson, Hybrid}` (skipped for `Online` services). Validated inside `validateServiceMode()` at `service.js:219-226`

Then:
1. Fetches provider profile for name/avatar
2. Uploads each image via `uploadMediaInternal("ServiceImage")` from `media.js`
3. Uploads each certificate via `uploadMediaInternal("ServiceCertificate")`
4. Creates Firestore doc at `services/{autoId}`

### Firestore Document Structure

```javascript
services/{serviceId}: {
  id: string,
  providerId: string,
  providerName: string,
  providerAvatar: string,
  title: string,
  description: string,
  category: ServiceCategory,       // full embedded object (13 categories, was 10)
  price: number,                    // min price across packages
  location: Location | null,        // {lat, lng, address, city, state, country, postalCode} — null for Online-only
  status: "Available",              // initial status
  rating: null,
  reviewCount: 0,
  imageUrls: string[],
  imageMedia: MediaObject[],        // full media metadata
  certificateMedia: ServiceCertificateMedia[],
  isVerifiedService: boolean,       // true if certificates uploaded
  weeklySchedule: DaySchedule[] | null,  // null for Online services
  instantBookingEnabled: boolean,   // defaults false (backend: `instantBookingEnabled || false`)
  bookingNoticeHours: number,       // defaults null (backend: `bookingNoticeHours || null`)
  maxBookingsPerDay: number,        // defaults null (backend: `maxBookingsPerDay || null`)
  commissionFee: number,
  commissionRate: number,
  // Phase 1 — Online Services (NEW)
  serviceMode: 'InPerson' | 'Online' | 'Hybrid',   // default 'InPerson' (backfill)
  negotiable: boolean,                              // default false (backfill)
  allowsMilestones: boolean,                        // default false (backfill)
  onlineDeliveryFormat: 'live' | 'async' | 'mixed' | null,  // null for InPerson (backfill)
  createdAt: string,           // ISO 8601
  updatedAt: string,           // ISO 8601
}
```

### Service Packages (Separate Collection)

After the service document is created, the frontend creates packages in a **second** call:

```javascript
service_packages/{autoId}: {
  id: string,
  serviceId: string,
  title: string,
  description: string,
  price: number,
  type: 'Fixed' | 'Milestone' | 'Session',   // NEW (Phase 1)
  // Type-specific fields (only present for the matching type)
  // Milestone: { milestones: [{ title, description, dueDateOffsetDays, percentage }] }
  // Session: { sessionCount: number, sessionDurationMinutes: number, sessionType: 'live' | 'recorded' }
  createdAt: string,           // ISO 8601
  updatedAt: string,           // ISO 8601
}
```

**Phase 1 changes to package creation:**
- `type` field is required (defaults to `'Fixed'` for backfilled existing packages)
- For `Milestone` packages, backend validates that `milestones[].percentage` sums to exactly 100
- For `Session` packages, backend validates `sessionCount` (1–50) and `sessionDurationMinutes` (15–240)
- The package form in Step 1 reveals a type-specific field editor based on the `type` selection
- **NEW (Phase 1)**: 1–5 packages per service is now backend-enforced at `service.js:1987-1997` (`MAX_PACKAGES_PER_SERVICE = 5`). The existing UI already limited to 5; the rule is now a server-side invariant.
- **NEW (Phase 1)**: `Service.price = min(package.prices)` invariant. When a new package is created with `price < service.price`, the service's `price` is updated transactionally at `service.js:2050-2070` (re-reads `service.price` inside the transaction to prevent race-condition overwrites). 7 cases including a 2-write concurrent test verify this end-to-end in `service.online.test.js:592-770`.

## Post-Creation

- **Review**: provider is redirected to `/provider/service-details/{id}`
- **Edit**: same page allows editing all fields, managing images/certificates, toggling status
- **Archival**: `archiveService_service` sets status to `"Archived"`
- **Permanent delete**: `permanentDeleteService_service` removes the doc (plus media, certificates, and packages via `processScheduledDeletions` scheduled function at midnight)

## Key Architecture Notes

1. **Firebase-only** — despite naming (`serviceCanisterService`), no ICP canisters are involved. All data lives in Firestore.
2. **Two-phase creation** — service first, then packages in separate API calls to a different collection
3. **Commission** — `commissionFee` and `commissionRate` are set server-side during `getCommissionQuote`, not during creation
4. **Verification** — `isVerifiedService` is auto-set to `true` if ≥1 certificate was uploaded
5. **Images** — up to 10 service images; stored in Firebase Storage via `media.js` as type `"ServiceImage"`
6. **Certificates** — up to 10 certificate files; stored as type `"ServiceCertificate"`; certificates drive the verified badge
7. **Phase 1 — Online Services** — wizard gets Step 0 (serviceMode); 4 new Service fields; ServicePackage becomes 3-type discriminated union; location and weeklySchedule become optional for Online services; 3 new categories added (13 total)

## All Relevant Source Files

- `src/frontend/src/pages/provider/services.tsx` — service listing page
- `src/frontend/src/pages/provider/services/add.tsx` — creation wizard
- `src/frontend/src/pages/provider/service-details/[id].tsx` — edit/detail page
- `src/frontend/src/components/provider/add service/*.tsx` — 7 step/support components
- `src/frontend/src/hooks/serviceManagement.tsx` — `createService()` hook (~1500 lines)
- `src/frontend/src/services/serviceCanisterService.ts` — Firestore/Cloud Function calls
- `src/frontend/src/services/mediaService.ts` — image compression/validation
- `functions/src/service.js` — `createService_service` + all 20+ service actions
- `functions/src/media.js` — `uploadMediaInternal` for image/certificate storage
