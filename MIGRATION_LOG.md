# Migration Log

This file tracks the progress of the strategic architectural migration from a pure Internet Computer backend to a hybrid ICP-Firebase architecture.

## Phase 1: Backend Infrastructure Migration & Firebase Scaffolding

### Task 1.1: Define Firestore Security Rules ✅

**Completed**: October 3, 2025

**Description**: Implemented comprehensive Firestore security rules to secure data collections in preparation for the hybrid architecture migration.

**Changes Made**:

- Modified `firestore.rules` to replace wide-open development rules with production-ready security rules
- Added user profile protection: users can only read/write their own profiles, admins can read any
- Implemented service rules: authenticated users can read services, only providers or admins can write
- Created booking security: only booking participants (client/provider) or admins can access booking data
- Added review rules: anyone can read reviews, authenticated users can create but cannot modify (immutable reviews)

**Impact**: Critical security foundation established for Firebase backend operations, ensuring proper data access control for the marketplace platform.

### Task 1.2: Create the "Identity Bridge" Cloud Function ✅

**Completed**: October 3, 2025

**Description**: Created the cornerstone Identity Bridge function that connects Internet Computer Identity with Firebase Authentication in the hybrid architecture.

**Changes Made**:

- Created `functions/src/auth.js` with the `signInWithInternetIdentity` HTTP onRequest function
- Implemented principal validation by calling the `getProfile` function on the auth.mo canister
- Added automatic Firestore user profile creation for new principals
- Integrated Firebase custom token generation with Internet Computer principal verification
- Added comprehensive error handling for invalid principals, network issues, and server errors
- Configured multi-environment support (local, playground, IC) with proper canister host detection
- Added proper CORS headers for cross-origin requests from frontend applications
- Exported the function in `functions/index.js` for deployment

**Technical Implementation**:

- Uses `@dfinity/agent` and `@dfinity/principal` for IC communication
- Validates principal format and existence via auth canister `getProfile` query
- Creates Firebase custom tokens with custom claims (provider, icPrincipal)
- Ensures atomic user profile creation in Firestore for new users
- Supports environment-specific canister ID configuration

**Impact**: Establishes the critical bridge between IC identity and Firebase session management, enabling users to authenticate with Internet Identity while accessing Firebase-based services seamlessly.

---

### Task: Account Management Migration to Firebase ✅

**Completed**: October 3, 2025

**Description**: Migrated all account management functions from the auth.mo canister to Firebase Cloud Functions, simplifying the IC canister to serve only as a principal validation oracle.

**Changes Made**:

#### 1. Created Account Management Cloud Functions (`functions/src/account.js`)

- Implemented `createProfile`: Creates new user profiles in Firestore with validation
- Implemented `getProfile`: Retrieves user profile data by ID
- Implemented `updateProfile`: Updates user profile information (name, phone)
- Implemented `switchUserRole`: Toggles between Client and ServiceProvider active roles
- Implemented `getAllServiceProviders`: Retrieves all service provider profiles
- Implemented `getAllUsers`: Admin function to retrieve all users
- Added comprehensive validation (phone format, name length, uniqueness checks)
- Implemented Firebase Authentication context for authorization
- Exported all functions in `functions/index.js`

#### 2. Simplified Auth Canister (`src/backend/function/auth.mo`)

- Removed all account management functions (createProfile, updateProfile, etc.)
- Removed profile picture upload/removal functions
- Removed admin functions (lockUserAccount, deleteUserAccount, etc.)
- Simplified to only contain `isPrincipalValid` function
- Removed unnecessary imports and state variables
- Kept minimal state for principal validation only
- The canister now serves solely as a trust oracle for the Identity Bridge

#### 3. Updated Identity Bridge (`functions/src/auth.js`)

- Fixed canister actor creation to use proper `HttpAgent` and `Actor`
- Updated to call `isPrincipalValid` instead of `getProfile`
- Improved error handling and logging
- Added root key fetching for local development
- Enhanced network configuration for IC/local environments

#### 4. Created Identity Bridge Service (`src/frontend/src/services/identityBridge.ts`)

- Implemented `signInWithInternetIdentity()` for IC-to-Firebase authentication
- Created wrapper functions for all account management Cloud Functions
- Integrated with Firebase Functions SDK using `httpsCallable`
- Added proper TypeScript types and error handling

#### 5. Updated Frontend Auth Context (`src/frontend/src/context/AuthContext.tsx`)

- Added Firebase authentication integration
- Added `firebaseUser` state and auth state listener
- Updated login flow to call Identity Bridge after IC authentication
- Updated logout to sign out from both Firebase and IC
- Added graceful error handling (IC auth succeeds even if Firebase fails)
- Fixed Internet Identity URL to use `https://identity.ic0.app`

**Architecture Summary**:

```
Internet Identity (IC) ──► Auth Canister (isPrincipalValid)
         │                          │
         │                          ▼
         │                   Identity Bridge
         │                   Cloud Function
         │                          │
         └──────────────────────────┼──► Firebase Auth
                                    │
                                    ▼
                            Account Management
                            Cloud Functions
                                    │
                                    ▼
                                Firestore
```

**Data Flow**:

1. User authenticates with Internet Identity
2. Frontend receives IC Principal
3. Identity Bridge validates Principal on IC
4. Identity Bridge creates Firebase custom token
5. Frontend signs into Firebase
6. Account operations use Firebase Cloud Functions
7. Data stored in Firestore

**Profile Structure in Firestore**:

```javascript
{
  id: "principal-id",
  name: "User Name",
  phone: "+1234567890",
  role: "ServiceProvider", // Everyone can provide services
  activeRole: "Client", // Current UI mode
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: true,
  reputationScore: 0,
  totalEarnings: 0,
  profilePicture: null,
  biography: null
}
```

**Impact**: Successfully established the hybrid ICP-Firebase architecture for account management. The IC canister is now minimal and focused solely on principal validation, while all CRUD operations happen in Firebase for better performance, scalability, and cost efficiency.

**Testing Required**:

- [ ] Deploy Cloud Functions to Firebase
- [ ] Deploy simplified auth.mo canister to IC
- [ ] Test end-to-end authentication flow
- [ ] Test profile creation and updates
- [ ] Test role switching functionality
- [ ] Verify backward compatibility

---

### Task: Firebase Emulator Configuration & Timestamp Fixes ✅

**Completed**: October 3, 2025

**Description**: Configured Firebase Auth emulator support and resolved timestamp issues in Cloud Functions to enable proper local development and testing of the hybrid ICP-Firebase architecture.

**Changes Made**:

#### 1. Configured Firebase Auth Emulator (`firebase.json`)

- Added Auth emulator configuration to run on port 9099
- Updated emulator configuration to include:
  ```json
  "auth": {
    "port": 9099
  }
  ```
- This enables local testing of Firebase custom token creation without requiring service account credentials

#### 2. Updated Firebase Admin Initialization (`functions/src/auth.js`)

- Modified initialization logic to support Firebase Auth emulator in development
- Added conditional initialization based on `FUNCTIONS_EMULATOR` environment variable:
  ```javascript
  if (process.env.FUNCTIONS_EMULATOR) {
    admin.initializeApp({
      projectId: "devsrv-rey",
    });
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  }
  ```
- Replaced `admin.firestore.FieldValue.serverTimestamp()` with `new Date().toISOString()` in the `ensureUserProfile` function
- This resolves the "Cannot read properties of undefined (reading 'serverTimestamp')" error

#### 3. Updated Account Management Functions (`functions/src/account.js`)

- Applied the same Firebase Admin initialization pattern for Auth emulator support
- Replaced all instances of `admin.firestore.FieldValue.serverTimestamp()` with `new Date().toISOString()`:
  - `createProfile`: Uses ISO timestamp for `createdAt` and `updatedAt`
  - `updateProfile`: Uses ISO timestamp for `updatedAt`
  - `switchUserRole`: Uses ISO timestamp for `updatedAt`
- Timestamps are now stored as ISO 8601 strings (e.g., "2025-10-03T12:34:56.789Z")

**Technical Rationale**:

- The Firebase Auth emulator allows local development without requiring service account credentials
- Using ISO timestamps instead of Firestore server timestamps prevents initialization issues in the emulator
- ISO timestamps are still sortable, comparable, and work consistently across all environments
- The `FIREBASE_AUTH_EMULATOR_HOST` environment variable automatically routes `createCustomToken()` calls to the local emulator

**Impact**:

- Resolved critical "ENOTFOUND metadata" error preventing custom token creation in emulator
- Enabled full local development workflow for Identity Bridge authentication
- Fixed timestamp-related crashes in account management functions
- Established consistent Firebase initialization pattern for all Cloud Functions

**Emulator Configuration**:

```
Firebase Emulators Running:
- Auth Emulator:      http://127.0.0.1:9099
- Functions Emulator: http://127.0.0.1:5001
- Firestore Emulator: http://127.0.0.1:8080
- Emulator UI:        http://127.0.0.1:4000
```

---
