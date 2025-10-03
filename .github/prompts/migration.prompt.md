# 🤖 AI Agent Instructions

**Objective:** Execute a strategic architectural migration from a pure Internet Computer backend to a hybrid ICP-Firebase architecture over three phases.

**Summary** We are executing a strategic migration from a monolithic backend running purely on the Internet Computer (IC) to a specialized hybrid architecture combining the IC and Firebase.

This new architecture divides responsibilities to use the best tool for each job:

Firebase as the Operational Backend: All high-frequency marketplace operations (bookings, chat, user profiles, wallet transactions) are being moved to a serverless backend using Firestore for real-time data and Cloud Functions for business logic. This will significantly improve performance, scalability, and cost-efficiency.

The Internet Computer for High-Security Specializations: We are retaining the IC exclusively for its most unique and valuable features:

Decentralized Identity: Users will still log in with Internet Identity. A new "Identity Bridge" function will verify their Principal and create a Firebase session.
AI-Powered Reputation: The reputation.mo canister, which contains your unique AI sentiment analysis logic, will remain the on-chain source of truth for our decentralized trust scores. It will be updated securely by a "Reputation Bridge" Cloud Function.

**Your Core Directives:**

1.  **Read First:** Before starting any task, you **MUST** first read the `README.md` and `CHANGELOG.md` files to understand the project's existing architecture, features, and history. This migration builds upon patterns already established.
2.  **Log Your Work:** After you successfully complete **each numbered step**, you **MUST** add an entry to a new `MIGRATION_LOG.md` file. The entry should describe what you did and its outcome. For example: `feature - 1.2: Created functions/src/auth.js to house the Identity Bridge logic. The signInWithInternetIdentity function is defined and ready for testing.`
3.  **Follow the Plan:** Execute the tasks sequentially. Do not skip steps, as they are interdependent.
4.  **Stop and Ask:** When you reach a "PAUSE FOR CONFIRMATION" step, stop and present the required information to the user and ask for confirmation before proceeding.

---

## 📜 The Plan

### **Phase 1: Backend Infrastructure Migration & Firebase Scaffolding**

**Goal:** Set up the complete Firebase backend, including databases, functions, and security rules, and create the critical "bridge" functions that will communicate with the IC.

**1.0. Validate Existing Firebase Setup**

- **Validation:** Your project has already been configured for Firebase Functions and Firestore, as indicated by the existing `functions` directory and its usage of `admin.firestore()`.
- **Action:** No initialization is needed. The first action is to ensure our security rules are comprehensive.

**1.1. Define Firestore Security Rules**

- **Action:** MODIFY `firestore.rules`.
- **Content:** Implement foundational security rules. This is a critical step to secure data.
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Users can only read their own profile, admins can read any.
      match /users/{userId} {
        allow read: if request.auth.uid == userId || request.auth.token.isAdmin == true;
        allow write: if request.auth.uid == userId;
      }
      // Services can be read by anyone, but only written by the provider or an admin.
      match /services/{serviceId} {
          allow read: if request.auth != null;
          allow write: if resource.data.providerId == request.auth.uid || request.auth.token.isAdmin == true;
      }
      // Bookings can only be read/written by participants or an admin.
      match /bookings/{bookingId} {
          allow read, write: if request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.providerId || request.auth.token.isAdmin == true;
      }
      // Reviews can be created by authenticated users, but not modified.
      match /reviews/{reviewId} {
          allow read: if true;
          allow create: if request.auth != null;
          allow update, delete: if false; // Reviews are immutable
      }
    }
  }
  ```

**1.2. Create the "Identity Bridge" Cloud Function**

- **Action:** CREATE `functions/src/auth.ts`.
- **Content:** Implement the `signInWithInternetIdentity` function. This is the cornerstone of the hybrid architecture.
  - It must be an HTTP `onRequest` function.
  - It will receive a `principal` in the request body.
  - It will use `@dfinity/agent` to securely call the `isPrincipalValid` query on the `auth.mo` canister.
  - If valid, it will use `firebase-admin` to `createCustomToken(principal)`. It will also check if a user profile exists in Firestore and create a shell profile if it's a new user.
  - It returns the custom token to the client.

**1.3. Create the "Reputation Bridge" Cloud Function**

- **Action:** CREATE `functions/src/review.ts`.
- **Content:** Implement the `processReputation` function.
  - This will be a Firestore `onCreate` trigger on the `reviews` collection.
  - When a new review is added, this function fires.
  - It will authenticate itself as a trusted service agent (using a stored private key for a dedicated Principal).
  - It will call the `updateReputationFromReview` method on the `reputation.mo` canister, passing the review data.

**1.4. Port Wallet & Admin Logic**

- **Action:** CREATE `functions/src/wallet.ts` and `functions/src/admin.ts`.
- **Content for `wallet.ts`:**
  - Create `creditProvider` and `debitProvider` functions.
  - These functions **MUST** use Firestore Transactions (`db.runTransaction()`) to ensure atomic updates to balance fields in the `users` collection.
- **Content for `admin.ts`:**
  - Port the logic from `admin.mo`. Create functions like `grantAdminRole`.
  - Every function **MUST** start with a guard clause that checks `context.auth.token.isAdmin === true`. If not, throw an `unauthenticated` error.

**PAUSE FOR CONFIRMATION (End of Phase 1)**

- **Action:** Stop and report to the user: "Phase 1 is complete. The Firebase backend infrastructure is scaffolded, security rules are in place, and the critical 'bridge' functions for identity and reputation have been created. Backend logic for wallets and admin is ported. Shall I proceed with Phase 2 to refactor the Motoko canisters?"

---

### **Phase 2: Refactoring the Internet Computer Canisters**

**Goal:** Slim down the on-chain footprint to only what is absolutely necessary, reducing complexity and cost.

**2.0. Modify `auth.mo` Canister**

- **Action:** MODIFY `src/backend/function/auth.mo`.
- **Content:**
  - Remove all functions and logic _except_ for a single, public `query` function: `public query func isPrincipalValid(principal: Principal): async Bool`.
  - This function's only job is to confirm that a given Principal is legitimate. Its internal logic for validation should be kept, but all other features (role management, etc.) should be deleted.

**2.1. Modify `reputation.mo` Canister**

- **Action:** MODIFY `src/backend/function/reputation.mo` (or equivalent).
- **Content:**
  - Expose a new `update` function: `public func updateReputationFromReview(reviewText: Text, rating: Nat)`.
  - Secure this function so it can only be called by the Principal of our Firebase service agent. Store this trusted Principal as an immutable variable.

**2.2. Deprecate and Remove Canisters**

- **Action:** MODIFY `dfx.json`.
- **Content:**
  - Remove the following canisters from the `canisters` list: `booking`, `chat`, `feedback`, `media`, `notification`, `review`, `service`, `wallet`, `commission`, `admin`.
- **Action:** DELETE the corresponding `.mo` source files from the `src/backend/function/` directory.

**PAUSE FOR CONFIRMATION (End of Phase 2)**

- **Action:** Stop and report to the user: "Phase 2 is complete. The on-chain footprint has been minimized. The `auth` canister is now a simple oracle, the `reputation` canister is secured for backend calls, and all other operational canisters have been removed from the project. Shall I proceed with Phase 3 to migrate the frontend client?"

---

### **Phase 3: Frontend Client Migration**

**Goal:** Rewire the entire frontend application to communicate with the new Firebase backend instead of the deprecated canisters.

**3.0. Refactor the Authentication Flow**

- **Action:** MODIFY the primary authentication context/hook (e.g., `src/frontend/src/context/AuthContext.tsx`).
- **Content:**
  - The `login` function must be completely rewritten.
  1.  It still calls the Internet Identity client to get the user's `Principal`.
  2.  It then makes an HTTPS call to our new `signInWithInternetIdentity` Cloud Function.
  3.  It receives the custom Firebase token and calls `signInWithCustomToken(auth, token)` from the Firebase SDK.
  4.  The user's session is now managed by Firebase.

**3.1. Refactor Data Fetching and Mutations**

- **Action:** Globally search for and replace all Motoko actor calls (`actor.some_method()`).
- **Content:**
  - **Mutations (Writes):** Replace `actor` calls with `https.Callable` calls to the new Cloud Functions (e.g., `createBooking`, `acceptBooking`).
  - **Data Fetching (Reads):** Replace canister queries with real-time Firestore listeners (`onSnapshot`). This will make the app feel significantly faster and more reactive, directly impacting components that use hooks like `useProviderBookingManagement.tsx` to display data with status colors.

**3.2. Refactor Admin Panel**

- **Action:** MODIFY all pages and components within the `src/admin/` directory.
- **Content:**
  - All data tables, like `ServiceProviderCommissionTable` and `transactionHistory`, must now fetch their data from Firestore.
  - All admin actions (e.g., suspending a user) must now call the new, secure admin Cloud Functions. The frontend will need to send the user's Firebase ID token in the authorization header of these calls.

**3.3. Update UI based on Real-Time Data**

- **Action:** MODIFY components like `src/frontend/src/components/provider/BookingRequests.tsx`.
- **Content:**
  - Logic that previously called a canister to check a provider's wallet balance before enabling an "Accept" button must now read this data directly from a Firestore document.
  - Thanks to `onSnapshot`, the button will enable/disable automatically and instantly as the wallet balance changes.

**PAUSE FOR CONFIRMATION (End of Project)**

- **Action:** Stop and report to the user: "Project complete. The architectural migration is finished. The frontend is fully integrated with the Firebase backend, leveraging Internet Identity for login and Firestore for real-time data. The on-chain logic is now focused exclusively on reputation and identity verification."
