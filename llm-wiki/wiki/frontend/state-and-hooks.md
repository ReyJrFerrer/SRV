---
tags: [frontend, state, hooks]
date: 2026-06-16
related:
  - [[Frontend Overview]]
  - [[Chat System]]
  - [[Media and Images]]
---

# State and Hooks

## Zustand Stores

### `locationStore` (`src/store/locationStore.ts`)

Persisted with Zustand `persist` middleware. Manages:

- **Geolocation**: current position, GPS permission status, watch ID
- **Maps API readiness**: `isGoogleMapsApiReady` flag, set when Maps library loads
- **Manual address**: barangay, street, houseNumber strings + `addressMode` toggle (GPS vs manual)
- **Actions**: `fetchCurrentLocation()`, `setManualAddress()`, `setAddressMode()`, `setMapsApiReady()`

### `locationDataStore` (`src/store/locationDataStore.ts`)

Not persisted. Loads PH province/municipality/barangay hierarchy from `data/phLocations.ts` on app init (called eagerly in `main.tsx`). Provides lookup by province code, municipality code.

## React Contexts

### `AuthContext` (`src/context/AuthContext.tsx`, 428 lines)

Core authentication state and actions:

- **State**: `firebaseUser`, `isAuthenticated`, `profileStatus`, loading states
- **Actions**: `login()` (starts zkLogin), `completeZkLogin()` (finishes OAuth callback), `logout()`
- **Integration**: Delegates location to `locationStore`, PWA/push to `usePWA`, manages post-login location prompt modal state
- **Init**: `onAuthStateChanged` → `sessionManager.getSession()` → token exchange → profile fetch

### `BookingCacheContext` (`src/context/BookingCacheContext.tsx`, 310 lines)

Central booking cache shared by client and provider layouts:

- **Data**: `Map<string, ProviderEnhancedBooking>` and `Map<string, EnhancedBooking>`
- **Deduplication**: In-flight request deduplication via refs
- **Auto-populate**: From booking arrays fetched by role-specific hooks
- **Actions**: `getProviderBooking(id)`, `getClientBooking(id)`, `invalidateBooking(id)`, `clearCache()`

### `InAppNotificationContext` (`src/context/InAppNotificationContext.tsx`, 120 lines)

Toast notification manager:

- **Actions**: `showNotification(message, duration)` (auto-dismiss), `dismissNotification()` (exit animation → state removal at 220ms)
- **Renders**: `InAppNotificationPopup` component

## Custom Hooks (26 total)

### Auth & Profile

| Hook             | File                       | Purpose                                                        |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| `useUserProfile` | `hooks/useUserProfile.tsx` | Fetches/updates `FrontendProfile`; wraps `authCanisterService` |
| `logout`         | `hooks/logout.tsx`         | Logout with storage cleanup (preserves tour flags)             |

### Booking

| Hook                           | File                                     | Purpose                                                                                  |
| ------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `useBookingManagement`         | `hooks/bookingManagement.tsx`            | Client booking list, real-time listener, status grouping                                 |
| `useProviderBookingManagement` | `hooks/useProviderBookingManagement.tsx` | Provider bookings, accept/decline/start/complete                                         |
| `useCachedBooking`             | `hooks/useCachedBooking.ts`              | Single-booking cache for detail pages                                                    |
| `bookRequest`                  | `hooks/bookRequest.tsx`                  | Service booking flow: load service/packages/provider, availability slots, create booking |

### Service

| Hook                    | File                                        | Purpose                                                                                     |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `useServiceDetail`      | `hooks/serviceDetail.tsx`                   | Service + provider profile + schedule + time slots                                          |
| `useServiceManagement`  | `hooks/serviceManagement.tsx` (~1500 lines) | Full provider CRUD: create/update/delete, images, availability, commission, status toggling |
| `useServiceInformation` | `hooks/serviceInformation.tsx`              | Read-only service info for provider detail view                                             |

### Chat

| Hook                   | File                             | Purpose                                                                                                                |
| ---------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `useChat`              | `hooks/useChat.tsx` (260+ lines) | Conversations, messages, optimistic sending, real-time subscriptions, file attachment upload, mark-read, custom events |
| `useChatNotifications` | `hooks/useChatNotifications.tsx` | Chat notification badge counts                                                                                         |

### Notifications & PWA

| Hook                               | File                                        | Purpose                                                                                     |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `useNotificationsWithPush`         | `hooks/useNotificationsWithPush.ts`         | Notifications + push integration, OneSignal bridge                                          |
| `useProviderNotificationsWithPush` | `hooks/useProviderNotificationsWithPush.ts` | Same for provider role                                                                      |
| `usePWA`                           | `hooks/usePWA.ts`                           | PWA state: isInstallable, isPWA, isOffline, pushPermission, pushSubscribed, updateAvailable |

### Wallet & Reputation

| Hook                 | File                           | Purpose                                                                                |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| `useWallet`          | `hooks/useWallet.tsx`          | Balance, held balance, transactions (paginated 10/page), transfer                      |
| `useReputation`      | `hooks/useReputation.tsx`      | ReputationScore (trustScore, trustLevel, completedBookings, avgRating, detectionFlags) |
| `useClientRating`    | `hooks/useClientRating.tsx`    | Client's own ratings/reviews                                                           |
| `useClientAnalytics` | `hooks/useClientAnalytics.tsx` | Total spend, booking stats, member since                                               |

### Media & Location

| Hook                            | File                                     | Purpose                                                                                             |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `useMediaLoader`                | `hooks/useMediaLoader.tsx`               | React Query: `useImageLoader()`, `useProfileImage()`, `useServiceImages()`, `useCertificateMedia()` |
| `useHeaderLocation`             | `hooks/useHeaderLocation.tsx`            | Header location display                                                                             |
| `useServiceDistance`            | `hooks/useServiceDistance.tsx`           | Distance calc between user and service                                                              |
| `useProviderLocationPublisher`  | `hooks/useProviderLocationPublisher.ts`  | Publishes provider GPS to Firebase Realtime Database                                                |
| `useProviderLocationSubscriber` | `hooks/useProviderLocationSubscriber.ts` | Client subscribes to provider's real-time location                                                  |

### Feedback & Navigation

| Hook                  | File                           | Purpose                                                                   |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `useFeedback`         | `hooks/useFeedback.tsx`        | Submit feedback (rating+comment), submit report (description+attachments) |
| `useReviewManagement` | `hooks/reviewManagement.tsx`   | Review CRUD for providers (reply, flag, hide)                             |
| `useNoBackNavigation` | `hooks/useNoBackNavigation.ts` | Prevents browser back navigation                                          |
