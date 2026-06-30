---
tags: [frontend, services, api]
date: 2026-06-16
related:
  - [[Frontend Overview]]
  - [[Chat System]]
  - [[Media and Images]]
  - [[Service Discovery and Listing]]
  - [[Booking System]]
  - [[Service Creation Workflow]]
---

# Services Layer

All 20 service modules in `src/frontend/src/services/`. Services abstract Firebase SDKs (Auth, Firestore, Functions, Storage, Realtime Database) and provide domain-specific APIs. Original ICP canister calls have all been replaced — these are Firebase-only wrappers.

## Firebase Foundation

| Service            | File                | Purpose                                                                                                       |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `firebaseApp`      | `firebaseApp.ts`    | Firebase init with emulator support, lazy SDK accessors (`getFirebaseAuth()`, `getFirebaseFunctions()`, etc.) |
| `firebase` (utils) | `utils/firebase.ts` | Cloud Functions shortcuts: `requestDirectPayment`, `checkPaymentStatus`, `createTopupInvoice`                 |

## Auth & Identity

| Service                    | File                     | Purpose                                                                                                                              |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `FirebaseAuthService`      | `firebaseAuth.ts`        | Phone auth: `signInWithPhoneNumber`, `confirmOtp`, `signOut`, `getIdToken`                                                           |
| `PhoneVerificationService` | `phoneVerification.ts`   | Multi-step phone → OTP → verified flow (wraps FirebaseAuthService)                                                                   |
| `authCanisterService`      | `authCanisterService.ts` | Profile CRUD via Cloud Functions: `getMyProfile()`, `updateProfile()`, `setAvailability()`, `getUserRoles()`, `getProfileByUserId()` |
| `identityBridge`           | `identityBridge.ts`      | Exchanges Sui address for Firebase custom token via `exchangeForFirebaseToken()` Cloud Function; manages session persistence         |
| `zkLoginService`           | `zkLoginService.ts`      | Full zkLogin flow: ephemeral Ed25519 key gen, nonce, Google OAuth URL, JWT decode, Sui address derivation, callback URL parsing      |

## Booking & Service Management

| Service                  | File                        | Purpose                                                                                                                                                                      |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bookingCanisterService` | `bookingCanisterService.ts` | Booking CRUD + real-time Firestore listeners: `createBooking()`, `acceptBooking()`, `declineBooking()`, `cancelBooking()`, `startService()`, `completeService()` + analytics |
| `serviceCanisterService` | `serviceCanisterService.ts` | Service CRUD: `createService()`, `updateService()`, `deleteService()`, `getAllServices()`, `getService()`, `searchServicesByLocation()`, availability, certificate media, commission quote, packages |
| `reviewCanisterService`  | `reviewCanisterService.ts`  | Review CRUD via Cloud Functions: `submitReview()`, `getReview()`, `getProviderRating()`, `getServiceRating()`, `getUserRating()`, `hideReview()`, `flagReview()`             |
| `reputationService`      | `reputationService.ts`      | Reputation score fetching from Firestore doc `reputations/{userId}`                                                                                                          |

## Chat & Notifications

| Service                          | File                                | Purpose                                                                                                                                                                              |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chatCanisterService`            | `chatCanisterService.ts`            | Firestore chat: `subscribeToConversationSummaries()`, `subscribeToMessages()`, `sendMessage()` (supports Text + File types), `markConversationAsRead()`, `createConversation()` (get-or-create pattern) |
| `notificationCanisterService`    | `notificationCanisterService.ts`    | Notification CRUD + Firestore real-time: `subscribeToNotifications()`, `markAsRead()`, `getUnreadCount()`                                                                            |
| `notificationIntegrationService` | `notificationIntegrationService.ts` | Bridges OneSignal events to app: `initialize()`, `enablePushNotifications()`, `handleNotificationOpened()`                                                                           |
| `oneSignalService`               | `oneSignalService.ts`               | OneSignal SDK singleton wrapper: `initialize()`, `subscribe()`, `setExternalUserId()`, `getPlayerId()`, event handlers                                                               |

## Media & PWA

| Service                   | File                         | Purpose                                                                                                                                                                                |
| ------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mediaService`            | `mediaService.ts`            | Upload to Firebase Storage: profile pics (400x400 downscale), service images (1024x1024 + server thumbnails), chat attachments. Validation: 450KB max (10MB video), allowed MIME types |
| `pwaService`              | `pwaService.ts`              | PWA lifecycle: `beforeinstallprompt` handler, `install()`, `isInstalled()`, offline detection                                                                                          |
| `browserDetectionService` | `browserDetectionService.ts` | UA parsing, PWA capability detection                                                                                                                                                   |

## Wallet & Feedback

| Service                   | File                         | Purpose                                                                                |
| ------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| `walletCanisterService`   | `walletCanisterService.ts`   | Wallet: `getBalanceOf()`, `getWalletDetails()`, `getTransactions()`, `transferFunds()` |
| `feedbackCanisterService` | `feedbackCanisterService.ts` | App feedback + report submission via Cloud Functions                                   |

## API Communication Patterns

- **Cloud Functions**: `httpsCallable("actionName", payload)` via Firebase Functions SDK (e.g., `reviewAction`, `bookingAction`, `mediaAction`, `feedbackAction`).
- **Firestore real-time**: `onSnapshot` listeners for chat conversations, messages, notifications, bookings. Debounced (200ms) for chat.
- **Realtime Database**: Provider GPS location publishing during active service.
- **Firebase Storage**: Direct uploads/downloads via `getDownloadURL` + `uploadBytesResumable`.
- **TanStack Query**: Wraps Cloud Function calls and image fetches (5min stale, 24h GC, 2 retries).
