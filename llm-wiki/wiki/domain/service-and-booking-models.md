---
tags: [domain, models, types, entities]
date: 2026-06-17
related:
  - [[Service Creation Workflow]]
  - [[Booking System]]
  - [[Service Discovery and Listing]]
sources:
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/services/bookingCanisterService.ts
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/hooks/bookRequest.tsx
  - functions/src/service.js
  - functions/src/booking.js
---

# Service and Booking Models

Core domain entities for the service marketplace: Service, ServicePackage, Booking, and supporting types.

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

10 predefined categories (seeded in Firestore by `initializeCategoriesDirectly` in `service.js:1589-1671`):

1. Home Repairs (`home-services`)
2. Cleaning Services (`cleaning-services`)
3. Automobile Repairs (`automobile-repairs`)
4. Gadget Technicians (`gadget-technicians`)
5. Beauty Services (`beauty-services`)
6. Delivery and Errands (`delivery-errands`)
7. Massage Services (`beauty-wellness`)
8. Tutoring (`tutoring`)
9. Photographer (`photographer`)
10. Others (`others`)

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

## ServicePackage

Created in a **separate** collection `service_packages` linked by `serviceId`.

```typescript
interface ServicePackage {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  price: number;          // PHP, 1–1,000,000
  commissionFee: number;       // frontend type — NOT set by createServicePackage_service
  commissionRate: number;      // frontend type — NOT set by createServicePackage_service
  createdAt: string;           // ISO 8601
  updatedAt: string;           // ISO 8601
  // Runtime:
  totalAmount?: number;
}
```

**Note**: The backend `createServicePackage_service` (`service.js:1786-1794`) does **not** set `commissionFee` or `commissionRate` on packages. These fields exist only in the frontend type for display purposes — they are likely populated by a separate commission calculation or left as defaults.

**Rules**: 1–5 packages per service. Names must be unique within a service. The service's `price` field is the minimum across its packages.

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

## Booking

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

### Payment Statuses (Within Booking Doc)

```javascript
paymentStatus: "PENDING" | "PAID_HELD" | "RELEASED"
```

### BookingRequest (Form Data)

```typescript
interface BookingRequest {
  serviceId: string;
  serviceName: string;
  providerId: string;
  packages: Array<{ id: string; title: string; description: string; price: number }>;
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
}
```

## Firestore Collection Structure

- `services/{serviceId}` — main service document (with embedded category & location)
- `service_packages/{packageId}` — packages linked by `serviceId`
- `bookings/{bookingId}` — booking documents
- `categories/{categoryId}` — 10 predefined categories
- `reputations/{userId}` — user reputation scores (trustScore, etc.)

## Key Relationships

```
Provider (auth profile)
  └── 1..5 Service(s)
        ├── 1..5 ServicePackage(s)
        └── 0..* Booking(s) as providerId
            └── references ServicePackage(s) via servicePackageIds[]

Client (auth profile)
  └── 0..* Booking(s) as clientId

Service → ServiceCategory (embedded)
Booking → Service (by serviceId)
Booking → Location (embedded)
```
