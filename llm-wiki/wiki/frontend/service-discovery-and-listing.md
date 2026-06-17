---
tags: [frontend, discovery, listing, search, ui]
date: 2026-06-17
related:
  - [[Service Creation Workflow]]
  - [[Booking System]]
  - [[Service and Booking Models]]
  - [[Routing and Layouts]]
  - [[State and Hooks]]
sources:
  - src/frontend/src/pages/client/home.tsx
  - src/frontend/src/pages/client/search-results.tsx
  - src/frontend/src/pages/client/categories/[slug].tsx
  - src/frontend/src/pages/client/service/[id].tsx
  - src/frontend/src/pages/client/service/view-all.tsx
  - src/frontend/src/hooks/serviceInformation.tsx
  - src/frontend/src/hooks/serviceManagement.tsx
  - src/frontend/src/services/serviceCanisterService.ts
  - src/frontend/src/components/client/home page/
  - src/frontend/src/components/client/SearchBar.tsx
---

# Service Discovery and Listing

How clients find, browse, search, and view services in the SRV marketplace.

## Routes

| Route | Page Component | File |
|-------|---------------|------|
| `/client/home` | `ClientHome` | `pages/client/home.tsx` |
| `/client/search-results` | `SearchResults` | `pages/client/search-results.tsx` |
| `/client/categories/:slug` | `CategoryDetailPage` | `pages/client/categories/[slug].tsx` |
| `/client/service/view-all` | `ViewAllServices` | `pages/client/service/view-all.tsx` |
| `/client/service/:id` | `ServiceDetailPage` | `pages/client/service/[id].tsx` |
| `/client/book/:id` | `BookServicePage` | `pages/client/book/[id].tsx` |

## Home Page (`/client/home`)

Rendered by `ClientHome` in `pages/client/home.tsx`. Three main sections:

1. **`ClientHeader`** — location display + search bar (inline autocomplete suggestions from service names & provider names)
2. **`Categories`** — 7-category grid (responsive: 3 mobile / 5 tablet / 7 desktop + "More") with SVG icons; each links to `/client/categories/:slug`
3. **`ServiceList`** (via `ServiceListRow`) — horizontal scroll of `ServiceListItem` cards; first 10 loaded, "Load More" button for next 10

### Categories Component

**File**: `components/client/home page/Categories.tsx`

- Loads categories via `useServiceManagement().getAllCategories()`
- Reorders by predefined display priority: General Repair, Cleaning, Gadget Repair, Automotive, Beauty, Massage, Tutoring, Delivery, Photography
- Maps names to specific SVG icons
- Skeleton loading; error state with red text

### ServiceListRow

**File**: `components/client/home page/ServiceListRow.tsx`

- Paginated: `ITEMS_PER_PAGE = 10`, "Load More" increments offset by 10 with 300ms setTimeout animation
- No infinite scroll or cursor-based pagination

## Service Listing Card (`ServiceListItem`)

**File**: `components/client/home page/ServiceListingCard.tsx`

Used across ALL listing pages. Displays:
- Service image (loaded via `useServiceImages` hook; fallback SVG by category)
- Provider avatar (loaded via `useUserImage` hook)
- Category icon badge (top-left)
- Reputation score badge (top-right, color-coded: emerald >80, sky >50, amber >20, rose ≤20)
- Title, provider name (with verified badge if applicable)
- Location (city, state)
- Price (formatted ₱)
- Star rating (half-star support) + review count
- "Check service" hover button
- Skeleton loading: minimum 400ms, timeout fallback 5000ms

Links to `/client/service/{id}`.

## Service Detail Page (`/client/service/:id`)

**File**: `pages/client/service/[id].tsx`

Full-page detail with:
- Hero image carousel
- Provider info + reputation badge
- Service packages (price cards)
- Availability section (weekly schedule + time slots via `AvailabilitySection`)
- Reviews section (via `ReviewsSection`)
- Credentials section (certificates via `CredentialsSection`)
- **Two CTA buttons**: "Chat" and **"Book Now"**

### "Book Now" Gating

`handleBookNow()` navigates to `/client/book/${service.id}` but is **disabled** if:
- No packages exist
- Current user is the provider themselves
- Service status is not `"Available"`
- Reputation check fails: either party has `trustScore < 5` (fetched via `useReputation`)

## Search (`/client/search-results`)

**File**: `pages/client/search-results.tsx`

- Reads `query` or `q` from URL search params
- Fetches all services via `useAllServicesWithProviders()`
- **Client-side** text filtering on: service name, title, category name, description, provider name
- Sort options: rating (default), price asc, price desc
- Price range slider: ₱100 – ₱10M
- Min rating slider: 0 – 5
- Fetches reputation scores for visible providers

**Important**: All search is client-side. No backend search endpoint exists.

## Category Page (`/client/categories/:slug`)

**File**: `pages/client/categories/[slug].tsx`

- Loads category by matching `slug` against `serviceCanisterService.getAllCategories()`
- Special slug `"all-service-types"` shows all services
- Otherwise fetches by category ID via `useServicesByCategory()`
- Same client-side filters: search term, max price, min rating, sort (rating/price_asc/price_desc)
- Responsive grid: 1–5 columns of `ServiceListItem`

## View All (`/client/service/view-all`)

**File**: `pages/client/service/view-all.tsx`

- All services via `useAllServicesWithProviders()`
- Inline `SearchBar` for filtering
- Fade-up animation grid

## Data Layer

### Hooks

| Hook | File | Data Source | Mechanism |
|------|------|-------------|-----------|
| `useAllServicesWithProviders()` | `hooks/serviceInformation.tsx` | Firestore `services` collection | **Real-time** `onSnapshot` |
| `useServicesByCategory(categoryId)` | `hooks/serviceInformation.tsx` | Callable `serviceAction` | **One-time** fetch |
| `useTopPickServices(limit?)` | `hooks/serviceInformation.tsx` | Callable `serviceAction` | **One-time**, top-rated |
| `useServiceById(serviceId)` | `hooks/serviceInformation.tsx` | Firestore `services/{id}` | **Real-time** `onSnapshot` |
| `useCategories()` | `hooks/serviceInformation.tsx` | Callable `serviceAction` | **One-time** fetch |
| `useServiceDetail` | `hooks/serviceDetail.tsx` | Service + provider + schedule + time slots | Real-time + fetch |

### Enrichment (`transformToEnrichedService`)

Raw `Service` → `EnrichedService` in `hooks/serviceInformation.tsx`:
1. Takes raw `Service` + `FrontendProfile` (provider) + `ServicePackage[]`
2. Computes lowest price from packages
3. Sets rating, display price, location, category
4. Filters media URLs (removes empties)
5. Creates simple slug from title

### Provider Profile Fetching (`fetchProviderProfiles`)

- Deduplicates provider IDs across visible services
- Calls `authCanisterService.getProfile(providerId)` in parallel per batch
- Builds `Record<providerId, FrontendProfile>` map

### Service Canister Service (Firestore Bridge)

| Method | Type | Purpose |
|--------|------|---------|
| `subscribeToAllServices(callback)` | Real-time Firestore | All services, filter `serviceDeleted !== true`, sort by `createdAt` desc |
| `getAllServices()` | Callable `serviceAction` | One-time fetch |
| `subscribeToCategoryServices(categoryId, callback)` | Real-time Firestore | Filtered by `category.id == categoryId` |
| `getServicesByCategory(categoryId)` | Callable `serviceAction` | One-time fetch |
| `getService(serviceId)` | Callable `serviceAction` | Single service |
| `subscribeToService(serviceId, callback)` | Real-time Firestore | Single doc listener |
| `searchServicesByLocation(location, radiusKm, categoryId?)` | Callable `serviceAction` | Geo-search via Haversine |
| `getAllCategories()` / `subscribeToAllCategories()` | Callable + Real-time | Categories |

## Location & Distance

- **Zustand `locationStore`**: persisted GPS location, permission status, reverse-geocoded address, manual address mode
- **`useServiceDistance`**: Haversine formula, used for sorting (NOT filtering) — "Remove location filtering - show ALL services" is explicit in code
- **Backend** `searchServicesByLocation_service` also uses Haversine for server-side radius filtering

## Key Architecture Notes

1. **No server-side text search** — all service text filtering is client-side in-memory. Scales poorly with catalog growth.
2. **No server-side pagination** (except home page's 10-at-a-time) — category, search, and view-all pages render all matching services.
3. **Data enrichment is N+1** — provider profiles and packages are fetched separately per batch of services.
4. **Location sorting only** — distance is computed but not used for filtering; all services show regardless of location.
5. **Real-time on home page** — `subscribeToAllServices` via Firestore `onSnapshot` for live updates.
6. **One-time for filtered views** — category and top-picks use callable functions (not subscriptions).
7. **Reputation scores** are fetched separately for visible services (not embedded in the service document).
