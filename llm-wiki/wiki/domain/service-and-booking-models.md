---
tags: [domain, models, types, entities]
date: 2026-06-27
related:
  - [[Service Creation Workflow]]
  - [[Booking System]]
  - [[Service Discovery and Listing]]
  - [[Online Projects]]
  - [[Grill Record: Online Services Integration]]
sources:
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/services/bookingCanisterService.ts
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/hooks/bookRequest.tsx
  - functions/src/service.js
  - functions/src/booking.js
  - docs/OnlineService.md
---

# Service and Booking Models

Core domain entities for the service marketplace: Service, ServicePackage, Booking, OnlineProject, and supporting types.

> **Phase 1 (Online Services) update**: The Service entity gets 4 new fields (`serviceMode`, `negotiable`, `allowsMilestones`, `onlineDeliveryFormat`), ServicePackage becomes a 3-type discriminated union (`Fixed` / `Milestone` / `Session`), 3 new top-level categories are added, and the Booking entity gets `scheduledSessions[]` for multi-session engagements. See `docs/OnlineService.md` for the canonical spec.

## Service

### Frontend Type (`src/frontend/src/services/serviceCanisterService.ts`)

```typescript
interface Service {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  commissionFee: number;
  commissionRate: number;
  location: Location;
  status: ServiceStatus;         // "Available" | "Suspended" | "Unavailable" | "Archived"
  rating?: number;
  reviewCount: number;
  imageUrls: string[];
  certificateMedia: ServiceCertificateMedia[];
  isVerifiedService: boolean;
  weeklySchedule?: DaySchedule[];
  instantBookingEnabled?: boolean;
  bookingNoticeHours?: number;
  maxBookingsPerDay?: number;
  createdAt: any;              // ISO 8601 string from backend; Firestore Timestamp from direct reads
  updatedAt: any;              // ISO 8601 string from backend; Firestore Timestamp from direct reads
  // Phase 1 — Online Services (NEW)
  serviceMode: 'InPerson' | 'Online' | 'Hybrid';   // default 'InPerson' for backfilled services
  negotiable: boolean;                            // default false; meaningful for Online/Hybrid
  allowsMilestones: boolean;                      // default false; meaningful for product services
  onlineDeliveryFormat: 'live' | 'async' | 'mixed' | null;  // null for InPerson
  // Runtime-enriched fields:
  providerName?: string;
  distance?: number;
  priceDisplay?: string;
  totalAmount?: number;
}
```

### Service Statuses

| Status | Meaning |
|--------|---------|
| `Available` | Active and bookable |
| `Suspended` | Temporarily disabled (admin action) |
| `Unavailable` | Provider marked unavailable |
| `Archived` | Provider archived (permanently hidden) |

### Status Transitions (Service Lifecycle)

```
Created → Available ←→ Suspended (admin toggle)
Available → Unavailable (provider toggle)
Available → Archived (provider archives, max 5 active)
Suspended → Available (admin reinstates)
Archived → (no return — permanent; can be restored via restoreService)
```

### Service Category

```typescript
interface ServiceCategory {
  id: string;
  name: string;         // e.g. "Home Repairs"
  slug: string;         // e.g. "home-repairs"
  description: string;
  imageUrl: string;
  parentId?: string;
}
```

13 predefined categories (10 existing + 3 new for online services, seeded in Firestore by `initializeCategoriesDirectly` in `service.js:1589-1671`):

| # | Name | Slug | Notes |
|---|------|------|-------|
| 1 | Home Repairs | `home-services` | existing |
| 2 | Cleaning Services | `cleaning-services` | existing |
| 3 | Automobile Repairs | `automobile-repairs` | existing |
| 4 | Gadget Technicians | `gadget-technicians` | existing |
| 5 | Beauty Services | `beauty-services` | existing |
| 6 | Delivery and Errands | `delivery-errands` | existing |
| 7 | Massage Services | `beauty-wellness` | existing |
| 8 | Tutoring | `tutoring` | existing (in-person, retained) |
| 9 | Photographer | `photographer` | existing |
| 10 | Others | `others` | existing |
| **11** | **Digital & Creative Services** | `digital-creative-services` | **NEW** (Phase 1) |
| **12** | **Business & SME Services** | `business-sme-services` | **NEW** (Phase 1) |
| **13** | **Education & Specialized Knowledge** | `education-knowledge` | **NEW** (Phase 1) |

### ServiceMode Field Semantics (Phase 1)

| Field | Values | Meaning |
|---|---|---|
| `serviceMode` | `InPerson` / `Online` / `Hybrid` | How the service is delivered |
| `negotiable` | `true` / `false` | Whether the client can submit a counter-offer before accept (only meaningful for online services) |
| `allowsMilestones` | `true` / `false` | Whether the project supports a `milestones[]` array (typically true for product services with phased work) |
| `onlineDeliveryFormat` | `live` / `async` / `mixed` / `null` | For online services: live = real-time; async = file-based; mixed = both. `null` for in-person services |

**Validation rules** (enforced server-side in `createService_service`):
- `InPerson` services: `negotiable=false`, `allowsMilestones=false`, `onlineDeliveryFormat=null` (all forced)
- `Online` / `Hybrid` services: `negotiable` and `allowsMilestones` may be `true`; `onlineDeliveryFormat` must be set
- Existing services (in-person) get backfill: `serviceMode='InPerson'`, `negotiable=false`, `allowsMilestones=false`, `onlineDeliveryFormat=null`

### Optional Fields by ServiceMode (Phase 1)

| Field | `InPerson` | `Online` | `Hybrid` |
|---|---|---|---|
| `location` | Required | Optional | Required (in-person leg must have a location) |
| `weeklySchedule` | Required | Optional | Required (in-person leg must have a schedule) |
| `certificateMedia` | Recommended | Recommended (more important for online trust) | Recommended |

When `location` is omitted for online services, the frontend hides the map / location step. When `weeklySchedule` is omitted, the frontend hides the availability step.

### Location

```typescript
interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

### Service Certificate Media

```typescript
interface ServiceCertificateMedia {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  mediaType: "ServiceCertificate";
  ownerId: string;
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  validationStatus?: "Pending" | "Validated" | "Rejected";
}
```

## ServicePackage — 3-Type Discriminated Union (Phase 1)

`ServicePackage` keeps its existing collection and structure with one new field: `type`. The `type` field unlocks per-type schemas and UI.

```typescript
interface ServicePackageBase {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  price: number;          // PHP, 1–1,000,000
  commissionFee: number;       // frontend type — NOT set by createServicePackage_service
  commissionRate: number;      // frontend type — NOT set by createServicePackage_service
  type: 'Fixed' | 'Milestone' | 'Session';   // NEW (Phase 1)
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  // Runtime:
  totalAmount?: number;
}

// Type: Fixed — no extra fields
interface ServicePackageFixed extends ServicePackageBase {
  type: 'Fixed';
}

// Type: Milestone — phased delivery with tracked milestones
interface ServicePackageMilestone extends ServicePackageBase {
  type: 'Milestone';
  milestones: Array<{
    title: string;
    description: string;
    dueDateOffsetDays: number;     // days from project acceptance
    percentage: number;            // 1–100, all milestones sum to 100
  }>;
}

// Type: Session — multi-session booking template
interface ServicePackageSession extends ServicePackageBase {
  type: 'Session';
  sessionCount: number;            // 1–50
  sessionDurationMinutes: number;  // 15–240
  sessionType: 'live' | 'recorded';
}

type ServicePackage = ServicePackageFixed | ServicePackageMilestone | ServicePackageSession;
```

**Note**: The backend `createServicePackage_service` (`service.js:1786-1794`) does **not** set `commissionFee` or `commissionRate` on packages. These fields exist only in the frontend type for display purposes.

**Rules** (extended for Phase 1):
- 1–5 packages per service (unchanged)
- Names must be unique within a service (unchanged)
- Service's `price` field = minimum across all packages (unchanged)
- **NEW**: For `Milestone` packages, `milestones[].percentage` must sum to exactly 100 — backend-enforced
- **NEW**: For `Session` packages, `sessionCount` (1–50) and `sessionDurationMinutes` (15–240) are required
- **NEW**: For `Session` packages, `scheduledSessions[]` is generated on the Booking when the client picks dates
- **NEW**: When `service.negotiable=true`, the client can negotiate `price`, `deadline`, `scope`, and `revisionRounds` before accept
- **NEW**: `type` defaults to `'Fixed'` for backfilled existing packages

### Which Services Use Which Type (Phase 1)

| Type | Services |
|------|----------|
| `Fixed` | CMS Management, Graphic Design, Copywriting, Business Registration, Tax & Financial Consulting, Legal Contract Drafting |
| `Milestone` | Web Development, UI/UX Design, Video Editing, Digital Marketing & SEO, Bookkeeping & Accounting, Payroll Management, Virtual Assistant Services, Project Management |
| `Session` | Academic Tutoring, Business & Startup Coaching, Music & Arts Instruction, Coding & Software Training, Fitness Coaching, IT Support & Troubleshooting |

## Schedule & Availability

```typescript
type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type ServiceStatus = "Available" | "Suspended" | "Unavailable" | "Archived";

interface TimeSlot {
  startTime: string;      // "HH:mm" format
  endTime: string;
}

interface DayAvailability {
  isAvailable: boolean;
  slots: TimeSlot[];
}

interface ProviderAvailability {
  providerId: string;           // string in serviceCanisterService.ts, Principal in bookingCanisterService.ts
  isActive: boolean;
  instantBookingEnabled: boolean;
  bookingNoticeHours: number;
  maxBookingsPerDay: number;
  weeklySchedule: Array<{
    day: DayOfWeek;
    availability: DayAvailability;
  }>;
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
}
```

> **Phase 1**: `weeklySchedule` is optional for `Online` services. Backend validation skips the schedule check when `service.serviceMode === 'Online'`.

## Booking (extended for Phase 2 — multi-session)

### Frontend Type (`src/frontend/src/services/bookingCanisterService.ts`)

```typescript
interface Booking {
  id: string;
  clientId: string;             // Principal type in service, string at runtime
  providerId: string;           // Principal type in service, string at runtime
  serviceId: string;
  servicePackageId: string[];     // deprecated — frontend legacy alias
  servicePackageIds?: string[];   // actual backend field; bridged by mapBookingFields (bookingCanisterService.ts:154-157)
  status: BookingStatus;
  requestedDate: string;
  scheduledDate: string;
  startedDate?: string;
  completedDate?: string;
  price: number;
  amountPaid?: number;
  serviceTime?: number;
  location: Location;
  evidence?: Evidence;
  attachments?: string[];
  providerAttachments?: string[];
  notes?: string;
  paymentMethod: PaymentMethod;   // "CashOnHand" | "GCash" | "SRVWallet"
  paymentId?: string;
  // Phase 1 — Online Services (NEW)
  scheduledSessions?: ScheduledSession[];   // populated when package.type === 'Session'
  createdAt: string;
  updatedAt: string;
  // Runtime-enriched:
  serviceName?: string;
  serviceImage?: string;
  providerName?: string;
  bookingDate?: string;
  bookingTime?: string;
  duration?: string;
  priceDisplay?: string;
  serviceSlug?: string;
}

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

### Booking Statuses (State Machine)

See [[Booking System]] for full state machine.

```typescript
type BookingStatus =
  | "Requested"    // Initial — client created
  | "Accepted"     // Provider accepted
  | "Declined"     // Provider declined (terminal)
  | "Cancelled"    // Either party (terminal)
  | "InProgress"   // Provider started work
  | "Completed"    // Provider finished
  | "Disputed";    // Either party disputes (terminal)
```

> **Phase 2 update**: For Session-type bookings:
> - Booking transitions to `InProgress` when the first session's start time passes
> - Booking transitions to `Completed` when all sessions are `Completed` or `Cancelled`. `NoShow` sessions prevent auto-completion.
> - 5 new `bookingAction` actions: `markSessionCompleted`, `markSessionNoShow`, `rescheduleSession`, `cancelSession`, analytics extension

### Payment Statuses (Within Booking Doc)

```javascript
paymentStatus: "PENDING" | "PAID_HELD" | "RELEASED"
```

> **Phase 1 update**: For online services, `CashOnHand` payment method is rejected server-side. Online services use `SRVWallet` (manual) or `GCash` (escrow) only.

### BookingRequest (Form Data)

```typescript
interface BookingRequest {
  serviceId: string;
  serviceName: string;
  providerId: string;
  packages: Array<{ id: string; title: string; description: string; price: number; type?: 'Fixed' | 'Milestone' | 'Session' }>;
  totalPrice: number;
  bookingType: "sameday" | "scheduled";
  scheduledDate: Date;
  scheduledTime: string;              // "HH:MM-HH:MM"
  location: string | Location;
  notes?: string;
  attachments?: string[];
  amountToPay?: number;
  paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
  paymentId?: string;
  locationDetection: "automatic" | "manual";
  // Phase 1 — multi-session (NEW; required when package.type === 'Session')
  scheduledSessions?: Array<{
    date: string;          // ISO 8601 YYYY-MM-DD
    startTime: string;     // "HH:mm"
    endTime: string;       // "HH:mm"
  }>;
}
```

## OnlineProject (Phase 1)

A new entity for product-based online services. See [[Online Projects]] for the full lifecycle, subcollections, and actions. The data model is:

```typescript
interface OnlineProject {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  packageId: string;
  packageType: 'Fixed' | 'Milestone' | 'Session';
  packageSnapshot: object;             // snapshot of package at project creation
  title: string;                       // client-provided project title
  description: string;                 // client-provided project description
  price: number;                       // agreed price
  deadline: string;                    // ISO 8601
  milestones: Milestone[];             // populated when allowsMilestones=true
  briefId: string;                     // ref to briefs/{briefId} subcollection
  status: 'Pending' | 'Negotiating' | 'Active' | 'InReview' | 'RevisionsRequested' | 'Completed' | 'Declined' | 'Cancelled' | 'Disputed';
  revisionsRemaining: number;
  workStarted: boolean;                // true once first deliverable submitted
  conversationId?: string;             // set when client-side createConversation runs
  amountPaid: number;                  // forward-compat with escrow
  paymentStatus: 'PENDING' | 'PAID_HELD' | 'RELEASED';
  paymentMethod?: 'SRVWallet' | 'GCash';
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  declinedAt?: string;
  disputedAt?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;                // ISO 8601
  percentage: number;             // 1–100, sum to 100
  status: 'Pending' | 'Submitted' | 'Approved';
  submittedAt?: string;
  approvedAt?: string;
}
```

## Enhanced Types (UI Layer)

```typescript
// Frontend display enrichment — adds joined data from other collections
// Two variants exist: EnhancedService (serviceManagement.tsx) and EnrichedService (serviceInformation.tsx)
interface EnhancedService extends Service {
  providerProfile?: FrontendProfile;
  formattedLocation?: string;
  distanceFromUser?: number;
  isProviderDataLoaded?: boolean;
  packages?: ServicePackage[];
  availability?: ProviderAvailability;
  formattedPrice?: string;
  averageRating?: number;
  totalReviews?: number;
  images?: string[];            // static frontend alias for imageUrls
  certifications?: string[];   // static frontend alias for certificateMedia
}

interface EnhancedBooking extends Booking {
  providerProfile?: FrontendProfile;
  serviceDetails?: Service;
  packageDetails?: ServicePackage;
  providerName: string;
  serviceName: string;
  packageName?: string;
  formattedLocation?: string;
  isProviderDataLoaded?: boolean;
  isServiceDataLoaded?: boolean;
  isPackageDataLoaded?: boolean;
  serviceDeleted?: boolean;
}

// Phase 1 — OnlineProject UI enrichment
interface EnhancedOnlineProject extends OnlineProject {
  providerProfile?: FrontendProfile;
  serviceDetails?: Service;
  packageDetails?: ServicePackage;
  brief?: ProjectBrief;
  deliverables?: DeliverableSubmission[];
  negotiations?: NegotiationOffer[];
  providerName?: string;
  serviceName?: string;
  packageName?: string;
  isProviderDataLoaded?: boolean;
  isServiceDataLoaded?: boolean;
  isPackageDataLoaded?: boolean;
  isBriefLoaded?: boolean;
}

// Client-facing listing enrichment
interface EnrichedService {
  id: string;
  slug: string;
  name: string;
  title: string;
  heroImage: string;
  description: string;
  providerName: string;
  providerAvatar: string;
  providerId: string;
  rating: { average: number; count: number };
  price: { amount: number; unit: string; display: string };
  location: { address: string; city: string; state: string; latitude?: number; ... };
  category: { name: string; id: string; slug: string };
  availability: { isAvailable: boolean };
  media: string[];
  // Phase 1 — serviceMode for filter UI
  serviceMode?: 'InPerson' | 'Online' | 'Hybrid';
}
```

## Firestore Collection Structure

- `services/{serviceId}` — main service document (with embedded category & location)
- `service_packages/{packageId}` — packages linked by `serviceId` (now with `type` field)
- `bookings/{bookingId}` — booking documents (now with optional `scheduledSessions[]`)
- `categories/{categoryId}` — 13 predefined categories (was 10)
- `reputations/{userId}` — user reputation scores (trustScore, etc.)
- `online_projects/{projectId}` — **NEW (Phase 1)**: online project documents
  - `online_projects/{projectId}/briefs/{briefId}` — project briefs
  - `online_projects/{projectId}/negotiations/{offerId}` — negotiation offers
  - `online_projects/{projectId}/deliverables/{deliverableId}` — submitted deliverables

## Key Relationships

```
Provider (auth profile)
  └── 1..5 Service(s) [now with serviceMode: InPerson | Online | Hybrid]
        ├── 1..5 ServicePackage(s) [now with type: Fixed | Milestone | Session]
        ├── 0..* Booking(s) as providerId
        │     └── references ServicePackage(s) via servicePackageIds[]
        │     └── Phase 2: scheduledSessions[] when package.type === 'Session'
        └── 0..* OnlineProject(s) as providerId [NEW Phase 1]
              └── references ServicePackage via packageId
              └── subcollections: briefs, negotiations, deliverables
              └── Phase 1: only when service.serviceMode !== 'InPerson'

Client (auth profile)
  ├── 0..* Booking(s) as clientId
  └── 0..* OnlineProject(s) as clientId [NEW Phase 1]

Service → ServiceCategory (embedded) [13 categories, was 10]
Booking → Service (by serviceId)
Booking → Location (embedded)
OnlineProject → Service (by serviceId) [NEW]
OnlineProject → ProjectBrief (in subcollection) [NEW]
OnlineProject → NegotiationOffer (in subcollection) [NEW]
OnlineProject → DeliverableSubmission (in subcollection) [NEW]
```
