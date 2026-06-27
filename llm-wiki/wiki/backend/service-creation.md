---
tags: [backend, service, provider, workflow]
date: 2026-06-17
related:
  - [[Booking System]]
  - [[Service and Booking Models]]
  - [[Service Discovery and Listing]]
  - [[Firebase Architecture]]
sources:
  - src/frontend/src/pages/provider/services/add.tsx
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/components/provider/add service/
  - functions/src/service.js
  - functions/src/media.js
---

# Service Creation Workflow

The end-to-end flow for a provider to create a service, from the 5-step UI wizard through Firebase Cloud Functions to a Firestore document.

## UI Flow (Provider Side)

**Entry point**: `/provider/services` → lists all services with a "+" Add button (max 5 active services enforced).

**Wizard** at `/provider/services/add` (`src/frontend/src/pages/provider/services/add.tsx`) has 5 steps rendered by dedicated components in `src/frontend/src/components/provider/add service/`:

| Step | Component | Fields Collected |
|------|-----------|-----------------|
| 1 — Service Details | `ServiceDetails.tsx` | Title (1-500 chars), description (1-1000 chars), category (from Firestore `categories`), up to 5 packages (name, description, price PHP 1–1,000,000) |
| 2 — Availability | `ServiceAvailability.tsx` | Day selection (≥1), time slots per day (validated: no overlap, start < end), same-time-for-all-days toggle |
| 3 — Location | `ServiceLocation.tsx` | Province + City/municipality (from PH locations data), GPS toggle for coordinates, address details |
| 4 — Images | `ServiceImageUpload.tsx` | Up to 10 service images (PNG/JPEG, 10MB max), up to 10 certificates (image/PDF, 450KB max) |
| 5 — Review & Submit | `ReviewSubmit.tsx` | Summary of all above; triggers `createService()` |

Supporting components:
- `ProgressTracker.tsx` — step indicator
- `ServiceDrafts.tsx` — localStorage autosave/restore (`service_draft` key)
- `ServiceImageUpload.tsx` — client-side compression via `mediaService.ts`

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
- Title 3-500 chars, description present
- Price > 0
- Location has latitude/longitude
- Category exists in Firestore `categories` collection
- No duplicate title for this provider

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
  category: ServiceCategory,       // full embedded object
  price: number,                    // min price across packages
  location: Location,               // {lat, lng, address, city, state, country, postalCode}
  status: "Available",              // initial status
  rating: null,
  reviewCount: 0,
  imageUrls: string[],
  imageMedia: MediaObject[],        // full media metadata
  certificateMedia: ServiceCertificateMedia[],
  isVerifiedService: boolean,       // true if certificates uploaded
  weeklySchedule: DaySchedule[],
  instantBookingEnabled: boolean,   // defaults false (backend: `instantBookingEnabled || false`)
  bookingNoticeHours: number,       // defaults null (backend: `bookingNoticeHours || null`)
  maxBookingsPerDay: number,        // defaults null (backend: `maxBookingsPerDay || null`)
  commissionFee: number,
  commissionRate: number,
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
  createdAt: string,           // ISO 8601
  updatedAt: string,           // ISO 8601
}
```

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
