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

**🔧 Firebase Functions Coding Standards:**

When migrating Motoko functions to Firebase Cloud Functions, **ALWAYS** follow these critical patterns established in `functions/src/service.js`:

**A. Data Extraction Pattern:**

```javascript
// ALWAYS extract payload from data.data first
const payload = data.data || data;
const { param1, param2, param3 } = payload;
```

**B. Authentication Pattern:**

```javascript
// ALWAYS use the getAuthInfo helper function for authentication
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

// In every function that requires authentication:
const authInfo = getAuthInfo(context, data);
if (!authInfo.hasAuth) {
  throw new functions.https.HttpsError(
    "unauthenticated",
    "User must be authenticated",
  );
}
```

**C. Logic Migration Pattern:**

- **Mirror Motoko Logic:** Keep the same validation rules, business logic flow, and error handling patterns from the original Motoko functions
- **Preserve Null Handling:** Use the same null/undefined data preservation patterns established in `updateService`
- **Timestamp Pattern:** Use `new Date().toISOString()` instead of `Time.now()` for timestamps
- **Error Handling:** Use `functions.https.HttpsError` with appropriate error codes matching Motoko's `#err` responses

**D. Function Structure Template:**

```javascript
exports.functionName = functions.https.onCall(async (data, context) => {
  // Extract payload
  const payload = data.data || data;
  const { requiredParam } = payload;

  // Authentication (if required)
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validation (mirror Motoko validation)
  if (!requiredParam) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Required parameter missing",
    );
  }

  try {
    // Business logic (follow Motoko patterns)
    // Use Firestore transactions for data consistency
    // Return success response matching Motoko format
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in functionName:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
```

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

- **Action:** CREATE `functions/src/auth.js`.
- **Content:** Implement the `signInWithInternetIdentity` function. This is the cornerstone of the hybrid architecture.
  - **MUST** follow the established coding patterns:

    ```javascript
    exports.signInWithInternetIdentity = functions.https.onCall(
      async (data, context) => {
        // Extract payload from data.data
        const payload = data.data || data;
        const { principal } = payload;

        // Validation (mirror Motoko logic)
        if (!principal) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Principal is required",
          );
        }

        try {
          // Use @dfinity/agent to call isPrincipalValid on auth.mo canister
          // Mirror the Motoko validation logic
          // Use firebase-admin to createCustomToken(principal)
          // Check/create user profile in Firestore
          return { success: true, customToken: token };
        } catch (error) {
          console.error("Error in signInWithInternetIdentity:", error);
          throw new functions.https.HttpsError("internal", error.message);
        }
      },
    );
    ```

**1.3. Create the "Reputation Bridge" Cloud Function**

- **Action:** CREATE `functions/src/review.js`.
- **Content:** Implement the `processReputation` function.
  - **MUST** follow the established coding patterns:

    ```javascript
    exports.processReputation = functions.firestore
      .document("reviews/{reviewId}")
      .onCreate(async (snap, context) => {
        const reviewData = snap.data();

        try {
          // Mirror Motoko validation logic for review data
          if (!reviewData.rating || !reviewData.reviewText) {
            console.error("Invalid review data");
            return;
          }

          // Authenticate as trusted service agent
          // Call updateReputationFromReview on reputation.mo canister
          // Follow same error handling patterns as Motoko
          console.log(
            "Reputation updated for review:",
            context.params.reviewId,
          );
        } catch (error) {
          console.error("Error processing reputation:", error);
          // Don't throw - this is a trigger function
        }
      });
    ```

**1.4. Port Wallet & Admin Logic**

- **Action:** CREATE `functions/src/wallet.js` and `functions/src/admin.js`.
- **Content for `wallet.js`:**
  - **MUST** follow established patterns when creating `creditProvider` and `debitProvider` functions:

    ```javascript
    exports.creditProvider = functions.https.onCall(async (data, context) => {
      const payload = data.data || data;
      const { providerId, amount, transactionId } = payload;

      const authInfo = getAuthInfo(context, data);
      if (!authInfo.hasAuth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
        );
      }

      // Mirror Motoko validation logic
      // Use Firestore Transactions for atomic updates
      return db.runTransaction(async (transaction) => {
        // Follow same balance update patterns as wallet.mo
      });
    });
    ```

- **Content for `admin.js`:**
  - **MUST** follow established patterns when porting from `admin.mo`:

    ```javascript
    exports.grantAdminRole = functions.https.onCall(async (data, context) => {
      const payload = data.data || data;
      const { userId } = payload;

      const authInfo = getAuthInfo(context, data);
      if (!authInfo.hasAuth || !authInfo.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin access required",
        );
      }

      // Mirror exact logic from admin.mo grantAdminRole function
      // Use same validation patterns and error handling
    });
    ```

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

- **Action:** MODIFY `src/backend/function/reputation.mo`.
- **Content:**
  - **Simplify Canister Logic:** Remove all inter-canister calls to `booking.mo`, `auth.mo`, and `review.mo`. The `reputation.mo` canister will no longer fetch data from other canisters.
  - **Update Function Signatures:** Modify the public update functions (e.g., `updateReputationFromReview`) to accept all required data as parameters. For example, instead of fetching booking details, the function should receive `clientId`, `providerId`, `reviewText`, and `rating` directly from the calling Cloud Function.
  - **Secure the Canister:** Ensure all update functions are secured. They should only be callable by the Principal of the Firebase service agent, which will be stored as a trusted controller. This follows the pattern established in the "Reputation Bridge" (Task 1.3).
  - **Maintain Core Logic:** The canister's core responsibility remains the same: to execute the AI-powered sentiment analysis and update reputation scores based on the data it receives. The business logic for score calculation should be preserved.

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
  - **Mutations (Writes):** Replace `actor` calls with `https.Callable` calls to the new Cloud Functions:
    ```javascript
    // OLD: await serviceActor.createService({...params});
    // NEW:
    const createService = httpsCallable(functions, "createService");
    await createService({ data: { ...params } }); // Note: wrap in data object
    ```
  - **Data Fetching (Reads):** Replace canister queries with real-time Firestore listeners (`onSnapshot`). **IMPORTANT:** Ensure frontend expects the same data structure patterns established in the migrated functions.
  - **Authentication Headers:** All Cloud Function calls must include the Firebase ID token in headers for proper authentication via the `getAuthInfo` helper.


**PAUSE FOR CONFIRMATION (End of Project)**

- **Action:** Stop and report to the user: "Project complete. The architectural migration is finished. The frontend is fully integrated with the Firebase backend, leveraging Internet Identity for login and Firestore for real-time data. The on-chain logic is now focused exclusively on reputation and identity verification."
