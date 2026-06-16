---
tags: [frontend, routing, navigation]
date: 2026-06-16
related:
  - [[Frontend Overview]]
  - [[Authentication Flow]]
---

# Routing and Layouts

The frontend uses **HashRouter** (`/#!/path`) from React Router v7. All routes are defined in `main.tsx` with lazy-loaded page components.

## Route Groups

### Unauthenticated (`/`)

Rendered by `App.tsx` (the `LandingPage` component — a marketing homepage with MainPage, About, Contact sections). No `/admin/*` route group exists despite `ProtectedRoute` supporting an `"Admin"` role.

### Client (`/client/*`)

Wrapped by `MapsProviderWrapper` (Google Maps APIProvider with places library).

| Route                             | Page Component      |
| --------------------------------- | ------------------- |
| `/client/home`                    | ClientHome          |
| `/client/categories/:slug`        | CategoryDetailPage  |
| `/client/service/:id`             | ServiceDetailPage   |
| `/client/service/view-all`        | ViewAllServices     |
| `/client/service/reviews/:id`     | ServiceReviewPage   |
| `/client/search-results`          | SearchResults       |
| `/client/book/:id`                | BookServicePage     |
| `/client/booking`                 | MyBookingsIndex     |
| `/client/booking/confirmation`    | BookingConfirmation |
| `/client/booking/payment-pending` | PaymentPending      |
| `/client/booking/:id`             | BookingDetailPage   |
| `/client/booking/receipt/:id`     | BookingReceipt      |
| `/client/tracking/:bookingId`     | TrackingPage        |
| `/client/chat`                    | ChatPage            |
| `/client/chat/:conversationId`    | ChatConversation    |
| `/client/notifications`           | NotificationsPage   |
| `/client/profile`                 | ClientProfilePage   |
| `/client/settings`                | SettingsPage        |
| `/client/ratings`                 | RatingsPage         |
| `/client/terms`                   | TermsPage           |
| `/client/report`                  | ReportPage          |
| `/client/help`                    | HelpPage            |

### Provider (`/provider/*`)

Also wrapped by `MapsProviderWrapper`.

| Route                                   | Page Component           |
| --------------------------------------- | ------------------------ |
| `/provider/home`                        | ProviderHome             |
| `/provider/services`                    | ProviderServices         |
| `/provider/services/add`                | AddService               |
| `/provider/service-details/:id`         | ProviderServiceDetails   |
| `/provider/service-details/reviews/:id` | ProviderServiceReviews   |
| `/provider/bookings`                    | ProviderBookings         |
| `/provider/active-service/:bookingId`   | ProviderActiveService    |
| `/provider/complete-service/:bookingId` | ProviderCompleteService  |
| `/provider/booking/:id`                 | ProviderBookingDetail    |
| `/provider/chat`                        | ProviderChat             |
| `/provider/chat/:conversationId`        | ProviderChatConversation |
| `/provider/notifications`               | ProviderNotifications    |
| `/provider/settings`                    | ProviderSettings         |
| `/provider/profile`                     | ProviderProfilePage      |
| `/provider/wallet`                      | WalletPage               |
| `/provider/payout-settings`             | PayoutSettings           |
| `/provider/directions/:bookingId`       | ProviderDirections       |
| `/provider/receipt/:bookingId`          | ProviderReceipt          |
| `/provider/rate-client/:bookingId`      | RateClientPage           |
| `/provider/review/:id`                  | ReviewPage               |
| `/provider/terms`                       | ProviderTerms            |
| `/provider/report`                      | ProviderReport           |
| `/provider/help`                        | ProviderHelp             |

## Layout Hierarchy

### ClientLayout

`ProtectedRoute(Client)` → `ClientNotificationBridge` → `ClientOnRouteBanner` → `ClientActiveServiceBanner` → `RouteTransition` → `<Outlet>` → `BottomNavigation`

### ProviderLayout

`ProtectedRoute(Provider)` → `ProviderNotificationBridge` → `RouteTransition` → `<Outlet>` → `BottomNavigation` (hidden padding on fullscreen routes: `/provider/directions/`, `/provider/active-service/`)

## Auth Guards

- **ProtectedRoute**: Checks `isAuthenticated`, verifies `profile.activeRole` matches `requiredRole`, checks suspension (`locked: true` → `SuspensionModal`), reroutes on role mismatch. `CreateProfileGuard` intercepts users without a profile.
- **ClientRedirect** / **ProviderRedirect**: Redirect to correct role home if already authenticated.
- **NotFound**: Catch-all 404.

## Cross-Component Communication

Custom events (`interactionEvents.ts`) dispatch `booking-interacted`, `chats-read`, `conversations-updated`, `messages-updated` so badge counts and UI elements react without prop drilling.
